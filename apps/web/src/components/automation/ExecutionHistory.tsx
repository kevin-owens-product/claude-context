/**
 * ExecutionHistory - Workflow execution logs and history
 * @prompt-id forge-v4.1:web:components:execution-history:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  ChevronRight,
  X,
  ArrowLeft,
} from 'lucide-react';
import type { WorkflowExecutionStatus } from './WorkflowBuilder';

interface ActionResult {
  actionType: string;
  order: number;
  success: boolean;
  result?: unknown;
  error?: string;
  executedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: WorkflowExecutionStatus;
  triggerEventId?: string;
  triggerData: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  actionsExecuted?: ActionResult[];
  error?: string;
}

interface ExecutionHistoryProps {
  executions: WorkflowExecution[];
  workflowName?: string;
  isLoading?: boolean;
  onRetry: (executionId: string) => void;
  onCancel: (executionId: string) => void;
  onBack?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const statusConfig: Record<WorkflowExecutionStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-400 bg-yellow-500/20', label: 'Pending' },
  RUNNING: { icon: Loader, color: 'text-blue-400 bg-blue-500/20', label: 'Running' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-400 bg-green-500/20', label: 'Completed' },
  FAILED: { icon: XCircle, color: 'text-red-400 bg-red-500/20', label: 'Failed' },
  CANCELLED: { icon: AlertCircle, color: 'text-claude-neutral-400 bg-claude-neutral-500/20', label: 'Cancelled' },
};

export function ExecutionHistory({
  executions,
  workflowName,
  isLoading = false,
  onRetry,
  onCancel,
  onBack,
  onLoadMore,
  hasMore = false,
}: ExecutionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'actions' | 'trigger'>('actions');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const duration = end - start;

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const stats = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'COMPLETED').length,
    failed: executions.filter(e => e.status === 'FAILED').length,
    running: executions.filter(e => e.status === 'RUNNING').length,
  };

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-claude-neutral-100">
              {workflowName ? `${workflowName} Executions` : 'Execution History'}
            </h1>
            <p className="text-sm text-claude-neutral-500">
              {stats.total} total | {stats.completed} completed | {stats.failed} failed
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-claude-neutral-800 bg-claude-neutral-850">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-claude-neutral-300">{stats.completed} Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-claude-neutral-300">{stats.failed} Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-claude-neutral-300">{stats.running} Running</span>
        </div>
      </div>

      {/* Executions List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && executions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="w-8 h-8 text-claude-primary-500 animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock className="w-12 h-12 text-claude-neutral-600 mb-4" />
            <p className="text-claude-neutral-300 font-medium">No executions yet</p>
            <p className="text-sm text-claude-neutral-500 mt-1">
              Workflow executions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map(execution => {
              const statusCfg = statusConfig[execution.status];
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedId === execution.id;

              return (
                <div
                  key={execution.id}
                  className={clsx(
                    'bg-claude-neutral-800 rounded-xl border overflow-hidden transition-all',
                    isExpanded ? 'border-claude-primary-500/50' : 'border-claude-neutral-700'
                  )}
                >
                  {/* Execution Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : execution.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx('p-2 rounded-lg', statusCfg.color.split(' ')[1])}>
                        <StatusIcon className={clsx(
                          'w-4 h-4',
                          statusCfg.color.split(' ')[0],
                          execution.status === 'RUNNING' && 'animate-spin'
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            statusCfg.color
                          )}>
                            {statusCfg.label}
                          </span>
                          <span className="text-xs text-claude-neutral-500">
                            {execution.id.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-claude-neutral-500">
                          {execution.startedAt && (
                            <span>Started: {formatDate(execution.startedAt)}</span>
                          )}
                          <span>Duration: {formatDuration(execution.startedAt, execution.completedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {execution.status === 'FAILED' && (
                        <button
                          onClick={e => { e.stopPropagation(); onRetry(execution.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-claude-primary-400 hover:bg-claude-primary-500/20 rounded-lg text-xs transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                      {execution.status === 'RUNNING' && (
                        <button
                          onClick={e => { e.stopPropagation(); onCancel(execution.id); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-red-400 hover:bg-red-500/20 rounded-lg text-xs transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      )}
                      <ChevronRight className={clsx(
                        'w-5 h-5 text-claude-neutral-500 transition-transform',
                        isExpanded && 'rotate-90'
                      )} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-claude-neutral-700">
                      {/* Error Message */}
                      {execution.error && (
                        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400 font-medium">Error</p>
                          <p className="text-xs text-red-300 mt-1">{execution.error}</p>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="flex gap-4 px-4 pt-4">
                        <button
                          onClick={() => setSelectedTab('actions')}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm transition-colors',
                            selectedTab === 'actions'
                              ? 'bg-claude-primary-500/20 text-claude-primary-400'
                              : 'text-claude-neutral-400 hover:text-claude-neutral-200'
                          )}
                        >
                          Actions ({execution.actionsExecuted?.length || 0})
                        </button>
                        <button
                          onClick={() => setSelectedTab('trigger')}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm transition-colors',
                            selectedTab === 'trigger'
                              ? 'bg-claude-primary-500/20 text-claude-primary-400'
                              : 'text-claude-neutral-400 hover:text-claude-neutral-200'
                          )}
                        >
                          Trigger Data
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-4">
                        {selectedTab === 'actions' && (
                          <div className="space-y-2">
                            {execution.actionsExecuted?.length === 0 && (
                              <p className="text-sm text-claude-neutral-500">No actions executed</p>
                            )}
                            {execution.actionsExecuted?.map((action, index) => (
                              <div
                                key={index}
                                className={clsx(
                                  'flex items-center justify-between p-3 rounded-lg',
                                  action.success
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : 'bg-red-500/10 border border-red-500/30'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-6 h-6 bg-claude-neutral-700 rounded text-xs text-claude-neutral-400">
                                    {action.order}
                                  </span>
                                  {action.success ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                  <span className="text-sm text-claude-neutral-200">
                                    {action.actionType}
                                  </span>
                                </div>
                                <div className="text-xs text-claude-neutral-500">
                                  {action.executedAt && formatDate(action.executedAt)}
                                </div>
                              </div>
                            ))}
                            {execution.actionsExecuted?.some(a => !a.success) && (
                              <div className="mt-3 p-3 bg-claude-neutral-700/50 rounded-lg">
                                <p className="text-xs text-claude-neutral-500 mb-1">Error Details:</p>
                                <p className="text-xs text-red-400">
                                  {execution.actionsExecuted?.find(a => !a.success)?.error}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedTab === 'trigger' && (
                          <div className="bg-claude-neutral-700/50 rounded-lg p-4">
                            <pre className="text-xs text-claude-neutral-300 overflow-auto max-h-60">
                              {JSON.stringify(execution.triggerData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="w-full py-3 text-claude-primary-400 hover:bg-claude-primary-500/20 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                  'Load More'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
