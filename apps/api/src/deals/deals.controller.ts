/**
 * Deals Controller - REST API for sales pipeline management
 * @prompt-id forge-v4.1:api:controller:deals:001
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
  DealService,
  type TenantId,
  type UserId,
  type CustomerId,
  type DealId,
  type DealStage,
  type ActivityType,
  type FeatureRequestId,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  @ApiOperation({ summary: 'List deals' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'minValue', required: false })
  @ApiQuery({ name: 'hasBlockers', required: false })
  @ApiResponse({ status: 200, description: 'Deals list' })
  async listDeals(
    @TenantContext() ctx: TenantContextData,
    @Query('customerId') customerId?: string,
    @Query('stage') stage?: DealStage,
    @Query('ownerId') ownerId?: string,
    @Query('minValue') minValue?: string,
    @Query('hasBlockers') hasBlockers?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.dealService.listDeals(ctx.tenantId, {
      customerId: customerId as CustomerId | undefined,
      stage,
      ownerId: ownerId as UserId | undefined,
      minValue: minValue ? parseFloat(minValue) : undefined,
      hasBlockers: hasBlockers === 'true' ? true : hasBlockers === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get pipeline metrics' })
  @ApiResponse({ status: 200, description: 'Pipeline metrics' })
  async getPipelineMetrics(@TenantContext() ctx: TenantContextData) {
    return this.dealService.getPipelineMetrics(ctx.tenantId);
  }

  @Get('by-blocker/:featureId')
  @ApiOperation({ summary: 'Get deals blocked by feature' })
  @ApiParam({ name: 'featureId', description: 'Feature Request ID' })
  @ApiResponse({ status: 200, description: 'Blocked deals' })
  async getDealsByBlocker(
    @TenantContext() ctx: TenantContextData,
    @Param('featureId') featureId: string
  ) {
    return this.dealService.getDealsByBlocker(ctx.tenantId, featureId as FeatureRequestId);
  }

  @Get(':dealId')
  @ApiOperation({ summary: 'Get deal by ID' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal details' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async getDeal(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string
  ) {
    const deal = await this.dealService.getDeal(ctx.tenantId, dealId as DealId);
    if (!deal) {
      throw new NotFoundException(`Deal not found: ${dealId}`);
    }
    return deal;
  }

  @Post()
  @ApiOperation({ summary: 'Create deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async createDeal(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      customerId: string;
      name: string;
      description?: string;
      value: number;
      currency?: string;
      closeDate?: string;
      sourceType?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.dealService.createDeal(ctx.tenantId, {
      customerId: body.customerId as CustomerId,
      name: body.name,
      description: body.description,
      value: body.value,
      currency: body.currency,
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
      ownerId: ctx.userId,
      sourceType: body.sourceType as any,
      metadata: body.metadata,
    });
  }

  @Patch(':dealId')
  @ApiOperation({ summary: 'Update deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal updated' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async updateDeal(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      stage?: DealStage;
      probability?: number;
      value?: number;
      closeDate?: string;
      ownerId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const deal = await this.dealService.updateDeal(ctx.tenantId, dealId as DealId, {
      ...body,
      closeDate: body.closeDate ? new Date(body.closeDate) : undefined,
      ownerId: body.ownerId as UserId | undefined,
    });
    if (!deal) {
      throw new NotFoundException(`Deal not found: ${dealId}`);
    }
    return deal;
  }

  @Post(':dealId/advance')
  @ApiOperation({ summary: 'Advance deal to next stage' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal advanced' })
  async advanceStage(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string
  ) {
    const deal = await this.dealService.advanceStage(ctx.tenantId, dealId as DealId);
    if (!deal) {
      throw new NotFoundException(`Deal not found: ${dealId}`);
    }
    return deal;
  }

  @Post(':dealId/close')
  @ApiOperation({ summary: 'Close deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal closed' })
  async closeDeal(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Body()
    body: {
      won: boolean;
      reason?: string;
    }
  ) {
    const deal = await this.dealService.closeDeal(
      ctx.tenantId,
      dealId as DealId,
      body.won,
      body.reason
    );
    if (!deal) {
      throw new NotFoundException(`Deal not found: ${dealId}`);
    }
    return deal;
  }

  @Delete(':dealId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 204, description: 'Deal deleted' })
  async deleteDeal(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string
  ) {
    await this.dealService.deleteDeal(ctx.tenantId, dealId as DealId);
  }

  // ============================================================================
  // BLOCKERS
  // ============================================================================

  @Post(':dealId/blockers')
  @ApiOperation({ summary: 'Add blocker to deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 201, description: 'Blocker added' })
  async addBlocker(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Body()
    body: {
      featureRequestId: string;
      description?: string;
      impact?: string;
    }
  ) {
    return this.dealService.addBlocker(ctx.tenantId, dealId as DealId, {
      featureRequestId: body.featureRequestId as FeatureRequestId,
      description: body.description,
      impact: body.impact as any,
    });
  }

  @Post(':dealId/blockers/:blockerId/resolve')
  @ApiOperation({ summary: 'Resolve blocker' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiParam({ name: 'blockerId', description: 'Blocker ID' })
  @ApiResponse({ status: 200, description: 'Blocker resolved' })
  async resolveBlocker(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Param('blockerId') blockerId: string
  ) {
    const blocker = await this.dealService.resolveBlocker(
      ctx.tenantId,
      dealId as DealId,
      blockerId
    );
    if (!blocker) {
      throw new NotFoundException(`Blocker not found: ${blockerId}`);
    }
    return blocker;
  }

  @Delete(':dealId/blockers/:blockerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove blocker' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiParam({ name: 'blockerId', description: 'Blocker ID' })
  @ApiResponse({ status: 204, description: 'Blocker removed' })
  async removeBlocker(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Param('blockerId') blockerId: string
  ) {
    await this.dealService.removeBlocker(ctx.tenantId, dealId as DealId, blockerId);
  }

  // ============================================================================
  // ACTIVITIES
  // ============================================================================

  @Get(':dealId/activities')
  @ApiOperation({ summary: 'List deal activities' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Activities list' })
  async listActivities(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Query('type') type?: ActivityType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.dealService.listActivities(ctx.tenantId, dealId as DealId, {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post(':dealId/activities')
  @ApiOperation({ summary: 'Record deal activity' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  @ApiResponse({ status: 201, description: 'Activity recorded' })
  async recordActivity(
    @TenantContext() ctx: TenantContextData,
    @Param('dealId') dealId: string,
    @Body()
    body: {
      type: ActivityType;
      subject: string;
      description?: string;
      occurredAt?: string;
      duration?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.dealService.recordActivity(ctx.tenantId, dealId as DealId, {
      ...body,
      actorId: ctx.userId,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
  }
}
