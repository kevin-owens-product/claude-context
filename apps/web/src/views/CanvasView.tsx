/**
 * CanvasView - Intent graph visualization
 * Shows goals, constraints, behaviors and their relationships
 */

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Target,
  Shield,
  Zap,
  Link2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';
import type { Intent, Slice, ContextDoc } from '../data/enterprise-data';

interface CanvasViewProps {
  intents: Intent[];
  slices: Slice[];
  context: ContextDoc[];
  onIntentClick?: (intent: Intent) => void;
  onSliceClick?: (slice: Slice) => void;
  onContextClick?: (doc: ContextDoc) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

type NodeType = 'goal' | 'constraint' | 'behavior' | 'slice' | 'context';

interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  data: Intent | Slice | ContextDoc;
  position: NodePosition;
  connections: string[];
}

export function CanvasView({
  intents,
  slices,
  context,
  onIntentClick,
  onSliceClick,
  onContextClick,
}: CanvasViewProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSlices, setShowSlices] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Generate nodes from data
  const nodes = useMemo(() => {
    const result: CanvasNode[] = [];
    const centerX = 600;
    const centerY = 400;

    // Goals in the center-top
    const goals = intents.filter(i => i.type === 'goal');
    goals.forEach((intent, i) => {
      const angle = (i / goals.length) * Math.PI - Math.PI / 2;
      const radius = 150;
      result.push({
        id: intent.id,
        type: 'goal',
        name: intent.name,
        data: intent,
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY - 200 + Math.sin(angle) * radius * 0.5,
        },
        connections: [],
      });
    });

    // Constraints on the left
    const constraints = intents.filter(i => i.type === 'constraint');
    constraints.forEach((intent, i) => {
      result.push({
        id: intent.id,
        type: 'constraint',
        name: intent.name,
        data: intent,
        position: {
          x: 150,
          y: 200 + i * 100,
        },
        connections: goals.map(g => g.id),
      });
    });

    // Behaviors on the right
    const behaviors = intents.filter(i => i.type === 'behavior');
    behaviors.forEach((intent, i) => {
      result.push({
        id: intent.id,
        type: 'behavior',
        name: intent.name,
        data: intent,
        position: {
          x: 1050,
          y: 200 + i * 100,
        },
        connections: goals.map(g => g.id),
      });
    });

    // Slices at the bottom, connected to their intents
    if (showSlices) {
      const linkedSlices = slices.filter(s => s.linkedIntent);
      linkedSlices.forEach((slice, i) => {
        const linkedIntent = result.find(n => n.id === slice.linkedIntent);
        const baseX = linkedIntent ? linkedIntent.position.x : centerX;
        const offsetX = (i % 5 - 2) * 120;

        result.push({
          id: slice.id,
          type: 'slice',
          name: slice.name,
          data: slice,
          position: {
            x: baseX + offsetX,
            y: centerY + 200 + Math.floor(i / 5) * 80,
          },
          connections: slice.linkedIntent ? [slice.linkedIntent] : [],
        });
      });
    }

    // Context docs scattered around
    if (showContext) {
      context.forEach((doc, i) => {
        const angle = (i / context.length) * Math.PI * 2;
        const radius = 350;
        result.push({
          id: doc.id,
          type: 'context',
          name: doc.name,
          data: doc,
          position: {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius * 0.6,
          },
          connections: [],
        });
      });
    }

    return result;
  }, [intents, slices, context, showSlices, showContext]);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
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

  const handleNodeClick = (node: CanvasNode) => {
    setSelectedNode(node.id);
    if (node.type === 'goal' || node.type === 'constraint' || node.type === 'behavior') {
      onIntentClick?.(node.data as Intent);
    } else if (node.type === 'slice') {
      onSliceClick?.(node.data as Slice);
    } else if (node.type === 'context') {
      onContextClick?.(node.data as ContextDoc);
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const nodeIcons: Record<NodeType, typeof Target> = {
    goal: Target,
    constraint: Shield,
    behavior: Zap,
    slice: Layers,
    context: Link2,
  };

  const nodeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
    goal: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
    constraint: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400' },
    behavior: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
    slice: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
    context: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-claude-neutral-900 relative">
      {/* Canvas Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-claude-neutral-400">
            {nodes.length} nodes
          </span>
          <div className="w-px h-4 bg-claude-neutral-700 mx-2" />
          <button
            onClick={() => setShowSlices(!showSlices)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              showSlices
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-claude-neutral-500 hover:text-claude-neutral-300'
            )}
          >
            {showSlices ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Slices
          </button>
          <button
            onClick={() => setShowContext(!showContext)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              showContext
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-claude-neutral-500 hover:text-claude-neutral-300'
            )}
          >
            {showContext ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Context
          </button>
        </div>

        <div className="flex items-center gap-2">
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
            title="Reset view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Grid Pattern */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Connections */}
          {nodes.map(node =>
            node.connections.map(targetId => {
              const target = nodes.find(n => n.id === targetId);
              if (!target) return null;

              const isHighlighted = selectedNode === node.id || selectedNode === targetId;

              return (
                <line
                  key={`${node.id}-${targetId}`}
                  x1={node.position.x}
                  y1={node.position.y}
                  x2={target.position.x}
                  y2={target.position.y}
                  stroke={isHighlighted ? 'rgba(217, 119, 87, 0.5)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={node.type === 'context' ? '4,4' : undefined}
                />
              );
            })
          )}

          {/* Nodes */}
          {nodes.map(node => {
            const Icon = nodeIcons[node.type];
            const colors = nodeColors[node.type];
            const isSelected = selectedNode === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer"
              >
                {/* Node Background */}
                <rect
                  x={-70}
                  y={-25}
                  width={140}
                  height={50}
                  rx={8}
                  className={clsx(
                    'transition-all',
                    colors.bg,
                    isSelected && 'stroke-2'
                  )}
                  stroke={isSelected ? '#D97757' : undefined}
                />

                {/* Node Border */}
                <rect
                  x={-70}
                  y={-25}
                  width={140}
                  height={50}
                  rx={8}
                  fill="none"
                  className={colors.border}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />

                {/* Icon */}
                <foreignObject x={-60} y={-15} width={30} height={30}>
                  <div className={clsx('flex items-center justify-center', colors.text)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={-25}
                  y={5}
                  className="text-xs fill-claude-neutral-200"
                  style={{ fontSize: '11px' }}
                >
                  {node.name.length > 18 ? node.name.slice(0, 18) + '...' : node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 border-t border-claude-neutral-800">
        {(['goal', 'constraint', 'behavior', 'slice', 'context'] as NodeType[]).map(type => {
          const Icon = nodeIcons[type];
          const colors = nodeColors[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={clsx('p-1 rounded', colors.bg)}>
                <Icon className={clsx('w-3 h-3', colors.text)} />
              </div>
              <span className="text-xs text-claude-neutral-400 capitalize">{type}</span>
            </div>
          );
        })}
      </div>

      {/* Quick Add Button */}
      <button
        className="absolute bottom-16 right-4 p-3 bg-claude-primary-500 text-white rounded-full shadow-lg hover:bg-claude-primary-600 transition-colors"
        title="Add Intent"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
