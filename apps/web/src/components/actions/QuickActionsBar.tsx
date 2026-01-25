/**
 * QuickActionsBar - Floating action bar for common operations
 * Context-aware actions based on selection
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Trash2,
  Link2,
  Copy,
  MoreHorizontal,
  X,
  ChevronUp,
  Sparkles,
  GitPullRequest,
  MessageSquare,
} from 'lucide-react';
import type { Slice } from '../../data/enterprise-data';

interface QuickActionsBarProps {
  selectedSlices: Slice[];
  onStatusChange?: (sliceIds: string[], status: Slice['status']) => void;
  onDelete?: (sliceIds: string[]) => void;
  onAssign?: (sliceIds: string[], userId: string) => void;
  onAddLabel?: (sliceIds: string[], label: string) => void;
  onLinkIntent?: (sliceIds: string[]) => void;
  onDuplicate?: (sliceIds: string[]) => void;
  onAskClaude?: (sliceIds: string[]) => void;
  onCreatePR?: (sliceIds: string[]) => void;
  onAddComment?: (sliceIds: string[]) => void;
  onClearSelection?: () => void;
}

export function QuickActionsBar({
  selectedSlices,
  onStatusChange,
  onDelete,
  onLinkIntent,
  onDuplicate,
  onAskClaude,
  onCreatePR,
  onAddComment,
  onClearSelection,
}: QuickActionsBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMore, setShowMore] = useState(false);

  if (selectedSlices.length === 0) return null;

  const isSingleSelection = selectedSlices.length === 1;
  const hasBlockedItems = selectedSlices.some(s => s.status === 'blocked');
  const hasCompletedItems = selectedSlices.some(s => s.status === 'completed');

  const primaryActions = [
    {
      id: 'start',
      icon: Play,
      label: 'Start',
      shortcut: 'S',
      color: 'text-green-400 hover:bg-green-500/20',
      show: !hasCompletedItems && selectedSlices.some(s => s.status !== 'in_progress'),
      action: () => onStatusChange?.(selectedSlices.map(s => s.id), 'in_progress'),
    },
    {
      id: 'complete',
      icon: CheckCircle,
      label: 'Complete',
      shortcut: 'C',
      color: 'text-blue-400 hover:bg-blue-500/20',
      show: !hasCompletedItems,
      action: () => onStatusChange?.(selectedSlices.map(s => s.id), 'completed'),
    },
    {
      id: 'block',
      icon: AlertCircle,
      label: hasBlockedItems ? 'Unblock' : 'Block',
      shortcut: 'B',
      color: hasBlockedItems ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-red-400 hover:bg-red-500/20',
      show: true,
      action: () => onStatusChange?.(
        selectedSlices.map(s => s.id),
        hasBlockedItems ? 'in_progress' : 'blocked'
      ),
    },
    {
      id: 'pause',
      icon: Pause,
      label: 'Pause',
      shortcut: 'P',
      color: 'text-yellow-400 hover:bg-yellow-500/20',
      show: selectedSlices.some(s => s.status === 'in_progress'),
      action: () => onStatusChange?.(selectedSlices.map(s => s.id), 'ready'),
    },
  ];

  const secondaryActions = [
    {
      id: 'claude',
      icon: Sparkles,
      label: 'Ask Claude',
      color: 'text-purple-400 hover:bg-purple-500/20',
      action: () => onAskClaude?.(selectedSlices.map(s => s.id)),
    },
    {
      id: 'link',
      icon: Link2,
      label: 'Link Intent',
      color: 'text-cyan-400 hover:bg-cyan-500/20',
      action: () => onLinkIntent?.(selectedSlices.map(s => s.id)),
    },
    {
      id: 'pr',
      icon: GitPullRequest,
      label: 'Create PR',
      color: 'text-green-400 hover:bg-green-500/20',
      show: isSingleSelection,
      action: () => onCreatePR?.(selectedSlices.map(s => s.id)),
    },
    {
      id: 'comment',
      icon: MessageSquare,
      label: 'Comment',
      color: 'text-blue-400 hover:bg-blue-500/20',
      action: () => onAddComment?.(selectedSlices.map(s => s.id)),
    },
    {
      id: 'duplicate',
      icon: Copy,
      label: 'Duplicate',
      color: 'text-claude-neutral-400 hover:bg-claude-neutral-700',
      action: () => onDuplicate?.(selectedSlices.map(s => s.id)),
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      color: 'text-red-400 hover:bg-red-500/20',
      action: () => onDelete?.(selectedSlices.map(s => s.id)),
    },
  ];

  const visiblePrimary = primaryActions.filter(a => a.show !== false);
  const visibleSecondary = secondaryActions.filter(a => a.show !== false);

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
        'bg-claude-neutral-800 border border-claude-neutral-700 rounded-2xl shadow-2xl',
        'transition-all duration-200',
        isExpanded ? 'px-2 py-2' : 'px-4 py-2'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Selection count */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-claude-neutral-700 rounded-lg">
          <span className="text-sm font-medium text-claude-neutral-100">
            {selectedSlices.length}
          </span>
          <span className="text-sm text-claude-neutral-400">
            selected
          </span>
        </div>

        {isExpanded && (
          <>
            <div className="w-px h-8 bg-claude-neutral-700" />

            {/* Primary actions */}
            <div className="flex items-center gap-1">
              {visiblePrimary.map(action => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors',
                    action.color
                  )}
                  title={`${action.label} (${action.shortcut})`}
                >
                  <action.icon className="w-4 h-4" />
                  <span className="text-sm">{action.label}</span>
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-claude-neutral-700" />

            {/* Secondary actions */}
            <div className="flex items-center gap-1">
              {visibleSecondary.slice(0, showMore ? undefined : 3).map(action => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    action.color
                  )}
                  title={action.label}
                >
                  <action.icon className="w-4 h-4" />
                </button>
              ))}

              {visibleSecondary.length > 3 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}

        <div className="w-px h-8 bg-claude-neutral-700" />

        {/* Collapse/Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg transition-colors"
          >
            <ChevronUp className={clsx('w-4 h-4 transition-transform', !isExpanded && 'rotate-180')} />
          </button>
          <button
            onClick={onClearSelection}
            className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      {isExpanded && (
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-claude-neutral-700">
          {visiblePrimary.slice(0, 4).map(action => (
            <span key={action.id} className="text-xs text-claude-neutral-500">
              <kbd className="px-1 bg-claude-neutral-700 rounded">{action.shortcut}</kbd> {action.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
