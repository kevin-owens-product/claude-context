/**
 * Confidence Badge - Visual indicator for attribute confidence levels
 * @prompt-id forge-v4.1:web:components:identity:confidence-badge:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { clsx } from 'clsx';

interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceBadge({ confidence, showLabel = true, size = 'md' }: ConfidenceBadgeProps) {
  const level = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
  const percent = Math.round(confidence * 100);

  const colorClasses = {
    high: 'bg-claude-success/20 text-claude-success border-claude-success/30',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    low: 'bg-claude-error/20 text-claude-error border-claude-error/30',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const barHeight = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  return (
    <div className="flex items-center gap-2">
      {/* Confidence bar */}
      <div className={clsx('w-12 bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden', barHeight[size])}>
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            level === 'high' && 'bg-claude-success',
            level === 'medium' && 'bg-yellow-500',
            level === 'low' && 'bg-claude-error'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={clsx(
            'inline-flex items-center rounded-full border font-medium',
            colorClasses[level],
            sizeClasses[size]
          )}
        >
          {percent}%
        </span>
      )}
    </div>
  );
}
