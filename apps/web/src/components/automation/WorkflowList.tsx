/**
 * WorkflowList - List of workflows with enable/disable functionality
 * @prompt-id forge-v4.1:web:components:workflow-list:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Zap,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Trash2,
  Clock,
  Activity,
  MousePointer,
  Calendar,
  Loader,
} from 'lucide-react';
import type { WorkflowTriggerType } from './WorkflowBuilder';

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggerType: WorkflowTriggerType;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}

interface WorkflowListProps {
  workflows: WorkflowSummary[];
  isLoading?: boolean;
  onCreateNew: () => void;
  onEdit: (workflow: WorkflowSummary) => void;
  onDelete: (workflowId: string) => void;
  onToggleEnabled: (workflowId: string, enabled: boolean) => void;
  onViewExecutions: (workflowId: string) => void;
}

const triggerTypeConfig: Record<WorkflowTriggerType, { icon: typeof Zap; label: string; color: string }> = {
  EVENT: { icon: Zap, label: 'Event', color: 'text-yellow-400 bg-yellow-500/20' },
  SIGNAL: { icon: Activity, label: 'Signal', color: 'text-purple-400 bg-purple-500/20' },
  SCHEDULE: { icon: Calendar, label: 'Schedule', color: 'text-blue-400 bg-blue-500/20' },
  MANUAL: { icon: MousePointer, label: 'Manual', color: 'text-green-400 bg-green-500/20' },
};

export function WorkflowList({
  workflows,
  isLoading = false,
  onCreateNew,
  onEdit,
  onDelete,
  onToggleEnabled,
  onViewExecutions,
}: WorkflowListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<WorkflowTriggerType | 'all'>('all');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchQuery ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || workflow.triggerType === filterType;
    const matchesEnabled = filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && workflow.isEnabled) ||
      (filterEnabled === 'disabled' && !workflow.isEnabled);

    return matchesSearch && matchesType && matchesEnabled;
  });

  const enabledCount = workflows.filter(w => w.isEnabled).length;
  const totalRuns = workflows.reduce((sum, w) => sum + w.runCount, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-claude-neutral-100">Workflow Automation</h1>
            <p className="text-sm text-claude-neutral-500">
              {enabledCount} active workflows | {totalRuns} total executions
            </p>
          </div>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-claude-neutral-800">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-4 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as WorkflowTriggerType | 'all')}
          className="px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="all">All Types</option>
          <option value="EVENT">Event-Based</option>
          <option value="SIGNAL">Signal-Based</option>
          <option value="SCHEDULE">Scheduled</option>
          <option value="MANUAL">Manual</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterEnabled}
          onChange={e => setFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
          className="px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="w-8 h-8 text-claude-primary-500 animate-spin" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Zap className="w-12 h-12 text-claude-neutral-600 mb-4" />
            {workflows.length === 0 ? (
              <>
                <p className="text-claude-neutral-300 font-medium">No workflows yet</p>
                <p className="text-sm text-claude-neutral-500 mt-1">
                  Create your first workflow to automate repetitive tasks
                </p>
                <button
                  onClick={onCreateNew}
                  className="mt-4 px-4 py-2 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600"
                >
                  Create Workflow
                </button>
              </>
            ) : (
              <>
                <p className="text-claude-neutral-300 font-medium">No matching workflows</p>
                <p className="text-sm text-claude-neutral-500 mt-1">
                  Try adjusting your search or filters
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkflows.map(workflow => {
              const typeConfig = triggerTypeConfig[workflow.triggerType];
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={workflow.id}
                  className={clsx(
                    'bg-claude-neutral-800 rounded-xl border p-4 transition-all hover:border-claude-neutral-600',
                    workflow.isEnabled ? 'border-claude-neutral-700' : 'border-claude-neutral-700/50 opacity-70'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => onToggleEnabled(workflow.id, !workflow.isEnabled)}
                        className={clsx(
                          'flex items-center justify-center w-10 h-6 rounded-full transition-colors',
                          workflow.isEnabled ? 'bg-green-500' : 'bg-claude-neutral-700'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-4 h-4 bg-white rounded-full transition-transform',
                            workflow.isEnabled ? 'translate-x-2' : '-translate-x-2'
                          )}
                        />
                      </button>

                      {/* Trigger Type Badge */}
                      <div className={clsx('p-2 rounded-lg', typeConfig.color.split(' ')[1])}>
                        <TypeIcon className={clsx('w-4 h-4', typeConfig.color.split(' ')[0])} />
                      </div>

                      {/* Workflow Info */}
                      <div>
                        <h3 className="text-sm font-medium text-claude-neutral-200">{workflow.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-claude-neutral-500">
                          <span className={clsx('px-2 py-0.5 rounded', typeConfig.color)}>
                            {typeConfig.label}
                          </span>
                          <span>{workflow.runCount} runs</span>
                          {workflow.lastRunAt && (
                            <>
                              <span>•</span>
                              <span>Last: {formatDate(workflow.lastRunAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewExecutions(workflow.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg text-xs transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        History
                      </button>
                      <button
                        onClick={() => onEdit(workflow)}
                        className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === workflow.id ? null : workflow.id)}
                          className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeMenu === workflow.id && (
                          <div className="absolute right-0 top-full mt-1 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                            <button
                              onClick={() => {
                                onToggleEnabled(workflow.id, !workflow.isEnabled);
                                setActiveMenu(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-claude-neutral-300 hover:bg-claude-neutral-700"
                            >
                              {workflow.isEnabled ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Enable
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                onDelete(workflow.id);
                                setActiveMenu(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {workflow.description && (
                    <p className="mt-3 pl-14 text-sm text-claude-neutral-400">
                      {workflow.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
