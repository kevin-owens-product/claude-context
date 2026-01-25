/**
 * UseCaseGallery - Solution templates and use case gallery
 * @prompt-id forge-v4.1:ui:component:use-case-gallery:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

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
  status: string;
  isPublic: boolean;
  avgTimeSaving?: number;
  avgCostSaving?: number;
  implementationCount: number;
  successRate?: number;
}

interface UseCaseGalleryProps {
  tenantId: string;
  onSelectUseCase?: (useCaseId: string) => void;
  onStartImplementation?: (useCaseId: string) => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  DEPRECATED: 'bg-red-100 text-red-800',
};

const categoryColors: Record<string, string> = {
  'Sales': 'bg-blue-50 border-blue-200',
  'Marketing': 'bg-purple-50 border-purple-200',
  'Support': 'bg-green-50 border-green-200',
  'Operations': 'bg-orange-50 border-orange-200',
  'HR': 'bg-pink-50 border-pink-200',
  'Finance': 'bg-yellow-50 border-yellow-200',
  'Engineering': 'bg-indigo-50 border-indigo-200',
};

// Demo data for development
const demoUseCases: UseCase[] = [
  { id: 'uc-1', name: 'Automated Lead Scoring', slug: 'automated-lead-scoring', description: 'Use AI to automatically score and prioritize incoming leads based on engagement patterns and firmographic data.', category: 'Sales', industry: 'SaaS', persona: 'Sales Manager', problemStatement: 'Sales teams waste time on unqualified leads', valueProposition: 'Focus on high-value prospects, close 30% faster', status: 'PUBLISHED', isPublic: true, avgTimeSaving: 15, avgCostSaving: 5000, implementationCount: 47, successRate: 92 },
  { id: 'uc-2', name: 'Customer Health Monitoring', slug: 'customer-health-monitoring', description: 'Proactively identify at-risk customers before they churn with automated health scoring and alerts.', category: 'Support', industry: 'SaaS', persona: 'Customer Success', problemStatement: 'Churn surprises leadership', valueProposition: 'Reduce churn by 40% with early intervention', status: 'PUBLISHED', isPublic: true, avgTimeSaving: 20, avgCostSaving: 25000, implementationCount: 38, successRate: 88 },
  { id: 'uc-3', name: 'Sprint Planning Assistant', slug: 'sprint-planning-assistant', description: 'AI-powered sprint planning that considers velocity, dependencies, and team capacity.', category: 'Engineering', persona: 'Engineering Manager', problemStatement: 'Sprint planning takes too long and is often inaccurate', valueProposition: 'Cut planning time by 60%, improve accuracy', status: 'PUBLISHED', isPublic: true, avgTimeSaving: 8, implementationCount: 29, successRate: 85 },
  { id: 'uc-4', name: 'Contract Analysis', slug: 'contract-analysis', description: 'Automatically extract key terms, dates, and obligations from contracts and legal documents.', category: 'Finance', industry: 'Legal', persona: 'Legal Ops', problemStatement: 'Manual contract review is slow and error-prone', valueProposition: 'Review contracts 10x faster', status: 'PUBLISHED', isPublic: true, avgTimeSaving: 40, avgCostSaving: 15000, implementationCount: 22, successRate: 94 },
  { id: 'uc-5', name: 'Campaign Performance Insights', slug: 'campaign-performance', description: 'Get AI-generated insights on marketing campaign performance with recommendations for optimization.', category: 'Marketing', persona: 'Marketing Manager', problemStatement: 'Hard to understand what is working across channels', valueProposition: 'Improve campaign ROI by 25%', status: 'PUBLISHED', isPublic: true, avgTimeSaving: 10, implementationCount: 56, successRate: 82 },
  { id: 'uc-6', name: 'Incident Response Automation', slug: 'incident-response', description: 'Automatically classify, route, and begin remediation for infrastructure incidents.', category: 'Operations', industry: 'Tech', persona: 'DevOps', problemStatement: 'Manual incident response is slow', valueProposition: 'Reduce MTTR by 50%', status: 'REVIEW', isPublic: true, avgTimeSaving: 30, implementationCount: 12, successRate: 90 },
  { id: 'uc-7', name: 'Employee Onboarding Workflow', slug: 'employee-onboarding', description: 'Streamline new hire onboarding with automated task assignment, document collection, and training scheduling.', category: 'HR', persona: 'HR Manager', problemStatement: 'Onboarding is inconsistent and time-consuming', valueProposition: 'Reduce onboarding time by 40%', status: 'DRAFT', isPublic: false, avgTimeSaving: 20, implementationCount: 0 },
];

export const UseCaseGallery: React.FC<UseCaseGalleryProps> = ({
  tenantId,
  onSelectUseCase,
  onStartImplementation,
}) => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ category?: string; industry?: string; status?: string }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadUseCases();
  }, [tenantId, filter]);

  const loadUseCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.industry) params.append('industry', filter.industry);
      if (filter.status) params.append('status', filter.status);
      params.append('isPublic', 'true');

      const response = await fetch(`/api/use-cases?${params}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setUseCases(data.data || []);
    } catch (error) {
      console.error('Failed to load use cases, using demo data:', error);
      let filtered = demoUseCases.filter(uc => uc.isPublic);
      if (filter.category) filtered = filtered.filter(uc => uc.category === filter.category);
      if (filter.industry) filtered = filtered.filter(uc => uc.industry === filter.industry);
      if (filter.status) filtered = filtered.filter(uc => uc.status === filter.status);
      setUseCases(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredUseCases = useCases.filter(uc =>
    uc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    uc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(useCases.map(uc => uc.category))];
  const industries = [...new Set(useCases.filter(uc => uc.industry).map(uc => uc.industry!))];

  const publishedCount = useCases.filter(uc => uc.status === 'PUBLISHED').length;
  const totalImplementations = useCases.reduce((sum, uc) => sum + uc.implementationCount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Solution Gallery</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search solutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={filter.category || ''}
            onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {industries.length > 0 && (
            <select
              value={filter.industry || ''}
              onChange={(e) => setFilter({ ...filter, industry: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          )}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-2 text-sm ${view === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Solutions</div>
          <div className="text-2xl font-semibold">{useCases.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Published</div>
          <div className="text-2xl font-semibold text-green-600">{publishedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Implementations</div>
          <div className="text-2xl font-semibold text-blue-600">{totalImplementations}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Categories</div>
          <div className="text-2xl font-semibold">{categories.length}</div>
        </Card>
      </div>

      {/* Use Case Grid/List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading solutions...</div>
      ) : filteredUseCases.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No solutions found</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUseCases.map((useCase) => (
            <Card
              key={useCase.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${categoryColors[useCase.category]?.split(' ')[1] || 'border-gray-200'}`}
              onClick={() => onSelectUseCase?.(useCase.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {useCase.category}
                </span>
                {useCase.industry && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {useCase.industry}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[useCase.status]}`}>
                  {useCase.status}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{useCase.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{useCase.description}</p>

              {(useCase.avgTimeSaving || useCase.avgCostSaving) && (
                <div className="flex items-center gap-4 mb-3 py-2 border-t border-gray-100">
                  {useCase.avgTimeSaving && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{useCase.avgTimeSaving}h</div>
                      <div className="text-xs text-gray-500">Time Saved</div>
                    </div>
                  )}
                  {useCase.avgCostSaving && (
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">${useCase.avgCostSaving.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Cost Saved</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{useCase.implementationCount} implementations</span>
                  {useCase.successRate && (
                    <span className="text-sm text-green-600">{useCase.successRate}% success</span>
                  )}
                </div>
                {onStartImplementation && useCase.status === 'PUBLISHED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartImplementation(useCase.id);
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Start
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUseCases.map((useCase) => (
            <Card
              key={useCase.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectUseCase?.(useCase.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{useCase.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {useCase.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[useCase.status]}`}>
                      {useCase.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{useCase.description}</p>
                  {useCase.valueProposition && (
                    <p className="text-sm text-gray-500 mt-1 italic">{useCase.valueProposition}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{useCase.implementationCount} implementations</span>
                    {useCase.avgTimeSaving && <span>{useCase.avgTimeSaving}h avg time saved</span>}
                    {useCase.avgCostSaving && <span>${useCase.avgCostSaving.toLocaleString()} avg cost saved</span>}
                  </div>
                </div>
                {onStartImplementation && useCase.status === 'PUBLISHED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartImplementation(useCase.id);
                    }}
                    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Start Implementation
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UseCaseGallery;
