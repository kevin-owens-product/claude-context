/**
 * ReleasesView - Release Management Command Center
 *
 * A comprehensive view for managing software releases:
 * - Release timeline and calendar
 * - Version tracking and changelog
 * - Feature attribution to releases
 * - Customer communication
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Search,
  Plus,
  X,
  Sparkles,
  Rocket,
  GitBranch,
  FileText,
  ExternalLink,
  Star,
  Users,
} from 'lucide-react';

interface ReleaseItem {
  id: string;
  title: string;
  description?: string;
  itemType: 'FEATURE' | 'ENHANCEMENT' | 'BUG_FIX' | 'BREAKING_CHANGE';
  category?: string;
  isHighlight: boolean;
  linkedSliceId?: string;
}

interface Release {
  id: string;
  version: string;
  name?: string;
  description?: string;
  type: 'MAJOR' | 'MINOR' | 'PATCH' | 'HOTFIX';
  status: 'PLANNED' | 'IN_PROGRESS' | 'STAGED' | 'RELEASED' | 'ROLLED_BACK';
  plannedDate?: string;
  releasedAt?: string;
  items: ReleaseItem[];
  announcementDraft?: string;
  impactedCustomers?: number;
}

// Demo data
const demoReleases: Release[] = [
  {
    id: 'rel-1',
    version: '2.5.0',
    name: 'Enterprise Authentication',
    description: 'SSO/SAML support, advanced security features, and audit logging improvements',
    type: 'MINOR',
    status: 'IN_PROGRESS',
    plannedDate: '2024-02-15',
    impactedCustomers: 47,
    items: [
      { id: 'item-1', title: 'SSO/SAML Integration', description: 'Enterprise single sign-on with SAML 2.0 support', itemType: 'FEATURE', category: 'Security', isHighlight: true },
      { id: 'item-2', title: 'Audit Log Export', description: 'Export audit logs to CSV or JSON format', itemType: 'FEATURE', category: 'Security', isHighlight: false },
      { id: 'item-3', title: 'Session Management', description: 'Enhanced session management with configurable timeouts', itemType: 'ENHANCEMENT', category: 'Security', isHighlight: false },
    ],
    announcementDraft: 'We are excited to announce our new Enterprise Authentication features...',
  },
  {
    id: 'rel-2',
    version: '2.4.2',
    name: 'Performance Patch',
    description: 'Bug fixes and performance improvements for dashboard loading',
    type: 'PATCH',
    status: 'STAGED',
    plannedDate: '2024-01-25',
    impactedCustomers: 892,
    items: [
      { id: 'item-4', title: 'Dashboard loading optimization', description: 'Reduced initial load time by 40%', itemType: 'BUG_FIX', isHighlight: false },
      { id: 'item-5', title: 'Safari chart rendering fix', description: 'Fixed chart rendering issues on Safari browsers', itemType: 'BUG_FIX', isHighlight: false },
    ],
  },
  {
    id: 'rel-3',
    version: '2.4.1',
    name: 'API Improvements',
    description: 'Enhanced API rate limits and webhook support for integrations',
    type: 'PATCH',
    status: 'RELEASED',
    plannedDate: '2024-01-15',
    releasedAt: '2024-01-15',
    impactedCustomers: 234,
    items: [
      { id: 'item-6', title: 'Increased API rate limits', description: 'Pro plans now get 10,000 requests/minute', itemType: 'ENHANCEMENT', category: 'API', isHighlight: true },
      { id: 'item-7', title: 'Webhook retry logic', description: 'Automatic retries with exponential backoff', itemType: 'ENHANCEMENT', category: 'API', isHighlight: false },
    ],
  },
  {
    id: 'rel-4',
    version: '2.4.0',
    name: 'Analytics Dashboard',
    description: 'New analytics dashboard with custom reports and data export capabilities',
    type: 'MINOR',
    status: 'RELEASED',
    plannedDate: '2024-01-08',
    releasedAt: '2024-01-10',
    impactedCustomers: 1200,
    items: [
      { id: 'item-8', title: 'Custom Analytics Dashboard', description: 'Build your own dashboards with drag-and-drop widgets', itemType: 'FEATURE', category: 'Analytics', isHighlight: true },
      { id: 'item-9', title: 'Data Export (CSV/Excel)', description: 'Export any report to CSV or Excel format', itemType: 'FEATURE', category: 'Data', isHighlight: true },
      { id: 'item-10', title: 'Scheduled Reports', description: 'Schedule recurring reports via email', itemType: 'FEATURE', category: 'Analytics', isHighlight: false },
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
    impactedCustomers: 5694,
    items: [
      { id: 'item-11', title: 'New UI Design System', description: 'Completely redesigned interface with improved accessibility', itemType: 'FEATURE', category: 'UI', isHighlight: true },
      { id: 'item-12', title: 'Mobile App (iOS)', description: 'Native iOS app with full functionality', itemType: 'FEATURE', category: 'Platform', isHighlight: true },
      { id: 'item-13', title: 'Mobile App (Android)', description: 'Native Android app with full functionality', itemType: 'FEATURE', category: 'Platform', isHighlight: true },
      { id: 'item-14', title: 'Advanced Integrations Hub', description: 'New integrations marketplace with 50+ connectors', itemType: 'FEATURE', category: 'Integrations', isHighlight: true },
      { id: 'item-15', title: 'API v2 Breaking Changes', description: 'New API version with breaking changes - migration guide provided', itemType: 'BREAKING_CHANGE', category: 'API', isHighlight: true },
    ],
  },
];

interface ReleasesViewProps {
  tenantId: string;
}

export function ReleasesView({ tenantId: _tenantId }: ReleasesViewProps) {
  const [releases] = useState<Release[]>(demoReleases);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'timeline'>('list');

  // Filter releases
  const filteredReleases = useMemo(() => {
    return releases.filter((rel) => {
      const matchesSearch =
        rel.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rel.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || rel.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || rel.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [releases, searchQuery, typeFilter, statusFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const upcoming = releases.filter(
      (r) => r.status === 'PLANNED' || r.status === 'IN_PROGRESS' || r.status === 'STAGED'
    ).length;
    const released = releases.filter((r) => r.status === 'RELEASED').length;
    const featuresShipped = releases
      .filter((r) => r.status === 'RELEASED')
      .reduce((sum, r) => sum + r.items.filter((i) => i.itemType === 'FEATURE').length, 0);
    const bugsFixed = releases
      .filter((r) => r.status === 'RELEASED')
      .reduce((sum, r) => sum + r.items.filter((i) => i.itemType === 'BUG_FIX').length, 0);
    return { total: releases.length, upcoming, released, featuresShipped, bugsFixed };
  }, [releases]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MAJOR':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'MINOR':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'PATCH':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'HOTFIX':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RELEASED':
        return 'bg-green-500/20 text-green-400';
      case 'STAGED':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'IN_PROGRESS':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'PLANNED':
        return 'bg-gray-500/20 text-gray-400';
      case 'ROLLED_BACK':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getItemTypeColor = (itemType: string) => {
    switch (itemType) {
      case 'FEATURE':
        return 'bg-blue-500/20 text-blue-400';
      case 'ENHANCEMENT':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'BUG_FIX':
        return 'bg-green-500/20 text-green-400';
      case 'BREAKING_CHANGE':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

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
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="h-full flex overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
      {/* Main Content */}
      <div
        className={clsx(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          selectedRelease ? 'mr-[520px]' : ''
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                Releases
              </h1>
              <p className="text-sm text-gray-500">
                Manage releases, track features, and communicate with customers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-800 rounded-lg p-0.5">
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
                <button
                  onClick={() => setView('timeline')}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    view === 'timeline'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  Timeline
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors">
                <Plus className="w-4 h-4" />
                New Release
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Types</option>
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
              <option value="PATCH">Patch</option>
              <option value="HOTFIX">Hotfix</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="STAGED">Staged</option>
              <option value="RELEASED">Released</option>
            </select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800/50">
          <div className="grid grid-cols-5 gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl border border-cyan-500/20">
              <div className="flex items-center justify-between mb-1">
                <Package className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-cyan-400">{kpis.total}</div>
              <div className="text-xs text-gray-500">Total Releases</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-xl border border-yellow-500/20">
              <div className="flex items-center justify-between mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl font-bold text-yellow-400">{kpis.upcoming}</div>
              <div className="text-xs text-gray-500">Upcoming</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-xl font-bold text-green-400">{kpis.released}</div>
              <div className="text-xs text-gray-500">Released</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <Rocket className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-400">{kpis.featuresShipped}</div>
              <div className="text-xs text-gray-500">Features Shipped</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500/10 to-violet-500/5 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-400">{kpis.bugsFixed}</div>
              <div className="text-xs text-gray-500">Bugs Fixed</div>
            </div>
          </div>
        </div>

        {/* Releases List/Timeline */}
        <div className="flex-1 overflow-auto p-6">
          {view === 'list' ? (
            <div className="space-y-4">
              {filteredReleases.map((release) => {
                const daysUntil = getDaysUntil(release.plannedDate);
                const highlights = release.items.filter((i) => i.isHighlight);
                return (
                  <div
                    key={release.id}
                    onClick={() => setSelectedRelease(release)}
                    className={clsx(
                      'rounded-xl border cursor-pointer transition-all',
                      selectedRelease?.id === release.id
                        ? 'bg-cyan-500/10 border-cyan-500/40'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-lg font-bold text-white">
                              v{release.version}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-medium border',
                                getTypeColor(release.type)
                              )}
                            >
                              {release.type}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-medium',
                                getStatusColor(release.status)
                              )}
                            >
                              {release.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {release.name && (
                            <h3 className="text-base font-medium text-white mb-1">
                              {release.name}
                            </h3>
                          )}
                          {release.description && (
                            <p className="text-sm text-gray-500">{release.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {release.releasedAt
                                ? `Released ${formatDate(release.releasedAt)}`
                                : `Planned ${formatDate(release.plannedDate)}`}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              {release.items.length} items
                            </span>
                            {highlights.length > 0 && (
                              <span className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-3.5 h-3.5" />
                                {highlights.length} highlights
                              </span>
                            )}
                            {release.impactedCustomers && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {release.impactedCustomers.toLocaleString()} customers
                              </span>
                            )}
                          </div>
                        </div>
                        {daysUntil !== null && release.status !== 'RELEASED' && (
                          <div
                            className={clsx(
                              'text-right ml-4',
                              daysUntil < 0
                                ? 'text-red-400'
                                : daysUntil < 7
                                ? 'text-yellow-400'
                                : 'text-gray-400'
                            )}
                          >
                            <div className="text-2xl font-bold">{Math.abs(daysUntil)}</div>
                            <div className="text-[10px]">
                              {daysUntil < 0 ? 'days overdue' : 'days left'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Timeline View */
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700" />
              <div className="space-y-6">
                {filteredReleases.map((release) => (
                  <div key={release.id} className="relative flex items-start gap-4 pl-8">
                    <div
                      className={clsx(
                        'absolute left-6 w-4 h-4 rounded-full border-2',
                        release.status === 'RELEASED'
                          ? 'bg-green-500 border-green-400'
                          : release.status === 'IN_PROGRESS'
                          ? 'bg-yellow-500 border-yellow-400'
                          : release.status === 'STAGED'
                          ? 'bg-cyan-500 border-cyan-400'
                          : 'bg-gray-600 border-gray-500'
                      )}
                    />
                    <div
                      onClick={() => setSelectedRelease(release)}
                      className={clsx(
                        'flex-1 p-4 rounded-xl border cursor-pointer transition-all',
                        selectedRelease?.id === release.id
                          ? 'bg-cyan-500/10 border-cyan-500/40'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            v{release.version}
                          </span>
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-medium',
                              getStatusColor(release.status)
                            )}
                          >
                            {release.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(release.releasedAt || release.plannedDate)}
                        </span>
                      </div>
                      {release.name && (
                        <div className="font-medium text-white">{release.name}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {release.items.length} items
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRelease && (
        <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-gray-900 border-l border-gray-800 overflow-auto z-20">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-white">Release Details</h2>
            <button
              onClick={() => setSelectedRelease(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-2xl font-bold text-white">
                  v{selectedRelease.version}
                </span>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium border',
                    getTypeColor(selectedRelease.type)
                  )}
                >
                  {selectedRelease.type}
                </span>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    getStatusColor(selectedRelease.status)
                  )}
                >
                  {selectedRelease.status.replace(/_/g, ' ')}
                </span>
              </div>
              {selectedRelease.name && (
                <h3 className="text-lg font-medium text-white">{selectedRelease.name}</h3>
              )}
              {selectedRelease.description && (
                <p className="text-gray-400 mt-2">{selectedRelease.description}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Planned Date</span>
                </div>
                <div className="text-white font-medium">
                  {formatDate(selectedRelease.plannedDate)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Released</span>
                </div>
                <div className="text-white font-medium">
                  {selectedRelease.releasedAt
                    ? formatDate(selectedRelease.releasedAt)
                    : 'Not yet released'}
                </div>
              </div>
            </div>

            {/* Impact */}
            {selectedRelease.impactedCustomers && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">Customer Impact</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {selectedRelease.impactedCustomers.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">customers will be affected</div>
              </div>
            )}

            {/* Release Items */}
            <div>
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                Release Items ({selectedRelease.items.length})
              </h4>
              <div className="space-y-2">
                {selectedRelease.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          getItemTypeColor(item.itemType)
                        )}
                      >
                        {item.itemType.replace(/_/g, ' ')}
                      </span>
                      {item.category && (
                        <span className="text-[10px] text-gray-500">{item.category}</span>
                      )}
                      {item.isHighlight && <Star className="w-3 h-3 text-yellow-400" />}
                    </div>
                    <p className="text-sm text-white">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Announcement Draft */}
            {selectedRelease.announcementDraft && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">Announcement Draft</span>
                </div>
                <p className="text-sm text-gray-400 italic">
                  "{selectedRelease.announcementDraft}"
                </p>
                <button className="mt-2 text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300">
                  Edit Announcement <ExternalLink className="w-3 h-3" />
                </button>
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
                    AI Insight
                  </div>
                  <p className="text-sm text-gray-400">
                    {selectedRelease.status === 'RELEASED'
                      ? `This release was delivered ${selectedRelease.plannedDate === selectedRelease.releasedAt ? 'on time' : 'slightly late'}. ${selectedRelease.items.filter((i) => i.isHighlight).length} high-impact features were shipped.`
                      : selectedRelease.status === 'IN_PROGRESS'
                      ? `This release is currently in progress. Consider adding more context to the announcement draft before launch.`
                      : `This release is planned for ${formatDate(selectedRelease.plannedDate)}. Ensure all items are properly linked to development work.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <GitBranch className="w-4 h-4" />
                View Changelog
              </button>
              <button className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                <Rocket className="w-4 h-4" />
                {selectedRelease.status === 'STAGED' ? 'Deploy Release' : 'Edit Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReleasesView;
