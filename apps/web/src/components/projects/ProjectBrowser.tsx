/**
 * Project Browser - List and browse projects
 * @prompt-id forge-v4.1:web:components:projects:browser:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Target,
  AlertCircle,
  Clock,
  CheckCircle2,
  Pause,
  Archive,
} from 'lucide-react';
import { projectsApi, type Project, type ProjectStatus } from '../../api/projects';

interface ProjectBrowserProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  active: <CheckCircle2 className="w-4 h-4 text-claude-success" />,
  completed: <Target className="w-4 h-4 text-blue-500" />,
  paused: <Pause className="w-4 h-4 text-yellow-500" />,
  archived: <Archive className="w-4 h-4 text-claude-neutral-400" />,
};

const statusLabels: Record<ProjectStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
  archived: 'Archived',
};

export function ProjectBrowser({ onSelectProject, onCreateProject }: ProjectBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectsApi.listProjects({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const filteredProjects = data?.projects.filter((project) =>
    searchQuery === '' ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-claude-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-claude-error mb-4" />
        <p className="text-claude-error mb-4">Failed to load projects</p>
        <button onClick={() => refetch()} className="claude-btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-claude bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
              Projects
            </h2>
            <p className="text-caption text-claude-neutral-500">
              {data?.total || 0} projects
            </p>
          </div>
        </div>
        <button onClick={onCreateProject} className="claude-btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-700 flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-claude-neutral-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={clsx(
              'px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          >
            <option value="all">All Status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 mx-auto text-claude-neutral-300 dark:text-claude-neutral-600 mb-4" />
            <p className="text-claude-neutral-500 dark:text-claude-neutral-400">
              {searchQuery || statusFilter !== 'all'
                ? 'No matching projects found'
                : 'No projects yet. Create your first one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onSelectProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const goalCount = project.goals?.length || 0;
  const constraintCount = project.constraints?.length || 0;
  const completedGoals = project.goals?.filter((g) => g.status === 'completed').length || 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full claude-card p-4 text-left hover:shadow-claude-lg hover:border-claude-primary-300',
        'dark:hover:border-claude-primary-600 transition-all group'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {statusIcons[project.status]}
            <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100">
              {project.name}
            </h3>
          </div>
          {project.description && (
            <p className="text-body-sm text-claude-neutral-500 dark:text-claude-neutral-400 line-clamp-2 mb-3">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-caption text-claude-neutral-500">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {completedGoals}/{goalCount} goals
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {constraintCount} constraints
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(project.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-claude-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
