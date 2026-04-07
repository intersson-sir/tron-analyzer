"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { GraphNodeData, GraphEdgeData, AnalysisResult } from "@/types";

const GraphVisualization = dynamic(
  () => import("@/components/GraphVisualization"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-600">
        Loading graph engine…
      </div>
    ),
  },
);

const DEFAULT_W1 = "TQmjBcRzpEqsgkwz5qNSmXRLwdDJfex4mn";
const DEFAULT_W2 = "TQT1zgatvHraUmy7YUy74HnR9H6riL9Fg4";

export default function Home() {
  const [wallet1, setWallet1] = useState(DEFAULT_W1);
  const [wallet2, setWallet2] = useState(DEFAULT_W2);
  const [depth, setDepth] = useState(2);
  const [minAmount, setMinAmount] = useState(0);
  const [maxNodes, setMaxNodes] = useState(150);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [viewMode, setViewMode] = useState<"combined" | "wallet1" | "wallet2">(
    "combined",
  );
  const [layoutType, setLayoutType] = useState<"force" | "dagre" | "radial">(
    "force",
  );
  const [minAmountFilter, setMinAmountFilter] = useState(0);

  const handleAnalyze = useCallback(async () => {
    if (!wallet1.trim() || !wallet2.trim()) {
      setError("Введите оба адреса кошельков");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedNode(null);
    setProgress("Запрашиваем транзакции…");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addresses: [wallet1.trim(), wallet2.trim()],
          depth,
          minAmount,
          maxNodes,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || `Server error ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
      setProgress("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }, [wallet1, wallet2, depth, minAmount, maxNodes]);

  const handleNodeExpand = useCallback(
    async (nodeId: string) => {
      if (!result) return;
      setProgress("Раскрываем узел…");

      try {
        const res = await fetch("/api/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: nodeId,
            existingNodeIds: result.nodes.map((n) => n.id),
            minAmount: minAmountFilter,
          }),
        });

        if (!res.ok) return;

        const { nodes: newN, edges: newE } = await res.json();

        setResult((prev) => {
          if (!prev) return prev;
          const existIds = new Set(prev.nodes.map((n) => n.id));
          const existEdgeIds = new Set(prev.edges.map((e) => e.id));
          return {
            ...prev,
            nodes: [
              ...prev.nodes,
              ...newN.filter((n: GraphNodeData) => !existIds.has(n.id)),
            ],
            edges: [
              ...prev.edges,
              ...newE.filter((e: GraphEdgeData) => !existEdgeIds.has(e.id)),
            ],
          };
        });
      } catch (err) {
        console.error("Expand failed:", err);
      } finally {
        setProgress("");
      }
    },
    [result, minAmountFilter],
  );

  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-accent">TRON</span>{" "}
          <span className="text-gray-300">Flow Analyzer</span>
        </h1>
        <span className="text-xs text-gray-600">
          Transaction Graph Visualization
        </span>
      </header>

      {/* Controls */}
      <div className="border-b border-gray-800 px-6 py-3 space-y-3 flex-shrink-0">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Кошелёк 1
            </label>
            <input
              type="text"
              value={wallet1}
              onChange={(e) => setWallet1(e.target.value)}
              placeholder="T..."
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Кошелёк 2
            </label>
            <input
              type="text"
              value={wallet2}
              onChange={(e) => setWallet2(e.target.value)}
              placeholder="T..."
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Глубина
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Макс. узлов
            </label>
            <select
              value={maxNodes}
              onChange={(e) => setMaxNodes(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              {[50, 100, 150, 200, 300, 500].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
              Мин. сумма
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              placeholder="0"
              className="w-24 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-accent text-gray-900 font-semibold px-8 py-2 rounded hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
          >
            {loading ? "Анализ…" : "Анализировать"}
          </button>
        </div>

        {/* Second row */}
        {result && (
          <div className="flex flex-wrap gap-3 items-center">
            <BtnGroup
              label="Вид"
              value={viewMode}
              options={[
                { value: "combined", label: "Общий" },
                { value: "wallet1", label: "Кошелёк 1" },
                { value: "wallet2", label: "Кошелёк 2" },
              ]}
              onChange={(v) =>
                setViewMode(v as "combined" | "wallet1" | "wallet2")
              }
            />
            <BtnGroup
              label="Раскладка"
              value={layoutType}
              options={[
                { value: "force", label: "Force" },
                { value: "dagre", label: "Dagre" },
                { value: "radial", label: "Radial" },
              ]}
              onChange={(v) =>
                setLayoutType(v as "force" | "dagre" | "radial")
              }
            />

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Фильтр ≥
              </span>
              <input
                type="number"
                value={minAmountFilter}
                onChange={(e) => setMinAmountFilter(Number(e.target.value))}
                className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 ml-auto text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06d6a0]" />
                Исходный
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                Биржа
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                Кошелёк
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#ff0013]" /> TRX
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#26a17b]" /> USDT
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#a855f7]" /> Other
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Graph */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17]/80 z-10">
              <div className="text-center">
                <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-gray-400 text-sm">{progress || "Анализируем транзакции…"}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Это может занять до минуты
                </p>
              </div>
            </div>
          )}

          {result ? (
            <GraphVisualization
              nodes={result.nodes}
              edges={result.edges}
              onNodeClick={setSelectedNode}
              onNodeExpand={handleNodeExpand}
              viewMode={viewMode}
              rootAddresses={[wallet1.trim(), wallet2.trim()]}
              minAmountFilter={minAmountFilter}
              layoutType={layoutType}
            />
          ) : !loading ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4 opacity-30">◈</div>
                <p className="text-base mb-2">
                  Введите адреса кошельков и нажмите &quot;Анализировать&quot;
                </p>
                <p className="text-sm text-gray-700">
                  Граф транзакций появится здесь. Клик по узлу — детали.
                  Двойной клик — раскрыть связи.
                </p>
              </div>
            </div>
          ) : null}

          {/* Status bar */}
          {result && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm px-4 py-2 text-xs text-gray-500 flex gap-4 border-t border-gray-800">
              <span>{result.nodes.length} узлов</span>
              <span>{result.edges.length} связей</span>
              <span>Глубина: {result.metadata.maxDepthReached}</span>
              <span>Транзакций: {result.metadata.totalTransactions}</span>
              {result.metadata.truncated && (
                <span className="text-yellow-500">
                  ⚠ Результат обрезан (лимит узлов)
                </span>
              )}
              {progress && (
                <span className="text-accent">{progress}</span>
              )}
              <span className="ml-auto text-gray-600">
                Клик — детали · Двойной клик — раскрыть
              </span>
            </div>
          )}
        </div>

        {/* Details panel */}
        {selectedNode && (
          <aside className="w-80 border-l border-gray-800 bg-surface overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">Детали узла</h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-500 hover:text-gray-300 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* Address */}
              <div className="mb-4">
                <Label>Адрес</Label>
                <div className="bg-gray-900 rounded p-2 font-mono text-[11px] break-all select-all leading-relaxed">
                  {selectedNode.id}
                </div>
                <a
                  href={`https://tronscan.org/#/address/${selectedNode.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline mt-1 inline-block"
                >
                  Открыть на TronScan →
                </a>
              </div>

              {/* Tags */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {selectedNode.isRoot && (
                  <Tag color="accent">Исходный кошелёк</Tag>
                )}
                {selectedNode.isExchange && (
                  <Tag color="red">{selectedNode.exchangeName}</Tag>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <StatCard
                  label="Получено"
                  value={fmtAmt(selectedNode.totalReceived)}
                  color="text-green-400"
                />
                <StatCard
                  label="Отправлено"
                  value={fmtAmt(selectedNode.totalSent)}
                  color="text-red-400"
                />
                <StatCard
                  label="Транзакции"
                  value={String(selectedNode.transactionCount)}
                />
                <StatCard
                  label="Глубина"
                  value={
                    selectedNode.depth >= 0
                      ? String(selectedNode.depth)
                      : "Раскрыт"
                  }
                />
              </div>

              {/* Connections */}
              <div>
                <Label>Связи</Label>
                <div className="space-y-2 mt-1">
                  {result?.edges
                    .filter(
                      (e) =>
                        e.source === selectedNode.id ||
                        e.target === selectedNode.id,
                    )
                    .sort((a, b) => b.totalAmount - a.totalAmount)
                    .slice(0, 30)
                    .map((edge, i) => {
                      const out = edge.source === selectedNode.id;
                      const other = out ? edge.target : edge.source;
                      const otherNode = result!.nodes.find(
                        (n) => n.id === other,
                      );

                      return (
                        <div
                          key={i}
                          className="bg-gray-900 rounded p-2 text-xs cursor-pointer hover:bg-gray-800 transition-colors"
                          onClick={() => {
                            const node = result!.nodes.find(
                              (n) => n.id === other,
                            );
                            if (node) setSelectedNode(node);
                          }}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span
                              className={
                                out ? "text-red-400" : "text-green-400"
                              }
                            >
                              {out ? "→ OUT" : "← IN"}
                            </span>
                            <span className="font-mono text-gray-400 truncate">
                              {otherNode?.label || shortenAddr(other)}
                            </span>
                            {otherNode?.isExchange && (
                              <span className="text-red-400 text-[10px]">
                                [{otherNode.exchangeName}]
                              </span>
                            )}
                          </div>
                          <div className="text-gray-300">
                            {fmtAmt(edge.totalAmount)} {edge.token}
                            <span className="text-gray-600 ml-1">
                              ({edge.txCount} tx
                              {edge.txCount > 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <button
                onClick={() => handleNodeExpand(selectedNode.id)}
                className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded text-sm transition-colors"
              >
                Раскрыть узел →
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ── Tiny helpers ── */

function fmtAmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function shortenAddr(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
      {children}
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  const cls =
    color === "red"
      ? "bg-red-500/20 text-red-400"
      : "bg-accent/20 text-accent";
  return (
    <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${cls}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900 rounded p-2.5">
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color || "text-gray-200"}`}>
        {value}
      </div>
    </div>
  );
}

function BtnGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="flex">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1 text-xs first:rounded-l last:rounded-r border transition-colors ${
              value === o.value
                ? "bg-accent text-gray-900 border-accent"
                : "bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
