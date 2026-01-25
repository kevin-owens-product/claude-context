/**
 * HotspotsView - Identify High-Churn Code Areas
 *
 * Analyze code hotspots - files with high change frequency
 * and complexity that may need attention or refactoring.
 *
 * @prompt-id forge-v4.1:web:view:hotspots:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Flame,
  AlertTriangle,
  FileCode,
  Users,
  GitCommit,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { HotspotScatter } from '../components/codebase';
import {
  listRepositories,
  getHotspots,
  type Repository,
  type Hotspot,
} from '../api/repositories';

type TimeRange = '7d' | '30d' | '90d' | '1y';

const timeRangeLabels: Record<TimeRange, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
};

const timeRangeDays: Record<TimeRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

function RiskBadge({ score }: { score: number }) {
  const level = score < 30 ? 'low' : score < 60 ? 'medium' : score < 80 ? 'high' : 'critical';
  const colors = {
    low: 'text-green-400 bg-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/20',
    high: 'text-orange-400 bg-orange-500/20',
    critical: 'text-red-400 bg-red-500/20',
  };

  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', colors[level])}>
      Risk: {Math.round(score)}
    </span>
  );
}

function HotspotRow({
  hotspot,
  rank,
  isSelected,
  onClick,
}: {
  hotspot: Hotspot;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const fileName = hotspot.path.split('/').pop() || hotspot.path;
  const dirPath = hotspot.path.split('/').slice(0, -1).join('/');

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 p-4 text-left rounded-lg border transition-all',
        isSelected
          ? 'bg-orange-500/10 border-orange-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
      )}
    >
      {/* Rank */}
      <span className={clsx(
        'w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm',
        rank <= 3 ? 'bg-red-500/20 text-red-400' :
        rank <= 10 ? 'bg-orange-500/20 text-orange-400' :
        'bg-gray-700 text-gray-400'
      )}>
        {rank}
      </span>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <FileCode className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-white font-medium truncate">{fileName}</span>
          <RiskBadge score={hotspot.riskScore} />
        </div>
        <div className="text-xs text-gray-500 truncate">{dirPath || '/'}</div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-white font-medium">{hotspot.changeCount}</div>
          <div className="text-xs text-gray-500">changes</div>
        </div>
        <div className="text-center">
          <div className="text-white font-medium">{hotspot.uniqueAuthors}</div>
          <div className="text-xs text-gray-500">authors</div>
        </div>
        {hotspot.complexity !== undefined && (
          <div className="text-center">
            <div className={clsx(
              'font-medium',
              hotspot.complexity > 20 ? 'text-red-400' :
              hotspot.complexity > 10 ? 'text-yellow-400' :
              'text-green-400'
            )}>
              {hotspot.complexity}
            </div>
            <div className="text-xs text-gray-500">complexity</div>
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-500" />
    </button>
  );
}

function HotspotDetailPanel({
  hotspot,
  onClose,
}: {
  hotspot: Hotspot;
  onClose: () => void;
}) {
  const fileName = hotspot.path.split('/').pop() || hotspot.path;

  return (
    <div className="w-96 h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <span className="text-white font-medium truncate">{fileName}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Risk Score */}
        <div className="text-center py-4">
          <div className={clsx(
            'text-5xl font-bold mb-2',
            hotspot.riskScore > 80 ? 'text-red-400' :
            hotspot.riskScore > 60 ? 'text-orange-400' :
            hotspot.riskScore > 30 ? 'text-yellow-400' :
            'text-green-400'
          )}>
            {Math.round(hotspot.riskScore)}
          </div>
          <div className="text-sm text-gray-500">Risk Score</div>
        </div>

        {/* Path */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Path</span>
          <code className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded block truncate">
            {hotspot.path}
          </code>
        </div>

        {/* Metrics */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Metrics</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <GitCommit className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Changes</span>
              </div>
              <span className="text-lg font-bold text-white">{hotspot.changeCount}</span>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-500">Authors</span>
              </div>
              <span className="text-lg font-bold text-white">{hotspot.uniqueAuthors}</span>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-500">Avg Changes</span>
              </div>
              <span className="text-lg font-bold text-white">
                {hotspot.avgChangesPerCommit.toFixed(1)}
              </span>
            </div>
            {hotspot.complexity !== undefined && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-500">Complexity</span>
                </div>
                <span className="text-lg font-bold text-white">{hotspot.complexity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Risk Analysis */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Risk Analysis</span>
          <div className="space-y-2">
            {hotspot.changeCount > 15 && (
              <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-orange-300">High change frequency indicates instability</span>
              </div>
            )}
            {hotspot.uniqueAuthors > 5 && (
              <div className="flex items-start gap-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded text-sm">
                <Users className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span className="text-purple-300">Many contributors - consider ownership clarity</span>
              </div>
            )}
            {hotspot.complexity !== undefined && hotspot.complexity > 20 && (
              <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm">
                <BarChart3 className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-red-300">High complexity - consider refactoring</span>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Recommendations</span>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Review recent changes for potential issues
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Consider breaking into smaller modules
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Add or improve test coverage
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Document complex sections
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HotspotsView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'scatter'>('list');
  const [loading, setLoading] = useState(true);

  // Load repositories
  useEffect(() => {
    async function loadRepos() {
      try {
        const result = await listRepositories({ status: 'ACTIVE' });
        setRepositories(result.data);
        if (result.data.length > 0 && !selectedRepoId) {
          setSelectedRepoId(result.data[0].id);
        }
      } catch (error) {
        console.error('Failed to load repositories:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, []);

  // Load hotspots
  useEffect(() => {
    if (!selectedRepoId) return;

    async function loadHotspots() {
      setLoading(true);
      try {
        const result = await getHotspots(selectedRepoId, {
          days: timeRangeDays[timeRange],
          limit: 50,
        });
        setHotspots(result.data);
      } catch (error) {
        console.error('Failed to load hotspots:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHotspots();
  }, [selectedRepoId, timeRange]);

  // Summary stats
  const stats = useMemo(() => {
    if (hotspots.length === 0) return null;

    const critical = hotspots.filter(h => h.riskScore >= 80).length;
    const high = hotspots.filter(h => h.riskScore >= 60 && h.riskScore < 80).length;
    const medium = hotspots.filter(h => h.riskScore >= 30 && h.riskScore < 60).length;
    const avgRisk = hotspots.reduce((sum, h) => sum + h.riskScore, 0) / hotspots.length;

    return { critical, high, medium, avgRisk };
  }, [hotspots]);

  if (loading && repositories.length === 0) {
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
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white"
              >
                <option value="">Select repository...</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>{repo.name}</option>
                ))}
              </select>

              {/* Time Range */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                {(Object.keys(timeRangeLabels) as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={clsx(
                      'px-3 py-1.5 rounded text-sm transition-colors',
                      timeRange === range
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {timeRangeLabels[range]}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'px-3 py-1.5 rounded text-sm transition-colors',
                  viewMode === 'list'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('scatter')}
                className={clsx(
                  'px-3 py-1.5 rounded text-sm transition-colors',
                  viewMode === 'scatter'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Scatter
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {stats && (
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-gray-500 block">Hotspots</span>
                <span className="text-2xl font-bold text-white">{hotspots.length}</span>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div>
                <span className="text-xs text-gray-500 block">Avg Risk</span>
                <span className={clsx(
                  'text-2xl font-bold',
                  stats.avgRisk > 60 ? 'text-red-400' :
                  stats.avgRisk > 30 ? 'text-yellow-400' :
                  'text-green-400'
                )}>
                  {Math.round(stats.avgRisk)}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-700" />
              <div className="flex gap-3">
                <span className="text-sm">
                  <span className="text-red-400 font-bold">{stats.critical}</span>
                  <span className="text-gray-500"> critical</span>
                </span>
                <span className="text-sm">
                  <span className="text-orange-400 font-bold">{stats.high}</span>
                  <span className="text-gray-500"> high</span>
                </span>
                <span className="text-sm">
                  <span className="text-yellow-400 font-bold">{stats.medium}</span>
                  <span className="text-gray-500"> medium</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedRepoId ? (
            <div className="text-center py-12">
              <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Repository</h3>
              <p className="text-gray-500">Choose a repository to analyze hotspots</p>
            </div>
          ) : hotspots.length === 0 ? (
            <div className="text-center py-12">
              <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Hotspots Found</h3>
              <p className="text-gray-500">No high-churn files detected in this time range</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {hotspots.map((hotspot, index) => (
                <HotspotRow
                  key={hotspot.fileId}
                  hotspot={hotspot}
                  rank={index + 1}
                  isSelected={selectedHotspot?.fileId === hotspot.fileId}
                  onClick={() => setSelectedHotspot(hotspot)}
                />
              ))}
            </div>
          ) : (
            <HotspotScatter
              hotspots={hotspots}
              selectedPath={selectedHotspot?.path}
              onSelectHotspot={setSelectedHotspot}
              className="h-full"
            />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedHotspot && (
        <HotspotDetailPanel
          hotspot={selectedHotspot}
          onClose={() => setSelectedHotspot(null)}
        />
      )}
    </div>
  );
}

export default HotspotsView;
