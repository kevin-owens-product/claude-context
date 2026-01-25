/**
 * CallGraphVisualization - Interactive call graph SVG
 *
 * Displays an interactive call graph with zoom/pan, node selection,
 * and depth control. Shows function/method call relationships.
 *
 * @prompt-id forge-v4.1:web:component:call-graph-visualization:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { CallGraph, CallGraphNode, SymbolKind } from '../../api/symbols';

interface CallGraphVisualizationProps {
  graph: CallGraph;
  onSelectSymbol?: (symbolId: string) => void;
  selectedSymbolId?: string;
  direction?: 'callers' | 'callees' | 'both';
  className?: string;
}

interface LayoutNode {
  id: string;
  name: string;
  kind: SymbolKind;
  filePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  isRoot: boolean;
}

interface LayoutEdge {
  sourceId: string;
  targetId: string;
  kind: string;
  callCount: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 40;

const kindColors: Record<SymbolKind, { bg: string; border: string; text: string }> = {
  FUNCTION: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  METHOD: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  CLASS: { bg: '#3f1e5f', border: '#8b5cf6', text: '#c4b5fd' },
  INTERFACE: { bg: '#1e5f4a', border: '#10b981', text: '#6ee7b7' },
  TYPE: { bg: '#1e5f4a', border: '#10b981', text: '#6ee7b7' },
  ENUM: { bg: '#5f4a1e', border: '#f59e0b', text: '#fcd34d' },
  VARIABLE: { bg: '#4a4a4a', border: '#737373', text: '#a3a3a3' },
  CONSTANT: { bg: '#4a4a4a', border: '#737373', text: '#a3a3a3' },
  PROPERTY: { bg: '#4a4a4a', border: '#737373', text: '#a3a3a3' },
  NAMESPACE: { bg: '#5f1e3a', border: '#ec4899', text: '#f9a8d4' },
  MODULE: { bg: '#5f1e3a', border: '#ec4899', text: '#f9a8d4' },
};

function layoutGraph(
  graph: CallGraph,
  direction: 'callers' | 'callees' | 'both'
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const visited = new Set<string>();

  // Convert nodes Map or object to usable format
  const graphNodes = graph.nodes instanceof Map
    ? Object.fromEntries(graph.nodes)
    : graph.nodes;

  // BFS to layout nodes by depth
  const depthMap = new Map<number, LayoutNode[]>();

  function processNode(node: CallGraphNode, depth: number) {
    if (visited.has(node.symbol.id)) return;
    visited.add(node.symbol.id);

    const layoutNode: LayoutNode = {
      id: node.symbol.id,
      name: node.symbol.name,
      kind: node.symbol.kind,
      filePath: node.symbol.filePath,
      x: 0,
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      depth,
      isRoot: depth === 0,
    };

    nodes.push(layoutNode);

    if (!depthMap.has(depth)) {
      depthMap.set(depth, []);
    }
    depthMap.get(depth)!.push(layoutNode);

    // Process callers (going up)
    if (direction === 'callers' || direction === 'both') {
      for (const caller of node.callers) {
        edges.push({
          sourceId: caller.symbolId,
          targetId: node.symbol.id,
          kind: caller.referenceKind,
          callCount: caller.callCount,
        });

        const callerNode = graphNodes[caller.symbolId];
        if (callerNode && !visited.has(caller.symbolId)) {
          processNode(callerNode, depth - 1);
        }
      }
    }

    // Process callees (going down)
    if (direction === 'callees' || direction === 'both') {
      for (const callee of node.callees) {
        edges.push({
          sourceId: node.symbol.id,
          targetId: callee.symbolId,
          kind: callee.referenceKind,
          callCount: callee.callCount,
        });

        const calleeNode = graphNodes[callee.symbolId];
        if (calleeNode && !visited.has(callee.symbolId)) {
          processNode(calleeNode, depth + 1);
        }
      }
    }
  }

  // Start from root
  processNode(graph.root, 0);

  // Calculate positions
  const depths = Array.from(depthMap.keys()).sort((a, b) => a - b);
  const minDepth = Math.min(...depths);
  // const maxDepth is used in the returned data but not in layout

  depths.forEach(depth => {
    const nodesAtDepth = depthMap.get(depth)!;
    const normalizedDepth = depth - minDepth;
    const x = normalizedDepth * (NODE_WIDTH + HORIZONTAL_SPACING) + 50;

    nodesAtDepth.forEach((node, index) => {
      const totalHeight = nodesAtDepth.length * (NODE_HEIGHT + VERTICAL_SPACING);
      const startY = 50 - totalHeight / 2 + 200;
      node.x = x;
      node.y = startY + index * (NODE_HEIGHT + VERTICAL_SPACING);
    });
  });

  return { nodes, edges };
}

export function CallGraphVisualization({
  graph,
  onSelectSymbol,
  selectedSymbolId,
  direction = 'both',
  className,
}: CallGraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(
    () => layoutGraph(graph, direction),
    [graph, direction]
  );

  // Calculate SVG bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    const minX = Math.min(...nodes.map(n => n.x)) - 50;
    const minY = Math.min(...nodes.map(n => n.y)) - 50;
    const maxX = Math.max(...nodes.map(n => n.x + n.width)) + 50;
    const maxY = Math.max(...nodes.map(n => n.y + n.height)) + 50;
    return { minX, minY, maxX, maxY };
  }, [nodes]);

  const viewBox = `${bounds.minX - pan.x / zoom} ${bounds.minY - pan.y / zoom} ${(bounds.maxX - bounds.minX) / zoom} ${(bounds.maxY - bounds.minY) / zoom}`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.25, Math.min(3, z * delta)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'call-graph.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Get path for edge
  const getEdgePath = (edge: LayoutEdge): string => {
    const source = nodes.find(n => n.id === edge.sourceId);
    const target = nodes.find(n => n.id === edge.targetId);
    if (!source || !target) return '';

    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;

    // Curved path
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };

  if (nodes.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center h-64 text-gray-500', className)}>
        No call graph data available
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-gray-800/80 backdrop-blur rounded-lg p-1">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.25))}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.25, z * 0.8))}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Reset view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-600 mx-1" />
        <button
          onClick={exportSVG}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Export SVG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 bg-gray-800/80 backdrop-blur rounded-lg px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <ArrowUp className="w-3 h-3 text-orange-400" />
          <span className="text-gray-400">Callers</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDown className="w-3 h-3 text-green-400" />
          <span className="text-gray-400">Callees</span>
        </div>
        <div className="text-gray-500">{nodes.length} nodes</div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full bg-gray-900 rounded-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
          </marker>
        </defs>

        {/* Edges */}
        <g>
          {edges.map((edge, index) => (
            <path
              key={`edge-${index}`}
              d={getEdgePath(edge)}
              fill="none"
              stroke="#4b5563"
              strokeWidth={Math.min(edge.callCount, 3)}
              strokeOpacity={0.6}
              markerEnd="url(#arrowhead)"
            />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map(node => {
            const colors = kindColors[node.kind] || kindColors.FUNCTION;
            const isSelected = node.id === selectedSymbolId;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectSymbol?.(node.id)}
                className="cursor-pointer"
              >
                <rect
                  width={node.width}
                  height={node.height}
                  rx={6}
                  fill={colors.bg}
                  stroke={isSelected ? '#fff' : colors.border}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-all"
                />
                {node.isRoot && (
                  <rect
                    x={-2}
                    y={-2}
                    width={node.width + 4}
                    height={node.height + 4}
                    rx={8}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
                <text
                  x={node.width / 2}
                  y={22}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={12}
                  fontWeight={500}
                >
                  {node.name.length > 20 ? node.name.slice(0, 20) + '...' : node.name}
                </text>
                <text
                  x={node.width / 2}
                  y={38}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={10}
                >
                  {node.kind.toLowerCase()}
                </text>
                <text
                  x={node.width / 2}
                  y={52}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={9}
                >
                  {node.filePath.split('/').pop()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default CallGraphVisualization;
