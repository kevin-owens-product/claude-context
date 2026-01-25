/**
 * TriggerConfig - Configuration UI for workflow triggers
 * @prompt-id forge-v4.1:web:components:trigger-config:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Zap,
  Activity,
  Clock,
  MousePointer,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import type { WorkflowTriggerType } from './WorkflowBuilder';

export interface EventTriggerConfig {
  eventTypes: string[];
  entityTypes: string[];
  filters?: Record<string, unknown>;
}

export interface SignalTriggerConfig {
  signalType: string;
  condition: 'health_becomes' | 'crosses_threshold';
  value: string | number;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone: string;
}

export interface ManualTriggerConfig {
  allowedRoles?: string[];
}

export type TriggerConfigData = EventTriggerConfig | SignalTriggerConfig | ScheduleTriggerConfig | ManualTriggerConfig;

interface TriggerConfigProps {
  triggerType: WorkflowTriggerType;
  config: TriggerConfigData;
  onChange: (triggerType: WorkflowTriggerType, config: TriggerConfigData) => void;
}

const triggerTypes = [
  {
    type: 'EVENT' as const,
    label: 'Event-Based',
    description: 'Trigger when entities are created, updated, or change status',
    icon: Zap,
  },
  {
    type: 'SIGNAL' as const,
    label: 'Signal-Based',
    description: 'Trigger when signal thresholds are crossed or health changes',
    icon: Activity,
  },
  {
    type: 'SCHEDULE' as const,
    label: 'Scheduled',
    description: 'Trigger on a recurring schedule using cron expressions',
    icon: Clock,
  },
  {
    type: 'MANUAL' as const,
    label: 'Manual',
    description: 'Trigger manually by users with specific roles',
    icon: MousePointer,
  },
];

const eventTypes = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'status_changed', label: 'Status Changed' },
];

const entityTypes = [
  { value: 'slice', label: 'Slice' },
  { value: 'deal', label: 'Deal' },
  { value: 'featureRequest', label: 'Feature Request' },
  { value: 'customer', label: 'Customer' },
  { value: 'release', label: 'Release' },
  { value: 'experiment', label: 'Experiment' },
];

const signalTypes = [
  { value: 'SATISFACTION', label: 'Customer Satisfaction' },
  { value: 'ADOPTION', label: 'Feature Adoption' },
  { value: 'ENGAGEMENT', label: 'User Engagement' },
  { value: 'HEALTH_SCORE', label: 'Health Score' },
  { value: 'REVENUE', label: 'Revenue Metric' },
];

const signalConditions = [
  { value: 'health_becomes', label: 'Health becomes' },
  { value: 'crosses_threshold', label: 'Crosses threshold' },
];

const healthLevels = ['HEALTHY', 'WARNING', 'CRITICAL'];

const cronPresets = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9am', value: '0 9 * * *' },
  { label: 'Every Monday at 9am', value: '0 9 * * 1' },
  { label: 'Every month on 1st', value: '0 0 1 * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
];

const timezones = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'UTC',
];

export function TriggerConfig({ triggerType, config, onChange }: TriggerConfigProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleTypeChange = (newType: WorkflowTriggerType) => {
    let defaultConfig: TriggerConfigData;
    switch (newType) {
      case 'EVENT':
        defaultConfig = { eventTypes: [], entityTypes: [] };
        break;
      case 'SIGNAL':
        defaultConfig = { signalType: 'SATISFACTION', condition: 'health_becomes', value: 'WARNING' };
        break;
      case 'SCHEDULE':
        defaultConfig = { cron: '0 9 * * *', timezone: 'America/New_York' };
        break;
      case 'MANUAL':
        defaultConfig = { allowedRoles: [] };
        break;
      default:
        defaultConfig = { eventTypes: [], entityTypes: [] };
    }
    onChange(newType, defaultConfig);
  };

  const renderEventConfig = () => {
    const eventConfig = config as EventTriggerConfig;

    return (
      <div className="space-y-6">
        {/* Event Types */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Event Types
          </label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  const current = eventConfig.eventTypes || [];
                  const updated = current.includes(type.value)
                    ? current.filter(t => t !== type.value)
                    : [...current, type.value];
                  onChange(triggerType, { ...eventConfig, eventTypes: updated });
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  eventConfig.eventTypes?.includes(type.value)
                    ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/50'
                    : 'bg-claude-neutral-800 text-claude-neutral-400 border border-claude-neutral-700 hover:border-claude-neutral-600'
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Types */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Entity Types
          </label>
          <div className="flex flex-wrap gap-2">
            {entityTypes.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  const current = eventConfig.entityTypes || [];
                  const updated = current.includes(type.value)
                    ? current.filter(t => t !== type.value)
                    : [...current, type.value];
                  onChange(triggerType, { ...eventConfig, entityTypes: updated });
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  eventConfig.entityTypes?.includes(type.value)
                    ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/50'
                    : 'bg-claude-neutral-800 text-claude-neutral-400 border border-claude-neutral-700 hover:border-claude-neutral-600'
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-claude-neutral-400 hover:text-claude-neutral-200"
          >
            <ChevronDown className={clsx('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
            Advanced Filters
          </button>

          {showFilters && (
            <div className="mt-3 p-4 bg-claude-neutral-800 rounded-lg">
              <p className="text-xs text-claude-neutral-500 mb-3">
                Add field-level filters to narrow down which events trigger this workflow
              </p>
              <textarea
                value={JSON.stringify(eventConfig.filters || {}, null, 2)}
                onChange={e => {
                  try {
                    const filters = JSON.parse(e.target.value);
                    onChange(triggerType, { ...eventConfig, filters });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"payload.status": "blocked"}'
                className="w-full h-24 px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 font-mono placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSignalConfig = () => {
    const signalConfig = config as SignalTriggerConfig;

    return (
      <div className="space-y-6">
        {/* Signal Type */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Signal Type
          </label>
          <select
            value={signalConfig.signalType || 'SATISFACTION'}
            onChange={e => onChange(triggerType, { ...signalConfig, signalType: e.target.value })}
            className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
          >
            {signalTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Condition
          </label>
          <select
            value={signalConfig.condition || 'health_becomes'}
            onChange={e => onChange(triggerType, {
              ...signalConfig,
              condition: e.target.value as 'health_becomes' | 'crosses_threshold'
            })}
            className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
          >
            {signalConditions.map(cond => (
              <option key={cond.value} value={cond.value}>{cond.label}</option>
            ))}
          </select>
        </div>

        {/* Value */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Value
          </label>
          {signalConfig.condition === 'health_becomes' ? (
            <select
              value={signalConfig.value as string}
              onChange={e => onChange(triggerType, { ...signalConfig, value: e.target.value })}
              className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
            >
              {healthLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={signalConfig.value as number}
              onChange={e => onChange(triggerType, { ...signalConfig, value: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
            />
          )}
        </div>
      </div>
    );
  };

  const renderScheduleConfig = () => {
    const scheduleConfig = config as ScheduleTriggerConfig;

    return (
      <div className="space-y-6">
        {/* Cron Expression */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Schedule (Cron Expression)
          </label>
          <input
            type="text"
            value={scheduleConfig.cron || ''}
            onChange={e => onChange(triggerType, { ...scheduleConfig, cron: e.target.value })}
            placeholder="0 9 * * *"
            className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 font-mono placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
          />
          <p className="mt-1 text-xs text-claude-neutral-500">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {cronPresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => onChange(triggerType, { ...scheduleConfig, cron: preset.value })}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  scheduleConfig.cron === preset.value
                    ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/50'
                    : 'bg-claude-neutral-800 text-claude-neutral-400 border border-claude-neutral-700 hover:border-claude-neutral-600'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Timezone
          </label>
          <select
            value={scheduleConfig.timezone || 'UTC'}
            onChange={e => onChange(triggerType, { ...scheduleConfig, timezone: e.target.value })}
            className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderManualConfig = () => {
    const manualConfig = config as ManualTriggerConfig;
    const [newRole, setNewRole] = useState('');

    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            Manual workflows can be triggered by users from the workflow detail page or via API.
          </p>
        </div>

        {/* Allowed Roles */}
        <div>
          <label className="block text-sm font-medium text-claude-neutral-300 mb-2">
            Allowed Roles (leave empty for all users)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {(manualConfig.allowedRoles || []).map(role => (
              <span
                key={role}
                className="flex items-center gap-1 px-3 py-1.5 bg-claude-neutral-800 text-claude-neutral-300 rounded-lg text-sm"
              >
                {role}
                <button
                  onClick={() => {
                    const updated = manualConfig.allowedRoles?.filter(r => r !== role) || [];
                    onChange(triggerType, { ...manualConfig, allowedRoles: updated });
                  }}
                  className="text-claude-neutral-500 hover:text-claude-neutral-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              placeholder="Add role..."
              className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
            />
            <button
              onClick={() => {
                if (newRole.trim()) {
                  const current = manualConfig.allowedRoles || [];
                  onChange(triggerType, { ...manualConfig, allowedRoles: [...current, newRole.trim()] });
                  setNewRole('');
                }
              }}
              className="px-4 py-2 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trigger Type Selection */}
      <div>
        <label className="block text-sm font-medium text-claude-neutral-300 mb-3">
          Trigger Type
        </label>
        <div className="grid grid-cols-2 gap-4">
          {triggerTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.type}
                onClick={() => handleTypeChange(type.type)}
                className={clsx(
                  'flex items-start gap-3 p-4 rounded-xl border transition-colors text-left',
                  triggerType === type.type
                    ? 'bg-claude-primary-500/20 border-claude-primary-500/50'
                    : 'bg-claude-neutral-800 border-claude-neutral-700 hover:border-claude-neutral-600'
                )}
              >
                <div className={clsx(
                  'p-2 rounded-lg',
                  triggerType === type.type ? 'bg-claude-primary-500/30' : 'bg-claude-neutral-700'
                )}>
                  <Icon className={clsx(
                    'w-5 h-5',
                    triggerType === type.type ? 'text-claude-primary-400' : 'text-claude-neutral-400'
                  )} />
                </div>
                <div>
                  <p className={clsx(
                    'font-medium text-sm',
                    triggerType === type.type ? 'text-claude-primary-400' : 'text-claude-neutral-200'
                  )}>
                    {type.label}
                  </p>
                  <p className="text-xs text-claude-neutral-500 mt-0.5">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger-specific Configuration */}
      <div className="pt-6 border-t border-claude-neutral-800">
        <h3 className="text-sm font-medium text-claude-neutral-300 mb-4">
          Configuration
        </h3>
        {triggerType === 'EVENT' && renderEventConfig()}
        {triggerType === 'SIGNAL' && renderSignalConfig()}
        {triggerType === 'SCHEDULE' && renderScheduleConfig()}
        {triggerType === 'MANUAL' && renderManualConfig()}
      </div>
    </div>
  );
}
