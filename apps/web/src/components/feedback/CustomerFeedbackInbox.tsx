/**
 * CustomerFeedbackInbox - Feedback inbox view with sentiment analysis
 * @prompt-id forge-v4.1:ui:component:feedback-inbox:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';

interface CustomerFeedback {
  id: string;
  type: string;
  channel: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: string;
  npsScore?: number;
  csatScore?: number;
  priority: string;
  status: string;
  createdAt: string;
  customer: { id: string; name: string; tier: string };
}

interface CustomerFeedbackInboxProps {
  tenantId: string;
  onSelectFeedback?: (feedbackId: string) => void;
  onLinkToFeature?: (feedbackId: string) => void;
}

const typeColors: Record<string, string> = {
  NPS: 'bg-blue-100 text-blue-800',
  CSAT: 'bg-purple-100 text-purple-800',
  FEATURE_REQUEST: 'bg-yellow-100 text-yellow-800',
  BUG_REPORT: 'bg-red-100 text-red-800',
  COMPLAINT: 'bg-orange-100 text-orange-800',
  PRAISE: 'bg-green-100 text-green-800',
  QUESTION: 'bg-gray-100 text-gray-800',
  SUGGESTION: 'bg-indigo-100 text-indigo-800',
};

const sentimentColors: Record<string, string> = {
  VERY_POSITIVE: 'text-green-600',
  POSITIVE: 'text-green-500',
  NEUTRAL: 'text-gray-500',
  NEGATIVE: 'text-orange-500',
  VERY_NEGATIVE: 'text-red-600',
};

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

// Demo data for development
const demoFeedback: CustomerFeedback[] = [
  { id: 'fb-1', type: 'FEATURE_REQUEST', channel: 'Email', content: 'We really need bulk import functionality for our team migration. Currently it takes hours to onboard new accounts manually.', sentimentScore: 0.3, sentimentLabel: 'NEUTRAL', priority: 'HIGH', status: 'NEW', createdAt: '2024-01-18', customer: { id: 'cust-1', name: 'Acme Corporation', tier: 'STRATEGIC' } },
  { id: 'fb-2', type: 'NPS', channel: 'In-App', content: 'Love the product! The AI features have saved our team countless hours. Would be perfect with better mobile support.', sentimentScore: 0.85, sentimentLabel: 'VERY_POSITIVE', npsScore: 9, priority: 'LOW', status: 'RESOLVED', createdAt: '2024-01-17', customer: { id: 'cust-3', name: 'Global Dynamics', tier: 'ENTERPRISE' } },
  { id: 'fb-3', type: 'BUG_REPORT', channel: 'Support', content: 'Dashboard charts are not loading properly in Safari. Getting blank screens intermittently.', sentimentScore: -0.4, sentimentLabel: 'NEGATIVE', priority: 'HIGH', status: 'IN_PROGRESS', createdAt: '2024-01-16', customer: { id: 'cust-2', name: 'TechStart Inc', tier: 'GROWTH' } },
  { id: 'fb-4', type: 'PRAISE', channel: 'Email', content: 'Just wanted to say your support team is amazing! Sarah helped us resolve a critical issue in under an hour.', sentimentScore: 0.95, sentimentLabel: 'VERY_POSITIVE', priority: 'LOW', status: 'CLOSED', createdAt: '2024-01-15', customer: { id: 'cust-5', name: 'MegaCorp International', tier: 'STRATEGIC' } },
  { id: 'fb-5', type: 'COMPLAINT', channel: 'Support', content: 'API rate limits are too restrictive for our use case. We keep hitting limits during peak hours.', sentimentScore: -0.6, sentimentLabel: 'NEGATIVE', priority: 'MEDIUM', status: 'NEW', createdAt: '2024-01-14', customer: { id: 'cust-4', name: 'Startup Labs', tier: 'STANDARD' } },
  { id: 'fb-6', type: 'CSAT', channel: 'In-App', content: 'Good overall experience but onboarding could be smoother.', sentimentScore: 0.5, sentimentLabel: 'POSITIVE', csatScore: 4, priority: 'LOW', status: 'RESOLVED', createdAt: '2024-01-13', customer: { id: 'cust-6', name: 'Innovate Solutions', tier: 'GROWTH' } },
  { id: 'fb-7', type: 'FEATURE_REQUEST', channel: 'Slack', content: 'Would love to see SSO/SAML support for enterprise authentication. This is blocking our security team sign-off.', sentimentScore: 0.2, sentimentLabel: 'NEUTRAL', priority: 'CRITICAL', status: 'NEW', createdAt: '2024-01-12', customer: { id: 'cust-9', name: 'Enterprise Plus', tier: 'ENTERPRISE' } },
  { id: 'fb-8', type: 'NPS', channel: 'In-App', content: 'Product is okay but lacks some features competitors have.', sentimentScore: 0.1, sentimentLabel: 'NEUTRAL', npsScore: 6, priority: 'MEDIUM', status: 'NEW', createdAt: '2024-01-11', customer: { id: 'cust-8', name: 'DataDriven Co', tier: 'GROWTH' } },
];

export const CustomerFeedbackInbox: React.FC<CustomerFeedbackInboxProps> = ({
  tenantId,
  onSelectFeedback,
  onLinkToFeature,
}) => {
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ type?: string; status?: string; sentiment?: string }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFeedback();
  }, [tenantId, filter]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);

      const response = await fetch(`/api/customer-feedback?${params}`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (!response.ok) throw new Error('API not available');
      const data = await response.json();
      setFeedback(data.data || []);
    } catch (error) {
      console.error('Failed to load feedback, using demo data:', error);
      let filtered = demoFeedback;
      if (filter.type) filtered = filtered.filter(f => f.type === filter.type);
      if (filter.status) filtered = filtered.filter(f => f.status === filter.status);
      setFeedback(filtered);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = feedback.filter(f => {
    if (filter.sentiment && f.sentimentLabel !== filter.sentiment) return false;
    if (searchQuery && !f.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const newCount = feedback.filter(f => f.status === 'NEW').length;
  const avgSentiment = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.sentimentScore, 0) / feedback.length
    : 0;

  const npsResponses = feedback.filter(f => f.npsScore !== undefined);
  const npsScore = npsResponses.length > 0
    ? ((npsResponses.filter(f => f.npsScore! >= 9).length / npsResponses.length) -
       (npsResponses.filter(f => f.npsScore! <= 6).length / npsResponses.length)) * 100
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Customer Feedback</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="NPS">NPS</option>
            <option value="CSAT">CSAT</option>
            <option value="FEATURE_REQUEST">Feature Request</option>
            <option value="BUG_REPORT">Bug Report</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="PRAISE">Praise</option>
          </select>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Feedback</div>
          <div className="text-2xl font-semibold">{feedback.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">New</div>
          <div className="text-2xl font-semibold text-blue-600">{newCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Avg Sentiment</div>
          <div className={`text-2xl font-semibold ${avgSentiment >= 0.5 ? 'text-green-600' : avgSentiment >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
            {avgSentiment >= 0 ? '+' : ''}{(avgSentiment * 100).toFixed(0)}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">NPS Score</div>
          <div className={`text-2xl font-semibold ${npsScore !== null ? (npsScore >= 50 ? 'text-green-600' : npsScore >= 0 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-400'}`}>
            {npsScore !== null ? npsScore.toFixed(0) : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading feedback...</div>
      ) : filteredFeedback.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No feedback found</div>
      ) : (
        <div className="space-y-3">
          {filteredFeedback.map((item) => (
            <Card
              key={item.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectFeedback?.(item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[item.type]}`}>
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-500">{item.channel}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-900 line-clamp-2">{item.content}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">From:</span>
                      <span className="text-sm font-medium">{item.customer.name}</span>
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{item.customer.tier}</span>
                    </div>
                    {item.npsScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">NPS:</span>
                        <span className={`text-sm font-medium ${item.npsScore >= 9 ? 'text-green-600' : item.npsScore >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.npsScore}
                        </span>
                      </div>
                    )}
                    {item.csatScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">CSAT:</span>
                        <span className="text-sm font-medium">{item.csatScore}/5</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className={`text-lg font-semibold ${sentimentColors[item.sentimentLabel]}`}>
                    {item.sentimentLabel.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(item.sentimentScore * 100).toFixed(0)}% sentiment
                  </div>
                  {item.type === 'FEATURE_REQUEST' && onLinkToFeature && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLinkToFeature(item.id);
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Link to Feature
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFeedbackInbox;
