/**
 * CapabilityMapView - What The System Can Do
 *
 * A visual map of capabilities, their maturity, effectiveness,
 * and gaps. Shows what the system can actually deliver.
 *
 * @prompt-id forge-v4.1:web:view:capability-map:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect } from 'react';
import {
  listCapabilities,
  getCapabilitySummary,
  type Capability,
  type CapabilitySummary,
  type CapabilityStatus,
  type MaturityLevel,
  type GapSeverity,
} from '../api/capabilities';

const statusColors: Record<CapabilityStatus, string> = {
  CONCEPT: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  DEVELOPMENT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  TESTING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ACTIVE: 'bg-green-500/20 text-green-300 border-green-500/30',
  DEPRECATED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  RETIRED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const maturityLevels: MaturityLevel[] = ['INITIAL', 'REPEATABLE', 'DEFINED', 'MANAGED', 'OPTIMIZING'];
const maturityColors: Record<MaturityLevel, string> = {
  INITIAL: 'bg-red-500',
  REPEATABLE: 'bg-orange-500',
  DEFINED: 'bg-yellow-500',
  MANAGED: 'bg-blue-500',
  OPTIMIZING: 'bg-green-500',
};

const severityColors: Record<GapSeverity, string> = {
  low: 'bg-blue-500/20 text-blue-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  high: 'bg-orange-500/20 text-orange-300',
  critical: 'bg-red-500/20 text-red-400',
};

function MaturityBar({ level }: { level: MaturityLevel }) {
  const levelIndex = maturityLevels.indexOf(level);

  return (
    <div className="flex gap-1">
      {maturityLevels.map((l, i) => (
        <div
          key={l}
          className={`w-3 h-3 rounded ${i <= levelIndex ? maturityColors[level] : 'bg-gray-700'}`}
          title={l}
        />
      ))}
    </div>
  );
}

function EffectivenessGauge({ value }: { value: number }) {
  const percentage = Math.round(value * 100);

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 transform -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-gray-700"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${(percentage / 100) * 176} 176`}
          strokeLinecap="round"
          className={percentage >= 70 ? 'text-green-500' : percentage >= 40 ? 'text-yellow-500' : 'text-red-500'}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
}

function GapBadge({ gaps }: { gaps: Capability['gaps'] }) {
  if (!gaps || gaps.length === 0) return null;

  const openGaps = gaps.filter(g => !g.resolvedAt);
  if (openGaps.length === 0) return null;

  const criticalCount = openGaps.filter(g => g.severity === 'critical').length;
  const highCount = openGaps.filter(g => g.severity === 'high').length;

  return (
    <div className="flex items-center gap-1">
      {criticalCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
          {criticalCount} critical
        </span>
      )}
      {highCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-300 rounded">
          {highCount} high
        </span>
      )}
      {openGaps.length > criticalCount + highCount && (
        <span className="px-1.5 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
          +{openGaps.length - criticalCount - highCount}
        </span>
      )}
    </div>
  );
}

function CapabilityCard({ capability, onClick }: { capability: Capability; onClick: () => void }) {
  const openGaps = capability.gaps?.filter(g => !g.resolvedAt) || [];

  return (
    <div
      className={`p-4 bg-gray-800/50 rounded-lg border ${
        openGaps.some(g => g.severity === 'critical')
          ? 'border-red-500/50'
          : 'border-gray-700 hover:border-gray-600'
      } cursor-pointer transition-all hover:bg-gray-800`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <EffectivenessGauge value={capability.effectivenessScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded border ${statusColors[capability.status]}`}>
              {capability.status}
            </span>
            <GapBadge gaps={capability.gaps} />
          </div>
          <h3 className="text-sm font-medium text-white truncate">{capability.name}</h3>
          <p className="text-xs text-gray-400 line-clamp-2 mt-1">{capability.provides}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-500 block mb-1">Maturity</span>
          <MaturityBar level={capability.maturityLevel} />
        </div>
        {capability.usage && capability.usage.length > 0 && (
          <div className="text-right">
            <span className="text-xs text-gray-500 block mb-1">Success Rate</span>
            <span className={`text-sm font-medium ${
              capability.usage[0].successRate >= 0.9 ? 'text-green-400' :
              capability.usage[0].successRate >= 0.7 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {Math.round(capability.usage[0].successRate * 100)}%
            </span>
          </div>
        )}
      </div>

      {capability.valueDelivered && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex gap-3">
          {capability.valueDelivered.timeSaved && (
            <div className="text-xs">
              <span className="text-gray-500">Time saved: </span>
              <span className="text-green-400">{capability.valueDelivered.timeSaved}h</span>
            </div>
          )}
          {capability.valueDelivered.errorsPrevented && (
            <div className="text-xs">
              <span className="text-gray-500">Errors prevented: </span>
              <span className="text-blue-400">{capability.valueDelivered.errorsPrevented}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CapabilityDetailPanel({ capability, onClose }: { capability: Capability; onClose: () => void }) {
  const openGaps = capability.gaps?.filter(g => !g.resolvedAt) || [];
  const resolvedGaps = capability.gaps?.filter(g => g.resolvedAt) || [];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-gray-900 border-l border-gray-700 shadow-xl overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
        <h2 className="font-semibold text-white">Capability Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded border ${statusColors[capability.status]}`}>
              {capability.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{capability.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{capability.description}</p>
        </div>

        {/* What it provides */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Provides</h4>
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-400">
            {capability.provides}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-500 block mb-2">Effectiveness</span>
            <EffectivenessGauge value={capability.effectivenessScore} />
          </div>
          <div className="p-4 bg-gray-800 rounded-lg">
            <span className="text-xs text-gray-500 block mb-2">Maturity</span>
            <div className="text-lg font-bold text-white mb-1">{capability.maturityLevel}</div>
            <MaturityBar level={capability.maturityLevel} />
          </div>
        </div>

        {/* Usage Stats */}
        {capability.usage && capability.usage.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Usage (Latest Period)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-800 rounded">
                <span className="text-xs text-gray-500 block">Invocations</span>
                <span className="text-sm text-white font-medium">
                  {capability.usage[0].invocations.toLocaleString()}
                </span>
              </div>
              <div className="p-2 bg-gray-800 rounded">
                <span className="text-xs text-gray-500 block">Success Rate</span>
                <span className={`text-sm font-medium ${
                  capability.usage[0].successRate >= 0.9 ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {Math.round(capability.usage[0].successRate * 100)}%
                </span>
              </div>
              <div className="p-2 bg-gray-800 rounded">
                <span className="text-xs text-gray-500 block">Avg Duration</span>
                <span className="text-sm text-white font-medium">
                  {capability.usage[0].avgDuration}ms
                </span>
              </div>
              <div className="p-2 bg-gray-800 rounded">
                <span className="text-xs text-gray-500 block">P95 Duration</span>
                <span className="text-sm text-white font-medium">
                  {capability.usage[0].p95Duration}ms
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Gaps */}
        {(openGaps.length > 0 || resolvedGaps.length > 0) && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              Gaps ({openGaps.length} open, {resolvedGaps.length} resolved)
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {openGaps.map((gap, i) => (
                <div key={i} className={`p-2 rounded ${severityColors[gap.severity]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase font-medium">{gap.severity}</span>
                    <span className="text-xs opacity-75">
                      {new Date(gap.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{gap.description}</p>
                  {gap.suggestedFix && (
                    <p className="text-xs mt-1 opacity-75">Fix: {gap.suggestedFix}</p>
                  )}
                </div>
              ))}
              {openGaps.length === 0 && resolvedGaps.length > 0 && (
                <p className="text-sm text-green-400">All gaps resolved!</p>
              )}
            </div>
          </div>
        )}

        {/* Limitations */}
        {capability.limitations && capability.limitations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Limitations</h4>
            <ul className="space-y-1">
              {capability.limitations.map((limit, i) => (
                <li key={i} className="text-sm text-orange-400 flex items-start gap-2">
                  <span>⚠</span>
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Assumptions */}
        {capability.assumptions && capability.assumptions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Assumptions</h4>
            <ul className="space-y-1">
              {capability.assumptions.map((assumption, i) => (
                <li key={i} className="text-sm text-blue-400 flex items-start gap-2">
                  <span>→</span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Value Delivered */}
        {capability.valueDelivered && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Value Delivered</h4>
            <div className="grid grid-cols-2 gap-2">
              {capability.valueDelivered.timeSaved && (
                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                  <span className="text-xs text-green-400 block">Time Saved</span>
                  <span className="text-lg font-bold text-green-400">
                    {capability.valueDelivered.timeSaved}h
                  </span>
                </div>
              )}
              {capability.valueDelivered.errorsPrevented && (
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                  <span className="text-xs text-blue-400 block">Errors Prevented</span>
                  <span className="text-lg font-bold text-blue-400">
                    {capability.valueDelivered.errorsPrevented}
                  </span>
                </div>
              )}
              {capability.valueDelivered.revenueGenerated && (
                <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                  <span className="text-xs text-purple-400 block">Revenue</span>
                  <span className="text-lg font-bold text-purple-400">
                    ${capability.valueDelivered.revenueGenerated.toLocaleString()}
                  </span>
                </div>
              )}
              {capability.valueDelivered.costReduced && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <span className="text-xs text-yellow-400 block">Cost Reduced</span>
                  <span className="text-lg font-bold text-yellow-400">
                    ${capability.valueDelivered.costReduced.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {capability.dependsOn && capability.dependsOn.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Depends On</h4>
            <div className="flex flex-wrap gap-2">
              {capability.dependsOn.map((dep, i) => (
                <span key={i} className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MaturityOverview({ summary }: { summary: CapabilitySummary }) {
  const total = Object.values(summary.byMaturity).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Maturity Distribution</h3>
      <div className="flex h-4 rounded overflow-hidden mb-2">
        {maturityLevels.map((level) => {
          const count = summary.byMaturity[level] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          if (percentage === 0) return null;
          return (
            <div
              key={level}
              className={maturityColors[level]}
              style={{ width: `${percentage}%` }}
              title={`${level}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Initial</span>
        <span>Optimizing</span>
      </div>
    </div>
  );
}

export function CapabilityMapView() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [summary, setSummary] = useState<CapabilitySummary | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null);
  const [statusFilter, setStatusFilter] = useState<CapabilityStatus | ''>('');
  const [maturityFilter, setMaturityFilter] = useState<MaturityLevel | ''>('');
  const [showGapsOnly, setShowGapsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [capsResult, summaryResult] = await Promise.all([
          listCapabilities({ limit: 100 }),
          getCapabilitySummary(),
        ]);
        setCapabilities(capsResult.data);
        setSummary(summaryResult);
      } catch (error) {
        console.error('Failed to load capabilities:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCapabilities = capabilities.filter(cap => {
    if (statusFilter && cap.status !== statusFilter) return false;
    if (maturityFilter && cap.maturityLevel !== maturityFilter) return false;
    if (showGapsOnly && (!cap.gaps || cap.gaps.filter(g => !g.resolvedAt).length === 0)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading capabilities...</div>
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
              <span className="text-xs text-gray-500 block">Total</span>
              <span className="text-2xl font-bold text-white">{summary.totalCapabilities}</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Avg Effectiveness</span>
              <span className="text-2xl font-bold text-green-400">
                {Math.round(summary.averageEffectiveness * 100)}%
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Open Gaps</span>
              <span className={`text-2xl font-bold ${summary.totalGaps > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                {summary.totalGaps}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex-1 max-w-xs">
              <MaturityOverview summary={summary} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 flex gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CapabilityStatus | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          <option value="CONCEPT">Concept</option>
          <option value="DEVELOPMENT">Development</option>
          <option value="TESTING">Testing</option>
          <option value="ACTIVE">Active</option>
          <option value="DEPRECATED">Deprecated</option>
          <option value="RETIRED">Retired</option>
        </select>
        <select
          value={maturityFilter}
          onChange={(e) => setMaturityFilter(e.target.value as MaturityLevel | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Maturity</option>
          {maturityLevels.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showGapsOnly}
            onChange={(e) => setShowGapsOnly(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700"
          />
          Has Gaps
        </label>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCapabilities.map((capability) => (
            <CapabilityCard
              key={capability.id}
              capability={capability}
              onClick={() => setSelectedCapability(capability)}
            />
          ))}
          {filteredCapabilities.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No capabilities match your filters
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedCapability && (
        <CapabilityDetailPanel
          capability={selectedCapability}
          onClose={() => setSelectedCapability(null)}
        />
      )}
    </div>
  );
}

export default CapabilityMapView;
