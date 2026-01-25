/**
 * SmartSearch - AI-powered natural language search
 * Understands queries like "blocked items assigned to John" or "PRs ready for review"
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Sparkles,
  X,
  Clock,
  ArrowRight,
  FileText,
  Target,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle,
  GitPullRequest,
} from 'lucide-react';
import type { Slice, Intent, Artifact, ContextDoc } from '../../data/enterprise-data';

interface SmartSearchProps {
  slices: Slice[];
  intents: Intent[];
  artifacts: Artifact[];
  contextDocs: ContextDoc[];
  onSliceClick?: (slice: Slice) => void;
  onIntentClick?: (intent: Intent) => void;
  onArtifactClick?: (artifact: Artifact) => void;
  onDocClick?: (doc: ContextDoc) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'slice' | 'intent' | 'artifact' | 'doc';
  item: Slice | Intent | Artifact | ContextDoc;
  score: number;
  matchReason: string;
}

interface SmartQuery {
  text: string;
  filters: {
    status?: string[];
    assignee?: string[];
    type?: string[];
    hasDeadline?: boolean;
    isBlocked?: boolean;
    hasPR?: boolean;
  };
  sortBy?: 'relevance' | 'date' | 'priority';
}

export function SmartSearch({
  slices,
  intents,
  artifacts,
  contextDocs,
  onSliceClick,
  onIntentClick,
  onArtifactClick,
  onDocClick,
  isOpen,
  onClose,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'blocked items this week',
    'PRs waiting for review',
    'high priority tasks',
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Parse natural language query into structured filters
  const parseQuery = useCallback((text: string): SmartQuery => {
    const filters: SmartQuery['filters'] = {};
    let cleanText = text.toLowerCase();

    // Status detection
    if (cleanText.includes('blocked')) {
      filters.status = ['blocked'];
      cleanText = cleanText.replace(/blocked/g, '');
    }
    if (cleanText.includes('completed') || cleanText.includes('done')) {
      filters.status = [...(filters.status || []), 'completed'];
      cleanText = cleanText.replace(/completed|done/g, '');
    }
    if (cleanText.includes('in progress') || cleanText.includes('active')) {
      filters.status = [...(filters.status || []), 'in_progress'];
      cleanText = cleanText.replace(/in progress|active/g, '');
    }
    if (cleanText.includes('review') || cleanText.includes('pr')) {
      filters.status = [...(filters.status || []), 'in_review'];
      filters.hasPR = true;
      cleanText = cleanText.replace(/review|pr/g, '');
    }

    // Priority detection
    if (cleanText.includes('urgent') || cleanText.includes('critical') || cleanText.includes('high priority')) {
      filters.type = ['critical', 'high'];
      cleanText = cleanText.replace(/urgent|critical|high priority/g, '');
    }

    // Deadline detection
    if (cleanText.includes('overdue') || cleanText.includes('due')) {
      filters.hasDeadline = true;
      cleanText = cleanText.replace(/overdue|due/g, '');
    }

    return {
      text: cleanText.trim(),
      filters,
    };
  }, []);

  // Search and score results
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const parsed = parseQuery(query);
    const searchText = parsed.text.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search slices
    slices.forEach(slice => {
      let score = 0;
      let matchReason = '';

      // Text matching
      if (slice.name.toLowerCase().includes(searchText)) {
        score += 10;
        matchReason = 'Name match';
      }
      if (slice.shortId.toLowerCase().includes(searchText)) {
        score += 15;
        matchReason = 'ID match';
      }

      // Filter matching
      if (parsed.filters.status?.includes(slice.status)) {
        score += 5;
        matchReason = matchReason ? `${matchReason}, Status match` : 'Status match';
      }
      if (parsed.filters.isBlocked && slice.status === 'blocked') {
        score += 5;
      }
      if (parsed.filters.hasPR && slice.pullRequests && slice.pullRequests.length > 0) {
        score += 5;
        matchReason = matchReason ? `${matchReason}, Has PR` : 'Has PR';
      }
      if (parsed.filters.hasDeadline && slice.dueDate) {
        score += 3;
      }

      if (score > 0 || (searchText && slice.name.toLowerCase().includes(searchText))) {
        allResults.push({
          type: 'slice',
          item: slice,
          score: score || 1,
          matchReason: matchReason || 'Text match',
        });
      }
    });

    // Search intents
    intents.forEach(intent => {
      let score = 0;
      let matchReason = '';

      if (intent.name.toLowerCase().includes(searchText)) {
        score += 10;
        matchReason = 'Name match';
      }
      if (intent.description?.toLowerCase().includes(searchText)) {
        score += 5;
        matchReason = matchReason ? `${matchReason}, Description` : 'Description match';
      }

      if (score > 0) {
        allResults.push({
          type: 'intent',
          item: intent,
          score,
          matchReason,
        });
      }
    });

    // Search artifacts
    artifacts.forEach(artifact => {
      let score = 0;
      let matchReason = '';

      if (artifact.name.toLowerCase().includes(searchText)) {
        score += 10;
        matchReason = 'Name match';
      }

      if (score > 0) {
        allResults.push({
          type: 'artifact',
          item: artifact,
          score,
          matchReason,
        });
      }
    });

    // Search docs
    contextDocs.forEach(doc => {
      let score = 0;
      let matchReason = '';

      if (doc.name.toLowerCase().includes(searchText)) {
        score += 10;
        matchReason = 'Name match';
      }

      if (score > 0) {
        allResults.push({
          type: 'doc',
          item: doc,
          score,
          matchReason,
        });
      }
    });

    // Sort by score
    return allResults.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, slices, intents, artifacts, contextDocs, parseQuery]);

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches([query, ...recentSearches.slice(0, 4)]);
    }

    switch (result.type) {
      case 'slice':
        onSliceClick?.(result.item as Slice);
        break;
      case 'intent':
        onIntentClick?.(result.item as Intent);
        break;
      case 'artifact':
        onArtifactClick?.(result.item as Artifact);
        break;
      case 'doc':
        onDocClick?.(result.item as ContextDoc);
        break;
    }
    onClose();
  };

  const typeIcons = {
    slice: Layers,
    intent: Target,
    artifact: FileText,
    doc: FileText,
  };

  const typeColors = {
    slice: 'text-blue-400 bg-blue-500/20',
    intent: 'text-purple-400 bg-purple-500/20',
    artifact: 'text-green-400 bg-green-500/20',
    doc: 'text-yellow-400 bg-yellow-500/20',
  };

  const smartSuggestions = [
    { query: 'blocked items', icon: AlertCircle, color: 'text-red-400' },
    { query: 'ready for review', icon: GitPullRequest, color: 'text-purple-400' },
    { query: 'due this week', icon: Calendar, color: 'text-orange-400' },
    { query: 'completed today', icon: CheckCircle, color: 'text-green-400' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-2xl bg-claude-neutral-900 rounded-2xl border border-claude-neutral-800 shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-claude-neutral-800">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search with natural language... (e.g., 'blocked items assigned to me')"
              className="w-full bg-transparent text-claude-neutral-100 placeholder-claude-neutral-500 text-sm focus:outline-none"
            />
          </div>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-1 bg-claude-neutral-800 text-claude-neutral-500 text-xs rounded">
            ESC
          </kbd>
        </div>

        {/* Smart Suggestions (when no query) */}
        {!query && (
          <div className="p-4">
            <div className="mb-4">
              <span className="text-xs font-medium text-claude-neutral-500 uppercase tracking-wider">
                Smart Filters
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {smartSuggestions.map(suggestion => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.query}
                      onClick={() => setQuery(suggestion.query)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-neutral-800 hover:bg-claude-neutral-700 rounded-lg text-sm text-claude-neutral-300 transition-colors"
                    >
                      <Icon className={clsx('w-3.5 h-3.5', suggestion.color)} />
                      {suggestion.query}
                    </button>
                  );
                })}
              </div>
            </div>

            {recentSearches.length > 0 && (
              <div>
                <span className="text-xs font-medium text-claude-neutral-500 uppercase tracking-wider">
                  Recent Searches
                </span>
                <div className="mt-2 space-y-1">
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(search)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4 text-claude-neutral-500" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {query && (
          <div className="max-h-[400px] overflow-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto text-claude-neutral-600 mb-3" />
                <p className="text-claude-neutral-400">No results found</p>
                <p className="text-sm text-claude-neutral-500 mt-1">
                  Try different keywords or smart filters
                </p>
              </div>
            ) : (
              <div className="p-2">
                {results.map((result, i) => {
                  const Icon = typeIcons[result.type];
                  const colors = typeColors[result.type];

                  return (
                    <button
                      key={`${result.type}-${i}`}
                      onClick={() => handleResultClick(result)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-claude-neutral-800 transition-colors text-left"
                    >
                      <div className={clsx('p-1.5 rounded-lg', colors.split(' ')[1])}>
                        <Icon className={clsx('w-4 h-4', colors.split(' ')[0])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-claude-neutral-200 truncate">
                          {'name' in result.item ? result.item.name : 'Unnamed'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-claude-neutral-500">
                          <span className="capitalize">{result.type}</span>
                          <span>•</span>
                          <span>{result.matchReason}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-claude-neutral-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-claude-neutral-800 bg-claude-neutral-850">
          <div className="flex items-center gap-4 text-xs text-claude-neutral-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded">↵</kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-claude-neutral-500">
            <Sparkles className="w-3 h-3" />
            AI-powered search
          </div>
        </div>
      </div>
    </div>
  );
}
