/**
 * CommandPalette - Cmd+K quick actions
 * Global command interface for power users
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Plus,
  FileText,
  Layers,
  Target,
  Moon,
  Sun,
  LayoutGrid,
  List,
  Calendar,
  Sparkles,
  FolderOpen,
  ArrowRight,
  Command,
  Hash,
} from 'lucide-react';
import { useWorkspace } from '../../contexts';
import type { Project, Slice, Intent, ContextDoc, Artifact } from '../../data/enterprise-data';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  slices: Slice[];
  intents: Intent[];
  context: ContextDoc[];
  artifacts: Artifact[];
  onCreateSlice?: () => void;
  onCreateProject?: () => void;
  onSelectProject?: (project: Project) => void;
  onSelectSlice?: (slice: Slice) => void;
  onSelectIntent?: (intent: Intent) => void;
  onSelectContext?: (doc: ContextDoc) => void;
  onSelectArtifact?: (artifact: Artifact) => void;
}

type CommandCategory = 'actions' | 'navigation' | 'create' | 'search';

interface CommandItem {
  id: string;
  category: CommandCategory;
  icon: typeof Search;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette({
  isOpen,
  onClose,
  projects,
  slices,
  intents,
  context,
  artifacts,
  onCreateSlice,
  onCreateProject,
  onSelectProject,
  onSelectSlice,
  onSelectIntent,
  onSelectContext,
  onSelectArtifact,
}: CommandPaletteProps) {
  const {
    setCurrentView,
    currentView,
    toggleDarkMode,
    darkMode,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command list
  const allCommands = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [];

    // Actions
    commands.push(
      {
        id: 'toggle-dark-mode',
        category: 'actions',
        icon: darkMode ? Sun : Moon,
        label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        shortcut: '⌘D',
        action: () => {
          toggleDarkMode();
          onClose();
        },
        keywords: ['theme', 'light', 'dark', 'mode'],
      },
      {
        id: 'ask-claude',
        category: 'actions',
        icon: Sparkles,
        label: 'Ask Claude',
        description: 'Get help from Claude AI',
        shortcut: '⌘J',
        action: () => {
          // Open Claude panel
          onClose();
        },
        keywords: ['ai', 'help', 'assistant', 'chat'],
      }
    );

    // Create commands
    commands.push(
      {
        id: 'create-slice',
        category: 'create',
        icon: Plus,
        label: 'Create New Slice',
        description: 'Add a new work item',
        shortcut: '⌘N',
        action: () => {
          onCreateSlice?.();
          onClose();
        },
        keywords: ['new', 'task', 'ticket', 'issue'],
      },
      {
        id: 'create-project',
        category: 'create',
        icon: FolderOpen,
        label: 'Create New Project',
        description: 'Start a new project',
        action: () => {
          onCreateProject?.();
          onClose();
        },
        keywords: ['new', 'workspace'],
      },
      {
        id: 'create-document',
        category: 'create',
        icon: FileText,
        label: 'Create New Document',
        description: 'Add documentation',
        action: () => {
          onClose();
        },
        keywords: ['new', 'doc', 'write'],
      },
      {
        id: 'create-intent',
        category: 'create',
        icon: Target,
        label: 'Create New Intent',
        description: 'Define a goal, constraint, or behavior',
        action: () => {
          onClose();
        },
        keywords: ['new', 'goal', 'constraint'],
      }
    );

    // Navigation - Views
    const views = [
      { id: 'board', icon: LayoutGrid, label: 'Board View', keywords: ['kanban'] },
      { id: 'list', icon: List, label: 'List View', keywords: ['table'] },
      { id: 'timeline', icon: Calendar, label: 'Timeline View', keywords: ['gantt', 'roadmap'] },
      { id: 'canvas', icon: Sparkles, label: 'Canvas View', keywords: ['graph', 'intent'] },
      { id: 'gallery', icon: Layers, label: 'Gallery View', keywords: ['artifacts', 'files'] },
      { id: 'document', icon: FileText, label: 'Document View', keywords: ['docs', 'wiki'] },
    ];

    views.forEach(view => {
      commands.push({
        id: `view-${view.id}`,
        category: 'navigation',
        icon: view.icon,
        label: `Go to ${view.label}`,
        description: currentView === view.id ? 'Current view' : undefined,
        action: () => {
          setCurrentView(view.id as typeof currentView);
          onClose();
        },
        keywords: ['go', 'switch', 'view', ...view.keywords],
      });
    });

    // Search results - Projects
    projects.forEach(project => {
      commands.push({
        id: `project-${project.id}`,
        category: 'search',
        icon: FolderOpen,
        label: project.name,
        description: 'Project',
        action: () => {
          onSelectProject?.(project);
          onClose();
        },
        keywords: ['project', project.name.toLowerCase()],
      });
    });

    // Search results - Slices
    slices.slice(0, 20).forEach(slice => {
      commands.push({
        id: `slice-${slice.id}`,
        category: 'search',
        icon: Hash,
        label: `${slice.shortId}: ${slice.name}`,
        description: `Slice • ${slice.status}`,
        action: () => {
          onSelectSlice?.(slice);
          onClose();
        },
        keywords: ['slice', 'task', slice.shortId.toLowerCase(), slice.name.toLowerCase()],
      });
    });

    // Search results - Intents
    intents.forEach(intent => {
      commands.push({
        id: `intent-${intent.id}`,
        category: 'search',
        icon: Target,
        label: intent.name,
        description: `Intent • ${intent.type}`,
        action: () => {
          onSelectIntent?.(intent);
          onClose();
        },
        keywords: ['intent', 'goal', intent.name.toLowerCase()],
      });
    });

    // Search results - Context Docs
    context.slice(0, 10).forEach(doc => {
      commands.push({
        id: `context-${doc.id}`,
        category: 'search',
        icon: FileText,
        label: doc.name,
        description: `Document • ${doc.type}`,
        action: () => {
          onSelectContext?.(doc);
          onClose();
        },
        keywords: ['doc', 'document', doc.name.toLowerCase()],
      });
    });

    // Search results - Artifacts
    artifacts.slice(0, 10).forEach(artifact => {
      commands.push({
        id: `artifact-${artifact.id}`,
        category: 'search',
        icon: Layers,
        label: artifact.name,
        description: `Artifact • ${artifact.type}`,
        action: () => {
          onSelectArtifact?.(artifact);
          onClose();
        },
        keywords: ['artifact', artifact.name.toLowerCase()],
      });
    });

    return commands;
  }, [
    darkMode,
    currentView,
    projects,
    slices,
    intents,
    context,
    artifacts,
    toggleDarkMode,
    setCurrentView,
    onClose,
    onCreateSlice,
    onCreateProject,
    onSelectProject,
    onSelectSlice,
    onSelectIntent,
    onSelectContext,
    onSelectArtifact,
  ]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show actions, create, navigation when no query
      return allCommands.filter(
        cmd =>
          cmd.category === 'actions' ||
          cmd.category === 'create' ||
          cmd.category === 'navigation'
      );
    }

    const q = query.toLowerCase();
    return allCommands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some(k => k.includes(q))
    );
  }, [query, allCommands]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, CommandItem[]> = {
      actions: [],
      create: [],
      navigation: [],
      search: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const categoryLabels: Record<CommandCategory, string> = {
    actions: 'Actions',
    create: 'Create',
    navigation: 'Navigation',
    search: 'Search Results',
  };

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-2xl bg-claude-neutral-900 rounded-xl shadow-2xl border border-claude-neutral-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-claude-neutral-800">
          <Search className="w-5 h-5 text-claude-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-claude-neutral-100 placeholder-claude-neutral-500 text-base outline-none"
          />
          <kbd className="px-2 py-0.5 bg-claude-neutral-800 text-claude-neutral-500 text-xs rounded border border-claude-neutral-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-auto">
          {(['actions', 'create', 'navigation', 'search'] as CommandCategory[]).map(
            category => {
              const items = groupedCommands[category];
              if (items.length === 0) return null;

              return (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-medium text-claude-neutral-500 uppercase tracking-wider bg-claude-neutral-850">
                    {categoryLabels[category]}
                  </div>
                  {items.map(item => {
                    const index = globalIndex++;
                    const isSelected = index === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={item.action}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-claude-primary-500/20 text-claude-primary-400'
                            : 'text-claude-neutral-300 hover:bg-claude-neutral-800'
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-claude-neutral-500 truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 text-claude-neutral-500 text-xs rounded border border-claude-neutral-700">
                            {item.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="w-4 h-4 text-claude-neutral-600" />
                      </button>
                    );
                  })}
                </div>
              );
            }
          )}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-claude-neutral-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-claude-neutral-800 text-xs text-claude-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-claude-neutral-800 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-claude-neutral-800 rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-claude-neutral-800 rounded">esc</kbd> Close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
