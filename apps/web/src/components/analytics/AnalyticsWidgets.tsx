/**
 * AnalyticsWidgets - Velocity, burndown, and progress visualizations
 * Rich data visualizations for project insights
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import type { Slice, Intent } from '../../data/enterprise-data';

interface AnalyticsWidgetsProps {
  slices: Slice[];
  intents: Intent[];
}

export function AnalyticsWidgets({ slices, intents }: AnalyticsWidgetsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <VelocityWidget slices={slices} />
      <CompletionWidget slices={slices} />
      <GoalProgressWidget slices={slices} intents={intents} />
      <BurndownWidget slices={slices} />
    </div>
  );
}

// Velocity Chart Widget
function VelocityWidget({ slices }: { slices: Slice[] }) {
  const velocityData = useMemo(() => {
    const weeks: number[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7) - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const completed = slices.filter(s => {
        if (s.status !== 'completed') return false;
        const date = new Date(s.updatedAt);
        return date >= weekStart && date < weekEnd;
      });

      weeks.push(completed.reduce((sum, s) => sum + (s.storyPoints || 1), 0));
    }

    return weeks;
  }, [slices]);

  const avg = Math.round(velocityData.reduce((a, b) => a + b, 0) / velocityData.length);
  const current = velocityData[velocityData.length - 1];
  const trend = current > avg ? 'up' : current < avg ? 'down' : 'stable';
  const max = Math.max(...velocityData, 1);

  return (
    <div className="bg-claude-neutral-800 rounded-xl p-4 border border-claude-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-claude-neutral-200">Velocity</span>
        </div>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
        {trend === 'stable' && <Minus className="w-4 h-4 text-yellow-400" />}
      </div>

      <div className="flex items-end gap-1 h-16 mb-2">
        {velocityData.map((value, i) => (
          <div
            key={i}
            className={clsx(
              'flex-1 rounded-t transition-all',
              i === velocityData.length - 1
                ? 'bg-blue-500'
                : 'bg-claude-neutral-600'
            )}
            style={{ height: `${(value / max) * 100}%`, minHeight: '4px' }}
          />
        ))}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-claude-neutral-100">{current}</span>
        <span className="text-sm text-claude-neutral-500">pts this week</span>
      </div>
      <div className="text-xs text-claude-neutral-500 mt-1">
        Avg: {avg} pts/week
      </div>
    </div>
  );
}

// Completion Rate Widget
function CompletionWidget({ slices }: { slices: Slice[] }) {
  const stats = useMemo(() => {
    const total = slices.length || 1;
    const completed = slices.filter(s => s.status === 'completed').length;
    const inProgress = slices.filter(s => s.status === 'in_progress').length;
    const blocked = slices.filter(s => s.status === 'blocked').length;
    const backlog = total - completed - inProgress - blocked;

    return {
      total,
      completed,
      inProgress,
      blocked,
      backlog,
      rate: Math.round((completed / total) * 100),
    };
  }, [slices]);

  const segments = [
    { label: 'Done', value: stats.completed, color: 'bg-green-500' },
    { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-500' },
    { label: 'Blocked', value: stats.blocked, color: 'bg-red-500' },
    { label: 'Backlog', value: stats.backlog, color: 'bg-claude-neutral-600' },
  ];

  return (
    <div className="bg-claude-neutral-800 rounded-xl p-4 border border-claude-neutral-700">
      <div className="flex items-center gap-2 mb-3">
        <PieChart className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-claude-neutral-200">Completion</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={clsx('transition-all', seg.color)}
            style={{ width: `${(seg.value / stats.total) * 100}%` }}
          />
        ))}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-claude-neutral-100">{stats.rate}%</span>
        <span className="text-sm text-claude-neutral-500">complete</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {segments.slice(0, 4).map(seg => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className={clsx('w-2 h-2 rounded-full', seg.color)} />
            <span className="text-claude-neutral-400">{seg.label}</span>
            <span className="text-claude-neutral-500 ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Goal Progress Widget
function GoalProgressWidget({ slices, intents }: { slices: Slice[]; intents: Intent[] }) {
  const goals = useMemo(() => {
    return intents
      .filter(i => i.type === 'goal' && i.status === 'active')
      .map(goal => {
        const linked = slices.filter(s => s.linkedIntent === goal.id);
        const completed = linked.filter(s => s.status === 'completed').length;
        const total = linked.length || 1;
        const progress = Math.round((completed / total) * 100);

        return {
          id: goal.id,
          name: goal.name,
          progress,
          completed,
          total: linked.length,
        };
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [slices, intents]);

  const avgProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;

  return (
    <div className="bg-claude-neutral-800 rounded-xl p-4 border border-claude-neutral-700">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-claude-neutral-200">Goals</span>
      </div>

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="text-sm text-claude-neutral-500 text-center py-4">
            No active goals
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-claude-neutral-300 truncate pr-2">
                  {goal.name}
                </span>
                <span className="text-xs text-claude-neutral-500">
                  {goal.completed}/{goal.total}
                </span>
              </div>
              <div className="h-1.5 bg-claude-neutral-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    goal.progress >= 80 ? 'bg-green-500' :
                    goal.progress >= 50 ? 'bg-yellow-500' :
                    'bg-purple-500'
                  )}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-claude-neutral-700">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-claude-neutral-100">{avgProgress}%</span>
            <span className="text-xs text-claude-neutral-500">avg goal progress</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Burndown Widget
function BurndownWidget({ slices }: { slices: Slice[] }) {
  const burndownData = useMemo(() => {
    const days = 14;
    const data: { day: number; remaining: number; ideal: number }[] = [];
    const now = new Date();

    // Get slices created in last 2 weeks
    const sprintStart = new Date(now);
    sprintStart.setDate(sprintStart.getDate() - days);

    const sprintSlices = slices.filter(s => {
      const created = new Date(s.createdAt);
      return created >= sprintStart;
    });

    const totalPoints = sprintSlices.reduce((sum, s) => sum + (s.storyPoints || 1), 0);
    const idealBurnRate = totalPoints / days;

    for (let i = 0; i <= days; i++) {
      const date = new Date(sprintStart);
      date.setDate(date.getDate() + i);

      const completedByDate = sprintSlices.filter(s => {
        if (s.status !== 'completed') return false;
        const completed = new Date(s.updatedAt);
        return completed <= date;
      });

      const completedPoints = completedByDate.reduce((sum, s) => sum + (s.storyPoints || 1), 0);

      data.push({
        day: i,
        remaining: totalPoints - completedPoints,
        ideal: Math.max(0, totalPoints - (idealBurnRate * i)),
      });
    }

    return { data, totalPoints };
  }, [slices]);

  const currentRemaining = burndownData.data[burndownData.data.length - 1]?.remaining || 0;
  const idealRemaining = burndownData.data[burndownData.data.length - 1]?.ideal || 0;
  const isOnTrack = currentRemaining <= idealRemaining;

  return (
    <div className="bg-claude-neutral-800 rounded-xl p-4 border border-claude-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-claude-neutral-200">Burndown</span>
        </div>
        {isOnTrack ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-orange-400" />
        )}
      </div>

      {/* Mini chart */}
      <div className="relative h-16 mb-3">
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          {/* Ideal line */}
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="50"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          {/* Actual line */}
          <polyline
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            points={burndownData.data
              .map((d, i) => {
                const x = (i / (burndownData.data.length - 1)) * 100;
                const y = burndownData.totalPoints > 0
                  ? ((burndownData.totalPoints - d.remaining) / burndownData.totalPoints) * 50
                  : 50;
                return `${x},${50 - y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-claude-neutral-100">
          {Math.round(currentRemaining)}
        </span>
        <span className="text-sm text-claude-neutral-500">pts remaining</span>
      </div>
      <div className="text-xs mt-1">
        <span className={isOnTrack ? 'text-green-400' : 'text-orange-400'}>
          {isOnTrack ? 'On track' : `${Math.round(currentRemaining - idealRemaining)} pts behind`}
        </span>
      </div>
    </div>
  );
}

// Export individual widgets
export { VelocityWidget, CompletionWidget, GoalProgressWidget, BurndownWidget };
