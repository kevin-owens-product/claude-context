/**
 * ReleaseCalendar - Release schedule and management
 * @prompt-id forge-v4.1:ui:component:release-calendar:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface ReleaseItem {
  id: string;
  title: string;
  description?: string;
  itemType: string;
  category?: string;
  isHighlight: boolean;
}

interface Release {
  id: string;
  version: string;
  name?: string;
  description?: string;
  type: string;
  status: string;
  plannedDate?: string;
  releasedAt?: string;
  items: ReleaseItem[];
}

interface ReleaseCalendarProps {
  tenantId: string;
  onSelectRelease?: (releaseId: string) => void;
}

const typeColors: Record<string, string> = {
  MAJOR: 'bg-purple-100 text-purple-800 border-purple-200',
  MINOR: 'bg-blue-100 text-blue-800 border-blue-200',
  PATCH: 'bg-green-100 text-green-800 border-green-200',
  HOTFIX: 'bg-red-100 text-red-800 border-red-200',
};

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  STAGED: 'bg-blue-100 text-blue-800',
  RELEASED: 'bg-green-100 text-green-800',
  ROLLED_BACK: 'bg-red-100 text-red-800',
};

// Demo data for development
const demoReleases: Release[] = [
  {
    id: 'rel-1',
    version: '2.5.0',
    name: 'Enterprise Authentication',
    description: 'SSO/SAML support, advanced security features, and audit logging improvements',
    type: 'MINOR',
    status: 'IN_PROGRESS',
    plannedDate: '2024-02-15',
    items: [
      { id: 'item-1', title: 'SSO/SAML Integration', itemType: 'FEATURE', category: 'Security', isHighlight: true },
      { id: 'item-2', title: 'Audit Log Export', itemType: 'FEATURE', category: 'Security', isHighlight: false },
      { id: 'item-3', title: 'Session Management', itemType: 'ENHANCEMENT', category: 'Security', isHighlight: false },
    ],
  },
  {
    id: 'rel-2',
    version: '2.4.2',
    name: 'Performance Patch',
    description: 'Bug fixes and performance improvements',
    type: 'PATCH',
    status: 'STAGED',
    plannedDate: '2024-01-25',
    items: [
      { id: 'item-4', title: 'Dashboard loading optimization', itemType: 'BUG_FIX', isHighlight: false },
      { id: 'item-5', title: 'Safari chart rendering fix', itemType: 'BUG_FIX', isHighlight: false },
    ],
  },
  {
    id: 'rel-3',
    version: '2.4.1',
    name: 'API Improvements',
    description: 'Enhanced API rate limits and webhook support',
    type: 'PATCH',
    status: 'RELEASED',
    plannedDate: '2024-01-15',
    releasedAt: '2024-01-15',
    items: [
      { id: 'item-6', title: 'Increased API rate limits', itemType: 'ENHANCEMENT', category: 'API', isHighlight: true },
      { id: 'item-7', title: 'Webhook retry logic', itemType: 'ENHANCEMENT', category: 'API', isHighlight: false },
    ],
  },
  {
    id: 'rel-4',
    version: '2.4.0',
    name: 'Analytics Dashboard',
    description: 'New analytics dashboard with custom reports and data export',
    type: 'MINOR',
    status: 'RELEASED',
    plannedDate: '2024-01-08',
    releasedAt: '2024-01-10',
    items: [
      { id: 'item-8', title: 'Custom Analytics Dashboard', itemType: 'FEATURE', category: 'Analytics', isHighlight: true },
      { id: 'item-9', title: 'Data Export (CSV/Excel)', itemType: 'FEATURE', category: 'Data', isHighlight: true },
      { id: 'item-10', title: 'Scheduled Reports', itemType: 'FEATURE', category: 'Analytics', isHighlight: false },
    ],
  },
  {
    id: 'rel-5',
    version: '3.0.0',
    name: 'Platform Redesign',
    description: 'Major platform update with new UI, mobile support, and advanced integrations',
    type: 'MAJOR',
    status: 'PLANNED',
    plannedDate: '2024-04-01',
    items: [
      { id: 'item-11', title: 'New UI Design System', itemType: 'FEATURE', category: 'UI', isHighlight: true },
      { id: 'item-12', title: 'Mobile App (iOS)', itemType: 'FEATURE', category: 'Platform', isHighlight: true },
      { id: 'item-13', title: 'Mobile App (Android)', itemType: 'FEATURE', category: 'Platform', isHighlight: true },
      { id: 'item-14', title: 'Advanced Integrations Hub', itemType: 'FEATURE', category: 'Integrations', isHighlight: true },
    ],
  },
];

export const ReleaseCalendar: React.FC<ReleaseCalendarProps> = ({
  tenantId,
  onSelectRelease,
}) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});

  useEffect(() => {
    loadReleases();
  }, [tenantId, filter]);

  const loadReleases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);

      const response = await fetch(`/api/releases?${params}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setReleases(data.data || []);
    } catch (error) {
      console.error('Failed to load releases, using demo data:', error);
      let filtered = demoReleases;
      if (filter.status) filtered = filtered.filter(r => r.status === filter.status);
      if (filter.type) filtered = filtered.filter(r => r.type === filter.type);
      setReleases(filtered);
    } finally {
      setLoading(false);
    }
  };

  const upcomingReleases = releases.filter(r => r.status === 'PLANNED' || r.status === 'IN_PROGRESS');
  const recentReleases = releases.filter(r => r.status === 'RELEASED').slice(0, 5);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr?: string) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Releases</h2>
        <div className="flex gap-2">
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="MAJOR">Major</option>
            <option value="MINOR">Minor</option>
            <option value="PATCH">Patch</option>
            <option value="HOTFIX">Hotfix</option>
          </select>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="STAGED">Staged</option>
            <option value="RELEASED">Released</option>
          </select>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-3 py-2 text-sm ${view === 'timeline' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Releases</div>
          <div className="text-2xl font-semibold">{releases.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Upcoming</div>
          <div className="text-2xl font-semibold text-blue-600">{upcomingReleases.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">This Month</div>
          <div className="text-2xl font-semibold text-green-600">
            {releases.filter(r => {
              const date = r.releasedAt || r.plannedDate;
              if (!date) return false;
              const releaseDate = new Date(date);
              const now = new Date();
              return releaseDate.getMonth() === now.getMonth() && releaseDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Features Shipped</div>
          <div className="text-2xl font-semibold">
            {releases
              .filter(r => r.status === 'RELEASED')
              .reduce((sum, r) => sum + r.items.length, 0)}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading releases...</div>
      ) : view === 'list' ? (
        /* List View */
        <div className="space-y-6">
          {/* Upcoming Releases */}
          {upcomingReleases.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Upcoming Releases</h3>
              <div className="space-y-3">
                {upcomingReleases.map((release) => {
                  const daysUntil = getDaysUntil(release.plannedDate);
                  return (
                    <Card
                      key={release.id}
                      className={`p-4 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${typeColors[release.type]?.split(' ')[2] || 'border-gray-200'}`}
                      onClick={() => onSelectRelease?.(release.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-medium text-lg">{release.version}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[release.type]?.split(' ').slice(0, 2).join(' ')}`}>
                              {release.type}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[release.status]}`}>
                              {release.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {release.name && (
                            <h4 className="font-medium text-gray-900">{release.name}</h4>
                          )}
                          {release.description && (
                            <p className="text-sm text-gray-600 mt-1">{release.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Planned: {formatDate(release.plannedDate)}</span>
                            <span>{release.items.length} items</span>
                            {release.items.filter(i => i.isHighlight).length > 0 && (
                              <span className="text-yellow-600">
                                {release.items.filter(i => i.isHighlight).length} highlights
                              </span>
                            )}
                          </div>
                        </div>
                        {daysUntil !== null && (
                          <div className={`text-right ${daysUntil < 0 ? 'text-red-600' : daysUntil < 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            <div className="text-2xl font-bold">{Math.abs(daysUntil)}</div>
                            <div className="text-xs">{daysUntil < 0 ? 'days overdue' : 'days left'}</div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Releases */}
          {recentReleases.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Releases</h3>
              <div className="space-y-3">
                {recentReleases.map((release) => (
                  <Card
                    key={release.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectRelease?.(release.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{release.version}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[release.type]?.split(' ').slice(0, 2).join(' ')}`}>
                          {release.type}
                        </span>
                        {release.name && (
                          <span className="text-gray-600">{release.name}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Released {formatDate(release.releasedAt)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Timeline View */
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-6">
            {releases.map((release) => (
              <div key={release.id} className="relative flex items-start gap-4 pl-8">
                <div className={`absolute left-6 w-4 h-4 rounded-full border-2 ${
                  release.status === 'RELEASED' ? 'bg-green-500 border-green-600' :
                  release.status === 'IN_PROGRESS' ? 'bg-yellow-500 border-yellow-600' :
                  'bg-gray-300 border-gray-400'
                }`} />
                <Card
                  className="flex-1 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectRelease?.(release.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{release.version}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[release.status]}`}>
                        {release.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(release.releasedAt || release.plannedDate)}
                    </span>
                  </div>
                  {release.name && <div className="font-medium">{release.name}</div>}
                  <div className="text-sm text-gray-500 mt-1">{release.items.length} items</div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleaseCalendar;
