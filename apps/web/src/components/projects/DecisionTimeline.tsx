/**
 * Decision Timeline - Display project decisions chronologically
 * @prompt-id forge-v4.1:web:components:projects:decision-timeline:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  GitBranch,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { ProjectDecision } from '../../api/projects';

interface DecisionTimelineProps {
  decisions: ProjectDecision[];
  onAddDecision: () => void;
  onReverseDecision: (decisionId: string) => void;
}

export function DecisionTimeline({ decisions, onAddDecision, onReverseDecision }: DecisionTimelineProps) {
  // Sort by date, most recent first
  const sortedDecisions = [...decisions].sort(
    (a, b) => new Date(b.madeAt).getTime() - new Date(a.madeAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-500" />
          Decisions
        </h3>
        <button
          onClick={onAddDecision}
          className="claude-btn-ghost flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Record Decision
        </button>
      </div>

      {sortedDecisions.length === 0 ? (
        <div className="text-center py-8 text-claude-neutral-500">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No decisions recorded yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-claude-cream-300 dark:bg-claude-neutral-600" />

          <div className="space-y-4">
            {sortedDecisions.map((decision, index) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                isFirst={index === 0}
                onReverse={() => onReverseDecision(decision.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DecisionCard({
  decision,
  isFirst,
  onReverse,
}: {
  decision: ProjectDecision;
  isFirst: boolean;
  onReverse: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(isFirst);
  const isReversed = !!decision.reversedAt;

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={clsx(
          'absolute left-2.5 w-3 h-3 rounded-full border-2',
          isReversed
            ? 'bg-claude-neutral-300 border-claude-neutral-400 dark:bg-claude-neutral-600 dark:border-claude-neutral-500'
            : 'bg-purple-500 border-purple-600'
        )}
      />

      <div
        className={clsx(
          'claude-card p-4',
          isReversed && 'opacity-60'
        )}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-start justify-between text-left"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isReversed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-claude-error/20 text-claude-error">
                  Reversed
                </span>
              )}
              <p className={clsx(
                'font-medium',
                isReversed
                  ? 'text-claude-neutral-500 line-through'
                  : 'text-claude-neutral-800 dark:text-claude-neutral-100'
              )}>
                {decision.description}
              </p>
            </div>
            <div className="flex items-center gap-3 text-caption text-claude-neutral-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {decision.madeBy}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(decision.madeAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-claude-neutral-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-claude-neutral-400" />
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-claude-cream-200 dark:border-claude-neutral-600 space-y-3">
            {/* Rationale */}
            <div>
              <p className="text-caption font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                Rationale
              </p>
              <p className="text-body-sm text-claude-neutral-700 dark:text-claude-neutral-300">
                {decision.rationale}
              </p>
            </div>

            {/* Alternatives */}
            {decision.alternatives.length > 0 && (
              <div>
                <p className="text-caption font-medium text-claude-neutral-600 dark:text-claude-neutral-400 mb-1">
                  Alternatives Considered
                </p>
                <ul className="list-disc list-inside text-body-sm text-claude-neutral-700 dark:text-claude-neutral-300">
                  {decision.alternatives.map((alt, i) => (
                    <li key={i}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reversal info */}
            {isReversed && decision.reversalReason && (
              <div className="p-3 bg-claude-error/10 rounded-claude-sm">
                <p className="text-caption font-medium text-claude-error mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Reversed on {new Date(decision.reversedAt!).toLocaleDateString()}
                </p>
                <p className="text-body-sm text-claude-neutral-700 dark:text-claude-neutral-300">
                  {decision.reversalReason}
                </p>
              </div>
            )}

            {/* Actions */}
            {!isReversed && (
              <div className="flex justify-end">
                <button
                  onClick={onReverse}
                  className="flex items-center gap-1 text-sm text-claude-neutral-500 hover:text-claude-error transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reverse Decision
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
