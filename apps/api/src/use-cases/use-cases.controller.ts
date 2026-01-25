/**
 * Use Cases Controller - REST API for solution templates and implementations
 * @prompt-id forge-v4.1:api:controller:use-cases:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  UseCaseService,
  type TenantId,
  type UserId,
  type CustomerId,
  type UseCaseId,
  type UseCaseStatus,
  type ImplementationStatus,
  type ArtifactId,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Use Cases')
@Controller('use-cases')
export class UseCasesController {
  constructor(private readonly useCaseService: UseCaseService) {}

  @Get()
  @ApiOperation({ summary: 'List use cases' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'isPublic', required: false })
  @ApiResponse({ status: 200, description: 'Use cases list' })
  async listUseCases(
    @TenantContext() ctx: TenantContextData,
    @Query('status') status?: UseCaseStatus,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('isPublic') isPublic?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.useCaseService.listUseCases(ctx.tenantId, {
      status,
      category,
      industry,
      isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search use cases' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUseCases(
    @TenantContext() ctx: TenantContextData,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.useCaseService.searchUseCases(ctx.tenantId, query, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('recommended/:customerId')
  @ApiOperation({ summary: 'Get recommended use cases for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Recommended use cases' })
  async getRecommendedUseCases(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string
  ) {
    return this.useCaseService.getRecommendedUseCases(
      ctx.tenantId,
      customerId as CustomerId,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Get(':useCaseId')
  @ApiOperation({ summary: 'Get use case by ID' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 200, description: 'Use case details' })
  @ApiResponse({ status: 404, description: 'Use case not found' })
  async getUseCase(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string
  ) {
    const useCase = await this.useCaseService.getUseCase(ctx.tenantId, useCaseId as UseCaseId);
    if (!useCase) {
      throw new NotFoundException(`Use case not found: ${useCaseId}`);
    }
    return useCase;
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get use case by slug' })
  @ApiParam({ name: 'slug', description: 'Use Case slug' })
  @ApiResponse({ status: 200, description: 'Use case details' })
  @ApiResponse({ status: 404, description: 'Use case not found' })
  async getUseCaseBySlug(
    @TenantContext() ctx: TenantContextData,
    @Param('slug') slug: string
  ) {
    const useCase = await this.useCaseService.getUseCaseBySlug(ctx.tenantId, slug);
    if (!useCase) {
      throw new NotFoundException(`Use case not found: ${slug}`);
    }
    return useCase;
  }

  @Post()
  @ApiOperation({ summary: 'Create use case' })
  @ApiResponse({ status: 201, description: 'Use case created' })
  async createUseCase(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      name: string;
      description: string;
      category: string;
      industry?: string;
      persona?: string;
      problemStatement?: string;
      solutionOverview?: string;
      valueProposition?: string;
      isPublic?: boolean;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.useCaseService.createUseCase(ctx.tenantId, {
      ...body,
      createdById: ctx.userId,
    });
  }

  @Patch(':useCaseId')
  @ApiOperation({ summary: 'Update use case' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 200, description: 'Use case updated' })
  @ApiResponse({ status: 404, description: 'Use case not found' })
  async updateUseCase(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Body()
    body: {
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
  ) {
    const useCase = await this.useCaseService.updateUseCase(
      ctx.tenantId,
      useCaseId as UseCaseId,
      body
    );
    if (!useCase) {
      throw new NotFoundException(`Use case not found: ${useCaseId}`);
    }
    return useCase;
  }

  @Post(':useCaseId/publish')
  @ApiOperation({ summary: 'Publish use case' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 200, description: 'Use case published' })
  async publishUseCase(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string
  ) {
    const useCase = await this.useCaseService.publishUseCase(
      ctx.tenantId,
      useCaseId as UseCaseId
    );
    if (!useCase) {
      throw new NotFoundException(`Use case not found: ${useCaseId}`);
    }
    return useCase;
  }

  @Delete(':useCaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete use case' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 204, description: 'Use case deleted' })
  async deleteUseCase(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string
  ) {
    await this.useCaseService.deleteUseCase(ctx.tenantId, useCaseId as UseCaseId);
  }

  // ============================================================================
  // ARTIFACTS
  // ============================================================================

  @Post(':useCaseId/artifacts')
  @ApiOperation({ summary: 'Add artifact to use case' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 201, description: 'Artifact added' })
  async addArtifact(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Body()
    body: {
      artifactId: string;
      role: string;
      description?: string;
      orderIndex?: number;
    }
  ) {
    return this.useCaseService.addArtifact(ctx.tenantId, useCaseId as UseCaseId, {
      artifactId: body.artifactId as ArtifactId,
      role: body.role,
      description: body.description,
      orderIndex: body.orderIndex,
    });
  }

  @Delete(':useCaseId/artifacts/:artifactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove artifact from use case' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 204, description: 'Artifact removed' })
  async removeArtifact(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Param('artifactId') artifactId: string
  ) {
    await this.useCaseService.removeArtifact(
      ctx.tenantId,
      useCaseId as UseCaseId,
      artifactId as ArtifactId
    );
  }

  @Patch(':useCaseId/artifacts/reorder')
  @ApiOperation({ summary: 'Reorder artifacts' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 200, description: 'Artifacts reordered' })
  async reorderArtifacts(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Body()
    body: {
      order: Array<{ artifactId: string; orderIndex: number }>;
    }
  ) {
    await this.useCaseService.reorderArtifacts(
      ctx.tenantId,
      useCaseId as UseCaseId,
      body.order.map(o => ({ artifactId: o.artifactId as ArtifactId, orderIndex: o.orderIndex }))
    );
    return { success: true };
  }

  // ============================================================================
  // IMPLEMENTATIONS
  // ============================================================================

  @Get('implementations')
  @ApiOperation({ summary: 'List implementations' })
  @ApiQuery({ name: 'useCaseId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Implementations list' })
  async listImplementations(
    @TenantContext() ctx: TenantContextData,
    @Query('useCaseId') useCaseId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: ImplementationStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.useCaseService.listImplementations(ctx.tenantId, {
      useCaseId: useCaseId as UseCaseId | undefined,
      customerId: customerId as CustomerId | undefined,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post(':useCaseId/implementations')
  @ApiOperation({ summary: 'Start implementation' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiResponse({ status: 201, description: 'Implementation started' })
  async startImplementation(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Body()
    body: {
      customerId: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.useCaseService.startImplementation(ctx.tenantId, useCaseId as UseCaseId, {
      customerId: body.customerId as CustomerId,
      notes: body.notes,
      metadata: body.metadata,
    });
  }

  @Patch(':useCaseId/implementations/:customerId')
  @ApiOperation({ summary: 'Update implementation' })
  @ApiParam({ name: 'useCaseId', description: 'Use Case ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Implementation updated' })
  async updateImplementation(
    @TenantContext() ctx: TenantContextData,
    @Param('useCaseId') useCaseId: string,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      status?: ImplementationStatus;
      progress?: number;
      notes?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const impl = await this.useCaseService.updateImplementation(
      ctx.tenantId,
      useCaseId as UseCaseId,
      customerId as CustomerId,
      body
    );
    if (!impl) {
      throw new NotFoundException(`Implementation not found`);
    }
    return impl;
  }
}
