/**
 * CustomerHealthPulse - Real-time customer health indicators
 *
 * Shows at-a-glance metrics that matter to product teams:
 * - Customer satisfaction (NPS/CSAT trends)
 * - Feature adoption rates
 * - Support ticket velocity
 * - Churn risk indicators
 * - Customer engagement health
 *
 * Designed for product teams who want to see customer impact instantly.
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Heart,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  Activity,
  Star,
  Sparkles,
} from 'lucide-react';

// Simulated customer health data (would come from API in production)
const useCustomerHealth = () => {
  return useMemo(() => ({
    nps: {
      score: 42,
      trend: 'up' as const,
      change: 5,
      promoters: 156,
      passives: 89,
      detractors: 34,
    },
    satisfaction: {
      csat: 4.2,
      maxScore: 5,
      totalResponses: 1247,
      trend: 'stable' as const,
    },
    adoption: {
      newFeatureAdoption: 67,
      activeUsers: 8432,
      weeklyActiveGrowth: 12,
      topFeature: 'Smart Search',
      lowAdoptionFeature: 'Bulk Actions',
    },
    engagement: {
      dailyActiveUsers: 3241,
      avgSessionDuration: '12m 34s',
      avgActionsPerSession: 24,
      trend: 'up' as const,
    },
    health: {
      healthyCustomers: 847,
      atRisk: 23,
      churnRisk: 8,
      recentChurn: 3,
    },
    support: {
      openTickets: 47,
      avgResponseTime: '2.3h',
      satisfaction: 94,
      trend: 'stable' as const,
    },
  }), []);
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical';
}

function MetricCard({ icon, label, value, subValue, trend, trendValue, status = 'good' }: MetricCardProps) {
  return (
    <div className={clsx(
      'p-3 rounded-lg border transition-colors',
      status === 'good' && 'bg-green-500/5 border-green-500/20',
      status === 'warning' && 'bg-yellow-500/5 border-yellow-500/20',
      status === 'critical' && 'bg-red-500/5 border-red-500/20',
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className={clsx(
          'p-1.5 rounded-lg',
          status === 'good' && 'bg-green-500/10 text-green-400',
          status === 'warning' && 'bg-yellow-500/10 text-yellow-400',
          status === 'critical' && 'bg-red-500/10 text-red-400',
        )}>
          {icon}
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-0.5 text-xs',
            trend === 'up' && 'text-green-400',
            trend === 'down' && 'text-red-400',
            trend === 'stable' && 'text-claude-neutral-500',
          )}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'stable' && <Activity className="w-3 h-3" />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div className="text-lg font-bold text-claude-neutral-100">{value}</div>
      <div className="text-xs text-claude-neutral-500">{label}</div>
      {subValue && (
        <div className="text-xs text-claude-neutral-400 mt-1">{subValue}</div>
      )}
    </div>
  );
}

export function CustomerHealthPulse() {
  const health = useCustomerHealth();

  const overallHealth = useMemo(() => {
    // Calculate overall health score
    const factors = [
      health.nps.score > 30 ? 1 : health.nps.score > 0 ? 0.5 : 0,
      health.satisfaction.csat > 4 ? 1 : health.satisfaction.csat > 3 ? 0.5 : 0,
      health.adoption.newFeatureAdoption > 50 ? 1 : health.adoption.newFeatureAdoption > 30 ? 0.5 : 0,
      (health.health.atRisk + health.health.churnRisk) < 50 ? 1 : 0.5,
    ];
    const score = Math.round((factors.reduce((a, b) => a + b, 0) / factors.length) * 100);
    return {
      score,
      status: score >= 70 ? 'good' as const : score >= 50 ? 'warning' as const : 'critical' as const,
    };
  }, [health]);

  return (
    <div className="space-y-4">
      {/* Overall Customer Health */}
      <div className={clsx(
        'p-4 rounded-xl border',
        overallHealth.status === 'good' && 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20',
        overallHealth.status === 'warning' && 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20',
        overallHealth.status === 'critical' && 'bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20',
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className={clsx(
              'w-5 h-5',
              overallHealth.status === 'good' && 'text-green-400',
              overallHealth.status === 'warning' && 'text-yellow-400',
              overallHealth.status === 'critical' && 'text-red-400',
            )} />
            <span className="text-sm font-medium text-claude-neutral-200">Customer Health</span>
          </div>
          <div className={clsx(
            'text-2xl font-bold',
            overallHealth.status === 'good' && 'text-green-400',
            overallHealth.status === 'warning' && 'text-yellow-400',
            overallHealth.status === 'critical' && 'text-red-400',
          )}>
            {overallHealth.score}%
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-semibold text-claude-neutral-100">{health.health.healthyCustomers}</div>
            <div className="text-[10px] text-claude-neutral-500">Healthy</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-yellow-400">{health.health.atRisk}</div>
            <div className="text-[10px] text-claude-neutral-500">At Risk</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-400">{health.health.churnRisk}</div>
            <div className="text-[10px] text-claude-neutral-500">Churn Risk</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-400">+{health.adoption.weeklyActiveGrowth}%</div>
            <div className="text-[10px] text-claude-neutral-500">Growth</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<Star className="w-4 h-4" />}
          label="NPS Score"
          value={health.nps.score}
          subValue={`${health.nps.promoters} promoters`}
          trend={health.nps.trend}
          trendValue={`+${health.nps.change}`}
          status={health.nps.score > 30 ? 'good' : health.nps.score > 0 ? 'warning' : 'critical'}
        />
        <MetricCard
          icon={<ThumbsUp className="w-4 h-4" />}
          label="CSAT Score"
          value={`${health.satisfaction.csat}/${health.satisfaction.maxScore}`}
          subValue={`${health.satisfaction.totalResponses} responses`}
          trend={health.satisfaction.trend}
          status={health.satisfaction.csat > 4 ? 'good' : health.satisfaction.csat > 3 ? 'warning' : 'critical'}
        />
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="Active Users"
          value={health.adoption.activeUsers.toLocaleString()}
          subValue={health.engagement.avgSessionDuration}
          trend={health.engagement.trend}
          trendValue={`+${health.adoption.weeklyActiveGrowth}%`}
          status="good"
        />
        <MetricCard
          icon={<MessageSquare className="w-4 h-4" />}
          label="Support Health"
          value={`${health.support.satisfaction}%`}
          subValue={`${health.support.openTickets} open tickets`}
          trend={health.support.trend}
          status={health.support.satisfaction > 90 ? 'good' : health.support.satisfaction > 70 ? 'warning' : 'critical'}
        />
      </div>

      {/* Adoption Insights */}
      <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-claude-primary-400" />
          <span className="text-xs font-medium text-claude-neutral-300">Feature Adoption Insights</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-claude-neutral-400">New Feature Adoption</span>
            <span className="text-green-400 font-medium">{health.adoption.newFeatureAdoption}%</span>
          </div>
          <div className="h-1.5 bg-claude-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              style={{ width: `${health.adoption.newFeatureAdoption}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-claude-neutral-500">
            <span>Top: {health.adoption.topFeature}</span>
            <span>Needs attention: {health.adoption.lowAdoptionFeature}</span>
          </div>
        </div>
      </div>

      {/* Risk Alert */}
      {(health.health.atRisk > 20 || health.health.churnRisk > 5) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-yellow-300">Customer Risk Alert</div>
            <div className="text-xs text-yellow-400/80 mt-0.5">
              {health.health.atRisk} customers showing warning signs, {health.health.churnRisk} at high churn risk.
              Consider proactive outreach.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerHealthPulse;
