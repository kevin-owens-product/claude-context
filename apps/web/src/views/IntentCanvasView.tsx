/**
 * IntentCanvasView - The WHY Dashboard
 *
 * A visual canvas showing intents, their relationships, and fulfillment status.
 * This is the heart of Living Software - understanding why we build what we build.
 *
 * @prompt-id forge-v4.1:web:view:intent-canvas:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useMemo } from 'react';
import {
  listIntents,
  getIntentHierarchy,
  getFulfillmentSummary,
  type Intent,
  type IntentHierarchyNode,
  type FulfillmentSummary,
  type IntentStatus,
  type IntentPriority,
} from '../api/intents';

const statusColors: Record<IntentStatus, string> = {
  HYPOTHESIZED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  VALIDATED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-500/30',
  FULFILLED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  ABANDONED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  SUPERSEDED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const priorityColors: Record<IntentPriority, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400',
  EXPLORATORY: 'text-purple-400',
};

const priorityIcons: Record<IntentPriority, string> = {
  CRITICAL: '!!!',
  HIGH: '!!',
  MEDIUM: '!',
  LOW: '-',
  EXPLORATORY: '?',
};

function ConfidenceMeter({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8">{percentage}%</span>
    </div>
  );
}

function FulfillmentRing({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeDasharray={strokeDasharray}
          className={percentage >= 70 ? 'text-green-500' : percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {percentage}%
      </span>
    </div>
  );
}

function IntentCard({ intent, onSelect }: { intent: Intent; onSelect: (id: string) => void }) {
  return (
    <div
      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all hover:bg-gray-800"
      onClick={() => onSelect(intent.id)}
    >
      <div className="flex items-start gap-3">
        <FulfillmentRing value={intent.fulfillmentScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${priorityColors[intent.priority]}`}>
              {priorityIcons[intent.priority]}
            </span>
            <h3 className="text-sm font-medium text-white truncate">{intent.title}</h3>
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">{intent.desiredState}</p>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[intent.status]}`}>
              {intent.status}
            </span>
            <span className="text-xs text-gray-500">
              {intent.successCriteria?.filter(c => c.isMet).length || 0}/{intent.successCriteria?.length || 0} criteria met
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs text-gray-500">Confidence</span>
        <ConfidenceMeter value={intent.confidenceScore} />
      </div>
    </div>
  );
}

function IntentHierarchyTree({ node, level = 0, onSelect }: {
  node: IntentHierarchyNode;
  level?: number;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(level < 2);

  return (
    <div className={`${level > 0 ? 'ml-4 border-l border-gray-700 pl-4' : ''}`}>
      <div
        className="flex items-center gap-2 py-2 hover:bg-gray-800/50 rounded px-2 cursor-pointer"
        onClick={() => onSelect(node.id)}
      >
        {node.children?.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="text-gray-500 hover:text-gray-300 w-4"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {(!node.children || node.children.length === 0) && <span className="w-4" />}
        <FulfillmentRing value={node.fulfillmentScore} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${priorityColors[node.priority]}`}>
              {priorityIcons[node.priority]}
            </span>
            <span className="text-sm text-white">{node.title}</span>
            <span className={`px-1.5 py-0.5 text-xs rounded ${statusColors[node.status]}`}>
              {node.status}
            </span>
          </div>
        </div>
      </div>
      {expanded && node.children?.map((child) => (
        <IntentHierarchyTree key={child.id} node={child} level={level + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}

function IntentDetailPanel({ intent, onClose }: { intent: Intent; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-xl overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
        <h2 className="font-semibold text-white">Intent Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded border ${statusColors[intent.status]}`}>
              {intent.status}
            </span>
            <span className={`text-sm font-bold ${priorityColors[intent.priority]}`}>
              {intent.priority}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{intent.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{intent.description}</p>
        </div>

        {/* Desired State */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Desired State</h4>
          <div className="p-3 bg-gray-800 rounded-lg text-sm text-green-400 font-mono">
            "{intent.desiredState}"
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Fulfillment</span>
            <span className="text-2xl font-bold text-white">
              {Math.round(intent.fulfillmentScore * 100)}%
            </span>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Confidence</span>
            <span className="text-2xl font-bold text-white">
              {Math.round(intent.confidenceScore * 100)}%
            </span>
          </div>
        </div>

        {/* Success Criteria */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Success Criteria</h4>
          <div className="space-y-2">
            {intent.successCriteria?.map((criterion, i) => (
              <div
                key={i}
                className={`p-2 rounded flex items-center gap-2 ${
                  criterion.isMet ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800'
                }`}
              >
                <span className={criterion.isMet ? 'text-green-400' : 'text-gray-500'}>
                  {criterion.isMet ? '✓' : '○'}
                </span>
                <span className="text-sm text-gray-300">{criterion.description}</span>
                {criterion.targetValue && (
                  <span className="text-xs text-gray-500 ml-auto">
                    Target: {criterion.targetValue}{criterion.unit}
                  </span>
                )}
              </div>
            ))}
            {(!intent.successCriteria || intent.successCriteria.length === 0) && (
              <p className="text-sm text-gray-500 italic">No success criteria defined</p>
            )}
          </div>
        </div>

        {/* Evidence */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Evidence ({intent.evidence?.length || 0})</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {intent.evidence?.map((ev, i) => (
              <div key={i} className="p-2 bg-gray-800 rounded text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                    {ev.type}
                  </span>
                  <span className="text-xs text-gray-500">{ev.confidence * 100}% confidence</span>
                </div>
                <p className="text-gray-300">{ev.description}</p>
              </div>
            ))}
            {(!intent.evidence || intent.evidence.length === 0) && (
              <p className="text-sm text-gray-500 italic">No evidence collected yet</p>
            )}
          </div>
        </div>

        {/* Business Value */}
        {intent.businessValue && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Business Value</h4>
            <div className="grid grid-cols-2 gap-2">
              {intent.businessValue.estimatedRevenue && (
                <div className="p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-500 block">Revenue</span>
                  <span className="text-sm text-green-400">
                    ${intent.businessValue.estimatedRevenue.toLocaleString()}
                  </span>
                </div>
              )}
              {intent.businessValue.revenueAtRisk && (
                <div className="p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-500 block">At Risk</span>
                  <span className="text-sm text-red-400">
                    ${intent.businessValue.revenueAtRisk.toLocaleString()}
                  </span>
                </div>
              )}
              {intent.businessValue.strategicImportance && (
                <div className="p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-500 block">Strategic</span>
                  <span className="text-sm text-white capitalize">
                    {intent.businessValue.strategicImportance}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Anti-Patterns */}
        {intent.antiPatterns && intent.antiPatterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Anti-Patterns to Avoid</h4>
            <ul className="space-y-1">
              {intent.antiPatterns.map((pattern, i) => (
                <li key={i} className="text-sm text-red-400 flex items-start gap-2">
                  <span>⚠</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function IntentCanvasView() {
  const [intents, setIntents] = useState<Intent[]>([]);
  const [hierarchy, setHierarchy] = useState<IntentHierarchyNode[]>([]);
  const [summary, setSummary] = useState<FulfillmentSummary | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<Intent | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'hierarchy'>('cards');
  const [statusFilter, setStatusFilter] = useState<IntentStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<IntentPriority | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [intentsResult, hierarchyResult, summaryResult] = await Promise.all([
          listIntents({ limit: 100 }),
          getIntentHierarchy(),
          getFulfillmentSummary(),
        ]);
        setIntents(intentsResult.data);
        setHierarchy(hierarchyResult);
        setSummary(summaryResult);
      } catch (error) {
        console.error('Failed to load intents:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredIntents = useMemo(() => {
    return intents.filter(intent => {
      if (statusFilter && intent.status !== statusFilter) return false;
      if (priorityFilter && intent.priority !== priorityFilter) return false;
      return true;
    });
  }, [intents, statusFilter, priorityFilter]);

  const handleSelectIntent = async (id: string) => {
    const intent = intents.find(i => i.id === id);
    if (intent) {
      setSelectedIntent(intent);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading intents...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary Bar */}
      {summary && (
        <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500 block">Total Intents</span>
              <span className="text-2xl font-bold text-white">{summary.totalIntents}</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Avg Fulfillment</span>
              <span className="text-2xl font-bold text-green-400">
                {Math.round(summary.averageFulfillment * 100)}%
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Avg Confidence</span>
              <span className="text-2xl font-bold text-blue-400">
                {Math.round(summary.averageConfidence * 100)}%
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex gap-2">
              {Object.entries(summary.byStatus).map(([status, count]) => (
                <div key={status} className={`px-2 py-1 rounded text-xs ${statusColors[status as IntentStatus]}`}>
                  {status}: {count}
                </div>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => setViewMode('cards')}
              >
                Cards
              </button>
              <button
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                onClick={() => setViewMode('hierarchy')}
              >
                Hierarchy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as IntentStatus | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="HYPOTHESIZED">Hypothesized</option>
          <option value="VALIDATED">Validated</option>
          <option value="ACTIVE">Active</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="ABANDONED">Abandoned</option>
          <option value="SUPERSEDED">Superseded</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as IntentPriority | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="EXPLORATORY">Exploratory</option>
        </select>
        {summary?.criticalIntentsAtRisk && summary.criticalIntentsAtRisk.length > 0 && (
          <div className="ml-auto px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-400">
            {summary.criticalIntentsAtRisk.length} critical intent{summary.criticalIntentsAtRisk.length > 1 ? 's' : ''} at risk
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntents.map((intent) => (
              <IntentCard key={intent.id} intent={intent} onSelect={handleSelectIntent} />
            ))}
            {filteredIntents.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No intents match your filters
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800/30 rounded-lg p-4">
            {hierarchy.map((node) => (
              <IntentHierarchyTree key={node.id} node={node} onSelect={handleSelectIntent} />
            ))}
            {hierarchy.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No intent hierarchy available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedIntent && (
        <IntentDetailPanel intent={selectedIntent} onClose={() => setSelectedIntent(null)} />
      )}
    </div>
  );
}

export default IntentCanvasView;
