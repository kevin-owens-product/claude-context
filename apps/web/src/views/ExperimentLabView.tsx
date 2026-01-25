/**
 * ExperimentLabView - Hypothesis Testing Dashboard
 *
 * Every change is a hypothesis. Every deployment is an experiment.
 * This view manages the complete lifecycle of experiments.
 *
 * @prompt-id forge-v4.1:web:view:experiment-lab:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect } from 'react';
import {
  listExperiments,
  getExperimentStats,
  startExperiment,
  pauseExperiment,
  resumeExperiment,
  stopExperiment,
  type Experiment,
  type ExperimentStats,
  type ExperimentStatus,
  type ExperimentType,
  type ExperimentVerdict,
} from '../api/experiments';

const statusColors: Record<ExperimentStatus, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  SCHEDULED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  RUNNING: 'bg-green-500/20 text-green-300 border-green-500/30',
  PAUSED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ANALYZING: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  COMPLETED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CANCELLED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  FAILED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const verdictColors: Record<ExperimentVerdict, string> = {
  SUCCESS: 'text-green-400',
  FAILURE: 'text-red-400',
  INCONCLUSIVE: 'text-yellow-400',
  GUARDRAIL_TRIPPED: 'text-orange-400',
};

const verdictIcons: Record<ExperimentVerdict, string> = {
  SUCCESS: '✓',
  FAILURE: '✗',
  INCONCLUSIVE: '~',
  GUARDRAIL_TRIPPED: '⚠',
};

const typeLabels: Record<ExperimentType, string> = {
  A_B_TEST: 'A/B Test',
  FEATURE_FLAG: 'Feature Flag',
  GRADUAL_ROLLOUT: 'Gradual Rollout',
  CANARY: 'Canary',
  SHADOW: 'Shadow',
};

function ProgressBar({ current, target }: { current: number; target: number }) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{current.toLocaleString()} samples</span>
        <span>{target.toLocaleString()} target</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DurationDisplay({ startedAt, endedAt, plannedDuration }: {
  startedAt?: string;
  endedAt?: string;
  plannedDuration?: number;
}) {
  if (!startedAt) return <span className="text-gray-500">Not started</span>;

  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
  const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const plannedDays = plannedDuration || 14;
  const isOverdue = !endedAt && durationDays > plannedDays;

  return (
    <div className={isOverdue ? 'text-orange-400' : 'text-gray-300'}>
      {durationDays}d {durationHours}h
      {plannedDuration && (
        <span className="text-gray-500"> / {plannedDays}d planned</span>
      )}
    </div>
  );
}

function ExperimentCard({ experiment, onSelect, onAction }: {
  experiment: Experiment;
  onSelect: () => void;
  onAction: (action: string) => void;
}) {
  const isRunning = experiment.status === 'RUNNING';
  const isPaused = experiment.status === 'PAUSED';
  const isCompleted = experiment.status === 'COMPLETED' || experiment.status === 'CANCELLED' || experiment.status === 'FAILED';

  return (
    <div
      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[experiment.status]}`}>
              {experiment.status}
            </span>
            <span className="text-xs text-gray-500">{typeLabels[experiment.experimentType]}</span>
          </div>
          <h3 className="text-sm font-medium text-white truncate">{experiment.name}</h3>
        </div>
        {experiment.verdict && (
          <div className={`text-2xl ${verdictColors[experiment.verdict]}`}>
            {verdictIcons[experiment.verdict]}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 line-clamp-2 mb-3 italic">
        "{experiment.hypothesis}"
      </p>

      <div className="mb-3">
        <ProgressBar current={experiment.minSampleSize || 0} target={experiment.minSampleSize || 1000} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <DurationDisplay
          startedAt={experiment.startedAt}
          endedAt={experiment.endedAt}
          plannedDuration={experiment.plannedDuration}
        />
        <span className="text-gray-500">{experiment.trafficPercent}% traffic</span>
      </div>

      {/* Quick Actions */}
      {!isCompleted && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {experiment.status === 'SCHEDULED' && (
            <button
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
              onClick={() => onAction('start')}
            >
              Start
            </button>
          )}
          {isRunning && (
            <button
              className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded"
              onClick={() => onAction('pause')}
            >
              Pause
            </button>
          )}
          {isPaused && (
            <button
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              onClick={() => onAction('resume')}
            >
              Resume
            </button>
          )}
          {(isRunning || isPaused) && (
            <button
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
              onClick={() => onAction('stop')}
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Verdict for completed */}
      {isCompleted && experiment.verdict && (
        <div className={`mt-3 pt-3 border-t border-gray-700 text-sm ${verdictColors[experiment.verdict]}`}>
          Verdict: {experiment.verdict}
          {experiment.verdictReason && (
            <span className="text-gray-500"> - {experiment.verdictReason}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ExperimentDetailPanel({ experiment, onClose, onAction }: {
  experiment: Experiment;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-gray-900 border-l border-gray-700 shadow-xl overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
        <h2 className="font-semibold text-white">Experiment Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded border ${statusColors[experiment.status]}`}>
              {experiment.status}
            </span>
            <span className="text-xs text-gray-500">{typeLabels[experiment.experimentType]}</span>
            {experiment.verdict && (
              <span className={`ml-auto text-lg ${verdictColors[experiment.verdict]}`}>
                {verdictIcons[experiment.verdict]} {experiment.verdict}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{experiment.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{experiment.description}</p>
        </div>

        {/* Hypothesis */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Hypothesis</h4>
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300 italic">
            "{experiment.hypothesis}"
          </div>
          {experiment.rationale && (
            <p className="text-xs text-gray-500 mt-2">{experiment.rationale}</p>
          )}
        </div>

        {/* Progress */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Progress</h4>
          <ProgressBar current={experiment.minSampleSize || 0} target={experiment.minSampleSize || 1000} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Duration</span>
              <DurationDisplay
                startedAt={experiment.startedAt}
                endedAt={experiment.endedAt}
                plannedDuration={experiment.plannedDuration}
              />
            </div>
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Traffic</span>
              <span className="text-sm text-white">{experiment.trafficPercent}%</span>
            </div>
          </div>
        </div>

        {/* Target Metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Target Metrics</h4>
          <div className="space-y-2">
            {experiment.targetMetrics.map((metric, i) => (
              <div key={i} className="p-2 bg-gray-800 rounded flex items-center justify-between">
                <span className="text-sm text-gray-300">{metric.name}</span>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Expected: </span>
                  <span className="text-sm text-green-400">+{metric.expectedImprovement}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {experiment.controlMetrics && experiment.treatmentMetrics && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Results</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800 rounded-lg">
                <span className="text-xs text-gray-500 block mb-2">Control Group</span>
                {Object.entries(experiment.controlMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-white">{(value as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <span className="text-xs text-gray-500 block mb-2">Treatment Group</span>
                {Object.entries(experiment.treatmentMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-400">{key}</span>
                    <span className="text-white">{(value as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            {experiment.statisticalSignificance !== undefined && (
              <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                <span className="text-sm text-purple-300">
                  Statistical Significance: {(experiment.statisticalSignificance * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Success Criteria */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Success Criteria</h4>
          <div className="space-y-2">
            {experiment.successCriteria.map((criterion, i) => (
              <div key={i} className="p-2 bg-gray-800 rounded text-sm">
                <span className="text-gray-300">{criterion.metricId}</span>
                <span className="text-gray-500 mx-2">{criterion.operator}</span>
                <span className="text-white">{criterion.threshold}</span>
                {criterion.minSampleSize && (
                  <span className="text-gray-500 ml-2">(min {criterion.minSampleSize} samples)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Guardrails */}
        {experiment.guardrails && experiment.guardrails.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Guardrails</h4>
            <div className="space-y-2">
              {experiment.guardrails.map((guardrail, i) => (
                <div key={i} className="p-2 bg-orange-500/10 border border-orange-500/30 rounded flex items-center justify-between">
                  <span className="text-sm text-orange-300">{guardrail.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {guardrail.operator} {guardrail.threshold}
                    </span>
                    <span className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-300 rounded">
                      {guardrail.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learnings */}
        {experiment.learnings && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Learnings</h4>
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300">
              {experiment.learnings}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-700">
          {experiment.status === 'SCHEDULED' && (
            <button
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              onClick={() => onAction('start')}
            >
              Start Experiment
            </button>
          )}
          {experiment.status === 'RUNNING' && (
            <>
              <button
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                onClick={() => onAction('pause')}
              >
                Pause
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                onClick={() => onAction('stop')}
              >
                Stop & Analyze
              </button>
            </>
          )}
          {experiment.status === 'PAUSED' && (
            <>
              <button
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                onClick={() => onAction('resume')}
              >
                Resume
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                onClick={() => onAction('stop')}
              >
                Stop & Analyze
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ stats }: { stats: ExperimentStats }) {
  return (
    <div className="flex items-center gap-6">
      <div>
        <span className="text-xs text-gray-500 block">Total</span>
        <span className="text-2xl font-bold text-white">{stats.totalExperiments}</span>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div>
        <span className="text-xs text-gray-500 block">Win Rate</span>
        <span className="text-2xl font-bold text-green-400">{Math.round(stats.winRate * 100)}%</span>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div>
        <span className="text-xs text-gray-500 block">Running</span>
        <span className="text-2xl font-bold text-blue-400">{stats.byStatus.RUNNING || 0}</span>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div className="flex gap-2">
        {Object.entries(stats.byVerdict).map(([verdict, count]) => (
          <div key={verdict} className="flex items-center gap-1">
            <span className={`text-lg ${verdictColors[verdict as ExperimentVerdict]}`}>
              {verdictIcons[verdict as ExperimentVerdict]}
            </span>
            <span className="text-sm text-gray-300">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperimentLabView() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ExperimentType | ''>('');
  const [verdictFilter, setVerdictFilter] = useState<ExperimentVerdict | ''>('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [expResult, statsResult] = await Promise.all([
        listExperiments({ limit: 100 }),
        getExperimentStats(),
      ]);
      setExperiments(expResult.data);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load experiments:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAction(experimentId: string, action: string) {
    try {
      switch (action) {
        case 'start':
          await startExperiment(experimentId);
          break;
        case 'pause':
          await pauseExperiment(experimentId);
          break;
        case 'resume':
          await resumeExperiment(experimentId);
          break;
        case 'stop':
          await stopExperiment(experimentId);
          break;
      }
      await loadData();
      if (selectedExperiment?.id === experimentId) {
        const updated = experiments.find(e => e.id === experimentId);
        if (updated) setSelectedExperiment(updated);
      }
    } catch (error) {
      console.error(`Failed to ${action} experiment:`, error);
    }
  }

  const filteredExperiments = experiments.filter(exp => {
    if (statusFilter && exp.status !== statusFilter) return false;
    if (typeFilter && exp.experimentType !== typeFilter) return false;
    if (verdictFilter && exp.verdict !== verdictFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading experiments...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary Bar */}
      {stats && (
        <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
          <StatsCard stats={stats} />
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ExperimentStatus | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="RUNNING">Running</option>
          <option value="PAUSED">Paused</option>
          <option value="ANALYZING">Analyzing</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ExperimentType | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={verdictFilter}
          onChange={(e) => setVerdictFilter(e.target.value as ExperimentVerdict | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Verdicts</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="INCONCLUSIVE">Inconclusive</option>
          <option value="GUARDRAIL_TRIPPED">Guardrail Tripped</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onSelect={() => setSelectedExperiment(experiment)}
              onAction={(action) => handleAction(experiment.id, action)}
            />
          ))}
          {filteredExperiments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No experiments match your filters
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedExperiment && (
        <ExperimentDetailPanel
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
          onAction={(action) => handleAction(selectedExperiment.id, action)}
        />
      )}
    </div>
  );
}

export default ExperimentLabView;
