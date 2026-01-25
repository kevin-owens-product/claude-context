/**
 * Goal Hierarchy - Tree visualization of project goals
 * @prompt-id forge-v4.1:web:components:projects:goal-hierarchy:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  ChevronRight,
  ChevronDown,
  Target,
  Plus,
  MoreVertical,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { ProjectGoal, GoalStatus, GoalPriority } from '../../api/projects';

interface GoalHierarchyProps {
  goals: ProjectGoal[];
  onAddGoal: (parentId?: string) => void;
  onEditGoal: (goal: ProjectGoal) => void;
  onUpdateStatus: (goalId: string, status: GoalStatus) => void;
}

const statusIcons: Record<GoalStatus, React.ReactNode> = {
  not_started: <Circle className="w-4 h-4 text-claude-neutral-400" />,
  in_progress: <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />,
  blocked: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-claude-success" />,
  abandoned: <XCircle className="w-4 h-4 text-claude-neutral-400" />,
};

const priorityColors: Record<GoalPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function GoalHierarchy({ goals, onAddGoal, onEditGoal, onUpdateStatus }: GoalHierarchyProps) {
  // Build tree structure from flat list
  const rootGoals = goals.filter((g) => !g.parentGoalId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-claude-primary-500" />
          Goals
        </h3>
        <button
          onClick={() => onAddGoal()}
          className="claude-btn-ghost flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {rootGoals.length === 0 ? (
        <div className="text-center py-8 text-claude-neutral-500">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No goals defined yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rootGoals.map((goal) => (
            <GoalNode
              key={goal.id}
              goal={goal}
              allGoals={goals}
              depth={0}
              onEdit={onEditGoal}
              onAddChild={onAddGoal}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GoalNodeProps {
  goal: ProjectGoal;
  allGoals: ProjectGoal[];
  depth: number;
  onEdit: (goal: ProjectGoal) => void;
  onAddChild: (parentId: string) => void;
  onUpdateStatus: (goalId: string, status: GoalStatus) => void;
}

function GoalNode({ goal, allGoals, depth, onEdit, onAddChild, onUpdateStatus }: GoalNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const children = allGoals.filter((g) => g.parentGoalId === goal.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={clsx(
          'group flex items-center gap-2 px-3 py-2 rounded-claude-sm',
          'hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700 transition-colors'
        )}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'w-5 h-5 flex items-center justify-center',
            !hasChildren && 'invisible'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-claude-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-claude-neutral-500" />
          )}
        </button>

        {/* Status Icon */}
        <button
          onClick={() => {
            const statuses: GoalStatus[] = ['not_started', 'in_progress', 'completed', 'blocked', 'abandoned'];
            const currentIndex = statuses.indexOf(goal.status);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
            onUpdateStatus(goal.id, nextStatus);
          }}
          className="hover:scale-110 transition-transform"
          title={`Status: ${goal.status.replace('_', ' ')}`}
        >
          {statusIcons[goal.status]}
        </button>

        {/* Goal Content */}
        <button
          onClick={() => onEdit(goal)}
          className="flex-1 text-left text-claude-neutral-800 dark:text-claude-neutral-200"
        >
          {goal.description}
        </button>

        {/* Priority Badge */}
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', priorityColors[goal.priority])}>
          {goal.priority}
        </span>

        {/* Actions */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-600"
          >
            <MoreVertical className="w-4 h-4 text-claude-neutral-500" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white dark:bg-claude-neutral-800 rounded-claude shadow-claude-lg border border-claude-cream-300 dark:border-claude-neutral-600 py-1">
                <button
                  onClick={() => {
                    onAddChild(goal.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                >
                  Add Sub-goal
                </button>
                <button
                  onClick={() => {
                    onEdit(goal);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                >
                  Edit Goal
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              allGoals={allGoals}
              depth={depth + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
