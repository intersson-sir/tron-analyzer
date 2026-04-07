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
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const getFilteredData = useCallback(() => {
    let filteredEdges = edges.filter((e) => e.totalAmount >= minAmountFilter);

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
  }, [nodes, edges, viewMode, rootAddresses, minAmountFilter]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    let destroyed = false;

    const init = async () => {
      const G6 = await import("@antv/g6");

      if (destroyed) return;

      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }

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

      const nodeColor = (n: GraphNodeData) => {
        if (n.isRoot) return "#06d6a0";
        if (n.isExchange) return "#ef4444";
        return "#3b82f6";
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
          label: n.label,
          isRoot: n.isRoot,
          isExchange: n.isExchange,
          exchangeName: n.exchangeName,
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
          totalAmount: e.totalAmount,
          token: e.token,
          txCount: e.txCount,
        },
      }));

      const layoutCfg = (() => {
        switch (layoutType) {
          case "dagre":
            return { type: "dagre" as const, rankdir: "LR", nodesep: 60, ranksep: 160 };
          case "radial":
            return { type: "radial" as const, unitRadius: 200, linkDistance: 250 };
          default:
            return {
              type: "force" as const,
              preventOverlap: true,
              nodeSize: 60,
              linkDistance: 220,
              nodeStrength: -800,
              edgeStrength: 0.4,
            };
        }
      })();

      const rect = containerRef.current!.getBoundingClientRect();

      const graph = new G6.Graph({
        container: containerRef.current!,
        width: rect.width,
        height: rect.height,
        autoFit: "view",
        padding: [60, 60, 60, 60],
        data: { nodes: g6Nodes, edges: g6Edges },
        node: {
          type: "circle",
          style: {
            size: (d: any) => d.data?.size ?? 30,
            fill: (d: any) => d.data?.color ?? "#3b82f6",
            stroke: (d: any) => (d.data?.isRoot ? "#ffffff" : "transparent"),
            lineWidth: (d: any) => (d.data?.isRoot ? 3 : 0),
            labelText: (d: any) => d.data?.label ?? "",
            labelFill: "#d1d5db",
            labelFontSize: 10,
            labelFontFamily: "'SF Mono', 'Fira Code', monospace",
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
        animation: true,
      });

      graph.on("node:click", (evt: any) => {
        const id = evt.target?.id;
        if (id) {
          const nd = nodesRef.current.find((n) => n.id === id);
          if (nd && onNodeClick) onNodeClick(nd);
        }
      });

      graph.on("node:dblclick", (evt: any) => {
        const id = evt.target?.id;
        if (id && onNodeExpand) onNodeExpand(id);
      });

      await graph.render();
      graphRef.current = graph;
    };

    init().catch(console.error);

    return () => {
      destroyed = true;
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [nodes, edges, viewMode, minAmountFilter, layoutType, rootAddresses, getFilteredData, onNodeClick, onNodeExpand]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (graphRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        graphRef.current.resize(width, height);
      }
    });
    ro.observe(containerRef.current);
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
