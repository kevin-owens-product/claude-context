/**
 * Code Surface - Claude Code-like development interface
 */

import { useState } from 'react';
import { Terminal, FolderTree, GitBranch, Play, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface CodeSurfaceProps {
  projectName?: string;
  sliceName?: string;
}

export function CodeSurface({ projectName, sliceName }: CodeSurfaceProps) {
  const [terminalHistory] = useState<string[]>([
    '$ claude',
    '',
    '╭────────────────────────────────────────╮',
    '│           Welcome to Claude Code       │',
    '│      Your AI-powered coding partner    │',
    '╰────────────────────────────────────────╯',
    '',
    `Project: ${projectName || 'Untitled'}`,
    sliceName ? `Task: ${sliceName}` : '',
    'Context: 4 documents loaded',
    'Intents: 4 active goals/constraints',
    '',
    '> What would you like to build today?',
    '',
  ].filter(Boolean));

  const [input, setInput] = useState('');

  return (
    <div className="flex h-full bg-claude-neutral-900">
      {/* File Tree */}
      <div className="w-56 border-r border-claude-neutral-800 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-claude-neutral-800">
          <FolderTree className="w-4 h-4 text-claude-neutral-400" />
          <span className="text-sm text-claude-neutral-300">Files</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-sm">
          <div className="space-y-1">
            <FileTreeItem name="src" isFolder expanded>
              <FileTreeItem name="components" isFolder>
                <FileTreeItem name="App.tsx" />
                <FileTreeItem name="Button.tsx" />
              </FileTreeItem>
              <FileTreeItem name="index.ts" />
            </FileTreeItem>
            <FileTreeItem name="package.json" />
            <FileTreeItem name="README.md" />
          </div>
        </div>
        <div className="p-2 border-t border-claude-neutral-800">
          <div className="flex items-center gap-2 text-xs text-claude-neutral-400">
            <GitBranch className="w-3.5 h-3.5" />
            <span>main</span>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-claude-neutral-800">
          <Terminal className="w-4 h-4 text-claude-neutral-400" />
          <span className="text-sm text-claude-neutral-300">Terminal</span>
          <div className="flex-1" />
          <button className="p-1 hover:bg-claude-neutral-800 rounded">
            <Play className="w-4 h-4 text-green-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          {terminalHistory.map((line, i) => (
            <div key={i} className="text-claude-neutral-300 leading-relaxed">
              {line || '\u00A0'}
            </div>
          ))}
        </div>

        <div className="border-t border-claude-neutral-800 p-4">
          <div className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-claude-primary-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Claude to help with your code..."
              className="flex-1 bg-transparent border-none focus:outline-none text-claude-neutral-100 placeholder-claude-neutral-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTreeItem({
  name,
  isFolder = false,
  expanded = false,
  children,
}: {
  name: string;
  isFolder?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <div>
      <button
        onClick={() => isFolder && setIsExpanded(!isExpanded)}
        className={clsx(
          'w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 transition-colors',
          isFolder && 'cursor-pointer'
        )}
      >
        {isFolder && (
          <ChevronRight
            className={clsx(
              'w-3 h-3 transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        )}
        {!isFolder && <span className="w-3" />}
        <span className={isFolder ? 'text-claude-neutral-300' : ''}>
          {name}
        </span>
      </button>
      {isFolder && isExpanded && (
        <div className="ml-3 border-l border-claude-neutral-800 pl-2">
          {children}
        </div>
      )}
    </div>
  );
}
