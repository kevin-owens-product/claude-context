/**
 * Feature Requests Controller - REST API for feature backlog management
 * @prompt-id forge-v4.1:api:controller:feature-requests:001
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
  FeatureRequestService,
  type TenantId,
  type CustomerId,
  type FeatureRequestId,
  type FeatureRequestStatus,
  type FeatureRequestPriority,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: string;
}

@ApiTags('Feature Requests')
@Controller('feature-requests')
export class FeatureRequestsController {
  constructor(private readonly featureRequestService: FeatureRequestService) {}

  @Get()
  @ApiOperation({ summary: 'List feature requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['priorityScore', 'voteCount', 'totalMRR', 'createdAt'] })
  @ApiResponse({ status: 200, description: 'Feature requests list' })
  async listFeatureRequests(
    @TenantContext() ctx: TenantContextData,
    @Query('status') status?: FeatureRequestStatus,
    @Query('priority') priority?: FeatureRequestPriority,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.featureRequestService.listFeatureRequests(ctx.tenantId, {
      status,
      priority,
      category,
      sortBy: sortBy as any,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':featureId')
  @ApiOperation({ summary: 'Get feature request by ID' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 200, description: 'Feature request details' })
  @ApiResponse({ status: 404, description: 'Feature request not found' })
  async getFeatureRequest(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string
  ) {
    const feature = await this.featureRequestService.getFeatureRequest(
      ctx.tenantId,
      featureId as FeatureRequestId
    );
    if (!feature) {
      throw new NotFoundException(`Feature request not found: ${featureId}`);
    }
    return feature;
  }

  @Get(':featureId/impact')
  @ApiOperation({ summary: 'Get feature request impact analysis' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 200, description: 'Impact analysis' })
  @ApiResponse({ status: 404, description: 'Feature request not found' })
  async getImpactAnalysis(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string
  ) {
    const analysis = await this.featureRequestService.getImpactAnalysis(
      ctx.tenantId,
      featureId as FeatureRequestId
    );
    if (!analysis) {
      throw new NotFoundException(`Feature request not found: ${featureId}`);
    }
    return analysis;
  }

  @Post()
  @ApiOperation({ summary: 'Create feature request' })
  @ApiResponse({ status: 201, description: 'Feature request created' })
  async createFeatureRequest(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      title: string;
      description: string;
      category?: string;
      priority?: FeatureRequestPriority;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.featureRequestService.createFeatureRequest(ctx.tenantId, {
      ...body,
      createdById: ctx.userId,
    });
  }

  @Patch(':featureId')
  @ApiOperation({ summary: 'Update feature request' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 200, description: 'Feature request updated' })
  @ApiResponse({ status: 404, description: 'Feature request not found' })
  async updateFeatureRequest(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      category?: string;
      status?: FeatureRequestStatus;
      priority?: FeatureRequestPriority;
      effortEstimate?: string;
      linkedGoalIds?: string[];
      linkedSliceIds?: string[];
      duplicateOfId?: string;
      targetReleaseId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const feature = await this.featureRequestService.updateFeatureRequest(
      ctx.tenantId,
      featureId as FeatureRequestId,
      body as any
    );
    if (!feature) {
      throw new NotFoundException(`Feature request not found: ${featureId}`);
    }
    return feature;
  }

  @Delete(':featureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete feature request' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 204, description: 'Feature request deleted' })
  async deleteFeatureRequest(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string
  ) {
    await this.featureRequestService.deleteFeatureRequest(
      ctx.tenantId,
      featureId as FeatureRequestId
    );
  }

  // ============================================================================
  // VOTING
  // ============================================================================

  @Post(':featureId/votes')
  @ApiOperation({ summary: 'Add vote to feature request' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 201, description: 'Vote added' })
  async addVote(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Body()
    body: {
      customerId: string;
      urgency?: string;
      businessImpact?: string;
      useCaseDescription?: string;
    }
  ) {
    return this.featureRequestService.addVote(ctx.tenantId, featureId as FeatureRequestId, {
      customerId: body.customerId as CustomerId,
      urgency: body.urgency as any,
      businessImpact: body.businessImpact,
      useCaseDescription: body.useCaseDescription,
    });
  }

  @Patch(':featureId/votes/:customerId')
  @ApiOperation({ summary: 'Update vote' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Vote updated' })
  async updateVote(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      urgency?: string;
      businessImpact?: string;
      useCaseDescription?: string;
    }
  ) {
    const vote = await this.featureRequestService.updateVote(
      ctx.tenantId,
      featureId as FeatureRequestId,
      customerId as CustomerId,
      body as any
    );
    if (!vote) {
      throw new NotFoundException(`Vote not found`);
    }
    return vote;
  }

  @Delete(':featureId/votes/:customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove vote' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 204, description: 'Vote removed' })
  async removeVote(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Param('customerId') customerId: string
  ) {
    await this.featureRequestService.removeVote(
      ctx.tenantId,
      featureId as FeatureRequestId,
      customerId as CustomerId
    );
  }

  // ============================================================================
  // LINKING
  // ============================================================================

  @Post(':featureId/link-goal/:goalId')
  @ApiOperation({ summary: 'Link feature request to goal' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Linked to goal' })
  async linkToGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Param('goalId') goalId: string
  ) {
    return this.featureRequestService.linkToGoal(
      ctx.tenantId,
      featureId as FeatureRequestId,
      goalId
    );
  }

  @Post(':featureId/link-slice/:sliceId')
  @ApiOperation({ summary: 'Link feature request to slice' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, description: 'Linked to slice' })
  async linkToSlice(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Param('sliceId') sliceId: string
  ) {
    return this.featureRequestService.linkToSlice(
      ctx.tenantId,
      featureId as FeatureRequestId,
      sliceId
    );
  }

  @Post(':featureId/mark-released/:releaseId')
  @ApiOperation({ summary: 'Mark feature request as released' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Marked as released' })
  async markAsReleased(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string,
    @Param('releaseId') releaseId: string
  ) {
    return this.featureRequestService.markAsReleased(
      ctx.tenantId,
      featureId as FeatureRequestId,
      releaseId
    );
  }

  // ============================================================================
  // PRIORITIZATION
  // ============================================================================

  @Post(':featureId/recalculate')
  @ApiOperation({ summary: 'Recalculate feature request metrics' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 200, description: 'Metrics recalculated' })
  async recalculateMetrics(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string
  ) {
    await this.featureRequestService.recalculateFeatureMetrics(
      featureId as FeatureRequestId
    );
    return { success: true };
  }

  @Post('recalculate-all')
  @ApiOperation({ summary: 'Recalculate all feature request priorities' })
  @ApiResponse({ status: 200, description: 'All priorities recalculated' })
  async recalculateAllPriorities(@TenantContext() ctx: TenantContextData) {
    const count = await this.featureRequestService.recalculateAllPriorities(ctx.tenantId);
    return { updated: count };
  }
}
