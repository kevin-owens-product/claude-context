/**
 * Use Case Service - Manages solution templates and customer implementations
 * @prompt-id forge-v4.1:service:use-case:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type { ArtifactId } from '../types/living-software.types';
import type { CustomerId } from './customer.service';

// ============================================================================
// TYPES
// ============================================================================

export type UseCaseId = string & { __brand: 'UseCaseId' };

export type UseCaseStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'DEPRECATED';
export type ImplementationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'ABANDONED';

export interface UseCase {
  id: UseCaseId;
  tenantId: TenantId;
  name: string;
  slug: string;
  description: string;
  category: string;
  industry?: string;
  persona?: string;
  problemStatement?: string;
  solutionOverview?: string;
  valueProposition?: string;
  status: UseCaseStatus;
  isPublic: boolean;
  avgTimeSaving?: number;
  avgCostSaving?: number;
  successRate?: number;
  implementationCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdById?: UserId;
  artifacts?: UseCaseArtifact[];
}

export interface UseCaseArtifact {
  id: string;
  useCaseId: UseCaseId;
  artifactId: ArtifactId;
  role: string;
  description?: string;
  orderIndex: number;
  createdAt: Date;
}

export interface UseCaseImplementation {
  id: string;
  useCaseId: UseCaseId;
  customerId: CustomerId;
  status: ImplementationStatus;
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  useCase?: { id: UseCaseId; name: string };
  customer?: { id: CustomerId; name: string };
}

export interface CreateUseCaseRequest {
  name: string;
  description: string;
  category: string;
  industry?: string;
  persona?: string;
  problemStatement?: string;
  solutionOverview?: string;
  valueProposition?: string;
  isPublic?: boolean;
  createdById?: UserId;
  metadata?: Record<string, unknown>;
}

export interface UpdateUseCaseRequest {
  name?: string;
  description?: string;
  category?: string;
  industry?: string;
  persona?: string;
  problemStatement?: string;
  solutionOverview?: string;
  valueProposition?: string;
  status?: UseCaseStatus;
  isPublic?: boolean;
  avgTimeSaving?: number;
  avgCostSaving?: number;
  metadata?: Record<string, unknown>;
}

export interface AddArtifactRequest {
  artifactId: ArtifactId;
  role: string;
  description?: string;
  orderIndex?: number;
}

export interface CreateImplementationRequest {
  customerId: CustomerId;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateImplementationRequest {
  status?: ImplementationStatus;
  progress?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class UseCaseService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // USE CASE CRUD
  // ============================================================================

  async listUseCases(
    tenantId: TenantId,
    options: PaginationOptions & {
      status?: UseCaseStatus;
      category?: string;
      industry?: string;
      isPublic?: boolean;
    } = {}
  ): Promise<PaginatedResult<UseCase>> {
    const { limit = 20, offset = 0, status, category, industry, isPublic } = options;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (industry) where.industry = industry;
    if (isPublic !== undefined) where.isPublic = isPublic;

    const [data, total] = await Promise.all([
      this.prisma.useCase.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { implementationCount: 'desc' },
        include: {
          artifacts: {
            orderBy: { orderIndex: 'asc' },
          },
          _count: { select: { implementations: true } },
        },
      }),
      this.prisma.useCase.count({ where }),
    ]);

    return {
      data: data.map(this.mapToUseCase),
      total,
      limit,
      offset,
    };
  }

  async getUseCase(
    tenantId: TenantId,
    useCaseId: UseCaseId
  ): Promise<UseCase | null> {
    const useCase = await this.prisma.useCase.findFirst({
      where: { id: useCaseId, tenantId },
      include: {
        artifacts: {
          orderBy: { orderIndex: 'asc' },
        },
        implementations: {
          include: {
            customer: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return useCase ? this.mapToUseCase(useCase) : null;
  }

  async getUseCaseBySlug(
    tenantId: TenantId,
    slug: string
  ): Promise<UseCase | null> {
    const useCase = await this.prisma.useCase.findFirst({
      where: { tenantId, slug },
      include: {
        artifacts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return useCase ? this.mapToUseCase(useCase) : null;
  }

  async createUseCase(
    tenantId: TenantId,
    request: CreateUseCaseRequest
  ): Promise<UseCase> {
    const slug = this.generateSlug(request.name);

    const useCase = await this.prisma.useCase.create({
      data: {
        tenantId,
        name: request.name,
        slug,
        description: request.description,
        category: request.category,
        industry: request.industry,
        persona: request.persona,
        problemStatement: request.problemStatement,
        solutionOverview: request.solutionOverview,
        valueProposition: request.valueProposition,
        status: 'DRAFT',
        isPublic: request.isPublic || false,
        implementationCount: 0,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
        createdById: request.createdById,
      },
      include: {
        artifacts: true,
      },
    });

    return this.mapToUseCase(useCase);
  }

  async updateUseCase(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    request: UpdateUseCaseRequest
  ): Promise<UseCase | null> {
    const existing = await this.getUseCase(tenantId, useCaseId);
    if (!existing) return null;

    const useCase = await this.prisma.useCase.update({
      where: { id: useCaseId as string },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.description && { description: request.description }),
        ...(request.category && { category: request.category }),
        ...(request.industry !== undefined && { industry: request.industry }),
        ...(request.persona !== undefined && { persona: request.persona }),
        ...(request.problemStatement !== undefined && { problemStatement: request.problemStatement }),
        ...(request.solutionOverview !== undefined && { solutionOverview: request.solutionOverview }),
        ...(request.valueProposition !== undefined && { valueProposition: request.valueProposition }),
        ...(request.status && { status: request.status }),
        ...(request.isPublic !== undefined && { isPublic: request.isPublic }),
        ...(request.avgTimeSaving !== undefined && { avgTimeSaving: request.avgTimeSaving }),
        ...(request.avgCostSaving !== undefined && { avgCostSaving: request.avgCostSaving }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
      include: {
        artifacts: true,
      },
    });

    return this.mapToUseCase(useCase);
  }

  async publishUseCase(
    tenantId: TenantId,
    useCaseId: UseCaseId
  ): Promise<UseCase | null> {
    return this.updateUseCase(tenantId, useCaseId, {
      status: 'PUBLISHED',
      isPublic: true,
    });
  }

  async deleteUseCase(
    tenantId: TenantId,
    useCaseId: UseCaseId
  ): Promise<boolean> {
    const existing = await this.getUseCase(tenantId, useCaseId);
    if (!existing) return false;

    await this.prisma.useCase.delete({
      where: { id: useCaseId },
    });

    return true;
  }

  // ============================================================================
  // ARTIFACT OPERATIONS
  // ============================================================================

  async addArtifact(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    request: AddArtifactRequest
  ): Promise<UseCaseArtifact> {
    const useCase = await this.getUseCase(tenantId, useCaseId);
    if (!useCase) {
      throw new Error(`Use case not found: ${useCaseId}`);
    }

    // Get max order index
    const maxOrder = useCase.artifacts?.length
      ? Math.max(...useCase.artifacts.map(a => a.orderIndex))
      : -1;

    const artifact = await this.prisma.useCaseArtifact.create({
      data: {
        useCaseId,
        artifactId: request.artifactId,
        role: request.role,
        description: request.description,
        orderIndex: request.orderIndex ?? maxOrder + 1,
      },
    });

    return this.mapToUseCaseArtifact(artifact);
  }

  async removeArtifact(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    artifactId: ArtifactId
  ): Promise<boolean> {
    const useCase = await this.getUseCase(tenantId, useCaseId);
    if (!useCase) return false;

    try {
      await this.prisma.useCaseArtifact.delete({
        where: {
          useCaseId_artifactId: { useCaseId, artifactId },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async reorderArtifacts(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    artifactOrder: { artifactId: ArtifactId; orderIndex: number }[]
  ): Promise<void> {
    const useCase = await this.getUseCase(tenantId, useCaseId);
    if (!useCase) {
      throw new Error(`Use case not found: ${useCaseId}`);
    }

    // Update order for each artifact
    await Promise.all(
      artifactOrder.map(({ artifactId, orderIndex }) =>
        this.prisma.useCaseArtifact.update({
          where: {
            useCaseId_artifactId: { useCaseId, artifactId },
          },
          data: { orderIndex },
        })
      )
    );
  }

  // ============================================================================
  // IMPLEMENTATION OPERATIONS
  // ============================================================================

  async listImplementations(
    tenantId: TenantId,
    options: PaginationOptions & {
      useCaseId?: UseCaseId;
      customerId?: CustomerId;
      status?: ImplementationStatus;
    } = {}
  ): Promise<PaginatedResult<UseCaseImplementation>> {
    const { limit = 20, offset = 0, useCaseId, customerId, status } = options;

    const where: any = {};
    if (useCaseId) where.useCaseId = useCaseId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    // Filter by tenant through useCase
    where.useCase = { tenantId };

    const [data, total] = await Promise.all([
      this.prisma.useCaseImplementation.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          useCase: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.useCaseImplementation.count({ where }),
    ]);

    return {
      data: data.map(this.mapToImplementation),
      total,
      limit,
      offset,
    };
  }

  async startImplementation(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    request: CreateImplementationRequest
  ): Promise<UseCaseImplementation> {
    const useCase = await this.getUseCase(tenantId, useCaseId);
    if (!useCase) {
      throw new Error(`Use case not found: ${useCaseId}`);
    }

    const implementation = await this.prisma.useCaseImplementation.create({
      data: {
        useCaseId: useCaseId as string,
        customerId: request.customerId as string,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        progress: 0,
        notes: request.notes,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        useCase: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    // Increment implementation count
    await this.prisma.useCase.update({
      where: { id: useCaseId },
      data: { implementationCount: { increment: 1 } },
    });

    return this.mapToImplementation(implementation);
  }

  async updateImplementation(
    tenantId: TenantId,
    useCaseId: UseCaseId,
    customerId: CustomerId,
    request: UpdateImplementationRequest
  ): Promise<UseCaseImplementation | null> {
    try {
      const updateData: any = {};
      if (request.status) {
        updateData.status = request.status;
        if (request.status === 'COMPLETED') {
          updateData.completedAt = new Date();
          updateData.progress = 1;
        }
      }
      if (request.progress !== undefined) updateData.progress = request.progress;
      if (request.notes !== undefined) updateData.notes = request.notes;
      if (request.metadata) updateData.metadata = request.metadata;

      const implementation = await this.prisma.useCaseImplementation.update({
        where: {
          useCaseId_customerId: { useCaseId, customerId },
        },
        data: updateData,
        include: {
          useCase: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      });

      // Update success rate if completed
      if (request.status === 'COMPLETED') {
        await this.recalculateSuccessRate(useCaseId);
      }

      return this.mapToImplementation(implementation);
    } catch {
      return null;
    }
  }

  private async recalculateSuccessRate(useCaseId: UseCaseId): Promise<void> {
    const implementations = await this.prisma.useCaseImplementation.findMany({
      where: {
        useCaseId,
        status: { in: ['COMPLETED', 'ABANDONED'] },
      },
      select: { status: true },
    });

    if (implementations.length === 0) return;

    const completed = implementations.filter(i => i.status === 'COMPLETED').length;
    const successRate = completed / implementations.length;

    await this.prisma.useCase.update({
      where: { id: useCaseId },
      data: { successRate },
    });
  }

  // ============================================================================
  // DISCOVERY & RECOMMENDATIONS
  // ============================================================================

  async getRecommendedUseCases(
    tenantId: TenantId,
    customerId: CustomerId,
    limit: number = 5
  ): Promise<UseCase[]> {
    // Get customer's existing implementations
    const existingImplementations = await this.prisma.useCaseImplementation.findMany({
      where: { customerId },
      select: { useCaseId: true },
    });
    const implementedIds = existingImplementations.map(i => i.useCaseId);

    // Get customer info for filtering
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { tier: true, type: true },
    });

    // Get published use cases not yet implemented by this customer
    const useCases = await this.prisma.useCase.findMany({
      where: {
        tenantId,
        status: 'PUBLISHED',
        id: { notIn: implementedIds },
      },
      orderBy: [
        { successRate: 'desc' },
        { implementationCount: 'desc' },
      ],
      take: limit,
      include: {
        artifacts: { orderBy: { orderIndex: 'asc' }, take: 3 },
      },
    });

    return useCases.map(this.mapToUseCase);
  }

  async searchUseCases(
    tenantId: TenantId,
    query: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<UseCase>> {
    const { limit = 20, offset = 0 } = options;

    const where: any = {
      tenantId,
      status: 'PUBLISHED',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { problemStatement: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.useCase.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { implementationCount: 'desc' },
        include: {
          artifacts: { orderBy: { orderIndex: 'asc' } },
        },
      }),
      this.prisma.useCase.count({ where }),
    ]);

    return {
      data: data.map(this.mapToUseCase),
      total,
      limit,
      offset,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private mapToUseCase = (record: any): UseCase => {
    return {
      id: record.id as UseCaseId,
      tenantId: record.tenantId as TenantId,
      name: record.name,
      slug: record.slug,
      description: record.description,
      category: record.category,
      industry: record.industry,
      persona: record.persona,
      problemStatement: record.problemStatement,
      solutionOverview: record.solutionOverview,
      valueProposition: record.valueProposition,
      status: record.status as UseCaseStatus,
      isPublic: record.isPublic,
      avgTimeSaving: record.avgTimeSaving,
      avgCostSaving: record.avgCostSaving ? Number(record.avgCostSaving) : undefined,
      successRate: record.successRate,
      implementationCount: record.implementationCount,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdById: record.createdById as UserId | undefined,
      artifacts: record.artifacts?.map(this.mapToUseCaseArtifact),
    };
  };

  private mapToUseCaseArtifact = (record: any): UseCaseArtifact => {
    return {
      id: record.id,
      useCaseId: record.useCaseId as UseCaseId,
      artifactId: record.artifactId as ArtifactId,
      role: record.role,
      description: record.description,
      orderIndex: record.orderIndex,
      createdAt: record.createdAt,
    };
  };

  private mapToImplementation = (record: any): UseCaseImplementation => {
    return {
      id: record.id,
      useCaseId: record.useCaseId as UseCaseId,
      customerId: record.customerId as CustomerId,
      status: record.status as ImplementationStatus,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      progress: record.progress,
      notes: record.notes,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      useCase: record.useCase,
      customer: record.customer,
    };
  };
}
