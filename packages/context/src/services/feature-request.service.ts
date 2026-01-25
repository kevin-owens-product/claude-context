/**
 * Feature Request Service - Manages feature backlog, prioritization, and voting
 * @prompt-id forge-v4.1:service:feature-request:001
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

export type FeatureRequestId = string & { __brand: 'FeatureRequestId' };

export type FeatureRequestStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'PLANNED' | 'IN_PROGRESS' | 'RELEASED' | 'DECLINED' | 'DUPLICATE';
export type FeatureRequestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type EffortEstimate = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type VoteUrgency = 'BLOCKER' | 'CRITICAL' | 'IMPORTANT' | 'NICE_TO_HAVE';

export interface FeatureRequest {
  id: FeatureRequestId;
  tenantId: TenantId;
  shortId: string;
  title: string;
  description: string;
  category?: string;
  status: FeatureRequestStatus;
  priority: FeatureRequestPriority;
  voteCount: number;
  totalMRR: number;
  dealBlockerValue: number;
  urgencyScore: number;
  priorityScore: number;
  effortEstimate?: EffortEstimate;
  linkedGoalIds: string[];
  linkedSliceIds: string[];
  linkedArtifactIds: string[];
  duplicateOfId?: FeatureRequestId;
  targetReleaseId?: string;
  releasedInId?: string;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  votes?: FeatureVote[];
}

export interface FeatureVote {
  id: string;
  featureRequestId: FeatureRequestId;
  customerId: CustomerId;
  urgency: VoteUrgency;
  businessImpact?: string;
  useCaseDescription?: string;
  mrrAtVote?: number;
  createdAt: Date;
}

export interface CreateFeatureRequestRequest {
  title: string;
  description: string;
  category?: string;
  priority?: FeatureRequestPriority;
  createdById?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFeatureRequestRequest {
  title?: string;
  description?: string;
  category?: string;
  status?: FeatureRequestStatus;
  priority?: FeatureRequestPriority;
  effortEstimate?: EffortEstimate;
  linkedGoalIds?: string[];
  linkedSliceIds?: string[];
  linkedArtifactIds?: string[];
  duplicateOfId?: FeatureRequestId;
  targetReleaseId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateVoteRequest {
  customerId: CustomerId;
  urgency?: VoteUrgency;
  businessImpact?: string;
  useCaseDescription?: string;
}

export interface FeatureImpactAnalysis {
  featureRequestId: FeatureRequestId;
  title: string;
  voteCount: number;
  totalMRR: number;
  dealBlockerValue: number;
  urgencyBreakdown: Record<VoteUrgency, number>;
  topCustomers: { customerId: CustomerId; name: string; mrr: number }[];
  priorityScore: number;
  estimatedROI?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class FeatureRequestService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // FEATURE REQUEST CRUD
  // ============================================================================

  async listFeatureRequests(
    tenantId: TenantId,
    options: PaginationOptions & {
      status?: FeatureRequestStatus;
      priority?: FeatureRequestPriority;
      category?: string;
      sortBy?: 'priorityScore' | 'voteCount' | 'totalMRR' | 'createdAt';
    } = {}
  ): Promise<PaginatedResult<FeatureRequest>> {
    const { limit = 20, offset = 0, status, priority, category, sortBy = 'priorityScore' } = options;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const orderBy: any = {};
    orderBy[sortBy] = 'desc';

    const [data, total] = await Promise.all([
      this.prisma.featureRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          votes: {
            take: 5,
            include: {
              customer: { select: { id: true, name: true } },
            },
          },
          _count: { select: { votes: true, dealBlockers: true } },
        },
      }),
      this.prisma.featureRequest.count({ where }),
    ]);

    return {
      data: data.map(this.mapToFeatureRequest),
      total,
      limit,
      offset,
    };
  }

  async getFeatureRequest(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId
  ): Promise<FeatureRequest | null> {
    const feature = await this.prisma.featureRequest.findFirst({
      where: { id: featureRequestId, tenantId },
      include: {
        votes: {
          include: {
            customer: { select: { id: true, name: true, tier: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        dealBlockers: {
          include: {
            deal: { select: { id: true, name: true, value: true } },
          },
        },
      },
    });

    return feature ? this.mapToFeatureRequest(feature) : null;
  }

  async createFeatureRequest(
    tenantId: TenantId,
    request: CreateFeatureRequestRequest
  ): Promise<FeatureRequest> {
    const shortId = await this.generateShortId(tenantId);

    const feature = await this.prisma.featureRequest.create({
      data: {
        tenantId,
        shortId,
        title: request.title,
        description: request.description,
        category: request.category,
        status: 'SUBMITTED',
        priority: request.priority || 'MEDIUM',
        voteCount: 0,
        totalMRR: 0,
        dealBlockerValue: 0,
        urgencyScore: 0,
        priorityScore: 0,
        linkedGoalIds: [],
        linkedSliceIds: [],
        linkedArtifactIds: [],
        createdById: request.createdById,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToFeatureRequest(feature);
  }

  async updateFeatureRequest(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    request: UpdateFeatureRequestRequest
  ): Promise<FeatureRequest | null> {
    const existing = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!existing) return null;

    const feature = await this.prisma.featureRequest.update({
      where: { id: featureRequestId as string },
      data: {
        ...(request.title && { title: request.title }),
        ...(request.description && { description: request.description }),
        ...(request.category !== undefined && { category: request.category }),
        ...(request.status && { status: request.status }),
        ...(request.priority && { priority: request.priority }),
        ...(request.effortEstimate && { effortEstimate: request.effortEstimate }),
        ...(request.linkedGoalIds && { linkedGoalIds: request.linkedGoalIds }),
        ...(request.linkedSliceIds && { linkedSliceIds: request.linkedSliceIds }),
        ...(request.linkedArtifactIds && { linkedArtifactIds: request.linkedArtifactIds }),
        ...(request.duplicateOfId && { duplicateOfId: request.duplicateOfId as string }),
        ...(request.targetReleaseId !== undefined && { targetReleaseId: request.targetReleaseId }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
    });

    // Mark as duplicate if specified
    if (request.duplicateOfId) {
      await this.prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: 'DUPLICATE' },
      });
      // Merge votes to original
      await this.mergeVotesToOriginal(featureRequestId, request.duplicateOfId);
    }

    return this.mapToFeatureRequest(feature);
  }

  async deleteFeatureRequest(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId
  ): Promise<boolean> {
    const existing = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!existing) return false;

    await this.prisma.featureRequest.delete({
      where: { id: featureRequestId },
    });

    return true;
  }

  // ============================================================================
  // VOTING
  // ============================================================================

  async addVote(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    request: CreateVoteRequest
  ): Promise<FeatureVote> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) {
      throw new Error(`Feature request not found: ${featureRequestId}`);
    }

    // Get customer's current MRR
    const subscription = await this.prisma.customerSubscription.findFirst({
      where: { customerId: request.customerId, status: 'ACTIVE' },
      select: { mrr: true },
    });
    const mrrAtVote = subscription ? Number(subscription.mrr) : 0;

    const vote = await this.prisma.featureVote.create({
      data: {
        featureRequestId,
        customerId: request.customerId,
        urgency: request.urgency || 'NICE_TO_HAVE',
        businessImpact: request.businessImpact,
        useCaseDescription: request.useCaseDescription,
        mrrAtVote,
      },
    });

    // Update aggregated metrics
    await this.recalculateFeatureMetrics(featureRequestId);

    return this.mapToVote(vote);
  }

  async removeVote(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    customerId: CustomerId
  ): Promise<boolean> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) return false;

    try {
      await this.prisma.featureVote.delete({
        where: {
          featureRequestId_customerId: {
            featureRequestId,
            customerId,
          },
        },
      });

      await this.recalculateFeatureMetrics(featureRequestId);
      return true;
    } catch {
      return false;
    }
  }

  async updateVote(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    customerId: CustomerId,
    updates: Partial<CreateVoteRequest>
  ): Promise<FeatureVote | null> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) return null;

    const existing = feature.votes?.find(v => v.customerId === customerId);
    if (!existing) return null;

    const vote = await this.prisma.featureVote.update({
      where: {
        featureRequestId_customerId: {
          featureRequestId,
          customerId,
        },
      },
      data: {
        ...(updates.urgency && { urgency: updates.urgency }),
        ...(updates.businessImpact !== undefined && { businessImpact: updates.businessImpact }),
        ...(updates.useCaseDescription !== undefined && { useCaseDescription: updates.useCaseDescription }),
      },
    });

    await this.recalculateFeatureMetrics(featureRequestId);

    return this.mapToVote(vote);
  }

  // ============================================================================
  // PRIORITIZATION
  // ============================================================================

  async recalculateFeatureMetrics(featureRequestId: FeatureRequestId): Promise<void> {
    // Get all votes
    const votes = await this.prisma.featureVote.findMany({
      where: { featureRequestId },
    });

    // Calculate metrics
    const voteCount = votes.length;
    const totalMRR = votes.reduce((sum, v) => sum + Number(v.mrrAtVote || 0), 0);

    // Calculate urgency score (weighted average)
    const urgencyWeights: Record<VoteUrgency, number> = {
      BLOCKER: 10,
      CRITICAL: 7,
      IMPORTANT: 4,
      NICE_TO_HAVE: 1,
    };
    const urgencyScore = votes.length > 0
      ? votes.reduce((sum, v) => sum + urgencyWeights[v.urgency as VoteUrgency], 0) / votes.length
      : 0;

    // Get deal blocker value
    const dealBlockers = await this.prisma.dealBlocker.findMany({
      where: { featureRequestId },
      include: { deal: { select: { value: true } } },
    });
    const dealBlockerValue = dealBlockers.reduce(
      (sum, b) => sum + Number(b.deal.value || 0),
      0
    );

    // Get effort estimate for priority calculation
    const feature = await this.prisma.featureRequest.findUnique({
      where: { id: featureRequestId },
      select: { effortEstimate: true },
    });

    const effortScores: Record<string, number> = {
      XS: 1,
      S: 2,
      M: 4,
      L: 8,
      XL: 16,
    };
    const effortScore = feature?.effortEstimate
      ? effortScores[feature.effortEstimate]
      : 4; // Default to M

    // Calculate priority score using the formula from the plan
    // priorityScore = ((requestCount * 2) + (totalMRR / 1000) + (dealBlockerValue / 5000) + (urgencyWeightedVotes * 3)) / (effortScore + 1)
    const priorityScore = (
      (voteCount * 2) +
      (totalMRR / 1000) +
      (dealBlockerValue / 5000) +
      (urgencyScore * votes.length * 3)
    ) / (effortScore + 1);

    // Update feature request
    await this.prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: {
        voteCount,
        totalMRR,
        dealBlockerValue,
        urgencyScore,
        priorityScore,
      },
    });
  }

  async recalculateAllPriorities(tenantId: TenantId): Promise<number> {
    const features = await this.prisma.featureRequest.findMany({
      where: { tenantId, status: { notIn: ['RELEASED', 'DECLINED', 'DUPLICATE'] } },
      select: { id: true },
    });

    for (const feature of features) {
      await this.recalculateFeatureMetrics(feature.id as FeatureRequestId);
    }

    return features.length;
  }

  // ============================================================================
  // IMPACT ANALYSIS
  // ============================================================================

  async getImpactAnalysis(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId
  ): Promise<FeatureImpactAnalysis | null> {
    const feature = await this.prisma.featureRequest.findFirst({
      where: { id: featureRequestId, tenantId },
      include: {
        votes: {
          include: {
            customer: {
              select: { id: true, name: true },
              include: {
                subscriptions: {
                  where: { status: 'ACTIVE' },
                  select: { mrr: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!feature) return null;

    // Calculate urgency breakdown
    const urgencyBreakdown: Record<VoteUrgency, number> = {
      BLOCKER: 0,
      CRITICAL: 0,
      IMPORTANT: 0,
      NICE_TO_HAVE: 0,
    };
    feature.votes.forEach(v => {
      urgencyBreakdown[v.urgency as VoteUrgency]++;
    });

    // Get top customers by MRR
    const topCustomers = feature.votes
      .map(v => ({
        customerId: v.customer.id as CustomerId,
        name: v.customer.name,
        mrr: Number(v.customer.subscriptions[0]?.mrr || 0),
      }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10);

    // Estimate ROI (simplified)
    const avgMRRPerVoter = feature.voteCount > 0
      ? Number(feature.totalMRR) / feature.voteCount
      : 0;
    const estimatedNewCustomers = Math.ceil(feature.voteCount * 0.3); // 30% might convert
    const estimatedROI = (avgMRRPerVoter * estimatedNewCustomers * 12) + Number(feature.dealBlockerValue);

    return {
      featureRequestId,
      title: feature.title,
      voteCount: feature.voteCount,
      totalMRR: Number(feature.totalMRR),
      dealBlockerValue: Number(feature.dealBlockerValue),
      urgencyBreakdown,
      topCustomers,
      priorityScore: feature.priorityScore,
      estimatedROI,
    };
  }

  // ============================================================================
  // LINKING
  // ============================================================================

  async linkToGoal(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    goalId: string
  ): Promise<FeatureRequest | null> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) return null;

    const linkedGoalIds = [...new Set([...feature.linkedGoalIds, goalId])];

    return this.updateFeatureRequest(tenantId, featureRequestId, { linkedGoalIds });
  }

  async linkToSlice(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    sliceId: string
  ): Promise<FeatureRequest | null> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) return null;

    const linkedSliceIds = [...new Set([...feature.linkedSliceIds, sliceId])];

    // If linking to slice, move to IN_PROGRESS
    const status = feature.status === 'PLANNED' ? 'IN_PROGRESS' : feature.status;

    return this.updateFeatureRequest(tenantId, featureRequestId, { linkedSliceIds, status });
  }

  async markAsReleased(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId,
    releaseId: string
  ): Promise<FeatureRequest | null> {
    const feature = await this.getFeatureRequest(tenantId, featureRequestId);
    if (!feature) return null;

    const updated = await this.prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: {
        status: 'RELEASED',
        releasedInId: releaseId,
      },
    });

    return this.mapToFeatureRequest(updated);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async generateShortId(tenantId: TenantId): Promise<string> {
    const count = await this.prisma.featureRequest.count({ where: { tenantId } });
    return `FR-${(count + 1).toString().padStart(4, '0')}`;
  }

  private async mergeVotesToOriginal(
    duplicateId: FeatureRequestId,
    originalId: FeatureRequestId
  ): Promise<void> {
    // Get votes from duplicate
    const duplicateVotes = await this.prisma.featureVote.findMany({
      where: { featureRequestId: duplicateId },
    });

    // Try to create votes on original (skip if customer already voted)
    for (const vote of duplicateVotes) {
      try {
        await this.prisma.featureVote.create({
          data: {
            featureRequestId: originalId,
            customerId: vote.customerId,
            urgency: vote.urgency,
            businessImpact: vote.businessImpact,
            useCaseDescription: vote.useCaseDescription,
            mrrAtVote: vote.mrrAtVote,
          },
        });
      } catch {
        // Customer already voted on original, skip
      }
    }

    // Recalculate original's metrics
    await this.recalculateFeatureMetrics(originalId);
  }

  private mapToFeatureRequest = (record: any): FeatureRequest => {
    return {
      id: record.id as FeatureRequestId,
      tenantId: record.tenantId as TenantId,
      shortId: record.shortId,
      title: record.title,
      description: record.description,
      category: record.category,
      status: record.status as FeatureRequestStatus,
      priority: record.priority as FeatureRequestPriority,
      voteCount: record.voteCount,
      totalMRR: Number(record.totalMRR),
      dealBlockerValue: Number(record.dealBlockerValue),
      urgencyScore: record.urgencyScore,
      priorityScore: record.priorityScore,
      effortEstimate: record.effortEstimate as EffortEstimate | undefined,
      linkedGoalIds: record.linkedGoalIds || [],
      linkedSliceIds: record.linkedSliceIds || [],
      linkedArtifactIds: record.linkedArtifactIds || [],
      duplicateOfId: record.duplicateOfId as FeatureRequestId | undefined,
      targetReleaseId: record.targetReleaseId,
      releasedInId: record.releasedInId,
      createdById: record.createdById,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      votes: record.votes?.map(this.mapToVote),
    };
  };

  private mapToVote = (record: any): FeatureVote => {
    return {
      id: record.id,
      featureRequestId: record.featureRequestId as FeatureRequestId,
      customerId: record.customerId as CustomerId,
      urgency: record.urgency as VoteUrgency,
      businessImpact: record.businessImpact,
      useCaseDescription: record.useCaseDescription,
      mrrAtVote: record.mrrAtVote ? Number(record.mrrAtVote) : undefined,
      createdAt: record.createdAt,
    };
  };
}
