/**
 * Assembly Builder - Interactive context assembly interface
 * @prompt-id forge-v4.1:web:components:assembly:builder:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Sparkles,
  Search,
  Settings,
  Copy,
  Check,
  RefreshCw,
  Code,
  FileText,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { assemblyApi } from '../../api/assembly';
import { projectsApi } from '../../api/projects';

interface AssemblyBuilderProps {
  defaultProjectId?: string;
}

export function AssemblyBuilder({ defaultProjectId }: AssemblyBuilderProps) {
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [maxTokens, setMaxTokens] = useState(4000);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.listProjects({ status: 'active' }),
  });

  const assembleMutation = useMutation({
    mutationFn: () => assemblyApi.assembleContext({ query, projectId: projectId || undefined, maxTokens }),
  });

  const handleAssemble = () => {
    if (!query.trim()) return;
    assembleMutation.mutate();
  };

  const handleCopy = () => {
    if (assembleMutation.data?.contextXml) {
      navigator.clipboard.writeText(assembleMutation.data.contextXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const result = assembleMutation.data;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-claude bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
              Context Assembly
            </h2>
            <p className="text-caption text-claude-neutral-500">
              Build context for Claude injection
            </p>
          </div>
        </div>

        {/* Query Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-claude-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAssemble()}
              placeholder="Enter your query for context assembly..."
              className={clsx(
                'w-full pl-10 pr-4 py-3 rounded-claude border border-claude-cream-300 dark:border-claude-neutral-600',
                'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
                'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
              )}
            />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={clsx(
              'px-3 py-2 rounded-claude border transition-colors',
              showSettings
                ? 'bg-claude-cream-200 dark:bg-claude-neutral-600 border-claude-cream-400 dark:border-claude-neutral-500'
                : 'border-claude-cream-300 dark:border-claude-neutral-600 hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700'
            )}
          >
            <Settings className="w-5 h-5 text-claude-neutral-600 dark:text-claude-neutral-400" />
          </button>
          <button
            onClick={handleAssemble}
            disabled={!query.trim() || assembleMutation.isPending}
            className={clsx(
              'px-4 py-2 rounded-claude flex items-center gap-2 transition-colors',
              query.trim() && !assembleMutation.isPending
                ? 'bg-claude-primary-500 text-white hover:bg-claude-primary-600'
                : 'bg-claude-cream-200 dark:bg-claude-neutral-700 text-claude-neutral-400 cursor-not-allowed'
            )}
          >
            {assembleMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Assemble
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-claude-cream-50 dark:bg-claude-neutral-700/50 rounded-claude space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Project Select */}
              <div>
                <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
                  Project Context
                </label>
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className={clsx(
                      'w-full px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
                      'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
                      'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 appearance-none'
                    )}
                  >
                    <option value="">All Projects</option>
                    {projectsData?.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-claude-neutral-700 dark:text-claude-neutral-300 mb-1">
                  Max Tokens: {maxTokens.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="16000"
                  step="500"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-claude-primary-500"
                />
                <div className="flex justify-between text-xs text-claude-neutral-500">
                  <span>1K</span>
                  <span>8K</span>
                  <span>16K</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-6">
        {assembleMutation.isError && (
          <div className="p-4 bg-claude-error/10 border border-claude-error/20 rounded-claude mb-4">
            <div className="flex items-center gap-2 text-claude-error">
              <AlertCircle className="w-5 h-5" />
              <p>Failed to assemble context. Please try again.</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Sources Summary */}
            <div className="claude-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-claude-primary-500" />
                  Sources ({result.sources.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-claude-cream-100 dark:bg-claude-neutral-700 rounded-claude-sm"
                  >
                    <span className="text-sm text-claude-neutral-700 dark:text-claude-neutral-300">{source.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-claude-cream-200 dark:bg-claude-neutral-600 text-claude-neutral-500">
                      {source.type}
                    </span>
                    <span className="text-xs text-claude-primary-600 dark:text-claude-primary-400">
                      {Math.round(source.relevance * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Count */}
            <div className="claude-card p-4">
              <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 mb-2">
                Token Usage
              </h3>
              <p className="text-2xl font-bold text-claude-primary-600">
                {result.tokenCount.toLocaleString()} tokens
              </p>
            </div>

            {/* Assembled Context */}
            <div className="claude-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-700">
                <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
                  <Code className="w-5 h-5 text-claude-primary-500" />
                  Assembled Context (XML)
                </h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-claude-sm hover:bg-claude-cream-100 dark:hover:bg-claude-neutral-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-claude-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                <pre className="text-sm font-mono text-claude-neutral-700 dark:text-claude-neutral-300 whitespace-pre-wrap">
                  {result.contextXml}
                </pre>
              </div>
            </div>
          </div>
        )}

        {!result && !assembleMutation.isPending && !assembleMutation.isError && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto text-claude-neutral-300 dark:text-claude-neutral-600 mb-4" />
            <p className="text-claude-neutral-500 dark:text-claude-neutral-400">
              Enter a query and click Assemble to build context for Claude
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
