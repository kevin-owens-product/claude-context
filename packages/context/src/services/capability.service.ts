/**
 * CapabilityService - Tracks what the system can do
 *
 * Capabilities are the bridge between intents and artifacts.
 * They represent what the system can DO to fulfill intents,
 * and they measure their own effectiveness.
 *
 * @prompt-id forge-v4.1:service:capability:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type Redis from 'ioredis';

// Branded types
export type CapabilityId = string & { readonly __brand: 'CapabilityId' };
export type TenantId = string & { readonly __brand: 'TenantId' };
export type IntentId = string & { readonly __brand: 'IntentId' };
export type ArtifactId = string & { readonly __brand: 'ArtifactId' };

// Enums
export type CapabilityStatus = 'DEVELOPING' | 'ACTIVE' | 'DEGRADED' | 'DEPRECATED';
export type MaturityLevel = 'EXPERIMENTAL' | 'ALPHA' | 'BETA' | 'STABLE' | 'MATURE';

// Types
export interface CapabilityGap {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  affectedUseCases?: string[];
  suggestedFix?: string;
}

export interface ValueDelivered {
  timesSaved?: number;
  errorsAvoided?: number;
  usersHelped?: number;
  revenueAttributed?: number;
  customMetrics?: Record<string, number>;
}

export interface CreateCapabilityInput {
  tenantId: TenantId;
  name: string;
  description: string;
  provides: string;
  limitations?: string[];
  assumptions?: string[];
  intentId?: IntentId;
  artifactIds?: ArtifactId[];
  dependsOn?: CapabilityId[];
  maturityLevel?: MaturityLevel;
  createdById?: string;
}

export interface UpdateCapabilityInput {
  name?: string;
  description?: string;
  provides?: string;
  limitations?: string[];
  assumptions?: string[];
  intentId?: IntentId | null;
  artifactIds?: ArtifactId[];
  dependsOn?: CapabilityId[];
  status?: CapabilityStatus;
  maturityLevel?: MaturityLevel;
  gaps?: CapabilityGap[];
  valueDelivered?: ValueDelivered;
}

export interface CapabilityFilter {
  status?: CapabilityStatus | CapabilityStatus[];
  maturityLevel?: MaturityLevel | MaturityLevel[];
  intentId?: IntentId;
  hasGaps?: boolean;
  minEffectiveness?: number;
  search?: string;
}

export interface Capability {
  id: CapabilityId;
  tenantId: TenantId;
  name: string;
  description: string;
  provides: string;
  limitations: string[];
  assumptions: string[];
  effectivenessScore: number;
  usageCount: number;
  successRate: number | null;
  lastUsedAt: Date | null;
  valueDelivered: ValueDelivered | null;
  gaps: CapabilityGap[];
  status: CapabilityStatus;
  maturityLevel: MaturityLevel;
  intentId: IntentId | null;
  artifactIds: ArtifactId[];
  dependsOn: CapabilityId[];
  createdById: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapabilityUsageEvent {
  capabilityId: CapabilityId;
  timestamp: Date;
  success: boolean;
  duration?: number;
  context?: Record<string, unknown>;
}

export class CapabilityService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Create a new capability
   */
  async createCapability(input: CreateCapabilityInput): Promise<Capability> {
    const capability = await this.prisma.capability.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        provides: input.provides,
        limitations: (input.limitations || []) as unknown as Prisma.JsonArray,
        assumptions: (input.assumptions || []) as unknown as Prisma.JsonArray,
        intentId: input.intentId,
        artifactIds: (input.artifactIds || []) as unknown as Prisma.JsonArray,
        dependsOn: (input.dependsOn || []) as unknown as Prisma.JsonArray,
        maturityLevel: input.maturityLevel || 'EXPERIMENTAL',
        status: 'DEVELOPING',
        createdById: input.createdById,
      },
    });

    return this.mapToCapability(capability);
  }

  /**
   * Get a capability by ID
   */
  async getCapability(tenantId: TenantId, capabilityId: CapabilityId): Promise<Capability | null> {
    const capability = await this.prisma.capability.findFirst({
      where: { id: capabilityId, tenantId },
    });

    return capability ? this.mapToCapability(capability) : null;
  }

  /**
   * List capabilities with filtering
   */
  async listCapabilities(
    tenantId: TenantId,
    filter?: CapabilityFilter,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Capability[]; total: number }> {
    const where: Prisma.CapabilityWhereInput = {
      tenantId,
      ...(filter?.status && {
        status: Array.isArray(filter.status) ? { in: filter.status } : filter.status,
      }),
      ...(filter?.maturityLevel && {
        maturityLevel: Array.isArray(filter.maturityLevel)
          ? { in: filter.maturityLevel }
          : filter.maturityLevel,
      }),
      ...(filter?.intentId && { intentId: filter.intentId }),
      ...(filter?.minEffectiveness !== undefined && {
        effectivenessScore: { gte: filter.minEffectiveness },
      }),
      ...(filter?.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { provides: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [capabilities, total] = await Promise.all([
      this.prisma.capability.findMany({
        where,
        orderBy: [{ effectivenessScore: 'desc' }, { usageCount: 'desc' }],
        take: pagination?.limit || 50,
        skip: pagination?.offset || 0,
      }),
      this.prisma.capability.count({ where }),
    ]);

    // Filter by gaps if needed (can't do this in Prisma directly for JSON arrays)
    let filtered = capabilities.map(c => this.mapToCapability(c));
    if (filter?.hasGaps !== undefined) {
      filtered = filtered.filter(c =>
        filter.hasGaps ? c.gaps.length > 0 : c.gaps.length === 0
      );
    }

    return { data: filtered, total };
  }

  /**
   * Update a capability
   */
  async updateCapability(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    input: UpdateCapabilityInput,
  ): Promise<Capability> {
    const capability = await this.prisma.capability.update({
      where: { id: capabilityId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.provides && { provides: input.provides }),
        ...(input.limitations && { limitations: input.limitations as unknown as Prisma.JsonArray }),
        ...(input.assumptions && { assumptions: input.assumptions as unknown as Prisma.JsonArray }),
        ...(input.intentId !== undefined && { intentId: input.intentId }),
        ...(input.artifactIds && { artifactIds: input.artifactIds as unknown as Prisma.JsonArray }),
        ...(input.dependsOn && { dependsOn: input.dependsOn as unknown as Prisma.JsonArray }),
        ...(input.status && { status: input.status }),
        ...(input.maturityLevel && { maturityLevel: input.maturityLevel }),
        ...(input.gaps && { gaps: input.gaps as unknown as Prisma.JsonArray }),
        ...(input.valueDelivered && { valueDelivered: input.valueDelivered as unknown as Prisma.JsonObject }),
      },
    });

    return this.mapToCapability(capability);
  }

  /**
   * Record usage of a capability
   */
  async recordUsage(event: CapabilityUsageEvent): Promise<void> {
    const capability = await this.prisma.capability.findUnique({
      where: { id: event.capabilityId },
    });

    if (!capability) return;

    // Update usage statistics
    const newUsageCount = capability.usageCount + 1;
    const currentSuccessCount = capability.successRate
      ? Math.round(capability.successRate * capability.usageCount)
      : 0;
    const newSuccessCount = event.success ? currentSuccessCount + 1 : currentSuccessCount;
    const newSuccessRate = newSuccessCount / newUsageCount;

    // Update effectiveness based on success rate and other factors
    const effectivenessScore = this.calculateEffectiveness(newSuccessRate, newUsageCount);

    await this.prisma.capability.update({
      where: { id: event.capabilityId },
      data: {
        usageCount: newUsageCount,
        successRate: newSuccessRate,
        effectivenessScore,
        lastUsedAt: event.timestamp,
      },
    });

    // Check if we should update status based on effectiveness
    await this.updateStatusBasedOnEffectiveness(event.capabilityId, effectivenessScore);
  }

  /**
   * Add a detected gap to a capability
   */
  async addGap(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    gap: Omit<CapabilityGap, 'detectedAt'>,
  ): Promise<Capability> {
    const capability = await this.getCapability(tenantId, capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    const newGap: CapabilityGap = {
      ...gap,
      detectedAt: new Date().toISOString(),
    };

    const updatedGaps = [...capability.gaps, newGap];

    // If critical gap, degrade capability
    let statusUpdate: { status?: CapabilityStatus } = {};
    if (gap.severity === 'critical' && capability.status === 'ACTIVE') {
      statusUpdate = { status: 'DEGRADED' };
    }

    const updated = await this.prisma.capability.update({
      where: { id: capabilityId },
      data: {
        gaps: updatedGaps as unknown as Prisma.JsonArray,
        ...statusUpdate,
      },
    });

    return this.mapToCapability(updated);
  }

  /**
   * Resolve a gap
   */
  async resolveGap(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    gapIndex: number,
  ): Promise<Capability> {
    const capability = await this.getCapability(tenantId, capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    const updatedGaps = capability.gaps.filter((_, index) => index !== gapIndex);

    // If no more critical gaps, restore status
    let statusUpdate: { status?: CapabilityStatus } = {};
    const hasCriticalGaps = updatedGaps.some(g => g.severity === 'critical');
    if (!hasCriticalGaps && capability.status === 'DEGRADED') {
      statusUpdate = { status: 'ACTIVE' };
    }

    const updated = await this.prisma.capability.update({
      where: { id: capabilityId },
      data: {
        gaps: updatedGaps as unknown as Prisma.JsonArray,
        ...statusUpdate,
      },
    });

    return this.mapToCapability(updated);
  }

  /**
   * Update value delivered
   */
  async updateValueDelivered(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    value: Partial<ValueDelivered>,
  ): Promise<Capability> {
    const capability = await this.getCapability(tenantId, capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    const updatedValue: ValueDelivered = {
      ...capability.valueDelivered,
      ...value,
    };

    const updated = await this.prisma.capability.update({
      where: { id: capabilityId },
      data: {
        valueDelivered: updatedValue as unknown as Prisma.JsonObject,
      },
    });

    return this.mapToCapability(updated);
  }

  /**
   * Get capabilities by intent
   */
  async getCapabilitiesByIntent(
    tenantId: TenantId,
    intentId: IntentId,
  ): Promise<Capability[]> {
    const capabilities = await this.prisma.capability.findMany({
      where: { tenantId, intentId },
      orderBy: { effectivenessScore: 'desc' },
    });

    return capabilities.map(c => this.mapToCapability(c));
  }

  /**
   * Get capability dependencies graph
   */
  async getDependencyGraph(
    tenantId: TenantId,
    capabilityId: CapabilityId,
  ): Promise<{ capability: Capability; dependencies: Capability[]; dependents: Capability[] }> {
    const capability = await this.getCapability(tenantId, capabilityId);
    if (!capability) {
      throw new Error(`Capability ${capabilityId} not found`);
    }

    // Get capabilities this one depends on
    const dependencies = capability.dependsOn.length > 0
      ? await this.prisma.capability.findMany({
          where: { tenantId, id: { in: capability.dependsOn as string[] } },
        })
      : [];

    // Get capabilities that depend on this one
    const allCapabilities = await this.prisma.capability.findMany({
      where: { tenantId },
    });

    const dependents = allCapabilities.filter(c => {
      const deps = c.dependsOn as string[];
      return deps.includes(capabilityId);
    });

    return {
      capability,
      dependencies: dependencies.map(c => this.mapToCapability(c)),
      dependents: dependents.map(c => this.mapToCapability(c)),
    };
  }

  /**
   * Get capability health summary
   */
  async getCapabilitySummary(tenantId: TenantId): Promise<{
    total: number;
    byStatus: Record<CapabilityStatus, number>;
    byMaturity: Record<MaturityLevel, number>;
    avgEffectiveness: number;
    totalGaps: number;
    criticalGaps: number;
    totalValueDelivered: ValueDelivered;
  }> {
    const capabilities = await this.prisma.capability.findMany({
      where: { tenantId },
    });

    const mapped = capabilities.map(c => this.mapToCapability(c));

    const byStatus = mapped.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<CapabilityStatus, number>);

    const byMaturity = mapped.reduce((acc, c) => {
      acc[c.maturityLevel] = (acc[c.maturityLevel] || 0) + 1;
      return acc;
    }, {} as Record<MaturityLevel, number>);

    const avgEffectiveness = mapped.length > 0
      ? mapped.reduce((sum, c) => sum + c.effectivenessScore, 0) / mapped.length
      : 0;

    const allGaps = mapped.flatMap(c => c.gaps);
    const totalGaps = allGaps.length;
    const criticalGaps = allGaps.filter(g => g.severity === 'critical').length;

    const totalValueDelivered: ValueDelivered = {
      timesSaved: mapped.reduce((sum, c) => sum + (c.valueDelivered?.timesSaved || 0), 0),
      errorsAvoided: mapped.reduce((sum, c) => sum + (c.valueDelivered?.errorsAvoided || 0), 0),
      usersHelped: mapped.reduce((sum, c) => sum + (c.valueDelivered?.usersHelped || 0), 0),
      revenueAttributed: mapped.reduce((sum, c) => sum + (c.valueDelivered?.revenueAttributed || 0), 0),
    };

    return {
      total: capabilities.length,
      byStatus,
      byMaturity,
      avgEffectiveness,
      totalGaps,
      criticalGaps,
      totalValueDelivered,
    };
  }

  // Private helpers

  private calculateEffectiveness(successRate: number, usageCount: number): number {
    // Effectiveness is a combination of success rate and usage volume
    // High success rate with high usage = very effective
    // High success rate with low usage = potentially effective but unproven
    const usageWeight = Math.min(1, usageCount / 100); // Max weight at 100 uses
    const baseEffectiveness = successRate * 0.8 + 0.2 * usageWeight;
    return Math.min(1, baseEffectiveness);
  }

  private async updateStatusBasedOnEffectiveness(
    capabilityId: CapabilityId,
    effectivenessScore: number,
  ): Promise<void> {
    const capability = await this.prisma.capability.findUnique({
      where: { id: capabilityId },
    });

    if (!capability) return;

    let newStatus: CapabilityStatus | null = null;

    if (effectivenessScore < 0.3 && capability.status === 'ACTIVE') {
      newStatus = 'DEGRADED';
    } else if (effectivenessScore >= 0.7 && capability.status === 'DEVELOPING') {
      newStatus = 'ACTIVE';
    } else if (effectivenessScore >= 0.5 && capability.status === 'DEGRADED') {
      // Check for critical gaps before restoring
      const gaps = (capability.gaps || []) as unknown as CapabilityGap[];
      const hasCriticalGaps = gaps.some(g => g.severity === 'critical');
      if (!hasCriticalGaps) {
        newStatus = 'ACTIVE';
      }
    }

    if (newStatus) {
      await this.prisma.capability.update({
        where: { id: capabilityId },
        data: { status: newStatus },
      });
    }
  }

  private mapToCapability(prismaCapability: {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    provides: string;
    limitations: Prisma.JsonValue;
    assumptions: Prisma.JsonValue;
    effectivenessScore: number;
    usageCount: number;
    successRate: number | null;
    lastUsedAt: Date | null;
    valueDelivered: Prisma.JsonValue;
    gaps: Prisma.JsonValue;
    status: string;
    maturityLevel: string;
    intentId: string | null;
    artifactIds: Prisma.JsonValue;
    dependsOn: Prisma.JsonValue;
    createdById: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): Capability {
    return {
      id: prismaCapability.id as CapabilityId,
      tenantId: prismaCapability.tenantId as TenantId,
      name: prismaCapability.name,
      description: prismaCapability.description,
      provides: prismaCapability.provides,
      limitations: (prismaCapability.limitations || []) as unknown as string[],
      assumptions: (prismaCapability.assumptions || []) as unknown as string[],
      effectivenessScore: prismaCapability.effectivenessScore,
      usageCount: prismaCapability.usageCount,
      successRate: prismaCapability.successRate,
      lastUsedAt: prismaCapability.lastUsedAt,
      valueDelivered: prismaCapability.valueDelivered as unknown as ValueDelivered | null,
      gaps: (prismaCapability.gaps || []) as unknown as CapabilityGap[],
      status: prismaCapability.status as CapabilityStatus,
      maturityLevel: prismaCapability.maturityLevel as MaturityLevel,
      intentId: prismaCapability.intentId as IntentId | null,
      artifactIds: (prismaCapability.artifactIds || []) as unknown as ArtifactId[],
      dependsOn: (prismaCapability.dependsOn || []) as unknown as CapabilityId[],
      createdById: prismaCapability.createdById,
      metadata: prismaCapability.metadata as Record<string, unknown>,
      createdAt: prismaCapability.createdAt,
      updatedAt: prismaCapability.updatedAt,
    };
  }
}

export default CapabilityService;
