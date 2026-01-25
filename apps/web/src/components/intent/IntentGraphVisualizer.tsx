/**
 * Intent Graph Visualizer - Visual representation of intent graph nodes
 * @prompt-id forge-v4.1:web:components:intent:visualizer:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Target,
  AlertTriangle,
  Box,
  Workflow,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
} from 'lucide-react';
import type { IntentGraph, IntentGoal, IntentConstraint, IntentEntity, IntentBehavior, IntentContext } from '../../api/intent-graphs';

interface IntentGraphVisualizerProps {
  graph: IntentGraph;
  onSelectNode: (nodeId: string, nodeType: 'goal' | 'constraint' | 'entity' | 'behavior' | 'context') => void;
  selectedNodeId?: string;
}

type NodeType = 'goal' | 'constraint' | 'entity' | 'behavior' | 'context';

interface VisualNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  x: number;
  y: number;
  data: IntentGoal | IntentConstraint | IntentEntity | IntentBehavior | IntentContext;
}

const nodeColors: Record<NodeType, { bg: string; border: string; icon: string }> = {
  goal: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400', icon: 'text-orange-600 dark:text-orange-400' },
  constraint: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-400', icon: 'text-red-600 dark:text-red-400' },
  entity: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', icon: 'text-blue-600 dark:text-blue-400' },
  behavior: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', icon: 'text-purple-600 dark:text-purple-400' },
  context: { bg: 'bg-gray-100 dark:bg-gray-900/30', border: 'border-gray-400', icon: 'text-gray-600 dark:text-gray-400' },
};

const nodeIcons: Record<NodeType, React.ReactNode> = {
  goal: <Target className="w-4 h-4" />,
  constraint: <AlertTriangle className="w-4 h-4" />,
  entity: <Box className="w-4 h-4" />,
  behavior: <Workflow className="w-4 h-4" />,
  context: <FileText className="w-4 h-4" />,
};

export function IntentGraphVisualizer({ graph, onSelectNode, selectedNodeId }: IntentGraphVisualizerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Convert graph data to visual nodes with positions
  const nodes = useMemo(() => {
    const result: VisualNode[] = [];
    const colWidth = 220;
    const rowHeight = 80;
    let col = 0;

    // Goals column
    graph.goals.forEach((goal, i) => {
      result.push({
        id: goal.id,
        type: 'goal',
        label: goal.description.substring(0, 30) + (goal.description.length > 30 ? '...' : ''),
        description: goal.description,
        x: col * colWidth + 20,
        y: i * rowHeight + 20,
        data: goal,
      });
    });
    col++;

    // Constraints column
    graph.constraints.forEach((constraint, i) => {
      result.push({
        id: constraint.id,
        type: 'constraint',
        label: constraint.description.substring(0, 30) + (constraint.description.length > 30 ? '...' : ''),
        description: constraint.description,
        x: col * colWidth + 20,
        y: i * rowHeight + 20,
        data: constraint,
      });
    });
    col++;

    // Entities column
    graph.entities.forEach((entity, i) => {
      result.push({
        id: entity.id,
        type: 'entity',
        label: entity.name,
        description: entity.description,
        x: col * colWidth + 20,
        y: i * rowHeight + 20,
        data: entity,
      });
    });
    col++;

    // Behaviors column
    graph.behaviors.forEach((behavior, i) => {
      result.push({
        id: behavior.id,
        type: 'behavior',
        label: behavior.name,
        description: behavior.description,
        x: col * colWidth + 20,
        y: i * rowHeight + 20,
        data: behavior,
      });
    });
    col++;

    // Contexts column
    graph.contexts.forEach((context, i) => {
      result.push({
        id: context.id,
        type: 'context',
        label: context.category,
        description: context.content.substring(0, 50) + '...',
        x: col * colWidth + 20,
        y: i * rowHeight + 20,
        data: context,
      });
    });

    return result;
  }, [graph]);

  const maxX = Math.max(...nodes.map((n) => n.x)) + 200;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 100;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-claude-cream-300 dark:border-claude-neutral-700 bg-claude-cream-50 dark:bg-claude-neutral-800">
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(nodeIcons).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-1">
                <span className={nodeColors[type as NodeType].icon}>{icon}</span>
                <span className="text-claude-neutral-600 dark:text-claude-neutral-400 capitalize">{type}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-1.5 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700"
          >
            <ZoomOut className="w-4 h-4 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
          <span className="text-xs text-claude-neutral-600 dark:text-claude-neutral-400 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-1.5 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700"
          >
            <ZoomIn className="w-4 h-4 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700"
          >
            <Maximize2 className="w-4 h-4 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-claude-cream-100 dark:bg-claude-neutral-900">
        <div
          style={{
            width: maxX * zoom,
            height: maxY * zoom,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          className="relative"
        >
          {/* Column Headers */}
          <div className="absolute top-0 left-0 right-0 flex gap-0">
            {['Goals', 'Constraints', 'Entities', 'Behaviors', 'Contexts'].map((label) => (
              <div
                key={label}
                className="w-[220px] px-4 py-2 text-xs font-medium text-claude-neutral-500 dark:text-claude-neutral-400 uppercase tracking-wider"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Nodes */}
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id, node.type)}
              className={clsx(
                'absolute w-[200px] p-3 rounded-claude border-2 transition-all',
                'hover:shadow-claude-lg hover:scale-105',
                nodeColors[node.type].bg,
                selectedNodeId === node.id
                  ? 'ring-2 ring-claude-primary-500 ' + nodeColors[node.type].border
                  : nodeColors[node.type].border
              )}
              style={{ left: node.x, top: node.y + 30 }}
            >
              <div className="flex items-start gap-2">
                <span className={clsx('mt-0.5', nodeColors[node.type].icon)}>{nodeIcons[node.type]}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-claude-neutral-800 dark:text-claude-neutral-100 line-clamp-1">
                    {node.label}
                  </p>
                  <p className="text-xs text-claude-neutral-500 dark:text-claude-neutral-400 line-clamp-2 mt-0.5">
                    {node.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-claude-neutral-400 opacity-0 group-hover:opacity-100" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
