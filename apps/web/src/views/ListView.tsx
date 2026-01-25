/**
 * ListView - Table/list view for slices
 * Sortable columns, inline editing, and filtering
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  ChevronUp,
  GitPullRequest,
  Target,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../contexts';
import type { Slice, Intent } from '../data/enterprise-data';

type SortKey = 'name' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'shortId';
type SortDirection = 'asc' | 'desc';

const statusOrder: Record<Slice['status'], number> = {
  blocked: 0,
  backlog: 1,
  ready: 2,
  in_progress: 3,
  in_review: 4,
  completed: 5,
};

const priorityOrder: Record<Slice['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusColors: Record<Slice['status'], string> = {
  backlog: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  ready: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  in_review: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  blocked: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const statusLabels: Record<Slice['status'], string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Done',
  blocked: 'Blocked',
};

const priorityColors: Record<Slice['priority'], string> = {
  critical: 'bg-red-500/10 text-red-400',
  high: 'bg-orange-500/10 text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  low: 'bg-gray-500/10 text-gray-400',
};

interface ListViewProps {
  slices: Slice[];
  intents: Intent[];
  onSliceClick?: (slice: Slice) => void;
}

export function ListView({ slices, intents, onSliceClick }: ListViewProps) {
  const { selectedSliceIds, toggleSliceSelection } = useWorkspace();
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getLinkedIntent = (intentId: string | undefined) =>
    intentId ? intents.find(i => i.id === intentId) : undefined;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedSlices = useMemo(() => {
    const sorted = [...slices].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'shortId':
          comparison = a.shortId.localeCompare(b.shortId);
          break;
        case 'status':
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'priority':
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'assignee':
          comparison = a.assignee.name.localeCompare(b.assignee.name);
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [slices, sortKey, sortDirection]);

  const allSelected = slices.length > 0 && slices.every(s => selectedSliceIds.includes(s.id));
  const someSelected = slices.some(s => selectedSliceIds.includes(s.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      slices.forEach(s => {
        if (selectedSliceIds.includes(s.id)) {
          toggleSliceSelection(s.id);
        }
      });
    } else {
      slices.forEach(s => {
        if (!selectedSliceIds.includes(s.id)) {
          toggleSliceSelection(s.id);
        }
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-claude-neutral-900 border-b border-claude-neutral-800">
          <tr>
            {/* Checkbox */}
            <th className="w-10 px-4 py-3">
              <button
                onClick={handleSelectAll}
                className={clsx(
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  allSelected
                    ? 'bg-claude-primary-500 border-claude-primary-500'
                    : someSelected
                    ? 'bg-claude-primary-500/50 border-claude-primary-500'
                    : 'border-claude-neutral-600 hover:border-claude-neutral-500'
                )}
              >
                {(allSelected || someSelected) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
            </th>

            {/* ID */}
            <SortableHeader
              label="ID"
              sortKey="shortId"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="w-28"
            />

            {/* Name */}
            <SortableHeader
              label="Name"
              sortKey="name"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="min-w-64"
            />

            {/* Status */}
            <SortableHeader
              label="Status"
              sortKey="status"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="w-32"
            />

            {/* Priority */}
            <SortableHeader
              label="Priority"
              sortKey="priority"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="w-28"
            />

            {/* Assignee */}
            <SortableHeader
              label="Assignee"
              sortKey="assignee"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="w-40"
            />

            {/* Due Date */}
            <SortableHeader
              label="Due"
              sortKey="dueDate"
              currentKey={sortKey}
              direction={sortDirection}
              onSort={handleSort}
              className="w-28"
            />

            {/* Intent */}
            <th className="px-4 py-3 text-left text-xs font-medium text-claude-neutral-500 uppercase tracking-wider w-48">
              Intent
            </th>

            {/* Actions */}
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>

        <tbody className="divide-y divide-claude-neutral-800">
          {sortedSlices.map(slice => {
            const linkedIntent = getLinkedIntent(slice.linkedIntent);
            const isSelected = selectedSliceIds.includes(slice.id);
            const isOverdue = slice.dueDate && new Date(slice.dueDate) < new Date();

            return (
              <tr
                key={slice.id}
                onClick={() => onSliceClick?.(slice)}
                className={clsx(
                  'hover:bg-claude-neutral-800/50 cursor-pointer transition-colors',
                  isSelected && 'bg-claude-primary-500/10'
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      toggleSliceSelection(slice.id);
                    }}
                    className={clsx(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-claude-primary-500 border-claude-primary-500'
                        : 'border-claude-neutral-600 hover:border-claude-neutral-500'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                </td>

                {/* ID */}
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-claude-neutral-400">
                    {slice.shortId}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-claude-neutral-100 line-clamp-1">
                      {slice.name}
                    </span>
                    {slice.pullRequests && slice.pullRequests.length > 0 && (
                      <GitPullRequest
                        className={clsx(
                          'w-3.5 h-3.5 flex-shrink-0',
                          slice.pullRequests.some(pr => pr.checksStatus === 'failing')
                            ? 'text-red-400'
                            : slice.pullRequests.some(pr => pr.checksStatus === 'pending')
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        )}
                      />
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-flex px-2 py-1 text-xs rounded border',
                      statusColors[slice.status]
                    )}
                  >
                    {statusLabels[slice.status]}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-flex px-2 py-1 text-xs rounded capitalize',
                      priorityColors[slice.priority]
                    )}
                  >
                    {slice.priority}
                  </span>
                </td>

                {/* Assignee */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-claude-primary-500/20 flex items-center justify-center text-[10px] text-claude-primary-400 font-medium">
                      {slice.assignee.avatar}
                    </div>
                    <span className="text-sm text-claude-neutral-300 truncate">
                      {slice.assignee.name}
                    </span>
                  </div>
                </td>

                {/* Due Date */}
                <td className="px-4 py-3">
                  {slice.dueDate ? (
                    <span
                      className={clsx(
                        'text-sm',
                        isOverdue ? 'text-red-400' : 'text-claude-neutral-400'
                      )}
                    >
                      {new Date(slice.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span className="text-sm text-claude-neutral-600">—</span>
                  )}
                </td>

                {/* Intent */}
                <td className="px-4 py-3">
                  {linkedIntent ? (
                    <div className="flex items-center gap-1.5 text-xs text-purple-400">
                      <Target className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{linkedIntent.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-claude-neutral-600">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <button
                    onClick={e => e.stopPropagation()}
                    className="p-1 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-700 rounded transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedSlices.length === 0 && (
        <div className="flex items-center justify-center h-64 text-claude-neutral-500">
          No items to display
        </div>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentKey === sortKey;

  return (
    <th className={clsx('px-4 py-3 text-left', className)}>
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-xs font-medium text-claude-neutral-500 uppercase tracking-wider hover:text-claude-neutral-300 transition-colors"
      >
        <span>{label}</span>
        {isActive && (
          direction === 'asc' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        )}
      </button>
    </th>
  );
}
