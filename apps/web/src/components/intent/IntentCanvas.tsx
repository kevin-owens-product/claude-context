/**
 * Intent Canvas - Main view for intent graph management
 * @prompt-id forge-v4.1:web:components:intent:canvas:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Network,
  Plus,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Target,
  AlertTriangle,
  Box,
  Workflow,
  FileText,
  LayoutGrid,
  List,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { intentGraphsApi, type IntentGraph, type IntentGraphStatus } from '../../api/intent-graphs';
import { IntentGraphVisualizer } from './IntentGraphVisualizer';
import { EntityBrowser } from './EntityBrowser';
import { BehaviorFlow } from './BehaviorFlow';

interface IntentCanvasProps {
  projectId: string;
  onBack?: () => void;
}

const statusColors: Record<IntentGraphStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-claude-success/20 text-claude-success',
  archived: 'bg-claude-neutral-200 text-claude-neutral-600 dark:bg-claude-neutral-700 dark:text-claude-neutral-400',
};

type ViewMode = 'graph' | 'list';
type DetailPanel = 'none' | 'entities' | 'behaviors';

export function IntentCanvas({ projectId, onBack }: IntentCanvasProps) {
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [detailPanel, setDetailPanel] = useState<DetailPanel>('none');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  const { data: graphsData, isLoading: isLoadingGraphs, error: graphsError, refetch: refetchGraphs } = useQuery({
    queryKey: ['intent-graphs', projectId],
    queryFn: () => intentGraphsApi.listGraphs(projectId),
  });

  const { data: selectedGraph, isLoading: isLoadingGraph } = useQuery({
    queryKey: ['intent-graph', selectedGraphId],
    queryFn: () => intentGraphsApi.getGraph(selectedGraphId!),
    enabled: !!selectedGraphId,
  });

  const validateGraphMutation = useMutation({
    mutationFn: (graphId: string) => intentGraphsApi.validateGraph(graphId),
  });

  if (isLoadingGraphs) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-claude-primary-500 animate-spin" />
      </div>
    );
  }

  if (graphsError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-claude-error mb-4" />
        <p className="text-claude-error mb-4">Failed to load intent graphs</p>
        <button onClick={() => refetchGraphs()} className="claude-btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  // Graph list view (when no graph is selected)
  if (!selectedGraphId) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-claude-sm hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-claude-neutral-600 dark:text-claude-neutral-400" />
              </button>
            )}
            <div className="w-10 h-10 rounded-claude bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
                Intent Graphs
              </h2>
              <p className="text-caption text-claude-neutral-500">
                {graphsData?.total || 0} graphs
              </p>
            </div>
          </div>
          <button className="claude-btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Intent Graph
          </button>
        </div>

        {/* Graph List */}
        <div className="flex-1 overflow-auto p-6">
          {!graphsData?.graphs?.length ? (
            <div className="text-center py-12">
              <Network className="w-12 h-12 mx-auto text-claude-neutral-300 dark:text-claude-neutral-600 mb-4" />
              <p className="text-claude-neutral-500 dark:text-claude-neutral-400">
                No intent graphs yet. Create your first one!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {graphsData.graphs.map((graph) => (
                <IntentGraphCard
                  key={graph.id}
                  graph={graph}
                  onClick={() => setSelectedGraphId(graph.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Graph detail view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedGraphId(null)}
            className="p-2 rounded-claude-sm hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
          {selectedGraph && (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
                    {selectedGraph.name}
                  </h2>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusColors[selectedGraph.status])}>
                    {selectedGraph.status}
                  </span>
                  <span className="text-xs text-claude-neutral-500">v{selectedGraph.version}</span>
                </div>
                {selectedGraph.description && (
                  <p className="text-caption text-claude-neutral-500">{selectedGraph.description}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600">
            <button
              onClick={() => setViewMode('graph')}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'graph'
                  ? 'bg-claude-cream-200 dark:bg-claude-neutral-600'
                  : 'hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-claude-cream-200 dark:bg-claude-neutral-600'
                  : 'hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Validate Button */}
          <button
            onClick={() => validateGraphMutation.mutate(selectedGraphId)}
            className="claude-btn-secondary flex items-center gap-2"
            disabled={validateGraphMutation.isPending}
          >
            {validateGraphMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : validateGraphMutation.isSuccess ? (
              validateGraphMutation.data.valid ? (
                <CheckCircle className="w-4 h-4 text-claude-success" />
              ) : (
                <XCircle className="w-4 h-4 text-claude-error" />
              )
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Validate
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validateGraphMutation.isSuccess && !validateGraphMutation.data.valid && (
        <div className="px-6 py-2 bg-claude-error/10 border-b border-claude-error/20">
          <p className="text-sm text-claude-error font-medium">Validation Errors:</p>
          <ul className="text-sm text-claude-error list-disc list-inside">
            {validateGraphMutation.data.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Bar */}
      {selectedGraph && (
        <div className="flex items-center gap-6 px-6 py-2 border-b border-claude-cream-300 dark:border-claude-neutral-700 bg-claude-cream-50 dark:bg-claude-neutral-800">
          <button
            onClick={() => setDetailPanel(detailPanel === 'entities' ? 'none' : 'entities')}
            className={clsx(
              'flex items-center gap-2 text-sm transition-colors',
              detailPanel === 'entities'
                ? 'text-claude-primary-600 dark:text-claude-primary-400'
                : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:text-claude-neutral-800 dark:hover:text-claude-neutral-200'
            )}
          >
            <Target className="w-4 h-4" />
            {selectedGraph.goals?.length || 0} Goals
          </button>
          <span className="flex items-center gap-2 text-sm text-claude-neutral-600 dark:text-claude-neutral-400">
            <AlertTriangle className="w-4 h-4" />
            {selectedGraph.constraints?.length || 0} Constraints
          </span>
          <button
            onClick={() => setDetailPanel(detailPanel === 'entities' ? 'none' : 'entities')}
            className={clsx(
              'flex items-center gap-2 text-sm transition-colors',
              detailPanel === 'entities'
                ? 'text-claude-primary-600 dark:text-claude-primary-400'
                : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:text-claude-neutral-800 dark:hover:text-claude-neutral-200'
            )}
          >
            <Box className="w-4 h-4" />
            {selectedGraph.entities?.length || 0} Entities
          </button>
          <button
            onClick={() => setDetailPanel(detailPanel === 'behaviors' ? 'none' : 'behaviors')}
            className={clsx(
              'flex items-center gap-2 text-sm transition-colors',
              detailPanel === 'behaviors'
                ? 'text-claude-primary-600 dark:text-claude-primary-400'
                : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:text-claude-neutral-800 dark:hover:text-claude-neutral-200'
            )}
          >
            <Workflow className="w-4 h-4" />
            {selectedGraph.behaviors?.length || 0} Behaviors
          </button>
          <span className="flex items-center gap-2 text-sm text-claude-neutral-600 dark:text-claude-neutral-400">
            <FileText className="w-4 h-4" />
            {selectedGraph.contexts?.length || 0} Contexts
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View */}
        <div className={clsx('flex-1', detailPanel !== 'none' && 'border-r border-claude-cream-300 dark:border-claude-neutral-700')}>
          {isLoadingGraph ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-claude-primary-500 animate-spin" />
            </div>
          ) : selectedGraph ? (
            <IntentGraphVisualizer
              graph={selectedGraph}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId, nodeType) => {
                setSelectedNodeId(nodeId);
                if (nodeType === 'entity') setDetailPanel('entities');
                if (nodeType === 'behavior') setDetailPanel('behaviors');
              }}
            />
          ) : null}
        </div>

        {/* Detail Panel */}
        {detailPanel !== 'none' && selectedGraph && (
          <div className="w-96 overflow-hidden">
            {detailPanel === 'entities' && (
              <EntityBrowser
                entities={selectedGraph.entities}
                selectedEntityId={selectedNodeId}
                onSelectEntity={setSelectedNodeId}
                onAddEntity={() => console.log('Add entity')}
                onEditEntity={(entity) => console.log('Edit entity', entity)}
              />
            )}
            {detailPanel === 'behaviors' && (
              <BehaviorFlow
                behaviors={selectedGraph.behaviors}
                selectedBehaviorId={selectedNodeId}
                onSelectBehavior={setSelectedNodeId}
                onAddBehavior={() => console.log('Add behavior')}
                onEditBehavior={(behavior) => console.log('Edit behavior', behavior)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IntentGraphCard({ graph, onClick }: { graph: IntentGraph; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'claude-card p-4 text-left hover:shadow-claude-lg hover:border-claude-primary-300',
        'dark:hover:border-claude-primary-600 transition-all'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
          {graph.name}
        </h3>
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', statusColors[graph.status])}>
          {graph.status}
        </span>
      </div>
      {graph.description && (
        <p className="text-body-sm text-claude-neutral-500 dark:text-claude-neutral-400 line-clamp-2 mb-3">
          {graph.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-claude-neutral-500">
        <span className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          {graph.goals?.length || 0}
        </span>
        <span className="flex items-center gap-1">
          <Box className="w-3 h-3" />
          {graph.entities?.length || 0}
        </span>
        <span className="flex items-center gap-1">
          <Workflow className="w-3 h-3" />
          {graph.behaviors?.length || 0}
        </span>
        <span className="ml-auto">v{graph.version}</span>
      </div>
    </button>
  );
}
