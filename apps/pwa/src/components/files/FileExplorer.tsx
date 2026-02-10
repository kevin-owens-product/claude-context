import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText,
  File as FileIcon,
  FolderClosed,
  FolderOpen,
  Search,
} from 'lucide-react';
import { useApp, useFiles } from '../../store/AppContext';
import type { FileNode, OpenFile } from '../../types';

function getFileIcon(name: string, language?: string) {
  if (language) {
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
        return <FileCode size={14} className="text-blue-400" />;
      case 'javascript':
      case 'javascriptreact':
        return <FileCode size={14} className="text-yellow-400" />;
      case 'json':
        return <FileJson size={14} className="text-amber-400" />;
      case 'css':
      case 'scss':
        return <FileCode size={14} className="text-pink-400" />;
      case 'markdown':
        return <FileText size={14} className="text-text-secondary" />;
    }
  }

  // Guess from extension
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode size={14} className="text-blue-400" />;
    case 'js':
    case 'jsx':
      return <FileCode size={14} className="text-yellow-400" />;
    case 'json':
      return <FileJson size={14} className="text-amber-400" />;
    case 'css':
    case 'scss':
      return <FileCode size={14} className="text-pink-400" />;
    case 'md':
      return <FileText size={14} className="text-text-secondary" />;
    default:
      return <FileIcon size={14} className="text-text-muted" />;
  }
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activeFileId: string | null;
  onFileClick: (node: FileNode) => void;
}

function TreeNode({ node, depth, activeFileId, onFileClick }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node);
    }
  }, [node, isExpanded, onFileClick]);

  const isActive = node.id === activeFileId;

  return (
    <>
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 cursor-pointer rounded-md transition-colors select-none',
          'hover:bg-surface-1',
          isActive && 'bg-indigo-500/10 text-indigo-300'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={node.type === 'directory' ? isExpanded : undefined}
        aria-selected={isActive}
      >
        {node.type === 'directory' ? (
          <>
            <span className="text-text-muted flex-shrink-0">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span className="flex-shrink-0">
              {isExpanded ? (
                <FolderOpen size={14} className="text-indigo-400" />
              ) : (
                <FolderClosed size={14} className="text-indigo-400" />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="w-[14px] flex-shrink-0" />
            {getFileIcon(node.name, node.language)}
          </>
        )}
        <span
          className={clsx(
            'text-xs truncate',
            isActive ? 'text-indigo-300 font-medium' : 'text-text-secondary'
          )}
        >
          {node.name}
        </span>
      </div>

      {node.type === 'directory' && isExpanded && node.children && (
        <div role="group">
          {/* Sort: directories first, then files */}
          {[...node.children]
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'directory' ? -1 : 1;
            })
            .map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onFileClick={onFileClick}
              />
            ))}
        </div>
      )}
    </>
  );
}

export function FileExplorer() {
  const { state } = useApp();
  const { openFile } = useFiles();
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileClick = useCallback(
    (node: FileNode) => {
      if (node.type === 'file') {
        // Find file content from tree
        const fileContent = node.content || `// ${node.name}\n`;
        const file: OpenFile = {
          id: node.id,
          path: node.path,
          name: node.name,
          content: fileContent,
          language: node.language || 'plaintext',
          isModified: false,
        };
        openFile(file);
      }
    },
    [openFile]
  );

  const filterTree = useCallback(
    (nodes: FileNode[], query: string): FileNode[] => {
      if (!query) return nodes;

      return nodes.reduce<FileNode[]>((acc, node) => {
        if (node.type === 'file') {
          if (node.name.toLowerCase().includes(query.toLowerCase())) {
            acc.push(node);
          }
        } else if (node.children) {
          const filtered = filterTree(node.children, query);
          if (filtered.length > 0) {
            acc.push({ ...node, children: filtered });
          }
        }
        return acc;
      }, []);
    },
    []
  );

  const displayTree = searchQuery
    ? filterTree(state.files.tree, searchQuery)
    : state.files.tree;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-surface-0 border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto pb-2" role="tree" aria-label="File explorer">
        {displayTree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            activeFileId={state.files.activeFileId}
            onFileClick={handleFileClick}
          />
        ))}
        {displayTree.length === 0 && searchQuery && (
          <p className="px-3 py-4 text-xs text-text-muted text-center">
            No files matching "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
}
