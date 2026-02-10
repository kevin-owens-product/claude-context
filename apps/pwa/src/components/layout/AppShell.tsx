import React, { useEffect } from 'react';
import clsx from 'clsx';
import {
  PanelLeftOpen,
  Terminal as TerminalIcon,
  FolderTree,
  Code2,
  Bot,
  Settings,
  Home,
} from 'lucide-react';
import { useBreakpoint } from '../../hooks/useMediaQuery';
import { useFoldableDetection } from '../../hooks/useWindowSize';
import { useApp } from '../../store/AppContext';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  editorSlot: React.ReactNode;
  aiPanelSlot: React.ReactNode;
  terminalSlot: React.ReactNode;
  fileExplorerSlot: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function AppShell({
  editorSlot,
  aiPanelSlot,
  terminalSlot,
  fileExplorerSlot,
  currentPage,
  onNavigate,
}: AppShellProps) {
  const { state, dispatch, actions } = useApp();
  const { panels } = state;
  const { deviceType, isPhone, isDesktop } = useBreakpoint();
  const { isFoldable } = useFoldableDetection();

  // Sync device type to state
  useEffect(() => {
    dispatch({ type: 'SET_DEVICE_TYPE', payload: deviceType });
  }, [deviceType, dispatch]);

  // Auto-adjust panels based on device
  useEffect(() => {
    if (isPhone) {
      dispatch({
        type: 'SET_PANELS',
        payload: { sidebarOpen: false, fileExplorerOpen: false },
      });
    } else if (isDesktop) {
      dispatch({
        type: 'SET_PANELS',
        payload: { sidebarOpen: true },
      });
    }
  }, [isPhone, isDesktop, dispatch]);

  // Phone layout: single column with bottom nav
  if (isPhone) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-surface-1 border-b border-border safe-area-inset-top">
          <button
            onClick={actions.toggleFileExplorer}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary touch-target"
            aria-label="Toggle file explorer"
          >
            <FolderTree size={20} />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">
            Claude Context
          </h1>
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary touch-target"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Mobile file explorer overlay */}
        {panels.fileExplorerOpen && (
          <div className="absolute inset-0 z-40 flex">
            <div className="w-72 bg-surface-1 border-r border-border h-full animate-slide-in-left overflow-y-auto">
              {fileExplorerSlot}
            </div>
            <div
              className="flex-1 bg-black/50"
              onClick={actions.toggleFileExplorer}
            />
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-hidden relative">
          {currentPage === 'editor' && !panels.aiPanelOpen && (
            <div className="h-full">{editorSlot}</div>
          )}
          {currentPage === 'editor' && panels.aiPanelOpen && (
            <div className="h-full animate-slide-in-right">{aiPanelSlot}</div>
          )}
          {currentPage === 'projects' && (
            <div className="h-full overflow-y-auto p-4">{editorSlot}</div>
          )}
          {currentPage === 'settings' && (
            <div className="h-full overflow-y-auto">{editorSlot}</div>
          )}
        </div>

        {/* Mobile terminal drawer */}
        {panels.terminalOpen && (
          <div className="h-48 border-t border-border bg-surface-0 animate-slide-in-up">
            {terminalSlot}
          </div>
        )}

        {/* Bottom navigation */}
        <nav className="flex items-center justify-around bg-surface-1 border-t border-border safe-area-inset-bottom py-1">
          <button
            onClick={() => {
              onNavigate('editor');
              if (panels.aiPanelOpen) actions.toggleAiPanel();
            }}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg touch-target min-w-[64px]',
              currentPage === 'editor' && !panels.aiPanelOpen
                ? 'text-indigo-400'
                : 'text-text-muted'
            )}
          >
            <Code2 size={20} />
            <span className="text-[10px]">Editor</span>
          </button>
          <button
            onClick={() => {
              onNavigate('editor');
              if (!panels.aiPanelOpen) actions.toggleAiPanel();
            }}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg touch-target min-w-[64px]',
              panels.aiPanelOpen ? 'text-indigo-400' : 'text-text-muted'
            )}
          >
            <Bot size={20} />
            <span className="text-[10px]">AI</span>
          </button>
          <button
            onClick={actions.toggleTerminal}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg touch-target min-w-[64px]',
              panels.terminalOpen ? 'text-indigo-400' : 'text-text-muted'
            )}
          >
            <TerminalIcon size={20} />
            <span className="text-[10px]">Terminal</span>
          </button>
          <button
            onClick={() => onNavigate('projects')}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg touch-target min-w-[64px]',
              currentPage === 'projects' ? 'text-indigo-400' : 'text-text-muted'
            )}
          >
            <Home size={20} />
            <span className="text-[10px]">Projects</span>
          </button>
        </nav>
      </div>
    );
  }

  // Foldable layout: dual-pane spanning the fold
  if (isFoldable) {
    return (
      <div className="flex flex-col h-full w-full">
        <StatusBar onNavigate={onNavigate} currentPage={currentPage} />
        <div className="flex-1 flex fold-aware overflow-hidden">
          <div className="fold-pane-left flex flex-col overflow-hidden">
            {panels.fileExplorerOpen && (
              <div className="h-48 border-b border-border overflow-y-auto">
                {fileExplorerSlot}
              </div>
            )}
            <div className="flex-1 overflow-hidden">{editorSlot}</div>
            {panels.terminalOpen && (
              <div className="h-48 border-t border-border">{terminalSlot}</div>
            )}
          </div>
          <div className="fold-pane-right overflow-hidden">{aiPanelSlot}</div>
        </div>
      </div>
    );
  }

  // Tablet layout: side-by-side editor + AI panel
  if (!isDesktop) {
    return (
      <div className="flex flex-col h-full w-full">
        <StatusBar onNavigate={onNavigate} currentPage={currentPage} />
        <div className="flex-1 flex overflow-hidden">
          {/* Editor pane */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {panels.fileExplorerOpen && (
              <div className="h-48 border-b border-border overflow-y-auto">
                {fileExplorerSlot}
              </div>
            )}
            <div className="flex-1 overflow-hidden">{editorSlot}</div>
            {panels.terminalOpen && (
              <div className="h-48 border-t border-border">{terminalSlot}</div>
            )}
          </div>
          {/* AI panel */}
          {panels.aiPanelOpen && (
            <div className="w-[380px] border-l border-border overflow-hidden flex-shrink-0 animate-slide-in-right">
              {aiPanelSlot}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: full three-column (sidebar + editor + AI panel)
  return (
    <div className="flex flex-col h-full w-full">
      <StatusBar onNavigate={onNavigate} currentPage={currentPage} />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {panels.sidebarOpen && (
          <Sidebar
            onNavigate={onNavigate}
            currentPage={currentPage}
            fileExplorerSlot={fileExplorerSlot}
          />
        )}

        {/* Toggle sidebar button */}
        {!panels.sidebarOpen && (
          <button
            onClick={actions.toggleSidebar}
            className="absolute left-2 top-14 z-30 p-1.5 rounded-lg bg-surface-1 border border-border text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden">{editorSlot}</div>
          {panels.terminalOpen && (
            <div className="h-56 border-t border-border">{terminalSlot}</div>
          )}
        </div>

        {/* AI Panel */}
        {panels.aiPanelOpen && (
          <div className="w-[420px] border-l border-border overflow-hidden flex-shrink-0">
            {aiPanelSlot}
          </div>
        )}
      </div>
    </div>
  );
}
