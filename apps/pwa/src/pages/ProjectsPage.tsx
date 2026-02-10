import { useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Clock,
  Code2,
  FileCode,
  Star,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useApp } from '../store/AppContext';
import type { Project } from '../types';

interface ProjectsPageProps {
  onNavigate: (page: string) => void;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'demo',
    name: 'Demo Project',
    path: '/demo',
    lastOpened: Date.now() - 1000 * 60 * 5,
    language: 'typescript',
    description: 'A sample TypeScript project to explore features',
  },
  {
    id: 'react-app',
    name: 'React Dashboard',
    path: '/react-app',
    lastOpened: Date.now() - 1000 * 60 * 60 * 2,
    language: 'typescriptreact',
    description: 'Admin dashboard built with React and Tailwind',
  },
  {
    id: 'api-server',
    name: 'API Server',
    path: '/api-server',
    lastOpened: Date.now() - 1000 * 60 * 60 * 24,
    language: 'typescript',
    description: 'REST API with Express and Prisma',
  },
  {
    id: 'cli-tool',
    name: 'CLI Tool',
    path: '/cli-tool',
    lastOpened: Date.now() - 1000 * 60 * 60 * 72,
    language: 'rust',
    description: 'Command-line tool built with Rust',
  },
];

function getLanguageIcon(language: string) {
  switch (language) {
    case 'typescript':
    case 'typescriptreact':
      return <FileCode size={16} className="text-blue-400" />;
    case 'javascript':
      return <FileCode size={16} className="text-yellow-400" />;
    case 'rust':
      return <FileCode size={16} className="text-orange-400" />;
    case 'python':
      return <FileCode size={16} className="text-green-400" />;
    default:
      return <Code2 size={16} className="text-text-muted" />;
  }
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const { dispatch, actions } = useApp();

  const openProject = useCallback(
    (project: Project) => {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      onNavigate('editor');
    },
    [dispatch, onNavigate]
  );

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
            <p className="text-sm text-text-muted mt-1">
              Open a project or create a new one
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
          >
            New Project
          </Button>
        </div>

        {/* Recent projects */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} />
            Recent
          </h2>
          <div className="grid gap-3">
            {SAMPLE_PROJECTS.map((project) => (
              <div
                key={project.id}
                className="group flex items-center gap-4 p-4 bg-surface-1 rounded-xl border border-border hover:border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer transition-all"
                onClick={() => openProject(project)}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
                  {getLanguageIcon(project.language)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-indigo-300 transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted capitalize">
                      {project.language}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTimeAgo(project.lastOpened)}
                    </span>
                    <span>{project.path}</span>
                  </div>
                </div>

                {/* Open arrow */}
                <ArrowRight
                  size={16}
                  className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('editor')}
              className="flex flex-col items-center gap-2 p-4 bg-surface-1 rounded-xl border border-border hover:border-indigo-500/30 transition-all"
            >
              <Code2 size={24} className="text-indigo-400" />
              <span className="text-xs text-text-secondary">Open Editor</span>
            </button>
            <button
              onClick={() => {
                onNavigate('editor');
                actions.toggleAiPanel();
              }}
              className="flex flex-col items-center gap-2 p-4 bg-surface-1 rounded-xl border border-border hover:border-emerald-500/30 transition-all"
            >
              <Star size={24} className="text-emerald-400" />
              <span className="text-xs text-text-secondary">AI Assistant</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="flex flex-col items-center gap-2 p-4 bg-surface-1 rounded-xl border border-border hover:border-amber-500/30 transition-all"
            >
              <FolderOpen size={24} className="text-amber-400" />
              <span className="text-xs text-text-secondary">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
