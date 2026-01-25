/**
 * CustomerIntelligenceView - The Customer Command Center
 *
 * A unified view that connects customer feedback, sales intelligence,
 * and product health to help teams make customer-centric decisions.
 *
 * This is what customer-obsessed product teams need.
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Users,
  Heart,
  MessageSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Activity,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Download,
} from 'lucide-react';
import { VoiceOfCustomer, DealIntelligence } from '../components/pulse';

// Simulated customer segments
const useCustomerSegments = () => {
  return useMemo(() => [
    {
      id: 'enterprise',
      name: 'Enterprise',
      count: 47,
      mrr: 285000,
      nps: 48,
      churnRisk: 2,
      healthScore: 87,
    },
    {
      id: 'midmarket',
      name: 'Mid-Market',
      count: 234,
      mrr: 156000,
      nps: 42,
      churnRisk: 8,
      healthScore: 74,
    },
    {
      id: 'startup',
      name: 'Startup',
      count: 892,
      mrr: 89000,
      nps: 38,
      churnRisk: 45,
      healthScore: 62,
    },
    {
      id: 'freemium',
      name: 'Freemium',
      count: 4521,
      mrr: 0,
      nps: 32,
      churnRisk: 0,
      healthScore: 55,
    },
  ], []);
};

// Customer journey metrics
const useJourneyMetrics = () => {
  return useMemo(() => ({
    activation: { rate: 67, trend: 'up' as const, target: 75 },
    adoption: { rate: 54, trend: 'stable' as const, target: 70 },
    retention: { rate: 91, trend: 'up' as const, target: 95 },
    expansion: { rate: 23, trend: 'up' as const, target: 30 },
    referral: { rate: 12, trend: 'down' as const, target: 20 },
  }), []);
};

export function CustomerIntelligenceView() {
  const segments = useCustomerSegments();
  const journey = useJourneyMetrics();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const totalMRR = segments.reduce((sum, s) => sum + s.mrr, 0);
  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0);
  const avgNPS = Math.round(segments.reduce((sum, s) => sum + s.nps * s.count, 0) / totalCustomers);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-400" />
              Customer Intelligence
            </h1>
            <p className="text-sm text-gray-500">
              Real-time insights into customer health, feedback, and revenue impact
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="w-3 h-3" />
                +12%
              </span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              ${(totalMRR / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-gray-400">Monthly Revenue</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <TrendingUp className="w-3 h-3" />
                +234
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {totalCustomers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Customers</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-5 h-5 text-purple-400" />
              <span className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="w-3 h-3" />
                +5
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{avgNPS}</div>
            <div className="text-sm text-gray-400">Net Promoter Score</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/5 rounded-xl border border-pink-500/20">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <span className="flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="w-3 h-3" />
                +2%
              </span>
            </div>
            <div className="text-2xl font-bold text-pink-400">
              {journey.retention.rate}%
            </div>
            <div className="text-sm text-gray-400">Retention Rate</div>
          </div>
        </div>

        {/* Customer Journey Funnel */}
        <div className="mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Customer Journey Health
          </h3>
          <div className="flex items-center justify-between">
            {Object.entries(journey).map(([stage, data], idx) => (
              <div key={stage} className="flex items-center">
                <div className="text-center px-4">
                  <div className="text-xs text-gray-500 capitalize mb-1">{stage}</div>
                  <div className={clsx(
                    'text-xl font-bold',
                    data.rate >= data.target ? 'text-green-400' :
                    data.rate >= data.target * 0.8 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {data.rate}%
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] mt-1">
                    {data.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
                    {data.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className="text-gray-500">Target: {data.target}%</span>
                  </div>
                </div>
                {idx < Object.keys(journey).length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-600 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Customer Segments */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Segments
              </h2>
              <button className="text-xs text-gray-500 hover:text-white">
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {segments.map(segment => (
                <button
                  key={segment.id}
                  onClick={() => setSelectedSegment(
                    selectedSegment === segment.id ? null : segment.id
                  )}
                  className={clsx(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    selectedSegment === segment.id
                      ? 'bg-blue-500/20 border-blue-500/40'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{segment.name}</span>
                    <span className="text-xs text-gray-500">{segment.count}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">${(segment.mrr / 1000).toFixed(0)}K</span>
                      <span className="text-gray-600">|</span>
                      <span className={clsx(
                        segment.nps >= 40 ? 'text-green-400' :
                        segment.nps >= 20 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        NPS {segment.nps}
                      </span>
                    </div>
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      segment.healthScore >= 70 ? 'bg-green-500' :
                      segment.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    )} />
                  </div>
                  {segment.churnRisk > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {segment.churnRisk} at risk
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Health Score Legend */}
            <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
              <div className="text-[10px] text-gray-500 mb-2">Health Score</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-400">70+ Healthy</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-gray-400">50-69 Needs attention</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-400">&lt;50 At risk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voice of Customer */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Voice of Customer
              </h2>
              <button className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                View all <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <VoiceOfCustomer />
          </div>

          {/* Deal Intelligence */}
          <div className="col-span-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Revenue Intelligence
              </h2>
              <button className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                View all <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <DealIntelligence />
          </div>
        </div>

        {/* AI Insights Banner */}
        <div className="mt-6 p-4 bg-gradient-to-r from-claude-primary-500/20 via-purple-500/10 to-blue-500/20 rounded-xl border border-claude-primary-500/30">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-claude-primary-500/20">
              <Sparkles className="w-6 h-6 text-claude-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white mb-1">AI-Powered Insights</h3>
              <p className="text-sm text-gray-400 mb-3">
                Based on current customer data, here are the top opportunities:
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-claude-primary-400 mb-1">Highest Impact</div>
                  <div className="text-sm text-white">
                    Improving export performance could reduce churn by 15%
                  </div>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-green-400 mb-1">Quick Win</div>
                  <div className="text-sm text-white">
                    SSO integration could unlock $325K in blocked deals
                  </div>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-yellow-400 mb-1">Watch Out</div>
                  <div className="text-sm text-white">
                    Startup segment NPS trending down - investigate onboarding
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerIntelligenceView;
