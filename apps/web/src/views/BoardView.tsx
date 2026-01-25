/**
 * BoardView - Kanban board view for slices
 * Shows columns by status with drag-drop support
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  MoreHorizontal,
  GitPullRequest,
  Target,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '../contexts';
import type { Slice, Intent } from '../data/enterprise-data';

type SliceStatus = Slice['status'];

interface Column {
  id: SliceStatus;
  title: string;
  color: string;
  bgColor: string;
}

const columns: Column[] = [
  { id: 'backlog', title: 'Backlog', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
  { id: 'ready', title: 'Ready', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'in_progress', title: 'In Progress', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { id: 'in_review', title: 'Review', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: 'completed', title: 'Done', color: 'text-green-400', bgColor: 'bg-green-500/10' },
];

interface BoardViewProps {
  slices: Slice[];
  intents: Intent[];
  onSliceClick?: (slice: Slice) => void;
  onSliceStatusChange?: (sliceId: string, newStatus: SliceStatus) => void;
  onCreateSlice?: (status: SliceStatus) => void;
}

export function BoardView({
  slices,
  intents,
  onSliceClick,
  onSliceStatusChange,
  onCreateSlice,
}: BoardViewProps) {
  const { selectedSliceIds, pinItem } = useWorkspace();
  const [draggedSlice, setDraggedSlice] = useState<Slice | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<SliceStatus | null>(null);

  const getSlicesForColumn = (status: SliceStatus) =>
    slices.filter(s => s.status === status);

  const getLinkedIntent = (intentId: string | undefined) =>
    intentId ? intents.find(i => i.id === intentId) : undefined;

  const handleDragStart = (e: React.DragEvent, slice: Slice) => {
    setDraggedSlice(slice);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slice.id);
  };

  const handleDragOver = (e: React.DragEvent, status: SliceStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: SliceStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (draggedSlice && draggedSlice.status !== status) {
      onSliceStatusChange?.(draggedSlice.id, status);
    }
    setDraggedSlice(null);
  };

  const handleDragEnd = () => {
    setDraggedSlice(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
      <div className="flex gap-4 h-full min-w-max">
        {columns.map(column => {
          const columnSlices = getSlicesForColumn(column.id);
          const isDropTarget = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex flex-col w-80 flex-shrink-0"
              onDragOver={e => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={clsx('font-medium text-sm', column.color)}>
                    {column.title}
                  </span>
                  <span className="text-xs text-claude-neutral-500 bg-claude-neutral-800 px-2 py-0.5 rounded-full">
                    {columnSlices.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onCreateSlice?.(column.id)}
                    className="p-1 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors"
                    title={`Add to ${column.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Column Content */}
              <div
                className={clsx(
                  'flex-1 rounded-lg p-2 space-y-2 overflow-y-auto transition-colors',
                  isDropTarget
                    ? 'bg-claude-primary-500/10 ring-2 ring-claude-primary-500/30'
                    : column.bgColor
                )}
              >
                {columnSlices.map(slice => (
                  <SliceCard
                    key={slice.id}
                    slice={slice}
                    linkedIntent={getLinkedIntent(slice.linkedIntent)}
                    isSelected={selectedSliceIds.includes(slice.id)}
                    isDragging={draggedSlice?.id === slice.id}
                    onClick={() => onSliceClick?.(slice)}
                    onDragStart={e => handleDragStart(e, slice)}
                    onDragEnd={handleDragEnd}
                    onPinIntent={intent => pinItem({
                      id: intent.id,
                      type: 'intent',
                      name: intent.name,
                      subtype: intent.type,
                    })}
                  />
                ))}

                {columnSlices.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-sm text-claude-neutral-500 border-2 border-dashed border-claude-neutral-700 rounded-lg">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Blocked Column (special) */}
        <div className="flex flex-col w-80 flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="font-medium text-sm text-red-400">Blocked</span>
              <span className="text-xs text-claude-neutral-500 bg-claude-neutral-800 px-2 py-0.5 rounded-full">
                {slices.filter(s => s.status === 'blocked').length}
              </span>
            </div>
          </div>

          <div className="flex-1 rounded-lg p-2 space-y-2 overflow-y-auto bg-red-500/5">
            {slices
              .filter(s => s.status === 'blocked')
              .map(slice => (
                <SliceCard
                  key={slice.id}
                  slice={slice}
                  linkedIntent={getLinkedIntent(slice.linkedIntent)}
                  isSelected={selectedSliceIds.includes(slice.id)}
                  isDragging={draggedSlice?.id === slice.id}
                  onClick={() => onSliceClick?.(slice)}
                  onDragStart={e => handleDragStart(e, slice)}
                  onDragEnd={handleDragEnd}
                  isBlocked
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SliceCardProps {
  slice: Slice;
  linkedIntent?: Intent;
  isSelected: boolean;
  isDragging: boolean;
  isBlocked?: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onPinIntent?: (intent: Intent) => void;
}

function SliceCard({
  slice,
  linkedIntent,
  isSelected,
  isDragging,
  isBlocked,
  onClick,
  onDragStart,
  onDragEnd,
  onPinIntent,
}: SliceCardProps) {
  const priorityColors: Record<Slice['priority'], string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-gray-500',
  };

  const hasPRs = slice.pullRequests && slice.pullRequests.length > 0;
  const openPRs = slice.pullRequests?.filter(pr => pr.status === 'open') || [];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={clsx(
        'bg-claude-neutral-800 rounded-lg p-3 cursor-pointer transition-all',
        'border border-claude-neutral-700 hover:border-claude-neutral-600',
        isSelected && 'ring-2 ring-claude-primary-500 border-claude-primary-500',
        isDragging && 'opacity-50 scale-95',
        isBlocked && 'border-red-500/50'
      )}
    >
      {/* Header: ID & Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-claude-neutral-500">
          {slice.shortId}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              priorityColors[slice.priority]
            )}
            title={`${slice.priority} priority`}
          />
          {slice.storyPoints && (
            <span className="text-xs text-claude-neutral-500 bg-claude-neutral-700 px-1.5 py-0.5 rounded">
              {slice.storyPoints}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-claude-neutral-100 mb-2 line-clamp-2">
        {slice.name}
      </h3>

      {/* Blocked Reason */}
      {isBlocked && slice.blockedReason && (
        <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 mb-2">
          {slice.blockedReason}
        </div>
      )}

      {/* Linked Intent */}
      {linkedIntent && (
        <button
          onClick={e => {
            e.stopPropagation();
            onPinIntent?.(linkedIntent);
          }}
          className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 rounded px-2 py-1 mb-2 hover:bg-purple-500/20 transition-colors w-full text-left"
        >
          <Target className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{linkedIntent.name}</span>
        </button>
      )}

      {/* Labels */}
      {slice.labels && slice.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {slice.labels.slice(0, 3).map(label => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 bg-claude-neutral-700 text-claude-neutral-400 rounded"
            >
              {label}
            </span>
          ))}
          {slice.labels.length > 3 && (
            <span className="text-[10px] text-claude-neutral-500">
              +{slice.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee, PRs, Due Date */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-claude-neutral-700">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          <div
            className="w-6 h-6 rounded-full bg-claude-primary-500/20 flex items-center justify-center text-[10px] text-claude-primary-400 font-medium"
            title={slice.assignee.name}
          >
            {slice.assignee.avatar}
          </div>

          {/* PRs */}
          {hasPRs && (
            <div
              className={clsx(
                'flex items-center gap-1 text-xs',
                openPRs.some(pr => pr.checksStatus === 'failing')
                  ? 'text-red-400'
                  : openPRs.some(pr => pr.checksStatus === 'pending')
                  ? 'text-yellow-400'
                  : 'text-green-400'
              )}
              title={`${openPRs.length} open PR(s)`}
            >
              <GitPullRequest className="w-3 h-3" />
              <span>{openPRs.length}</span>
            </div>
          )}
        </div>

        {/* Due Date */}
        {slice.dueDate && (
          <div
            className={clsx(
              'flex items-center gap-1 text-xs',
              new Date(slice.dueDate) < new Date()
                ? 'text-red-400'
                : 'text-claude-neutral-500'
            )}
          >
            <Clock className="w-3 h-3" />
            <span>
              {new Date(slice.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
