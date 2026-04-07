#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const API_KEY = "76be02b2-cd0e-4bcf-b2c0-8918474b965f";
const BASE_URL = "https://api.trongrid.io";

const W1 = "TQmjBcRzpEqsgkwz5qNSmXRLwdDJfex4mn";
const W2 = "TQT1zgatvHraUmy7YUy74HnR9H6riL9Fg4";

const MAX_DEPTH = 3;
const MAX_NODES = 500;
const TX_LIMIT = 200;
const MIN_AMOUNT = 0;

// ─── Exchange labels ──────────────────────────────────────────────────────────
const EXCHANGE_LABELS = {
  TLkFYiRVAFKR79LqU1zPsTRDEB4qDKNsBz: "Binance",
  TV6MuMXfmLbBqPZvBHdwFsDnQeVfnmiuSi: "Binance",
  TDqSquXBgUCLYvYC4XZgrprLK589dkhSCf: "Binance",
  TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb: "Binance",
  TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe: "Binance",
  TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G: "Binance",
  TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS: "Binance",
  TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8wr: "Binance",
  TKrx5MHMkDPoNncrQYBbADp2gXkMxJnLJ2: "Binance",
  TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9: "Binance",
  TJCo98saj6WND61g1uuKbJ3Ek9ixmLGCnG: "Binance",
  TA6JNT1ezqdyxHGQDGa1hhzTgN2a6mEicp: "Binance",
  TFRx8RhUxPC24K5evn8FEBfkMb2PoJBHu7: "OKX",
  TRGCqsrdTT9QHjMh2GriFm8kxbCGRDnFnJ: "OKX",
  TAkMSVMaQj2DFpzgyNDRfMGqLhqGSxuNVf: "OKX",
  THPvaUhoh2Qn2y9THCZML3H4ABSMzPa2y8: "HTX",
  TDGMoJn2pKMJpwDVLAjX9bWfaTk5QRUkdC: "HTX",
  TNaRAoLUyYEV2uF7GUrzSjRQTU8v5ZJ5VR: "HTX",
  TYukBQZ2XXCcRCReAUguyXncCWNY9CEiDQ: "HTX",
  TWkM5JShDMRXTEvmt69MVkqYDBPfJ2BkJh: "HTX",
  TRjDxCZpqfHMB6fTBp8rTPPcj9LdqhkPs7: "Bybit",
  TLM9JFMzMas1LWYR5vrrxm4AvUqBp9UeGE: "Bybit",
  TUpHuBFSv7bCL3mgXNjFb4gEtEjSmkVhEL: "KuCoin",
  TDvmhmGwdpLHjGPmLvKNfJFijFKMfrawxR: "Gate.io",
  TGzz8gjYiYRqpfmDwnLxfCAQnhYrMhBJNH: "Poloniex",
  TBYsLWR54TjqinWDDWMUTjQFYE1hnJQ33V: "Poloniex",
  TQrBnh6ZkEJFVT7CkhPHpnNzMYo7HTAS1a: "Bitfinex",
  TW1kBv3AEbY6cUJHMPnEsGPcun2MVr2KZC: "MEXC",
  TAF7asMYjAPeGq8j7arNLsttdWA2DJ2URC: "Bitget",
  TSR1eBuv2tubpRQQ1PStGo28HxQN8T7iR5: "Crypto.com",
  TKcEU8ekq2ZoFzLSGFYCUY6aocJBX9X31b: "Sun.io",
  TX7kybeP6UwTBRHLNPYmswFESHfyjm9bAS: "JustLend",
  TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd: "JustSwap",
  TJLFxL6M5AXVkS3BRummrGZfhBi5dUGFpq: "Kraken",
  TYTDhiBE4eEXfNChSi6dE6K5GbrHFWoymq: "Bittrex",
};

function shorten(addr) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithKey(url) {
  const res = await fetch(url, {
    headers: {
      "TRON-PRO-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`TronGrid ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function fetchTRX(address) {
  const url = `${BASE_URL}/v1/accounts/${address}/transactions?only_confirmed=true&limit=${TX_LIMIT}&order_by=block_timestamp,desc&visible=true`;
  const data = await fetchWithKey(url);
  if (!data.data) return [];

  const txs = [];
  for (const tx of data.data) {
    if (tx.ret?.[0]?.contractRet !== "SUCCESS") continue;
    const contract = tx.raw_data?.contract?.[0];
    if (!contract || contract.type !== "TransferContract") continue;
    const val = contract.parameter?.value;
    if (!val) continue;
    const from = val.owner_address;
    const to = val.to_address;
    const amount = (val.amount || 0) / 1_000_000;
    if (!from || !to || amount <= 0) continue;
    txs.push({
      hash: tx.txID,
      from, to, amount,
      token: "TRX",
      timestamp: tx.raw_data?.timestamp || tx.block_timestamp || 0,
      direction: from === address ? "out" : "in",
    });
  }
  return txs;
}

async function fetchTRC20(address) {
  const url = `${BASE_URL}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&limit=${TX_LIMIT}&order_by=block_timestamp,desc`;
  const data = await fetchWithKey(url);
  if (!data.data) return [];

  const txs = [];
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

async function fetchAll(address) {
  const [trx, trc20] = await Promise.all([fetchTRX(address), fetchTRC20(address)]);
  return [...trx, ...trc20].sort((a, b) => b.timestamp - a.timestamp);
}

function edgeKey(from, to, token) { return `${from}|${to}|${token}`; }

function ensureNode(map, addr, depth, roots) {
  if (map.has(addr)) return;
  const label = EXCHANGE_LABELS[addr] || shorten(addr);
  map.set(addr, {
    id: addr, label,
    isExchange: addr in EXCHANGE_LABELS,
    exchangeName: EXCHANGE_LABELS[addr] || null,
    isRoot: roots.includes(addr),
    isIntersection: false,
    depth,
    totalReceived: 0,
    totalSent: 0,
    transactionCount: 0,
  });
}

function addEdge(map, tx) {
  const key = edgeKey(tx.from, tx.to, tx.token);
  const existing = map.get(key);
  if (existing) {
    existing.totalAmount += tx.amount;
    existing.txCount++;
    existing.avgAmount = existing.totalAmount / existing.txCount;
    existing.minTimestamp = Math.min(existing.minTimestamp, tx.timestamp);
    existing.maxTimestamp = Math.max(existing.maxTimestamp, tx.timestamp);
    if (existing.transactions.length < 50) existing.transactions.push(tx);
  } else {
    map.set(key, {
      id: key,
      source: tx.from, target: tx.to,
      totalAmount: tx.amount,
      token: tx.token,
      txCount: 1,
      avgAmount: tx.amount,
      minTimestamp: tx.timestamp,
      maxTimestamp: tx.timestamp,
      transactions: [tx],
    });
  }
}

function computeIntersections(nodesMap, edgesMap, roots) {
  if (roots.length < 2) return 0;
  const adj = new Map();
  for (const n of nodesMap.keys()) adj.set(n, new Set());
  for (const e of edgesMap.values()) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  const bfs = (start) => {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      for (const nb of adj.get(cur) || []) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    return visited;
  };
  const r0 = bfs(roots[0]);
  const r1 = bfs(roots[1]);
  let count = 0;
  for (const [addr, node] of nodesMap) {
    if (node.isRoot) continue;
    if (r0.has(addr) && r1.has(addr)) { node.isIntersection = true; count++; }
  }
  return count;
}

async function analyze(roots) {
  const nodesMap = new Map();
  const edgesMap = new Map();
  const visited = new Set();
  let totalTxCount = 0;
  let truncated = false;
  let depthReached = 0;

  for (const addr of roots) ensureNode(nodesMap, addr, 0, roots);

  let frontier = [...roots];
  let processed = 0;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (!frontier.length) break;
    const next = [];

    for (const address of frontier) {
      if (visited.has(address)) continue;
      visited.add(address);

      if (nodesMap.size >= MAX_NODES) { truncated = true; break; }

      processed++;
      process.stdout.write(`\r[depth ${depth + 1}/${MAX_DEPTH}] адресов обработано: ${processed}, узлов: ${nodesMap.size}/${MAX_NODES}  `);

      try {
        const txs = await fetchAll(address);
        totalTxCount += txs.length;

        for (const tx of txs) {
          if (tx.amount < MIN_AMOUNT) continue;
          ensureNode(nodesMap, tx.from, depth + (tx.from === address ? 0 : 1), roots);
          ensureNode(nodesMap, tx.to,   depth + (tx.to   === address ? 0 : 1), roots);

          nodesMap.get(tx.from).totalSent     += tx.amount;
          nodesMap.get(tx.from).transactionCount++;
          nodesMap.get(tx.to).totalReceived   += tx.amount;
          nodesMap.get(tx.to).transactionCount++;

          addEdge(edgesMap, tx);

          if (tx.from === address && !visited.has(tx.to) && !next.includes(tx.to))
            next.push(tx.to);
        }
      } catch (err) {
        console.error(`\nОшибка ${address}: ${err.message}`);
      }

      await sleep(150);
    }

    depthReached = depth + 1;
    if (truncated) break;
    frontier = next.slice(0, Math.max(10, MAX_NODES - nodesMap.size));
  }

  console.log(); // newline after progress

  const intersectionCount = computeIntersections(nodesMap, edgesMap, roots);
  const edges = Array.from(edgesMap.values());
  let minTs = Infinity, maxTs = 0;
  for (const e of edges) {
    if (e.minTimestamp && e.minTimestamp < minTs) minTs = e.minTimestamp;
    if (e.maxTimestamp && e.maxTimestamp > maxTs) maxTs = e.maxTimestamp;
  }
  if (!isFinite(minTs)) minTs = 0;

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
    metadata: {
      totalTransactions: totalTxCount,
      maxDepthReached: depthReached,
      truncated,
      timeRange: { min: minTs, max: maxTs },
      intersectionCount,
      syncedAt: Date.now(),
    },
  };
}

async function main() {
  console.log(`\n=== TRON Big Sync ===`);
  console.log(`Кошельки: ${W1}  ${W2}`);
  console.log(`Глубина: ${MAX_DEPTH}, макс. узлов: ${MAX_NODES}, лимит тx: ${TX_LIMIT}\n`);

  const start = Date.now();
  const result = await analyze([W1, W2]);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const outPath = path.join(__dirname, "../data/snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(result));

  console.log(`\n✓ Готово за ${elapsed}с`);
  console.log(`  Узлов: ${result.nodes.length}`);
  console.log(`  Рёбер: ${result.edges.length}`);
  console.log(`  Пересечений: ${result.metadata.intersectionCount}`);
  console.log(`  Транзакций обработано: ${result.metadata.totalTransactions}`);
  console.log(`  Обрезано: ${result.metadata.truncated}`);
  console.log(`  Сохранено: ${outPath}`);
  const sizeMb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`  Размер файла: ${sizeMb} МБ`);
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
