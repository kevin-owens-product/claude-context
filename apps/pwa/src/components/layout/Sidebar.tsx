import React from 'react';
import clsx from 'clsx';
import {
  Code2,
  Home,
  Settings,
  PanelLeftClose,
  FolderTree,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  fileExplorerSlot: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  page?: string;
  action?: () => void;
}

export function Sidebar({ onNavigate, currentPage, fileExplorerSlot }: SidebarProps) {
  const { state, actions } = useApp();
  const { panels } = state;

  const navItems: NavItem[] = [
    {
      id: 'editor',
      label: 'Editor',
      icon: <Code2 size={18} />,
      page: 'editor',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <Home size={18} />,
      page: 'projects',
    },
    {
      id: 'ai',
      label: 'AI Panel',
      icon: <Sparkles size={18} />,
      action: actions.toggleAiPanel,
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: <Terminal size={18} />,
      action: actions.toggleTerminal,
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FolderTree size={18} />,
      action: actions.toggleFileExplorer,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={18} />,
      page: 'settings',
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.page) return currentPage === item.page;
    if (item.id === 'ai') return panels.aiPanelOpen;
    if (item.id === 'terminal') return panels.terminalOpen;
    if (item.id === 'files') return panels.fileExplorerOpen;
    return false;
  };

  return (
    <div className="w-[260px] bg-surface-1 border-r border-border flex flex-col flex-shrink-0 h-full">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-text-primary">
            Claude Context
          </span>
        </div>
        <button
          onClick={actions.toggleSidebar}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          aria-label="Close sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.page) onNavigate(item.page);
              if (item.action) item.action();
            }}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
              'hover:bg-surface-2',
              isActive(item)
                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                : 'text-text-secondary'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'ai' && panels.aiPanelOpen && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
            )}
            {item.id === 'terminal' && panels.terminalOpen && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </nav>

      {/* File explorer */}
      {panels.fileExplorerOpen && (
        <div className="flex-1 border-t border-border overflow-y-auto mt-2">
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Explorer
            </h3>
          </div>
          {fileExplorerSlot}
        </div>
      )}

      {/* Project info at bottom */}
      <div className="mt-auto px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-text-muted truncate">
            {state.currentProject?.name || 'No project'}
          </span>
        </div>
        {state.auth.user && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              {state.auth.user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-text-secondary truncate">
              {state.auth.user.email}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
