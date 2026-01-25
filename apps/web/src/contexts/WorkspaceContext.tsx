/**
 * WorkspaceContext - Global state for the workspace layout
 * Manages selection, panels, views, and pinned context
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type {
  Organization,
  Team,
  Project,
  Slice,
  Intent,
  ContextDoc,
  Artifact,
} from '../data/enterprise-data';

export type ViewType =
  | 'dashboard' | 'board' | 'list' | 'timeline' | 'canvas' | 'gallery' | 'document'
  | 'intents' | 'signals' | 'capabilities' | 'experiments'
  | 'customer-intelligence' | 'customers' | 'feedback' | 'roadmap' | 'sales' | 'outcomes' | 'solutions' | 'releases'
  | 'automation'
  // Code Intelligence Views
  | 'repositories' | 'file-explorer' | 'symbol-search' | 'call-graph' | 'hotspots' | 'code-health';
export type DetailType = 'project' | 'intent' | 'slice' | 'context' | 'artifact' | null;
export type AssistantMode = 'chat' | 'code' | 'review' | 'plan';

export interface PinnedItem {
  id: string;
  type: 'intent' | 'context' | 'artifact';
  name: string;
  subtype?: string;
}

interface WorkspaceState {
  // Selection
  currentSpaceId: string | null;
  currentProjectId: string | null;
  selectedSliceIds: string[];

  // View
  currentView: ViewType;

  // Panels
  detailPanelOpen: boolean;
  detailType: DetailType;
  detailItem: Project | Intent | Slice | ContextDoc | Artifact | null;

  assistantPanelOpen: boolean;
  assistantMode: AssistantMode;

  // Context
  pinnedItems: PinnedItem[];

  // UI
  darkMode: boolean;
}

interface WorkspaceActions {
  // Selection
  setCurrentSpace: (spaceId: string | null) => void;
  setCurrentProject: (projectId: string | null) => void;
  selectSlice: (sliceId: string) => void;
  deselectSlice: (sliceId: string) => void;
  clearSliceSelection: () => void;
  toggleSliceSelection: (sliceId: string) => void;

  // View
  setCurrentView: (view: ViewType) => void;

  // Detail Panel
  openDetail: (type: DetailType, item: Project | Intent | Slice | ContextDoc | Artifact) => void;
  closeDetail: () => void;

  // Assistant Panel
  openAssistant: (mode?: AssistantMode) => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  setAssistantMode: (mode: AssistantMode) => void;

  // Context
  pinItem: (item: PinnedItem) => void;
  unpinItem: (id: string) => void;
  clearPinnedItems: () => void;

  // UI
  toggleDarkMode: () => void;
}

interface WorkspaceContextValue extends WorkspaceState, WorkspaceActions {
  // Computed values from data
  currentSpace: Team | undefined;
  currentProject: Project | undefined;
  selectedSlices: Slice[];
  projectSlices: Slice[];
  projectIntents: Intent[];
  projectContext: ContextDoc[];
  projectArtifacts: Artifact[];
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
  organization: Organization;
  teams: Team[];
  projects: Project[];
  slices: Slice[];
  initialSpaceId?: string;
  initialProjectId?: string;
}

export function WorkspaceProvider({
  children,
  organization,
  teams,
  projects,
  slices,
  initialSpaceId = 'team-platform',
  initialProjectId = 'proj-api-gateway',
}: WorkspaceProviderProps) {
  // State
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(initialSpaceId);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId);
  const [selectedSliceIds, setSelectedSliceIds] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('intents');

  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailType, setDetailType] = useState<DetailType>(null);
  const [detailItem, setDetailItem] = useState<Project | Intent | Slice | ContextDoc | Artifact | null>(null);

  const [assistantPanelOpen, setAssistantPanelOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('chat');

  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [darkMode, setDarkMode] = useState(true);

  // Computed values
  const currentSpace = useMemo(
    () => teams.find(t => t.id === currentSpaceId),
    [teams, currentSpaceId]
  );

  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  const projectSlices = useMemo(
    () => slices.filter(s => s.projectId === currentProjectId),
    [slices, currentProjectId]
  );

  const selectedSlices = useMemo(
    () => slices.filter(s => selectedSliceIds.includes(s.id)),
    [slices, selectedSliceIds]
  );

  const projectIntents = useMemo(() => {
    if (!currentProject) return [];
    const team = teams.find(t => t.id === currentProject.teamId);
    return [
      ...organization.intents,
      ...(team?.intents || []),
      ...currentProject.intents,
    ];
  }, [organization, teams, currentProject]);

  const projectContext = useMemo(() => {
    if (!currentProject) return [];
    const team = teams.find(t => t.id === currentProject.teamId);
    return [
      ...organization.context.map(c => ({ ...c, inheritedFrom: 'org' as const })),
      ...(team?.context || []).map(c => ({ ...c, inheritedFrom: 'team' as const })),
      ...currentProject.context,
    ];
  }, [organization, teams, currentProject]);

  const projectArtifacts = useMemo(
    () => currentProject?.artifacts || [],
    [currentProject]
  );

  // Actions
  const setCurrentSpace = useCallback((spaceId: string | null) => {
    setCurrentSpaceId(spaceId);
    // Clear project selection if switching spaces
    if (spaceId !== currentSpaceId) {
      setCurrentProjectId(null);
      setSelectedSliceIds([]);
    }
  }, [currentSpaceId]);

  const setCurrentProject = useCallback((projectId: string | null) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentSpaceId(project.teamId);
    }
    setCurrentProjectId(projectId);
    setSelectedSliceIds([]);
  }, [projects]);

  const selectSlice = useCallback((sliceId: string) => {
    setSelectedSliceIds(prev =>
      prev.includes(sliceId) ? prev : [...prev, sliceId]
    );
  }, []);

  const deselectSlice = useCallback((sliceId: string) => {
    setSelectedSliceIds(prev => prev.filter(id => id !== sliceId));
  }, []);

  const clearSliceSelection = useCallback(() => {
    setSelectedSliceIds([]);
  }, []);

  const toggleSliceSelection = useCallback((sliceId: string) => {
    setSelectedSliceIds(prev =>
      prev.includes(sliceId)
        ? prev.filter(id => id !== sliceId)
        : [...prev, sliceId]
    );
  }, []);

  const openDetail = useCallback((type: DetailType, item: Project | Intent | Slice | ContextDoc | Artifact) => {
    setDetailType(type);
    setDetailItem(item);
    setDetailPanelOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailPanelOpen(false);
    setDetailType(null);
    setDetailItem(null);
  }, []);

  const openAssistant = useCallback((mode?: AssistantMode) => {
    if (mode) setAssistantMode(mode);
    setAssistantPanelOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setAssistantPanelOpen(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setAssistantPanelOpen(prev => !prev);
  }, []);

  const pinItem = useCallback((item: PinnedItem) => {
    setPinnedItems(prev => {
      if (prev.some(p => p.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const unpinItem = useCallback((id: string) => {
    setPinnedItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearPinnedItems = useCallback(() => {
    setPinnedItems([]);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const value: WorkspaceContextValue = {
    // State
    currentSpaceId,
    currentProjectId,
    selectedSliceIds,
    currentView,
    detailPanelOpen,
    detailType,
    detailItem,
    assistantPanelOpen,
    assistantMode,
    pinnedItems,
    darkMode,

    // Computed
    currentSpace,
    currentProject,
    selectedSlices,
    projectSlices,
    projectIntents,
    projectContext,
    projectArtifacts,

    // Actions
    setCurrentSpace,
    setCurrentProject,
    selectSlice,
    deselectSlice,
    clearSliceSelection,
    toggleSliceSelection,
    setCurrentView,
    openDetail,
    closeDetail,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    setAssistantMode,
    pinItem,
    unpinItem,
    clearPinnedItems,
    toggleDarkMode,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
