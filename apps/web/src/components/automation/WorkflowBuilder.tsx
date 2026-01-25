/**
 * WorkflowBuilder - Visual workflow editor for creating and editing automations
 * @prompt-id forge-v4.1:web:components:workflow-builder:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Zap,
  Play,
  Save,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { TriggerConfig, TriggerConfigData } from './TriggerConfig';
import { ConditionBuilder, ConditionData } from './ConditionBuilder';
import { ActionConfig, ActionConfigData } from './ActionConfig';

export type WorkflowTriggerType = 'EVENT' | 'SIGNAL' | 'SCHEDULE' | 'MANUAL';
export type WorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WorkflowData {
  id?: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfigData;
  conditions?: ConditionData;
  actions: ActionConfigData[];
}

interface WorkflowBuilderProps {
  workflow?: WorkflowData;
  onSave: (workflow: WorkflowData) => Promise<void>;
  onTest?: (workflow: WorkflowData) => Promise<{ wouldTrigger: boolean; conditionsMet: boolean }>;
  onCancel: () => void;
  isLoading?: boolean;
}

const defaultWorkflow: WorkflowData = {
  name: '',
  description: '',
  isEnabled: true,
  triggerType: 'EVENT',
  triggerConfig: { eventTypes: [], entityTypes: [] },
  actions: [{ type: 'NOTIFY', config: { channel: 'in_app', message: '' }, order: 1 }],
};

export function WorkflowBuilder({
  workflow,
  onSave,
  onTest,
  onCancel,
  isLoading = false,
}: WorkflowBuilderProps) {
  const [data, setData] = useState<WorkflowData>(workflow || defaultWorkflow);
  const [activeStep, setActiveStep] = useState<'trigger' | 'conditions' | 'actions'>('trigger');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ wouldTrigger: boolean; conditionsMet: boolean } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const validateWorkflow = (): boolean => {
    const newErrors: string[] = [];

    if (!data.name.trim()) {
      newErrors.push('Workflow name is required');
    }

    if (data.triggerType === 'EVENT') {
      const config = data.triggerConfig as { eventTypes: string[]; entityTypes: string[] };
      if (!config.eventTypes || config.eventTypes.length === 0) {
        newErrors.push('At least one event type is required');
      }
      if (!config.entityTypes || config.entityTypes.length === 0) {
        newErrors.push('At least one entity type is required');
      }
    }

    if (data.triggerType === 'SCHEDULE') {
      const config = data.triggerConfig as { cron?: string };
      if (!config.cron) {
        newErrors.push('Cron expression is required for scheduled workflows');
      }
    }

    if (!data.actions || data.actions.length === 0) {
      newErrors.push('At least one action is required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateWorkflow()) return;
    await onSave(data);
  };

  const handleTest = async () => {
    if (!onTest) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(data);
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const steps = [
    { key: 'trigger' as const, label: 'Trigger', description: 'What starts this workflow' },
    { key: 'conditions' as const, label: 'Conditions', description: 'When should it run' },
    { key: 'actions' as const, label: 'Actions', description: 'What should happen' },
  ];

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <input
              type="text"
              value={data.name}
              onChange={e => setData({ ...data, name: e.target.value })}
              placeholder="Workflow name..."
              className="text-lg font-semibold text-claude-neutral-100 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-claude-neutral-500"
            />
            <input
              type="text"
              value={data.description || ''}
              onChange={e => setData({ ...data, description: e.target.value })}
              placeholder="Add description..."
              className="block text-sm text-claude-neutral-400 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-claude-neutral-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onTest && (
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-claude-neutral-800 text-claude-neutral-300 rounded-lg text-sm hover:bg-claude-neutral-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {isTesting ? 'Testing...' : 'Test'}
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 text-claude-neutral-400 hover:text-claude-neutral-200 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-claude-primary-500 text-white rounded-lg text-sm hover:bg-claude-primary-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Please fix the following errors:</p>
              <ul className="mt-1 text-sm text-red-300 list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={clsx(
          'mx-6 mt-4 p-4 rounded-lg border',
          testResult.wouldTrigger && testResult.conditionsMet
            ? 'bg-green-500/20 border-green-500/50'
            : 'bg-yellow-500/20 border-yellow-500/50'
        )}>
          <div className="flex items-center gap-2">
            {testResult.wouldTrigger && testResult.conditionsMet ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            <span className={clsx(
              'text-sm font-medium',
              testResult.wouldTrigger && testResult.conditionsMet ? 'text-green-400' : 'text-yellow-400'
            )}>
              {testResult.wouldTrigger ? 'Trigger would match' : 'Trigger would NOT match'}
              {' | '}
              {testResult.conditionsMet ? 'Conditions met' : 'Conditions NOT met'}
            </span>
          </div>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-claude-neutral-800">
        {steps.map((step, index) => (
          <button
            key={step.key}
            onClick={() => setActiveStep(step.key)}
            className={clsx(
              'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
              activeStep === step.key
                ? 'bg-claude-primary-500/20 text-claude-primary-400'
                : 'text-claude-neutral-400 hover:bg-claude-neutral-800'
            )}
          >
            <span className={clsx(
              'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
              activeStep === step.key
                ? 'bg-claude-primary-500 text-white'
                : 'bg-claude-neutral-700 text-claude-neutral-400'
            )}>
              {index + 1}
            </span>
            <div className="text-left">
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-claude-neutral-500">{step.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeStep === 'trigger' && (
          <TriggerConfig
            triggerType={data.triggerType}
            config={data.triggerConfig}
            onChange={(triggerType, config) => setData({ ...data, triggerType, triggerConfig: config })}
          />
        )}

        {activeStep === 'conditions' && (
          <ConditionBuilder
            conditions={data.conditions}
            onChange={conditions => setData({ ...data, conditions })}
          />
        )}

        {activeStep === 'actions' && (
          <ActionConfig
            actions={data.actions}
            onChange={actions => setData({ ...data, actions })}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-claude-neutral-800 bg-claude-neutral-850">
        <button
          onClick={() => {
            const currentIndex = steps.findIndex(s => s.key === activeStep);
            if (currentIndex > 0) {
              setActiveStep(steps[currentIndex - 1].key);
            }
          }}
          disabled={activeStep === 'trigger'}
          className="px-4 py-2 text-claude-neutral-400 hover:text-claude-neutral-200 text-sm transition-colors disabled:opacity-50"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {steps.map(step => (
            <div
              key={step.key}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                activeStep === step.key ? 'bg-claude-primary-500' : 'bg-claude-neutral-700'
              )}
            />
          ))}
        </div>

        <button
          onClick={() => {
            const currentIndex = steps.findIndex(s => s.key === activeStep);
            if (currentIndex < steps.length - 1) {
              setActiveStep(steps[currentIndex + 1].key);
            }
          }}
          disabled={activeStep === 'actions'}
          className="px-4 py-2 text-claude-primary-400 hover:text-claude-primary-300 text-sm transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
