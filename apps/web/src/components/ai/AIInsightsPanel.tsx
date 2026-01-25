/**
 * AIInsightsPanel - Claude's intelligent analysis of project health
 * Provides proactive insights, risk detection, and smart suggestions
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Clock,
  Users,
  GitPullRequest,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react';
import type { Slice, Intent } from '../../data/enterprise-data';

interface AIInsightsPanelProps {
  slices: Slice[];
  intents: Intent[];
  onSliceClick?: (slice: Slice) => void;
  onIntentClick?: (intent: Intent) => void;
}

interface Insight {
  id: string;
  type: 'risk' | 'opportunity' | 'blocker' | 'achievement' | 'suggestion';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  relatedItems?: { type: string; id: string; name: string }[];
}

interface HealthMetric {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export function AIInsightsPanel({
  slices,
  intents,
  onSliceClick,
  onIntentClick,
}: AIInsightsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Generate AI insights based on project data
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    // Check for blocked items
    const blockedSlices = slices.filter(s => s.status === 'blocked');
    if (blockedSlices.length > 0) {
      result.push({
        id: 'blocked-items',
        type: 'blocker',
        severity: 'critical',
        title: `${blockedSlices.length} blocked item${blockedSlices.length > 1 ? 's' : ''} need attention`,
        description: `Blocked items are preventing progress. Consider reassigning or breaking down these tasks.`,
        action: 'Review blocked items',
        relatedItems: blockedSlices.map(s => ({ type: 'slice', id: s.id, name: s.name })),
      });
    }

    // Check for overdue items
    const overdueSlices = slices.filter(
      s => s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'completed'
    );
    if (overdueSlices.length > 0) {
      result.push({
        id: 'overdue-items',
        type: 'risk',
        severity: 'high',
        title: `${overdueSlices.length} overdue item${overdueSlices.length > 1 ? 's' : ''}`,
        description: 'These items have passed their due dates. Consider adjusting timelines or prioritization.',
        action: 'Update due dates',
        relatedItems: overdueSlices.slice(0, 3).map(s => ({ type: 'slice', id: s.id, name: s.name })),
      });
    }

    // Check for unlinked slices
    const unlinkedSlices = slices.filter(s => !s.linkedIntent);
    if (unlinkedSlices.length > 3) {
      result.push({
        id: 'unlinked-slices',
        type: 'suggestion',
        severity: 'medium',
        title: `${unlinkedSlices.length} slices not linked to intents`,
        description: 'Linking slices to intents helps track progress toward goals and improves traceability.',
        action: 'Link to intents',
      });
    }

    // Check for stale in-progress items
    const staleInProgress = slices.filter(s => {
      if (s.status !== 'in_progress') return false;
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    });
    if (staleInProgress.length > 0) {
      result.push({
        id: 'stale-progress',
        type: 'risk',
        severity: 'medium',
        title: `${staleInProgress.length} item${staleInProgress.length > 1 ? 's' : ''} stuck in progress`,
        description: 'Items haven\'t been updated in over a week. They may need attention or should be moved to blocked.',
        action: 'Review stale items',
        relatedItems: staleInProgress.slice(0, 3).map(s => ({ type: 'slice', id: s.id, name: s.name })),
      });
    }

    // Check velocity opportunity
    const completedThisWeek = slices.filter(s => {
      if (s.status !== 'completed') return false;
      const daysSinceComplete = Math.floor(
        (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceComplete <= 7;
    });
    if (completedThisWeek.length >= 5) {
      result.push({
        id: 'high-velocity',
        type: 'achievement',
        severity: 'low',
        title: 'Strong velocity this week!',
        description: `${completedThisWeek.length} items completed. The team is making great progress.`,
      });
    }

    // Check for PR review bottleneck
    const reviewSlices = slices.filter(s => s.status === 'in_review');
    if (reviewSlices.length > 5) {
      result.push({
        id: 'review-bottleneck',
        type: 'opportunity',
        severity: 'medium',
        title: 'Code review bottleneck detected',
        description: `${reviewSlices.length} items waiting for review. Consider scheduling a review session.`,
        action: 'Schedule reviews',
      });
    }

    // Check for goals at risk
    const goalsWithNoProgress = intents.filter(i => {
      if (i.type !== 'goal' || i.status !== 'active') return false;
      const linkedSlices = slices.filter(s => s.linkedIntent === i.id);
      const completedLinked = linkedSlices.filter(s => s.status === 'completed');
      return linkedSlices.length > 0 && completedLinked.length === 0;
    });
    if (goalsWithNoProgress.length > 0) {
      result.push({
        id: 'goals-at-risk',
        type: 'risk',
        severity: 'high',
        title: `${goalsWithNoProgress.length} goal${goalsWithNoProgress.length > 1 ? 's' : ''} with no completed work`,
        description: 'Active goals have linked work but none completed. Focus may be needed.',
        relatedItems: goalsWithNoProgress.map(i => ({ type: 'intent', id: i.id, name: i.name })),
      });
    }

    // Suggest automation
    if (slices.length > 20 && !result.some(r => r.type === 'suggestion')) {
      result.push({
        id: 'automation-suggestion',
        type: 'suggestion',
        severity: 'low',
        title: 'Consider workflow automation',
        description: 'With this many items, automated status transitions and notifications could save time.',
        action: 'Set up automation',
      });
    }

    return result;
  }, [slices, intents]);

  // Calculate health metrics
  const healthMetrics = useMemo<HealthMetric[]>(() => {
    const total = slices.length || 1;
    const completed = slices.filter(s => s.status === 'completed').length;
    const blocked = slices.filter(s => s.status === 'blocked').length;
    const inProgress = slices.filter(s => s.status === 'in_progress').length;

    const completionRate = Math.round((completed / total) * 100);
    const blockedRate = Math.round((blocked / total) * 100);
    const wipRate = Math.round((inProgress / total) * 100);

    return [
      {
        label: 'Completion',
        value: completionRate,
        trend: completionRate > 50 ? 'up' : 'stable',
        status: completionRate > 70 ? 'good' : completionRate > 40 ? 'warning' : 'critical',
      },
      {
        label: 'Health Score',
        value: Math.max(0, 100 - blockedRate * 3 - (wipRate > 30 ? 10 : 0)),
        trend: blocked === 0 ? 'up' : 'down',
        status: blocked === 0 ? 'good' : blocked <= 2 ? 'warning' : 'critical',
      },
      {
        label: 'Focus',
        value: Math.min(100, Math.round((inProgress / Math.max(1, inProgress + blocked)) * 100)),
        trend: inProgress > 0 && blocked === 0 ? 'up' : 'stable',
        status: wipRate < 40 ? 'good' : wipRate < 60 ? 'warning' : 'critical',
      },
    ];
  }, [slices]);

  const handleRefresh = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  const insightIcons = {
    risk: AlertTriangle,
    opportunity: Lightbulb,
    blocker: Shield,
    achievement: CheckCircle,
    suggestion: Sparkles,
  };

  const insightColors = {
    risk: 'text-orange-400 bg-orange-500/20',
    opportunity: 'text-blue-400 bg-blue-500/20',
    blocker: 'text-red-400 bg-red-500/20',
    achievement: 'text-green-400 bg-green-500/20',
    suggestion: 'text-purple-400 bg-purple-500/20',
  };

  const severityColors = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-blue-500',
  };

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-claude-neutral-100">AI Insights</h2>
            <p className="text-xs text-claude-neutral-500">Powered by Claude</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isAnalyzing}
          className={clsx(
            'p-1.5 rounded-lg transition-colors',
            isAnalyzing
              ? 'text-claude-neutral-600'
              : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
          )}
        >
          <RefreshCw className={clsx('w-4 h-4', isAnalyzing && 'animate-spin')} />
        </button>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-claude-neutral-800">
        {healthMetrics.map(metric => (
          <div
            key={metric.label}
            className="bg-claude-neutral-800 rounded-lg p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <span
                className={clsx(
                  'text-lg font-bold',
                  metric.status === 'good' && 'text-green-400',
                  metric.status === 'warning' && 'text-yellow-400',
                  metric.status === 'critical' && 'text-red-400'
                )}
              >
                {metric.value}%
              </span>
              {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
              {metric.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
            </div>
            <span className="text-xs text-claude-neutral-500">{metric.label}</span>
          </div>
        ))}
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
            <p className="text-claude-neutral-300 font-medium">Everything looks good!</p>
            <p className="text-sm text-claude-neutral-500 mt-1">
              No issues detected. Keep up the great work.
            </p>
          </div>
        ) : (
          insights.map(insight => {
            const Icon = insightIcons[insight.type];
            const isExpanded = expandedInsight === insight.id;

            return (
              <div
                key={insight.id}
                className={clsx(
                  'bg-claude-neutral-800 rounded-lg border-l-4 overflow-hidden transition-all',
                  severityColors[insight.severity]
                )}
              >
                <button
                  onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx('p-1.5 rounded-lg', insightColors[insight.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-claude-neutral-200">
                        {insight.title}
                      </h3>
                      <p className="text-xs text-claude-neutral-500 mt-0.5 line-clamp-2">
                        {insight.description}
                      </p>
                    </div>
                    <ChevronRight
                      className={clsx(
                        'w-4 h-4 text-claude-neutral-500 transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    {insight.relatedItems && insight.relatedItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-xs text-claude-neutral-500">Related:</span>
                        {insight.relatedItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.type === 'slice') {
                                const slice = slices.find(s => s.id === item.id);
                                if (slice) onSliceClick?.(slice);
                              } else if (item.type === 'intent') {
                                const intent = intents.find(i => i.id === item.id);
                                if (intent) onIntentClick?.(intent);
                              }
                            }}
                            className="flex items-center gap-2 w-full px-2 py-1.5 bg-claude-neutral-700/50 rounded text-xs text-claude-neutral-300 hover:bg-claude-neutral-700 transition-colors"
                          >
                            {item.type === 'slice' ? (
                              <BarChart3 className="w-3 h-3" />
                            ) : (
                              <Target className="w-3 h-3" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {insight.action && (
                      <button className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-claude-primary-500/20 text-claude-primary-400 rounded-lg text-xs hover:bg-claude-primary-500/30 transition-colors">
                        <Zap className="w-3 h-3" />
                        {insight.action}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="flex items-center justify-around px-4 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
        <div className="flex items-center gap-1.5 text-xs text-claude-neutral-400">
          <Clock className="w-3 h-3" />
          <span>{slices.filter(s => s.status === 'in_progress').length} in progress</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-claude-neutral-400">
          <GitPullRequest className="w-3 h-3" />
          <span>{slices.filter(s => s.status === 'in_review').length} in review</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-claude-neutral-400">
          <Users className="w-3 h-3" />
          <span>{new Set(slices.map(s => s.assignee.id)).size} active</span>
        </div>
      </div>
    </div>
  );
}
