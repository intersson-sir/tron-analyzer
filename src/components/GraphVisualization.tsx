"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GraphNodeData, GraphEdgeData } from "@/types";

interface Props {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  onNodeClick?: (node: GraphNodeData) => void;
  onNodeExpand?: (nodeId: string) => void;
  viewMode: "combined" | "wallet1" | "wallet2";
  rootAddresses: string[];
  minAmountFilter: number;
  layoutType: "force" | "dagre" | "radial";
  timeRange: [number, number] | null;
  focusNodeId: string | null;
  highlightIntersections: boolean;
}

export default function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  onNodeExpand,
  viewMode,
  rootAddresses,
  minAmountFilter,
  layoutType,
  timeRange,
  focusNodeId,
  highlightIntersections,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  // Stable refs for callbacks so they don't trigger graph recreation
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onNodeExpandRef = useRef(onNodeExpand);
  onNodeExpandRef.current = onNodeExpand;
  const focusNodeIdRef = useRef(focusNodeId);
  focusNodeIdRef.current = focusNodeId;

  // Version counter to cancel stale async inits
  const versionRef = useRef(0);

  const getFilteredData = useCallback(() => {
    let filteredEdges = edges.filter((e) => e.totalAmount >= minAmountFilter);

    if (timeRange) {
      const [tMin, tMax] = timeRange;
      filteredEdges = filteredEdges.filter(
        (e) => e.maxTimestamp >= tMin && e.minTimestamp <= tMax,
      );
    }

    if (viewMode !== "combined" && rootAddresses.length === 2) {
      const rootAddr = rootAddresses[viewMode === "wallet1" ? 0 : 1];
      const connected = new Set<string>();
      connected.add(rootAddr);
      let frontier = [rootAddr];
      while (frontier.length > 0) {
        const next: string[] = [];
        for (const addr of frontier) {
          for (const edge of filteredEdges) {
            if (edge.source === addr && !connected.has(edge.target)) {
              connected.add(edge.target);
              next.push(edge.target);
            }
            if (edge.target === addr && !connected.has(edge.source)) {
              connected.add(edge.source);
              next.push(edge.source);
            }
          }
        }
        frontier = next;
      }
      filteredEdges = filteredEdges.filter(
        (e) => connected.has(e.source) && connected.has(e.target),
      );
    }

    const nodeIds = new Set<string>();
    filteredEdges.forEach((e) => {
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    });
    rootAddresses.forEach((a) => nodeIds.add(a));

    const filteredNodes = nodes.filter((n) => nodeIds.has(n.id));
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [nodes, edges, viewMode, rootAddresses, minAmountFilter, timeRange]);

  // Destroy graph and wipe the container DOM completely
  const destroyGraph = useCallback(() => {
    if (graphRef.current) {
      try {
        graphRef.current.destroy();
      } catch {
        // ignore
      }
      graphRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  }, []);

  // Focus on a node — separate effect, does NOT rebuild the graph
  useEffect(() => {
    if (!focusNodeId || !graphRef.current) return;
    try {
      graphRef.current.focusElement(focusNodeId, {
        animation: { duration: 500 },
      });
    } catch {
      // ignore
    }
  }, [focusNodeId]);

  // Main graph lifecycle
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const version = ++versionRef.current;

    destroyGraph();

    const init = async () => {
      const G6 = await import("@antv/g6");

      if (version !== versionRef.current || !containerRef.current) return;

      const { nodes: fNodes, edges: fEdges } = getFilteredData();
      if (fNodes.length === 0) return;

      const maxVolume = Math.max(
        ...fNodes.map((n) => n.totalReceived + n.totalSent),
        1,
      );
      const maxEdgeAmt = Math.max(...fEdges.map((e) => e.totalAmount), 1);

      const nodeSize = (n: GraphNodeData) => {
        const vol = n.totalReceived + n.totalSent;
        return Math.max(24, Math.min(80, 24 + (vol / maxVolume) * 56));
      };

      const hi = highlightIntersections;
      const fid = focusNodeIdRef.current;

      const nodeColor = (n: GraphNodeData) => {
        if (n.isRoot) return "#06d6a0";
        if (hi && n.isIntersection) return "#f59e0b";
        if (n.isExchange) return "#ef4444";
        return "#3b82f6";
      };

      const nodeStroke = (n: GraphNodeData) => {
        if (n.id === fid) return "#ffffff";
        if (n.isRoot) return "#ffffff";
        if (hi && n.isIntersection) return "#fbbf24";
        return "transparent";
      };

      const nodeLineWidth = (n: GraphNodeData) => {
        if (n.id === fid) return 4;
        if (n.isRoot) return 3;
        if (hi && n.isIntersection) return 2;
        return 0;
      };

      const edgeWidth = (e: GraphEdgeData) =>
        Math.max(1, Math.min(8, 1 + (e.totalAmount / maxEdgeAmt) * 7));

      const edgeColor = (e: GraphEdgeData) => {
        if (e.token === "USDT" || e.token === "USDC") return "#26a17b";
        if (e.token === "TRX") return "#ff0013";
        return "#a855f7";
      };

      const g6Nodes = fNodes.map((n) => ({
        id: n.id,
        data: {
          size: nodeSize(n),
          color: nodeColor(n),
          stroke: nodeStroke(n),
          lineWidth: nodeLineWidth(n),
          label: n.label,
          isRoot: n.isRoot,
          isExchange: n.isExchange,
          isIntersection: n.isIntersection,
          exchangeName: n.exchangeName,
          shadowColor:
            n.isIntersection && hi
              ? "rgba(245,158,11,0.5)"
              : n.isRoot
                ? "rgba(6,214,160,0.4)"
                : "transparent",
          shadowBlur: (n.isIntersection && hi) || n.isRoot ? 20 : 0,
        },
      }));

      const g6Edges = fEdges.map((e, i) => ({
        id: e.id || `e-${i}`,
        source: e.source,
        target: e.target,
        data: {
          width: edgeWidth(e),
          color: edgeColor(e),
          label: fmtAmt(e.totalAmount, e.token),
        },
      }));

      const layoutCfg = (() => {
        switch (layoutType) {
          case "dagre":
            return {
              type: "dagre" as const,
              rankdir: "LR",
              nodesep: 50,
              ranksep: 120,
            };
          case "radial":
            return {
              type: "radial" as const,
              unitRadius: 180,
              linkDistance: 200,
              preventOverlap: true,
              nodeSize: 60,
              maxPreventOverlapIteration: 500,
            };
          default:
            return {
              type: "d3-force" as const,
              animated: false,
              link: { distance: 180 },
              charge: { strength: -200, distanceMax: 600 },
              collide: { radius: 35, strength: 0.7 },
            };
        }
      })();

      if (version !== versionRef.current) return;

      const rect = containerRef.current!.getBoundingClientRect();

      const graph = new G6.Graph({
        container: containerRef.current!,
        width: rect.width || 800,
        height: rect.height || 600,
        autoFit: "view",
        padding: [50, 50, 50, 50],
        data: { nodes: g6Nodes, edges: g6Edges },
        node: {
          type: "circle",
          style: {
            size: (d: any) => d.data?.size ?? 30,
            fill: (d: any) => d.data?.color ?? "#3b82f6",
            stroke: (d: any) => d.data?.stroke ?? "transparent",
            lineWidth: (d: any) => d.data?.lineWidth ?? 0,
            shadowColor: (d: any) => d.data?.shadowColor ?? "transparent",
            shadowBlur: (d: any) => d.data?.shadowBlur ?? 0,
            labelText: (d: any) => d.data?.label ?? "",
            labelFill: "#d1d5db",
            labelFontSize: 10,
            labelFontFamily: "'SF Mono','Fira Code',monospace",
            labelPlacement: "bottom",
            labelOffsetY: 4,
            cursor: "pointer",
          },
        },
        edge: {
          type: "line",
          style: {
            stroke: (d: any) => d.data?.color ?? "#6b7280",
            lineWidth: (d: any) => d.data?.width ?? 1,
            endArrow: true,
            endArrowSize: 6,
            labelText: (d: any) => d.data?.label ?? "",
            labelFill: "#9ca3af",
            labelFontSize: 8,
            labelBackground: true,
            labelBackgroundFill: "rgba(17,24,39,0.85)",
            labelBackgroundRadius: 3,
            opacity: 0.75,
          },
        },
        layout: layoutCfg,
        behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
        animation: false,
      });

      graph.on("node:click", (evt: any) => {
        const id = evt.target?.id;
        if (id) {
          const nd = nodesRef.current.find((n) => n.id === id);
          if (nd && onNodeClickRef.current) onNodeClickRef.current(nd);
        }
      });

      graph.on("node:dblclick", (evt: any) => {
        const id = evt.target?.id;
        if (id && onNodeExpandRef.current) onNodeExpandRef.current(id);
      });

      if (version !== versionRef.current) {
        graph.destroy();
        return;
      }

      await graph.render();

      if (version !== versionRef.current) {
        graph.destroy();
        return;
      }

      graphRef.current = graph;
    };

    init().catch(console.error);

    return () => {
      versionRef.current++;
      destroyGraph();
    };
    // Only rebuild when data/filters/layout actually change
    // Callbacks are accessed via refs, focusNodeId has its own effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, viewMode, minAmountFilter, layoutType, rootAddresses, timeRange, highlightIntersections, getFilteredData, destroyGraph]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      if (graphRef.current && el) {
        const { width, height } = el.getBoundingClientRect();
        if (width > 0 && height > 0) {
          graphRef.current.resize(width, height);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0a0e17] rounded-lg overflow-hidden"
      style={{ minHeight: 400 }}
    />
  );
}

function fmtAmt(amount: number, token: string): string {
  if (amount < 0.01) return "";
  let s: string;
  if (amount >= 1_000_000) s = `${(amount / 1_000_000).toFixed(1)}M`;
  else if (amount >= 1_000) s = `${(amount / 1_000).toFixed(1)}K`;
  else if (amount >= 1) s = amount.toFixed(1);
  else s = amount.toFixed(3);
  return `${s} ${token}`;
}
