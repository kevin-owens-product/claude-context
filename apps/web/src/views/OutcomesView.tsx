/**
 * OutcomesView - OKR Command Center & Business Outcomes Dashboard
 *
 * A powerful view for tracking objectives, key results, and their
 * connection to product work and customer outcomes.
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Calendar,
  Users,
  Search,
  Plus,
  X,
  Sparkles,
  BarChart3,
  Layers,
  Link2,
  Activity,
  Award,
} from 'lucide-react';

interface KeyResult {
  id: string;
  title: string;
  metricType: string;
  unit?: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ACHIEVED' | 'MISSED';
  linkedSlices?: Array<{ id: string; name: string; status: string }>;
}

interface Objective {
  id: string;
  title: string;
  description?: string;
  type: 'OKR' | 'KPI' | 'NORTH_STAR';
  level: 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
  status: 'DRAFT' | 'ACTIVE' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
  progress: number;
  startDate: string;
  endDate: string;
  owner: string;
  keyResults: KeyResult[];
  linkedArtifacts?: number;
}

// Demo objectives data
const demoObjectives: Objective[] = [
  {
    id: 'obj-1',
    title: 'Accelerate Product-Led Growth',
    description: 'Drive self-serve adoption and reduce time-to-value for new users',
    type: 'OKR',
    level: 'COMPANY',
    status: 'ACTIVE',
    progress: 68,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    owner: 'Sarah Chen',
    linkedArtifacts: 12,
    keyResults: [
      {
        id: 'kr-1',
        title: 'Increase monthly active users to 50K',
        metricType: 'NUMBER',
        unit: 'users',
        startValue: 28000,
        targetValue: 50000,
        currentValue: 42000,
        progress: 64,
        status: 'ON_TRACK',
        linkedSlices: [
          { id: 's1', name: 'User onboarding flow redesign', status: 'COMPLETED' },
          { id: 's2', name: 'Activation email sequence', status: 'IN_PROGRESS' },
        ],
      },
      {
        id: 'kr-2',
        title: 'Reduce time-to-first-value to under 5 minutes',
        metricType: 'DURATION',
        unit: 'min',
        startValue: 15,
        targetValue: 5,
        currentValue: 7,
        progress: 80,
        status: 'ON_TRACK',
        linkedSlices: [
          { id: 's3', name: 'Quick start wizard', status: 'COMPLETED' },
        ],
      },
      {
        id: 'kr-3',
        title: 'Achieve 40% free-to-paid conversion',
        metricType: 'PERCENTAGE',
        unit: '%',
        startValue: 22,
        targetValue: 40,
        currentValue: 31,
        progress: 50,
        status: 'AT_RISK',
        linkedSlices: [
          { id: 's4', name: 'Premium feature gates', status: 'IN_PROGRESS' },
          { id: 's5', name: 'Usage-based upgrade prompts', status: 'PLANNED' },
        ],
      },
    ],
  },
  {
    id: 'obj-2',
    title: 'Expand Enterprise Revenue',
    description: 'Grow enterprise ARR through strategic accounts and upsells',
    type: 'OKR',
    level: 'COMPANY',
    status: 'ACTIVE',
    progress: 82,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    owner: 'Marcus Rodriguez',
    linkedArtifacts: 8,
    keyResults: [
      {
        id: 'kr-4',
        title: 'Close $2M in new enterprise ARR',
        metricType: 'CURRENCY',
        unit: 'M',
        startValue: 0,
        targetValue: 2,
        currentValue: 1.7,
        progress: 85,
        status: 'ON_TRACK',
      },
      {
        id: 'kr-5',
        title: 'Expand 15 strategic accounts by 25%+',
        metricType: 'NUMBER',
        unit: 'accounts',
        startValue: 0,
        targetValue: 15,
        currentValue: 12,
        progress: 80,
        status: 'ON_TRACK',
      },
    ],
  },
  {
    id: 'obj-3',
    title: 'Improve Customer Success',
    description: 'Reduce churn and increase customer satisfaction scores',
    type: 'OKR',
    level: 'DEPARTMENT',
    status: 'ACTIVE',
    progress: 45,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    owner: 'Emily Watson',
    linkedArtifacts: 5,
    keyResults: [
      {
        id: 'kr-6',
        title: 'Achieve NPS score of 60+',
        metricType: 'SCORE',
        unit: 'NPS',
        startValue: 42,
        targetValue: 60,
        currentValue: 51,
        progress: 50,
        status: 'AT_RISK',
      },
      {
        id: 'kr-7',
        title: 'Reduce monthly churn to under 2%',
        metricType: 'PERCENTAGE',
        unit: '%',
        startValue: 4.2,
        targetValue: 2,
        currentValue: 3.1,
        progress: 50,
        status: 'AT_RISK',
      },
      {
        id: 'kr-8',
        title: 'Decrease support ticket resolution time to 4 hours',
        metricType: 'DURATION',
        unit: 'hours',
        startValue: 12,
        targetValue: 4,
        currentValue: 8,
        progress: 50,
        status: 'AT_RISK',
      },
    ],
  },
  {
    id: 'obj-4',
    title: 'Platform Reliability',
    description: 'Ensure world-class uptime and performance for all customers',
    type: 'OKR',
    level: 'TEAM',
    status: 'ACHIEVED',
    progress: 100,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    owner: 'Alex Kim',
    linkedArtifacts: 15,
    keyResults: [
      {
        id: 'kr-9',
        title: 'Maintain 99.95% uptime',
        metricType: 'PERCENTAGE',
        unit: '%',
        startValue: 99.8,
        targetValue: 99.95,
        currentValue: 99.97,
        progress: 100,
        status: 'ACHIEVED',
      },
      {
        id: 'kr-10',
        title: 'P95 API latency under 100ms',
        metricType: 'DURATION',
        unit: 'ms',
        startValue: 180,
        targetValue: 100,
        currentValue: 85,
        progress: 100,
        status: 'ACHIEVED',
      },
    ],
  },
];

interface OutcomesViewProps {
  tenantId: string;
}

export function OutcomesView({ tenantId: _tenantId }: OutcomesViewProps) {
  const [objectives] = useState<Objective[]>(demoObjectives);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set(['obj-1']));
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter objectives
  const filteredObjectives = useMemo(() => {
    return objectives.filter((obj) => {
      const matchesSearch =
        obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLevel = levelFilter === 'all' || obj.level === levelFilter;
      const matchesStatus = statusFilter === 'all' || obj.status === statusFilter;
      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [objectives, searchQuery, levelFilter, statusFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = objectives.length;
    const achieved = objectives.filter((o) => o.status === 'ACHIEVED').length;
    const active = objectives.filter((o) => o.status === 'ACTIVE').length;
    const atRisk = objectives.filter(
      (o) => o.status === 'ACTIVE' && o.progress < 50
    ).length;
    const avgProgress =
      objectives.length > 0
        ? objectives.reduce((sum, o) => sum + o.progress, 0) / objectives.length
        : 0;
    const totalKRs = objectives.reduce((sum, o) => sum + o.keyResults.length, 0);
    const krOnTrack = objectives.reduce(
      (sum, o) =>
        sum +
        o.keyResults.filter((kr) => kr.status === 'ON_TRACK' || kr.status === 'ACHIEVED')
          .length,
      0
    );
    return { total, achieved, active, atRisk, avgProgress, totalKRs, krOnTrack };
  }, [objectives]);

  const toggleExpand = (id: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACHIEVED':
        return 'text-green-400 bg-green-500/20';
      case 'ON_TRACK':
        return 'text-green-400 bg-green-500/20';
      case 'ACTIVE':
        return 'text-blue-400 bg-blue-500/20';
      case 'AT_RISK':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'OFF_TRACK':
        return 'text-red-400 bg-red-500/20';
      case 'MISSED':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'COMPANY':
        return <Target className="w-3.5 h-3.5" />;
      case 'DEPARTMENT':
        return <Layers className="w-3.5 h-3.5" />;
      case 'TEAM':
        return <Users className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const formatValue = (kr: KeyResult) => {
    if (kr.metricType === 'CURRENCY') {
      return `$${kr.currentValue}${kr.unit}`;
    }
    if (kr.metricType === 'PERCENTAGE') {
      return `${kr.currentValue}%`;
    }
    return `${kr.currentValue} ${kr.unit || ''}`;
  };

  const formatTarget = (kr: KeyResult) => {
    if (kr.metricType === 'CURRENCY') {
      return `$${kr.targetValue}${kr.unit}`;
    }
    if (kr.metricType === 'PERCENTAGE') {
      return `${kr.targetValue}%`;
    }
    return `${kr.targetValue} ${kr.unit || ''}`;
  };

  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          selectedObjective ? 'mr-[500px]' : ''
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Outcomes & OKRs
              </h1>
              <p className="text-sm text-gray-500">
                Track business objectives and their connection to product work
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
                New Objective
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search objectives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Levels</option>
              <option value="COMPANY">Company</option>
              <option value="DEPARTMENT">Department</option>
              <option value="TEAM">Team</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ACHIEVED">Achieved</option>
              <option value="MISSED">Missed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800/50">
          <div className="grid grid-cols-6 gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-1">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400">{kpis.total}</div>
              <div className="text-xs text-gray-500">Total Objectives</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +5%
                </span>
              </div>
              <div className="text-xl font-bold text-blue-400">{kpis.avgProgress.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Avg Progress</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <Award className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-xl font-bold text-green-400">{kpis.achieved}</div>
              <div className="text-xs text-gray-500">Achieved</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl border border-cyan-500/20">
              <div className="flex items-center justify-between mb-1">
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-400">{kpis.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-xl border border-yellow-500/20">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-bold text-yellow-400">{kpis.atRisk}</div>
              <div className="text-xs text-gray-500">At Risk</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-xl border border-indigo-500/20">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-bold text-indigo-400">
                {kpis.krOnTrack}/{kpis.totalKRs}
              </div>
              <div className="text-xs text-gray-500">KRs On Track</div>
            </div>
          </div>
        </div>

        {/* Objectives List */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {filteredObjectives.map((objective) => {
              const isExpanded = expandedObjectives.has(objective.id);
              return (
                <div
                  key={objective.id}
                  className={clsx(
                    'rounded-xl border transition-all',
                    selectedObjective?.id === objective.id
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                >
                  {/* Objective Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleExpand(objective.id)}
                        className="mt-1 p-1 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={clsx(
                              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
                              objective.level === 'COMPANY'
                                ? 'bg-purple-500/20 text-purple-400'
                                : objective.level === 'DEPARTMENT'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                            )}
                          >
                            {getLevelIcon(objective.level)}
                            {objective.level}
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-medium',
                              getStatusColor(objective.status)
                            )}
                          >
                            {objective.status}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {objective.keyResults.length} Key Results
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedObjective(objective)}
                          className="text-left"
                        >
                          <h3 className="text-base font-medium text-white hover:text-purple-400 transition-colors">
                            {objective.title}
                          </h3>
                        </button>
                        {objective.description && (
                          <p className="text-sm text-gray-500 mt-1">{objective.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          {/* Progress Bar */}
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={clsx(
                                    'h-full rounded-full transition-all',
                                    getProgressColor(objective.progress)
                                  )}
                                  style={{ width: `${objective.progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-white w-12 text-right">
                                {objective.progress}%
                              </span>
                            </div>
                          </div>
                          {/* Meta */}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {objective.owner}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(objective.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {objective.linkedArtifacts && (
                              <span className="flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5" />
                                {objective.linkedArtifacts} artifacts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Results (Expanded) */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="ml-8 space-y-2">
                        {objective.keyResults.map((kr) => (
                          <div
                            key={kr.id}
                            className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={clsx(
                                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                      getStatusColor(kr.status)
                                    )}
                                  >
                                    {kr.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300">{kr.title}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex-1 max-w-[200px]">
                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className={clsx(
                                          'h-full rounded-full',
                                          getProgressColor(kr.progress)
                                        )}
                                        style={{ width: `${kr.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatValue(kr)} / {formatTarget(kr)}
                                  </span>
                                  <span className="text-xs text-gray-500">{kr.progress}%</span>
                                </div>
                                {/* Linked Slices */}
                                {kr.linkedSlices && kr.linkedSlices.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Link2 className="w-3 h-3 text-gray-500" />
                                    <div className="flex flex-wrap gap-1">
                                      {kr.linkedSlices.map((slice) => (
                                        <span
                                          key={slice.id}
                                          className={clsx(
                                            'px-1.5 py-0.5 rounded text-[10px]',
                                            slice.status === 'COMPLETED'
                                              ? 'bg-green-500/20 text-green-400'
                                              : slice.status === 'IN_PROGRESS'
                                              ? 'bg-blue-500/20 text-blue-400'
                                              : 'bg-gray-500/20 text-gray-400'
                                          )}
                                        >
                                          {slice.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedObjective && (
        <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-gray-900 border-l border-gray-800 overflow-auto z-20">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-white">Objective Details</h2>
            <button
              onClick={() => setSelectedObjective(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={clsx(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                    selectedObjective.level === 'COMPANY'
                      ? 'bg-purple-500/20 text-purple-400'
                      : selectedObjective.level === 'DEPARTMENT'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  )}
                >
                  {getLevelIcon(selectedObjective.level)}
                  {selectedObjective.level}
                </span>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    getStatusColor(selectedObjective.status)
                  )}
                >
                  {selectedObjective.status}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white">{selectedObjective.title}</h3>
              {selectedObjective.description && (
                <p className="text-gray-400 mt-2">{selectedObjective.description}</p>
              )}
            </div>

            {/* Progress */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Overall Progress</span>
                <span className="text-xl font-bold text-white">
                  {selectedObjective.progress}%
                </span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    getProgressColor(selectedObjective.progress)
                  )}
                  style={{ width: `${selectedObjective.progress}%` }}
                />
              </div>
            </div>

            {/* Time Period */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-white">Time Period</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-gray-500">Start</div>
                  <div className="text-white">
                    {new Date(selectedObjective.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-gray-600">→</div>
                <div className="text-right">
                  <div className="text-gray-500">End</div>
                  <div className="text-white">
                    {new Date(selectedObjective.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Owner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                {selectedObjective.owner
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <div className="text-sm text-gray-500">Owner</div>
                <div className="text-white font-medium">{selectedObjective.owner}</div>
              </div>
            </div>

            {/* Key Results */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Key Results ({selectedObjective.keyResults.length})
              </h4>
              <div className="space-y-3">
                {selectedObjective.keyResults.map((kr) => (
                  <div
                    key={kr.id}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          getStatusColor(kr.status)
                        )}
                      >
                        {kr.status.replace(/_/g, ' ')}
                      </span>
                      {kr.status === 'AT_RISK' && (
                        <AlertTriangle className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{kr.title}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full', getProgressColor(kr.progress))}
                          style={{ width: `${kr.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{kr.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>Current: {formatValue(kr)}</span>
                      <span>Target: {formatTarget(kr)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insight */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-claude-primary-500/10 to-purple-500/10 border border-claude-primary-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-claude-primary-500/20">
                  <Sparkles className="w-4 h-4 text-claude-primary-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-claude-primary-300 mb-1">
                    AI Insight
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedObjective.progress >= 75
                      ? `This objective is on track to be achieved. ${
                          selectedObjective.keyResults.filter((kr) => kr.status === 'ACHIEVED')
                            .length
                        } of ${selectedObjective.keyResults.length} key results are already achieved.`
                      : selectedObjective.progress >= 50
                      ? `This objective is making good progress but has ${
                          selectedObjective.keyResults.filter((kr) => kr.status === 'AT_RISK')
                            .length
                        } at-risk key results that need attention.`
                      : `This objective is at risk. Focus on the key results marked as "At Risk" to get back on track.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                Edit Objective
              </button>
              <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors">
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OutcomesView;
