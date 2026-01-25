/**
 * Unified Sidebar - Enterprise Context & Intent Management
 * Shows Org → Team → Project hierarchy with inherited context
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Users2,
  FolderOpen,
  FileText,
  MessageSquare,
  Terminal,
  FileCode,
  Users,
  Search,
  Target,
  CheckSquare,
  Layers,
  Circle,
  AlertCircle,
  Clock,
  ArrowDownRight,
  Shield,
  Zap,
  Plus,
} from 'lucide-react';
import type {
  Organization,
  Team,
  Project,
  Intent,
  ContextDoc,
  Slice,
  Identity,
} from '../../data/enterprise-data';

export type Surface = 'chat' | 'code' | 'artifacts' | 'cowork';

interface UnifiedSidebarProps {
  organization: Organization;
  teams: Team[];
  projects: Project[];
  slices: Slice[];
  identity: Identity;

  selectedTeamId: string | null;
  selectedProjectId: string | null;
  selectedSliceId: string | null;

  onSelectTeam: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectSlice: (id: string | null) => void;
  onSelectIntent?: (intent: Intent) => void;
  onSelectContext?: (context: ContextDoc) => void;

  activeSurface: Surface;
  onSurfaceChange: (surface: Surface) => void;

  // Create handlers
  onCreateProject?: () => void;
  onCreateSlice?: () => void;
  onCreateIntent?: () => void;
  onCreateContext?: () => void;
}

const surfaces: { id: Surface; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'code', label: 'Code', icon: <Terminal className="w-4 h-4" /> },
  { id: 'artifacts', label: 'Artifacts', icon: <FileCode className="w-4 h-4" /> },
  { id: 'cowork', label: 'CoWork', icon: <Users className="w-4 h-4" /> },
];

const intentIcons: Record<Intent['type'], React.ReactNode> = {
  goal: <Target className="w-3 h-3" />,
  constraint: <Shield className="w-3 h-3" />,
  behavior: <Zap className="w-3 h-3" />,
  principle: <Layers className="w-3 h-3" />,
  okr: <Target className="w-3 h-3" />,
  adr: <FileText className="w-3 h-3" />,
};

const intentColors: Record<Intent['type'], string> = {
  goal: 'text-green-500',
  constraint: 'text-red-500',
  behavior: 'text-blue-500',
  principle: 'text-purple-500',
  okr: 'text-indigo-500',
  adr: 'text-amber-500',
};

const sliceStatusConfig: Record<Slice['status'], { color: string; bg: string }> = {
  backlog: { color: 'text-gray-400', bg: 'bg-gray-400' },
  ready: { color: 'text-blue-400', bg: 'bg-blue-400' },
  in_progress: { color: 'text-yellow-500', bg: 'bg-yellow-500' },
  in_review: { color: 'text-purple-500', bg: 'bg-purple-500' },
  completed: { color: 'text-green-500', bg: 'bg-green-500' },
  blocked: { color: 'text-red-500', bg: 'bg-red-500' },
};

const freshnessConfig: Record<ContextDoc['freshness'], { icon: React.ReactNode; color: string }> = {
  current: { icon: <Circle className="w-2 h-2 fill-current" />, color: 'text-green-500' },
  stale: { icon: <Clock className="w-2.5 h-2.5" />, color: 'text-yellow-500' },
  outdated: { icon: <AlertCircle className="w-2.5 h-2.5" />, color: 'text-red-500' },
};

export function UnifiedSidebar({
  organization,
  teams,
  projects,
  slices,
  identity,
  selectedTeamId,
  selectedProjectId,
  selectedSliceId,
  onSelectTeam,
  onSelectProject,
  onSelectSlice,
  onSelectIntent,
  onSelectContext,
  activeSurface,
  onSurfaceChange,
  onCreateProject,
  onCreateSlice,
  onCreateIntent,
  onCreateContext,
}: UnifiedSidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    org: true,
    teams: true,
    context: true,
    slices: true,
  });
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(selectedTeamId);
  const [contextSearch, setContextSearch] = useState('');

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectSlices = slices.filter(s => s.projectId === selectedProjectId);

  // Build inherited context
  const inheritedOrgContext = organization.context.map(c => ({ ...c, inheritedFrom: 'org' as const }));
  const inheritedTeamContext = selectedTeam?.context.map(c => ({ ...c, inheritedFrom: 'team' as const })) || [];
  const projectContext = selectedProject?.context || [];
  const allContext = [...inheritedOrgContext, ...inheritedTeamContext, ...projectContext];
  const filteredContext = allContext.filter(c =>
    c.name.toLowerCase().includes(contextSearch.toLowerCase())
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="w-80 h-full flex flex-col bg-white dark:bg-claude-neutral-900 border-r border-claude-cream-300 dark:border-claude-neutral-800">
      {/* Organization Header */}
      <div className="px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-claude-neutral-800 dark:text-claude-neutral-100">
              {organization.name}
            </div>
            <div className="text-xs text-claude-neutral-500 flex items-center gap-2">
              <span>{organization.domain}</span>
              <span className="px-1.5 py-0.5 bg-claude-primary-100 dark:bg-claude-primary-900/30 text-claude-primary-700 dark:text-claude-primary-400 rounded text-[10px] font-medium uppercase">
                {organization.plan}
              </span>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="mt-3 flex items-center gap-2 text-xs text-claude-neutral-500">
          <div className="w-6 h-6 rounded-full bg-claude-primary-100 dark:bg-claude-primary-900/50 flex items-center justify-center text-claude-primary-700 dark:text-claude-primary-400 font-medium text-[10px]">
            {identity.name.split(' ').map(n => n[0]).join('')}
          </div>
          <span>{identity.name}</span>
          <span className="text-claude-neutral-400">•</span>
          <span>{identity.role}</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Organization Intents */}
        <SectionHeader
          title="Organization Principles"
          count={organization.intents.length}
          expanded={expandedSections.org}
          onToggle={() => toggleSection('org')}
        />
        {expandedSections.org && (
          <div className="px-3 pb-3 space-y-1">
            {organization.intents.slice(0, 3).map(intent => (
              <IntentRow
                key={intent.id}
                intent={intent}
                onClick={() => onSelectIntent?.(intent)}
              />
            ))}
            {organization.intents.length > 3 && (
              <div className="text-xs text-claude-neutral-400 px-2 py-1">
                +{organization.intents.length - 3} more principles
              </div>
            )}
          </div>
        )}

        {/* Teams & Projects */}
        <SectionHeader
          title="Teams & Projects"
          count={teams.length}
          expanded={expandedSections.teams}
          onToggle={() => toggleSection('teams')}
          onAdd={onCreateProject}
        />
        {expandedSections.teams && (
          <div className="px-3 pb-3 space-y-1">
            {teams.map(team => (
              <div key={team.id}>
                <button
                  onClick={() => {
                    onSelectTeam(team.id);
                    setExpandedTeamId(expandedTeamId === team.id ? null : team.id);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                    selectedTeamId === team.id
                      ? 'bg-claude-primary-50 text-claude-primary-700 dark:bg-claude-primary-900/30 dark:text-claude-primary-400'
                      : 'text-claude-neutral-600 dark:text-claude-neutral-400 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800'
                  )}
                >
                  {expandedTeamId === team.id ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <Users2 className="w-4 h-4" />
                  <span className="flex-1 text-left truncate font-medium">{team.name}</span>
                  <span className="text-xs text-claude-neutral-400">{team.memberCount}</span>
                </button>

                {/* Team's Projects */}
                {expandedTeamId === team.id && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-claude-cream-200 dark:border-claude-neutral-700 pl-2">
                    {/* Team intents summary */}
                    <div className="flex items-center gap-1 px-2 py-1 text-xs text-claude-neutral-400">
                      <Target className="w-3 h-3" />
                      <span>{team.intents.length} team intents</span>
                    </div>

                    {projects.filter(p => p.teamId === team.id).map(project => (
                      <button
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className={clsx(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                          selectedProjectId === project.id
                            ? 'bg-claude-primary-50 text-claude-primary-700 dark:bg-claude-primary-900/30 dark:text-claude-primary-400'
                            : 'text-claude-neutral-500 dark:text-claude-neutral-400 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800'
                        )}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="flex-1 text-left truncate">{project.name}</span>
                        <span className={clsx(
                          'w-1.5 h-1.5 rounded-full',
                          project.status === 'active' && 'bg-green-500',
                          project.status === 'paused' && 'bg-yellow-500',
                          project.status === 'completed' && 'bg-blue-500',
                          project.status === 'archived' && 'bg-gray-400'
                        )} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Active Work (Slices) */}
        {selectedProjectId && (
          <>
            <SectionHeader
              title="Active Work"
              count={projectSlices.filter(s => s.status !== 'completed').length}
              expanded={expandedSections.slices}
              onToggle={() => toggleSection('slices')}
              onAdd={onCreateSlice}
            />
            {expandedSections.slices && (
              <div className="px-3 pb-3 space-y-1">
                {projectSlices.length > 0 ? (
                  projectSlices.map(slice => (
                    <button
                      key={slice.id}
                      onClick={() => onSelectSlice(selectedSliceId === slice.id ? null : slice.id)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                        selectedSliceId === slice.id
                          ? 'bg-claude-primary-50 dark:bg-claude-primary-900/30'
                          : 'hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800'
                      )}
                    >
                      <span className={clsx('w-2 h-2 rounded-full', sliceStatusConfig[slice.status].bg)} />
                      <CheckSquare className={clsx('w-3.5 h-3.5', sliceStatusConfig[slice.status].color)} />
                      <div className="flex-1 text-left min-w-0">
                        <div className={clsx(
                          'truncate',
                          selectedSliceId === slice.id
                            ? 'text-claude-primary-700 dark:text-claude-primary-400'
                            : 'text-claude-neutral-600 dark:text-claude-neutral-400'
                        )}>
                          {slice.name}
                        </div>
                        <div className="text-[10px] text-claude-neutral-400 flex items-center gap-1">
                          <span>{slice.shortId}</span>
                          <span>•</span>
                          <span>{slice.assignee.name.split(' ')[0]}</span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-claude-neutral-400 px-2 py-2 text-center">
                    No active work items
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Context (with inheritance) */}
        <SectionHeader
          title="Context"
          count={allContext.length}
          expanded={expandedSections.context}
          onToggle={() => toggleSection('context')}
          onAdd={selectedProjectId ? onCreateContext : undefined}
        />
        {expandedSections.context && (
          <div className="px-3 pb-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-claude-neutral-400" />
              <input
                type="text"
                placeholder="Search context..."
                value={contextSearch}
                onChange={(e) => setContextSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-claude-cream-100 dark:bg-claude-neutral-800 rounded-md border-none focus:outline-none focus:ring-1 focus:ring-claude-primary-500"
              />
            </div>

            {/* Context list */}
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {filteredContext.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => onSelectContext?.(doc)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-claude-neutral-600 dark:text-claude-neutral-400 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">{doc.name}</span>
                  <span className={freshnessConfig[doc.freshness].color}>
                    {freshnessConfig[doc.freshness].icon}
                  </span>
                  {'inheritedFrom' in doc && (
                    <span className="text-[10px] text-claude-neutral-400 flex items-center gap-0.5">
                      <ArrowDownRight className="w-2.5 h-2.5" />
                      {doc.inheritedFrom}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project Intents (when project selected) */}
        {selectedProject && selectedProject.intents.length > 0 && (
          <>
            <SectionHeader
              title="Project Intents"
              count={selectedProject.intents.length}
              expanded={true}
              onToggle={() => {}}
              onAdd={onCreateIntent}
            />
            <div className="px-3 pb-3 space-y-1">
              {selectedProject.intents.map(intent => (
                <IntentRow
                  key={intent.id}
                  intent={intent}
                  onClick={() => onSelectIntent?.(intent)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Surface Switcher */}
      <div className="border-t border-claude-cream-300 dark:border-claude-neutral-800 p-3">
        <div className="grid grid-cols-4 gap-1.5">
          {surfaces.map(surface => (
            <button
              key={surface.id}
              onClick={() => onSurfaceChange(surface.id)}
              className={clsx(
                'flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-colors',
                activeSurface === surface.id
                  ? 'bg-claude-primary-50 text-claude-primary-700 dark:bg-claude-primary-900/30 dark:text-claude-primary-400'
                  : 'text-claude-neutral-500 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800'
              )}
            >
              {surface.icon}
              <span>{surface.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  onAdd,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-claude-neutral-500 dark:text-claude-neutral-400 uppercase tracking-wider hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-800/50 border-t border-claude-cream-200 dark:border-claude-neutral-800">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1"
      >
        <span>{title}</span>
        {count !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full">
            {count}
          </span>
        )}
      </button>
      <div className="flex items-center gap-1">
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="p-1 rounded hover:bg-claude-cream-200 dark:hover:bg-claude-neutral-700 transition-colors"
            title={`Add ${title.toLowerCase()}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onToggle}>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function IntentRow({ intent, onClick }: { intent: Intent; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-xs hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-800 transition-colors text-left"
    >
      <span className={clsx('mt-0.5', intentColors[intent.type])}>
        {intentIcons[intent.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-claude-neutral-700 dark:text-claude-neutral-300 truncate">
          {intent.name}
        </div>
        {intent.description && (
          <div className="text-claude-neutral-400 truncate text-[10px] mt-0.5">
            {intent.description}
          </div>
        )}
      </div>
      <span className={clsx(
        'text-[10px] px-1.5 py-0.5 rounded',
        intent.priority === 'critical' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        intent.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        intent.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        intent.priority === 'low' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      )}>
        {intent.priority}
      </span>
    </button>
  );
}
