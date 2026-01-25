/**
 * WorkspaceLayout - Main app shell with Claude as central intelligence
 *
 * Layout: Nav | Work Area | Claude
 *
 * Claude is ALWAYS present on the right, providing context and connections
 * between documentation, code, and work items.
 *
 * Features:
 * - Command Palette (Cmd+K)
 * - Smart Search with AI
 * - Keyboard shortcuts
 * - All views: Dashboard, Board, List, Timeline, Canvas, Gallery, Document
 * - Notifications Center
 * - Real-time Presence
 * - Quick Actions Bar
 */

import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Moon,
  Sun,
  Bell,
  Settings,
  PanelRightOpen,
  PanelRightClose,
  Command,
  Search,
} from 'lucide-react';
import { useWorkspace } from '../contexts';
import { WorkspaceNav, ViewTabs, ContextBar } from '../navigation';
import {
  BoardView,
  ListView,
  TimelineView,
  CanvasView,
  GalleryView,
  DocumentView,
  LivingSoftwareView,
  IntentCanvasView,
  SignalDashboardView,
  CapabilityMapView,
  ExperimentLabView,
  CustomerIntelligenceView,
  CustomersView,
  FeedbackView,
  RoadmapView,
  SalesView,
  OutcomesView,
  SolutionsView,
  ReleasesView,
  AutomationView,
  // Code Intelligence Views
  RepositoriesView,
  FileExplorerView,
  SymbolSearchView,
  CallGraphView,
  HotspotsView,
  CodeHealthView,
} from '../views';
import { ClaudeAssistant } from '../components/claude';
import { DetailPanel } from '../components/detail';
import { CommandPalette } from '../components/command';
import { SmartSearch } from '../components/search';
import { NotificationsCenter, ToastNotifications } from '../components/notifications';
import { PresenceIndicator } from '../components/collaboration';
import { QuickActionsBar } from '../components/actions';
import { AISpotlight } from '../components/ai';
import { useKeyboardShortcuts } from '../hooks';
import type { Organization, Team, Project, Slice, Intent, ContextDoc, Artifact } from '../data/enterprise-data';

interface WorkspaceLayoutProps {
  organization: Organization;
  teams: Team[];
  projects: Project[];
  currentUser: { name: string; avatar: string };
  onSliceStatusChange?: (sliceId: string, newStatus: Slice['status']) => void;
  onCreateProject?: () => void;
  onCreateSlice?: (status?: Slice['status']) => void;
  onSaveItem?: (item: Project | Intent | Slice | ContextDoc | Artifact) => void;
  onDeleteItem?: (id: string) => void;
}

export function WorkspaceLayout({
  organization,
  teams,
  projects,
  currentUser,
  onSliceStatusChange,
  onCreateProject,
  onCreateSlice,
  onSaveItem,
  onDeleteItem,
}: WorkspaceLayoutProps) {
  const {
    currentView,
    setCurrentView,
    currentProject,
    currentSpace,
    setCurrentProject,
    projectSlices,
    projectIntents,
    projectContext,
    projectArtifacts,
    detailPanelOpen,
    detailType,
    detailItem,
    darkMode,
    openDetail,
    closeDetail,
    toggleDarkMode,
    assistantPanelOpen,
    openAssistant,
    closeAssistant,
  } = useWorkspace();

  // Claude panel synced with context - always visible by default
  const [claudeExpanded, setClaudeExpanded] = useState(true);

  // Sync local state with context state (bidirectional)
  useEffect(() => {
    if (assistantPanelOpen && !claudeExpanded) {
      setClaudeExpanded(true);
    } else if (!assistantPanelOpen && claudeExpanded) {
      setClaudeExpanded(false);
    }
  }, [assistantPanelOpen]); // Only react to context changes
  const [_selectedSlice, setSelectedSlice] = useState<Slice | null>(null);
  const [selectedSlices, setSelectedSlices] = useState<Slice[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [smartSearchOpen, setSmartSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  // Global keyboard shortcut for AI Spotlight (⌘+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSpotlightOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: useCallback(() => setCommandPaletteOpen(true), []),
    onNewSlice: useCallback(() => onCreateSlice?.(), [onCreateSlice]),
    onToggleDarkMode: toggleDarkMode,
    onToggleClaude: useCallback(() => setClaudeExpanded(e => !e), []),
    onEscape: useCallback(() => {
      if (smartSearchOpen) {
        setSmartSearchOpen(false);
      } else if (commandPaletteOpen) {
        setCommandPaletteOpen(false);
      } else if (notificationsOpen) {
        setNotificationsOpen(false);
      } else if (selectedSlices.length > 0) {
        setSelectedSlices([]);
      } else if (detailPanelOpen) {
        closeDetail();
      }
    }, [smartSearchOpen, commandPaletteOpen, notificationsOpen, selectedSlices, detailPanelOpen, closeDetail]),
    onViewBoard: useCallback(() => setCurrentView('board'), [setCurrentView]),
    onViewList: useCallback(() => setCurrentView('list'), [setCurrentView]),
    onViewTimeline: useCallback(() => setCurrentView('timeline'), [setCurrentView]),
    onViewCanvas: useCallback(() => setCurrentView('canvas'), [setCurrentView]),
    onViewGallery: useCallback(() => setCurrentView('gallery'), [setCurrentView]),
    onViewDocument: useCallback(() => setCurrentView('document'), [setCurrentView]),
  });

  const handleSliceClick = (slice: Slice) => {
    setSelectedSlice(slice);
    openDetail('slice', slice);
  };

  const handleSelectIntent = (intent: Intent) => {
    openDetail('intent', intent);
  };

  const handleSelectContext = (doc: ContextDoc) => {
    openDetail('context', doc);
  };

  const handleSelectArtifact = (artifact: Artifact) => {
    openDetail('artifact', artifact);
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project.id);
  };

  const renderMainContent = () => {
    if (!currentProject) {
      return (
        <div className="flex-1 flex items-center justify-center bg-claude-neutral-900">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-claude-neutral-300 mb-2">
              Welcome to Claude Context
            </h2>
            <p className="text-claude-neutral-500 mb-4">
              Select a project from the sidebar to get started. Claude will help you
              understand the connections between your work, documentation, and code.
            </p>
            <p className="text-sm text-claude-neutral-600">
              Press <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded text-claude-neutral-400">⌘K</kbd> for quick actions
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <LivingSoftwareView />;
      case 'board':
        return (
          <BoardView
            slices={projectSlices}
            intents={projectIntents}
            onSliceClick={handleSliceClick}
            onSliceStatusChange={onSliceStatusChange}
            onCreateSlice={status => onCreateSlice?.(status)}
          />
        );
      case 'list':
        return (
          <ListView
            slices={projectSlices}
            intents={projectIntents}
            onSliceClick={handleSliceClick}
          />
        );
      case 'timeline':
        return (
          <TimelineView
            slices={projectSlices}
            intents={projectIntents}
            onSliceClick={handleSliceClick}
          />
        );
      case 'canvas':
        return (
          <CanvasView
            intents={projectIntents}
            slices={projectSlices}
            context={projectContext}
            onIntentClick={handleSelectIntent}
            onSliceClick={handleSliceClick}
            onContextClick={handleSelectContext}
          />
        );
      case 'gallery':
        return (
          <GalleryView
            artifacts={projectArtifacts}
            onArtifactClick={handleSelectArtifact}
          />
        );
      case 'document':
        return (
          <DocumentView
            context={projectContext}
            intents={projectIntents}
            onContextClick={handleSelectContext}
            onSaveContext={doc => onSaveItem?.(doc)}
          />
        );
      case 'intents':
        return <IntentCanvasView />;
      case 'signals':
        return <SignalDashboardView />;
      case 'capabilities':
        return <CapabilityMapView />;
      case 'experiments':
        return <ExperimentLabView />;
      case 'customer-intelligence':
        return <CustomerIntelligenceView />;
      case 'customers':
        return <CustomersView tenantId="demo-tenant" />;
      case 'feedback':
        return <FeedbackView tenantId="demo-tenant" />;
      case 'roadmap':
        return <RoadmapView tenantId="demo-tenant" />;
      case 'sales':
        return <SalesView tenantId="demo-tenant" />;
      case 'outcomes':
        return <OutcomesView tenantId="demo-tenant" />;
      case 'solutions':
        return <SolutionsView tenantId="demo-tenant" />;
      case 'releases':
        return <ReleasesView tenantId="demo-tenant" />;
      case 'automation':
        return <AutomationView tenantId="demo-tenant" />;
      // Code Intelligence Views
      case 'repositories':
        return <RepositoriesView />;
      case 'file-explorer':
        return <FileExplorerView />;
      case 'symbol-search':
        return <SymbolSearchView />;
      case 'call-graph':
        return <CallGraphView />;
      case 'hotspots':
        return <HotspotsView />;
      case 'code-health':
        return <CodeHealthView />;
      default:
        return null;
    }
  };

  // Get all items for command palette search
  // Use current project's items for now (projectSlices, etc. come from context)
  const allSlices = projectSlices;
  const allIntents = projects.flatMap(p => p.intents || []);
  const allContext = projects.flatMap(p => p.context || []);
  const allArtifacts = projects.flatMap(p => p.artifacts || []);

  return (
    <div className={clsx('flex h-screen', darkMode ? 'dark' : '')}>
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        projects={projects}
        slices={allSlices}
        intents={allIntents}
        context={allContext}
        artifacts={allArtifacts}
        onCreateSlice={onCreateSlice}
        onCreateProject={onCreateProject}
        onSelectProject={handleSelectProject}
        onSelectSlice={handleSliceClick}
        onSelectIntent={handleSelectIntent}
        onSelectContext={handleSelectContext}
        onSelectArtifact={handleSelectArtifact}
      />

      {/* Smart Search */}
      <SmartSearch
        isOpen={smartSearchOpen}
        onClose={() => setSmartSearchOpen(false)}
        slices={allSlices}
        intents={allIntents}
        artifacts={allArtifacts}
        contextDocs={allContext}
        onSliceClick={handleSliceClick}
        onIntentClick={handleSelectIntent}
        onArtifactClick={handleSelectArtifact}
        onDocClick={handleSelectContext}
      />

      {/* Notifications Center */}
      <NotificationsCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Quick Actions Bar (for bulk selections) */}
      <QuickActionsBar
        selectedSlices={selectedSlices}
        onStatusChange={(ids, status) => {
          ids.forEach(id => onSliceStatusChange?.(id, status));
          setSelectedSlices([]);
        }}
        onDelete={ids => {
          ids.forEach(id => onDeleteItem?.(id));
          setSelectedSlices([]);
        }}
        onClearSelection={() => setSelectedSlices([])}
      />

      {/* Left Sidebar - Workspace Navigation */}
      <WorkspaceNav
        organization={organization}
        teams={teams}
        projects={projects}
        onCreateProject={onCreateProject}
      />

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-claude-neutral-900">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-2 bg-claude-neutral-900 border-b border-claude-neutral-800">
          {/* View Tabs */}
          <div className="flex-1">
            {currentProject && (
              <ViewTabs
                projectName={currentProject.name}
                spaceName={currentSpace?.name}
              />
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Smart Search Button */}
            <button
              onClick={() => setSmartSearchOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
              title="Smart Search"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs">Search</span>
            </button>

            {/* Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
              title="Command Palette (⌘K)"
            >
              <Command className="w-4 h-4" />
              <kbd className="text-xs text-claude-neutral-500">⌘K</kbd>
            </button>

            <div className="w-px h-6 bg-claude-neutral-700 mx-1" />

            {/* Presence Indicator */}
            <PresenceIndicator />

            <div className="w-px h-6 bg-claude-neutral-700 mx-1" />

            {/* Toggle Claude Panel */}
            <button
              onClick={() => {
                const newExpanded = !claudeExpanded;
                setClaudeExpanded(newExpanded);
                if (newExpanded) {
                  openAssistant('chat');
                } else {
                  closeAssistant();
                }
              }}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                claudeExpanded
                  ? 'bg-claude-primary-500/20 text-claude-primary-400'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
              )}
              title={claudeExpanded ? 'Collapse Claude (⌘J)' : 'Expand Claude (⌘J)'}
            >
              {claudeExpanded ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </button>

            <div className="w-px h-6 bg-claude-neutral-700 mx-1" />

            {/* Notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="p-2 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-claude-primary-500 rounded-full" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors"
              title={darkMode ? 'Light Mode (⌘D)' : 'Dark Mode (⌘D)'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Settings */}
            <button className="p-2 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
            </button>

            {/* User Avatar */}
            <div className="ml-2 w-8 h-8 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center text-white text-xs font-medium">
              {currentUser.avatar}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex overflow-hidden">
          {/* Primary Work Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderMainContent()}
          </div>

          {/* Detail Panel (slides in when item selected) */}
          {detailPanelOpen && detailType && detailItem && (
            <div className="w-96 border-l border-claude-neutral-800 overflow-hidden flex-shrink-0">
              <DetailPanel
                key={`${detailType}-${detailItem.id}`}
                type={detailType}
                item={detailItem}
                onClose={closeDetail}
                onSave={onSaveItem || (() => {})}
                onDelete={onDeleteItem || (() => {})}
              />
            </div>
          )}
        </main>

        {/* Context Bar (bottom) */}
        <ContextBar />
      </div>

      {/* Claude Panel - Always Present */}
      {claudeExpanded && (
        <div className="w-96 flex-shrink-0 border-l border-claude-neutral-800">
          <ClaudeAssistant />
        </div>
      )}

      {/* Collapsed Claude Indicator */}
      {!claudeExpanded && (
        <button
          onClick={() => {
            setClaudeExpanded(true);
            openAssistant('chat');
          }}
          className="w-12 flex-shrink-0 bg-gradient-to-b from-claude-primary-600 to-claude-primary-700 flex items-center justify-center hover:from-claude-primary-500 hover:to-claude-primary-600 transition-colors"
          title="Expand Claude (⌘J)"
        >
          <div className="transform -rotate-90 text-white text-xs font-medium tracking-wider whitespace-nowrap">
            CLAUDE
          </div>
        </button>
      )}

      {/* Proactive Toast Notifications */}
      <ToastNotifications />

      {/* AI Spotlight (⌘+/) */}
      <AISpotlight
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
      />
    </div>
  );
}
