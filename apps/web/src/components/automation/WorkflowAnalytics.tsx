/**
 * WorkflowAnalytics - Real-time analytics for workflow execution
 * @prompt-id forge-v4.1:ui:component:workflow-analytics:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkflowExecution } from '../../api/workflows';

interface WorkflowAnalyticsProps {
  executions: WorkflowExecution[];
  timeRange?: '24h' | '7d' | '30d';
  className?: string;
}

export function WorkflowAnalytics({
  executions,
  timeRange = '7d',
  className,
}: WorkflowAnalyticsProps) {
  const analytics = useMemo(() => {
    const now = new Date();
    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const cutoff = new Date(now.getTime() - rangeMs);
    const filteredExecutions = executions.filter(
      e => new Date(e.startedAt || '') >= cutoff
    );

    // Calculate metrics
    const total = filteredExecutions.length;
    const completed = filteredExecutions.filter(e => e.status === 'COMPLETED').length;
    const failed = filteredExecutions.filter(e => e.status === 'FAILED').length;
    const running = filteredExecutions.filter(e => e.status === 'RUNNING').length;
    const pending = filteredExecutions.filter(e => e.status === 'PENDING').length;

    // Calculate success rate
    const finishedExecutions = completed + failed;
    const successRate = finishedExecutions > 0 ? (completed / finishedExecutions) * 100 : 100;

    // Calculate average duration (for completed executions)
    const completedWithDuration = filteredExecutions
      .filter(e => e.status === 'COMPLETED' && e.startedAt && e.completedAt)
      .map(e => new Date(e.completedAt!).getTime() - new Date(e.startedAt!).getTime());

    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((a, b) => a + b, 0) / completedWithDuration.length
      : 0;

    // Calculate trend (compare to previous period)
    const previousCutoff = new Date(cutoff.getTime() - rangeMs);
    const previousExecutions = executions.filter(e => {
      const date = new Date(e.startedAt || '');
      return date >= previousCutoff && date < cutoff;
    });
    const previousTotal = previousExecutions.length;
    const trend = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

    // Group by hour/day for chart
    const buckets = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const bucketMs = rangeMs / buckets;
    const chartData = Array(buckets).fill(0).map((_, i) => {
      const bucketStart = new Date(now.getTime() - (buckets - i) * bucketMs);
      const bucketEnd = new Date(now.getTime() - (buckets - i - 1) * bucketMs);
      return filteredExecutions.filter(e => {
        const date = new Date(e.startedAt || '');
        return date >= bucketStart && date < bucketEnd;
      }).length;
    });

    // Most active workflows
    const workflowCounts: Record<string, { name: string; count: number; successful: number }> = {};
    filteredExecutions.forEach(e => {
      if (!workflowCounts[e.workflowId]) {
        workflowCounts[e.workflowId] = {
          name: e.workflow?.name || 'Unknown',
          count: 0,
          successful: 0,
        };
      }
      workflowCounts[e.workflowId].count++;
      if (e.status === 'COMPLETED') {
        workflowCounts[e.workflowId].successful++;
      }
    });

    const topWorkflows = Object.entries(workflowCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      completed,
      failed,
      running,
      pending,
      successRate,
      avgDuration,
      trend,
      chartData,
      topWorkflows,
    };
  }, [executions, timeRange]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Executions"
          value={analytics.total}
          icon={Activity}
          trend={analytics.trend}
        />
        <StatCard
          label="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          icon={CheckCircle2}
          color={analytics.successRate >= 95 ? 'green' : analytics.successRate >= 80 ? 'yellow' : 'red'}
        />
        <StatCard
          label="Failed"
          value={analytics.failed}
          icon={XCircle}
          color={analytics.failed > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(analytics.avgDuration)}
          icon={Clock}
        />
      </div>

      {/* Execution Chart */}
      <div className="bg-claude-neutral-900 rounded-xl border border-claude-neutral-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-claude-neutral-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-claude-primary-400" />
            Execution Activity
          </h3>
          <span className="text-xs text-claude-neutral-500">
            Last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
          </span>
        </div>
        <div className="h-24 flex items-end gap-1">
          {analytics.chartData.map((count, i) => {
            const maxCount = Math.max(...analytics.chartData, 1);
            const height = (count / maxCount) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-claude-primary-500/30 hover:bg-claude-primary-500/50 rounded-t transition-colors cursor-pointer group relative"
                style={{ height: `${Math.max(height, 4)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-claude-neutral-800 px-2 py-1 rounded text-xs text-claude-neutral-200 whitespace-nowrap">
                    {count} executions
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-claude-neutral-900 rounded-xl border border-claude-neutral-800 p-4">
        <h3 className="text-sm font-medium text-claude-neutral-200 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Status Breakdown
        </h3>
        <div className="space-y-3">
          <StatusBar label="Completed" value={analytics.completed} total={analytics.total} color="green" />
          <StatusBar label="Failed" value={analytics.failed} total={analytics.total} color="red" />
          <StatusBar label="Running" value={analytics.running} total={analytics.total} color="blue" />
          <StatusBar label="Pending" value={analytics.pending} total={analytics.total} color="yellow" />
        </div>
      </div>

      {/* Top Workflows */}
      {analytics.topWorkflows.length > 0 && (
        <div className="bg-claude-neutral-900 rounded-xl border border-claude-neutral-800 p-4">
          <h3 className="text-sm font-medium text-claude-neutral-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Most Active Workflows
          </h3>
          <div className="space-y-2">
            {analytics.topWorkflows.map(workflow => (
              <div
                key={workflow.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-claude-neutral-800/50"
              >
                <span className="text-sm text-claude-neutral-200 truncate flex-1">
                  {workflow.name}
                </span>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs text-claude-neutral-400">
                    {workflow.count} runs
                  </span>
                  <span className={clsx(
                    'text-xs',
                    workflow.successful === workflow.count ? 'text-green-400' : 'text-yellow-400'
                  )}>
                    {Math.round((workflow.successful / workflow.count) * 100)}% success
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue';
}

function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  };

  return (
    <div className="bg-claude-neutral-900 rounded-xl border border-claude-neutral-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-claude-neutral-500 uppercase tracking-wider">{label}</span>
        <div className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          color ? colorClasses[color] : 'bg-claude-primary-500/10 text-claude-primary-400'
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-claude-neutral-100">{value}</span>
        {trend !== undefined && trend !== 0 && (
          <div className={clsx(
            'flex items-center gap-0.5 text-xs mb-1',
            trend > 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatusBarProps {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'red' | 'yellow' | 'blue';
}

function StatusBar({ label, value, total, color }: StatusBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-claude-neutral-400 w-20">{label}</span>
      <div className="flex-1 h-2 bg-claude-neutral-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-claude-neutral-300 w-12 text-right">{value}</span>
    </div>
  );
}

export default WorkflowAnalytics;
