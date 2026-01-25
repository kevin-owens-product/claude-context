/**
 * WorkflowAutomation - Simple automation rules for workflows
 * Trigger-action based automation
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Zap,
  Plus,
  Trash2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  GitPullRequest,
  MessageSquare,
  User,
  Tag,
  Calendar,
  Bell,
  Mail,
  ArrowRight,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'status_change' | 'pr_merged' | 'due_date' | 'blocked' | 'comment' | 'created';
    config: Record<string, string>;
  };
  action: {
    type: 'change_status' | 'assign' | 'add_label' | 'notify' | 'send_email' | 'create_pr';
    config: Record<string, string>;
  };
  runCount: number;
  lastRun?: string;
}

interface WorkflowAutomationProps {
  rules?: AutomationRule[];
  onCreateRule?: (rule: Omit<AutomationRule, 'id' | 'runCount'>) => void;
  onUpdateRule?: (id: string, updates: Partial<AutomationRule>) => void;
  onDeleteRule?: (id: string) => void;
  onToggleRule?: (id: string, enabled: boolean) => void;
}

const defaultRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Auto-complete on PR merge',
    enabled: true,
    trigger: { type: 'pr_merged', config: {} },
    action: { type: 'change_status', config: { status: 'completed' } },
    runCount: 12,
    lastRun: '2024-01-15T10:30:00Z',
  },
  {
    id: 'rule-2',
    name: 'Notify on blocked',
    enabled: true,
    trigger: { type: 'blocked', config: {} },
    action: { type: 'notify', config: { channel: 'slack', mention: 'team' } },
    runCount: 5,
    lastRun: '2024-01-14T15:45:00Z',
  },
  {
    id: 'rule-3',
    name: 'Auto-assign reviewers',
    enabled: false,
    trigger: { type: 'status_change', config: { to: 'in_review' } },
    action: { type: 'assign', config: { users: 'reviewers' } },
    runCount: 0,
  },
];

export function WorkflowAutomation({
  rules = defaultRules,
  onCreateRule,
  onDeleteRule,
  onToggleRule,
}: WorkflowAutomationProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    trigger: { type: 'status_change', config: {} },
    action: { type: 'notify', config: {} },
  });

  const triggerTypes = [
    { type: 'status_change', label: 'Status changes', icon: CheckCircle },
    { type: 'pr_merged', label: 'PR merged', icon: GitPullRequest },
    { type: 'blocked', label: 'Item blocked', icon: AlertCircle },
    { type: 'due_date', label: 'Due date approaching', icon: Calendar },
    { type: 'comment', label: 'Comment added', icon: MessageSquare },
    { type: 'created', label: 'Item created', icon: Plus },
  ] as const;

  const actionTypes = [
    { type: 'change_status', label: 'Change status', icon: CheckCircle },
    { type: 'assign', label: 'Assign user', icon: User },
    { type: 'add_label', label: 'Add label', icon: Tag },
    { type: 'notify', label: 'Send notification', icon: Bell },
    { type: 'send_email', label: 'Send email', icon: Mail },
    { type: 'create_pr', label: 'Create PR', icon: GitPullRequest },
  ] as const;

  const getTriggerLabel = (type: string) =>
    triggerTypes.find(t => t.type === type)?.label || type;

  const getActionLabel = (type: string) =>
    actionTypes.find(a => a.type === type)?.label || type;

  const getTriggerIcon = (type: string) =>
    triggerTypes.find(t => t.type === type)?.icon || Zap;

  const getActionIcon = (type: string) =>
    actionTypes.find(a => a.type === type)?.icon || Zap;

  const handleCreateRule = () => {
    if (newRule.name && newRule.trigger && newRule.action) {
      onCreateRule?.({
        name: newRule.name,
        enabled: true,
        trigger: newRule.trigger as AutomationRule['trigger'],
        action: newRule.action as AutomationRule['action'],
      });
      setNewRule({
        name: '',
        trigger: { type: 'status_change', config: {} },
        action: { type: 'notify', config: {} },
      });
      setIsCreating(false);
    }
  };

  const enabledCount = rules.filter(r => r.enabled).length;
  const totalRuns = rules.reduce((sum, r) => sum + r.runCount, 0);

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-claude-neutral-100">Automations</h2>
            <p className="text-xs text-claude-neutral-500">
              {enabledCount} active, {totalRuns} total runs
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-primary-500/20 text-claude-primary-400 rounded-lg text-sm hover:bg-claude-primary-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Create Rule Form */}
        {isCreating && (
          <div className="bg-claude-neutral-800 rounded-xl border border-claude-primary-500/50 p-4">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Rule name..."
                value={newRule.name || ''}
                onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Trigger */}
                <div>
                  <label className="block text-xs text-claude-neutral-500 mb-2">When</label>
                  <select
                    value={newRule.trigger?.type || 'status_change'}
                    onChange={e => setNewRule({
                      ...newRule,
                      trigger: { type: e.target.value as AutomationRule['trigger']['type'], config: {} }
                    })}
                    className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
                  >
                    {triggerTypes.map(t => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-xs text-claude-neutral-500 mb-2">Then</label>
                  <select
                    value={newRule.action?.type || 'notify'}
                    onChange={e => setNewRule({
                      ...newRule,
                      action: { type: e.target.value as AutomationRule['action']['type'], config: {} }
                    })}
                    className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
                  >
                    {actionTypes.map(a => (
                      <option key={a.type} value={a.type}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRule}
                  disabled={!newRule.name}
                  className="px-3 py-1.5 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600 transition-colors disabled:opacity-50"
                >
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Rules */}
        {rules.map(rule => {
          const TriggerIcon = getTriggerIcon(rule.trigger.type);
          const ActionIcon = getActionIcon(rule.action.type);
          const isExpanded = expandedRule === rule.id;

          return (
            <div
              key={rule.id}
              className={clsx(
                'bg-claude-neutral-800 rounded-xl border overflow-hidden transition-all',
                rule.enabled ? 'border-claude-neutral-700' : 'border-claude-neutral-700/50 opacity-60'
              )}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleRule?.(rule.id, !rule.enabled)}
                      className="text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-6 h-6 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <div>
                      <h3 className="text-sm font-medium text-claude-neutral-200">{rule.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-claude-neutral-500">
                        <span>{rule.runCount} runs</span>
                        {rule.lastRun && (
                          <>
                            <span>•</span>
                            <span>Last: {new Date(rule.lastRun).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                      className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded transition-colors"
                    >
                      <ChevronRight className={clsx('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
                    </button>
                    <button
                      onClick={() => onDeleteRule?.(rule.id)}
                      className="p-1.5 text-claude-neutral-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rule Flow */}
                <div className="flex items-center gap-2 mt-3 p-2 bg-claude-neutral-700/50 rounded-lg">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    <TriggerIcon className="w-3 h-3" />
                    {getTriggerLabel(rule.trigger.type)}
                  </div>
                  <ArrowRight className="w-4 h-4 text-claude-neutral-500" />
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    <ActionIcon className="w-3 h-3" />
                    {getActionLabel(rule.action.type)}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-claude-neutral-700">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs text-claude-neutral-500 mb-2">Trigger Config</label>
                      <pre className="text-xs text-claude-neutral-400 bg-claude-neutral-700/50 rounded p-2 overflow-auto">
                        {JSON.stringify(rule.trigger.config, null, 2) || '{}'}
                      </pre>
                    </div>
                    <div>
                      <label className="block text-xs text-claude-neutral-500 mb-2">Action Config</label>
                      <pre className="text-xs text-claude-neutral-400 bg-claude-neutral-700/50 rounded p-2 overflow-auto">
                        {JSON.stringify(rule.action.config, null, 2) || '{}'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {rules.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto text-claude-neutral-600 mb-3" />
            <p className="text-claude-neutral-300 font-medium">No automations yet</p>
            <p className="text-sm text-claude-neutral-500 mt-1">
              Create rules to automate repetitive tasks
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 px-4 py-2 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600 transition-colors"
            >
              Create First Rule
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
        <span className="text-xs text-claude-neutral-500">
          Automations run automatically when triggers are met
        </span>
        <button className="flex items-center gap-1.5 text-xs text-claude-neutral-400 hover:text-claude-neutral-200">
          <Settings className="w-3 h-3" />
          Settings
        </button>
      </div>
    </div>
  );
}
