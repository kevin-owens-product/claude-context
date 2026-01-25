/**
 * FileTree - Expandable file tree with language icons
 *
 * Displays a hierarchical file structure with expand/collapse,
 * file type icons, and selection support.
 *
 * @prompt-id forge-v4.1:web:component:file-tree:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileCog,
  FileType,
  File,
  TestTube,
} from 'lucide-react';
import type { CodeFile, FileType as FileTypeEnum } from '../../api/repositories';

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  file?: CodeFile;
  children: TreeNode[];
}

interface FileTreeProps {
  files: CodeFile[];
  selectedFileId?: string;
  onSelectFile: (file: CodeFile) => void;
  className?: string;
  showStats?: boolean;
}

const languageIcons: Record<string, React.ReactNode> = {
  typescript: <FileCode className="w-4 h-4 text-blue-400" />,
  javascript: <FileCode className="w-4 h-4 text-yellow-400" />,
  python: <FileCode className="w-4 h-4 text-green-400" />,
  go: <FileCode className="w-4 h-4 text-cyan-400" />,
  rust: <FileCode className="w-4 h-4 text-orange-400" />,
  java: <FileCode className="w-4 h-4 text-red-400" />,
  json: <FileJson className="w-4 h-4 text-yellow-300" />,
  yaml: <FileCog className="w-4 h-4 text-purple-400" />,
  markdown: <FileText className="w-4 h-4 text-gray-400" />,
  css: <FileType className="w-4 h-4 text-pink-400" />,
  html: <FileType className="w-4 h-4 text-orange-300" />,
};

const fileTypeIcons: Record<FileTypeEnum, React.ReactNode> = {
  SOURCE: <FileCode className="w-4 h-4 text-blue-400" />,
  TEST: <TestTube className="w-4 h-4 text-green-400" />,
  CONFIG: <FileCog className="w-4 h-4 text-yellow-400" />,
  DOCUMENTATION: <FileText className="w-4 h-4 text-gray-400" />,
  GENERATED: <File className="w-4 h-4 text-gray-500" />,
  OTHER: <File className="w-4 h-4 text-gray-500" />,
};

function getFileIcon(file: CodeFile): React.ReactNode {
  // First try language-specific icon
  if (file.language && languageIcons[file.language.toLowerCase()]) {
    return languageIcons[file.language.toLowerCase()];
  }
  // Fall back to file type icon
  return fileTypeIcons[file.fileType] || <File className="w-4 h-4 text-gray-500" />;
}

function buildTree(files: CodeFile[]): TreeNode {
  const root: TreeNode = {
    name: '',
    path: '',
    isDirectory: true,
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isDirectory: !isLast,
          file: isLast ? file : undefined,
          children: [],
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort children: directories first, then alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };

  sortChildren(root);
  return root;
}

function TreeNodeComponent({
  node,
  depth,
  selectedFileId,
  expandedPaths,
  onToggle,
  onSelectFile,
  showStats,
}: {
  node: TreeNode;
  depth: number;
  selectedFileId?: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectFile: (file: CodeFile) => void;
  showStats?: boolean;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = node.file?.id === selectedFileId;

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className={clsx(
            'w-full flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors',
            'hover:bg-gray-800/50 text-gray-300'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          )}
          <span className="truncate font-medium">{node.name}</span>
          <span className="text-xs text-gray-500 ml-auto">
            {node.children.filter(c => !c.isDirectory).length}
          </span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map(child => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFileId={selectedFileId}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelectFile={onSelectFile}
                showStats={showStats}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <button
      onClick={() => node.file && onSelectFile(node.file)}
      className={clsx(
        'w-full flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors',
        isSelected
          ? 'bg-blue-500/20 text-blue-300'
          : 'hover:bg-gray-800/50 text-gray-400'
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="w-3.5" /> {/* Spacer for alignment */}
      {node.file && getFileIcon(node.file)}
      <span className="truncate">{node.name}</span>
      {showStats && node.file && (
        <span className="text-xs text-gray-500 ml-auto">
          {node.file.lineCount}L
        </span>
      )}
    </button>
  );
}

export function FileTree({
  files,
  selectedFileId,
  onSelectFile,
  className,
  showStats = false,
}: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));

  const tree = useMemo(() => buildTree(files), [files]);

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allPaths = new Set<string>();
    const collectPaths = (node: TreeNode) => {
      if (node.isDirectory) {
        allPaths.add(node.path);
        node.children.forEach(collectPaths);
      }
    };
    collectPaths(tree);
    setExpandedPaths(allPaths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['']));
  };

  if (files.length === 0) {
    return (
      <div className={clsx('text-center py-8 text-gray-500', className)}>
        No files found
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-700 text-xs">
        <button
          onClick={expandAll}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          Expand all
        </button>
        <span className="text-gray-600">|</span>
        <button
          onClick={collapseAll}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          Collapse all
        </button>
        <span className="ml-auto text-gray-500">{files.length} files</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {tree.children.map(child => (
          <TreeNodeComponent
            key={child.path}
            node={child}
            depth={0}
            selectedFileId={selectedFileId}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            onSelectFile={onSelectFile}
            showStats={showStats}
          />
        ))}
      </div>
    </div>
  );
}

export default FileTree;
