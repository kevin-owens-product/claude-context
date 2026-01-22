/**
 * @prompt-id forge-v4.1:service:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import {
  type SessionId,
  type WorkspaceId,
  type TenantId,
  type UserId,
  type NodeId,
  type AISession,
  type SessionFeedback,
  type SubmitFeedbackRequest,
  type WorkspaceAnalytics,
  type FeedbackMetrics,
  FeedbackRating,
  FeedbackErrorCategory,
} from '../types';
import {
  SessionNotFoundError,
  FeedbackAlreadySubmittedError,
} from '../errors';

export class FeedbackService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly feedbackQueue?: Queue
  ) {}

  // ============================================================================
  // AI SESSION OPERATIONS
  // ============================================================================

  async createSession(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
    userId: UserId,
    data: {
      sliceId?: string;
      contextNodeIds: NodeId[];
      contextTokenCount: number;
    }
  ): Promise<AISession> {
    const session = await this.prisma.aISession.create({
      data: {
        tenantId,
        workspaceId,
        userId,
        sliceId: data.sliceId,
        contextNodeIds: data.contextNodeIds,
        contextTokenCount: data.contextTokenCount,
        contextCompiledAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Update real-time session counter
    await this.redis.hincrby(
      `sessions:${workspaceId}:${this.getTodayKey()}`,
      'total',
      1
    );

    return session as unknown as AISession;
  }

  async getSession(sessionId: SessionId, tenantId: TenantId): Promise<AISession> {
    const session = await this.prisma.aISession.findFirst({
      where: { id: sessionId, tenantId },
      include: { feedback: true },
    });

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    return session as unknown as AISession;
  }

  async endSession(sessionId: SessionId, tenantId: TenantId): Promise<AISession> {
    await this.getSession(sessionId, tenantId); // Verify exists

    const session = await this.prisma.aISession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    return session as unknown as AISession;
  }

  // ============================================================================
  // FEEDBACK OPERATIONS
  // ============================================================================

  async submitFeedback(
    tenantId: TenantId,
    userId: UserId,
    request: SubmitFeedbackRequest
  ): Promise<SessionFeedback> {
    const session = await this.getSession(request.sessionId, tenantId);

    // Check if feedback already exists
    const existing = await this.prisma.sessionFeedback.findUnique({
      where: { sessionId: request.sessionId },
    });

    if (existing) {
      throw new FeedbackAlreadySubmittedError(request.sessionId);
    }

    const feedback = await this.prisma.sessionFeedback.create({
      data: {
        tenantId,
        sessionId: request.sessionId,
        rating: request.rating,
        errorCategories: request.errorCategories ?? [],
        missingContext: request.missingContext,
        comment: request.comment,
        accuracyScore: request.qualityScores?.accuracy,
        completenessScore: request.qualityScores?.completeness,
        styleMatchScore: request.qualityScores?.styleMatch,
        outputIssues: [],
        submittedById: userId,
      },
    });

    // Update real-time counters
    const workspaceId = session.workspaceId;
    const todayKey = this.getTodayKey();
    await this.redis.hincrby(
      `feedback:${workspaceId}:${todayKey}`,
      request.rating.toLowerCase(),
      1
    );

    // Queue background processing
    if (this.feedbackQueue) {
      await this.feedbackQueue.add('process_feedback', {
        feedbackId: feedback.id,
        sessionId: request.sessionId,
        workspaceId,
        rating: request.rating,
        errorCategories: request.errorCategories,
      });
    }

    return feedback as unknown as SessionFeedback;
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getAnalytics(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
    startDate: Date,
    endDate: Date
  ): Promise<WorkspaceAnalytics> {
    // Get aggregated metrics from daily table
    const dailyMetrics = await this.prisma.feedbackMetrics.findMany({
      where: {
        tenantId,
        workspaceId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate summary
    const summary = this.calculateSummary(dailyMetrics);

    // Get trends
    const trends = dailyMetrics.map((m) => ({
      date: m.date,
      sessions: m.totalSessions,
      positiveRatings: m.positiveRatings,
      negativeRatings: m.negativeRatings,
    }));

    // Get top context documents
    const topContext = await this.getTopContextDocuments(
      tenantId,
      workspaceId,
      startDate,
      endDate
    );

    // Get common errors
    const commonErrors = this.aggregateErrorCategories(dailyMetrics);

    return {
      period: { startDate, endDate },
      summary,
      trends,
      topContext,
      commonErrors,
    };
  }

  async getRealTimeMetrics(
    workspaceId: WorkspaceId
  ): Promise<{ sessions: number; positive: number; negative: number }> {
    const todayKey = this.getTodayKey();

    const [sessions, positive, negative] = await Promise.all([
      this.redis.hget(`sessions:${workspaceId}:${todayKey}`, 'total'),
      this.redis.hget(`feedback:${workspaceId}:${todayKey}`, 'positive'),
      this.redis.hget(`feedback:${workspaceId}:${todayKey}`, 'negative'),
    ]);

    return {
      sessions: parseInt(sessions ?? '0', 10),
      positive: parseInt(positive ?? '0', 10),
      negative: parseInt(negative ?? '0', 10),
    };
  }

  // ============================================================================
  // AGGREGATION (called by background worker)
  // ============================================================================

  async aggregateDaily(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
    date: Date
  ): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all sessions for the day
    const sessions = await this.prisma.aISession.findMany({
      where: {
        tenantId,
        workspaceId,
        startedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: { feedback: true },
    });

    const feedbacks = sessions
      .map((s) => s.feedback)
      .filter((f): f is NonNullable<typeof f> => f !== null);

    // Calculate metrics
    const totalSessions = sessions.length;
    const positiveRatings = feedbacks.filter(
      (f) => f.rating === FeedbackRating.POSITIVE
    ).length;
    const negativeRatings = feedbacks.filter(
      (f) => f.rating === FeedbackRating.NEGATIVE
    ).length;
    const skippedRatings = feedbacks.filter(
      (f) => f.rating === FeedbackRating.SKIPPED
    ).length;

    // Calculate rates
    const reviewedFeedbacks = feedbacks.filter((f) => f.reviewVerdict);
    const approvedCount = reviewedFeedbacks.filter(
      (f) => f.reviewVerdict === 'APPROVED'
    ).length;
    const firstPassAcceptanceRate =
      reviewedFeedbacks.length > 0
        ? (approvedCount / reviewedFeedbacks.length) * 100
        : null;

    const editDistances = feedbacks
      .map((f) => f.editDistance)
      .filter((d): d is number => d !== null);
    const averageEditDistance =
      editDistances.length > 0
        ? editDistances.reduce((a, b) => a + b, 0) / editDistances.length
        : null;

    // Aggregate error categories
    const errorCategoryCounts: Record<string, number> = {};
    for (const feedback of feedbacks) {
      for (const category of feedback.errorCategories) {
        errorCategoryCounts[category] = (errorCategoryCounts[category] ?? 0) + 1;
      }
    }

    // Calculate quality score averages
    const accuracyScores = feedbacks
      .map((f) => f.accuracyScore)
      .filter((s): s is number => s !== null);
    const completenessScores = feedbacks
      .map((f) => f.completenessScore)
      .filter((s): s is number => s !== null);
    const styleMatchScores = feedbacks
      .map((f) => f.styleMatchScore)
      .filter((s): s is number => s !== null);

    // Upsert daily metrics
    await this.prisma.feedbackMetrics.upsert({
      where: {
        tenantId_workspaceId_date: {
          tenantId,
          workspaceId,
          date: startOfDay,
        },
      },
      create: {
        tenantId,
        workspaceId,
        date: startOfDay,
        totalSessions,
        positiveRatings,
        negativeRatings,
        skippedRatings,
        firstPassAcceptanceRate,
        averageEditDistance,
        errorCategoryCounts,
        avgAccuracyScore: this.average(accuracyScores),
        avgCompletenessScore: this.average(completenessScores),
        avgStyleMatchScore: this.average(styleMatchScores),
      },
      update: {
        totalSessions,
        positiveRatings,
        negativeRatings,
        skippedRatings,
        firstPassAcceptanceRate,
        averageEditDistance,
        errorCategoryCounts,
        avgAccuracyScore: this.average(accuracyScores),
        avgCompletenessScore: this.average(completenessScores),
        avgStyleMatchScore: this.average(styleMatchScores),
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private average(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateSummary(
    metrics: Array<{
      totalSessions: number;
      positiveRatings: number;
      negativeRatings: number;
      skippedRatings: number;
      firstPassAcceptanceRate: number | null;
      averageEditDistance: number | null;
      avgAccuracyScore: number | null;
      avgCompletenessScore: number | null;
      avgStyleMatchScore: number | null;
      errorCategoryCounts: unknown;
    }>
  ): FeedbackMetrics {
    const totalSessions = metrics.reduce((sum, m) => sum + m.totalSessions, 0);
    const positiveRatings = metrics.reduce((sum, m) => sum + m.positiveRatings, 0);
    const negativeRatings = metrics.reduce((sum, m) => sum + m.negativeRatings, 0);
    const skippedRatings = metrics.reduce((sum, m) => sum + m.skippedRatings, 0);

    const acceptanceRates = metrics
      .map((m) => m.firstPassAcceptanceRate)
      .filter((r): r is number => r !== null);
    const editDistances = metrics
      .map((m) => m.averageEditDistance)
      .filter((d): d is number => d !== null);
    const accuracyScores = metrics
      .map((m) => m.avgAccuracyScore)
      .filter((s): s is number => s !== null);
    const completenessScores = metrics
      .map((m) => m.avgCompletenessScore)
      .filter((s): s is number => s !== null);
    const styleMatchScores = metrics
      .map((m) => m.avgStyleMatchScore)
      .filter((s): s is number => s !== null);

    const errorCategoryCounts: Record<string, number> = {};
    for (const m of metrics) {
      const counts = m.errorCategoryCounts as Record<string, number>;
      for (const [category, count] of Object.entries(counts)) {
        errorCategoryCounts[category] = (errorCategoryCounts[category] ?? 0) + count;
      }
    }

    return {
      totalSessions,
      positiveRatings,
      negativeRatings,
      skippedRatings,
      firstPassAcceptanceRate: this.average(acceptanceRates),
      averageEditDistance: this.average(editDistances),
      avgAccuracyScore: this.average(accuracyScores),
      avgCompletenessScore: this.average(completenessScores),
      avgStyleMatchScore: this.average(styleMatchScores),
      errorCategoryCounts,
    };
  }

  private async getTopContextDocuments(
    tenantId: TenantId,
    workspaceId: WorkspaceId,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      nodeId: NodeId;
      name: string;
      usageCount: number;
      effectivenessScore: number;
    }>
  > {
    // Get all sessions in the period
    const sessions = await this.prisma.aISession.findMany({
      where: {
        tenantId,
        workspaceId,
        startedAt: { gte: startDate, lte: endDate },
      },
      include: { feedback: true },
    });

    // Count document usage and effectiveness
    const documentStats: Map<
      string,
      { count: number; positiveCount: number; nodeName?: string }
    > = new Map();

    for (const session of sessions) {
      const isPositive = session.feedback?.rating === FeedbackRating.POSITIVE;

      for (const nodeId of session.contextNodeIds) {
        const stats = documentStats.get(nodeId) ?? {
          count: 0,
          positiveCount: 0,
        };
        stats.count++;
        if (isPositive) stats.positiveCount++;
        documentStats.set(nodeId, stats);
      }
    }

    // Get node names
    const nodeIds = Array.from(documentStats.keys());
    const nodes = await this.prisma.contextNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, name: true },
    });

    const nodeNames = new Map(nodes.map((n) => [n.id, n.name]));

    // Calculate effectiveness and sort
    return Array.from(documentStats.entries())
      .map(([nodeId, stats]) => ({
        nodeId: nodeId as NodeId,
        name: nodeNames.get(nodeId) ?? 'Unknown',
        usageCount: stats.count,
        effectivenessScore:
          stats.count > 0 ? (stats.positiveCount / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  private aggregateErrorCategories(
    metrics: Array<{ errorCategoryCounts: unknown }>
  ): Array<{
    category: FeedbackErrorCategory;
    count: number;
    percentage: number;
  }> {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    for (const m of metrics) {
      const counts = m.errorCategoryCounts as Record<string, number>;
      for (const [category, count] of Object.entries(counts)) {
        totals[category] = (totals[category] ?? 0) + count;
        grandTotal += count;
      }
    }

    return Object.entries(totals)
      .map(([category, count]) => ({
        category: category as FeedbackErrorCategory,
        count,
        percentage: grandTotal > 0 ? (count / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
