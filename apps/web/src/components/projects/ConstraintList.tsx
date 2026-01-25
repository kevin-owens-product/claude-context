/**
 * Constraint List - Display and manage project constraints
 * @prompt-id forge-v4.1:web:components:projects:constraint-list:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Shield,
  Clock,
  DollarSign,
  Scale,
  Zap,
  Accessibility,
  Link,
  Server,
  Lock,
} from 'lucide-react';
import type { ProjectConstraint, ConstraintCategory, ConstraintSeverity } from '../../api/projects';

interface ConstraintListProps {
  constraints: ProjectConstraint[];
  onAddConstraint: () => void;
  onDeleteConstraint: (constraintId: string) => void;
}

const categoryIcons: Record<ConstraintCategory, React.ReactNode> = {
  technical: <Server className="w-4 h-4" />,
  business: <DollarSign className="w-4 h-4" />,
  regulatory: <Scale className="w-4 h-4" />,
  security: <Lock className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  accessibility: <Accessibility className="w-4 h-4" />,
  compatibility: <Link className="w-4 h-4" />,
  budget: <DollarSign className="w-4 h-4" />,
  timeline: <Clock className="w-4 h-4" />,
};

const categoryColors: Record<ConstraintCategory, string> = {
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  business: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  regulatory: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  performance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  accessibility: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  compatibility: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  budget: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  timeline: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const severityColors: Record<ConstraintSeverity, string> = {
  must: 'bg-red-500 text-white',
  should: 'bg-orange-500 text-white',
  could: 'bg-yellow-500 text-yellow-900',
  wont: 'bg-gray-400 text-white',
};

const severityLabels: Record<ConstraintSeverity, string> = {
  must: 'Must Have',
  should: 'Should Have',
  could: 'Could Have',
  wont: "Won't Have",
};

export function ConstraintList({ constraints, onAddConstraint, onDeleteConstraint }: ConstraintListProps) {
  // Group by severity
  const groupedConstraints = constraints.reduce((acc, constraint) => {
    if (!acc[constraint.severity]) acc[constraint.severity] = [];
    acc[constraint.severity].push(constraint);
    return acc;
  }, {} as Record<ConstraintSeverity, ProjectConstraint[]>);

  const severityOrder: ConstraintSeverity[] = ['must', 'should', 'could', 'wont'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Constraints
        </h3>
        <button
          onClick={onAddConstraint}
          className="claude-btn-ghost flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Constraint
        </button>
      </div>

      {constraints.length === 0 ? (
        <div className="text-center py-8 text-claude-neutral-500">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No constraints defined yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {severityOrder.map((severity) => {
            const items = groupedConstraints[severity];
            if (!items || items.length === 0) return null;

            return (
              <div key={severity}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx('text-xs px-2 py-1 rounded font-medium', severityColors[severity])}>
                    {severityLabels[severity]}
                  </span>
                  <span className="text-caption text-claude-neutral-500">({items.length})</span>
                </div>

                <div className="space-y-2">
                  {items.map((constraint) => (
                    <ConstraintCard
                      key={constraint.id}
                      constraint={constraint}
                      onDelete={() => onDeleteConstraint(constraint.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConstraintCard({
  constraint,
  onDelete,
}: {
  constraint: ProjectConstraint;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={clsx(
        'group flex items-start gap-3 px-4 py-3 rounded-claude-sm',
        'bg-claude-cream-50 dark:bg-claude-neutral-700/50',
        'border-l-4',
        constraint.severity === 'must' && 'border-l-red-500',
        constraint.severity === 'should' && 'border-l-orange-500',
        constraint.severity === 'could' && 'border-l-yellow-500',
        constraint.severity === 'wont' && 'border-l-gray-400'
      )}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <span className={clsx('p-1.5 rounded-claude-sm', categoryColors[constraint.category])}>
        {categoryIcons[constraint.category]}
      </span>

      <div className="flex-1">
        <p className="text-claude-neutral-800 dark:text-claude-neutral-200">{constraint.description}</p>
        {constraint.rationale && (
          <p className="text-caption text-claude-neutral-500 mt-1">{constraint.rationale}</p>
        )}
      </div>

      <span
        className={clsx(
          'text-xs px-2 py-0.5 rounded-full',
          categoryColors[constraint.category]
        )}
      >
        {constraint.category}
      </span>

      {showDelete && (
        <button
          onClick={onDelete}
          className="p-1 text-claude-error hover:bg-claude-error/10 rounded transition-colors"
          title="Delete constraint"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
