export interface TronTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  token: string;
  tokenAddress?: string;
  timestamp: number;
  direction: "in" | "out";
}

export interface GraphNodeData {
  id: string;
  label: string;
  isExchange: boolean;
  exchangeName?: string;
  isRoot: boolean;
  isIntersection: boolean;
  depth: number;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  totalAmount: number;
  token: string;
  txCount: number;
  avgAmount: number;
  minTimestamp: number;
  maxTimestamp: number;
  transactions: TronTransaction[];
}

export interface AnalysisResult {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  metadata: {
    totalTransactions: number;
    maxDepthReached: number;
    truncated: boolean;
    timeRange: { min: number; max: number };
    intersectionCount: number;
  };
}
