/**
 * useKeyboardShortcuts - Global keyboard shortcuts
 * Provides consistent keyboard navigation throughout the app
 */

import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onCommandPalette?: () => void;
  onNewSlice?: () => void;
  onSearch?: () => void;
  onToggleDarkMode?: () => void;
  onToggleClaude?: () => void;
  onEscape?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onEnter?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onViewBoard?: () => void;
  onViewList?: () => void;
  onViewTimeline?: () => void;
  onViewCanvas?: () => void;
  onViewGallery?: () => void;
  onViewDocument?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Meta key (Cmd on Mac, Ctrl on Windows)
      const isMeta = event.metaKey || event.ctrlKey;

      // Command Palette - Cmd+K (always works, even in inputs)
      if (isMeta && event.key === 'k') {
        event.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }

      // Escape - close modals, deselect (works in inputs to blur)
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // Skip other shortcuts if in input
      if (isInput) return;

      // New Slice - Cmd+N
      if (isMeta && event.key === 'n') {
        event.preventDefault();
        handlers.onNewSlice?.();
        return;
      }

      // Search - Cmd+F or /
      if ((isMeta && event.key === 'f') || event.key === '/') {
        event.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // Toggle Dark Mode - Cmd+D
      if (isMeta && event.key === 'd') {
        event.preventDefault();
        handlers.onToggleDarkMode?.();
        return;
      }

      // Toggle Claude - Cmd+J
      if (isMeta && event.key === 'j') {
        event.preventDefault();
        handlers.onToggleClaude?.();
        return;
      }

      // Undo - Cmd+Z
      if (isMeta && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handlers.onUndo?.();
        return;
      }

      // Redo - Cmd+Shift+Z
      if (isMeta && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handlers.onRedo?.();
        return;
      }

      // Save - Cmd+S
      if (isMeta && event.key === 's') {
        event.preventDefault();
        handlers.onSave?.();
        return;
      }

      // View shortcuts - Cmd+1-6
      if (isMeta && event.key >= '1' && event.key <= '6') {
        event.preventDefault();
        switch (event.key) {
          case '1':
            handlers.onViewBoard?.();
            break;
          case '2':
            handlers.onViewList?.();
            break;
          case '3':
            handlers.onViewTimeline?.();
            break;
          case '4':
            handlers.onViewCanvas?.();
            break;
          case '5':
            handlers.onViewGallery?.();
            break;
          case '6':
            handlers.onViewDocument?.();
            break;
        }
        return;
      }

      // Navigation with arrow keys
      switch (event.key) {
        case 'ArrowUp':
        case 'k': // Vim-style
          handlers.onNavigateUp?.();
          break;
        case 'ArrowDown':
        case 'j': // Vim-style
          handlers.onNavigateDown?.();
          break;
        case 'ArrowLeft':
        case 'h': // Vim-style
          handlers.onNavigateLeft?.();
          break;
        case 'ArrowRight':
        case 'l': // Vim-style (only if not Cmd+L)
          if (!isMeta) handlers.onNavigateRight?.();
          break;
        case 'Enter':
          handlers.onEnter?.();
          break;
        case 'Delete':
        case 'Backspace':
          handlers.onDelete?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcut display helper
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  return shortcut
    .replace('Cmd', isMac ? '⌘' : 'Ctrl')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Shift', '⇧')
    .replace('Enter', '↵')
    .replace('Escape', 'Esc')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→');
}

// Common shortcuts reference
export const SHORTCUTS = {
  commandPalette: 'Cmd+K',
  newSlice: 'Cmd+N',
  search: 'Cmd+F',
  toggleDarkMode: 'Cmd+D',
  toggleClaude: 'Cmd+J',
  undo: 'Cmd+Z',
  redo: 'Cmd+Shift+Z',
  save: 'Cmd+S',
  viewBoard: 'Cmd+1',
  viewList: 'Cmd+2',
  viewTimeline: 'Cmd+3',
  viewCanvas: 'Cmd+4',
  viewGallery: 'Cmd+5',
  viewDocument: 'Cmd+6',
  navigateUp: '↑ or K',
  navigateDown: '↓ or J',
  navigateLeft: '← or H',
  navigateRight: '→ or L',
  select: 'Enter',
  delete: 'Delete',
  escape: 'Escape',
} as const;
