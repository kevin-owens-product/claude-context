/**
 * Behavior Flow - Visualize behavior steps and triggers
 * @prompt-id forge-v4.1:web:components:intent:behavior-flow:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Workflow,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Settings,
  AlertCircle,
  Play,
  ArrowRight,
} from 'lucide-react';
import type { IntentBehavior, BehaviorStep } from '../../api/intent-graphs';

interface BehaviorFlowProps {
  behaviors: IntentBehavior[];
  onAddBehavior: () => void;
  onEditBehavior: (behavior: IntentBehavior) => void;
  selectedBehaviorId?: string;
  onSelectBehavior: (behaviorId: string) => void;
}

const triggerIcons: Record<IntentBehavior['triggerType'], React.ReactNode> = {
  user_action: <Play className="w-4 h-4" />,
  system_event: <Zap className="w-4 h-4" />,
  scheduled: <Clock className="w-4 h-4" />,
  conditional: <Settings className="w-4 h-4" />,
};

const triggerColors: Record<IntentBehavior['triggerType'], string> = {
  user_action: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  system_event: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  scheduled: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  conditional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function BehaviorFlow({
  behaviors,
  onAddBehavior,
  onEditBehavior,
  selectedBehaviorId,
  onSelectBehavior,
}: BehaviorFlowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBehaviors, setExpandedBehaviors] = useState<Set<string>>(new Set());

  const filteredBehaviors = behaviors.filter(
    (behavior) =>
      searchQuery === '' ||
      behavior.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      behavior.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpanded = (behaviorId: string) => {
    const newExpanded = new Set(expandedBehaviors);
    if (newExpanded.has(behaviorId)) {
      newExpanded.delete(behaviorId);
    } else {
      newExpanded.add(behaviorId);
    }
    setExpandedBehaviors(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <Workflow className="w-5 h-5 text-purple-500" />
          Behaviors
        </h3>
        <button onClick={onAddBehavior} className="claude-btn-ghost flex items-center gap-1 text-sm">
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400" />
          <input
            type="text"
            placeholder="Search behaviors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-3 py-2 text-sm rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          />
        </div>
      </div>

      {/* Behavior List */}
      <div className="flex-1 overflow-auto">
        {filteredBehaviors.length === 0 ? (
          <div className="text-center py-8 text-claude-neutral-500">
            <Workflow className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No behaviors found</p>
          </div>
        ) : (
          <div className="divide-y divide-claude-cream-200 dark:divide-claude-neutral-700">
            {filteredBehaviors.map((behavior) => (
              <BehaviorCard
                key={behavior.id}
                behavior={behavior}
                isSelected={selectedBehaviorId === behavior.id}
                isExpanded={expandedBehaviors.has(behavior.id)}
                onSelect={() => onSelectBehavior(behavior.id)}
                onToggleExpand={() => toggleExpanded(behavior.id)}
                onEdit={() => onEditBehavior(behavior)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BehaviorCard({
  behavior,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onEdit: _onEdit,
}: {
  behavior: IntentBehavior;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={clsx(
        'transition-colors',
        isSelected && 'bg-claude-primary-50 dark:bg-claude-primary-900/20'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggleExpand} className="p-1">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-claude-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-claude-neutral-500" />
          )}
        </button>

        <button onClick={onSelect} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-medium text-claude-neutral-800 dark:text-claude-neutral-100">{behavior.name}</p>
            <span className={clsx('px-1.5 py-0.5 rounded text-xs flex items-center gap-1', triggerColors[behavior.triggerType])}>
              {triggerIcons[behavior.triggerType]}
              <span className="capitalize">{behavior.triggerType.replace('_', ' ')}</span>
            </span>
          </div>
          <p className="text-xs text-claude-neutral-500 line-clamp-1">{behavior.description}</p>
        </button>

        <div className="flex items-center gap-2 text-xs text-claude-neutral-500">
          <span className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {behavior.steps.length} steps
          </span>
          {behavior.errorHandlers && behavior.errorHandlers.length > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <AlertCircle className="w-3 h-3" />
              {behavior.errorHandlers.length}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 ml-6 space-y-3">
          {/* Trigger Condition */}
          {behavior.triggerCondition && (
            <div>
              <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                Trigger Condition
              </p>
              <code className="text-xs bg-claude-cream-100 dark:bg-claude-neutral-700 px-2 py-1 rounded text-claude-neutral-700 dark:text-claude-neutral-300">
                {behavior.triggerCondition}
              </code>
            </div>
          )}

          {/* Steps Flow */}
          <div>
            <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-2">
              Steps
            </p>
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-claude-cream-300 dark:bg-claude-neutral-600" />

              <div className="space-y-2">
                {behavior.steps.sort((a, b) => a.order - b.order).map((step, i) => (
                  <StepNode key={i} step={step} stepNumber={i + 1} />
                ))}
              </div>
            </div>
          </div>

          {/* Error Handlers */}
          {behavior.errorHandlers && behavior.errorHandlers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                Error Handlers
              </p>
              <div className="space-y-1">
                {behavior.errorHandlers.map((handler, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {handler.errorType}
                    </span>
                    <ArrowRight className="w-3 h-3 text-claude-neutral-400" />
                    <span className="text-claude-neutral-600 dark:text-claude-neutral-400">{handler.handler}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepNode({ step, stepNumber }: { step: BehaviorStep; stepNumber: number }) {
  return (
    <div className="relative flex items-start gap-3 pl-1">
      {/* Step number */}
      <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center flex-shrink-0 relative z-10">
        {stepNumber}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-2">
        <p className="text-sm text-claude-neutral-800 dark:text-claude-neutral-200">{step.action}</p>
        {step.description && (
          <p className="text-xs text-claude-neutral-500 mt-0.5">{step.description}</p>
        )}
        {step.errorHandling && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {step.errorHandling}
          </p>
        )}
      </div>
    </div>
  );
}
