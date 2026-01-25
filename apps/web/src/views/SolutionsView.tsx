/**
 * SolutionsView - Solution Templates & Use Case Gallery
 *
 * A comprehensive gallery for discovering and implementing solutions:
 * - Use case templates with proven success rates
 * - Implementation guides
 * - Time and cost savings metrics
 * - Customer success stories
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Lightbulb,
  Clock,
  DollarSign,
  CheckCircle2,
  Users,
  Search,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Code,
  BarChart3,
  HeartHandshake,
  Shield,
  Zap,
  Target,
  Star,
  ExternalLink,
  PlayCircle,
  BookOpen,
  Building2,
} from 'lucide-react';

interface UseCase {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  industry?: string;
  persona?: string;
  problemStatement?: string;
  valueProposition?: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'DEPRECATED';
  isPublic: boolean;
  avgTimeSaving?: number;
  avgCostSaving?: number;
  implementationCount: number;
  successRate?: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedSetupTime?: string;
  prerequisites?: string[];
  keyFeatures?: string[];
}

// Demo data
const demoUseCases: UseCase[] = [
  {
    id: 'uc-1',
    name: 'Automated Lead Scoring',
    slug: 'automated-lead-scoring',
    description:
      'Use AI to automatically score and prioritize incoming leads based on engagement patterns and firmographic data.',
    category: 'Sales',
    industry: 'SaaS',
    persona: 'Sales Manager',
    problemStatement: 'Sales teams waste time on unqualified leads',
    valueProposition: 'Focus on high-value prospects, close 30% faster',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 15,
    avgCostSaving: 5000,
    implementationCount: 47,
    successRate: 92,
    complexity: 'MEDIUM',
    estimatedSetupTime: '2-3 days',
    prerequisites: ['CRM integration', 'Historical lead data'],
    keyFeatures: ['AI scoring model', 'Real-time updates', 'CRM sync'],
  },
  {
    id: 'uc-2',
    name: 'Customer Health Monitoring',
    slug: 'customer-health-monitoring',
    description:
      'Proactively identify at-risk customers before they churn with automated health scoring and alerts.',
    category: 'Customer Success',
    industry: 'SaaS',
    persona: 'Customer Success Manager',
    problemStatement: 'Churn surprises leadership',
    valueProposition: 'Reduce churn by 40% with early intervention',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 20,
    avgCostSaving: 25000,
    implementationCount: 38,
    successRate: 88,
    complexity: 'HIGH',
    estimatedSetupTime: '1 week',
    prerequisites: ['Product analytics', 'Support ticket data'],
    keyFeatures: ['Health score algorithm', 'Alert triggers', 'Playbooks'],
  },
  {
    id: 'uc-3',
    name: 'Sprint Planning Assistant',
    slug: 'sprint-planning-assistant',
    description:
      'AI-powered sprint planning that considers velocity, dependencies, and team capacity.',
    category: 'Engineering',
    persona: 'Engineering Manager',
    problemStatement: 'Sprint planning takes too long and is often inaccurate',
    valueProposition: 'Cut planning time by 60%, improve accuracy',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 8,
    implementationCount: 29,
    successRate: 85,
    complexity: 'MEDIUM',
    estimatedSetupTime: '3-4 days',
    prerequisites: ['Jira/Linear integration', 'Historical sprint data'],
    keyFeatures: ['Velocity tracking', 'Capacity planning', 'Dependency mapping'],
  },
  {
    id: 'uc-4',
    name: 'Contract Analysis',
    slug: 'contract-analysis',
    description:
      'Automatically extract key terms, dates, and obligations from contracts and legal documents.',
    category: 'Legal',
    industry: 'Legal',
    persona: 'Legal Ops',
    problemStatement: 'Manual contract review is slow and error-prone',
    valueProposition: 'Review contracts 10x faster',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 40,
    avgCostSaving: 15000,
    implementationCount: 22,
    successRate: 94,
    complexity: 'HIGH',
    estimatedSetupTime: '1-2 weeks',
    prerequisites: ['Document storage integration', 'Contract templates'],
    keyFeatures: ['OCR extraction', 'Clause identification', 'Risk flagging'],
  },
  {
    id: 'uc-5',
    name: 'Campaign Performance Insights',
    slug: 'campaign-performance',
    description:
      'Get AI-generated insights on marketing campaign performance with recommendations for optimization.',
    category: 'Marketing',
    persona: 'Marketing Manager',
    problemStatement: 'Hard to understand what is working across channels',
    valueProposition: 'Improve campaign ROI by 25%',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 10,
    implementationCount: 56,
    successRate: 82,
    complexity: 'LOW',
    estimatedSetupTime: '1-2 days',
    prerequisites: ['Marketing platform integration'],
    keyFeatures: ['Cross-channel analysis', 'AI recommendations', 'A/B insights'],
  },
  {
    id: 'uc-6',
    name: 'Incident Response Automation',
    slug: 'incident-response',
    description:
      'Automatically classify, route, and begin remediation for infrastructure incidents.',
    category: 'Operations',
    industry: 'Tech',
    persona: 'DevOps',
    problemStatement: 'Manual incident response is slow',
    valueProposition: 'Reduce MTTR by 50%',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 30,
    implementationCount: 12,
    successRate: 90,
    complexity: 'HIGH',
    estimatedSetupTime: '2 weeks',
    prerequisites: ['Monitoring integration', 'Runbook documentation'],
    keyFeatures: ['Auto-classification', 'Intelligent routing', 'Auto-remediation'],
  },
  {
    id: 'uc-7',
    name: 'Employee Onboarding Workflow',
    slug: 'employee-onboarding',
    description:
      'Streamline new hire onboarding with automated task assignment, document collection, and training scheduling.',
    category: 'HR',
    persona: 'HR Manager',
    problemStatement: 'Onboarding is inconsistent and time-consuming',
    valueProposition: 'Reduce onboarding time by 40%',
    status: 'PUBLISHED',
    isPublic: true,
    avgTimeSaving: 20,
    implementationCount: 33,
    successRate: 87,
    complexity: 'MEDIUM',
    estimatedSetupTime: '4-5 days',
    prerequisites: ['HRIS integration', 'Document templates'],
    keyFeatures: ['Task automation', 'Doc collection', 'Training scheduler'],
  },
  {
    id: 'uc-8',
    name: 'Revenue Forecasting',
    slug: 'revenue-forecasting',
    description:
      'AI-powered revenue forecasting using historical data, pipeline metrics, and market signals.',
    category: 'Finance',
    persona: 'CFO',
    problemStatement: 'Revenue forecasts are often inaccurate',
    valueProposition: 'Improve forecast accuracy by 35%',
    status: 'REVIEW',
    isPublic: true,
    avgTimeSaving: 12,
    avgCostSaving: 50000,
    implementationCount: 8,
    successRate: 91,
    complexity: 'HIGH',
    estimatedSetupTime: '2-3 weeks',
    prerequisites: ['CRM data', 'Financial data'],
    keyFeatures: ['ML forecasting', 'Scenario modeling', 'Variance analysis'],
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  Sales: <Target className="w-4 h-4" />,
  'Customer Success': <HeartHandshake className="w-4 h-4" />,
  Engineering: <Code className="w-4 h-4" />,
  Legal: <Shield className="w-4 h-4" />,
  Marketing: <BarChart3 className="w-4 h-4" />,
  Operations: <Zap className="w-4 h-4" />,
  HR: <Users className="w-4 h-4" />,
  Finance: <DollarSign className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  Sales: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'Customer Success': 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  Engineering: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  Legal: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Marketing: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  Operations: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  HR: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  Finance: 'bg-green-500/20 text-green-400 border-green-500/40',
};

interface SolutionsViewProps {
  tenantId: string;
}

export function SolutionsView({ tenantId: _tenantId }: SolutionsViewProps) {
  const [useCases] = useState<UseCase[]>(demoUseCases);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // Filter use cases
  const filteredUseCases = useMemo(() => {
    return useCases.filter((uc) => {
      const matchesSearch =
        uc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || uc.category === categoryFilter;
      const matchesComplexity =
        complexityFilter === 'all' || uc.complexity === complexityFilter;
      const isPublished = uc.status === 'PUBLISHED' || uc.status === 'REVIEW';
      return matchesSearch && matchesCategory && matchesComplexity && isPublished;
    });
  }, [useCases, searchQuery, categoryFilter, complexityFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const published = useCases.filter((uc) => uc.status === 'PUBLISHED').length;
    const totalImplementations = useCases.reduce(
      (sum, uc) => sum + uc.implementationCount,
      0
    );
    const avgSuccessRate =
      useCases.filter((uc) => uc.successRate).length > 0
        ? useCases
            .filter((uc) => uc.successRate)
            .reduce((sum, uc) => sum + uc.successRate!, 0) /
          useCases.filter((uc) => uc.successRate).length
        : 0;
    const totalTimeSaved = useCases.reduce((sum, uc) => sum + (uc.avgTimeSaving || 0), 0);
    const categories = [...new Set(useCases.map((uc) => uc.category))];
    return { total: useCases.length, published, totalImplementations, avgSuccessRate, totalTimeSaved, categories };
  }, [useCases]);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'LOW':
        return 'bg-green-500/20 text-green-400';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'HIGH':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          selectedUseCase ? 'mr-[520px]' : ''
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                Solution Gallery
              </h1>
              <p className="text-sm text-gray-500">
                Proven templates and use cases to accelerate your implementation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setView('grid')}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    view === 'grid'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView('list')}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    view === 'list'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  List
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
                Submit Solution
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search solutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Categories</option>
              {kpis.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Complexity</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800/50">
          <div className="grid grid-cols-5 gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-xl border border-amber-500/20">
              <div className="flex items-center justify-between mb-1">
                <Lightbulb className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400">{kpis.published}</div>
              <div className="text-xs text-gray-500">Published Solutions</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-400">
                {kpis.totalImplementations}
              </div>
              <div className="text-xs text-gray-500">Implementations</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-xl font-bold text-green-400">
                {kpis.avgSuccessRate.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Avg Success Rate</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400">{kpis.totalTimeSaved}h</div>
              <div className="text-xs text-gray-500">Total Hours Saved</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-pink-500/10 to-rose-500/5 rounded-xl border border-pink-500/20">
              <div className="flex items-center justify-between mb-1">
                <Briefcase className="w-4 h-4 text-pink-400" />
              </div>
              <div className="text-xl font-bold text-pink-400">{kpis.categories.length}</div>
              <div className="text-xs text-gray-500">Categories</div>
            </div>
          </div>
        </div>

        {/* Use Cases Grid/List */}
        <div className="flex-1 overflow-auto p-6">
          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUseCases.map((useCase) => (
                <div
                  key={useCase.id}
                  onClick={() => setSelectedUseCase(useCase)}
                  className={clsx(
                    'rounded-xl border cursor-pointer transition-all',
                    selectedUseCase?.id === useCase.id
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={clsx(
                          'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border',
                          categoryColors[useCase.category] || 'bg-gray-500/20 text-gray-400'
                        )}
                      >
                        {categoryIcons[useCase.category]}
                        {useCase.category}
                      </span>
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-medium',
                          getComplexityColor(useCase.complexity)
                        )}
                      >
                        {useCase.complexity}
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-white mb-2">{useCase.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {useCase.description}
                    </p>

                    {/* Metrics */}
                    <div className="flex items-center gap-3 py-3 border-t border-gray-700/50">
                      {useCase.avgTimeSaving && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">{useCase.avgTimeSaving}h</span>
                          <span className="text-gray-500">saved</span>
                        </div>
                      )}
                      {useCase.avgCostSaving && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">
                            ${useCase.avgCostSaving.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {useCase.implementationCount}
                        </span>
                        {useCase.successRate && (
                          <span className="flex items-center gap-1 text-green-400">
                            <Star className="w-3.5 h-3.5" />
                            {useCase.successRate}%
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUseCases.map((useCase) => (
                <div
                  key={useCase.id}
                  onClick={() => setSelectedUseCase(useCase)}
                  className={clsx(
                    'rounded-xl border cursor-pointer transition-all',
                    selectedUseCase?.id === useCase.id
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={clsx(
                              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border',
                              categoryColors[useCase.category] || 'bg-gray-500/20 text-gray-400'
                            )}
                          >
                            {categoryIcons[useCase.category]}
                            {useCase.category}
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-medium',
                              getComplexityColor(useCase.complexity)
                            )}
                          >
                            {useCase.complexity}
                          </span>
                          {useCase.industry && (
                            <span className="text-[10px] text-gray-500">{useCase.industry}</span>
                          )}
                        </div>
                        <h3 className="text-base font-medium text-white mb-1">{useCase.name}</h3>
                        <p className="text-sm text-gray-500">{useCase.description}</p>
                        {useCase.valueProposition && (
                          <p className="text-sm text-amber-400/80 mt-2 italic">
                            "{useCase.valueProposition}"
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {useCase.implementationCount} implementations
                          </span>
                          {useCase.avgTimeSaving && (
                            <span className="flex items-center gap-1 text-green-400">
                              <Clock className="w-3.5 h-3.5" />
                              {useCase.avgTimeSaving}h avg saved
                            </span>
                          )}
                          {useCase.successRate && (
                            <span className="flex items-center gap-1 text-green-400">
                              <Star className="w-3.5 h-3.5" />
                              {useCase.successRate}% success
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUseCase(useCase);
                        }}
                        className="ml-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedUseCase && (
        <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-gray-900 border-l border-gray-800 overflow-auto z-20">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-white">Solution Details</h2>
            <button
              onClick={() => setSelectedUseCase(null)}
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
                    'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border',
                    categoryColors[selectedUseCase.category] || 'bg-gray-500/20 text-gray-400'
                  )}
                >
                  {categoryIcons[selectedUseCase.category]}
                  {selectedUseCase.category}
                </span>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    getComplexityColor(selectedUseCase.complexity)
                  )}
                >
                  {selectedUseCase.complexity} complexity
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white">{selectedUseCase.name}</h3>
              <p className="text-gray-400 mt-2">{selectedUseCase.description}</p>
            </div>

            {/* Value Proposition */}
            {selectedUseCase.valueProposition && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/30">
                <div className="text-sm font-medium text-amber-300 mb-1">Value Proposition</div>
                <p className="text-white">{selectedUseCase.valueProposition}</p>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {selectedUseCase.avgTimeSaving && (
                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Time Saved</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {selectedUseCase.avgTimeSaving}h
                  </div>
                  <div className="text-xs text-gray-500">average per month</div>
                </div>
              )}
              {selectedUseCase.avgCostSaving && (
                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Cost Saved</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    ${selectedUseCase.avgCostSaving.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">average per year</div>
                </div>
              )}
            </div>

            {/* Success Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Implementations</span>
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {selectedUseCase.implementationCount}
                </div>
              </div>
              {selectedUseCase.successRate && (
                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-400">Success Rate</span>
                  </div>
                  <div className="text-xl font-bold text-green-400">
                    {selectedUseCase.successRate}%
                  </div>
                </div>
              )}
            </div>

            {/* Setup Info */}
            {selectedUseCase.estimatedSetupTime && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">Estimated Setup Time</span>
                </div>
                <div className="text-lg text-white">{selectedUseCase.estimatedSetupTime}</div>
              </div>
            )}

            {/* Prerequisites */}
            {selectedUseCase.prerequisites && selectedUseCase.prerequisites.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  Prerequisites
                </h4>
                <div className="space-y-2">
                  {selectedUseCase.prerequisites.map((prereq, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
                      {prereq}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Features */}
            {selectedUseCase.keyFeatures && selectedUseCase.keyFeatures.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Key Features
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUseCase.keyFeatures.map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-lg border border-gray-700"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Statement */}
            {selectedUseCase.problemStatement && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="text-sm text-gray-500 mb-1">Problem Solved</div>
                <p className="text-white">{selectedUseCase.problemStatement}</p>
              </div>
            )}

            {/* AI Insight */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-claude-primary-500/10 to-purple-500/10 border border-claude-primary-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-claude-primary-500/20">
                  <Sparkles className="w-4 h-4 text-claude-primary-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-claude-primary-300 mb-1">
                    AI Recommendation
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedUseCase.successRate && selectedUseCase.successRate >= 90
                      ? `This solution has an excellent track record with ${selectedUseCase.successRate}% success rate. Highly recommended for your use case.`
                      : selectedUseCase.complexity === 'HIGH'
                      ? `This is a complex implementation. Consider starting with prerequisites and allocating ${selectedUseCase.estimatedSetupTime || 'adequate time'} for setup.`
                      : `Based on your profile, this solution could save you approximately ${selectedUseCase.avgTimeSaving || 10}h per month.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </button>
              <button className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <PlayCircle className="w-4 h-4" />
                Start Implementation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolutionsView;
