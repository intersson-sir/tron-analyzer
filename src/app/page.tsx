"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  const [highlightIntersections, setHighlightIntersections] = useState(true);
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const timeRange = useMemo<[number, number] | null>(() => {
    if (!timeFrom && !timeTo) return null;
    const from = timeFrom ? new Date(timeFrom).getTime() : 0;
    const to = timeTo ? new Date(timeTo + "T23:59:59").getTime() : Date.now();
    return [from, to];
  }, [timeFrom, timeTo]);

  const timeRangeBounds = useMemo(() => {
    if (!result) return null;
    const { min, max } = result.metadata.timeRange;
    if (!min || !max) return null;
    return {
      min: new Date(min).toISOString().split("T")[0],
      max: new Date(max).toISOString().split("T")[0],
    };
  }, [result]);

  const intersectionNodes = useMemo(() => {
    if (!result) return [];
    return result.nodes.filter((n) => n.isIntersection);
  }, [result]);

  const searchResults = useMemo(() => {
    if (!result || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return result.nodes
      .filter(
        (n) =>
          n.id.toLowerCase().includes(q) ||
          (n.exchangeName && n.exchangeName.toLowerCase().includes(q)) ||
          n.label.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [result, searchQuery]);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedNode(null);
    setFocusNodeId(null);
    setTimeFrom("");
    setTimeTo("");
    setSearchQuery("");
    setProgress("Загружаем данные…");

    try {
      const res = await fetch("/api/snapshot");

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
  }, []);

  useEffect(() => {
    loadSnapshot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSearch = useCallback(
    (nodeId: string) => {
      setFocusNodeId(nodeId);
      setSearchQuery("");
      const node = result?.nodes.find((n) => n.id === nodeId);
      if (node) setSelectedNode(node);
    },
    [result],
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
      <div className="border-b border-gray-800 flex-shrink-0">
        {/* Wallet info bar */}
        <div className="px-5 py-2.5 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06d6a0] flex-shrink-0" />
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">W1</span>
            <span className="font-mono text-gray-300 select-all">{DEFAULT_W1}</span>
          </div>
          <div className="w-px h-4 bg-gray-800" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06d6a0] flex-shrink-0" />
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">W2</span>
            <span className="font-mono text-gray-300 select-all">{DEFAULT_W2}</span>
          </div>
          {result && typeof (result.metadata as Record<string, unknown>).syncedAt === "number" && (
            <span className="ml-auto text-gray-600">
              Снапшот: {new Date((result.metadata as Record<string, unknown>).syncedAt as number).toLocaleString("ru")}
            </span>
          )}
        </div>

        {/* Row 2: Toolbar — appears after analysis */}
        {result && (
          <div className="px-5 py-2 border-t border-gray-800/60 space-y-2 text-xs">
            {/* Toolbar line 1: view + layout + filter + intersections */}
            <div className="flex items-center gap-2.5">
              <BtnGroup
                value={viewMode}
                options={[
                  { value: "combined", label: "Общий" },
                  { value: "wallet1", label: "W1" },
                  { value: "wallet2", label: "W2" },
                ]}
                onChange={(v) =>
                  setViewMode(v as "combined" | "wallet1" | "wallet2")
                }
              />
              <Sep />
              <BtnGroup
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
              <Sep />
              <span className="text-gray-500">≥</span>
              <input
                type="text"
                inputMode="decimal"
                value={minAmountFilter || ""}
                onChange={(e) => setMinAmountFilter(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-7 w-16 bg-gray-900 border border-gray-700 rounded px-2 text-xs tabular-nums focus:border-accent focus:outline-none"
              />
              <Sep />
              <button
                onClick={() => setHighlightIntersections(!highlightIntersections)}
                className={`flex items-center gap-1.5 h-7 px-2.5 rounded border transition-colors ${
                  highlightIntersections
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-gray-900 text-gray-500 border-gray-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Пересечения
                {result.metadata.intersectionCount > 0 && (
                  <span className="bg-amber-500/25 text-amber-300 px-1.5 rounded-full text-[10px] font-semibold leading-none py-0.5">
                    {result.metadata.intersectionCount}
                  </span>
                )}
              </button>
            </div>

            {/* Toolbar line 2: search + time range */}
            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusNodeId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0) {
                      handleSearch(searchResults[0].id);
                    }
                    if (e.key === "Escape") setSearchQuery("");
                  }}
                  placeholder="🔍  Поиск адреса…"
                  className="h-7 w-52 bg-gray-900 border border-gray-700 rounded px-2 text-xs font-mono focus:border-accent focus:outline-none placeholder:text-gray-600 placeholder:font-sans"
                />
                {searchQuery.trim() && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-[#141a26] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {searchResults.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleSearch(node.id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800/60 transition-colors flex items-center gap-2 border-b border-gray-800/50 last:border-0"
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: node.isRoot
                              ? "#06d6a0"
                              : node.isIntersection
                                ? "#f59e0b"
                                : node.isExchange
                                  ? "#ef4444"
                                  : "#3b82f6",
                          }}
                        />
                        <span className="font-mono truncate">{node.id}</span>
                        {node.exchangeName && (
                          <span className="text-red-400 text-[10px] flex-shrink-0">
                            {node.exchangeName}
                          </span>
                        )}
                        {node.isIntersection && (
                          <span className="text-amber-400 text-[10px] flex-shrink-0">∩</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 mt-1 w-60 bg-[#141a26] border border-gray-700 rounded-lg shadow-2xl z-50 px-3 py-2 text-xs text-gray-500">
                    Не найдено
                  </div>
                )}
              </div>

              <Sep />

              {/* Time range */}
              <span className="text-gray-500">Период</span>
              <input
                type="date"
                value={timeFrom}
                min={timeRangeBounds?.min}
                max={timeRangeBounds?.max}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="h-7 bg-gray-900 border border-gray-700 rounded px-1.5 text-xs focus:border-accent focus:outline-none [color-scheme:dark]"
              />
              <span className="text-gray-700">—</span>
              <input
                type="date"
                value={timeTo}
                min={timeRangeBounds?.min}
                max={timeRangeBounds?.max}
                onChange={(e) => setTimeTo(e.target.value)}
                className="h-7 bg-gray-900 border border-gray-700 rounded px-1.5 text-xs focus:border-accent focus:outline-none [color-scheme:dark]"
              />
              {(timeFrom || timeTo) && (
                <button
                  onClick={() => { setTimeFrom(""); setTimeTo(""); }}
                  className="text-gray-500 hover:text-gray-300 text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Intersection bar — thin, non-intrusive */}
      {result && result.metadata.intersectionCount > 0 && highlightIntersections && (
        <div className="px-5 py-1.5 bg-amber-950/30 border-b border-amber-900/30 flex items-center gap-2 text-xs text-amber-400/90 flex-shrink-0">
          <span>⚡</span>
          <span>
            <span className="font-medium">{result.metadata.intersectionCount} общих адресов</span>
            {" "}между кошельками
          </span>
          <button
            onClick={() => {
              if (intersectionNodes.length > 0) {
                handleSearch(intersectionNodes[0].id);
              }
            }}
            className="ml-2 underline underline-offset-2 decoration-amber-600/50 hover:decoration-amber-400 transition-colors"
          >
            показать →
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-5 mt-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-md text-red-400 text-xs flex-shrink-0">
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
                <p className="text-gray-400 text-sm">
                  {progress || "Загружаем граф…"}
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
              rootAddresses={[DEFAULT_W1, DEFAULT_W2]}
              minAmountFilter={minAmountFilter}
              layoutType={layoutType}
              timeRange={timeRange}
              focusNodeId={focusNodeId}
              highlightIntersections={highlightIntersections}
            />
          ) : !loading ? (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4 opacity-30">◈</div>
                <p className="text-base mb-2">Загружаем граф транзакций…</p>
                <p className="text-sm text-gray-700">
                  Граф появится через несколько секунд.
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
              {result.metadata.intersectionCount > 0 && (
                <span className="text-amber-400">
                  ⚡ {result.metadata.intersectionCount} пересечений
                </span>
              )}
              {result.metadata.truncated && (
                <span className="text-yellow-500">
                  ⚠ Результат обрезан
                </span>
              )}
              {progress && (
                <span className="text-accent">{progress}</span>
              )}
              <span className="ml-auto flex items-center gap-3 text-gray-600">
                <LegendDot color="#06d6a0" label="Исходный" />
                <LegendDot color="#f59e0b" label="∩" />
                <LegendDot color="#ef4444" label="Биржа" />
                <LegendDot color="#3b82f6" label="Кошелёк" />
                <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-[#ff0013] rounded-full" />TRX</span>
                <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-[#26a17b] rounded-full" />USDT</span>
                <span className="text-gray-700">·</span>
                Клик — детали
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
                {selectedNode.isIntersection && (
                  <Tag color="amber">Пересечение</Tag>
                )}
                {selectedNode.isExchange && (
                  <Tag color="red">{selectedNode.exchangeName}</Tag>
                )}
              </div>

              {/* Intersection explanation */}
              {selectedNode.isIntersection && (
                <div className="mb-4 p-2 bg-amber-900/20 border border-amber-700/30 rounded text-[11px] text-amber-300/80">
                  Оба исследуемых кошелька имеют связь с этим адресом
                </div>
              )}

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
                            if (node) {
                              setSelectedNode(node);
                              setFocusNodeId(node.id);
                            }
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
                            {otherNode?.isIntersection && (
                              <span className="text-amber-400 text-[10px]">
                                ∩
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
      : color === "amber"
        ? "bg-amber-500/20 text-amber-400"
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
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`h-7 px-2.5 text-xs first:rounded-l last:rounded-r border transition-colors ${
            value === o.value
              ? "bg-accent text-gray-900 border-accent font-medium"
              : "bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-800" />;
}

function Ctl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
