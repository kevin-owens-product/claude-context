/**
 * @prompt-id forge-v4.1:web:components:analytics:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';

interface AnalyticsDashboardProps {
  workspaceId: string;
}

interface TopContextDoc {
  nodeId: string;
  name: string;
  usageCount: number;
  effectivenessScore: number;
}

interface CommonError {
  category: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  summary: {
    totalSessions: number;
    positiveRatings: number;
    negativeRatings: number;
    skippedRatings: number;
  };
  trends: Array<{ date: string; sessions: number; positiveRatings: number; negativeRatings: number }>;
  topContext: TopContextDoc[];
  commonErrors: CommonError[];
}

interface RealtimeData {
  sessions: number;
  positive: number;
  negative: number;
}

const COLORS = ['#10B981', '#EF4444', '#6B7280'];

export function AnalyticsDashboard({ workspaceId }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState(30);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endDate = new Date();
  const startDate = subDays(endDate, dateRange);

  // Direct fetch instead of React Query (debugging issue)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const analyticsUrl = `/api/v1/workspaces/${workspaceId}/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
        const realtimeUrl = `/api/v1/workspaces/${workspaceId}/metrics/realtime`;

        const headers = {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        };

        const [analyticsRes, realtimeRes] = await Promise.all([
          fetch(analyticsUrl, { headers }),
          fetch(realtimeUrl, { headers }),
        ]);

        if (!analyticsRes.ok) {
          throw new Error(`Analytics API error: ${analyticsRes.status}`);
        }

        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);

        if (realtimeRes.ok) {
          const realtimeData = await realtimeRes.json();
          setRealtime(realtimeData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error loading analytics: {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No analytics data available
      </div>
    );
  }

  const { summary, trends, topContext, commonErrors } = analytics;

  const satisfactionRate =
    summary.positiveRatings + summary.negativeRatings > 0
      ? (summary.positiveRatings / (summary.positiveRatings + summary.negativeRatings)) * 100
      : 0;

  const ratingData = [
    { name: 'Positive', value: summary.positiveRatings },
    { name: 'Negative', value: summary.negativeRatings },
    { name: 'Skipped', value: summary.skippedRatings },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-md text-sm bg-white dark:bg-claude-neutral-700 text-gray-900 dark:text-gray-100"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Real-time Metrics */}
      {realtime && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Today&apos;s Activity</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{realtime.sessions}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{realtime.positive}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{realtime.negative}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Negative</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sessions"
          value={summary.totalSessions}
          icon={<Activity className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          title="Satisfaction Rate"
          value={`${satisfactionRate.toFixed(1)}%`}
          icon={
            satisfactionRate >= 70 ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )
          }
        />
        <MetricCard
          title="Positive Ratings"
          value={summary.positiveRatings}
          icon={<ThumbsUp className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Negative Ratings"
          value={summary.negativeRatings}
          icon={<ThumbsDown className="w-5 h-5 text-red-500" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Session Trends</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Sessions"
                  />
                  <Line
                    type="monotone"
                    dataKey="positiveRatings"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Positive"
                  />
                  <Line
                    type="monotone"
                    dataKey="negativeRatings"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Negative"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Rating Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {ratingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Context Documents */}
      {topContext.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Most Used Context Documents</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topContext.slice(0, 5).map((doc) => (
                <div key={doc.nodeId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{doc.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Used {doc.usageCount} times
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {doc.effectivenessScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Effectiveness</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Errors */}
      {commonErrors.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Common Issues</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonErrors.map((error) => (
                <div key={error.category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {error.category.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {error.count} ({error.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-claude-neutral-600 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${error.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
