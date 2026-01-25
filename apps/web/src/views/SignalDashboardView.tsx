/**
 * SignalDashboardView - Continuous Evidence Streams
 *
 * Real-time monitoring of signals that measure intent fulfillment
 * and capability effectiveness. The pulse of Living Software.
 *
 * @prompt-id forge-v4.1:web:view:signal-dashboard:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect } from 'react';
import {
  listSignals,
  getSignalDashboard,
  getSignalsNeedingAttention,
  type Signal,
  type SignalDashboard,
  type SignalHealth,
  type SignalType,
  type SignalTrend,
} from '../api/signals';

const healthColors: Record<SignalHealth, string> = {
  EXCELLENT: 'bg-green-500',
  GOOD: 'bg-green-400',
  WARNING: 'bg-yellow-500',
  CRITICAL: 'bg-red-500',
  UNKNOWN: 'bg-gray-500',
};

const healthTextColors: Record<SignalHealth, string> = {
  EXCELLENT: 'text-green-400',
  GOOD: 'text-green-300',
  WARNING: 'text-yellow-400',
  CRITICAL: 'text-red-400',
  UNKNOWN: 'text-gray-400',
};

const trendIcons: Record<SignalTrend, string> = {
  IMPROVING: '↗',
  STABLE: '→',
  DECLINING: '↘',
  VOLATILE: '↕',
};

const trendColors: Record<SignalTrend, string> = {
  IMPROVING: 'text-green-400',
  STABLE: 'text-gray-400',
  DECLINING: 'text-red-400',
  VOLATILE: 'text-yellow-400',
};

const typeLabels: Record<SignalType, string> = {
  USAGE: 'Usage',
  PERFORMANCE: 'Performance',
  ERROR_RATE: 'Error Rate',
  SATISFACTION: 'Satisfaction',
  CONVERSION: 'Conversion',
  RETENTION: 'Retention',
  ENGAGEMENT: 'Engagement',
  VALUE: 'Value',
};

const typeColors: Record<SignalType, string> = {
  USAGE: 'bg-blue-500/20 text-blue-300',
  PERFORMANCE: 'bg-orange-500/20 text-orange-300',
  ERROR_RATE: 'bg-red-500/20 text-red-300',
  SATISFACTION: 'bg-pink-500/20 text-pink-300',
  CONVERSION: 'bg-purple-500/20 text-purple-300',
  RETENTION: 'bg-green-500/20 text-green-300',
  ENGAGEMENT: 'bg-cyan-500/20 text-cyan-300',
  VALUE: 'bg-yellow-500/20 text-yellow-300',
};

function MiniSparkline({ values, health }: { values: number[]; health: SignalHealth }) {
  if (!values || values.length < 2) {
    return <div className="w-20 h-8 bg-gray-800 rounded" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = {
    EXCELLENT: '#22c55e',
    GOOD: '#4ade80',
    WARNING: '#eab308',
    CRITICAL: '#ef4444',
    UNKNOWN: '#6b7280',
  }[health];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HealthIndicator({ health }: { health: SignalHealth }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${healthColors[health]} animate-pulse`} />
      <span className={`text-sm ${healthTextColors[health]}`}>{health}</span>
    </div>
  );
}

function SignalCard({ signal, onClick }: { signal: Signal; onClick: () => void }) {
  // Generate mock sparkline data (in production, this would come from the API)
  const mockSparkline = Array.from({ length: 20 }, () =>
    (signal.currentValue || 0) * (0.8 + Math.random() * 0.4)
  );

  return (
    <div
      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all hover:bg-gray-800"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 text-xs rounded ${typeColors[signal.signalType]}`}>
              {typeLabels[signal.signalType]}
            </span>
            <HealthIndicator health={signal.health} />
          </div>
          <h3 className="text-sm font-medium text-white truncate">{signal.name}</h3>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {signal.currentValue?.toLocaleString() ?? '--'}
            {signal.unit && <span className="text-xs text-gray-500 ml-1">{signal.unit}</span>}
          </div>
          {signal.targetValue && (
            <div className="text-xs text-gray-500">
              Target: {signal.targetValue.toLocaleString()}{signal.unit}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <MiniSparkline values={mockSparkline} health={signal.health} />
        <div className="flex items-center gap-2">
          <span className={`text-lg ${trendColors[signal.trend]}`}>
            {trendIcons[signal.trend]}
          </span>
          {signal.previousValue !== undefined && signal.currentValue !== undefined && signal.previousValue !== 0 && (
            <span className={`text-sm ${((signal.currentValue - signal.previousValue) / signal.previousValue) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {((signal.currentValue - signal.previousValue) / signal.previousValue) >= 0 ? '+' : ''}
              {(((signal.currentValue - signal.previousValue) / signal.previousValue) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {signal.lastMeasuredAt && (
        <div className="mt-2 text-xs text-gray-500">
          Last measured: {new Date(signal.lastMeasuredAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function SignalDetailPanel({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-gray-900 border-l border-gray-700 shadow-xl overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
        <h2 className="font-semibold text-white">Signal Details</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded ${typeColors[signal.signalType]}`}>
              {typeLabels[signal.signalType]}
            </span>
            <HealthIndicator health={signal.health} />
          </div>
          <h3 className="text-lg font-semibold text-white">{signal.name}</h3>
          {signal.description && (
            <p className="text-sm text-gray-400 mt-1">{signal.description}</p>
          )}
        </div>

        {/* Current Value */}
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block mb-1">Current Value</span>
              <span className="text-3xl font-bold text-white">
                {signal.currentValue?.toLocaleString() ?? '--'}
                {signal.unit && <span className="text-lg text-gray-500 ml-1">{signal.unit}</span>}
              </span>
            </div>
            <div className="text-right">
              <div className={`text-2xl ${trendColors[signal.trend]}`}>
                {trendIcons[signal.trend]}
              </div>
              {signal.previousValue !== undefined && signal.currentValue !== undefined && signal.previousValue !== 0 && (
                <span className={`text-sm ${((signal.currentValue - signal.previousValue) / signal.previousValue) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {((signal.currentValue - signal.previousValue) / signal.previousValue) >= 0 ? '+' : ''}
                  {(((signal.currentValue - signal.previousValue) / signal.previousValue) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Thresholds</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <span className="text-sm text-gray-400">Target</span>
              <span className="text-sm text-white font-medium">
                {signal.targetValue?.toLocaleString() ?? '--'}{signal.unit}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <span className="text-sm text-yellow-400">Warning</span>
              <span className="text-sm text-yellow-400 font-medium">
                {signal.warningThreshold?.toLocaleString() ?? '--'}{signal.unit}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded">
              <span className="text-sm text-red-400">Critical</span>
              <span className="text-sm text-red-400 font-medium">
                {signal.criticalThreshold?.toLocaleString() ?? '--'}{signal.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Configuration</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Direction</span>
              <span className="text-sm text-white">{signal.direction.replace(/_/g, ' ')}</span>
            </div>
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Aggregation</span>
              <span className="text-sm text-white">{signal.aggregation}</span>
            </div>
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Window</span>
              <span className="text-sm text-white">{signal.windowMinutes} min</span>
            </div>
            <div className="p-2 bg-gray-800 rounded">
              <span className="text-xs text-gray-500 block">Active</span>
              <span className={`text-sm ${signal.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                {signal.isActive ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Sources */}
        {signal.sources && signal.sources.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Data Sources</h4>
            <div className="space-y-2">
              {signal.sources.map((source, i) => (
                <div key={i} className="p-2 bg-gray-800 rounded flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                    {source.type}
                  </span>
                  <span className="text-sm text-gray-400 truncate">
                    {JSON.stringify(source.config)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Linked To</h4>
          <div className="space-y-2">
            {signal.intentId && (
              <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded flex items-center gap-2">
                <span className="text-xs text-purple-300">Intent</span>
                <span className="text-sm text-white truncate">{signal.intentId}</span>
              </div>
            )}
            {signal.capabilityId && (
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded flex items-center gap-2">
                <span className="text-xs text-blue-300">Capability</span>
                <span className="text-sm text-white truncate">{signal.capabilityId}</span>
              </div>
            )}
            {!signal.intentId && !signal.capabilityId && (
              <p className="text-sm text-gray-500 italic">No linked resources</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttentionBanner({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null;

  const criticalCount = signals.filter(s => s.health === 'CRITICAL').length;
  const warningCount = signals.filter(s => s.health === 'WARNING').length;

  return (
    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-lg">⚠</span>
        <span className="text-sm text-red-300 font-medium">
          {signals.length} signal{signals.length > 1 ? 's' : ''} need{signals.length === 1 ? 's' : ''} attention
        </span>
      </div>
      <div className="flex gap-2">
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
            {criticalCount} Critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
            {warningCount} Warning
          </span>
        )}
      </div>
    </div>
  );
}

export function SignalDashboardView() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dashboard, setDashboard] = useState<SignalDashboard | null>(null);
  const [attention, setAttention] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [typeFilter, setTypeFilter] = useState<SignalType | ''>('');
  const [healthFilter, setHealthFilter] = useState<SignalHealth | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [signalsResult, dashboardResult, attentionResult] = await Promise.all([
          listSignals({ limit: 100 }),
          getSignalDashboard(),
          getSignalsNeedingAttention(),
        ]);
        setSignals(signalsResult.data);
        setDashboard(dashboardResult);
        setAttention(attentionResult);
      } catch (error) {
        console.error('Failed to load signals:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSignals = signals.filter(signal => {
    if (typeFilter && signal.signalType !== typeFilter) return false;
    if (healthFilter && signal.health !== healthFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Summary Bar */}
      {dashboard && (
        <div className="flex-shrink-0 p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500 block">Total Signals</span>
              <span className="text-2xl font-bold text-white">{dashboard.totalSignals}</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div>
              <span className="text-xs text-gray-500 block">Active</span>
              <span className="text-2xl font-bold text-green-400">{dashboard.activeSignals}</span>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex gap-3">
              {Object.entries(dashboard.byHealth).map(([health, count]) => (
                <div key={health} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${healthColors[health as SignalHealth]}`} />
                  <span className="text-sm text-gray-300">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attention Banner */}
      {attention.length > 0 && (
        <div className="flex-shrink-0 p-4 border-b border-gray-700">
          <AttentionBanner signals={attention} />
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 flex gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SignalType | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as SignalHealth | '')}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Health</option>
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onClick={() => setSelectedSignal(signal)}
            />
          ))}
          {filteredSignals.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No signals match your filters
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedSignal && (
        <SignalDetailPanel signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
      )}
    </div>
  );
}

export default SignalDashboardView;
