import { TronTransaction } from "@/types";
import { cache } from "./cache";

const BASE_URL = "https://api.trongrid.io";
const API_KEY = process.env.TRONGRID_API_KEY || "";

async function fetchWithKey(url: string): Promise<any> {
  const cached = cache.get<any>(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: {
      "TRON-PRO-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TronGrid ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  cache.set(url, data);
  return data;
}

export async function fetchTRXTransactions(
  address: string,
  limit = 200,
): Promise<TronTransaction[]> {
  const url = `${BASE_URL}/v1/accounts/${address}/transactions?only_confirmed=true&limit=${limit}&order_by=block_timestamp,desc&visible=true`;
  const data = await fetchWithKey(url);
  if (!data.data) return [];

  const txs: TronTransaction[] = [];

  for (const tx of data.data) {
    if (tx.ret?.[0]?.contractRet !== "SUCCESS") continue;
    const contract = tx.raw_data?.contract?.[0];
    if (!contract || contract.type !== "TransferContract") continue;

    const val = contract.parameter?.value;
    if (!val) continue;

    const from: string = val.owner_address;
    const to: string = val.to_address;
    const amount = (val.amount || 0) / 1_000_000;

    if (!from || !to || amount <= 0) continue;

    txs.push({
      hash: tx.txID,
      from,
      to,
      amount,
      token: "TRX",
      timestamp: tx.raw_data?.timestamp || tx.block_timestamp || 0,
      direction: from === address ? "out" : "in",
    });
  }

  return txs;
}

export async function fetchTRC20Transactions(
  address: string,
  limit = 200,
): Promise<TronTransaction[]> {
  const url = `${BASE_URL}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&limit=${limit}&order_by=block_timestamp,desc`;
  const data = await fetchWithKey(url);
  if (!data.data) return [];

  const txs: TronTransaction[] = [];

  for (const tx of data.data) {
    if (tx.type !== "Transfer") continue;

    const decimals = tx.token_info?.decimals || 0;
    const amount = Number(tx.value) / Math.pow(10, decimals);
    if (amount <= 0) continue;

    txs.push({
      hash: tx.transaction_id,
      from: tx.from,
      to: tx.to,
      amount,
      token: tx.token_info?.symbol || "TRC20",
      tokenAddress: tx.token_info?.address,
      timestamp: tx.block_timestamp || 0,
      direction: tx.from === address ? "out" : "in",
    });
  }

  return txs;
}

export async function fetchAllTransactions(
  address: string,
  limit = 200,
): Promise<TronTransaction[]> {
  const [trx, trc20] = await Promise.all([
    fetchTRXTransactions(address, limit),
    fetchTRC20Transactions(address, limit),
  ]);

  return [...trx, ...trc20].sort((a, b) => b.timestamp - a.timestamp);
}

export async function fetchAccountBalance(
  address: string,
): Promise<number> {
  try {
    const url = `${BASE_URL}/v1/accounts/${address}?visible=true`;
    const data = await fetchWithKey(url);
    return (data.data?.[0]?.balance || 0) / 1_000_000;
  } catch {
    return 0;
  }
}
