/**
 * CodeHealthView - Monitor Code Health by Capability
 *
 * Dashboard for monitoring code health metrics linked to business
 * capabilities. Shows health scores, trends, and actionable issues.
 *
 * @prompt-id forge-v4.1:web:view:code-health:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Wrench,
  X,
} from 'lucide-react';
import { HealthGauge, HealthBar, HealthBadge } from '../components/codebase';
import { listRepositories, type Repository } from '../api/repositories';
import {
  getCodeHealthSummary,
  listCapabilityHealth,
  listHealthIssues,
  listCapabilityEvolutions,
  type CodeHealthSummary,
  type CapabilityHealth,
  type HealthIssue,
  type CapabilityEvolution,
  type TrendDirection,
} from '../api/codeHealth';

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  IMPROVING: <TrendingUp className="w-4 h-4 text-green-400" />,
  STABLE: <Minus className="w-4 h-4 text-gray-400" />,
  DECLINING: <TrendingDown className="w-4 h-4 text-red-400" />,
};

// Status icons and colors available via HealthBadge component

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: TrendDirection;
}) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && trendIcons[trend]}
      </div>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </div>
  );
}

function CapabilityHealthCard({
  health,
  isSelected,
  onClick,
}: {
  health: CapabilityHealth;
  isSelected: boolean;
  onClick: () => void;
}) {
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
      <div className="flex items-start gap-4">
        <HealthGauge score={health.healthScore} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium truncate">{health.capabilityName}</span>
            <HealthBadge status={health.status} size="sm" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
            <div>
              <span className="text-gray-500 block">Symbols</span>
              <span className="text-gray-300">{health.symbolCount}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Files</span>
              <span className="text-gray-300">{health.fileCount}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Complexity</span>
              <span className={clsx(
                health.avgComplexity > 15 ? 'text-red-400' :
                health.avgComplexity > 10 ? 'text-yellow-400' :
                'text-green-400'
              )}>
                {health.avgComplexity.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </div>
    </button>
  );
}

function IssueCard({ issue }: { issue: HealthIssue }) {
  const severityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className={clsx('p-3 rounded-lg border', severityColors[issue.severity])}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-sm">{issue.title}</span>
        <span className="text-xs uppercase">{issue.severity}</span>
      </div>
      <p className="text-xs opacity-80 mb-2">{issue.description}</p>
      <div className="flex items-center gap-2 text-xs opacity-60">
        <span>{issue.category}</span>
        <span>•</span>
        <span>{issue.capabilityName}</span>
      </div>
    </div>
  );
}

function EvolutionItem({ evolution }: { evolution: CapabilityEvolution }) {
  const typeColors: Record<CapabilityEvolution['evolutionType'], string> = {
    ADDED: 'text-green-400',
    MODIFIED: 'text-blue-400',
    REMOVED: 'text-red-400',
    REFACTORED: 'text-purple-400',
    SPLIT: 'text-yellow-400',
    MERGED: 'text-orange-400',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
      <div className={clsx('mt-0.5', typeColors[evolution.evolutionType])}>
        {evolution.evolutionType === 'ADDED' && <TrendingUp className="w-4 h-4" />}
        {evolution.evolutionType === 'REMOVED' && <TrendingDown className="w-4 h-4" />}
        {['MODIFIED', 'REFACTORED', 'SPLIT', 'MERGED'].includes(evolution.evolutionType) && (
          <Activity className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-white font-medium truncate">
            {evolution.capabilityName}
          </span>
          <span className={clsx('text-xs', typeColors[evolution.evolutionType])}>
            {evolution.evolutionType}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-1">{evolution.description}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{evolution.author}</span>
          <span>•</span>
          <span>{new Date(evolution.detectedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function CapabilityDetailPanel({
  health,
  onClose,
}: {
  health: CapabilityHealth;
  onClose: () => void;
}) {
  return (
    <div className="w-[420px] h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <span className="text-white font-medium truncate">{health.capabilityName}</span>
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
        {/* Health Overview */}
        <div className="flex items-center justify-center py-4">
          <HealthGauge
            score={health.healthScore}
            status={health.status}
            label="Overall Health"
            size="lg"
          />
        </div>

        {/* Metrics */}
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Metrics</span>
          <div className="space-y-3">
            <HealthBar score={health.metrics.codeQuality} label="Code Quality" />
            <HealthBar score={health.metrics.maintainability} label="Maintainability" />
            <HealthBar score={health.metrics.testability} label="Testability" />
            <HealthBar score={health.metrics.documentation} label="Documentation" />
            <HealthBar score={health.metrics.stability} label="Stability" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Symbols</span>
            <span className="text-lg font-bold text-white">{health.symbolCount}</span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Files</span>
            <span className="text-lg font-bold text-white">{health.fileCount}</span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Avg Complexity</span>
            <span className={clsx(
              'text-lg font-bold',
              health.avgComplexity > 15 ? 'text-red-400' :
              health.avgComplexity > 10 ? 'text-yellow-400' : 'text-green-400'
            )}>
              {health.avgComplexity.toFixed(1)}
            </span>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <span className="text-xs text-gray-500 block mb-1">Max Complexity</span>
            <span className={clsx(
              'text-lg font-bold',
              health.maxComplexity > 30 ? 'text-red-400' :
              health.maxComplexity > 20 ? 'text-yellow-400' : 'text-green-400'
            )}>
              {health.maxComplexity}
            </span>
          </div>
        </div>

        {/* Coverage */}
        {(health.testCoverage !== undefined || health.docCoverage !== undefined) && (
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-3">Coverage</span>
            <div className="grid grid-cols-2 gap-3">
              {health.testCoverage !== undefined && (
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Test Coverage</span>
                  <span className={clsx(
                    'text-lg font-bold',
                    health.testCoverage >= 80 ? 'text-green-400' :
                    health.testCoverage >= 50 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {Math.round(health.testCoverage)}%
                  </span>
                </div>
              )}
              {health.docCoverage !== undefined && (
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">Doc Coverage</span>
                  <span className={clsx(
                    'text-lg font-bold',
                    health.docCoverage >= 70 ? 'text-green-400' :
                    health.docCoverage >= 40 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {Math.round(health.docCoverage)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Debt */}
        {health.technicalDebtHours !== undefined && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-300">Technical Debt</span>
            </div>
            <span className="text-2xl font-bold text-orange-400">
              {health.technicalDebtHours}h
            </span>
            <span className="text-sm text-orange-300 ml-2">estimated to resolve</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CodeHealthView() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [summary, setSummary] = useState<CodeHealthSummary | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityHealth[]>([]);
  const [issues, setIssues] = useState<HealthIssue[]>([]);
  const [evolutions, setEvolutions] = useState<CapabilityEvolution[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<CapabilityHealth | null>(null);
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
      }
    }
    loadRepos();
  }, []);

  // Load health data
  useEffect(() => {
    if (!selectedRepoId) {
      setLoading(false);
      return;
    }

    async function loadHealth() {
      setLoading(true);
      try {
        const [summaryData, capsData, issuesData, evolutionsData] = await Promise.all([
          getCodeHealthSummary(selectedRepoId),
          listCapabilityHealth(selectedRepoId, { limit: 50 }),
          listHealthIssues(selectedRepoId, { limit: 10 }),
          listCapabilityEvolutions(selectedRepoId, { limit: 10 }),
        ]);
        setSummary(summaryData);
        setCapabilities(capsData.data);
        setIssues(issuesData.data);
        setEvolutions(evolutionsData.data);
      } catch (error) {
        console.error('Failed to load health data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHealth();
  }, [selectedRepoId]);

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
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
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-4 gap-4">
              <SummaryCard
                title="Overall Health"
                value={`${Math.round(summary.overallHealth)}%`}
                icon={<HealthGauge score={summary.overallHealth} size="sm" showPercentage={false} />}
                trend={summary.trend}
              />
              <SummaryCard
                title="Capabilities"
                value={summary.capabilityCount}
                subtitle={`${summary.healthyCapabilities} healthy`}
                icon={<Activity className="w-5 h-5 text-blue-400" />}
              />
              <SummaryCard
                title="Warnings"
                value={summary.warningCapabilities}
                icon={<AlertCircle className="w-5 h-5 text-yellow-400" />}
              />
              <SummaryCard
                title="Critical"
                value={summary.criticalCapabilities}
                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedRepoId ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Repository</h3>
              <p className="text-gray-500">Choose a repository to view health metrics</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* Capabilities List */}
              <div className="col-span-2 space-y-4">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Capability Health ({capabilities.length})
                </h3>
                {capabilities.length > 0 ? (
                  <div className="space-y-2">
                    {capabilities.map(cap => (
                      <CapabilityHealthCard
                        key={cap.id}
                        health={cap}
                        isSelected={selectedCapability?.id === cap.id}
                        onClick={() => setSelectedCapability(cap)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No capability health data available
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Recent Issues */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                    Recent Issues ({issues.length})
                  </h3>
                  {issues.length > 0 ? (
                    <div className="space-y-2">
                      {issues.slice(0, 5).map(issue => (
                        <IssueCard key={issue.id} issue={issue} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-4 text-center bg-gray-800/30 rounded-lg">
                      No issues detected
                    </div>
                  )}
                </div>

                {/* Recent Evolutions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                    Recent Changes ({evolutions.length})
                  </h3>
                  {evolutions.length > 0 ? (
                    <div className="space-y-2">
                      {evolutions.slice(0, 5).map(evolution => (
                        <EvolutionItem key={evolution.id} evolution={evolution} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-4 text-center bg-gray-800/30 rounded-lg">
                      No recent changes
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedCapability && (
        <CapabilityDetailPanel
          health={selectedCapability}
          onClose={() => setSelectedCapability(null)}
        />
      )}
    </div>
  );
}

export default CodeHealthView;
