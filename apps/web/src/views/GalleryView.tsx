/**
 * GalleryView - Artifact cards with previews
 * Visual grid of documents, diagrams, specs, code
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Image,
  Code2,
  FileJson,
  LayoutGrid,
  List,
  Search,
  SortAsc,
  Eye,
  Download,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Palette,
  FlaskConical,
  Settings,
} from 'lucide-react';
import type { Artifact } from '../data/enterprise-data';

interface GalleryViewProps {
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'created' | 'name' | 'type';
type FilterType = 'all' | Artifact['type'];

export function GalleryView({
  artifacts,
  onArtifactClick,
}: GalleryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort artifacts
  const filteredArtifacts = useMemo(() => {
    let result = [...artifacts];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(a => a.type === filterType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return result;
  }, [artifacts, filterType, searchQuery, sortBy]);

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: artifacts.length };
    artifacts.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return counts;
  }, [artifacts]);

  const typeIcons: Record<Artifact['type'], typeof FileText> = {
    document: FileText,
    diagram: Image,
    code: Code2,
    'api-spec': FileJson,
    'test-results': FlaskConical,
    design: Palette,
    prototype: LayoutGrid,
    config: Settings,
  };

  const typeColors: Record<Artifact['type'], string> = {
    document: 'text-blue-400 bg-blue-500/20',
    diagram: 'text-purple-400 bg-purple-500/20',
    code: 'text-green-400 bg-green-500/20',
    'api-spec': 'text-orange-400 bg-orange-500/20',
    'test-results': 'text-yellow-400 bg-yellow-500/20',
    design: 'text-pink-400 bg-pink-500/20',
    prototype: 'text-cyan-400 bg-cyan-500/20',
    config: 'text-gray-400 bg-gray-500/20',
  };

  const getReviewStatus = (artifact: Artifact) => {
    if (!artifact.reviews || artifact.reviews.length === 0) return null;

    const hasChangesRequested = artifact.reviews.some(r => r.status === 'changes-requested');
    const allApproved = artifact.reviews.every(r => r.status === 'approved');

    if (hasChangesRequested) return 'changes-requested';
    if (allApproved) return 'approved';
    return 'pending';
  };

  const filterTypes: FilterType[] = ['all', 'document', 'diagram', 'code', 'api-spec', 'test-results', 'design', 'prototype', 'config'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-claude-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-claude-neutral-800 rounded-lg p-0.5">
            {filterTypes.slice(0, 5).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={clsx(
                  'px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1',
                  filterType === type
                    ? 'bg-claude-neutral-700 text-claude-neutral-100'
                    : 'text-claude-neutral-400 hover:text-claude-neutral-200'
                )}
              >
                {type === 'all' ? (
                  'All'
                ) : (
                  <>
                    {(() => {
                      const Icon = typeIcons[type];
                      return <Icon className="w-3 h-3" />;
                    })()}
                  </>
                )}
                <span className="text-claude-neutral-500">
                  {typeCounts[type] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-claude-neutral-700 mx-2" />

          {/* Sort */}
          <div className="relative">
            <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors">
              <SortAsc className="w-4 h-4" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Created</option>
                <option value="name">Name</option>
                <option value="type">Type</option>
              </select>
            </button>
          </div>

          {/* View Mode */}
          <div className="flex bg-claude-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-claude-neutral-700 text-claude-neutral-100'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-claude-neutral-700 text-claude-neutral-100'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredArtifacts.map(artifact => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onClick={() => onArtifactClick?.(artifact)}
                reviewStatus={getReviewStatus(artifact)}
                typeIcons={typeIcons}
                typeColors={typeColors}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredArtifacts.map(artifact => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                onClick={() => onArtifactClick?.(artifact)}
                reviewStatus={getReviewStatus(artifact)}
                typeIcons={typeIcons}
                typeColors={typeColors}
              />
            ))}
          </div>
        )}

        {filteredArtifacts.length === 0 && (
          <div className="flex items-center justify-center h-64 text-claude-neutral-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-1">No artifacts found</p>
              <p className="text-sm">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create artifacts to see them here'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ArtifactCardProps {
  artifact: Artifact;
  onClick: () => void;
  reviewStatus: 'approved' | 'changes-requested' | 'pending' | null;
  typeIcons: Record<Artifact['type'], typeof FileText>;
  typeColors: Record<Artifact['type'], string>;
}

function ArtifactCard({ artifact, onClick, reviewStatus, typeIcons, typeColors }: ArtifactCardProps) {
  const Icon = typeIcons[artifact.type];

  return (
    <div
      onClick={onClick}
      className="group bg-claude-neutral-800 rounded-xl border border-claude-neutral-700 overflow-hidden cursor-pointer hover:border-claude-neutral-600 transition-all hover:shadow-lg"
    >
      {/* Preview */}
      <div className="aspect-video bg-claude-neutral-850 flex items-center justify-center relative overflow-hidden">
        {artifact.content ? (
          <div className="text-xs text-claude-neutral-500 p-3 font-mono line-clamp-5 overflow-hidden">
            {artifact.content.slice(0, 200)}...
          </div>
        ) : (
          <Icon className="w-12 h-12 text-claude-neutral-600" />
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button className="p-2 bg-claude-neutral-800 rounded-lg hover:bg-claude-neutral-700 transition-colors">
            <Eye className="w-4 h-4 text-claude-neutral-300" />
          </button>
          <button className="p-2 bg-claude-neutral-800 rounded-lg hover:bg-claude-neutral-700 transition-colors">
            <Download className="w-4 h-4 text-claude-neutral-300" />
          </button>
          <button className="p-2 bg-claude-neutral-800 rounded-lg hover:bg-claude-neutral-700 transition-colors">
            <ExternalLink className="w-4 h-4 text-claude-neutral-300" />
          </button>
        </div>

        {/* Review Badge */}
        {reviewStatus && (
          <div
            className={clsx(
              'absolute top-2 right-2 p-1 rounded-full',
              reviewStatus === 'approved' && 'bg-green-500',
              reviewStatus === 'changes-requested' && 'bg-orange-500',
              reviewStatus === 'pending' && 'bg-yellow-500'
            )}
          >
            {reviewStatus === 'approved' ? (
              <CheckCircle className="w-3 h-3 text-white" />
            ) : reviewStatus === 'changes-requested' ? (
              <AlertCircle className="w-3 h-3 text-white" />
            ) : (
              <Clock className="w-3 h-3 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className={clsx('p-1.5 rounded-lg', typeColors[artifact.type])}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-claude-neutral-200 truncate">
              {artifact.name}
            </h3>
            <p className="text-xs text-claude-neutral-500 capitalize">
              {artifact.type.replace('-', ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-claude-neutral-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(artifact.updatedAt).toLocaleDateString()}
          </div>
          {artifact.reviews && artifact.reviews.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {artifact.reviews.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ArtifactRowProps {
  artifact: Artifact;
  onClick: () => void;
  reviewStatus: 'approved' | 'changes-requested' | 'pending' | null;
  typeIcons: Record<Artifact['type'], typeof FileText>;
  typeColors: Record<Artifact['type'], string>;
}

function ArtifactRow({ artifact, onClick, reviewStatus, typeIcons, typeColors }: ArtifactRowProps) {
  const Icon = typeIcons[artifact.type];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-3 bg-claude-neutral-800 rounded-lg border border-claude-neutral-700 cursor-pointer hover:border-claude-neutral-600 transition-colors"
    >
      <div className={clsx('p-2 rounded-lg', typeColors[artifact.type])}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-claude-neutral-200">
          {artifact.name}
        </h3>
      </div>

      <div className="flex items-center gap-4 text-xs text-claude-neutral-500">
        <span className="capitalize">{artifact.type.replace('-', ' ')}</span>
        <span>{new Date(artifact.updatedAt).toLocaleDateString()}</span>

        {reviewStatus && (
          <span
            className={clsx(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              reviewStatus === 'approved' && 'bg-green-500/20 text-green-400',
              reviewStatus === 'changes-requested' && 'bg-orange-500/20 text-orange-400',
              reviewStatus === 'pending' && 'bg-yellow-500/20 text-yellow-400'
            )}
          >
            {reviewStatus === 'approved' ? (
              <CheckCircle className="w-3 h-3" />
            ) : reviewStatus === 'changes-requested' ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {reviewStatus === 'approved' ? 'Approved' : reviewStatus === 'changes-requested' ? 'Changes' : 'Pending'}
          </span>
        )}

        {artifact.reviews && artifact.reviews.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {artifact.reviews.length}
          </span>
        )}
      </div>
    </div>
  );
}
