/**
 * SalesView - Enterprise Sales Pipeline & Deal Intelligence
 *
 * A powerful sales command center showing:
 * - Kanban pipeline with drag & drop
 * - Deal details with blockers
 * - Revenue forecasting
 * - Feature-to-revenue attribution
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Building2,
  Users,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  ExternalLink,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
  daysUntilClose: number;
  champion: string;
  championTitle: string;
  blockers: Array<{ feature: string; priority: 'high' | 'medium' | 'low' }>;
  activities: Array<{ type: string; date: string; note: string }>;
  competitors: string[];
}

interface SalesViewProps {
  tenantId: string;
}

// Demo deals data
const demoDeals: Deal[] = [
  {
    id: 'd1',
    name: 'Enterprise Platform License',
    company: 'TechCorp Inc',
    value: 185000,
    stage: 'negotiation',
    probability: 75,
    closeDate: '2024-02-08',
    daysUntilClose: 12,
    champion: 'Sarah Kim',
    championTitle: 'VP Engineering',
    blockers: [{ feature: 'Custom Report Builder', priority: 'high' }],
    activities: [
      { type: 'call', date: '2024-01-22', note: 'Discussed pricing structure' },
      { type: 'email', date: '2024-01-20', note: 'Sent revised proposal' },
    ],
    competitors: ['CompetitorX'],
  },
  {
    id: 'd2',
    name: 'Global Rollout Phase 1',
    company: 'DataFlow Systems',
    value: 142000,
    stage: 'validation',
    probability: 60,
    closeDate: '2024-02-01',
    daysUntilClose: 8,
    champion: 'Mike Rodriguez',
    championTitle: 'CTO',
    blockers: [{ feature: 'SSO Integration', priority: 'high' }],
    activities: [
      { type: 'demo', date: '2024-01-18', note: 'Technical deep-dive with team' },
    ],
    competitors: [],
  },
  {
    id: 'd3',
    name: 'Department License',
    company: 'MegaCorp International',
    value: 275000,
    stage: 'proposal',
    probability: 45,
    closeDate: '2024-03-15',
    daysUntilClose: 51,
    champion: 'James Wilson',
    championTitle: 'SVP Technology',
    blockers: [],
    activities: [
      { type: 'meeting', date: '2024-01-15', note: 'Executive briefing' },
    ],
    competitors: ['CompetitorY', 'CompetitorZ'],
  },
  {
    id: 'd4',
    name: 'Startup Growth Plan',
    company: 'InnovateLabs',
    value: 45000,
    stage: 'discovery',
    probability: 30,
    closeDate: '2024-03-30',
    daysUntilClose: 66,
    champion: 'Lisa Chen',
    championTitle: 'Head of Product',
    blockers: [{ feature: 'API Rate Limits', priority: 'medium' }],
    activities: [],
    competitors: [],
  },
  {
    id: 'd5',
    name: 'Team Expansion',
    company: 'Global Dynamics',
    value: 95000,
    stage: 'negotiation',
    probability: 80,
    closeDate: '2024-01-30',
    daysUntilClose: 6,
    champion: 'Tom Anderson',
    championTitle: 'Director IT',
    blockers: [],
    activities: [
      { type: 'call', date: '2024-01-23', note: 'Final contract review' },
    ],
    competitors: [],
  },
  {
    id: 'd6',
    name: 'Pilot Program',
    company: 'StartupCo',
    value: 25000,
    stage: 'qualification',
    probability: 20,
    closeDate: '2024-04-15',
    daysUntilClose: 82,
    champion: 'Emma Davis',
    championTitle: 'Founder',
    blockers: [],
    activities: [],
    competitors: ['CompetitorX'],
  },
  {
    id: 'd7',
    name: 'Enterprise Annual Renewal',
    company: 'Acme Corporation',
    value: 320000,
    stage: 'closed-won',
    probability: 100,
    closeDate: '2024-01-15',
    daysUntilClose: 0,
    champion: 'David Park',
    championTitle: 'VP Operations',
    blockers: [],
    activities: [],
    competitors: [],
  },
];

const stages = [
  { id: 'qualification', label: 'Qualification', color: 'gray' },
  { id: 'discovery', label: 'Discovery', color: 'blue' },
  { id: 'validation', label: 'Validation', color: 'cyan' },
  { id: 'proposal', label: 'Proposal', color: 'purple' },
  { id: 'negotiation', label: 'Negotiation', color: 'yellow' },
  { id: 'closed-won', label: 'Closed Won', color: 'green' },
];

const stageColors: Record<string, string> = {
  gray: 'bg-gray-500/20 border-gray-500/40 text-gray-400',
  blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  cyan: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  green: 'bg-green-500/20 border-green-500/40 text-green-400',
};

export function SalesView({ tenantId: _tenantId }: SalesViewProps) {
  const [deals] = useState<Deal[]>(demoDeals);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const openDeals = deals.filter(d => d.stage !== 'closed-won');
    const totalPipeline = openDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedPipeline = openDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0);
    const blockedDeals = openDeals.filter(d => d.blockers.length > 0);
    const blockedValue = blockedDeals.reduce((sum, d) => sum + d.value, 0);
    const closingSoon = openDeals.filter(d => d.daysUntilClose <= 14);
    const wonThisMonth = deals.filter(d => d.stage === 'closed-won');
    const wonValue = wonThisMonth.reduce((sum, d) => sum + d.value, 0);

    return {
      totalPipeline,
      weightedPipeline,
      blockedValue,
      blockedCount: blockedDeals.length,
      closingSoonCount: closingSoon.length,
      closingSoonValue: closingSoon.reduce((sum, d) => sum + d.value, 0),
      wonValue,
      wonCount: wonThisMonth.length,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.champion.toLowerCase().includes(q)
    );
  }, [deals, searchQuery]);

  const getDealsByStage = (stageId: string) => {
    return filteredDeals.filter(d => d.stage === stageId);
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Main Pipeline View */}
      <div className={clsx(
        'flex-1 flex flex-col overflow-hidden transition-all',
        selectedDeal ? 'mr-96' : ''
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Sales Pipeline
              </h1>
              <p className="text-sm text-gray-500">Track deals and forecast revenue</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                New Deal
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-5 gap-4">
            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Total Pipeline</span>
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="text-xl font-bold text-white">{formatCurrency(metrics.totalPipeline)}</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Weighted Pipeline</span>
                <Target className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-400">{formatCurrency(metrics.weightedPipeline)}</div>
            </div>
            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Closing Soon</span>
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <div className="text-xl font-bold text-yellow-400">
                {metrics.closingSoonCount} <span className="text-sm font-normal text-gray-500">({formatCurrency(metrics.closingSoonValue)})</span>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-400">Blocked by Features</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400">{formatCurrency(metrics.blockedValue)}</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-green-400">Won This Month</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="text-xl font-bold text-green-400">{formatCurrency(metrics.wonValue)}</div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full">
            {stages.map(stage => {
              const stageDeals = getDealsByStage(stage.id);
              const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
              const colorClass = stageColors[stage.color];

              return (
                <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
                  {/* Stage Header */}
                  <div className={clsx('px-3 py-2 rounded-t-xl border-b-2', colorClass)}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{stage.label}</span>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="text-xs opacity-75 mt-0.5">{formatCurrency(stageValue)}</div>
                  </div>

                  {/* Stage Deals */}
                  <div className="flex-1 bg-gray-800/30 rounded-b-xl p-2 space-y-2 overflow-y-auto">
                    {stageDeals.map(deal => (
                      <button
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className={clsx(
                          'w-full p-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-lg text-left transition-all',
                          selectedDeal?.id === deal.id && 'ring-2 ring-blue-500 border-blue-500'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">{deal.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {deal.company}
                            </div>
                          </div>
                          <span className="text-lg font-bold text-green-400">{formatCurrency(deal.value)}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {deal.daysUntilClose > 0 ? `${deal.daysUntilClose}d` : 'Closed'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-700 rounded">{deal.probability}%</span>
                          </div>
                          {deal.blockers.length > 0 && (
                            <span className="flex items-center gap-1 text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              {deal.blockers.length}
                            </span>
                          )}
                        </div>

                        {deal.champion && (
                          <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-400">
                            <Users className="w-3 h-3" />
                            {deal.champion}
                          </div>
                        )}
                      </button>
                    ))}

                    {stageDeals.length === 0 && (
                      <div className="text-center py-8 text-gray-600 text-sm">
                        No deals
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <div className="w-96 border-l border-gray-800 bg-gray-900 flex flex-col fixed right-0 top-0 bottom-0 z-30">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Deal Details</h2>
            <button
              onClick={() => setSelectedDeal(null)}
              className="p-1 text-gray-500 hover:text-white rounded transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Deal Overview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{selectedDeal.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Building2 className="w-4 h-4" />
                {selectedDeal.company}
              </div>
            </div>

            {/* Value & Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Deal Value</div>
                <div className="text-2xl font-bold text-green-400">{formatCurrency(selectedDeal.value)}</div>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Win Probability</div>
                <div className="text-2xl font-bold text-blue-400">{selectedDeal.probability}%</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Expected Close</div>
                  <div className="font-medium text-white">{new Date(selectedDeal.closeDate).toLocaleDateString()}</div>
                </div>
                <div className={clsx(
                  'text-sm font-medium px-2 py-1 rounded',
                  selectedDeal.daysUntilClose <= 7 ? 'bg-red-500/20 text-red-400' :
                  selectedDeal.daysUntilClose <= 14 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-700 text-gray-400'
                )}>
                  {selectedDeal.daysUntilClose > 0 ? `${selectedDeal.daysUntilClose} days left` : 'Closed'}
                </div>
              </div>
            </div>

            {/* Champion */}
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">Champion</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                  {selectedDeal.champion.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-medium text-white">{selectedDeal.champion}</div>
                  <div className="text-xs text-gray-500">{selectedDeal.championTitle}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">
                  <Mail className="w-3 h-3" />
                  Email
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors">
                  <Phone className="w-3 h-3" />
                  Call
                </button>
              </div>
            </div>

            {/* Blockers */}
            {selectedDeal.blockers.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Deal Blockers
                </div>
                <div className="space-y-2">
                  {selectedDeal.blockers.map((blocker, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-white">{blocker.feature}</span>
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded',
                        blocker.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        blocker.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-600 text-gray-400'
                      )}>
                        {blocker.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitors */}
            {selectedDeal.competitors.length > 0 && (
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Competitors</div>
                <div className="flex flex-wrap gap-2">
                  {selectedDeal.competitors.map((comp, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {selectedDeal.activities.length > 0 && (
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Recent Activity</div>
                <div className="space-y-2">
                  {selectedDeal.activities.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                        {activity.type === 'call' && <Phone className="w-3 h-3 text-gray-400" />}
                        {activity.type === 'email' && <Mail className="w-3 h-3 text-gray-400" />}
                        {activity.type === 'demo' && <ExternalLink className="w-3 h-3 text-gray-400" />}
                        {activity.type === 'meeting' && <Users className="w-3 h-3 text-gray-400" />}
                      </div>
                      <div>
                        <div className="text-gray-300">{activity.note}</div>
                        <div className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insight */}
            <div className="p-3 bg-claude-primary-500/10 border border-claude-primary-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-claude-primary-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Insight
              </div>
              <p className="text-sm text-gray-300">
                {selectedDeal.blockers.length > 0
                  ? `Prioritizing "${selectedDeal.blockers[0].feature}" could accelerate this deal by 2-3 weeks.`
                  : selectedDeal.daysUntilClose <= 7
                  ? 'High probability of closing. Recommend scheduling final sign-off call.'
                  : 'Deal is progressing well. Consider upsell opportunity for additional seats.'
                }
              </p>
            </div>
          </div>

          {/* Panel Actions */}
          <div className="p-4 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-2">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                Edit Deal
              </button>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors">
                Mark Won
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesView;
