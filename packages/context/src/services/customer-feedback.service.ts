/**
 * Customer Feedback Service - Manages feedback, NPS, CSAT, and sentiment analysis
 * @prompt-id forge-v4.1:service:customer-feedback:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, PaginationOptions, PaginatedResult } from '../types';
import type { CustomerId } from './customer.service';

// ============================================================================
// TYPES
// ============================================================================

export type FeedbackId = string & { __brand: 'FeedbackId' };
export type FeatureRequestId = string & { __brand: 'FeatureRequestId' };

export type FeedbackType = 'NPS' | 'CSAT' | 'FEATURE_REQUEST' | 'BUG_REPORT' | 'COMPLAINT' | 'PRAISE' | 'QUESTION' | 'SUGGESTION';
export type FeedbackChannel = 'IN_APP' | 'EMAIL' | 'SUPPORT_TICKET' | 'SOCIAL_MEDIA' | 'SALES_CALL' | 'SURVEY' | 'INTERCOM' | 'SLACK';
export type SentimentLabel = 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
export type FeedbackPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FeedbackStatus = 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'RESPONDED' | 'CLOSED' | 'ARCHIVED';

export interface CustomerFeedback {
  id: FeedbackId;
  tenantId: TenantId;
  customerId?: CustomerId;
  contactEmail?: string;
  type: FeedbackType;
  channel: FeedbackChannel;
  subject?: string;
  content: string;
  sentimentScore?: number;
  sentimentLabel?: SentimentLabel;
  npsScore?: number;
  csatScore?: number;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  featureRequestId?: FeatureRequestId;
  sessionId?: string;
  respondedAt?: Date;
  respondedById?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeedbackRequest {
  customerId?: CustomerId;
  contactEmail?: string;
  type: FeedbackType;
  channel?: FeedbackChannel;
  subject?: string;
  content: string;
  npsScore?: number;
  csatScore?: number;
  priority?: FeedbackPriority;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  featureRequestId?: FeatureRequestId;
  respondedById?: string;
  metadata?: Record<string, unknown>;
}

export interface NPSMetrics {
  promoters: number;
  passives: number;
  detractors: number;
  npsScore: number;
  totalResponses: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SentimentMetrics {
  veryNegative: number;
  negative: number;
  neutral: number;
  positive: number;
  veryPositive: number;
  avgSentimentScore: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface FeedbackTrend {
  date: Date;
  count: number;
  avgSentiment?: number;
  avgNps?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class CustomerFeedbackService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // FEEDBACK CRUD
  // ============================================================================

  async listFeedback(
    tenantId: TenantId,
    options: PaginationOptions & {
      customerId?: CustomerId;
      type?: FeedbackType;
      status?: FeedbackStatus;
      channel?: FeedbackChannel;
      sentimentLabel?: SentimentLabel;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<PaginatedResult<CustomerFeedback>> {
    const { limit = 20, offset = 0, customerId, type, status, channel, sentimentLabel, startDate, endDate } = options;

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (sentimentLabel) where.sentimentLabel = sentimentLabel;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.customerFeedback.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, tier: true } },
        },
      }),
      this.prisma.customerFeedback.count({ where }),
    ]);

    return {
      data: data.map(this.mapToFeedback),
      total,
      limit,
      offset,
    };
  }

  async getFeedback(
    tenantId: TenantId,
    feedbackId: FeedbackId
  ): Promise<CustomerFeedback | null> {
    const feedback = await this.prisma.customerFeedback.findFirst({
      where: { id: feedbackId, tenantId },
      include: {
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    return feedback ? this.mapToFeedback(feedback) : null;
  }

  async createFeedback(
    tenantId: TenantId,
    request: CreateFeedbackRequest
  ): Promise<CustomerFeedback> {
    // Analyze sentiment
    const sentimentAnalysis = await this.analyzeSentiment(request.content);

    const feedback = await this.prisma.customerFeedback.create({
      data: {
        tenantId,
        customerId: request.customerId,
        contactEmail: request.contactEmail,
        type: request.type,
        channel: request.channel || 'IN_APP',
        subject: request.subject,
        content: request.content,
        sentimentScore: sentimentAnalysis.score,
        sentimentLabel: sentimentAnalysis.label,
        npsScore: request.npsScore,
        csatScore: request.csatScore,
        priority: request.priority || this.inferPriority(request, sentimentAnalysis),
        status: 'NEW',
        sessionId: request.sessionId,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    // Auto-create feature request if type is FEATURE_REQUEST
    if (request.type === 'FEATURE_REQUEST') {
      await this.linkOrCreateFeatureRequest(tenantId, feedback.id, request.content);
    }

    return this.mapToFeedback(feedback);
  }

  async updateFeedback(
    tenantId: TenantId,
    feedbackId: FeedbackId,
    request: UpdateFeedbackRequest
  ): Promise<CustomerFeedback | null> {
    const existing = await this.getFeedback(tenantId, feedbackId);
    if (!existing) return null;

    const updateData: any = {};
    if (request.status) updateData.status = request.status;
    if (request.priority) updateData.priority = request.priority;
    if (request.featureRequestId) updateData.featureRequestId = request.featureRequestId;
    if (request.metadata) updateData.metadata = request.metadata;

    if (request.status === 'RESPONDED' && request.respondedById) {
      updateData.respondedAt = new Date();
      updateData.respondedById = request.respondedById;
    }

    const feedback = await this.prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    return this.mapToFeedback(feedback);
  }

  async deleteFeedback(
    tenantId: TenantId,
    feedbackId: FeedbackId
  ): Promise<boolean> {
    const existing = await this.getFeedback(tenantId, feedbackId);
    if (!existing) return false;

    await this.prisma.customerFeedback.delete({
      where: { id: feedbackId },
    });

    return true;
  }

  // ============================================================================
  // NPS OPERATIONS
  // ============================================================================

  async recordNPS(
    tenantId: TenantId,
    customerId: CustomerId,
    score: number,
    comment?: string
  ): Promise<CustomerFeedback> {
    if (score < 0 || score > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    return this.createFeedback(tenantId, {
      customerId,
      type: 'NPS',
      channel: 'SURVEY',
      content: comment || `NPS Score: ${score}`,
      npsScore: score,
    });
  }

  async getNPSMetrics(
    tenantId: TenantId,
    periodStart: Date,
    periodEnd: Date,
    customerId?: CustomerId
  ): Promise<NPSMetrics> {
    const where: any = {
      tenantId,
      type: 'NPS',
      npsScore: { not: null },
      createdAt: { gte: periodStart, lte: periodEnd },
    };
    if (customerId) where.customerId = customerId;

    const responses = await this.prisma.customerFeedback.findMany({
      where,
      select: { npsScore: true },
    });

    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    responses.forEach(r => {
      const score = r.npsScore!;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    });

    const totalResponses = responses.length;
    const npsScore = totalResponses > 0
      ? Math.round(((promoters - detractors) / totalResponses) * 100)
      : 0;

    return {
      promoters,
      passives,
      detractors,
      npsScore,
      totalResponses,
      periodStart,
      periodEnd,
    };
  }

  // ============================================================================
  // CSAT OPERATIONS
  // ============================================================================

  async recordCSAT(
    tenantId: TenantId,
    customerId: CustomerId,
    score: number,
    comment?: string,
    sessionId?: string
  ): Promise<CustomerFeedback> {
    if (score < 1 || score > 5) {
      throw new Error('CSAT score must be between 1 and 5');
    }

    return this.createFeedback(tenantId, {
      customerId,
      type: 'CSAT',
      channel: 'IN_APP',
      content: comment || `CSAT Score: ${score}`,
      csatScore: score,
      sessionId,
    });
  }

  async getCSATMetrics(
    tenantId: TenantId,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    avgScore: number;
    satisfiedPercentage: number;
    totalResponses: number;
    distribution: Record<number, number>;
  }> {
    const responses = await this.prisma.customerFeedback.findMany({
      where: {
        tenantId,
        type: 'CSAT',
        csatScore: { not: null },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { csatScore: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;
    let satisfiedCount = 0;

    responses.forEach(r => {
      const score = r.csatScore!;
      distribution[score]++;
      totalScore += score;
      if (score >= 4) satisfiedCount++;
    });

    const totalResponses = responses.length;

    return {
      avgScore: totalResponses > 0 ? totalScore / totalResponses : 0,
      satisfiedPercentage: totalResponses > 0 ? (satisfiedCount / totalResponses) * 100 : 0,
      totalResponses,
      distribution,
    };
  }

  // ============================================================================
  // SENTIMENT ANALYSIS
  // ============================================================================

  async analyzeSentiment(text: string): Promise<{
    score: number;
    label: SentimentLabel;
  }> {
    // Simple rule-based sentiment analysis
    // In production, use ML model or API (e.g., OpenAI, HuggingFace)
    const lowerText = text.toLowerCase();

    const positiveWords = ['great', 'excellent', 'love', 'amazing', 'wonderful', 'fantastic', 'happy', 'helpful', 'thank', 'awesome', 'best', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'poor', 'disappointing', 'frustrated', 'angry', 'worst', 'broken', 'bug', 'issue', 'problem'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    const totalWords = positiveCount + negativeCount;
    let score = 0;

    if (totalWords > 0) {
      score = (positiveCount - negativeCount) / totalWords;
    }

    let label: SentimentLabel;
    if (score <= -0.6) label = 'VERY_NEGATIVE';
    else if (score <= -0.2) label = 'NEGATIVE';
    else if (score < 0.2) label = 'NEUTRAL';
    else if (score < 0.6) label = 'POSITIVE';
    else label = 'VERY_POSITIVE';

    return { score, label };
  }

  async getSentimentMetrics(
    tenantId: TenantId,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SentimentMetrics> {
    const responses = await this.prisma.customerFeedback.findMany({
      where: {
        tenantId,
        sentimentLabel: { not: null },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { sentimentLabel: true, sentimentScore: true },
    });

    const counts = {
      veryNegative: 0,
      negative: 0,
      neutral: 0,
      positive: 0,
      veryPositive: 0,
    };

    let totalScore = 0;
    responses.forEach(r => {
      switch (r.sentimentLabel) {
        case 'VERY_NEGATIVE': counts.veryNegative++; break;
        case 'NEGATIVE': counts.negative++; break;
        case 'NEUTRAL': counts.neutral++; break;
        case 'POSITIVE': counts.positive++; break;
        case 'VERY_POSITIVE': counts.veryPositive++; break;
      }
      if (r.sentimentScore !== null) {
        totalScore += r.sentimentScore;
      }
    });

    return {
      ...counts,
      avgSentimentScore: responses.length > 0 ? totalScore / responses.length : 0,
      periodStart,
      periodEnd,
    };
  }

  // ============================================================================
  // FEEDBACK TRENDS
  // ============================================================================

  async getFeedbackTrends(
    tenantId: TenantId,
    periodStart: Date,
    periodEnd: Date,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<FeedbackTrend[]> {
    // Get raw feedback data
    const feedback = await this.prisma.customerFeedback.findMany({
      where: {
        tenantId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        createdAt: true,
        sentimentScore: true,
        npsScore: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const trends: Map<string, { count: number; totalSentiment: number; sentimentCount: number; totalNps: number; npsCount: number }> = new Map();

    feedback.forEach(f => {
      const date = this.truncateDate(f.createdAt, granularity);
      const key = date.toISOString();

      if (!trends.has(key)) {
        trends.set(key, { count: 0, totalSentiment: 0, sentimentCount: 0, totalNps: 0, npsCount: 0 });
      }

      const bucket = trends.get(key)!;
      bucket.count++;
      if (f.sentimentScore !== null) {
        bucket.totalSentiment += f.sentimentScore;
        bucket.sentimentCount++;
      }
      if (f.npsScore !== null) {
        bucket.totalNps += f.npsScore;
        bucket.npsCount++;
      }
    });

    return Array.from(trends.entries()).map(([key, bucket]) => ({
      date: new Date(key),
      count: bucket.count,
      avgSentiment: bucket.sentimentCount > 0 ? bucket.totalSentiment / bucket.sentimentCount : undefined,
      avgNps: bucket.npsCount > 0 ? bucket.totalNps / bucket.npsCount : undefined,
    }));
  }

  // ============================================================================
  // FEATURE REQUEST LINKING
  // ============================================================================

  private async linkOrCreateFeatureRequest(
    tenantId: TenantId,
    feedbackId: string,
    content: string
  ): Promise<void> {
    // In production, use vector similarity to find duplicates
    // For now, create a new feature request

    const shortId = `FR-${Date.now().toString(36).toUpperCase()}`;

    const featureRequest = await this.prisma.featureRequest.create({
      data: {
        tenantId,
        shortId,
        title: content.substring(0, 100),
        description: content,
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        voteCount: 1,
        metadata: {},
      },
    });

    await this.prisma.customerFeedback.update({
      where: { id: feedbackId },
      data: { featureRequestId: featureRequest.id },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private inferPriority(
    request: CreateFeedbackRequest,
    sentiment: { score: number; label: SentimentLabel }
  ): FeedbackPriority {
    // Critical for very negative sentiment or complaints
    if (sentiment.label === 'VERY_NEGATIVE' || request.type === 'COMPLAINT') {
      return 'CRITICAL';
    }

    // High for bug reports or negative sentiment
    if (request.type === 'BUG_REPORT' || sentiment.label === 'NEGATIVE') {
      return 'HIGH';
    }

    // Low for praise
    if (request.type === 'PRAISE' || sentiment.label === 'VERY_POSITIVE') {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  private truncateDate(date: Date, granularity: 'day' | 'week' | 'month'): Date {
    const result = new Date(date);

    switch (granularity) {
      case 'day':
        result.setHours(0, 0, 0, 0);
        break;
      case 'week':
        result.setHours(0, 0, 0, 0);
        result.setDate(result.getDate() - result.getDay());
        break;
      case 'month':
        result.setHours(0, 0, 0, 0);
        result.setDate(1);
        break;
    }

    return result;
  }

  private mapToFeedback = (record: any): CustomerFeedback => {
    return {
      id: record.id as FeedbackId,
      tenantId: record.tenantId as TenantId,
      customerId: record.customerId as CustomerId | undefined,
      contactEmail: record.contactEmail,
      type: record.type as FeedbackType,
      channel: record.channel as FeedbackChannel,
      subject: record.subject,
      content: record.content,
      sentimentScore: record.sentimentScore,
      sentimentLabel: record.sentimentLabel as SentimentLabel | undefined,
      npsScore: record.npsScore,
      csatScore: record.csatScore,
      priority: record.priority as FeedbackPriority,
      status: record.status as FeedbackStatus,
      featureRequestId: record.featureRequestId as FeatureRequestId | undefined,
      sessionId: record.sessionId,
      respondedAt: record.respondedAt,
      respondedById: record.respondedById,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };
}
