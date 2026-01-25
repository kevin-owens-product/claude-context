/**
 * Revenue Attribution Service - Tracks revenue events and attribution to development work
 * @prompt-id forge-v4.1:service:revenue-attribution:001
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

export type RevenueEventId = string & { __brand: 'RevenueEventId' };

export type RevenueEventType = 'NEW_BUSINESS' | 'EXPANSION' | 'RENEWAL' | 'CONTRACTION' | 'CHURN' | 'REACTIVATION';
export type RecurringType = 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
export type AttributionMethod = 'manual' | 'rule_based' | 'ml_model' | 'time_decay' | 'first_touch' | 'last_touch';

export interface RevenueEvent {
  id: RevenueEventId;
  tenantId: TenantId;
  customerId: CustomerId;
  type: RevenueEventType;
  amount: number;
  currency: string;
  recurringType: RecurringType;
  occurredAt: Date;
  attributedSliceIds: string[];
  attributedArtifactIds: string[];
  attributedFeatureIds: string[];
  attributionConfidence: number;
  attributionMethod: AttributionMethod;
  relatedDealId?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateRevenueEventRequest {
  customerId: CustomerId;
  type: RevenueEventType;
  amount: number;
  currency?: string;
  recurringType?: RecurringType;
  occurredAt?: Date;
  relatedDealId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Attribution {
  sliceIds: string[];
  artifactIds: string[];
  featureIds: string[];
  confidence: number;
  method: AttributionMethod;
}

export interface RevenueMetrics {
  totalRevenue: number;
  byType: Record<RevenueEventType, number>;
  newBusinessRevenue: number;
  expansionRevenue: number;
  churnRevenue: number;
  netRevenue: number;
  mrrChange: number;
  arrChange: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SliceROI {
  sliceId: string;
  sliceName?: string;
  attributedRevenue: number;
  eventCount: number;
  avgConfidence: number;
  topRevenueType: RevenueEventType;
}

export interface FeatureROI {
  featureId: string;
  featureTitle?: string;
  attributedRevenue: number;
  eventCount: number;
  avgConfidence: number;
  customerCount: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class RevenueAttributionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // REVENUE EVENT CRUD
  // ============================================================================

  async listRevenueEvents(
    tenantId: TenantId,
    options: PaginationOptions & {
      customerId?: CustomerId;
      type?: RevenueEventType;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
    } = {}
  ): Promise<PaginatedResult<RevenueEvent>> {
    const { limit = 20, offset = 0, customerId, type, startDate, endDate, minAmount } = options;

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;
    if (type) where.type = type;
    if (minAmount !== undefined) where.amount = { gte: minAmount };
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.revenueEvent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.revenueEvent.count({ where }),
    ]);

    return {
      data: data.map(this.mapToRevenueEvent),
      total,
      limit,
      offset,
    };
  }

  async getRevenueEvent(
    tenantId: TenantId,
    eventId: RevenueEventId
  ): Promise<RevenueEvent | null> {
    const event = await this.prisma.revenueEvent.findFirst({
      where: { id: eventId, tenantId },
    });

    return event ? this.mapToRevenueEvent(event) : null;
  }

  async createRevenueEvent(
    tenantId: TenantId,
    request: CreateRevenueEventRequest
  ): Promise<RevenueEvent> {
    // Auto-attribute based on recent customer activity
    const attribution = await this.calculateAttribution(
      tenantId,
      request.customerId,
      request.occurredAt || new Date()
    );

    const event = await this.prisma.revenueEvent.create({
      data: {
        tenantId,
        customerId: request.customerId,
        type: request.type,
        amount: request.amount,
        currency: request.currency || 'USD',
        recurringType: request.recurringType || 'ONE_TIME',
        occurredAt: request.occurredAt || new Date(),
        attributedSliceIds: attribution.sliceIds,
        attributedArtifactIds: attribution.artifactIds,
        attributedFeatureIds: attribution.featureIds,
        attributionConfidence: attribution.confidence,
        attributionMethod: attribution.method,
        relatedDealId: request.relatedDealId as string | undefined,
        description: request.description,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToRevenueEvent(event);
  }

  async updateAttribution(
    tenantId: TenantId,
    eventId: RevenueEventId,
    attribution: Partial<Attribution>
  ): Promise<RevenueEvent | null> {
    const existing = await this.getRevenueEvent(tenantId, eventId);
    if (!existing) return null;

    const event = await this.prisma.revenueEvent.update({
      where: { id: eventId },
      data: {
        ...(attribution.sliceIds && { attributedSliceIds: attribution.sliceIds }),
        ...(attribution.artifactIds && { attributedArtifactIds: attribution.artifactIds }),
        ...(attribution.featureIds && { attributedFeatureIds: attribution.featureIds }),
        ...(attribution.confidence !== undefined && { attributionConfidence: attribution.confidence }),
        ...(attribution.method && { attributionMethod: attribution.method }),
      },
    });

    return this.mapToRevenueEvent(event);
  }

  async deleteRevenueEvent(
    tenantId: TenantId,
    eventId: RevenueEventId
  ): Promise<boolean> {
    const existing = await this.getRevenueEvent(tenantId, eventId);
    if (!existing) return false;

    await this.prisma.revenueEvent.delete({
      where: { id: eventId },
    });

    return true;
  }

  // ============================================================================
  // ATTRIBUTION CALCULATION
  // ============================================================================

  async calculateAttribution(
    tenantId: TenantId,
    customerId: CustomerId,
    occurredAt: Date
  ): Promise<Attribution> {
    // Look back 90 days for relevant activity
    const lookbackDate = new Date(occurredAt);
    lookbackDate.setDate(lookbackDate.getDate() - 90);

    // Get customer's feature votes in the period
    const votes = await this.prisma.featureVote.findMany({
      where: {
        customerId,
        createdAt: { gte: lookbackDate, lte: occurredAt },
      },
      select: { featureRequestId: true },
    });

    // Get feature requests that were released in the period
    const releasedFeatures = await this.prisma.featureRequest.findMany({
      where: {
        tenantId,
        status: 'RELEASED',
        updatedAt: { gte: lookbackDate, lte: occurredAt },
        OR: [
          { id: { in: votes.map(v => v.featureRequestId) } },
          { voteCount: { gte: 5 } }, // Features with significant demand
        ],
      },
      select: {
        id: true,
        linkedSliceIds: true,
        linkedArtifactIds: true,
      },
    });

    // Aggregate attribution
    const sliceIds = new Set<string>();
    const artifactIds = new Set<string>();
    const featureIds = new Set<string>();

    releasedFeatures.forEach(feature => {
      featureIds.add(feature.id);
      (feature.linkedSliceIds as string[]).forEach(id => sliceIds.add(id));
      (feature.linkedArtifactIds as string[]).forEach(id => artifactIds.add(id));
    });

    // Calculate confidence based on strength of signal
    let confidence = 0.3; // Base confidence
    if (votes.length > 0) confidence += 0.2; // Customer voted for features
    if (releasedFeatures.length > 0) confidence += 0.2; // Features were released
    if (releasedFeatures.some(f => votes.some(v => v.featureRequestId === f.id))) {
      confidence += 0.2; // Customer voted for released features
    }
    confidence = Math.min(1, confidence);

    return {
      sliceIds: Array.from(sliceIds),
      artifactIds: Array.from(artifactIds),
      featureIds: Array.from(featureIds),
      confidence,
      method: 'rule_based' as AttributionMethod,
    };
  }

  async reattributeAllEvents(
    tenantId: TenantId,
    method: AttributionMethod = 'rule_based'
  ): Promise<number> {
    const events = await this.prisma.revenueEvent.findMany({
      where: { tenantId },
      select: { id: true, customerId: true, occurredAt: true },
    });

    let updated = 0;
    for (const event of events) {
      const attribution = await this.calculateAttribution(
        tenantId,
        event.customerId as CustomerId,
        event.occurredAt
      );
      attribution.method = method;

      await this.updateAttribution(
        tenantId,
        event.id as RevenueEventId,
        attribution
      );
      updated++;
    }

    return updated;
  }

  // ============================================================================
  // REVENUE METRICS
  // ============================================================================

  async getRevenueMetrics(
    tenantId: TenantId,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueMetrics> {
    const events = await this.prisma.revenueEvent.findMany({
      where: {
        tenantId,
        occurredAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const byType: Record<RevenueEventType, number> = {
      NEW_BUSINESS: 0,
      EXPANSION: 0,
      RENEWAL: 0,
      CONTRACTION: 0,
      CHURN: 0,
      REACTIVATION: 0,
    };

    let totalRevenue = 0;
    let mrrChange = 0;
    let arrChange = 0;

    events.forEach(event => {
      const amount = Number(event.amount);
      byType[event.type as RevenueEventType] += amount;

      if (['NEW_BUSINESS', 'EXPANSION', 'REACTIVATION'].includes(event.type)) {
        totalRevenue += amount;
        if (event.recurringType === 'MONTHLY') mrrChange += amount;
        if (event.recurringType === 'ANNUAL') arrChange += amount;
      } else if (['CONTRACTION', 'CHURN'].includes(event.type)) {
        totalRevenue -= amount;
        if (event.recurringType === 'MONTHLY') mrrChange -= amount;
        if (event.recurringType === 'ANNUAL') arrChange -= amount;
      }
    });

    return {
      totalRevenue,
      byType,
      newBusinessRevenue: byType.NEW_BUSINESS,
      expansionRevenue: byType.EXPANSION,
      churnRevenue: byType.CHURN,
      netRevenue: byType.NEW_BUSINESS + byType.EXPANSION + byType.REACTIVATION - byType.CONTRACTION - byType.CHURN,
      mrrChange,
      arrChange,
      periodStart,
      periodEnd,
    };
  }

  // ============================================================================
  // ROI ANALYSIS
  // ============================================================================

  async getSliceROI(
    tenantId: TenantId,
    sliceId?: string,
    options: { periodStart?: Date; periodEnd?: Date } = {}
  ): Promise<SliceROI[]> {
    const where: any = { tenantId };
    if (options.periodStart || options.periodEnd) {
      where.occurredAt = {};
      if (options.periodStart) where.occurredAt.gte = options.periodStart;
      if (options.periodEnd) where.occurredAt.lte = options.periodEnd;
    }

    const events = await this.prisma.revenueEvent.findMany({
      where,
    });

    // Aggregate by slice
    const sliceMap: Map<string, {
      revenue: number;
      count: number;
      totalConfidence: number;
      types: Map<RevenueEventType, number>;
    }> = new Map();

    events.forEach(event => {
      const sliceIds = event.attributedSliceIds as string[];
      if (sliceId && !sliceIds.includes(sliceId)) return;

      const amount = Number(event.amount);
      const splitAmount = sliceIds.length > 0 ? amount / sliceIds.length : 0;

      sliceIds.forEach(id => {
        if (sliceId && id !== sliceId) return;

        if (!sliceMap.has(id)) {
          sliceMap.set(id, {
            revenue: 0,
            count: 0,
            totalConfidence: 0,
            types: new Map(),
          });
        }

        const data = sliceMap.get(id)!;
        data.revenue += splitAmount;
        data.count++;
        data.totalConfidence += event.attributionConfidence;

        const typeCount = data.types.get(event.type as RevenueEventType) || 0;
        data.types.set(event.type as RevenueEventType, typeCount + splitAmount);
      });
    });

    // Convert to array and sort by revenue
    const results: SliceROI[] = [];
    for (const [id, data] of sliceMap.entries()) {
      let topType: RevenueEventType = 'NEW_BUSINESS';
      let topAmount = 0;
      for (const [type, amount] of data.types.entries()) {
        if (amount > topAmount) {
          topAmount = amount;
          topType = type;
        }
      }

      results.push({
        sliceId: id,
        attributedRevenue: data.revenue,
        eventCount: data.count,
        avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
        topRevenueType: topType,
      });
    }

    return results.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  async getFeatureROI(
    tenantId: TenantId,
    featureId?: string,
    options: { periodStart?: Date; periodEnd?: Date } = {}
  ): Promise<FeatureROI[]> {
    const where: any = { tenantId };
    if (options.periodStart || options.periodEnd) {
      where.occurredAt = {};
      if (options.periodStart) where.occurredAt.gte = options.periodStart;
      if (options.periodEnd) where.occurredAt.lte = options.periodEnd;
    }

    const events = await this.prisma.revenueEvent.findMany({
      where,
    });

    // Aggregate by feature
    const featureMap: Map<string, {
      revenue: number;
      count: number;
      totalConfidence: number;
      customers: Set<string>;
    }> = new Map();

    events.forEach(event => {
      const featureIds = event.attributedFeatureIds as string[];
      if (featureId && !featureIds.includes(featureId)) return;

      const amount = Number(event.amount);
      const splitAmount = featureIds.length > 0 ? amount / featureIds.length : 0;

      featureIds.forEach(id => {
        if (featureId && id !== featureId) return;

        if (!featureMap.has(id)) {
          featureMap.set(id, {
            revenue: 0,
            count: 0,
            totalConfidence: 0,
            customers: new Set(),
          });
        }

        const data = featureMap.get(id)!;
        data.revenue += splitAmount;
        data.count++;
        data.totalConfidence += event.attributionConfidence;
        data.customers.add(event.customerId);
      });
    });

    // Convert to array and sort by revenue
    const results: FeatureROI[] = [];
    for (const [id, data] of featureMap.entries()) {
      results.push({
        featureId: id,
        attributedRevenue: data.revenue,
        eventCount: data.count,
        avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
        customerCount: data.customers.size,
      });
    }

    return results.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  async getCustomerLifetimeValue(
    tenantId: TenantId,
    customerId: CustomerId
  ): Promise<{
    totalRevenue: number;
    netRevenue: number;
    eventCount: number;
    firstEvent: Date | null;
    lastEvent: Date | null;
    monthsActive: number;
    avgMonthlyRevenue: number;
  }> {
    const events = await this.prisma.revenueEvent.findMany({
      where: { tenantId, customerId },
      orderBy: { occurredAt: 'asc' },
    });

    let totalRevenue = 0;
    let netRevenue = 0;

    events.forEach(event => {
      const amount = Number(event.amount);
      totalRevenue += amount;

      if (['NEW_BUSINESS', 'EXPANSION', 'RENEWAL', 'REACTIVATION'].includes(event.type)) {
        netRevenue += amount;
      } else {
        netRevenue -= amount;
      }
    });

    const firstEvent = events.length > 0 ? events[0].occurredAt : null;
    const lastEvent = events.length > 0 ? events[events.length - 1].occurredAt : null;

    let monthsActive = 0;
    if (firstEvent && lastEvent) {
      monthsActive = Math.ceil(
        (lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      monthsActive = Math.max(1, monthsActive);
    }

    return {
      totalRevenue,
      netRevenue,
      eventCount: events.length,
      firstEvent,
      lastEvent,
      monthsActive,
      avgMonthlyRevenue: monthsActive > 0 ? netRevenue / monthsActive : 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToRevenueEvent = (record: any): RevenueEvent => {
    return {
      id: record.id as RevenueEventId,
      tenantId: record.tenantId as TenantId,
      customerId: record.customerId as CustomerId,
      type: record.type as RevenueEventType,
      amount: Number(record.amount),
      currency: record.currency,
      recurringType: record.recurringType as RecurringType,
      occurredAt: record.occurredAt,
      attributedSliceIds: record.attributedSliceIds || [],
      attributedArtifactIds: record.attributedArtifactIds || [],
      attributedFeatureIds: record.attributedFeatureIds || [],
      attributionConfidence: record.attributionConfidence,
      attributionMethod: record.attributionMethod as AttributionMethod,
      relatedDealId: record.relatedDealId,
      description: record.description,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
    };
  };
}
