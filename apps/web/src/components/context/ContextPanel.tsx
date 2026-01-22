/**
 * @prompt-id forge-v4.1:web:components:context-panel:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { Search, FileText, BookOpen, Code, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { useNodes, useSearchNodes, useCompileContext } from '../../hooks';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import type { ContextNode, ContextLayer, Freshness } from '../../types';

interface ContextPanelProps {
  graphId: string;
  workspaceId: string;
  sliceId?: string;
  onCompile?: (compiledText: string, documentIds: string[]) => void;
}

const layerColors: Record<ContextLayer, string> = {
  ORGANIZATIONAL: 'bg-purple-100 text-purple-800',
  WORKSPACE: 'bg-blue-100 text-blue-800',
  SLICE: 'bg-green-100 text-green-800',
};

const freshnessVariant: Record<Freshness, 'success' | 'warning' | 'default'> = {
  CURRENT: 'success',
  STALE: 'warning',
  ARCHIVED: 'default',
};

const typeIcons: Record<string, React.ReactNode> = {
  DOCUMENT: <FileText className="w-4 h-4" />,
  GUIDELINE: <BookOpen className="w-4 h-4" />,
  PATTERN: <Code className="w-4 h-4" />,
  API_SPEC: <Zap className="w-4 h-4" />,
};

export function ContextPanel({
  graphId,
  workspaceId,
  sliceId,
  onCompile,
}: ContextPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [tokenBudget, setTokenBudget] = useState(8000);

  const { data: nodesResult, isLoading: isLoadingNodes } = useNodes(graphId);
  const searchMutation = useSearchNodes();
  const compileMutation = useCompileContext();

  const nodes = searchQuery && searchMutation.data
    ? searchMutation.data.map((r) => r.node)
    : nodesResult?.data || [];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate({
        graphId,
        query: searchQuery,
        limit: 20,
      });
    }
  };

  const handleCompile = () => {
    compileMutation.mutate(
      {
        workspaceId,
        sliceId,
        query: searchQuery || undefined,
        tokenBudget,
      },
      {
        onSuccess: (result) => {
          const documentIds = result.sections.flatMap((s) => s.documentIds);
          onCompile?.(result.compiledText, documentIds);
        },
      },
    );
  };

  const toggleNodeSelection = (nodeId: string) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedNodes(newSelected);
  };

  const selectedTokens = nodes
    .filter((n) => selectedNodes.has(n.id))
    .reduce((sum, n) => sum + n.tokenCount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSearch}
            loading={searchMutation.isPending}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Token Budget */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Token Budget:</label>
          <input
            type="number"
            value={tokenBudget}
            onChange={(e) => setTokenBudget(Number(e.target.value))}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
            min={1000}
            max={128000}
            step={1000}
          />
        </div>
        <div className="text-sm text-gray-600">
          Selected: {selectedTokens.toLocaleString()} tokens
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingNodes ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading context...
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No context documents found
          </div>
        ) : (
          nodes.map((node) => (
            <ContextNodeCard
              key={node.id}
              node={node}
              selected={selectedNodes.has(node.id)}
              onToggle={() => toggleNodeSelection(node.id)}
            />
          ))
        )}
      </div>

      {/* Compile Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <Button
          className="w-full"
          onClick={handleCompile}
          loading={compileMutation.isPending}
          disabled={selectedTokens > tokenBudget}
        >
          Compile Context ({selectedTokens.toLocaleString()} / {tokenBudget.toLocaleString()} tokens)
        </Button>
        {selectedTokens > tokenBudget && (
          <p className="mt-2 text-sm text-red-600 text-center">
            Selection exceeds token budget
          </p>
        )}
      </div>
    </div>
  );
}

interface ContextNodeCardProps {
  node: ContextNode;
  selected: boolean;
  onToggle: () => void;
}

function ContextNodeCard({ node, selected, onToggle }: ContextNodeCardProps) {
  return (
    <Card
      className={clsx(
        'transition-all',
        selected && 'ring-2 ring-blue-500 border-blue-500',
      )}
      onClick={onToggle}
    >
      <CardContent className="py-2">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 text-blue-600 rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500">{typeIcons[node.type]}</span>
              <h4 className="font-medium text-gray-900 truncate">{node.name}</h4>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={clsx('px-2 py-0.5 rounded text-xs', layerColors[node.layer])}>
                {node.layer}
              </span>
              <Badge variant={freshnessVariant[node.freshness]}>
                {node.freshness}
              </Badge>
              <span className="text-gray-500">{node.tokenCount.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
