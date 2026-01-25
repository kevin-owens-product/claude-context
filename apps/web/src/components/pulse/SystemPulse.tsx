/**
 * SystemPulse - Living Software Health Dashboard
 *
 * Not just counts - actual system health visualization.
 * Shows the heartbeat of your product.
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { useIntents, useSignals, useCapabilities, useExperiments } from '../../hooks/useLivingSoftware';

interface HealthRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}

function HealthRing({ value, size = 80, strokeWidth = 6, color, bgColor = 'rgba(255,255,255,0.1)', children }: HealthRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}


interface SystemHealthScore {
  overall: number;
  intentFulfillment: number;
  signalHealth: number;
  capabilityEffectiveness: number;
  experimentVelocity: number;
}

function calculateSystemHealth(
  intents: ReturnType<typeof useIntents>,
  signals: ReturnType<typeof useSignals>,
  capabilities: ReturnType<typeof useCapabilities>,
  experiments: ReturnType<typeof useExperiments>,
): SystemHealthScore {
  // Intent fulfillment: weighted average of fulfillment scores
  const intentFulfillment = intents.intents.length > 0
    ? (intents.intents.reduce((sum, i) => sum + (i.fulfillmentScore || 0), 0) / intents.intents.length) * 100
    : 0;

  // Signal health: percentage of signals that are healthy
  const healthySignals = signals.signals.filter(s => s.health === 'EXCELLENT' || s.health === 'GOOD').length;
  const signalHealth = signals.signals.length > 0
    ? (healthySignals / signals.signals.length) * 100
    : 0;

  // Capability effectiveness: average effectiveness minus gap penalty
  const capabilityEffectiveness = capabilities.capabilities.length > 0
    ? Math.max(0, (capabilities.averageEffectiveness * 100) - (capabilities.totalGaps * 5))
    : 0;

  // Experiment velocity: running experiments as % of total, plus success rate bonus
  const completedWithVerdict = experiments.completedExperiments.filter(e => e.verdict === 'SUCCESS').length;
  const experimentVelocity = experiments.experiments.length > 0
    ? ((experiments.runningExperiments.length / Math.max(3, experiments.experiments.length)) * 50) +
      ((completedWithVerdict / Math.max(1, experiments.completedExperiments.length)) * 50)
    : 0;

  // Overall: weighted combination
  const overall = (
    intentFulfillment * 0.35 +
    signalHealth * 0.25 +
    capabilityEffectiveness * 0.25 +
    experimentVelocity * 0.15
  );

  return {
    overall: Math.round(overall),
    intentFulfillment: Math.round(intentFulfillment),
    signalHealth: Math.round(signalHealth),
    capabilityEffectiveness: Math.round(capabilityEffectiveness),
    experimentVelocity: Math.round(experimentVelocity),
  };
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

interface InsightItem {
  id: string;
  type: 'critical' | 'warning' | 'opportunity' | 'success';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: string;
  metric?: string;
}

function generateInsights(
  intents: ReturnType<typeof useIntents>,
  signals: ReturnType<typeof useSignals>,
  capabilities: ReturnType<typeof useCapabilities>,
  experiments: ReturnType<typeof useExperiments>,
): InsightItem[] {
  const insights: InsightItem[] = [];

  // Critical intents at risk
  intents.atRiskIntents.forEach(intent => {
    if (intent.priority === 'CRITICAL') {
      insights.push({
        id: `intent-${intent.id}`,
        type: 'critical',
        icon: <XCircle className="w-4 h-4" />,
        title: intent.title.slice(0, 35) + (intent.title.length > 35 ? '...' : ''),
        subtitle: 'Critical intent at risk',
        metric: `${Math.round(intent.fulfillmentScore * 100)}%`,
        action: 'Review capabilities',
      });
    }
  });

  // Critical signals
  signals.criticalSignals.forEach(signal => {
    insights.push({
      id: `signal-${signal.id}`,
      type: 'critical',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: signal.name,
      subtitle: 'Signal in critical state',
      metric: signal.currentValue?.toString(),
    });
  });

  // Capability gaps blocking intents
  capabilities.capabilitiesWithGaps.slice(0, 2).forEach(cap => {
    const criticalGaps = cap.gaps?.filter(g => g.severity === 'critical' || g.severity === 'high') || [];
    if (criticalGaps.length > 0) {
      insights.push({
        id: `cap-${cap.id}`,
        type: 'warning',
        icon: <Target className="w-4 h-4" />,
        title: cap.name,
        subtitle: `${criticalGaps.length} critical gap${criticalGaps.length > 1 ? 's' : ''}`,
        action: 'Address gaps',
      });
    }
  });

  // Running experiments nearing completion
  experiments.runningExperiments.forEach(exp => {
    if (exp.statisticalSignificance && exp.statisticalSignificance > 0.9) {
      insights.push({
        id: `exp-${exp.id}`,
        type: 'opportunity',
        icon: <FlaskConical className="w-4 h-4" />,
        title: exp.name,
        subtitle: 'Ready for decision',
        metric: `${Math.round(exp.statisticalSignificance * 100)}% confidence`,
      });
    }
  });

  // Successful experiments
  experiments.completedExperiments.filter(e => e.verdict === 'SUCCESS').slice(0, 1).forEach(exp => {
    insights.push({
      id: `exp-success-${exp.id}`,
      type: 'success',
      icon: <CheckCircle2 className="w-4 h-4" />,
      title: exp.name,
      subtitle: 'Experiment succeeded',
      action: 'Apply learnings',
    });
  });

  return insights.slice(0, 5);
}

export function SystemPulse() {
  const intents = useIntents();
  const signals = useSignals();
  const capabilities = useCapabilities();
  const experiments = useExperiments();

  const loading = intents.loading || signals.loading || capabilities.loading || experiments.loading;

  const health = useMemo(
    () => calculateSystemHealth(intents, signals, capabilities, experiments),
    [intents, signals, capabilities, experiments]
  );

  const insights = useMemo(
    () => generateInsights(intents, signals, capabilities, experiments),
    [intents, signals, capabilities, experiments]
  );

  // Generate mock trend data (in production, this would come from historical data)
  const trendData = useMemo(() => {
    const base = health.overall;
    return Array.from({ length: 7 }, () => base + (Math.random() - 0.5) * 10);
  }, [health.overall]);

  const isImproving = trendData[trendData.length - 1] > trendData[0];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <Zap className="w-6 h-6 text-claude-primary-400" />
            <span className="text-xs text-claude-neutral-500">Loading system health...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Health */}
      <div className="p-4 bg-gradient-to-br from-claude-neutral-800/80 to-claude-neutral-800/40 rounded-xl border border-claude-neutral-700/50">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xs font-medium text-claude-neutral-400 uppercase tracking-wider mb-1">
              System Health
            </h3>
            <div className="flex items-center gap-2">
              <span className={clsx(
                'text-2xl font-bold',
                health.overall >= 60 ? 'text-green-400' : health.overall >= 40 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {health.overall}
              </span>
              <span className="text-sm text-claude-neutral-500">/ 100</span>
              <span className={clsx(
                'flex items-center gap-0.5 text-xs',
                isImproving ? 'text-green-400' : 'text-red-400'
              )}>
                {isImproving ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isImproving ? '+3%' : '-2%'}
              </span>
            </div>
            <span className={clsx(
              'text-xs',
              health.overall >= 60 ? 'text-green-400/80' : health.overall >= 40 ? 'text-yellow-400/80' : 'text-red-400/80'
            )}>
              {getHealthLabel(health.overall)}
            </span>
          </div>
          <HealthRing
            value={health.overall}
            size={56}
            strokeWidth={4}
            color={getHealthColor(health.overall)}
          >
            <Activity className="w-5 h-5 text-claude-neutral-400" />
          </HealthRing>
        </div>

        {/* Mini metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-claude-neutral-900/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-claude-neutral-500">Intent Fulfillment</span>
              <span className="text-xs font-medium" style={{ color: getHealthColor(health.intentFulfillment) }}>
                {health.intentFulfillment}%
              </span>
            </div>
            <div className="mt-1 h-1 bg-claude-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${health.intentFulfillment}%`,
                  backgroundColor: getHealthColor(health.intentFulfillment),
                }}
              />
            </div>
          </div>
          <div className="p-2 bg-claude-neutral-900/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-claude-neutral-500">Signal Health</span>
              <span className="text-xs font-medium" style={{ color: getHealthColor(health.signalHealth) }}>
                {health.signalHealth}%
              </span>
            </div>
            <div className="mt-1 h-1 bg-claude-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${health.signalHealth}%`,
                  backgroundColor: getHealthColor(health.signalHealth),
                }}
              />
            </div>
          </div>
          <div className="p-2 bg-claude-neutral-900/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-claude-neutral-500">Capability Health</span>
              <span className="text-xs font-medium" style={{ color: getHealthColor(health.capabilityEffectiveness) }}>
                {health.capabilityEffectiveness}%
              </span>
            </div>
            <div className="mt-1 h-1 bg-claude-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${health.capabilityEffectiveness}%`,
                  backgroundColor: getHealthColor(health.capabilityEffectiveness),
                }}
              />
            </div>
          </div>
          <div className="p-2 bg-claude-neutral-900/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-claude-neutral-500">Experiment Velocity</span>
              <span className="text-xs font-medium" style={{ color: getHealthColor(health.experimentVelocity) }}>
                {health.experimentVelocity}%
              </span>
            </div>
            <div className="mt-1 h-1 bg-claude-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${health.experimentVelocity}%`,
                  backgroundColor: getHealthColor(health.experimentVelocity),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-medium text-claude-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Insights
          </h3>
          <div className="space-y-1.5">
            {insights.map(insight => (
              <button
                key={insight.id}
                className={clsx(
                  'w-full p-2.5 rounded-lg border transition-all text-left group',
                  insight.type === 'critical' && 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
                  insight.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
                  insight.type === 'opportunity' && 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
                  insight.type === 'success' && 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={clsx(
                    'mt-0.5',
                    insight.type === 'critical' && 'text-red-400',
                    insight.type === 'warning' && 'text-yellow-400',
                    insight.type === 'opportunity' && 'text-blue-400',
                    insight.type === 'success' && 'text-green-400',
                  )}>
                    {insight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-claude-neutral-200 truncate">
                        {insight.title}
                      </span>
                      {insight.metric && (
                        <span className={clsx(
                          'text-[10px] font-medium shrink-0',
                          insight.type === 'critical' && 'text-red-400',
                          insight.type === 'warning' && 'text-yellow-400',
                          insight.type === 'opportunity' && 'text-blue-400',
                          insight.type === 'success' && 'text-green-400',
                        )}>
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-claude-neutral-500">{insight.subtitle}</span>
                      {insight.action && (
                        <span className="text-[10px] text-claude-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {insight.action} →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="p-2 bg-claude-neutral-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-400">{intents.activeIntents.length}</div>
          <div className="text-[9px] text-claude-neutral-500">Active Intents</div>
        </div>
        <div className="p-2 bg-claude-neutral-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-green-400">{signals.healthySignals.length}</div>
          <div className="text-[9px] text-claude-neutral-500">Healthy Signals</div>
        </div>
        <div className="p-2 bg-claude-neutral-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-400">{capabilities.activeCapabilities.length}</div>
          <div className="text-[9px] text-claude-neutral-500">Capabilities</div>
        </div>
        <div className="p-2 bg-claude-neutral-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-cyan-400">{experiments.runningExperiments.length}</div>
          <div className="text-[9px] text-claude-neutral-500">Experiments</div>
        </div>
      </div>
    </div>
  );
}

export default SystemPulse;
