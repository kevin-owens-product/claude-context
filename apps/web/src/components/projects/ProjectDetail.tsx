/**
 * Project Detail - Full project view with goals, constraints, decisions
 * @prompt-id forge-v4.1:web:components:projects:detail:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Target,
  Shield,
  GitBranch,
  MoreVertical,
  Edit2,
  Trash2,
  Pause,
  Play,
  Archive,
} from 'lucide-react';
import { projectsApi, type Project, type ProjectStatus, type GoalStatus } from '../../api/projects';
import { GoalHierarchy } from './GoalHierarchy';
import { ConstraintList } from './ConstraintList';
import { DecisionTimeline } from './DecisionTimeline';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-claude-success/20 text-claude-success',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-claude-neutral-200 text-claude-neutral-600 dark:bg-claude-neutral-700 dark:text-claude-neutral-400',
};

type Tab = 'goals' | 'constraints' | 'decisions';

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('goals');
  const [showMenu, setShowMenu] = useState(false);

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getProject(projectId),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: Partial<Pick<Project, 'name' | 'description' | 'status'>>) =>
      projectsApi.updateProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateGoalStatusMutation = useMutation({
    mutationFn: ({ goalId, status }: { goalId: string; status: GoalStatus }) =>
      projectsApi.updateGoal(projectId, goalId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const deleteConstraintMutation = useMutation({
    mutationFn: (constraintId: string) => projectsApi.deleteConstraint(projectId, constraintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-claude-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-claude-error mb-4" />
        <p className="text-claude-error mb-4">Failed to load project</p>
        <button onClick={() => refetch()} className="claude-btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'goals', label: 'Goals', icon: <Target className="w-4 h-4" />, count: project.goals?.length || 0 },
    { id: 'constraints', label: 'Constraints', icon: <Shield className="w-4 h-4" />, count: project.constraints?.length || 0 },
    { id: 'decisions', label: 'Decisions', icon: <GitBranch className="w-4 h-4" />, count: project.decisions?.length || 0 },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="p-2 rounded-claude-sm hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
                {project.name}
              </h2>
              <span className={clsx('text-xs px-2 py-1 rounded-full font-medium', statusColors[project.status])}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
            </div>
            {project.description && (
              <p className="text-body-sm text-claude-neutral-500 dark:text-claude-neutral-400 mt-1">
                {project.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-claude-sm hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-claude-neutral-600 dark:text-claude-neutral-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-claude-neutral-800 rounded-claude shadow-claude-lg border border-claude-cream-300 dark:border-claude-neutral-600 py-1">
                  <button
                    onClick={() => {
                      // TODO: Open edit modal
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Project
                  </button>
                  {project.status === 'active' && (
                    <button
                      onClick={() => {
                        updateProjectMutation.mutate({ status: 'paused' });
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                    >
                      <Pause className="w-4 h-4" />
                      Pause Project
                    </button>
                  )}
                  {project.status === 'paused' && (
                    <button
                      onClick={() => {
                        updateProjectMutation.mutate({ status: 'active' });
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                    >
                      <Play className="w-4 h-4" />
                      Resume Project
                    </button>
                  )}
                  <button
                    onClick={() => {
                      updateProjectMutation.mutate({ status: 'archived' });
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700"
                  >
                    <Archive className="w-4 h-4" />
                    Archive Project
                  </button>
                  <hr className="my-1 border-claude-cream-200 dark:border-claude-neutral-600" />
                  <button
                    onClick={() => {
                      // TODO: Confirm and delete
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-claude-error hover:bg-claude-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-t-claude-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-claude-cream-100 dark:bg-claude-neutral-700 text-claude-primary-600 dark:text-claude-primary-400'
                  : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-700/50'
              )}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-claude-cream-200 dark:bg-claude-neutral-600">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'goals' && (
          <GoalHierarchy
            goals={project.goals || []}
            onAddGoal={(parentId) => {
              // TODO: Open add goal modal
              console.log('Add goal', parentId);
            }}
            onEditGoal={(goal) => {
              // TODO: Open edit goal modal
              console.log('Edit goal', goal);
            }}
            onUpdateStatus={(goalId, status) => {
              updateGoalStatusMutation.mutate({ goalId, status });
            }}
          />
        )}

        {activeTab === 'constraints' && (
          <ConstraintList
            constraints={project.constraints || []}
            onAddConstraint={() => {
              // TODO: Open add constraint modal
              console.log('Add constraint');
            }}
            onDeleteConstraint={(constraintId) => {
              deleteConstraintMutation.mutate(constraintId);
            }}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionTimeline
            decisions={project.decisions || []}
            onAddDecision={() => {
              // TODO: Open add decision modal
              console.log('Add decision');
            }}
            onReverseDecision={(decisionId) => {
              // TODO: Open reverse decision modal
              console.log('Reverse decision', decisionId);
            }}
          />
        )}
      </div>
    </div>
  );
}
