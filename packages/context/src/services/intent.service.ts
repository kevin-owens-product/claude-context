/**
 * IntentService - Manages intents (the "why" of Living Software)
 *
 * Intents are desired state changes in the world. This service tracks:
 * - What outcomes we're trying to achieve
 * - How confident we are they matter
 * - How well they're being fulfilled
 * - Who cares about them
 *
 * @prompt-id forge-v4.1:service:intent:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type Redis from 'ioredis';

// Branded types for type safety
export type IntentId = string & { readonly __brand: 'IntentId' };
export type TenantId = string & { readonly __brand: 'TenantId' };

// Enums matching Prisma schema
export type IntentPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'EXPLORATORY';
export type IntentStatus = 'HYPOTHESIZED' | 'VALIDATED' | 'ACTIVE' | 'FULFILLED' | 'ABANDONED' | 'SUPERSEDED';

// Types
export interface IntentEvidence {
  type: 'user_research' | 'analytics' | 'feedback' | 'experiment' | 'market_data' | 'business_case';
  description: string;
  confidence: number;
  source?: string;
  date?: string;
}

export interface IntentSuccessCriterion {
  description: string;
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  isMet: boolean;
}

export interface BusinessValue {
  estimatedRevenue?: number;
  estimatedCostSaving?: number;
  estimatedTimeSaving?: number;
  strategicImportance?: 'critical' | 'high' | 'medium' | 'low';
  customerImpact?: number; // Number of customers affected
  revenueAtRisk?: number;
}

export interface CreateIntentInput {
  tenantId: TenantId;
  projectId?: string;
  title: string;
  description: string;
  desiredState: string;
  successCriteria?: IntentSuccessCriterion[];
  antiPatterns?: string[];
  evidence?: IntentEvidence[];
  priority?: IntentPriority;
  parentIntentId?: IntentId;
  primaryStakeholder?: string;
  affectedPersonas?: string[];
  businessValue?: BusinessValue;
  createdById?: string;
}

export interface UpdateIntentInput {
  title?: string;
  description?: string;
  desiredState?: string;
  successCriteria?: IntentSuccessCriterion[];
  antiPatterns?: string[];
  evidence?: IntentEvidence[];
  priority?: IntentPriority;
  status?: IntentStatus;
  confidenceScore?: number;
  primaryStakeholder?: string;
  affectedPersonas?: string[];
  businessValue?: BusinessValue;
}

export interface IntentFilter {
  status?: IntentStatus | IntentStatus[];
  priority?: IntentPriority | IntentPriority[];
  projectId?: string;
  parentIntentId?: IntentId | null;
  minFulfillmentScore?: number;
  maxFulfillmentScore?: number;
  minConfidenceScore?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

export interface IntentHierarchy {
  intent: Intent;
  children: IntentHierarchy[];
  fulfillmentScore: number;
  totalDescendants: number;
}

export interface Intent {
  id: IntentId;
  tenantId: TenantId;
  projectId: string | null;
  shortId: string;
  title: string;
  description: string;
  desiredState: string;
  successCriteria: IntentSuccessCriterion[];
  antiPatterns: string[];
  evidence: IntentEvidence[];
  confidenceScore: number;
  fulfillmentScore: number;
  parentIntentId: IntentId | null;
  priority: IntentPriority;
  status: IntentStatus;
  primaryStakeholder: string | null;
  affectedPersonas: string[];
  businessValue: BusinessValue | null;
  validatedAt: Date | null;
  fulfilledAt: Date | null;
  abandonedAt: Date | null;
  createdById: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class IntentService {
  private shortIdCounter = 0;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Create a new intent
   */
  async createIntent(input: CreateIntentInput): Promise<Intent> {
    const shortId = await this.generateShortId(input.tenantId);

    const intent = await this.prisma.intent.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        shortId,
        title: input.title,
        description: input.description,
        desiredState: input.desiredState,
        successCriteria: (input.successCriteria || []) as unknown as Prisma.JsonArray,
        antiPatterns: (input.antiPatterns || []) as unknown as Prisma.JsonArray,
        evidence: (input.evidence || []) as unknown as Prisma.JsonArray,
        priority: input.priority || 'MEDIUM',
        status: 'HYPOTHESIZED',
        parentIntentId: input.parentIntentId,
        primaryStakeholder: input.primaryStakeholder,
        affectedPersonas: (input.affectedPersonas || []) as unknown as Prisma.JsonArray,
        businessValue: input.businessValue as unknown as Prisma.JsonObject,
        confidenceScore: this.calculateInitialConfidence(input.evidence || []),
        createdById: input.createdById,
      },
    });

    await this.invalidateCache(input.tenantId);

    return this.mapToIntent(intent);
  }

  /**
   * Get an intent by ID
   */
  async getIntent(tenantId: TenantId, intentId: IntentId): Promise<Intent | null> {
    const intent = await this.prisma.intent.findFirst({
      where: {
        id: intentId,
        tenantId,
      },
    });

    return intent ? this.mapToIntent(intent) : null;
  }

  /**
   * List intents with filtering
   */
  async listIntents(
    tenantId: TenantId,
    filter?: IntentFilter,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Intent[]; total: number }> {
    const where: Prisma.IntentWhereInput = {
      tenantId,
      ...(filter?.status && {
        status: Array.isArray(filter.status) ? { in: filter.status } : filter.status,
      }),
      ...(filter?.priority && {
        priority: Array.isArray(filter.priority) ? { in: filter.priority } : filter.priority,
      }),
      ...(filter?.projectId && { projectId: filter.projectId }),
      ...(filter?.parentIntentId !== undefined && {
        parentIntentId: filter.parentIntentId,
      }),
      ...(filter?.minFulfillmentScore !== undefined && {
        fulfillmentScore: { gte: filter.minFulfillmentScore },
      }),
      ...(filter?.maxFulfillmentScore !== undefined && {
        fulfillmentScore: { lte: filter.maxFulfillmentScore },
      }),
      ...(filter?.minConfidenceScore !== undefined && {
        confidenceScore: { gte: filter.minConfidenceScore },
      }),
      ...(filter?.createdAfter && { createdAt: { gte: filter.createdAfter } }),
      ...(filter?.createdBefore && { createdAt: { lte: filter.createdBefore } }),
      ...(filter?.search && {
        OR: [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { shortId: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [intents, total] = await Promise.all([
      this.prisma.intent.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { fulfillmentScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: pagination?.limit || 50,
        skip: pagination?.offset || 0,
      }),
      this.prisma.intent.count({ where }),
    ]);

    return {
      data: intents.map(i => this.mapToIntent(i)),
      total,
    };
  }

  /**
   * Update an intent
   */
  async updateIntent(
    tenantId: TenantId,
    intentId: IntentId,
    input: UpdateIntentInput,
  ): Promise<Intent> {
    const existing = await this.getIntent(tenantId, intentId);
    if (!existing) {
      throw new Error(`Intent ${intentId} not found`);
    }

    // Determine status transitions
    let statusUpdate: Partial<{ validatedAt: Date; fulfilledAt: Date; abandonedAt: Date }> = {};

    if (input.status) {
      if (input.status === 'VALIDATED' && existing.status === 'HYPOTHESIZED') {
        statusUpdate.validatedAt = new Date();
      } else if (input.status === 'FULFILLED' && existing.status !== 'FULFILLED') {
        statusUpdate.fulfilledAt = new Date();
      } else if (input.status === 'ABANDONED' && existing.status !== 'ABANDONED') {
        statusUpdate.abandonedAt = new Date();
      }
    }

    // Recalculate confidence if evidence changed
    let confidenceScore = input.confidenceScore;
    if (input.evidence && confidenceScore === undefined) {
      confidenceScore = this.calculateConfidenceFromEvidence(input.evidence);
    }

    const intent = await this.prisma.intent.update({
      where: { id: intentId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.desiredState && { desiredState: input.desiredState }),
        ...(input.successCriteria && { successCriteria: input.successCriteria as unknown as Prisma.JsonArray }),
        ...(input.antiPatterns && { antiPatterns: input.antiPatterns as unknown as Prisma.JsonArray }),
        ...(input.evidence && { evidence: input.evidence as unknown as Prisma.JsonArray }),
        ...(input.priority && { priority: input.priority }),
        ...(input.status && { status: input.status }),
        ...(confidenceScore !== undefined && { confidenceScore }),
        ...(input.primaryStakeholder !== undefined && { primaryStakeholder: input.primaryStakeholder }),
        ...(input.affectedPersonas && { affectedPersonas: input.affectedPersonas as unknown as Prisma.JsonArray }),
        ...(input.businessValue && { businessValue: input.businessValue as unknown as Prisma.JsonObject }),
        ...statusUpdate,
      },
    });

    await this.invalidateCache(tenantId);

    return this.mapToIntent(intent);
  }

  /**
   * Update fulfillment score based on signals
   * This is called by the SignalService when signals are updated
   */
  async updateFulfillmentScore(
    tenantId: TenantId,
    intentId: IntentId,
    signalScores: { signalId: string; value: number; weight: number }[],
  ): Promise<Intent> {
    // Calculate weighted average of signal scores
    const totalWeight = signalScores.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = signalScores.reduce((sum, s) => sum + s.value * s.weight, 0);
    const fulfillmentScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Check if we should auto-transition to FULFILLED
    const intent = await this.getIntent(tenantId, intentId);
    let statusUpdate: { status?: IntentStatus; fulfilledAt?: Date } = {};

    if (intent && fulfillmentScore >= 0.9 && intent.status === 'ACTIVE') {
      statusUpdate = {
        status: 'FULFILLED',
        fulfilledAt: new Date(),
      };
    }

    const updated = await this.prisma.intent.update({
      where: { id: intentId },
      data: {
        fulfillmentScore,
        ...statusUpdate,
      },
    });

    await this.invalidateCache(tenantId);

    return this.mapToIntent(updated);
  }

  /**
   * Get intent hierarchy (tree structure)
   */
  async getIntentHierarchy(
    tenantId: TenantId,
    rootIntentId?: IntentId,
  ): Promise<IntentHierarchy[]> {
    const allIntents = await this.prisma.intent.findMany({
      where: { tenantId },
      orderBy: { priority: 'asc' },
    });

    const intentMap = new Map(allIntents.map(i => [i.id, this.mapToIntent(i)]));

    const buildTree = (parentId: IntentId | null): IntentHierarchy[] => {
      const children = allIntents.filter(i => i.parentIntentId === parentId);

      return children.map(child => {
        const childTree = buildTree(child.id as IntentId);
        const intent = intentMap.get(child.id)!;

        // Calculate aggregate fulfillment including children
        const childScores = childTree.map(c => c.fulfillmentScore);
        const avgChildScore = childScores.length > 0
          ? childScores.reduce((a, b) => a + b, 0) / childScores.length
          : 0;

        const fulfillmentScore = childTree.length > 0
          ? (intent.fulfillmentScore + avgChildScore) / 2
          : intent.fulfillmentScore;

        return {
          intent,
          children: childTree,
          fulfillmentScore,
          totalDescendants: childTree.reduce((sum, c) => sum + 1 + c.totalDescendants, 0),
        };
      });
    };

    return buildTree(rootIntentId || null);
  }

  /**
   * Add evidence to an intent
   */
  async addEvidence(
    tenantId: TenantId,
    intentId: IntentId,
    evidence: IntentEvidence,
  ): Promise<Intent> {
    const intent = await this.getIntent(tenantId, intentId);
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }

    const updatedEvidence = [...intent.evidence, evidence];
    const confidenceScore = this.calculateConfidenceFromEvidence(updatedEvidence);

    // Auto-transition to VALIDATED if confidence is high enough
    let statusUpdate: { status?: IntentStatus; validatedAt?: Date } = {};
    if (confidenceScore >= 0.7 && intent.status === 'HYPOTHESIZED') {
      statusUpdate = {
        status: 'VALIDATED',
        validatedAt: new Date(),
      };
    }

    const updated = await this.prisma.intent.update({
      where: { id: intentId },
      data: {
        evidence: updatedEvidence as unknown as Prisma.JsonArray,
        confidenceScore,
        ...statusUpdate,
      },
    });

    await this.invalidateCache(tenantId);

    return this.mapToIntent(updated);
  }

  /**
   * Get intents by capability
   * Returns intents that a capability serves
   */
  async getIntentsByCapability(
    tenantId: TenantId,
    capabilityId: string,
  ): Promise<Intent[]> {
    const capabilities = await this.prisma.capability.findMany({
      where: {
        tenantId,
        id: capabilityId,
        intentId: { not: null },
      },
    });

    const intentIds = capabilities
      .map(c => c.intentId)
      .filter((id): id is string => id !== null);

    if (intentIds.length === 0) {
      return [];
    }

    const intents = await this.prisma.intent.findMany({
      where: {
        tenantId,
        id: { in: intentIds },
      },
    });

    return intents.map(i => this.mapToIntent(i));
  }

  /**
   * Get fulfillment summary for dashboard
   */
  async getFulfillmentSummary(tenantId: TenantId, projectId?: string): Promise<{
    total: number;
    byStatus: Record<IntentStatus, number>;
    avgFulfillment: number;
    avgConfidence: number;
    atRisk: number;
    recentlyFulfilled: number;
  }> {
    const where: Prisma.IntentWhereInput = {
      tenantId,
      ...(projectId && { projectId }),
    };

    const intents = await this.prisma.intent.findMany({ where });

    const byStatus = intents.reduce((acc, i) => {
      acc[i.status as IntentStatus] = (acc[i.status as IntentStatus] || 0) + 1;
      return acc;
    }, {} as Record<IntentStatus, number>);

    const activeIntents = intents.filter(i => i.status === 'ACTIVE');
    const avgFulfillment = activeIntents.length > 0
      ? activeIntents.reduce((sum, i) => sum + i.fulfillmentScore, 0) / activeIntents.length
      : 0;

    const avgConfidence = intents.length > 0
      ? intents.reduce((sum, i) => sum + i.confidenceScore, 0) / intents.length
      : 0;

    const atRisk = activeIntents.filter(i => i.fulfillmentScore < 0.3).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentlyFulfilled = intents.filter(
      i => i.status === 'FULFILLED' && i.fulfilledAt && i.fulfilledAt > oneWeekAgo
    ).length;

    return {
      total: intents.length,
      byStatus,
      avgFulfillment,
      avgConfidence,
      atRisk,
      recentlyFulfilled,
    };
  }

  // Private helpers

  private async generateShortId(tenantId: TenantId): Promise<string> {
    const count = await this.prisma.intent.count({ where: { tenantId } });
    return `INT-${String(count + 1).padStart(4, '0')}`;
  }

  private calculateInitialConfidence(evidence: IntentEvidence[]): number {
    if (evidence.length === 0) return 0.3; // Base confidence without evidence
    return this.calculateConfidenceFromEvidence(evidence);
  }

  private calculateConfidenceFromEvidence(evidence: IntentEvidence[]): number {
    if (evidence.length === 0) return 0.3;

    // Weight different evidence types
    const typeWeights: Record<IntentEvidence['type'], number> = {
      user_research: 1.0,
      analytics: 0.9,
      feedback: 0.7,
      experiment: 1.0,
      market_data: 0.6,
      business_case: 0.5,
    };

    const weightedSum = evidence.reduce((sum, e) => {
      const weight = typeWeights[e.type] || 0.5;
      return sum + e.confidence * weight;
    }, 0);

    const totalWeight = evidence.reduce((sum, e) => {
      return sum + (typeWeights[e.type] || 0.5);
    }, 0);

    // Base confidence + evidence confidence, capped at 0.95
    const evidenceConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return Math.min(0.95, 0.3 + evidenceConfidence * 0.65);
  }

  private async invalidateCache(tenantId: TenantId): Promise<void> {
    const pattern = `intent:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private mapToIntent(prismaIntent: {
    id: string;
    tenantId: string;
    projectId: string | null;
    shortId: string;
    title: string;
    description: string;
    desiredState: string;
    successCriteria: Prisma.JsonValue;
    antiPatterns: Prisma.JsonValue;
    evidence: Prisma.JsonValue;
    confidenceScore: number;
    fulfillmentScore: number;
    parentIntentId: string | null;
    priority: string;
    status: string;
    primaryStakeholder: string | null;
    affectedPersonas: Prisma.JsonValue;
    businessValue: Prisma.JsonValue;
    validatedAt: Date | null;
    fulfilledAt: Date | null;
    abandonedAt: Date | null;
    createdById: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): Intent {
    return {
      id: prismaIntent.id as IntentId,
      tenantId: prismaIntent.tenantId as TenantId,
      projectId: prismaIntent.projectId,
      shortId: prismaIntent.shortId,
      title: prismaIntent.title,
      description: prismaIntent.description,
      desiredState: prismaIntent.desiredState,
      successCriteria: (prismaIntent.successCriteria || []) as unknown as IntentSuccessCriterion[],
      antiPatterns: (prismaIntent.antiPatterns || []) as unknown as string[],
      evidence: (prismaIntent.evidence || []) as unknown as IntentEvidence[],
      confidenceScore: prismaIntent.confidenceScore,
      fulfillmentScore: prismaIntent.fulfillmentScore,
      parentIntentId: prismaIntent.parentIntentId as IntentId | null,
      priority: prismaIntent.priority as IntentPriority,
      status: prismaIntent.status as IntentStatus,
      primaryStakeholder: prismaIntent.primaryStakeholder,
      affectedPersonas: prismaIntent.affectedPersonas as string[],
      businessValue: prismaIntent.businessValue as BusinessValue | null,
      validatedAt: prismaIntent.validatedAt,
      fulfilledAt: prismaIntent.fulfilledAt,
      abandonedAt: prismaIntent.abandonedAt,
      createdById: prismaIntent.createdById,
      metadata: prismaIntent.metadata as Record<string, unknown>,
      createdAt: prismaIntent.createdAt,
      updatedAt: prismaIntent.updatedAt,
    };
  }
}

export default IntentService;
