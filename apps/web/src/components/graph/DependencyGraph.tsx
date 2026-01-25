/**
 * DependencyGraph - Visual dependency tracking between slices
 * Shows blocking relationships and critical paths
 */

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import type { Slice } from '../../data/enterprise-data';

interface DependencyGraphProps {
  slices: Slice[];
  onSliceClick?: (slice: Slice) => void;
}

interface GraphNode {
  id: string;
  slice: Slice;
  x: number;
  y: number;
  level: number;
  blockedBy: string[];
  blocks: string[];
}

export function DependencyGraph({ slices, onSliceClick }: DependencyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);

  // Build dependency graph
  const { nodes, edges, criticalPath } = useMemo(() => {
    // Build adjacency lists
    const blockedByMap: Record<string, string[]> = {};
    const blocksMap: Record<string, string[]> = {};

    slices.forEach(slice => {
      if (slice.blockedBy) {
        blockedByMap[slice.id] = blockedByMap[slice.id] || [];
        blockedByMap[slice.id].push(slice.blockedBy);

        blocksMap[slice.blockedBy] = blocksMap[slice.blockedBy] || [];
        blocksMap[slice.blockedBy].push(slice.id);
      }
    });

    // Calculate levels using topological sort
    const levels: Record<string, number> = {};
    const visited = new Set<string>();

    const calculateLevel = (id: string): number => {
      if (visited.has(id)) return levels[id] || 0;
      visited.add(id);

      const blockers = blockedByMap[id] || [];
      if (blockers.length === 0) {
        levels[id] = 0;
        return 0;
      }

      const maxBlockerLevel = Math.max(...blockers.map(b => calculateLevel(b)));
      levels[id] = maxBlockerLevel + 1;
      return levels[id];
    };

    slices.forEach(s => calculateLevel(s.id));

    // Filter slices for display
    let displaySlices = showOnlyBlocked
      ? slices.filter(s => blockedByMap[s.id]?.length || blocksMap[s.id]?.length || s.status === 'blocked')
      : slices.filter(s => blockedByMap[s.id]?.length || blocksMap[s.id]?.length);

    // If no dependencies found, show top slices
    if (displaySlices.length === 0) {
      displaySlices = slices.slice(0, 10);
    }

    // Position nodes
    const nodesByLevel: Record<number, GraphNode[]> = {};
    const graphNodes: GraphNode[] = displaySlices.map(slice => {
      const level = levels[slice.id] || 0;
      nodesByLevel[level] = nodesByLevel[level] || [];

      const node: GraphNode = {
        id: slice.id,
        slice,
        x: 0,
        y: 0,
        level,
        blockedBy: blockedByMap[slice.id] || [],
        blocks: blocksMap[slice.id] || [],
      };

      nodesByLevel[level].push(node);
      return node;
    });

    // Assign positions
    const levelWidth = 250;
    const nodeHeight = 80;

    Object.entries(nodesByLevel).forEach(([level, levelNodes]) => {
      const x = parseInt(level) * levelWidth + 100;
      const totalHeight = levelNodes.length * nodeHeight;
      const startY = 300 - totalHeight / 2;

      levelNodes.forEach((node, i) => {
        node.x = x;
        node.y = startY + i * nodeHeight;
      });
    });

    // Create edges
    const graphEdges: { from: string; to: string; isCritical: boolean }[] = [];
    graphNodes.forEach(node => {
      node.blockedBy.forEach(blockerId => {
        if (graphNodes.some(n => n.id === blockerId)) {
          graphEdges.push({
            from: blockerId,
            to: node.id,
            isCritical: node.slice.status === 'blocked',
          });
        }
      });
    });

    // Find critical path (longest path with blocked items)
    const critical: string[] = [];
    const blockedNodes = graphNodes.filter(n => n.slice.status === 'blocked');
    blockedNodes.forEach(node => {
      critical.push(node.id);
      node.blockedBy.forEach(b => critical.push(b));
    });

    return {
      nodes: graphNodes,
      edges: graphEdges,
      criticalPath: [...new Set(critical)],
    };
  }, [slices, showOnlyBlocked]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
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

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node.id);
    onSliceClick?.(node.slice);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const statusColors: Record<string, string> = {
    backlog: 'stroke-gray-500 fill-gray-500/20',
    ready: 'stroke-blue-500 fill-blue-500/20',
    in_progress: 'stroke-yellow-500 fill-yellow-500/20',
    in_review: 'stroke-purple-500 fill-purple-500/20',
    completed: 'stroke-green-500 fill-green-500/20',
    blocked: 'stroke-red-500 fill-red-500/20',
  };

  const blockedCount = nodes.filter(n => n.slice.status === 'blocked').length;
  const completedCount = nodes.filter(n => n.slice.status === 'completed').length;

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-semibold text-claude-neutral-100">Dependencies</h2>
          <span className="text-xs text-claude-neutral-500">
            {nodes.length} items, {edges.length} connections
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnlyBlocked(!showOnlyBlocked)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              showOnlyBlocked
                ? 'bg-red-500/20 text-red-400'
                : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
            )}
          >
            <Filter className="w-3 h-3" />
            Blocked Only
          </button>

          <div className="w-px h-4 bg-claude-neutral-700" />

          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-claude-neutral-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-claude-neutral-500">
            <div className="text-center">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-1">No dependencies found</p>
              <p className="text-sm">Add blockedBy relationships to see the dependency graph</p>
            </div>
          </div>
        ) : (
          <svg
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Grid */}
            <defs>
              <pattern id="dep-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.02)" />
              </pattern>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
              </marker>
              <marker
                id="arrowhead-critical"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="rgba(239, 68, 68, 0.7)" />
              </marker>
            </defs>
            <rect width="2000" height="1000" fill="url(#dep-grid)" x="-500" y="-200" />

            {/* Edges */}
            {edges.map(edge => {
              const from = nodes.find(n => n.id === edge.from);
              const to = nodes.find(n => n.id === edge.to);
              if (!from || !to) return null;

              const isCritical = edge.isCritical || criticalPath.includes(edge.from) && criticalPath.includes(edge.to);

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={from.x + 100}
                    y1={from.y + 25}
                    x2={to.x - 10}
                    y2={to.y + 25}
                    stroke={isCritical ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isCritical ? 2 : 1}
                    markerEnd={isCritical ? 'url(#arrowhead-critical)' : 'url(#arrowhead)'}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isSelected = selectedNode === node.id;
              const isCritical = criticalPath.includes(node.id);
              const colors = statusColors[node.slice.status];

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  className="cursor-pointer"
                >
                  {/* Node card */}
                  <rect
                    width={200}
                    height={50}
                    rx={8}
                    className={clsx(colors, 'transition-all')}
                    strokeWidth={isSelected ? 3 : isCritical ? 2 : 1}
                    stroke={isSelected ? '#D97757' : undefined}
                  />

                  {/* Status icon */}
                  <foreignObject x={10} y={10} width={30} height={30}>
                    <div className="flex items-center justify-center">
                      {node.slice.status === 'blocked' && (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      )}
                      {node.slice.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {node.slice.status === 'in_progress' && (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                      {!['blocked', 'completed', 'in_progress'].includes(node.slice.status) && (
                        <div className="w-3 h-3 rounded-full bg-current" />
                      )}
                    </div>
                  </foreignObject>

                  {/* Text */}
                  <text x={45} y={22} className="text-xs fill-claude-neutral-400">
                    {node.slice.shortId}
                  </text>
                  <text x={45} y={38} className="text-sm fill-claude-neutral-200">
                    {node.slice.name.length > 18 ? node.slice.name.slice(0, 18) + '...' : node.slice.name}
                  </text>

                  {/* Dependency indicators */}
                  {node.blockedBy.length > 0 && (
                    <circle cx={0} cy={25} r={8} className="fill-claude-neutral-700 stroke-claude-neutral-600" />
                  )}
                  {node.blocks.length > 0 && (
                    <circle cx={200} cy={25} r={8} className="fill-claude-neutral-700 stroke-claude-neutral-600" />
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-claude-neutral-800">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-claude-neutral-400">Blocked ({blockedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-claude-neutral-400">Completed ({completedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-claude-neutral-400" />
            <span className="text-claude-neutral-400">Blocks</span>
          </div>
        </div>
        <div className="text-xs text-claude-neutral-500">
          Click nodes to view details
        </div>
      </div>
    </div>
  );
}
