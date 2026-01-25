/**
 * RepositoriesView - Repository Management Dashboard
 *
 * Entry point for code intelligence - manage tracked repositories,
 * monitor sync status, and view repository stats.
 *
 * @prompt-id forge-v4.1:web:view:repositories:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  GitBranch,
  RefreshCw,
  Plus,
  Search,
  FileCode,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Database,
} from 'lucide-react';
import {
  listRepositories,
  getRepositorySummary,
  syncRepository,
  deleteRepository,
  type Repository,
  type RepositorySummary,
  type RepoStatus,
} from '../api/repositories';

const statusConfig: Record<RepoStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  PENDING: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: <Clock className="w-4 h-4" /> },
  CLONING: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  ACTIVE: { color: 'text-green-400', bg: 'bg-green-500/20', icon: <CheckCircle className="w-4 h-4" /> },
  SYNCING: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
  ERROR: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <AlertCircle className="w-4 h-4" /> },
  ARCHIVED: { color: 'text-gray-500', bg: 'bg-gray-600/20', icon: <Database className="w-4 h-4" /> },
};

function RepositoryCard({
  repository,
  onSync,
  onDelete,
  onSelect,
}: {
  repository: Repository;
  onSync: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const status = statusConfig[repository.status];
  const isLoading = repository.status === 'CLONING' || repository.status === 'SYNCING';

  return (
    <div
      className={clsx(
        'p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600',
        'cursor-pointer transition-all hover:bg-gray-800'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-white">{repository.name}</h3>
        </div>
        <span className={clsx('flex items-center gap-1.5 px-2 py-0.5 rounded text-xs', status.bg, status.color)}>
          {status.icon}
          {repository.status}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-3 truncate">{repository.url}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5" />
          <span>{repository.fileCount.toLocaleString()} files</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{repository.symbolCount.toLocaleString()} symbols</span>
        </div>
        <div className="flex items-center gap-1">
          <span>branch: {repository.defaultBranch}</span>
        </div>
      </div>

      {repository.lastSyncAt && (
        <div className="text-xs text-gray-500 mb-3">
          Last synced: {new Date(repository.lastSyncAt).toLocaleString()}
        </div>
      )}

      {repository.errorMessage && (
        <div className="text-xs text-red-400 mb-3 bg-red-500/10 px-2 py-1 rounded">
          {repository.errorMessage}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(repository.url, '_blank');
          }}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Open in GitHub"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSync();
          }}
          disabled={isLoading}
          className={clsx(
            'p-1.5 rounded transition-colors',
            isLoading
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
          title="Sync repository"
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this repository?')) {
              onDelete();
            }
          }}
          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
          title="Delete repository"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AddRepositoryModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, name: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      const repoName = name || url.split('/').pop()?.replace('.git', '') || 'repository';
      onAdd(url, repoName);
      setUrl('');
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-white mb-4">Add Repository</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Repository URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Repository"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add Repository
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RepositoriesView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [summary, setSummary] = useState<RepositorySummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<RepoStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [reposResult, summaryResult] = await Promise.all([
          listRepositories({ limit: 100 }),
          getRepositorySummary(),
        ]);
        setRepositories(reposResult.data);
        setSummary(summaryResult);
      } catch (error) {
        console.error('Failed to load repositories:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredRepositories = useMemo(() => {
    return repositories.filter(repo => {
      if (statusFilter && repo.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          repo.name.toLowerCase().includes(query) ||
          repo.url.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [repositories, statusFilter, searchQuery]);

  const handleSync = async (repoId: string) => {
    try {
      await syncRepository(repoId);
      setRepositories(prev =>
        prev.map(r =>
          r.id === repoId ? { ...r, status: 'SYNCING' as RepoStatus } : r
        )
      );
    } catch (error) {
      console.error('Failed to sync repository:', error);
    }
  };

  const handleDelete = async (repoId: string) => {
    try {
      await deleteRepository(repoId);
      setRepositories(prev => prev.filter(r => r.id !== repoId));
    } catch (error) {
      console.error('Failed to delete repository:', error);
    }
  };

  const handleAddRepository = async (url: string, name: string) => {
    // In a real app, this would call createRepository API
    console.log('Adding repository:', { url, name });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading repositories...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary Bar */}
      {summary && (
        <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500 block">Repositories</span>
              <span className="text-2xl font-bold text-white">{summary.totalRepositories}</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Total Files</span>
              <span className="text-2xl font-bold text-blue-400">
                {summary.totalFiles.toLocaleString()}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Total Symbols</span>
              <span className="text-2xl font-bold text-purple-400">
                {summary.totalSymbols.toLocaleString()}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex-1">
              <span className="text-xs text-gray-500 block mb-1">By Status</span>
              <div className="flex gap-3 text-xs">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                  <span key={status} className={clsx(statusConfig[status as RepoStatus].color)}>
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 flex gap-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RepoStatus | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SYNCING">Syncing</option>
          <option value="CLONING">Cloning</option>
          <option value="PENDING">Pending</option>
          <option value="ERROR">Error</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Repository
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredRepositories.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No repositories found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Add a repository to get started with code intelligence'}
            </p>
            {!searchQuery && !statusFilter && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Add Repository
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRepositories.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repository={repo}
                onSync={() => handleSync(repo.id)}
                onDelete={() => handleDelete(repo.id)}
                onSelect={() => console.log('Selected:', repo.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddRepository}
      />
    </div>
  );
}

export default RepositoriesView;
