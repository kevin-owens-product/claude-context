/**
 * LivingSoftwareView - The Command Center
 *
 * A real-time view of your product's health, showing the connections
 * between WHY (intents), WHAT (capabilities), HOW (signals), and LEARN (experiments).
 *
 * This is what product teams actually need to see.
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Compass,
  Activity,
  Box,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap,
  Target,
  ArrowRight,
  Sparkles,
  Users,
} from 'lucide-react';
import { CustomerHealthPulse } from '../components/pulse';
import {
  useIntents,
  useSignals,
  useCapabilities,
  useExperiments,
} from '../hooks/useLivingSoftware';
import type { Intent } from '../api/intents';
import type { Signal } from '../api/signals';
import type { Capability } from '../api/capabilities';
import type { Experiment } from '../api/experiments';

// ============================================================================
// INTENT CARD - Shows an intent with its health and connected items
// ============================================================================

function IntentCard({
  intent,
  signals,
  capabilities,
  experiments,
  onClick,
}: {
  intent: Intent;
  signals: Signal[];
  capabilities: Capability[];
  experiments: Experiment[];
  onClick: () => void;
}) {
  const fulfillmentPercent = Math.round(intent.fulfillmentScore * 100);
  const isAtRisk = intent.fulfillmentScore < 0.4;
  const connectedSignals = signals.filter(s => s.intentId === intent.id);
  const connectedCaps = capabilities.filter(c => c.intentId === intent.id);
  const connectedExps = experiments.filter(e => e.intentId === intent.id);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full p-4 rounded-xl border text-left transition-all hover:shadow-lg',
        isAtRisk
          ? 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30 hover:border-red-500/50'
          : fulfillmentPercent >= 70
          ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30 hover:border-green-500/50'
          : 'bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Compass className={clsx(
              'w-4 h-4',
              isAtRisk ? 'text-red-400' : fulfillmentPercent >= 70 ? 'text-green-400' : 'text-yellow-400'
            )} />
            <span className={clsx(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              intent.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
              intent.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
              'bg-gray-500/20 text-gray-300'
            )}>
              {intent.priority}
            </span>
            <span className="text-xs text-gray-500">{intent.status}</span>
          </div>
          <h3 className="text-sm font-medium text-white leading-tight">
            {intent.title}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className={clsx(
            'text-2xl font-bold',
            isAtRisk ? 'text-red-400' : fulfillmentPercent >= 70 ? 'text-green-400' : 'text-yellow-400'
          )}>
            {fulfillmentPercent}%
          </div>
          <div className="text-[10px] text-gray-500">Fulfilled</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            isAtRisk ? 'bg-red-500' : fulfillmentPercent >= 70 ? 'bg-green-500' : 'bg-yellow-500'
          )}
          style={{ width: `${fulfillmentPercent}%` }}
        />
      </div>

      {/* Connected items */}
      <div className="flex items-center gap-3 text-xs">
        {connectedSignals.length > 0 && (
          <div className="flex items-center gap-1 text-green-400/70">
            <Activity className="w-3 h-3" />
            <span>{connectedSignals.length} signals</span>
          </div>
        )}
        {connectedCaps.length > 0 && (
          <div className="flex items-center gap-1 text-blue-400/70">
            <Box className="w-3 h-3" />
            <span>{connectedCaps.length} capabilities</span>
          </div>
        )}
        {connectedExps.length > 0 && (
          <div className="flex items-center gap-1 text-cyan-400/70">
            <FlaskConical className="w-3 h-3" />
            <span>{connectedExps.length} experiments</span>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
      </div>
    </button>
  );
}

// ============================================================================
// SIGNAL CARD - Shows a signal with its current state and trend
// ============================================================================

function SignalCard({ signal, onClick }: { signal: Signal; onClick: () => void }) {
  const change = signal.previousValue && signal.currentValue
    ? ((signal.currentValue - signal.previousValue) / signal.previousValue) * 100
    : null;

  const isPositiveTrend = signal.direction === 'INCREASE'
    ? (change ?? 0) > 0
    : signal.direction === 'DECREASE'
    ? (change ?? 0) < 0
    : true;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg border text-left transition-all hover:shadow-md',
        signal.health === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' :
        signal.health === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50' :
        'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
            {signal.signalType.replace(/_/g, ' ')}
          </div>
          <div className="text-sm font-medium text-white truncate">{signal.name}</div>
        </div>
        <div className={clsx(
          'w-2 h-2 rounded-full mt-1.5',
          signal.health === 'CRITICAL' ? 'bg-red-500 animate-pulse' :
          signal.health === 'WARNING' ? 'bg-yellow-500' :
          signal.health === 'GOOD' ? 'bg-green-500' :
          'bg-green-400'
        )} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-lg font-bold text-white">
            {signal.currentValue?.toLocaleString() ?? '--'}
          </span>
          {signal.unit && <span className="text-xs text-gray-500 ml-1">{signal.unit}</span>}
        </div>
        {change !== null && (
          <div className={clsx(
            'flex items-center gap-0.5 text-xs',
            isPositiveTrend ? 'text-green-400' : 'text-red-400'
          )}>
            {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// EXPERIMENT CARD - Shows an experiment with its progress
// ============================================================================

function ExperimentCard({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) {
  const confidence = experiment.statisticalSignificance
    ? Math.round(experiment.statisticalSignificance * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg border text-left transition-all hover:shadow-md',
        experiment.status === 'RUNNING' ? 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/50' :
        experiment.status === 'COMPLETED' && experiment.verdict === 'SUCCESS' ? 'bg-green-500/10 border-green-500/30' :
        experiment.status === 'COMPLETED' && experiment.verdict === 'FAILURE' ? 'bg-red-500/10 border-red-500/30' :
        'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={clsx(
              'text-[10px] px-1.5 py-0.5 rounded',
              experiment.status === 'RUNNING' ? 'bg-cyan-500/20 text-cyan-300' :
              experiment.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-300' :
              experiment.status === 'COMPLETED' ? 'bg-purple-500/20 text-purple-300' :
              'bg-gray-500/20 text-gray-300'
            )}>
              {experiment.status}
            </span>
            <span className="text-[10px] text-gray-500">{experiment.experimentType.replace(/_/g, ' ')}</span>
          </div>
          <div className="text-sm font-medium text-white truncate">{experiment.name}</div>
        </div>
        {experiment.verdict && (
          <div className={clsx(
            'text-lg',
            experiment.verdict === 'SUCCESS' ? 'text-green-400' : 'text-red-400'
          )}>
            {experiment.verdict === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400 italic line-clamp-1 mb-2">
        "{experiment.hypothesis}"
      </div>
      {experiment.status === 'RUNNING' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{experiment.trafficPercent}% traffic</span>
          {confidence > 0 && (
            <span className={clsx(
              confidence >= 95 ? 'text-green-400' : 'text-cyan-400'
            )}>
              {confidence}% confidence
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// MAIN VIEW
// ============================================================================

export function LivingSoftwareView() {
  const intents = useIntents();
  const signals = useSignals();
  const capabilities = useCapabilities();
  const experiments = useExperiments();

  const [_selectedIntent, setSelectedIntent] = useState<Intent | null>(null);

  const loading = intents.loading || signals.loading || capabilities.loading || experiments.loading;

  // Sort intents by risk (at-risk first, then by priority)
  const sortedIntents = useMemo(() => {
    return [...intents.intents].sort((a, b) => {
      // At-risk intents first
      const aAtRisk = a.fulfillmentScore < 0.4;
      const bAtRisk = b.fulfillmentScore < 0.4;
      if (aAtRisk && !bAtRisk) return -1;
      if (!aAtRisk && bAtRisk) return 1;

      // Then by priority
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, EXPLORATORY: 4 };
      return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
    });
  }, [intents.intents]);

  // Get signals needing attention
  const alertingSignals = useMemo(() => {
    return signals.signals.filter(s => s.health === 'CRITICAL' || s.health === 'WARNING');
  }, [signals.signals]);

  // Calculate overall system health
  const systemHealth = useMemo(() => {
    const intentHealth = intents.intents.length > 0
      ? intents.intents.reduce((sum, i) => sum + i.fulfillmentScore, 0) / intents.intents.length
      : 0;

    const signalHealth = signals.signals.length > 0
      ? signals.signals.filter(s => s.health === 'EXCELLENT' || s.health === 'GOOD').length / signals.signals.length
      : 0;

    return Math.round(((intentHealth + signalHealth) / 2) * 100);
  }, [intents.intents, signals.signals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Zap className="w-8 h-8 text-claude-primary-400 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-400">Loading Living Software state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-claude-primary-400" />
              Living Software
            </h1>
            <p className="text-sm text-gray-500">
              Real-time view of your product's health
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={clsx(
              'px-4 py-2 rounded-lg flex items-center gap-3',
              systemHealth >= 60 ? 'bg-green-500/10 border border-green-500/30' :
              systemHealth >= 40 ? 'bg-yellow-500/10 border border-yellow-500/30' :
              'bg-red-500/10 border border-red-500/30'
            )}>
              <span className="text-sm text-gray-400">System Health</span>
              <span className={clsx(
                'text-2xl font-bold',
                systemHealth >= 60 ? 'text-green-400' :
                systemHealth >= 40 ? 'text-yellow-400' :
                'text-red-400'
              )}>
                {systemHealth}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-purple-400">{intents.activeIntents.length}</span>
            </div>
            <div className="text-sm text-gray-400">Active Intents</div>
            {intents.atRiskIntents.length > 0 && (
              <div className="mt-1 text-xs text-red-400">
                {intents.atRiskIntents.length} at risk
              </div>
            )}
          </div>
          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{signals.signals.length}</span>
            </div>
            <div className="text-sm text-gray-400">Active Signals</div>
            {alertingSignals.length > 0 && (
              <div className="mt-1 text-xs text-yellow-400">
                {alertingSignals.length} alerting
              </div>
            )}
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <Box className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">{capabilities.activeCapabilities.length}</span>
            </div>
            <div className="text-sm text-gray-400">Capabilities</div>
            {capabilities.totalGaps > 0 && (
              <div className="mt-1 text-xs text-yellow-400">
                {capabilities.totalGaps} gaps
              </div>
            )}
          </div>
          <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">{experiments.runningExperiments.length}</span>
            </div>
            <div className="text-sm text-gray-400">Running Experiments</div>
            {experiments.scheduledExperiments.length > 0 && (
              <div className="mt-1 text-xs text-blue-400">
                {experiments.scheduledExperiments.length} scheduled
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Customer Health Sidebar */}
          <div className="col-span-3">
            <div className="sticky top-28">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-pink-400" />
                <h2 className="text-lg font-medium text-white">Customer Pulse</h2>
              </div>
              <CustomerHealthPulse />
            </div>
          </div>

          {/* Intents Column */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Intents (WHY)
              </h2>
              <span className="text-xs text-gray-500">{sortedIntents.length} total</span>
            </div>
            <div className="space-y-3">
              {sortedIntents.slice(0, 5).map(intent => (
                <IntentCard
                  key={intent.id}
                  intent={intent}
                  signals={signals.signals}
                  capabilities={capabilities.capabilities}
                  experiments={experiments.experiments}
                  onClick={() => setSelectedIntent(intent)}
                />
              ))}
            </div>
          </div>

          {/* Signals & Experiments Column */}
          <div className="col-span-5 space-y-6">
            {/* Signals */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400" />
                  Signals (HOW)
                </h2>
                <span className="text-xs text-gray-500">{signals.signals.length} total</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {signals.signals.slice(0, 4).map(signal => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Experiments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                  Experiments (LEARN)
                </h2>
                <span className="text-xs text-gray-500">{experiments.experiments.length} total</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {experiments.experiments.slice(0, 2).map(experiment => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Connection Flow */}
            <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3">The Living Software Loop</h3>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-purple-400">
                  <Compass className="w-4 h-4" />
                  <span>WHY</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2 text-blue-400">
                  <Box className="w-4 h-4" />
                  <span>WHAT</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2 text-green-400">
                  <Activity className="w-4 h-4" />
                  <span>HOW</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2 text-cyan-400">
                  <FlaskConical className="w-4 h-4" />
                  <span>LEARN</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2 text-purple-400">
                  <Compass className="w-4 h-4" />
                  <span>IMPROVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivingSoftwareView;
