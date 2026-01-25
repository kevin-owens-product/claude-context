/**
 * Deal Service - Manages sales pipeline, deals, and blockers
 * @prompt-id forge-v4.1:service:deal:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type { CustomerId } from './customer.service';
import type { FeatureRequestId } from './feature-request.service';

// ============================================================================
// TYPES
// ============================================================================

export type DealId = string & { __brand: 'DealId' };

export type DealStage = 'QUALIFICATION' | 'DISCOVERY' | 'DEMO' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
export type DealSource = 'INBOUND' | 'OUTBOUND' | 'REFERRAL' | 'PARTNER' | 'EXPANSION' | 'PLG_UPGRADE';
export type BlockerImpact = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'PROPOSAL_SENT' | 'CONTRACT_SENT' | 'NEGOTIATION' | 'FOLLOW_UP' | 'NOTE';

export interface Deal {
  id: DealId;
  tenantId: TenantId;
  customerId: CustomerId;
  name: string;
  description?: string;
  stage: DealStage;
  probability: number;
  value: number;
  currency: string;
  closeDate?: Date;
  ownerId: UserId;
  sourceType: DealSource;
  lostReason?: string;
  wonAt?: Date;
  lostAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  blockers?: DealBlocker[];
  activities?: DealActivity[];
  customer?: { id: CustomerId; name: string };
}

export interface DealBlocker {
  id: string;
  dealId: DealId;
  featureRequestId: FeatureRequestId;
  description?: string;
  impact: BlockerImpact;
  resolvedAt?: Date;
  createdAt: Date;
  featureRequest?: { id: FeatureRequestId; shortId: string; title: string };
}

export interface DealActivity {
  id: string;
  dealId: DealId;
  type: ActivityType;
  subject: string;
  description?: string;
  actorId: UserId;
  occurredAt: Date;
  duration?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateDealRequest {
  customerId: CustomerId;
  name: string;
  description?: string;
  value: number;
  currency?: string;
  closeDate?: Date;
  ownerId: UserId;
  sourceType?: DealSource;
  metadata?: Record<string, unknown>;
}

export interface UpdateDealRequest {
  name?: string;
  description?: string;
  stage?: DealStage;
  probability?: number;
  value?: number;
  closeDate?: Date;
  ownerId?: UserId;
  metadata?: Record<string, unknown>;
}

export interface CreateBlockerRequest {
  featureRequestId: FeatureRequestId;
  description?: string;
  impact?: BlockerImpact;
}

export interface CreateActivityRequest {
  type: ActivityType;
  subject: string;
  description?: string;
  actorId: UserId;
  occurredAt?: Date;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  byStage: Record<DealStage, { count: number; value: number }>;
  avgDealSize: number;
  avgSalesCycle: number;
  winRate: number;
  blockedDeals: number;
  blockedValue: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class DealService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // DEAL CRUD
  // ============================================================================

  async listDeals(
    tenantId: TenantId,
    options: PaginationOptions & {
      customerId?: CustomerId;
      stage?: DealStage;
      ownerId?: UserId;
      minValue?: number;
      hasBlockers?: boolean;
    } = {}
  ): Promise<PaginatedResult<Deal>> {
    const { limit = 20, offset = 0, customerId, stage, ownerId, minValue, hasBlockers } = options;

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;
    if (stage) where.stage = stage;
    if (ownerId) where.ownerId = ownerId;
    if (minValue !== undefined) where.value = { gte: minValue };

    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          blockers: {
            where: { resolvedAt: null },
            include: {
              featureRequest: { select: { id: true, shortId: true, title: true } },
            },
          },
          _count: { select: { activities: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    let filteredData = data;
    if (hasBlockers !== undefined) {
      filteredData = data.filter(d =>
        hasBlockers ? d.blockers.length > 0 : d.blockers.length === 0
      );
    }

    return {
      data: filteredData.map(this.mapToDeal),
      total,
      limit,
      offset,
    };
  }

  async getDeal(
    tenantId: TenantId,
    dealId: DealId
  ): Promise<Deal | null> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId },
      include: {
        customer: { select: { id: true, name: true } },
        blockers: {
          include: {
            featureRequest: { select: { id: true, shortId: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
        },
      },
    });

    return deal ? this.mapToDeal(deal) : null;
  }

  async createDeal(
    tenantId: TenantId,
    request: CreateDealRequest
  ): Promise<Deal> {
    const deal = await this.prisma.deal.create({
      data: {
        tenantId,
        customerId: request.customerId,
        name: request.name,
        description: request.description,
        stage: 'QUALIFICATION',
        probability: 10,
        value: request.value,
        currency: request.currency || 'USD',
        closeDate: request.closeDate,
        ownerId: request.ownerId,
        sourceType: request.sourceType || 'OUTBOUND',
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        customer: { select: { id: true, name: true } },
        blockers: true,
        activities: true,
      },
    });

    return this.mapToDeal(deal);
  }

  async updateDeal(
    tenantId: TenantId,
    dealId: DealId,
    request: UpdateDealRequest
  ): Promise<Deal | null> {
    const existing = await this.getDeal(tenantId, dealId);
    if (!existing) return null;

    // Update probability based on stage if not explicitly set
    let probability = request.probability;
    if (request.stage && probability === undefined) {
      probability = this.getStageProbability(request.stage);
    }

    const deal = await this.prisma.deal.update({
      where: { id: dealId as string },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.stage && { stage: request.stage }),
        ...(probability !== undefined && { probability }),
        ...(request.value !== undefined && { value: request.value }),
        ...(request.closeDate !== undefined && { closeDate: request.closeDate }),
        ...(request.ownerId && { ownerId: request.ownerId as string }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        blockers: true,
        activities: true,
      },
    });

    return this.mapToDeal(deal);
  }

  async advanceStage(
    tenantId: TenantId,
    dealId: DealId
  ): Promise<Deal | null> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) return null;

    const stageOrder: DealStage[] = [
      'QUALIFICATION',
      'DISCOVERY',
      'DEMO',
      'PROPOSAL',
      'NEGOTIATION',
      'CLOSED_WON',
    ];

    const currentIndex = stageOrder.indexOf(deal.stage);
    if (currentIndex < 0 || currentIndex >= stageOrder.length - 1) {
      return deal;
    }

    const nextStage = stageOrder[currentIndex + 1];
    return this.updateDeal(tenantId, dealId, { stage: nextStage });
  }

  async closeDeal(
    tenantId: TenantId,
    dealId: DealId,
    won: boolean,
    reason?: string
  ): Promise<Deal | null> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) return null;

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: won ? 'CLOSED_WON' : 'CLOSED_LOST',
        probability: won ? 100 : 0,
        ...(won && { wonAt: new Date() }),
        ...(!won && { lostAt: new Date(), lostReason: reason }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        blockers: true,
        activities: true,
      },
    });

    return this.mapToDeal(updated);
  }

  async deleteDeal(
    tenantId: TenantId,
    dealId: DealId
  ): Promise<boolean> {
    const existing = await this.getDeal(tenantId, dealId);
    if (!existing) return false;

    await this.prisma.deal.delete({
      where: { id: dealId },
    });

    return true;
  }

  // ============================================================================
  // BLOCKER OPERATIONS
  // ============================================================================

  async addBlocker(
    tenantId: TenantId,
    dealId: DealId,
    request: CreateBlockerRequest
  ): Promise<DealBlocker> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    const blocker = await this.prisma.dealBlocker.create({
      data: {
        dealId,
        featureRequestId: request.featureRequestId,
        description: request.description,
        impact: request.impact || 'MAJOR',
      },
      include: {
        featureRequest: { select: { id: true, shortId: true, title: true } },
      },
    });

    // Trigger recalculation of feature request metrics
    await this.recalculateFeatureBlockerValue(request.featureRequestId);

    return this.mapToBlocker(blocker);
  }

  async resolveBlocker(
    tenantId: TenantId,
    dealId: DealId,
    blockerId: string
  ): Promise<DealBlocker | null> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) return null;

    const existing = deal.blockers?.find(b => b.id === blockerId);
    if (!existing) return null;

    const blocker = await this.prisma.dealBlocker.update({
      where: { id: blockerId },
      data: { resolvedAt: new Date() },
      include: {
        featureRequest: { select: { id: true, shortId: true, title: true } },
      },
    });

    // Recalculate feature request metrics
    await this.recalculateFeatureBlockerValue(blocker.featureRequestId as FeatureRequestId);

    return this.mapToBlocker(blocker);
  }

  async removeBlocker(
    tenantId: TenantId,
    dealId: DealId,
    blockerId: string
  ): Promise<boolean> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) return false;

    const blocker = deal.blockers?.find(b => b.id === blockerId);
    if (!blocker) return false;

    await this.prisma.dealBlocker.delete({
      where: { id: blockerId },
    });

    await this.recalculateFeatureBlockerValue(blocker.featureRequestId);

    return true;
  }

  // ============================================================================
  // ACTIVITY OPERATIONS
  // ============================================================================

  async recordActivity(
    tenantId: TenantId,
    dealId: DealId,
    request: CreateActivityRequest
  ): Promise<DealActivity> {
    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    const activity = await this.prisma.dealActivity.create({
      data: {
        dealId: dealId as string,
        type: request.type,
        subject: request.subject,
        description: request.description,
        actorId: request.actorId as string,
        occurredAt: request.occurredAt || new Date(),
        duration: request.duration,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToActivity(activity);
  }

  async listActivities(
    tenantId: TenantId,
    dealId: DealId,
    options: PaginationOptions & { type?: ActivityType } = {}
  ): Promise<PaginatedResult<DealActivity>> {
    const { limit = 20, offset = 0, type } = options;

    const deal = await this.getDeal(tenantId, dealId);
    if (!deal) {
      return { data: [], total: 0, limit, offset };
    }

    const where: any = { dealId };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.dealActivity.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.dealActivity.count({ where }),
    ]);

    return {
      data: data.map(this.mapToActivity),
      total,
      limit,
      offset,
    };
  }

  // ============================================================================
  // PIPELINE ANALYTICS
  // ============================================================================

  async getPipelineMetrics(tenantId: TenantId): Promise<PipelineMetrics> {
    // Get all active deals
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      include: {
        blockers: { where: { resolvedAt: null } },
      },
    });

    // Calculate by stage
    const byStage: Record<DealStage, { count: number; value: number }> = {
      QUALIFICATION: { count: 0, value: 0 },
      DISCOVERY: { count: 0, value: 0 },
      DEMO: { count: 0, value: 0 },
      PROPOSAL: { count: 0, value: 0 },
      NEGOTIATION: { count: 0, value: 0 },
      CLOSED_WON: { count: 0, value: 0 },
      CLOSED_LOST: { count: 0, value: 0 },
    };

    let totalValue = 0;
    let blockedDeals = 0;
    let blockedValue = 0;

    deals.forEach(deal => {
      const value = Number(deal.value);
      byStage[deal.stage as DealStage].count++;
      byStage[deal.stage as DealStage].value += value;
      totalValue += value;

      if (deal.blockers.length > 0) {
        blockedDeals++;
        blockedValue += value;
      }
    });

    // Calculate win rate
    const closedDeals = await this.prisma.deal.count({
      where: {
        tenantId,
        stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
        OR: [{ wonAt: { not: null } }, { lostAt: { not: null } }],
      },
    });

    const wonDeals = await this.prisma.deal.count({
      where: { tenantId, stage: 'CLOSED_WON' },
    });

    const winRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0;

    // Calculate average sales cycle (for won deals)
    const wonDealsCycle = await this.prisma.deal.findMany({
      where: { tenantId, stage: 'CLOSED_WON', wonAt: { not: null } },
      select: { createdAt: true, wonAt: true },
    });

    let avgSalesCycle = 0;
    if (wonDealsCycle.length > 0) {
      const totalDays = wonDealsCycle.reduce((sum, deal) => {
        const days = Math.ceil(
          (deal.wonAt!.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgSalesCycle = totalDays / wonDealsCycle.length;
    }

    return {
      totalDeals: deals.length,
      totalValue,
      byStage,
      avgDealSize: deals.length > 0 ? totalValue / deals.length : 0,
      avgSalesCycle,
      winRate,
      blockedDeals,
      blockedValue,
    };
  }

  async getDealsByBlocker(
    tenantId: TenantId,
    featureRequestId: FeatureRequestId
  ): Promise<Deal[]> {
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        blockers: {
          some: {
            featureRequestId,
            resolvedAt: null,
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        blockers: {
          where: { featureRequestId },
        },
      },
    });

    return deals.map(this.mapToDeal);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getStageProbability(stage: DealStage): number {
    const probabilities: Record<DealStage, number> = {
      QUALIFICATION: 10,
      DISCOVERY: 20,
      DEMO: 40,
      PROPOSAL: 60,
      NEGOTIATION: 80,
      CLOSED_WON: 100,
      CLOSED_LOST: 0,
    };
    return probabilities[stage];
  }

  private async recalculateFeatureBlockerValue(
    featureRequestId: FeatureRequestId
  ): Promise<void> {
    const blockers = await this.prisma.dealBlocker.findMany({
      where: { featureRequestId, resolvedAt: null },
      include: { deal: { select: { value: true } } },
    });

    const totalBlockerValue = blockers.reduce(
      (sum, b) => sum + Number(b.deal.value),
      0
    );

    await this.prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { dealBlockerValue: totalBlockerValue },
    });
  }

  private mapToDeal = (record: any): Deal => {
    return {
      id: record.id as DealId,
      tenantId: record.tenantId as TenantId,
      customerId: record.customerId as CustomerId,
      name: record.name,
      description: record.description,
      stage: record.stage as DealStage,
      probability: record.probability,
      value: Number(record.value),
      currency: record.currency,
      closeDate: record.closeDate,
      ownerId: record.ownerId as UserId,
      sourceType: record.sourceType as DealSource,
      lostReason: record.lostReason,
      wonAt: record.wonAt,
      lostAt: record.lostAt,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      blockers: record.blockers?.map(this.mapToBlocker),
      activities: record.activities?.map(this.mapToActivity),
      customer: record.customer,
    };
  };

  private mapToBlocker = (record: any): DealBlocker => {
    return {
      id: record.id,
      dealId: record.dealId as DealId,
      featureRequestId: record.featureRequestId as FeatureRequestId,
      description: record.description,
      impact: record.impact as BlockerImpact,
      resolvedAt: record.resolvedAt,
      createdAt: record.createdAt,
      featureRequest: record.featureRequest,
    };
  };

  private mapToActivity = (record: any): DealActivity => {
    return {
      id: record.id,
      dealId: record.dealId as DealId,
      type: record.type as ActivityType,
      subject: record.subject,
      description: record.description,
      actorId: record.actorId as UserId,
      occurredAt: record.occurredAt,
      duration: record.duration,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
    };
  };
}
