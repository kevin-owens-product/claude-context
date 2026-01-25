/**
 * Identity Panel - Main view for identity graph management
 * @prompt-id forge-v4.1:web:components:identity:panel:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  User,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Tag,
  Target,
  Sparkles,
  Settings,
  Brain,
  FileText,
} from 'lucide-react';
import { identityApi, type IdentityAttribute } from '../../api/identity';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AttributeEditor } from './AttributeEditor';

const categoryIcons: Record<IdentityAttribute['category'], React.ReactNode> = {
  demographic: <User className="w-4 h-4" />,
  preference: <Settings className="w-4 h-4" />,
  skill: <Sparkles className="w-4 h-4" />,
  goal: <Target className="w-4 h-4" />,
  constraint: <Filter className="w-4 h-4" />,
  context: <FileText className="w-4 h-4" />,
};

const categoryColors: Record<IdentityAttribute['category'], string> = {
  demographic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  preference: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  skill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  goal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  constraint: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  context: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function IdentityPanel() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IdentityAttribute['category'] | 'all'>('all');
  const [editingAttribute, setEditingAttribute] = useState<IdentityAttribute | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: identity, isLoading, error, refetch } = useQuery({
    queryKey: ['identity'],
    queryFn: identityApi.getIdentity,
  });

  const setAttributeMutation = useMutation({
    mutationFn: ({ key, ...data }: Parameters<typeof identityApi.setAttribute>[1] & { key: string }) =>
      identityApi.setAttribute(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity'] });
      setEditingAttribute(null);
      setIsCreating(false);
    },
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: identityApi.deleteAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity'] });
      setEditingAttribute(null);
    },
  });

  const filteredAttributes = identity?.attributes.filter((attr) => {
    const valueStr = typeof attr.value === 'string' ? attr.value : JSON.stringify(attr.value);
    const matchesSearch =
      searchQuery === '' ||
      attr.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      valueStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || attr.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const attributesByCategory = filteredAttributes.reduce((acc, attr) => {
    if (!acc[attr.category]) acc[attr.category] = [];
    acc[attr.category].push(attr);
    return acc;
  }, {} as Record<IdentityAttribute['category'], IdentityAttribute[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-claude-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-claude-error mb-4">Failed to load identity graph</p>
        <button onClick={() => refetch()} className="claude-btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-claude-cream-300 dark:border-claude-neutral-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-claude bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-heading-2 text-claude-neutral-800 dark:text-claude-neutral-100">
              Identity Graph
            </h2>
            <p className="text-caption text-claude-neutral-500">
              {identity?.attributes.length || 0} attributes
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="claude-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-claude-cream-300 dark:border-claude-neutral-700 flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-400" />
          <input
            type="text"
            placeholder="Search attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={clsx(
              'w-full pl-9 pr-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-claude-neutral-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
            className={clsx(
              'px-3 py-2 rounded-claude-sm border border-claude-cream-300 dark:border-claude-neutral-600',
              'bg-white dark:bg-claude-neutral-700 text-claude-neutral-800 dark:text-claude-neutral-100',
              'focus:outline-none focus:ring-2 focus:ring-claude-primary-500 focus:border-transparent'
            )}
          >
            <option value="all">All Categories</option>
            {Object.keys(categoryIcons).map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isCreating || editingAttribute ? (
          <div className="max-w-2xl mx-auto claude-card p-6">
            <AttributeEditor
              attribute={editingAttribute || undefined}
              onSave={(data) => setAttributeMutation.mutate(data)}
              onDelete={
                editingAttribute
                  ? () => deleteAttributeMutation.mutate(editingAttribute.key)
                  : undefined
              }
              onCancel={() => {
                setIsCreating(false);
                setEditingAttribute(null);
              }}
            />
          </div>
        ) : filteredAttributes.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto text-claude-neutral-300 dark:text-claude-neutral-600 mb-4" />
            <p className="text-claude-neutral-500 dark:text-claude-neutral-400">
              {searchQuery || selectedCategory !== 'all'
                ? 'No matching attributes found'
                : 'No attributes yet. Add your first one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(attributesByCategory).map(([category, attrs]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={clsx('p-1.5 rounded-claude-sm', categoryColors[category as IdentityAttribute['category']])}>
                    {categoryIcons[category as IdentityAttribute['category']]}
                  </span>
                  <h3 className="font-medium text-claude-neutral-700 dark:text-claude-neutral-300">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h3>
                  <span className="text-caption text-claude-neutral-500">({attrs.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attrs.map((attr) => (
                    <button
                      key={attr.key}
                      onClick={() => setEditingAttribute(attr)}
                      className={clsx(
                        'claude-card p-4 text-left hover:shadow-claude-lg hover:border-claude-primary-300',
                        'dark:hover:border-claude-primary-600 transition-all group'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-mono text-sm text-claude-primary-600 dark:text-claude-primary-400">
                          {attr.key}
                        </span>
                        <ConfidenceBadge confidence={attr.confidence} size="sm" />
                      </div>
                      <p className="text-claude-neutral-800 dark:text-claude-neutral-200 text-sm line-clamp-2">
                        {typeof attr.value === 'object'
                          ? Array.isArray(attr.value)
                            ? attr.value.join(', ')
                            : JSON.stringify(attr.value)
                          : String(attr.value)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full',
                          attr.source === 'explicit' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          attr.source === 'inferred' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                          attr.source === 'imported' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        )}>
                          {attr.source}
                        </span>
                        <span className="text-xs text-claude-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to edit
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
