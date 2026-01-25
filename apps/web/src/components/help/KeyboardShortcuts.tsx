/**
 * KeyboardShortcuts - Help dialog showing all keyboard shortcuts
 */

import { X, Keyboard } from 'lucide-react';
import { formatShortcut, SHORTCUTS } from '../../hooks';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { label: string; shortcut: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { label: 'Command Palette', shortcut: SHORTCUTS.commandPalette },
      { label: 'New Slice', shortcut: SHORTCUTS.newSlice },
      { label: 'Search', shortcut: SHORTCUTS.search },
      { label: 'Save', shortcut: SHORTCUTS.save },
      { label: 'Toggle Dark Mode', shortcut: SHORTCUTS.toggleDarkMode },
      { label: 'Toggle Claude Panel', shortcut: SHORTCUTS.toggleClaude },
    ],
  },
  {
    title: 'Views',
    shortcuts: [
      { label: 'Board View', shortcut: SHORTCUTS.viewBoard },
      { label: 'List View', shortcut: SHORTCUTS.viewList },
      { label: 'Timeline View', shortcut: SHORTCUTS.viewTimeline },
      { label: 'Canvas View', shortcut: SHORTCUTS.viewCanvas },
      { label: 'Gallery View', shortcut: SHORTCUTS.viewGallery },
      { label: 'Document View', shortcut: SHORTCUTS.viewDocument },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { label: 'Move Up', shortcut: SHORTCUTS.navigateUp },
      { label: 'Move Down', shortcut: SHORTCUTS.navigateDown },
      { label: 'Move Left', shortcut: SHORTCUTS.navigateLeft },
      { label: 'Move Right', shortcut: SHORTCUTS.navigateRight },
      { label: 'Select / Open', shortcut: SHORTCUTS.select },
      { label: 'Close / Cancel', shortcut: SHORTCUTS.escape },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { label: 'Undo', shortcut: SHORTCUTS.undo },
      { label: 'Redo', shortcut: SHORTCUTS.redo },
      { label: 'Delete', shortcut: SHORTCUTS.delete },
    ],
  },
];

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-2xl bg-claude-neutral-900 rounded-xl shadow-2xl border border-claude-neutral-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-claude-primary-500/20 rounded-lg">
              <Keyboard className="w-5 h-5 text-claude-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-claude-neutral-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            {shortcutGroups.map(group => (
              <div key={group.title}>
                <h3 className="text-sm font-medium text-claude-neutral-400 mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map(({ label, shortcut }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-claude-neutral-300">
                        {label}
                      </span>
                      <kbd className="px-2 py-1 bg-claude-neutral-800 text-claude-neutral-400 text-xs rounded border border-claude-neutral-700 font-mono">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
          <p className="text-xs text-claude-neutral-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
