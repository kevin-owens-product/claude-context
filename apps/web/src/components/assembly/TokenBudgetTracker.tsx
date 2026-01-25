/**
 * Token Budget Tracker - Visualize token allocation and usage
 * @prompt-id forge-v4.1:web:components:assembly:token-budget:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { clsx } from 'clsx';
import { PieChart, Info } from 'lucide-react';
import type { TokenBudget } from '../../api/assembly';

interface TokenBudgetTrackerProps {
  budget: TokenBudget;
}

export function TokenBudgetTracker({ budget }: TokenBudgetTrackerProps) {
  const categories = [
    { key: 'identity', label: 'Identity', color: 'bg-blue-500', data: budget.identity },
    { key: 'project', label: 'Project', color: 'bg-purple-500', data: budget.project },
    { key: 'other', label: 'Other', color: 'bg-gray-400', data: budget.other },
  ];

  const totalUsed = budget.total.used;
  const totalAllocated = budget.total.allocated;
  const usagePercent = Math.round((totalUsed / totalAllocated) * 100);

  return (
    <div className="claude-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-claude-primary-500" />
          Token Budget
        </h3>
        <div className="flex items-center gap-1 text-xs text-claude-neutral-500">
          <Info className="w-3 h-3" />
          {totalUsed.toLocaleString()} / {totalAllocated.toLocaleString()} tokens
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-claude-neutral-600 dark:text-claude-neutral-400">Total Usage</span>
          <span className={clsx(
            'font-medium',
            usagePercent >= 90 ? 'text-claude-error' : usagePercent >= 70 ? 'text-yellow-500' : 'text-claude-success'
          )}>
            {usagePercent}%
          </span>
        </div>
        <div className="h-2 bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              usagePercent >= 90 ? 'bg-claude-error' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-claude-success'
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const catPercent = cat.data.allocated > 0 ? Math.round((cat.data.used / cat.data.allocated) * 100) : 0;
          const allocPercent = Math.round((cat.data.allocated / totalAllocated) * 100);

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className={clsx('w-3 h-3 rounded-full', cat.color)} />
                  <span className="text-claude-neutral-700 dark:text-claude-neutral-300">{cat.label}</span>
                  <span className="text-xs text-claude-neutral-500">({allocPercent}% budget)</span>
                </div>
                <span className="text-claude-neutral-600 dark:text-claude-neutral-400">
                  {cat.data.used.toLocaleString()} / {cat.data.allocated.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', cat.color)}
                  style={{ width: `${Math.min(catPercent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution Bar */}
      <div className="mt-4 pt-4 border-t border-claude-cream-300 dark:border-claude-neutral-700">
        <p className="text-xs text-claude-neutral-500 mb-2">Budget Allocation</p>
        <div className="h-4 rounded-full overflow-hidden flex">
          {categories.map((cat) => {
            const allocPercent = (cat.data.allocated / totalAllocated) * 100;
            return (
              <div
                key={cat.key}
                className={clsx(cat.color, 'transition-all')}
                style={{ width: `${allocPercent}%` }}
                title={`${cat.label}: ${Math.round(allocPercent)}%`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-claude-neutral-500">
          <span>Identity (20%)</span>
          <span>Project (50%)</span>
          <span>Other (30%)</span>
        </div>
      </div>
    </div>
  );
}
