/**
 * ConditionBuilder - Visual condition builder for workflow conditions
 * @prompt-id forge-v4.1:web:components:condition-builder:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Trash2,
  Filter,
} from 'lucide-react';

export type ConditionOperator = 'AND' | 'OR';
export type RuleOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than' | 'older_than' | 'newer_than' | 'is_null' | 'is_not_null';

export interface ConditionRule {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export interface ConditionData {
  operator: ConditionOperator;
  rules: ConditionRule[];
}

interface ConditionBuilderProps {
  conditions?: ConditionData;
  onChange: (conditions: ConditionData | undefined) => void;
}

const operators: { value: RuleOperator; label: string; requiresValue: boolean }[] = [
  { value: 'equals', label: 'equals', requiresValue: true },
  { value: 'not_equals', label: 'does not equal', requiresValue: true },
  { value: 'in', label: 'is in', requiresValue: true },
  { value: 'not_in', label: 'is not in', requiresValue: true },
  { value: 'contains', label: 'contains', requiresValue: true },
  { value: 'greater_than', label: 'is greater than', requiresValue: true },
  { value: 'less_than', label: 'is less than', requiresValue: true },
  { value: 'older_than', label: 'is older than', requiresValue: true },
  { value: 'newer_than', label: 'is newer than', requiresValue: true },
  { value: 'is_null', label: 'is empty', requiresValue: false },
  { value: 'is_not_null', label: 'is not empty', requiresValue: false },
];

const commonFields = [
  { value: 'entity.status', label: 'Status', type: 'string' },
  { value: 'entity.priority', label: 'Priority', type: 'string' },
  { value: 'entity.stage', label: 'Stage', type: 'string' },
  { value: 'entity.ownerId', label: 'Owner ID', type: 'string' },
  { value: 'entity.createdAt', label: 'Created Date', type: 'date' },
  { value: 'entity.updatedAt', label: 'Updated Date', type: 'date' },
  { value: 'entity.value', label: 'Value (numeric)', type: 'number' },
  { value: 'signal.health', label: 'Signal Health', type: 'string' },
  { value: 'signal.currentValue', label: 'Signal Value', type: 'number' },
  { value: 'metadata.source', label: 'Source', type: 'string' },
];

const statusValues = ['draft', 'in_progress', 'blocked', 'in_review', 'completed', 'archived'];
const priorityValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const healthValues = ['HEALTHY', 'WARNING', 'CRITICAL'];
const durationValues = ['1h', '6h', '24h', '3d', '7d', '30d'];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const [isEnabled, setIsEnabled] = useState(!!conditions);

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (enabled && !conditions) {
      onChange({
        operator: 'AND',
        rules: [{ field: 'entity.status', operator: 'equals', value: '' }],
      });
    } else if (!enabled) {
      onChange(undefined);
    }
  };

  const addRule = () => {
    if (!conditions) return;
    onChange({
      ...conditions,
      rules: [...conditions.rules, { field: 'entity.status', operator: 'equals', value: '' }],
    });
  };

  const updateRule = (index: number, updates: Partial<ConditionRule>) => {
    if (!conditions) return;
    const newRules = [...conditions.rules];
    newRules[index] = { ...newRules[index], ...updates };
    onChange({ ...conditions, rules: newRules });
  };

  const removeRule = (index: number) => {
    if (!conditions) return;
    const newRules = conditions.rules.filter((_, i) => i !== index);
    onChange({ ...conditions, rules: newRules });
  };

  const getValueInput = (rule: ConditionRule, index: number) => {
    const operatorConfig = operators.find(o => o.value === rule.operator);
    if (!operatorConfig?.requiresValue) {
      return null;
    }

    const fieldConfig = commonFields.find(f => f.value === rule.field);
    const fieldType = fieldConfig?.type || 'string';

    // Show dropdown for known value sets
    if (rule.field === 'entity.status') {
      return (
        <select
          value={rule.value as string || ''}
          onChange={e => updateRule(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="">Select status...</option>
          {statusValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    if (rule.field === 'entity.priority') {
      return (
        <select
          value={rule.value as string || ''}
          onChange={e => updateRule(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="">Select priority...</option>
          {priorityValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    if (rule.field === 'signal.health') {
      return (
        <select
          value={rule.value as string || ''}
          onChange={e => updateRule(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="">Select health...</option>
          {healthValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    // Duration inputs for older_than/newer_than
    if (rule.operator === 'older_than' || rule.operator === 'newer_than') {
      return (
        <select
          value={rule.value as string || ''}
          onChange={e => updateRule(index, { value: e.target.value })}
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        >
          <option value="">Select duration...</option>
          {durationValues.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    // Array input for in/not_in operators
    if (rule.operator === 'in' || rule.operator === 'not_in') {
      const arrayValue = Array.isArray(rule.value) ? rule.value : [];
      return (
        <input
          type="text"
          value={arrayValue.join(', ')}
          onChange={e => updateRule(index, { value: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
          placeholder="value1, value2, ..."
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
        />
      );
    }

    // Number input
    if (fieldType === 'number') {
      return (
        <input
          type="number"
          value={rule.value as number || ''}
          onChange={e => updateRule(index, { value: parseFloat(e.target.value) || 0 })}
          className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={rule.value as string || ''}
        onChange={e => updateRule(index, { value: e.target.value })}
        placeholder="Enter value..."
        className="flex-1 px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-claude-neutral-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Filter className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-claude-neutral-200">Add Conditions</p>
            <p className="text-xs text-claude-neutral-500">
              Filter when this workflow should run
            </p>
          </div>
        </div>
        <button
          onClick={() => handleToggle(!isEnabled)}
          className={clsx(
            'relative w-12 h-6 rounded-full transition-colors',
            isEnabled ? 'bg-claude-primary-500' : 'bg-claude-neutral-700'
          )}
        >
          <span
            className={clsx(
              'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
              isEnabled ? 'translate-x-7' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {isEnabled && conditions && (
        <>
          {/* Operator Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-claude-neutral-400">Match</span>
            <div className="flex rounded-lg overflow-hidden border border-claude-neutral-700">
              <button
                onClick={() => onChange({ ...conditions, operator: 'AND' })}
                className={clsx(
                  'px-4 py-2 text-sm transition-colors',
                  conditions.operator === 'AND'
                    ? 'bg-claude-primary-500 text-white'
                    : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                )}
              >
                All conditions
              </button>
              <button
                onClick={() => onChange({ ...conditions, operator: 'OR' })}
                className={clsx(
                  'px-4 py-2 text-sm transition-colors',
                  conditions.operator === 'OR'
                    ? 'bg-claude-primary-500 text-white'
                    : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                )}
              >
                Any condition
              </button>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            {conditions.rules.map((rule, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-claude-neutral-800 rounded-lg"
              >
                {index > 0 && (
                  <span className="text-xs text-claude-neutral-500 uppercase">
                    {conditions.operator}
                  </span>
                )}

                {/* Field Selection */}
                <select
                  value={rule.field}
                  onChange={e => updateRule(index, { field: e.target.value })}
                  className="px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
                >
                  {commonFields.map(field => (
                    <option key={field.value} value={field.value}>{field.label}</option>
                  ))}
                </select>

                {/* Operator Selection */}
                <select
                  value={rule.operator}
                  onChange={e => updateRule(index, { operator: e.target.value as RuleOperator })}
                  className="px-3 py-2 bg-claude-neutral-700 border border-claude-neutral-600 rounded-lg text-sm text-claude-neutral-200 focus:outline-none focus:border-claude-primary-500"
                >
                  {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>

                {/* Value Input */}
                {getValueInput(rule, index)}

                {/* Remove Button */}
                <button
                  onClick={() => removeRule(index)}
                  disabled={conditions.rules.length === 1}
                  className="p-2 text-claude-neutral-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Rule Button */}
          <button
            onClick={addRule}
            className="flex items-center gap-2 px-4 py-2 text-claude-primary-400 hover:text-claude-primary-300 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>

          {/* Preview */}
          <div className="p-4 bg-claude-neutral-800/50 rounded-lg border border-claude-neutral-700">
            <p className="text-xs text-claude-neutral-500 mb-2">Condition Preview:</p>
            <code className="text-xs text-claude-primary-400">
              {conditions.rules.length > 0 ? (
                conditions.rules.map((rule, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-claude-neutral-500"> {conditions.operator} </span>}
                    <span>{rule.field} {rule.operator} {JSON.stringify(rule.value)}</span>
                  </span>
                ))
              ) : (
                'No conditions defined'
              )}
            </code>
          </div>
        </>
      )}

      {!isEnabled && (
        <div className="p-6 text-center border-2 border-dashed border-claude-neutral-700 rounded-xl">
          <Filter className="w-8 h-8 mx-auto text-claude-neutral-600 mb-2" />
          <p className="text-sm text-claude-neutral-400">
            No conditions set. Workflow will run for all matching triggers.
          </p>
        </div>
      )}
    </div>
  );
}
