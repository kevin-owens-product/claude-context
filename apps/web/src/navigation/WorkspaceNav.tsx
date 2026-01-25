/**
 * WorkspaceNav - Living Software Command Sidebar
 *
 * The nerve center of your product. Shows system health, actionable
 * insights, and quick navigation - all powered by real data.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  Building2,
  Sparkles,
  Compass,
  Activity,
  Box,
  FlaskConical,
  Users,
  MessageSquare,
  Target,
  Rocket,
  FolderOpen,
  LayoutDashboard,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useWorkspace, type ViewType } from '../contexts';
import { SystemPulse } from '../components/pulse';
import type { Team, Project } from '../data/enterprise-data';

interface WorkspaceNavProps {
  organization: { name: string; domain: string; plan: string };
  teams: Team[];
  projects: Project[];
  onCreateProject?: () => void;
}

const livingViews = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, shortcut: '1' },
  { id: 'intents', label: 'Intents (WHY)', icon: Compass, color: 'text-purple-400', shortcut: '2' },
  { id: 'capabilities', label: 'Capabilities (WHAT)', icon: Box, color: 'text-blue-400', shortcut: '3' },
  { id: 'signals', label: 'Signals (HOW)', icon: Activity, color: 'text-green-400', shortcut: '4' },
  { id: 'experiments', label: 'Experiments (LEARN)', icon: FlaskConical, color: 'text-cyan-400', shortcut: '5' },
];

const businessTools = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'outcomes', label: 'OKRs', icon: Target },
  { id: 'releases', label: 'Releases', icon: Rocket },
  { id: 'automation', label: 'Automations', icon: Zap },
];

export function WorkspaceNav({
  organization,
  teams: _teams,
  projects,
}: WorkspaceNavProps) {
  const {
    currentProjectId,
    setCurrentProject,
    currentView,
    setCurrentView,
    openAssistant,
  } = useWorkspace();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['living', 'pulse'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <aside className="w-72 h-full flex flex-col bg-gradient-to-b from-claude-neutral-900 to-claude-neutral-950 border-r border-claude-neutral-800">
      {/* Logo & Org Header */}
      <div className="px-4 py-4 border-b border-claude-neutral-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center shadow-lg shadow-claude-primary-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-claude-neutral-100 text-sm">
              {organization.name}
            </div>
            <div className="text-xs text-claude-primary-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Living Software
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        {showSearch ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
            <input
              type="text"
              placeholder="Search intents, signals..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onBlur={() => !searchQuery && setShowSearch(false)}
              autoFocus
              className="w-full pl-10 pr-3 py-2 text-sm bg-claude-neutral-800/80 rounded-lg border border-claude-neutral-700 text-claude-neutral-100 placeholder-claude-neutral-500 focus:outline-none focus:ring-2 focus:ring-claude-primary-500/50 focus:border-claude-primary-500"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-claude-neutral-400 hover:text-claude-neutral-100 bg-claude-neutral-800/40 hover:bg-claude-neutral-800 rounded-lg transition-all border border-transparent hover:border-claude-neutral-700"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
            <span className="ml-auto text-xs text-claude-neutral-600 bg-claude-neutral-800 px-1.5 py-0.5 rounded">⌘K</span>
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Living Software Views */}
        <div className="px-3 py-2">
          <button
            onClick={() => toggleSection('living')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-claude-neutral-400 uppercase tracking-wider hover:text-claude-neutral-300 rounded transition-colors"
          >
            {expandedSections.has('living') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Living Software</span>
          </button>

          {expandedSections.has('living') && (
            <div className="mt-1 space-y-0.5">
              {livingViews.map(view => (
                <button
                  key={view.id}
                  onClick={() => setCurrentView(view.id as ViewType)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all group',
                    currentView === view.id
                      ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/30'
                      : 'text-claude-neutral-300 hover:bg-claude-neutral-800/50 hover:text-claude-neutral-100 border border-transparent'
                  )}
                >
                  <view.icon className={clsx(
                    'w-4 h-4',
                    currentView === view.id ? 'text-claude-primary-400' : view.color || 'text-claude-neutral-500'
                  )} />
                  <span className="flex-1 text-left">{view.label}</span>
                  <span className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                    currentView === view.id ? 'bg-claude-primary-500/30' : 'bg-claude-neutral-800'
                  )}>
                    {view.shortcut}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Pulse */}
        <div className="px-3 py-2 border-t border-claude-neutral-800/50">
          <button
            onClick={() => toggleSection('pulse')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-claude-neutral-400 uppercase tracking-wider hover:text-claude-neutral-300 rounded transition-colors"
          >
            {expandedSections.has('pulse') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <Activity className="w-3 h-3 text-green-400" />
            <span>System Pulse</span>
          </button>

          {expandedSections.has('pulse') && (
            <div className="mt-2">
              <SystemPulse />
            </div>
          )}
        </div>

        {/* Business Tools */}
        <div className="px-3 py-2 border-t border-claude-neutral-800/50">
          <button
            onClick={() => toggleSection('tools')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-claude-neutral-400 uppercase tracking-wider hover:text-claude-neutral-300 rounded transition-colors"
          >
            {expandedSections.has('tools') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Business Tools</span>
          </button>

          {expandedSections.has('tools') && (
            <div className="mt-1 space-y-0.5">
              {businessTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setCurrentView(tool.id as ViewType)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all',
                    currentView === tool.id
                      ? 'bg-claude-neutral-800 text-claude-neutral-100'
                      : 'text-claude-neutral-400 hover:text-claude-neutral-100 hover:bg-claude-neutral-800/50'
                  )}
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{tool.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Context (Projects) */}
        <div className="px-3 py-2 border-t border-claude-neutral-800/50">
          <button
            onClick={() => toggleSection('context')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-claude-neutral-400 uppercase tracking-wider hover:text-claude-neutral-300 rounded transition-colors"
          >
            {expandedSections.has('context') ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <FolderOpen className="w-3 h-3" />
            <span>Projects</span>
          </button>

          {expandedSections.has('context') && (
            <div className="mt-1 space-y-0.5">
              {projects.slice(0, 5).map(project => (
                <button
                  key={project.id}
                  onClick={() => setCurrentProject(project.id)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all',
                    currentProjectId === project.id
                      ? 'bg-claude-neutral-800 text-claude-neutral-100'
                      : 'text-claude-neutral-400 hover:text-claude-neutral-100 hover:bg-claude-neutral-800/50'
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-claude-neutral-800/50 p-3 space-y-2">
        {/* AI Assistant */}
        <button
          onClick={() => openAssistant('chat')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-gradient-to-r from-claude-primary-600 to-claude-primary-500 hover:from-claude-primary-500 hover:to-claude-primary-400 text-white rounded-xl transition-all font-medium shadow-lg shadow-claude-primary-500/20 hover:shadow-claude-primary-500/30"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask Claude</span>
        </button>

        {/* Settings & Help */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4" />
            <span>Help</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default WorkspaceNav;
