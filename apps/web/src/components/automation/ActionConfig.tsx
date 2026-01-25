/**
 * ActionConfig - Configuration UI for workflow actions
 * @prompt-id forge-v4.1:web:components:action-config:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Trash2,
  Check,
  Bell,
  Globe,
  FileText,
  User,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type ActionType = 'CHANGE_STATUS' | 'NOTIFY' | 'WEBHOOK' | 'CREATE_ENTITY' | 'ASSIGN' | 'UPDATE_FIELD';

export interface ActionConfigData {
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
}

interface ActionConfigProps {
  actions: ActionConfigData[];
  onChange: (actions: ActionConfigData[]) => void;
}

const actionTypes = [
  {
    type: 'CHANGE_STATUS' as const,
    label: 'Change Status',
    description: 'Update the status of the entity',
    icon: Check,
  },
  {
    type: 'NOTIFY' as const,
    label: 'Send Notification',
    description: 'Send a notification via Slack, email, or in-app',
    icon: Bell,
  },
  {
    type: 'WEBHOOK' as const,
    label: 'Call Webhook',
    description: 'Make an HTTP request to an external service',
    icon: Globe,
  },
  {
    type: 'CREATE_ENTITY' as const,
    label: 'Create Entity',
    description: 'Create a new entity like a comment or task',
    icon: FileText,
  },
  {
    type: 'ASSIGN' as const,
    label: 'Assign User',
    description: 'Assign the entity to a user or team',
    icon: User,
  },
  {
    type: 'UPDATE_FIELD' as const,
    label: 'Update Field',
    description: 'Update a specific field on the entity',
    icon: Edit3,
  },
];

const statusOptions = ['draft', 'in_progress', 'blocked', 'in_review', 'completed', 'archived'];
const notifyChannels = ['slack', 'email', 'in_app'];
const recipientTypes = ['owner', 'team_lead', 'all_team', 'specific_user'];
const assigneeOptions = ['owner', 'team_lead', 'round_robin', 'specific_user'];
const entityTypes = ['comment', 'task', 'note'];

export function ActionConfig({ actions, onChange }: ActionConfigProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addAction = (type: ActionType) => {
    const newAction: ActionConfigData = {
      type,
      config: getDefaultConfig(type),
      order: actions.length + 1,
    };
    onChange([...actions, newAction]);
    setExpandedIndex(actions.length);
    setShowAddMenu(false);
  };

  const updateAction = (index: number, updates: Partial<ActionConfigData>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    onChange(newActions);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    // Update order numbers
    newActions.forEach((action, i) => {
      action.order = i + 1;
    });
    onChange(newActions);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;

    const newActions = [...actions];
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
    // Update order numbers
    newActions.forEach((action, i) => {
      action.order = i + 1;
    });
    onChange(newActions);
    setExpandedIndex(newIndex);
  };

  const getDefaultConfig = (type: ActionType): Record<string, unknown> => {
    switch (type) {
      case 'CHANGE_STATUS':
        return { status: 'in_progress' };
      case 'NOTIFY':
        return { channel: 'in_app', recipients: ['owner'], message: '' };
      case 'WEBHOOK':
        return { url: '', method: 'POST', headers: {}, body: {} };
      case 'CREATE_ENTITY':
        return { entityType: 'comment', data: { content: '' } };
      case 'ASSIGN':
        return { assignee: 'owner', fallback: 'round_robin' };
      case 'UPDATE_FIELD':
        return { field: '', value: '' };
      default:
        return {};
    }
  };

  const getActionIcon = (type: ActionType) => {
    return actionTypes.find(a => a.type === type)?.icon || Check;
  };

  const getActionLabel = (type: ActionType) => {
    return actionTypes.find(a => a.type === type)?.label || type;
  };

  const renderActionConfig = (action: ActionConfigData, index: number) => {
    switch (action.type) {
      case 'CHANGE_STATUS':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">New Status</label>
              <select
                value={action.config.status as string || ''}
                onChange={e => updateAction(index, { config: { ...action.config, status: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'NOTIFY':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Channel</label>
              <select
                value={action.config.channel as string || 'in_app'}
                onChange={e => updateAction(index, { config: { ...action.config, channel: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                {notifyChannels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Recipients</label>
              <select
                value={(action.config.recipients as string[])?.[0] || 'owner'}
                onChange={e => updateAction(index, { config: { ...action.config, recipients: [e.target.value] } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                {recipientTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Message</label>
              <textarea
                value={action.config.message as string || ''}
                onChange={e => updateAction(index, { config: { ...action.config, message: e.target.value } })}
                placeholder="Use {{entity.name}}, {{entity.status}}, etc. for dynamic values"
                className="w-full h-20 px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
          </div>
        );

      case 'WEBHOOK':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">URL</label>
              <input
                type="text"
                value={action.config.url as string || ''}
                onChange={e => updateAction(index, { config: { ...action.config, url: e.target.value } })}
                placeholder="https://api.example.com/webhook"
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Method</label>
              <select
                value={action.config.method as string || 'POST'}
                onChange={e => updateAction(index, { config: { ...action.config, method: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Headers (JSON)</label>
              <textarea
                value={JSON.stringify(action.config.headers || {}, null, 2)}
                onChange={e => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateAction(index, { config: { ...action.config, headers } });
                  } catch {
                    // Invalid JSON
                  }
                }}
                placeholder='{"Authorization": "Bearer {{secrets.API_KEY}}"}'
                className="w-full h-16 px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 font-mono placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Body (JSON)</label>
              <textarea
                value={JSON.stringify(action.config.body || {}, null, 2)}
                onChange={e => {
                  try {
                    const body = JSON.parse(e.target.value);
                    updateAction(index, { config: { ...action.config, body } });
                  } catch {
                    // Invalid JSON
                  }
                }}
                placeholder='{"event": "{{trigger}}", "data": "{{entity}}"}'
                className="w-full h-20 px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 font-mono placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
          </div>
        );

      case 'CREATE_ENTITY':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Entity Type</label>
              <select
                value={action.config.entityType as string || 'comment'}
                onChange={e => updateAction(index, { config: { ...action.config, entityType: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Content</label>
              <textarea
                value={(action.config.data as { content?: string })?.content || ''}
                onChange={e => updateAction(index, { config: { ...action.config, data: { content: e.target.value } } })}
                placeholder="Auto-created by workflow: {{workflow.name}}"
                className="w-full h-20 px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
          </div>
        );

      case 'ASSIGN':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Assignee</label>
              <select
                value={action.config.assignee as string || 'owner'}
                onChange={e => updateAction(index, { config: { ...action.config, assignee: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                {assigneeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Fallback (if primary unavailable)</label>
              <select
                value={action.config.fallback as string || 'round_robin'}
                onChange={e => updateAction(index, { config: { ...action.config, fallback: e.target.value } })}
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
              >
                <option value="round_robin">Round Robin</option>
                <option value="none">None (fail if unavailable)</option>
              </select>
            </div>
          </div>
        );

      case 'UPDATE_FIELD':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Field</label>
              <input
                type="text"
                value={action.config.field as string || ''}
                onChange={e => updateAction(index, { config: { ...action.config, field: e.target.value } })}
                placeholder="priority"
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-claude-neutral-500 mb-2">Value</label>
              <input
                type="text"
                value={action.config.value as string || ''}
                onChange={e => updateAction(index, { config: { ...action.config, value: e.target.value } })}
                placeholder="HIGH"
                className="w-full px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-claude-neutral-300">
          Actions ({actions.length})
        </h3>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = getActionIcon(action.type);
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className={clsx(
                'bg-claude-neutral-800 rounded-xl border overflow-hidden transition-all',
                isExpanded ? 'border-claude-primary-500/50' : 'border-claude-neutral-700'
              )}
            >
              {/* Action Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-claude-neutral-500">
                    <button
                      onClick={e => { e.stopPropagation(); moveAction(index, 'up'); }}
                      disabled={index === 0}
                      className="p-1 hover:text-claude-neutral-300 disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); moveAction(index, 'down'); }}
                      disabled={index === actions.length - 1}
                      className="p-1 hover:text-claude-neutral-300 disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="flex items-center justify-center w-6 h-6 bg-claude-neutral-700 rounded text-xs text-claude-neutral-400">
                    {action.order}
                  </span>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Icon className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-claude-neutral-200">
                      {getActionLabel(action.type)}
                    </p>
                    <p className="text-xs text-claude-neutral-500">
                      {action.type === 'CHANGE_STATUS' && `Set to ${action.config.status}`}
                      {action.type === 'NOTIFY' && `${action.config.channel} to ${(action.config.recipients as string[])?.[0]}`}
                      {action.type === 'WEBHOOK' && String(action.config.url || '')}
                      {action.type === 'ASSIGN' && `Assign to ${action.config.assignee}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); removeAction(index); }}
                    className="p-2 text-claude-neutral-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className={clsx(
                    'w-5 h-5 text-claude-neutral-500 transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </div>
              </div>

              {/* Action Config */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-claude-neutral-700">
                  <div className="pt-4">
                    {renderActionConfig(action, index)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Action Button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-2 w-full px-4 py-3 bg-claude-neutral-800 border-2 border-dashed border-claude-neutral-700 rounded-xl text-claude-neutral-400 hover:border-claude-primary-500/50 hover:text-claude-primary-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Action
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-xl shadow-xl z-10 overflow-hidden">
            {actionTypes.map(actionType => {
              const Icon = actionType.icon;
              return (
                <button
                  key={actionType.type}
                  onClick={() => addAction(actionType.type)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-claude-neutral-700 transition-colors text-left"
                >
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Icon className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-claude-neutral-200">
                      {actionType.label}
                    </p>
                    <p className="text-xs text-claude-neutral-500">
                      {actionType.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {actions.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-claude-neutral-700 rounded-xl">
          <p className="text-sm text-claude-neutral-400">
            No actions configured. Add at least one action to complete the workflow.
          </p>
        </div>
      )}
    </div>
  );
}
