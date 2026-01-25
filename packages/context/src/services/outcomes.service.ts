/**
 * Outcomes Service - Manages OKRs, Key Results, and Customer Outcomes
 * @prompt-id forge-v4.1:service:outcomes:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type { CustomerId } from './customer.service';

// ============================================================================
// TYPES
// ============================================================================

export type ObjectiveId = string & { __brand: 'ObjectiveId' };
export type KeyResultId = string & { __brand: 'KeyResultId' };
export type CustomerOutcomeId = string & { __brand: 'CustomerOutcomeId' };

export type ObjectiveType = 'OKR' | 'KPI' | 'NORTH_STAR' | 'INITIATIVE';
export type ObjectiveLevel = 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
export type ObjectiveStatus = 'DRAFT' | 'ACTIVE' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
export type MetricType = 'NUMBER' | 'PERCENTAGE' | 'CURRENCY' | 'BOOLEAN' | 'RATIO';
export type MetricDirection = 'INCREASE' | 'DECREASE' | 'MAINTAIN';
export type KeyResultStatus = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ACHIEVED' | 'MISSED';
export type ContributionStatus = 'PLANNED' | 'IN_PROGRESS' | 'DELIVERED' | 'MEASURED';
export type OutcomeCategory = 'REVENUE_INCREASE' | 'COST_REDUCTION' | 'TIME_SAVINGS' | 'PRODUCTIVITY_GAIN' | 'RISK_REDUCTION' | 'COMPLIANCE' | 'CUSTOMER_SATISFACTION' | 'EMPLOYEE_SATISFACTION';
export type OutcomeStatus = 'CLAIMED' | 'VERIFIED' | 'PUBLISHED';

export interface BusinessObjective {
  id: ObjectiveId;
  tenantId: TenantId;
  title: string;
  description?: string;
  type: ObjectiveType;
  level: ObjectiveLevel;
  status: ObjectiveStatus;
  ownerId: UserId;
  parentId?: ObjectiveId;
  startDate: Date;
  endDate: Date;
  progress: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  keyResults?: KeyResult[];
  children?: BusinessObjective[];
}

export interface KeyResult {
  id: KeyResultId;
  objectiveId: ObjectiveId;
  title: string;
  description?: string;
  metricType: MetricType;
  unit?: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  direction: MetricDirection;
  status: KeyResultStatus;
  confidence: number;
  lastMeasuredAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  measurements?: KeyResultMeasurement[];
}

export interface KeyResultMeasurement {
  id: string;
  keyResultId: KeyResultId;
  value: number;
  note?: string;
  measuredAt: Date;
  measuredById?: UserId;
  createdAt: Date;
}

export interface SliceObjective {
  id: string;
  sliceId: string;
  objectiveId: ObjectiveId;
  contribution: number;
  status: ContributionStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerOutcome {
  id: CustomerOutcomeId;
  tenantId: TenantId;
  customerId: CustomerId;
  title: string;
  description: string;
  category: OutcomeCategory;
  quantifiedValue?: number;
  valueUnit?: string;
  status: OutcomeStatus;
  verifiedAt?: Date;
  verifiedById?: UserId;
  linkedArtifactIds: string[];
  linkedSliceIds: string[];
  linkedUseCaseId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateObjectiveRequest {
  title: string;
  description?: string;
  type?: ObjectiveType;
  level?: ObjectiveLevel;
  ownerId: UserId;
  parentId?: ObjectiveId;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateObjectiveRequest {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  ownerId?: UserId;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateKeyResultRequest {
  title: string;
  description?: string;
  metricType?: MetricType;
  unit?: string;
  startValue?: number;
  targetValue: number;
  direction?: MetricDirection;
}

export interface CreateMeasurementRequest {
  value: number;
  note?: string;
  measuredById?: UserId;
}

export interface CreateCustomerOutcomeRequest {
  customerId: CustomerId;
  title: string;
  description: string;
  category: OutcomeCategory;
  quantifiedValue?: number;
  valueUnit?: string;
  linkedArtifactIds?: string[];
  linkedSliceIds?: string[];
  linkedUseCaseId?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class OutcomesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // OBJECTIVE CRUD
  // ============================================================================

  async listObjectives(
    tenantId: TenantId,
    options: PaginationOptions & {
      type?: ObjectiveType;
      level?: ObjectiveLevel;
      status?: ObjectiveStatus;
      ownerId?: UserId;
      parentId?: ObjectiveId;
    } = {}
  ): Promise<PaginatedResult<BusinessObjective>> {
    const { limit = 20, offset = 0, type, level, status, ownerId, parentId } = options;

    const where: any = { tenantId };
    if (type) where.type = type;
    if (level) where.level = level;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (parentId !== undefined) where.parentId = parentId;

    const [data, total] = await Promise.all([
      this.prisma.businessObjective.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { startDate: 'desc' },
        include: {
          keyResults: { orderBy: { createdAt: 'asc' } },
          children: {
            include: {
              keyResults: true,
            },
          },
        },
      }),
      this.prisma.businessObjective.count({ where }),
    ]);

    return {
      data: data.map(this.mapToObjective),
      total,
      limit,
      offset,
    };
  }

  async getObjective(
    tenantId: TenantId,
    objectiveId: ObjectiveId
  ): Promise<BusinessObjective | null> {
    const objective = await this.prisma.businessObjective.findFirst({
      where: { id: objectiveId, tenantId },
      include: {
        keyResults: {
          include: {
            measurements: { orderBy: { measuredAt: 'desc' }, take: 10 },
          },
          orderBy: { createdAt: 'asc' },
        },
        children: {
          include: { keyResults: true },
        },
        sliceObjectives: true,
      },
    });

    return objective ? this.mapToObjective(objective) : null;
  }

  async createObjective(
    tenantId: TenantId,
    request: CreateObjectiveRequest
  ): Promise<BusinessObjective> {
    const objective = await this.prisma.businessObjective.create({
      data: {
        tenantId,
        title: request.title,
        description: request.description,
        type: request.type || 'OKR',
        level: request.level || 'TEAM',
        status: 'DRAFT',
        ownerId: request.ownerId,
        parentId: request.parentId,
        startDate: request.startDate,
        endDate: request.endDate,
        progress: 0,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        keyResults: true,
        children: true,
      },
    });

    return this.mapToObjective(objective);
  }

  async updateObjective(
    tenantId: TenantId,
    objectiveId: ObjectiveId,
    request: UpdateObjectiveRequest
  ): Promise<BusinessObjective | null> {
    const existing = await this.getObjective(tenantId, objectiveId);
    if (!existing) return null;

    const objective = await this.prisma.businessObjective.update({
      where: { id: objectiveId },
      data: {
        ...(request.title && { title: request.title }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.status && { status: request.status }),
        ...(request.ownerId && { ownerId: request.ownerId as string }),
        ...(request.progress !== undefined && { progress: request.progress }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
      include: {
        keyResults: true,
        children: true,
      },
    });

    return this.mapToObjective(objective);
  }

  async deleteObjective(
    tenantId: TenantId,
    objectiveId: ObjectiveId
  ): Promise<boolean> {
    const existing = await this.getObjective(tenantId, objectiveId);
    if (!existing) return false;

    await this.prisma.businessObjective.delete({
      where: { id: objectiveId },
    });

    return true;
  }

  // ============================================================================
  // KEY RESULT OPERATIONS
  // ============================================================================

  async addKeyResult(
    tenantId: TenantId,
    objectiveId: ObjectiveId,
    request: CreateKeyResultRequest
  ): Promise<KeyResult> {
    const objective = await this.getObjective(tenantId, objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const keyResult = await this.prisma.keyResult.create({
      data: {
        objectiveId,
        title: request.title,
        description: request.description,
        metricType: request.metricType || 'NUMBER',
        unit: request.unit,
        startValue: request.startValue || 0,
        currentValue: request.startValue || 0,
        targetValue: request.targetValue,
        direction: request.direction || 'INCREASE',
        status: 'ON_TRACK',
        confidence: 0.5,
        metadata: {},
      },
    });

    return this.mapToKeyResult(keyResult);
  }

  async updateKeyResult(
    tenantId: TenantId,
    objectiveId: ObjectiveId,
    keyResultId: KeyResultId,
    updates: Partial<CreateKeyResultRequest>
  ): Promise<KeyResult | null> {
    const objective = await this.getObjective(tenantId, objectiveId);
    if (!objective) return null;

    const existing = objective.keyResults?.find(kr => kr.id === keyResultId);
    if (!existing) return null;

    const keyResult = await this.prisma.keyResult.update({
      where: { id: keyResultId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.targetValue !== undefined && { targetValue: updates.targetValue }),
        ...(updates.unit !== undefined && { unit: updates.unit }),
      },
    });

    return this.mapToKeyResult(keyResult);
  }

  async deleteKeyResult(
    tenantId: TenantId,
    objectiveId: ObjectiveId,
    keyResultId: KeyResultId
  ): Promise<boolean> {
    const objective = await this.getObjective(tenantId, objectiveId);
    if (!objective) return false;

    try {
      await this.prisma.keyResult.delete({
        where: { id: keyResultId },
      });
      await this.recalculateObjectiveProgress(objectiveId);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // MEASUREMENT OPERATIONS
  // ============================================================================

  async recordMeasurement(
    tenantId: TenantId,
    objectiveId: ObjectiveId,
    keyResultId: KeyResultId,
    request: CreateMeasurementRequest
  ): Promise<KeyResultMeasurement> {
    const objective = await this.getObjective(tenantId, objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const keyResult = objective.keyResults?.find(kr => kr.id === keyResultId);
    if (!keyResult) {
      throw new Error(`Key Result not found: ${keyResultId}`);
    }

    const measurement = await this.prisma.keyResultMeasurement.create({
      data: {
        keyResultId,
        value: request.value,
        note: request.note,
        measuredAt: new Date(),
        measuredById: request.measuredById,
      },
    });

    // Update key result current value and status
    await this.updateKeyResultFromMeasurement(keyResultId, request.value, keyResult);

    // Recalculate objective progress
    await this.recalculateObjectiveProgress(objectiveId);

    return this.mapToMeasurement(measurement);
  }

  private async updateKeyResultFromMeasurement(
    keyResultId: KeyResultId,
    value: number,
    keyResult: KeyResult
  ): Promise<void> {
    const progress = this.calculateKeyResultProgress(
      value,
      keyResult.startValue,
      keyResult.targetValue,
      keyResult.direction
    );

    let status: KeyResultStatus = 'ON_TRACK';
    if (progress >= 1) {
      status = 'ACHIEVED';
    } else if (progress < 0.5) {
      status = 'OFF_TRACK';
    } else if (progress < 0.7) {
      status = 'AT_RISK';
    }

    await this.prisma.keyResult.update({
      where: { id: keyResultId },
      data: {
        currentValue: value,
        status,
        lastMeasuredAt: new Date(),
        confidence: Math.min(1, progress + 0.2),
      },
    });
  }

  private calculateKeyResultProgress(
    current: number,
    start: number,
    target: number,
    direction: MetricDirection
  ): number {
    if (direction === 'MAINTAIN') {
      // For maintain, progress is based on how close to target
      const deviation = Math.abs(current - target);
      const tolerance = Math.abs(target * 0.1); // 10% tolerance
      return deviation <= tolerance ? 1 : Math.max(0, 1 - deviation / target);
    }

    const range = target - start;
    if (range === 0) return current === target ? 1 : 0;

    const progress = (current - start) / range;

    if (direction === 'DECREASE') {
      return progress;
    }

    return Math.max(0, Math.min(1, progress));
  }

  private async recalculateObjectiveProgress(objectiveId: ObjectiveId): Promise<void> {
    const keyResults = await this.prisma.keyResult.findMany({
      where: { objectiveId },
    });

    if (keyResults.length === 0) {
      await this.prisma.businessObjective.update({
        where: { id: objectiveId },
        data: { progress: 0 },
      });
      return;
    }

    const totalProgress = keyResults.reduce((sum, kr) => {
      const progress = this.calculateKeyResultProgress(
        Number(kr.currentValue),
        Number(kr.startValue),
        Number(kr.targetValue),
        kr.direction as MetricDirection
      );
      return sum + progress;
    }, 0);

    const avgProgress = totalProgress / keyResults.length;

    // Determine objective status
    let status: ObjectiveStatus = 'ACTIVE';
    if (avgProgress >= 1) {
      status = 'ACHIEVED';
    }

    await this.prisma.businessObjective.update({
      where: { id: objectiveId },
      data: { progress: avgProgress, status },
    });
  }

  // ============================================================================
  // SLICE LINKING
  // ============================================================================

  async linkSliceToObjective(
    tenantId: TenantId,
    sliceId: string,
    objectiveId: ObjectiveId,
    contribution: number = 0,
    notes?: string
  ): Promise<SliceObjective> {
    const objective = await this.getObjective(tenantId, objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const sliceObjective = await this.prisma.sliceObjective.upsert({
      where: {
        sliceId_objectiveId: { sliceId, objectiveId },
      },
      create: {
        sliceId,
        objectiveId,
        contribution,
        status: 'PLANNED',
        notes,
      },
      update: {
        contribution,
        notes,
      },
    });

    return this.mapToSliceObjective(sliceObjective);
  }

  async updateSliceObjectiveStatus(
    tenantId: TenantId,
    sliceId: string,
    objectiveId: ObjectiveId,
    status: ContributionStatus
  ): Promise<SliceObjective | null> {
    try {
      const sliceObjective = await this.prisma.sliceObjective.update({
        where: {
          sliceId_objectiveId: { sliceId, objectiveId },
        },
        data: { status },
      });
      return this.mapToSliceObjective(sliceObjective);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // CUSTOMER OUTCOMES
  // ============================================================================

  async listCustomerOutcomes(
    tenantId: TenantId,
    options: PaginationOptions & {
      customerId?: CustomerId;
      category?: OutcomeCategory;
      status?: OutcomeStatus;
    } = {}
  ): Promise<PaginatedResult<CustomerOutcome>> {
    const { limit = 20, offset = 0, customerId, category, status } = options;

    const where: any = { tenantId };
    if (customerId) where.customerId = customerId;
    if (category) where.category = category;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.customerOutcome.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.customerOutcome.count({ where }),
    ]);

    return {
      data: data.map(this.mapToCustomerOutcome),
      total,
      limit,
      offset,
    };
  }

  async createCustomerOutcome(
    tenantId: TenantId,
    request: CreateCustomerOutcomeRequest
  ): Promise<CustomerOutcome> {
    const outcome = await this.prisma.customerOutcome.create({
      data: {
        tenantId,
        customerId: request.customerId,
        title: request.title,
        description: request.description,
        category: request.category,
        quantifiedValue: request.quantifiedValue,
        valueUnit: request.valueUnit,
        status: 'CLAIMED',
        linkedArtifactIds: request.linkedArtifactIds || [],
        linkedSliceIds: request.linkedSliceIds || [],
        linkedUseCaseId: request.linkedUseCaseId,
        metadata: {},
      },
    });

    return this.mapToCustomerOutcome(outcome);
  }

  async verifyCustomerOutcome(
    tenantId: TenantId,
    outcomeId: CustomerOutcomeId,
    verifiedById: UserId
  ): Promise<CustomerOutcome | null> {
    try {
      const outcome = await this.prisma.customerOutcome.update({
        where: { id: outcomeId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedById,
        },
      });
      return this.mapToCustomerOutcome(outcome);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // OKR DASHBOARD
  // ============================================================================

  async getOKRDashboard(tenantId: TenantId): Promise<{
    objectives: BusinessObjective[];
    overallProgress: number;
    byStatus: Record<ObjectiveStatus, number>;
    atRiskObjectives: BusinessObjective[];
  }> {
    const objectives = await this.prisma.businessObjective.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        parentId: null, // Top-level only
      },
      include: {
        keyResults: true,
        children: {
          include: { keyResults: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const mappedObjectives = objectives.map(this.mapToObjective);

    // Calculate overall progress
    const overallProgress = mappedObjectives.length > 0
      ? mappedObjectives.reduce((sum, o) => sum + o.progress, 0) / mappedObjectives.length
      : 0;

    // Count by status
    const allObjectives = await this.prisma.businessObjective.findMany({
      where: { tenantId },
      select: { status: true },
    });

    const byStatus: Record<ObjectiveStatus, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      ACHIEVED: 0,
      MISSED: 0,
      CANCELLED: 0,
    };

    allObjectives.forEach(o => {
      byStatus[o.status as ObjectiveStatus]++;
    });

    // Get at-risk objectives
    const atRiskObjectives = mappedObjectives.filter(o => {
      const hasAtRiskKR = o.keyResults?.some(kr => kr.status === 'AT_RISK' || kr.status === 'OFF_TRACK');
      return hasAtRiskKR || o.progress < 0.5;
    });

    return {
      objectives: mappedObjectives,
      overallProgress,
      byStatus,
      atRiskObjectives,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToObjective = (record: any): BusinessObjective => {
    return {
      id: record.id as ObjectiveId,
      tenantId: record.tenantId as TenantId,
      title: record.title,
      description: record.description,
      type: record.type as ObjectiveType,
      level: record.level as ObjectiveLevel,
      status: record.status as ObjectiveStatus,
      ownerId: record.ownerId as UserId,
      parentId: record.parentId as ObjectiveId | undefined,
      startDate: record.startDate,
      endDate: record.endDate,
      progress: record.progress,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      keyResults: record.keyResults?.map(this.mapToKeyResult),
      children: record.children?.map(this.mapToObjective),
    };
  };

  private mapToKeyResult = (record: any): KeyResult => {
    return {
      id: record.id as KeyResultId,
      objectiveId: record.objectiveId as ObjectiveId,
      title: record.title,
      description: record.description,
      metricType: record.metricType as MetricType,
      unit: record.unit,
      startValue: Number(record.startValue),
      currentValue: Number(record.currentValue),
      targetValue: Number(record.targetValue),
      direction: record.direction as MetricDirection,
      status: record.status as KeyResultStatus,
      confidence: record.confidence,
      lastMeasuredAt: record.lastMeasuredAt,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      measurements: record.measurements?.map(this.mapToMeasurement),
    };
  };

  private mapToMeasurement = (record: any): KeyResultMeasurement => {
    return {
      id: record.id,
      keyResultId: record.keyResultId as KeyResultId,
      value: Number(record.value),
      note: record.note,
      measuredAt: record.measuredAt,
      measuredById: record.measuredById as UserId | undefined,
      createdAt: record.createdAt,
    };
  };

  private mapToSliceObjective = (record: any): SliceObjective => {
    return {
      id: record.id,
      sliceId: record.sliceId,
      objectiveId: record.objectiveId as ObjectiveId,
      contribution: record.contribution,
      status: record.status as ContributionStatus,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };

  private mapToCustomerOutcome = (record: any): CustomerOutcome => {
    return {
      id: record.id as CustomerOutcomeId,
      tenantId: record.tenantId as TenantId,
      customerId: record.customerId as CustomerId,
      title: record.title,
      description: record.description,
      category: record.category as OutcomeCategory,
      quantifiedValue: record.quantifiedValue ? Number(record.quantifiedValue) : undefined,
      valueUnit: record.valueUnit,
      status: record.status as OutcomeStatus,
      verifiedAt: record.verifiedAt,
      verifiedById: record.verifiedById as UserId | undefined,
      linkedArtifactIds: record.linkedArtifactIds || [],
      linkedSliceIds: record.linkedSliceIds || [],
      linkedUseCaseId: record.linkedUseCaseId,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };
}
