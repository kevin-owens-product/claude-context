/**
 * SymbolSearchView - Search and Explore Code Symbols
 *
 * Search for functions, classes, interfaces with fuzzy matching.
 * View symbol details, complexity metrics, and navigate to source.
 *
 * @prompt-id forge-v4.1:web:view:symbol-search:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  X,
  FileCode,
  Code,
  Box,
  Type,
  Hash,
  Braces,
  ExternalLink,
  Copy,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import {
  searchSymbols,
  getSymbolReferences,
  type CodeSymbol,
  type SymbolSearchResult,
  type SymbolKind,
  type SymbolReference,
} from '../api/symbols';
import { listRepositories, type Repository } from '../api/repositories';

const kindIcons: Record<SymbolKind, React.ReactNode> = {
  FUNCTION: <Code className="w-4 h-4" />,
  METHOD: <Code className="w-4 h-4" />,
  CLASS: <Box className="w-4 h-4" />,
  INTERFACE: <Braces className="w-4 h-4" />,
  TYPE: <Type className="w-4 h-4" />,
  ENUM: <Hash className="w-4 h-4" />,
  VARIABLE: <Hash className="w-4 h-4" />,
  CONSTANT: <Hash className="w-4 h-4" />,
  PROPERTY: <Hash className="w-4 h-4" />,
  NAMESPACE: <Box className="w-4 h-4" />,
  MODULE: <Box className="w-4 h-4" />,
};

const kindColors: Record<SymbolKind, string> = {
  FUNCTION: 'text-blue-400 bg-blue-500/20',
  METHOD: 'text-blue-400 bg-blue-500/20',
  CLASS: 'text-purple-400 bg-purple-500/20',
  INTERFACE: 'text-green-400 bg-green-500/20',
  TYPE: 'text-green-400 bg-green-500/20',
  ENUM: 'text-yellow-400 bg-yellow-500/20',
  VARIABLE: 'text-gray-400 bg-gray-500/20',
  CONSTANT: 'text-orange-400 bg-orange-500/20',
  PROPERTY: 'text-gray-400 bg-gray-500/20',
  NAMESPACE: 'text-pink-400 bg-pink-500/20',
  MODULE: 'text-pink-400 bg-pink-500/20',
};

function ComplexityBadge({ complexity }: { complexity?: number }) {
  if (complexity === undefined) return null;

  const level =
    complexity <= 5 ? 'low' :
    complexity <= 10 ? 'medium' :
    complexity <= 20 ? 'high' : 'critical';

  const colors = {
    low: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-orange-400 bg-orange-500/20',
    critical: 'text-red-400 bg-red-500/20',
  };

  return (
    <span className={clsx('px-1.5 py-0.5 rounded text-xs', colors[level])}>
      CC: {complexity}
    </span>
  );
}

function SymbolCard({
  result,
  isSelected,
  onClick,
}: {
  result: SymbolSearchResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { symbol, matchScore } = result;
  const colors = kindColors[symbol.kind];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full p-4 text-left rounded-lg border transition-all',
        isSelected
          ? 'bg-blue-500/10 border-blue-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
      )}
    >
      <div className="flex items-start gap-3">
        <span className={clsx('p-2 rounded', colors)}>
          {kindIcons[symbol.kind]}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">{symbol.name}</span>
            {symbol.isExported && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                exported
              </span>
            )}
            {symbol.isAsync && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                async
              </span>
            )}
            <ComplexityBadge complexity={symbol.complexity} />
          </div>
          <code className="text-sm text-gray-400 block truncate mb-2">
            {symbol.signature}
          </code>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileCode className="w-3 h-3" />
            <span className="truncate">{symbol.filePath}</span>
            <span>:{symbol.startLine}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {Math.round(matchScore * 100)}%
        </div>
      </div>
    </button>
  );
}

function SymbolDetailPanel({
  symbol,
  references,
  onClose,
  onViewCallGraph,
}: {
  symbol: CodeSymbol;
  references: SymbolReference[];
  onClose: () => void;
  onViewCallGraph: () => void;
}) {
  const colors = kindColors[symbol.kind];

  const copySignature = () => {
    navigator.clipboard.writeText(symbol.signature);
  };

  return (
    <div className="w-[420px] h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className={clsx('p-1.5 rounded', colors)}>
            {kindIcons[symbol.kind]}
          </span>
          <span className="text-white font-medium">{symbol.name}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Signature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Signature</span>
            <button
              onClick={copySignature}
              className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
              title="Copy signature"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <code className="text-sm text-gray-300 bg-gray-800 px-3 py-2 rounded block whitespace-pre-wrap break-all">
            {symbol.signature}
          </code>
        </div>

        {/* Location */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Location</span>
          <div className="flex items-center gap-2 text-sm">
            <FileCode className="w-4 h-4 text-gray-500" />
            <span className="text-gray-300">{symbol.filePath}</span>
            <span className="text-gray-500">
              lines {symbol.startLine}-{symbol.endLine}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Kind</span>
            <span className="text-sm text-white">{symbol.kind}</span>
          </div>
          {symbol.complexity !== undefined && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-500 block mb-1">Complexity</span>
              <span className="text-sm text-white">{symbol.complexity}</span>
            </div>
          )}
          {symbol.parameterCount !== undefined && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-500 block mb-1">Parameters</span>
              <span className="text-sm text-white">{symbol.parameterCount}</span>
            </div>
          )}
          {symbol.returnType && (
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-500 block mb-1">Returns</span>
              <span className="text-sm text-white truncate">{symbol.returnType}</span>
            </div>
          )}
        </div>

        {/* Modifiers */}
        {symbol.modifiers.length > 0 && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Modifiers</span>
            <div className="flex flex-wrap gap-2">
              {symbol.modifiers.map((mod, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-gray-800 text-gray-300 rounded">
                  {mod}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">
            References ({references.length})
          </span>
          {references.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {references.slice(0, 10).map((ref, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-gray-800/50 rounded text-sm"
                >
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-400 truncate">{ref.sourceFile}</span>
                  <span className="text-gray-500">:{ref.sourceLine}</span>
                  <span className="text-xs text-gray-500 ml-auto">{ref.referenceKind}</span>
                </div>
              ))}
              {references.length > 10 && (
                <div className="text-xs text-gray-500 px-2 py-1">
                  +{references.length - 10} more references
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No references found</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 border-t border-gray-700">
        <button
          onClick={onViewCallGraph}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          View Call Graph
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          <ExternalLink className="w-4 h-4" />
          Open in Editor
        </button>
      </div>
    </div>
  );
}

export function SymbolSearchView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<SymbolKind | ''>('');
  const [exportedOnly, setExportedOnly] = useState(false);
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<CodeSymbol | null>(null);
  const [references, setReferences] = useState<SymbolReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load repositories
  useEffect(() => {
    async function loadRepos() {
      try {
        const result = await listRepositories({ status: 'ACTIVE' });
        setRepositories(result.data);
      } catch (error) {
        console.error('Failed to load repositories:', error);
      } finally {
        setInitialLoading(false);
      }
    }
    loadRepos();
  }, []);

  // Search symbols
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const result = await searchSymbols({
        repositoryId: selectedRepoId || undefined,
        query: searchQuery,
        kind: kindFilter || undefined,
        isExported: exportedOnly || undefined,
        limit: 50,
      });
      setResults(result.data);
    } catch (error) {
      console.error('Failed to search symbols:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRepoId, kindFilter, exportedOnly]);

  // Trigger search on Enter or after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Load symbol details and references
  const handleSelectSymbol = async (symbol: CodeSymbol) => {
    setSelectedSymbol(symbol);
    try {
      const refs = await getSymbolReferences(symbol.id, { direction: 'incoming', limit: 20 });
      setReferences(refs.data);
    } catch (error) {
      console.error('Failed to load references:', error);
      setReferences([]);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          {/* Search Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search symbols (functions, classes, interfaces...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white"
            >
              <option value="">All Repositories</option>
              {repositories.map(repo => (
                <option key={repo.id} value={repo.id}>{repo.name}</option>
              ))}
            </select>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as SymbolKind | '')}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white"
            >
              <option value="">All Types</option>
              <option value="FUNCTION">Functions</option>
              <option value="CLASS">Classes</option>
              <option value="INTERFACE">Interfaces</option>
              <option value="TYPE">Types</option>
              <option value="METHOD">Methods</option>
              <option value="ENUM">Enums</option>
              <option value="VARIABLE">Variables</option>
              <option value="CONSTANT">Constants</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exportedOnly}
                onChange={(e) => setExportedOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700"
              />
              Exported only
            </label>
            <span className="ml-auto text-sm text-gray-500">
              {results.length} results
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {searchQuery && results.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No symbols found</h3>
              <p className="text-gray-500">Try a different search term or adjust filters</p>
            </div>
          ) : !searchQuery ? (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Search for Symbols</h3>
              <p className="text-gray-500 mb-4">
                Find functions, classes, interfaces, and more across your codebase
              </p>
              <div className="text-sm text-gray-500">
                Try searching for "auth", "api", "handle", or any symbol name
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((result) => (
                <SymbolCard
                  key={result.symbol.id}
                  result={result}
                  isSelected={selectedSymbol?.id === result.symbol.id}
                  onClick={() => handleSelectSymbol(result.symbol)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedSymbol && (
        <SymbolDetailPanel
          symbol={selectedSymbol}
          references={references}
          onClose={() => setSelectedSymbol(null)}
          onViewCallGraph={() => console.log('View call graph for:', selectedSymbol.id)}
        />
      )}
    </div>
  );
}

export default SymbolSearchView;
