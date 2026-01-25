/**
 * OKRDashboard - Objectives and Key Results dashboard
 * @prompt-id forge-v4.1:ui:component:okr-dashboard:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface KeyResult {
  id: string;
  title: string;
  metricType: string;
  unit?: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: string;
}

interface BusinessObjective {
  id: string;
  title: string;
  description?: string;
  type: string;
  level: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  children: BusinessObjective[];
}

interface OKRDashboardProps {
  tenantId: string;
  onSelectObjective?: (objectiveId: string) => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  ACHIEVED: 'bg-green-100 text-green-800',
  MISSED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const krStatusColors: Record<string, string> = {
  ON_TRACK: 'bg-green-100 text-green-800',
  AT_RISK: 'bg-yellow-100 text-yellow-800',
  OFF_TRACK: 'bg-red-100 text-red-800',
  ACHIEVED: 'bg-green-200 text-green-900',
  MISSED: 'bg-red-100 text-red-800',
};

// Demo data for development
const demoObjectives: BusinessObjective[] = [
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
    keyResults: [
      { id: 'kr-1', title: 'Increase monthly active users to 50K', metricType: 'NUMBER', unit: 'users', startValue: 28000, targetValue: 50000, currentValue: 42000, progress: 64, status: 'ON_TRACK' },
      { id: 'kr-2', title: 'Reduce time-to-first-value to under 5 minutes', metricType: 'DURATION', unit: 'min', startValue: 15, targetValue: 5, currentValue: 7, progress: 80, status: 'ON_TRACK' },
      { id: 'kr-3', title: 'Achieve 40% free-to-paid conversion', metricType: 'PERCENTAGE', unit: '%', startValue: 22, targetValue: 40, currentValue: 31, progress: 50, status: 'AT_RISK' },
    ],
    children: [],
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
    keyResults: [
      { id: 'kr-4', title: 'Close $2M in new enterprise ARR', metricType: 'CURRENCY', unit: 'M', startValue: 0, targetValue: 2, currentValue: 1.7, progress: 85, status: 'ON_TRACK' },
      { id: 'kr-5', title: 'Expand 15 strategic accounts by 25%+', metricType: 'NUMBER', unit: 'accounts', startValue: 0, targetValue: 15, currentValue: 12, progress: 80, status: 'ON_TRACK' },
    ],
    children: [],
  },
  {
    id: 'obj-3',
    title: 'Improve Customer Success',
    description: 'Reduce churn and increase customer satisfaction',
    type: 'OKR',
    level: 'DEPARTMENT',
    status: 'ACTIVE',
    progress: 45,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    keyResults: [
      { id: 'kr-6', title: 'Achieve NPS score of 60+', metricType: 'SCORE', unit: 'NPS', startValue: 42, targetValue: 60, currentValue: 51, progress: 50, status: 'AT_RISK' },
      { id: 'kr-7', title: 'Reduce monthly churn to under 2%', metricType: 'PERCENTAGE', unit: '%', startValue: 4.2, targetValue: 2, currentValue: 3.1, progress: 50, status: 'AT_RISK' },
      { id: 'kr-8', title: 'Decrease support ticket resolution time to 4 hours', metricType: 'DURATION', unit: 'hours', startValue: 12, targetValue: 4, currentValue: 8, progress: 50, status: 'AT_RISK' },
    ],
    children: [],
  },
  {
    id: 'obj-4',
    title: 'Platform Reliability',
    description: 'Ensure world-class uptime and performance',
    type: 'OKR',
    level: 'TEAM',
    status: 'ACHIEVED',
    progress: 100,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    keyResults: [
      { id: 'kr-9', title: 'Maintain 99.95% uptime', metricType: 'PERCENTAGE', unit: '%', startValue: 99.8, targetValue: 99.95, currentValue: 99.97, progress: 100, status: 'ACHIEVED' },
      { id: 'kr-10', title: 'P95 API latency under 100ms', metricType: 'DURATION', unit: 'ms', startValue: 180, targetValue: 100, currentValue: 85, progress: 100, status: 'ACHIEVED' },
    ],
    children: [],
  },
];

export const OKRDashboard: React.FC<OKRDashboardProps> = ({
  tenantId,
  onSelectObjective,
}) => {
  const [objectives, setObjectives] = useState<BusinessObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ level?: string; status?: string }>({});
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDashboard();
  }, [tenantId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/outcomes/dashboard', {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setObjectives(data.objectives || []);
    } catch (error) {
      console.error('Failed to load OKR dashboard, using demo data:', error);
      setObjectives(demoObjectives);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };

  const filteredObjectives = objectives.filter(o => {
    if (filter.level && o.level !== filter.level) return false;
    if (filter.status && o.status !== filter.status) return false;
    return true;
  });

  const overallProgress = objectives.length > 0
    ? objectives.reduce((sum, o) => sum + o.progress, 0) / objectives.length
    : 0;

  const achievedCount = objectives.filter(o => o.status === 'ACHIEVED').length;
  const atRiskCount = objectives.filter(o => o.progress < 50 && o.status === 'ACTIVE').length;

  const renderKeyResult = (kr: KeyResult) => (
    <div key={kr.id} className="py-2 pl-8 border-l-2 border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${krStatusColors[kr.status] || 'bg-gray-100 text-gray-800'}`}>
              {kr.status.replace(/_/g, ' ')}
            </span>
            <span className="text-sm text-gray-900">{kr.title}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${kr.progress >= 100 ? 'bg-green-500' : kr.progress >= 70 ? 'bg-blue-500' : kr.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, kr.progress)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-12">{kr.progress.toFixed(0)}%</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {kr.currentValue} / {kr.targetValue} {kr.unit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderObjective = (objective: BusinessObjective, depth: number = 0) => {
    const isExpanded = expandedObjectives.has(objective.id);
    const hasChildren = objective.children?.length > 0 || objective.keyResults?.length > 0;

    return (
      <Card key={objective.id} className={`p-4 ${depth > 0 ? 'ml-6 border-l-4 border-blue-200' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(objective.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[objective.status]}`}>
                {objective.status}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {objective.level}
              </span>
              <span className="text-xs text-gray-500">
                {objective.type}
              </span>
            </div>
            <h3
              className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => onSelectObjective?.(objective.id)}
            >
              {objective.title}
            </h3>
            {objective.description && (
              <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1 max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${objective.progress >= 100 ? 'bg-green-500' : objective.progress >= 70 ? 'bg-blue-500' : objective.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, objective.progress)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{objective.progress.toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(objective.startDate).toLocaleDateString()} - {new Date(objective.endDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Key Results */}
        {isExpanded && objective.keyResults?.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase">Key Results</div>
            {objective.keyResults.map(renderKeyResult)}
          </div>
        )}

        {/* Child Objectives */}
        {isExpanded && objective.children?.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="text-xs font-medium text-gray-500 uppercase">Sub-Objectives</div>
            {objective.children.map(child => renderObjective(child, depth + 1))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">OKR Dashboard</h2>
        <div className="flex gap-2">
          <select
            value={filter.level || ''}
            onChange={(e) => setFilter({ ...filter, level: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Levels</option>
            <option value="COMPANY">Company</option>
            <option value="DEPARTMENT">Department</option>
            <option value="TEAM">Team</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ACHIEVED">Achieved</option>
            <option value="MISSED">Missed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Objectives</div>
          <div className="text-2xl font-semibold">{objectives.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Overall Progress</div>
          <div className="text-2xl font-semibold text-blue-600">{overallProgress.toFixed(0)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Achieved</div>
          <div className="text-2xl font-semibold text-green-600">{achievedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">At Risk</div>
          <div className="text-2xl font-semibold text-red-600">{atRiskCount}</div>
        </Card>
      </div>

      {/* Objectives List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading objectives...</div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No objectives found</div>
      ) : (
        <div className="space-y-4">
          {filteredObjectives.map(objective => renderObjective(objective))}
        </div>
      )}
    </div>
  );
};

export default OKRDashboard;
