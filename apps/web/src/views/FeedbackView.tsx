/**
 * FeedbackView - Comprehensive customer feedback inbox with sentiment analysis
 * @prompt-id forge-v4.1:ui:view:feedback:002
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';

interface CustomerFeedback {
  id: string;
  type: 'NPS' | 'CSAT' | 'FEATURE_REQUEST' | 'BUG_REPORT' | 'COMPLAINT' | 'PRAISE' | 'QUESTION';
  channel: string;
  subject?: string;
  content: string;
  sentimentScore: number;
  sentimentLabel: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
  npsScore?: number;
  csatScore?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  customer: {
    id: string;
    name: string;
    tier: string;
    mrr: number;
  };
  assignee?: {
    name: string;
    avatar: string;
  };
  linkedFeature?: {
    id: string;
    title: string;
    status: string;
  };
  responses: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
    isInternal: boolean;
  }>;
}

interface FeedbackViewProps {
  tenantId: string;
}

// Demo feedback data
const demoFeedback: CustomerFeedback[] = [
  {
    id: 'fb-1',
    type: 'FEATURE_REQUEST',
    channel: 'Email',
    subject: 'Need SSO/SAML Support',
    content: 'We really need SSO/SAML support for our enterprise security requirements. Our security team cannot approve the rollout without this feature. This is blocking our expansion from 50 to 500 seats.',
    sentimentScore: 0.3,
    sentimentLabel: 'NEUTRAL',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    createdAt: '2024-01-22T10:30:00Z',
    customer: { id: 'cust-1', name: 'Acme Corporation', tier: 'STRATEGIC', mrr: 45000 },
    assignee: { name: 'Sarah M.', avatar: 'SM' },
    linkedFeature: { id: 'feat-1', title: 'SSO/SAML Enterprise Authentication', status: 'PLANNED' },
    responses: [
      { id: 'r1', author: 'Sarah M.', content: 'Thanks for reaching out! SSO/SAML is on our roadmap for Q1. I\'ll keep you updated on progress.', createdAt: '2024-01-22T14:00:00Z', isInternal: false },
    ],
  },
  {
    id: 'fb-2',
    type: 'NPS',
    channel: 'In-App Survey',
    content: 'Love the product! The AI features have completely transformed how our team works. Would be even better with mobile support.',
    sentimentScore: 0.9,
    sentimentLabel: 'VERY_POSITIVE',
    npsScore: 9,
    priority: 'LOW',
    status: 'CLOSED',
    createdAt: '2024-01-21T09:15:00Z',
    customer: { id: 'cust-3', name: 'Global Dynamics', tier: 'ENTERPRISE', mrr: 28000 },
    responses: [],
  },
  {
    id: 'fb-3',
    type: 'BUG_REPORT',
    channel: 'Support Ticket',
    subject: 'Dashboard charts not loading in Safari',
    content: 'Dashboard charts are intermittently showing blank screens when using Safari 17.x. This happens about 30% of the time. Console shows WebGL errors.',
    sentimentScore: -0.4,
    sentimentLabel: 'NEGATIVE',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: '2024-01-20T16:45:00Z',
    customer: { id: 'cust-2', name: 'TechStart Inc', tier: 'GROWTH', mrr: 12000 },
    assignee: { name: 'Dev Team', avatar: 'DT' },
    responses: [
      { id: 'r2', author: 'Dev Team', content: 'We\'ve identified the issue with Safari\'s WebGL implementation. Fix is in progress.', createdAt: '2024-01-21T10:00:00Z', isInternal: true },
      { id: 'r3', author: 'Sarah M.', content: 'Thanks for reporting this! Our team is working on a fix. ETA is end of this week.', createdAt: '2024-01-21T11:00:00Z', isInternal: false },
    ],
  },
  {
    id: 'fb-4',
    type: 'PRAISE',
    channel: 'Email',
    subject: 'Amazing support experience!',
    content: 'Just wanted to say your support team is incredible! Sarah helped us resolve a critical issue in under an hour during our big product launch. You\'ve earned a customer for life.',
    sentimentScore: 0.95,
    sentimentLabel: 'VERY_POSITIVE',
    priority: 'LOW',
    status: 'CLOSED',
    createdAt: '2024-01-19T14:30:00Z',
    customer: { id: 'cust-5', name: 'MegaCorp International', tier: 'STRATEGIC', mrr: 75000 },
    responses: [],
  },
  {
    id: 'fb-5',
    type: 'COMPLAINT',
    channel: 'Support Ticket',
    subject: 'API rate limits too restrictive',
    content: 'The API rate limits are way too low for our use case. We keep hitting limits during our batch processing jobs. Need at least 10x the current limits or our automation workflows break.',
    sentimentScore: -0.6,
    sentimentLabel: 'NEGATIVE',
    priority: 'HIGH',
    status: 'NEW',
    createdAt: '2024-01-18T11:20:00Z',
    customer: { id: 'cust-4', name: 'Startup Labs', tier: 'STANDARD', mrr: 2500 },
    linkedFeature: { id: 'feat-5', title: 'API Rate Limit Increase', status: 'UNDER_REVIEW' },
    responses: [],
  },
  {
    id: 'fb-6',
    type: 'CSAT',
    channel: 'Post-Support Survey',
    content: 'Support was helpful but took longer than expected to resolve the issue.',
    sentimentScore: 0.3,
    sentimentLabel: 'NEUTRAL',
    csatScore: 3,
    priority: 'MEDIUM',
    status: 'RESOLVED',
    createdAt: '2024-01-17T08:00:00Z',
    customer: { id: 'cust-6', name: 'DataDriven Co', tier: 'GROWTH', mrr: 3200 },
    responses: [],
  },
  {
    id: 'fb-7',
    type: 'NPS',
    channel: 'In-App Survey',
    content: 'Product is okay but missing features that competitors have. Considering switching.',
    sentimentScore: -0.2,
    sentimentLabel: 'NEUTRAL',
    npsScore: 5,
    priority: 'HIGH',
    status: 'NEW',
    createdAt: '2024-01-16T13:45:00Z',
    customer: { id: 'cust-6', name: 'DataDriven Co', tier: 'GROWTH', mrr: 3200 },
    responses: [],
  },
  {
    id: 'fb-8',
    type: 'QUESTION',
    channel: 'Chat',
    subject: 'How to set up webhooks?',
    content: 'We want to integrate your platform with our internal tools using webhooks. Can you point me to documentation or examples?',
    sentimentScore: 0.4,
    sentimentLabel: 'POSITIVE',
    priority: 'LOW',
    status: 'RESOLVED',
    createdAt: '2024-01-15T10:30:00Z',
    customer: { id: 'cust-2', name: 'TechStart Inc', tier: 'GROWTH', mrr: 12000 },
    assignee: { name: 'Mike R.', avatar: 'MR' },
    responses: [
      { id: 'r4', author: 'Mike R.', content: 'Here\'s our webhook documentation: docs.example.com/webhooks. Let me know if you need help!', createdAt: '2024-01-15T11:00:00Z', isInternal: false },
    ],
  },
];

const typeConfig: Record<string, { color: string; icon: string; label: string }> = {
  NPS: { color: 'bg-blue-100 text-blue-800', icon: '📊', label: 'NPS' },
  CSAT: { color: 'bg-purple-100 text-purple-800', icon: '⭐', label: 'CSAT' },
  FEATURE_REQUEST: { color: 'bg-amber-100 text-amber-800', icon: '✨', label: 'Feature' },
  BUG_REPORT: { color: 'bg-red-100 text-red-800', icon: '🐛', label: 'Bug' },
  COMPLAINT: { color: 'bg-orange-100 text-orange-800', icon: '⚠️', label: 'Complaint' },
  PRAISE: { color: 'bg-green-100 text-green-800', icon: '🎉', label: 'Praise' },
  QUESTION: { color: 'bg-gray-100 text-gray-800', icon: '❓', label: 'Question' },
};

const statusConfig: Record<string, { color: string; bg: string }> = {
  NEW: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  IN_PROGRESS: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  WAITING: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  RESOLVED: { color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  CLOSED: { color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

const priorityConfig: Record<string, { color: string; dot: string }> = {
  CRITICAL: { color: 'text-red-600', dot: 'bg-red-500' },
  HIGH: { color: 'text-orange-600', dot: 'bg-orange-500' },
  MEDIUM: { color: 'text-yellow-600', dot: 'bg-yellow-500' },
  LOW: { color: 'text-gray-500', dot: 'bg-gray-400' },
};

const sentimentConfig: Record<string, { color: string; emoji: string }> = {
  VERY_POSITIVE: { color: 'text-green-600', emoji: '😍' },
  POSITIVE: { color: 'text-green-500', emoji: '🙂' },
  NEUTRAL: { color: 'text-gray-500', emoji: '😐' },
  NEGATIVE: { color: 'text-orange-500', emoji: '😕' },
  VERY_NEGATIVE: { color: 'text-red-600', emoji: '😠' },
};

export const FeedbackView: React.FC<FeedbackViewProps> = ({ tenantId: _tenantId }) => {
  const [feedback] = useState<CustomerFeedback[]>(demoFeedback);
  const [selectedFeedback, setSelectedFeedback] = useState<CustomerFeedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [replyText, setReplyText] = useState('');

  // Computed metrics
  const metrics = useMemo(() => {
    const newCount = feedback.filter(f => f.status === 'NEW').length;
    const npsResponses = feedback.filter(f => f.npsScore !== undefined);
    const promoters = npsResponses.filter(f => f.npsScore! >= 9).length;
    const detractors = npsResponses.filter(f => f.npsScore! <= 6).length;
    const npsScore = npsResponses.length > 0
      ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
      : null;
    const avgSentiment = feedback.reduce((sum, f) => sum + f.sentimentScore, 0) / feedback.length;
    const criticalCount = feedback.filter(f => f.priority === 'CRITICAL' && f.status !== 'CLOSED').length;

    return { newCount, npsScore, avgSentiment, criticalCount, total: feedback.length };
  }, [feedback]);

  // Filtered feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter(f => {
      if (searchQuery && !f.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(f.subject?.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      if (typeFilter && f.type !== typeFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      // Sort by: NEW first, then by priority, then by date
      if (a.status === 'NEW' && b.status !== 'NEW') return -1;
      if (b.status === 'NEW' && a.status !== 'NEW') return 1;
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [feedback, searchQuery, typeFilter, statusFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-claude-neutral-900">
      {/* Left Panel - Feedback Inbox */}
      <div className="w-2/5 border-r border-gray-200 dark:border-claude-neutral-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-claude-neutral-700 bg-white dark:bg-claude-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Inbox</h1>
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
              {metrics.newCount} new
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${metrics.npsScore !== null && metrics.npsScore >= 50 ? 'text-green-600' : metrics.npsScore !== null && metrics.npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metrics.npsScore !== null ? metrics.npsScore : 'N/A'}
              </div>
              <div className="text-xs text-gray-500">NPS</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${metrics.avgSentiment >= 0.3 ? 'text-green-600' : metrics.avgSentiment >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {metrics.avgSentiment >= 0 ? '+' : ''}{(metrics.avgSentiment * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Sentiment</div>
            </div>
            <div className="bg-gray-50 dark:bg-claude-neutral-700 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-600">{metrics.criticalCount}</div>
              <div className="text-xs text-gray-500">Critical</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            >
              <option value="">All Types</option>
              {Object.entries(typeConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="flex-1 overflow-auto">
          {filteredFeedback.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedFeedback(item)}
              className={`p-4 border-b border-gray-100 dark:border-claude-neutral-700 cursor-pointer transition-colors ${
                selectedFeedback?.id === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-claude-neutral-800'
              } ${item.status === 'NEW' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Sentiment Emoji */}
                <div className="text-2xl">{sentimentConfig[item.sentimentLabel].emoji}</div>

                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeConfig[item.type].color}`}>
                      {typeConfig[item.type].icon} {typeConfig[item.type].label}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${priorityConfig[item.priority].color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[item.priority].dot}`} />
                      {item.priority}
                    </span>
                    {item.status === 'NEW' && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">NEW</span>
                    )}
                  </div>

                  {/* Subject/Content Preview */}
                  {item.subject && (
                    <div className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">{item.subject}</div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.content}</div>

                  {/* Footer Row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{item.customer.name}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-claude-neutral-700 rounded">{item.customer.tier}</span>
                    <span>{formatDate(item.createdAt)}</span>
                    {item.npsScore !== undefined && (
                      <span className={`font-medium ${item.npsScore >= 9 ? 'text-green-600' : item.npsScore >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                        NPS: {item.npsScore}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`px-2 py-1 text-xs font-medium rounded border ${statusConfig[item.status].bg} ${statusConfig[item.status].color}`}>
                  {item.status.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Feedback Detail */}
      <div className="w-3/5 flex flex-col bg-white dark:bg-claude-neutral-800">
        {selectedFeedback ? (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-gray-200 dark:border-claude-neutral-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sentimentConfig[selectedFeedback.sentimentLabel].emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-sm font-medium rounded-full ${typeConfig[selectedFeedback.type].color}`}>
                        {typeConfig[selectedFeedback.type].icon} {typeConfig[selectedFeedback.type].label}
                      </span>
                      <span className={`px-2 py-1 text-sm font-medium rounded border ${statusConfig[selectedFeedback.status].bg} ${statusConfig[selectedFeedback.status].color}`}>
                        {selectedFeedback.status.replace(/_/g, ' ')}
                      </span>
                      <span className={`flex items-center gap-1 text-sm ${priorityConfig[selectedFeedback.priority].color}`}>
                        <span className={`w-2 h-2 rounded-full ${priorityConfig[selectedFeedback.priority].dot}`} />
                        {selectedFeedback.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      via {selectedFeedback.channel} • {formatDate(selectedFeedback.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-200">
                    Assign
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Customer Info Bar */}
              <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-claude-neutral-700 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Customer</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedFeedback.customer.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tier</div>
                  <div className="font-medium text-gray-900 dark:text-white">{selectedFeedback.customer.tier}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">MRR</div>
                  <div className="font-medium text-gray-900 dark:text-white">${selectedFeedback.customer.mrr.toLocaleString()}</div>
                </div>
                {selectedFeedback.npsScore !== undefined && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">NPS Score</div>
                    <div className={`font-medium ${selectedFeedback.npsScore >= 9 ? 'text-green-600' : selectedFeedback.npsScore >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedFeedback.npsScore}/10
                    </div>
                  </div>
                )}
                {selectedFeedback.csatScore !== undefined && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">CSAT Score</div>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedFeedback.csatScore}/5</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sentiment</div>
                  <div className={`font-medium ${sentimentConfig[selectedFeedback.sentimentLabel].color}`}>
                    {selectedFeedback.sentimentLabel.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Main Content */}
              <Card className="p-4">
                {selectedFeedback.subject && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{selectedFeedback.subject}</h3>
                )}
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedFeedback.content}</p>
              </Card>

              {/* Linked Feature Request */}
              {selectedFeedback.linkedFeature && (
                <Card className="p-4 border-l-4 border-amber-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Linked Feature Request</div>
                      <div className="font-medium text-gray-900 dark:text-white">{selectedFeedback.linkedFeature.title}</div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedFeedback.linkedFeature.status === 'PLANNED' ? 'bg-blue-100 text-blue-800' :
                      selectedFeedback.linkedFeature.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFeedback.linkedFeature.status}
                    </span>
                  </div>
                </Card>
              )}

              {/* Conversation Thread */}
              {selectedFeedback.responses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Conversation</h4>
                  <div className="space-y-3">
                    {selectedFeedback.responses.map((response) => (
                      <Card key={response.id} className={`p-4 ${response.isInternal ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {response.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">{response.author}</span>
                              {response.isInternal && (
                                <span className="px-1.5 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded">Internal</span>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(response.createdAt)}</span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{response.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <Card className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    🔗 Link to Feature
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    📧 Email Customer
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    🎫 Create Ticket
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    👤 View Customer
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    ⬆️ Escalate
                  </button>
                  <button className="p-3 text-sm text-left bg-gray-50 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-claude-neutral-600">
                    🏷️ Add Tag
                  </button>
                </div>
              </Card>
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-200 dark:border-claude-neutral-700">
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-claude-neutral-600 rounded-lg text-sm bg-white dark:bg-claude-neutral-700 dark:text-white resize-none"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    Send Reply
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-claude-neutral-700 rounded-lg hover:bg-gray-200">
                    Internal Note
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📬</div>
              <h3 className="text-lg font-medium mb-2">Select Feedback</h3>
              <p className="text-sm">Choose an item from the inbox to view details and respond</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackView;
