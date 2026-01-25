/**
 * DependencyMiniGraph - Small import graph for file details
 *
 * Displays a compact visualization of file dependencies showing
 * imports and files that import the current file.
 *
 * @prompt-id forge-v4.1:web:component:dependency-mini-graph:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowRight, ArrowLeft, FileCode, Circle } from 'lucide-react';
import type { DependencyNode, DependencyEdge, ImportType } from '../../api/repositories';

interface DependencyMiniGraphProps {
  node: DependencyNode;
  onSelectFile?: (fileId: string) => void;
  maxItems?: number;
  className?: string;
}

const importTypeColors: Record<ImportType, string> = {
  ES_IMPORT: 'text-blue-400',
  ES_DYNAMIC: 'text-purple-400',
  COMMONJS: 'text-yellow-400',
  TYPESCRIPT_TYPE: 'text-cyan-400',
};

const importTypeLabels: Record<ImportType, string> = {
  ES_IMPORT: 'import',
  ES_DYNAMIC: 'dynamic',
  COMMONJS: 'require',
  TYPESCRIPT_TYPE: 'type',
};

function DependencyEdgeRow({
  edge,
  direction,
  onSelect,
}: {
  edge: DependencyEdge;
  direction: 'import' | 'importedBy';
  onSelect?: () => void;
}) {
  const fileName = edge.path.split('/').pop() || edge.path;

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors',
        'hover:bg-gray-800/50 text-left',
        onSelect ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {direction === 'import' ? (
        <ArrowRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
      ) : (
        <ArrowLeft className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
      )}
      <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-gray-300 truncate">{fileName}</div>
        <div className="text-xs text-gray-500 truncate">{edge.path}</div>
      </div>
      <span className={clsx('text-xs px-1.5 py-0.5 rounded', importTypeColors[edge.importType])}>
        {importTypeLabels[edge.importType]}
      </span>
      {edge.symbols.length > 0 && (
        <span className="text-xs text-gray-500">{edge.symbols.length}</span>
      )}
    </button>
  );
}

export function DependencyMiniGraph({
  node,
  onSelectFile,
  maxItems = 5,
  className,
}: DependencyMiniGraphProps) {
  const currentFileName = useMemo(
    () => node.path.split('/').pop() || node.path,
    [node.path]
  );

  const visibleImports = node.imports.slice(0, maxItems);
  const visibleImportedBy = node.importedBy.slice(0, maxItems);
  const hiddenImports = node.imports.length - maxItems;
  const hiddenImportedBy = node.importedBy.length - maxItems;

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {/* Current File */}
      <div className="flex items-center justify-center py-3 px-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <FileCode className="w-5 h-5 text-blue-400 mr-2" />
        <span className="font-medium text-blue-300">{currentFileName}</span>
      </div>

      {/* Imports Section */}
      <div>
        <div className="flex items-center gap-2 px-2 mb-2">
          <ArrowRight className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-300">
            Imports ({node.imports.length})
          </span>
        </div>
        {node.imports.length === 0 ? (
          <div className="text-sm text-gray-500 px-2 py-2">
            No imports
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleImports.map((edge, index) => (
              <DependencyEdgeRow
                key={`import-${index}`}
                edge={edge}
                direction="import"
                onSelect={onSelectFile ? () => onSelectFile(edge.fileId) : undefined}
              />
            ))}
            {hiddenImports > 0 && (
              <div className="text-xs text-gray-500 px-2 py-1">
                +{hiddenImports} more imports
              </div>
            )}
          </div>
        )}
      </div>

      {/* Imported By Section */}
      <div>
        <div className="flex items-center gap-2 px-2 mb-2">
          <ArrowLeft className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-gray-300">
            Imported By ({node.importedBy.length})
          </span>
        </div>
        {node.importedBy.length === 0 ? (
          <div className="text-sm text-gray-500 px-2 py-2">
            Not imported by any files
          </div>
        ) : (
          <div className="space-y-0.5">
            {visibleImportedBy.map((edge, index) => (
              <DependencyEdgeRow
                key={`importedBy-${index}`}
                edge={edge}
                direction="importedBy"
                onSelect={onSelectFile ? () => onSelectFile(edge.fileId) : undefined}
              />
            ))}
            {hiddenImportedBy > 0 && (
              <div className="text-xs text-gray-500 px-2 py-1">
                +{hiddenImportedBy} more dependents
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Circle className="w-2 h-2 fill-green-400 text-green-400" />
          <span>{node.imports.length} deps</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Circle className="w-2 h-2 fill-orange-400 text-orange-400" />
          <span>{node.importedBy.length} dependents</span>
        </div>
      </div>
    </div>
  );
}

export default DependencyMiniGraph;
