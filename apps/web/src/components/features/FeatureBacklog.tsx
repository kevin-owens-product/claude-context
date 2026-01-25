/**
 * FeatureBacklog - Prioritized feature request backlog
 * @prompt-id forge-v4.1:ui:component:feature-backlog:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface FeatureRequest {
  id: string;
  shortId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  voteCount: number;
  totalMRR: number;
  dealBlockerValue: number;
  priorityScore: number;
  effortEstimate?: string;
  createdAt: string;
}

interface FeatureBacklogProps {
  tenantId: string;
  onSelectFeature?: (featureId: string) => void;
}

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-gray-100 text-gray-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  RELEASED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  DUPLICATE: 'bg-gray-100 text-gray-600',
};

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const effortIcons: Record<string, string> = {
  XS: '1-2h',
  S: '1-2d',
  M: '3-5d',
  L: '1-2w',
  XL: '3-4w',
};

// Demo data for development
const demoFeatures: FeatureRequest[] = [
  { id: 'feat-1', shortId: 'FR-001', title: 'SSO/SAML Enterprise Authentication', description: 'Add support for enterprise SSO with SAML 2.0 and OIDC. Required for security compliance by enterprise customers.', status: 'PLANNED', priority: 'CRITICAL', category: 'Security', voteCount: 47, totalMRR: 125000, dealBlockerValue: 250000, priorityScore: 892, effortEstimate: 'L', createdAt: '2024-01-10' },
  { id: 'feat-2', shortId: 'FR-002', title: 'Bulk Import/Export', description: 'Allow bulk importing and exporting of data via CSV/Excel. Critical for customer migrations.', status: 'UNDER_REVIEW', priority: 'HIGH', category: 'Data', voteCount: 35, totalMRR: 85000, dealBlockerValue: 75000, priorityScore: 654, effortEstimate: 'M', createdAt: '2024-01-12' },
  { id: 'feat-3', shortId: 'FR-003', title: 'Mobile App (iOS/Android)', description: 'Native mobile application for on-the-go access. Frequently requested by field teams.', status: 'SUBMITTED', priority: 'HIGH', category: 'Platform', voteCount: 89, totalMRR: 45000, dealBlockerValue: 0, priorityScore: 521, effortEstimate: 'XL', createdAt: '2024-01-08' },
  { id: 'feat-4', shortId: 'FR-004', title: 'Advanced Analytics Dashboard', description: 'Custom analytics with drill-down capabilities and export options.', status: 'IN_PROGRESS', priority: 'MEDIUM', category: 'Analytics', voteCount: 28, totalMRR: 65000, dealBlockerValue: 50000, priorityScore: 445, effortEstimate: 'M', createdAt: '2024-01-15' },
  { id: 'feat-5', shortId: 'FR-005', title: 'API Rate Limit Increase', description: 'Higher API rate limits for enterprise integrations. Current limits blocking automation workflows.', status: 'UNDER_REVIEW', priority: 'HIGH', category: 'API', voteCount: 22, totalMRR: 78000, dealBlockerValue: 45000, priorityScore: 398, effortEstimate: 'S', createdAt: '2024-01-14' },
  { id: 'feat-6', shortId: 'FR-006', title: 'Webhook Support', description: 'Real-time webhooks for integration with external systems.', status: 'RELEASED', priority: 'MEDIUM', category: 'API', voteCount: 56, totalMRR: 55000, dealBlockerValue: 0, priorityScore: 356, effortEstimate: 'M', createdAt: '2023-12-01' },
  { id: 'feat-7', shortId: 'FR-007', title: 'Custom Fields', description: 'User-defined custom fields for extending data models.', status: 'SUBMITTED', priority: 'MEDIUM', category: 'Customization', voteCount: 41, totalMRR: 38000, dealBlockerValue: 20000, priorityScore: 312, effortEstimate: 'L', createdAt: '2024-01-16' },
  { id: 'feat-8', shortId: 'FR-008', title: 'Audit Log Export', description: 'Ability to export audit logs for compliance and security reviews.', status: 'PLANNED', priority: 'LOW', category: 'Security', voteCount: 15, totalMRR: 95000, dealBlockerValue: 35000, priorityScore: 287, effortEstimate: 'S', createdAt: '2024-01-11' },
];

export const FeatureBacklog: React.FC<FeatureBacklogProps> = ({
  tenantId,
  onSelectFeature,
}) => {
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; priority?: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'priorityScore' | 'voteCount' | 'mrr'>('priorityScore');

  useEffect(() => {
    loadFeatures();
  }, [tenantId, filter]);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await fetch(`/api/feature-requests?${params}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setFeatures(data.data || []);
    } catch (error) {
      console.error('Failed to load features, using demo data:', error);
      let filtered = demoFeatures;
      if (filter.status) filtered = filtered.filter(f => f.status === filter.status);
      if (filter.priority) filtered = filtered.filter(f => f.priority === filter.priority);
      setFeatures(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeatures = features.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.shortId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    switch (sortBy) {
      case 'voteCount':
        return b.voteCount - a.voteCount;
      case 'mrr':
        return b.totalMRR - a.totalMRR;
      case 'priorityScore':
      default:
        return b.priorityScore - a.priorityScore;
    }
  });

  const activeFeatures = features.filter(f => !['RELEASED', 'DECLINED', 'DUPLICATE'].includes(f.status));
  const totalBlockedValue = features.reduce((sum, f) => sum + f.dealBlockerValue, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Feature Backlog</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RELEASED">Released</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="priorityScore">Priority Score</option>
            <option value="voteCount">Vote Count</option>
            <option value="mrr">Customer MRR</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Active Requests</div>
          <div className="text-2xl font-semibold">{activeFeatures.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Votes</div>
          <div className="text-2xl font-semibold">
            {features.reduce((sum, f) => sum + f.voteCount, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Blocked Deal Value</div>
          <div className="text-2xl font-semibold text-orange-600">
            ${totalBlockedValue.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Requesting MRR</div>
          <div className="text-2xl font-semibold">
            ${features.reduce((sum, f) => sum + f.totalMRR, 0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Feature List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading features...</div>
      ) : sortedFeatures.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No feature requests found</div>
      ) : (
        <div className="space-y-3">
          {sortedFeatures.map((feature) => (
            <Card
              key={feature.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectFeature?.(feature.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-gray-500">{feature.shortId}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[feature.status]}`}>
                      {feature.status.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors[feature.priority]}`}>
                      {feature.priority}
                    </span>
                    {feature.category && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {feature.category}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{feature.description}</p>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <div className="text-2xl font-bold text-blue-600">{feature.priorityScore.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">Priority Score</div>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Votes:</span>
                  <span className="font-medium">{feature.voteCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">MRR:</span>
                  <span className="font-medium">${feature.totalMRR.toLocaleString()}</span>
                </div>
                {feature.dealBlockerValue > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-orange-600">Blocking:</span>
                    <span className="font-medium text-orange-600">${feature.dealBlockerValue.toLocaleString()}</span>
                  </div>
                )}
                {feature.effortEstimate && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">Effort:</span>
                    <span className="font-medium">{effortIcons[feature.effortEstimate] || feature.effortEstimate}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeatureBacklog;
