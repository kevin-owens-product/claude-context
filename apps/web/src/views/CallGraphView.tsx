/**
 * CallGraphView - Interactive Call Graph Visualization
 *
 * Visualize function/method call relationships with interactive
 * SVG-based graph, depth control, and direction filtering.
 *
 * @prompt-id forge-v4.1:web:view:call-graph:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Minus,
  Plus,
  Code,
  FileCode,
  X,
  RefreshCw,
} from 'lucide-react';
import { CallGraphVisualization } from '../components/codebase';
import {
  searchSymbols,
  getCallGraph,
  getSymbol,
  type CodeSymbol,
  type CallGraph,
  type SymbolSearchResult,
} from '../api/symbols';
import { listRepositories, type Repository } from '../api/repositories';

type Direction = 'callers' | 'callees' | 'both';

function SymbolSelector({
  onSelect,
  repositories,
  selectedRepoId,
  onRepoChange,
}: {
  onSelect: (symbol: CodeSymbol) => void;
  repositories: Repository[];
  selectedRepoId: string;
  onRepoChange: (repoId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchSymbols({
          repositoryId: selectedRepoId || undefined,
          query,
          kind: 'FUNCTION',
          limit: 10,
        });
        setResults(result.data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Failed to search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, selectedRepoId]);

  const handleSelect = (result: SymbolSearchResult) => {
    onSelect(result.symbol);
    setQuery(result.symbol.name);
    setShowDropdown(false);
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedRepoId}
        onChange={(e) => onRepoChange(e.target.value)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
      >
        <option value="">All Repositories</option>
        {repositories.map(repo => (
          <option key={repo.id} value={repo.id}>{repo.name}</option>
        ))}
      </select>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search for a function or method..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <button
                key={result.symbol.id}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left"
              >
                <Code className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{result.symbol.name}</div>
                  <div className="text-xs text-gray-500 truncate">{result.symbol.filePath}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GraphControls({
  direction,
  depth,
  onDirectionChange,
  onDepthChange,
  onRefresh,
}: {
  direction: Direction;
  depth: number;
  onDirectionChange: (direction: Direction) => void;
  onDepthChange: (depth: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* Direction Toggle */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => onDirectionChange('callers')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
            direction === 'callers'
              ? 'bg-orange-500/20 text-orange-400'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <ArrowUp className="w-4 h-4" />
          Callers
        </button>
        <button
          onClick={() => onDirectionChange('both')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
            direction === 'both'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Both
        </button>
        <button
          onClick={() => onDirectionChange('callees')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors',
            direction === 'callees'
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <ArrowDown className="w-4 h-4" />
          Callees
        </button>
      </div>

      {/* Depth Control */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Depth:</span>
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => onDepthChange(Math.max(1, depth - 1))}
            disabled={depth <= 1}
            className={clsx(
              'p-1.5 rounded-l-lg transition-colors',
              depth <= 1
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-3 text-white font-medium">{depth}</span>
          <button
            onClick={() => onDepthChange(Math.min(5, depth + 1))}
            disabled={depth >= 5}
            className={clsx(
              'p-1.5 rounded-r-lg transition-colors',
              depth >= 5
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        title="Refresh graph"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}

function SelectedSymbolInfo({
  symbol,
  onClear,
}: {
  symbol: CodeSymbol;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <Code className="w-5 h-5 text-blue-400" />
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">{symbol.name}</div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <FileCode className="w-3 h-3" />
          <span className="truncate">{symbol.filePath}</span>
          <span>:{symbol.startLine}</span>
        </div>
      </div>
      <button
        onClick={onClear}
        className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function CallGraphView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<CodeSymbol | null>(null);
  const [graph, setGraph] = useState<CallGraph | null>(null);
  const [direction, setDirection] = useState<Direction>('both');
  const [depth, setDepth] = useState(2);
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

  // Load call graph when symbol or params change
  const loadGraph = useCallback(async () => {
    if (!selectedSymbol) {
      setGraph(null);
      return;
    }

    setLoading(true);
    try {
      const callGraph = await getCallGraph(selectedSymbol.id, {
        depth,
        direction,
      });
      setGraph(callGraph);
    } catch (error) {
      console.error('Failed to load call graph:', error);
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, depth, direction]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleSelectSymbol = (symbol: CodeSymbol) => {
    setSelectedSymbol(symbol);
  };

  const handleSymbolClick = async (symbolId: string) => {
    try {
      const symbol = await getSymbol(symbolId);
      setSelectedSymbol(symbol);
    } catch (error) {
      console.error('Failed to load symbol:', error);
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-4">
        {/* Symbol Selector */}
        <SymbolSelector
          onSelect={handleSelectSymbol}
          repositories={repositories}
          selectedRepoId={selectedRepoId}
          onRepoChange={setSelectedRepoId}
        />

        {/* Selected Symbol & Controls */}
        <div className="flex items-center justify-between">
          {selectedSymbol ? (
            <SelectedSymbolInfo
              symbol={selectedSymbol}
              onClear={() => setSelectedSymbol(null)}
            />
          ) : (
            <div className="text-sm text-gray-500">
              Search and select a function to view its call graph
            </div>
          )}

          {selectedSymbol && (
            <GraphControls
              direction={direction}
              depth={depth}
              onDirectionChange={setDirection}
              onDepthChange={setDepth}
              onRefresh={loadGraph}
            />
          )}
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading call graph...</span>
            </div>
          </div>
        ) : graph ? (
          <CallGraphVisualization
            graph={graph}
            direction={direction}
            onSelectSymbol={handleSymbolClick}
            selectedSymbolId={selectedSymbol?.id}
            className="w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">
              Call Graph Visualization
            </h3>
            <p className="text-gray-500 max-w-md mb-4">
              Search for a function or method above to visualize its call relationships.
              See who calls it (callers) and what it calls (callees).
            </p>
            <div className="text-sm text-gray-600">
              <p>Tips:</p>
              <ul className="mt-2 space-y-1">
                <li>• Use the direction toggle to filter callers, callees, or both</li>
                <li>• Adjust depth to see more levels of the call hierarchy</li>
                <li>• Click on nodes to navigate to that symbol</li>
                <li>• Use zoom and pan to explore large graphs</li>
              </ul>
            </div>
          </div>
        )}

        {/* Graph Stats */}
        {graph && (
          <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur rounded-lg px-3 py-2 text-sm text-gray-400">
            {graph.totalNodes} nodes • Max depth: {graph.maxDepth}
          </div>
        )}
      </div>
    </div>
  );
}

export default CallGraphView;
