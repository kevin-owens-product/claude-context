import React from 'react';
import clsx from 'clsx';
import { X, FileCode, FileJson, FileText, File as FileIcon } from 'lucide-react';
import type { OpenFile } from '../../types';

interface FileTabProps {
  file: OpenFile;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function getFileIcon(language: string) {
  switch (language) {
    case 'typescript':
    case 'typescriptreact':
    case 'javascript':
    case 'javascriptreact':
      return <FileCode size={14} className="text-blue-400" />;
    case 'json':
      return <FileJson size={14} className="text-yellow-400" />;
    case 'markdown':
      return <FileText size={14} className="text-text-secondary" />;
    case 'css':
    case 'scss':
      return <FileCode size={14} className="text-pink-400" />;
    default:
      return <FileIcon size={14} className="text-text-muted" />;
  }
}

export function FileTab({ file, isActive, onSelect, onClose }: FileTabProps) {
  return (
    <div
      className={clsx(
        'group flex items-center gap-2 px-3 py-1.5 border-r border-border cursor-pointer',
        'text-xs transition-colors duration-150 select-none min-w-0',
        'hover:bg-surface-1',
        isActive
          ? 'bg-surface-0 text-text-primary border-b-2 border-b-indigo-500'
          : 'bg-surface-1 text-text-secondary'
      )}
      onClick={onSelect}
      role="tab"
      aria-selected={isActive}
    >
      {getFileIcon(file.language)}
      <span className="truncate max-w-[120px]">{file.name}</span>
      {file.isModified && (
        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={clsx(
          'p-0.5 rounded hover:bg-surface-2 flex-shrink-0 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        aria-label={`Close ${file.name}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}
