import {
  TronTransaction,
  GraphNodeData,
  GraphEdgeData,
  AnalysisResult,
} from "@/types";
import { fetchAllTransactions } from "./trongrid";
import { isExchangeAddress, getExchangeLabel } from "./exchange-labels";

function edgeKey(source: string, target: string, token: string): string {
  return `${source}|${target}|${token}`;
}

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ensureNode(
  map: Map<string, GraphNodeData>,
  addr: string,
  depth: number,
  rootAddresses: string[],
) {
  if (map.has(addr)) return;
  map.set(addr, {
    id: addr,
    label: getExchangeLabel(addr) || shorten(addr),
    isExchange: isExchangeAddress(addr),
    exchangeName: getExchangeLabel(addr),
    isRoot: rootAddresses.includes(addr),
    isIntersection: false,
    depth,
    totalReceived: 0,
    totalSent: 0,
    transactionCount: 0,
  });
}

function addEdge(
  map: Map<string, GraphEdgeData>,
  tx: TronTransaction,
) {
  const key = edgeKey(tx.from, tx.to, tx.token);
  const existing = map.get(key);

  if (existing) {
    existing.totalAmount += tx.amount;
    existing.txCount++;
    existing.avgAmount = existing.totalAmount / existing.txCount;
    existing.minTimestamp = Math.min(existing.minTimestamp, tx.timestamp);
    existing.maxTimestamp = Math.max(existing.maxTimestamp, tx.timestamp);
    if (existing.transactions.length < 50) {
      existing.transactions.push(tx);
    }
  } else {
    map.set(key, {
      id: key,
      source: tx.from,
      target: tx.to,
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

function computeIntersections(
  nodesMap: Map<string, GraphNodeData>,
  edgesMap: Map<string, GraphEdgeData>,
  rootAddresses: string[],
): number {
  if (rootAddresses.length < 2) return 0;

  const adj = new Map<string, Set<string>>();
  for (const node of nodesMap.keys()) {
    adj.set(node, new Set());
  }
  for (const edge of edgesMap.values()) {
    adj.get(edge.source)?.add(edge.target);
    adj.get(edge.target)?.add(edge.source);
  }

  const bfs = (start: string): Set<string> => {
    const visited = new Set<string>();
    const queue = [start];
    visited.add(start);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return visited;
  };

  const reachableFrom0 = bfs(rootAddresses[0]);
  const reachableFrom1 = bfs(rootAddresses[1]);

  let count = 0;
  for (const [addr, node] of nodesMap) {
    if (node.isRoot) continue;
    if (reachableFrom0.has(addr) && reachableFrom1.has(addr)) {
      node.isIntersection = true;
      count++;
    }
  }

  return count;
}

export async function analyzeWallets(
  rootAddresses: string[],
  maxDepth = 2,
  minAmount = 0,
  maxNodes = 150,
  txLimit = 200,
): Promise<AnalysisResult> {
  const nodesMap = new Map<string, GraphNodeData>();
  const edgesMap = new Map<string, GraphEdgeData>();
  const visited = new Set<string>();
  let totalTxCount = 0;
  let truncated = false;
  let depthReached = 0;

  for (const addr of rootAddresses) {
    ensureNode(nodesMap, addr, 0, rootAddresses);
  }

  let frontier = [...rootAddresses];

  for (let depth = 0; depth < maxDepth; depth++) {
    if (frontier.length === 0) break;

    const nextFrontier: string[] = [];

    for (const address of frontier) {
      if (visited.has(address)) continue;
      visited.add(address);

      if (nodesMap.size >= maxNodes) {
        truncated = true;
        break;
      }

      try {
        const transactions = await fetchAllTransactions(address, txLimit);
        totalTxCount += transactions.length;

        for (const tx of transactions) {
          if (tx.amount < minAmount) continue;

          ensureNode(nodesMap, tx.from, depth + (tx.from === address ? 0 : 1), rootAddresses);
          ensureNode(nodesMap, tx.to, depth + (tx.to === address ? 0 : 1), rootAddresses);

          const fromNode = nodesMap.get(tx.from)!;
          fromNode.totalSent += tx.amount;
          fromNode.transactionCount++;

          const toNode = nodesMap.get(tx.to)!;
          toNode.totalReceived += tx.amount;
          toNode.transactionCount++;

          addEdge(edgesMap, tx);

          if (
            tx.from === address &&
            !visited.has(tx.to) &&
            !nextFrontier.includes(tx.to)
          ) {
            nextFrontier.push(tx.to);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch ${address}:`, err);
      }

      await new Promise((r) => setTimeout(r, 120));
    }

    depthReached = depth + 1;
    if (truncated) break;

    frontier = nextFrontier.slice(0, Math.max(10, maxNodes - nodesMap.size));
  }

  const intersectionCount = computeIntersections(nodesMap, edgesMap, rootAddresses);

  const edges = Array.from(edgesMap.values());
  let minTs = Infinity;
  let maxTs = 0;
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
    },
  };
}

export async function expandNode(
  address: string,
  existingNodeIds: string[],
  minAmount = 0,
  txLimit = 200,
): Promise<{ nodes: GraphNodeData[]; edges: GraphEdgeData[] }> {
  const existing = new Set(existingNodeIds);
  const newNodes: GraphNodeData[] = [];
  const edgesMap = new Map<string, GraphEdgeData>();

  try {
    const transactions = await fetchAllTransactions(address, txLimit);

    for (const tx of transactions) {
      if (tx.amount < minAmount) continue;

      const other = tx.from === address ? tx.to : tx.from;

      if (!existing.has(other)) {
        existing.add(other);
        newNodes.push({
          id: other,
          label: getExchangeLabel(other) || shorten(other),
          isExchange: isExchangeAddress(other),
          exchangeName: getExchangeLabel(other),
          isRoot: false,
          isIntersection: false,
          depth: -1,
          totalReceived: tx.to === other ? tx.amount : 0,
          totalSent: tx.from === other ? tx.amount : 0,
          transactionCount: 1,
        });
      }

      addEdge(edgesMap, tx);
    }
  } catch (err) {
    console.error(`Failed to expand ${address}:`, err);
  }

  return { nodes: newNodes, edges: Array.from(edgesMap.values()) };
}
