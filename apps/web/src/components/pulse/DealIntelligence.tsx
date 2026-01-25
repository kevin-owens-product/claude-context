/**
 * DealIntelligence - Sales pipeline insights for product teams
 *
 * Shows how product decisions impact revenue:
 * - Deals blocked by missing features
 * - Feature value quantification
 * - Competitive gaps
 * - Win/loss analysis
 *
 * Helps product teams prioritize by revenue impact.
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  DollarSign,
  AlertTriangle,
  Calendar,
  Target,
  Zap,
  Building2,
  Clock,
} from 'lucide-react';

// Simulated deal intelligence data
const useDealIntelligence = () => {
  return useMemo(() => ({
    blockedDeals: {
      count: 7,
      totalValue: 847000,
      avgDealSize: 121000,
      topBlocker: 'Custom Report Builder',
    },
    revenueAtRisk: {
      amount: 1200000,
      byFeature: [
        { feature: 'Custom Report Builder', value: 450000, deals: 4 },
        { feature: 'SSO Integration', value: 325000, deals: 2 },
        { feature: 'API Rate Limits', value: 275000, deals: 3 },
        { feature: 'Audit Logging', value: 150000, deals: 2 },
      ],
    },
    competitiveLosses: {
      thisMonth: 3,
      topCompetitor: 'CompetitorX',
      topReason: 'Missing enterprise features',
    },
    pipeline: {
      total: 3400000,
      qualified: 2100000,
      atRisk: 847000,
    },
    urgentDeals: [
      {
        company: 'TechCorp Inc',
        value: 185000,
        daysUntilClose: 12,
        blocker: 'Custom Report Builder',
        champion: 'Sarah K.',
        stage: 'Negotiation',
      },
      {
        company: 'DataFlow Systems',
        value: 142000,
        daysUntilClose: 8,
        blocker: 'SSO Integration',
        champion: 'Mike R.',
        stage: 'Validation',
      },
    ],
  }), []);
};

interface DealIntelligenceProps {
  compact?: boolean;
}

export function DealIntelligence({ compact = false }: DealIntelligenceProps) {
  const deals = useDealIntelligence();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className={clsx('space-y-4', compact && 'space-y-3')}>
      {/* Revenue at Risk Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-claude-neutral-200">Revenue at Risk</span>
          </div>
          <div className="text-xs text-amber-400/80">
            {deals.blockedDeals.count} blocked deals
          </div>
        </div>
        <div className="text-3xl font-bold text-amber-400 mb-1">
          {formatCurrency(deals.revenueAtRisk.amount)}
        </div>
        <div className="text-xs text-claude-neutral-500">
          Top blocker: <span className="text-amber-400">{deals.blockedDeals.topBlocker}</span>
        </div>
      </div>

      {/* Revenue by Feature */}
      <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-claude-neutral-300">Revenue Impact by Feature</span>
        </div>
        <div className="space-y-2">
          {deals.revenueAtRisk.byFeature.slice(0, compact ? 3 : 4).map((feature, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-claude-neutral-400">{feature.feature}</span>
                <span className="text-xs text-green-400">{formatCurrency(feature.value)}</span>
              </div>
              <div className="h-1.5 bg-claude-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  style={{ width: `${(feature.value / deals.revenueAtRisk.amount) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-claude-neutral-500 mt-0.5">
                <span>{feature.deals} deals blocked</span>
                <span>{Math.round((feature.value / deals.revenueAtRisk.amount) * 100)}% of at-risk</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Urgent Deals */}
      {!compact && (
        <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-claude-neutral-300">Urgent Blocked Deals</span>
          </div>
          <div className="space-y-2">
            {deals.urgentDeals.map((deal, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-claude-neutral-900/50 border border-claude-neutral-700">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-claude-neutral-500" />
                    <span className="text-xs font-medium text-claude-neutral-200">{deal.company}</span>
                  </div>
                  <span className="text-xs font-bold text-green-400">{formatCurrency(deal.value)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-claude-neutral-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {deal.daysUntilClose} days to close
                  </span>
                  <span>•</span>
                  <span>{deal.stage}</span>
                  <span>•</span>
                  <span>{deal.champion}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-amber-400">Blocked by: {deal.blocker}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700 text-center">
          <div className="text-lg font-bold text-claude-neutral-100">
            {formatCurrency(deals.pipeline.total)}
          </div>
          <div className="text-[10px] text-claude-neutral-500">Total Pipeline</div>
        </div>
        <div className="p-2 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700 text-center">
          <div className="text-lg font-bold text-green-400">
            {formatCurrency(deals.pipeline.qualified)}
          </div>
          <div className="text-[10px] text-claude-neutral-500">Qualified</div>
        </div>
        <div className="p-2 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700 text-center">
          <div className="text-lg font-bold text-amber-400">
            {formatCurrency(deals.pipeline.atRisk)}
          </div>
          <div className="text-[10px] text-claude-neutral-500">At Risk</div>
        </div>
      </div>

      {/* Competitive Insights */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <Target className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-red-300">Competitive Alert</div>
          <div className="text-xs text-red-400/80 mt-0.5">
            {deals.competitiveLosses.thisMonth} deals lost to {deals.competitiveLosses.topCompetitor} this month.
            Top reason: {deals.competitiveLosses.topReason}
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-claude-primary-500/10 border border-claude-primary-500/20">
        <Zap className="w-4 h-4 text-claude-primary-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-claude-primary-300">AI Recommendation</div>
          <div className="text-xs text-claude-neutral-400 mt-0.5">
            Prioritizing Custom Report Builder could unblock {formatCurrency(450000)} in pipeline.
            Estimated ROI: 15x development cost.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealIntelligence;
