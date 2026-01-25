/**
 * Outcomes Controller - REST API for OKRs and customer outcomes
 * @prompt-id forge-v4.1:api:controller:outcomes:001
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
  OutcomesService,
  type TenantId,
  type UserId,
  type CustomerId,
  type ObjectiveId,
  type KeyResultId,
  type ObjectiveType,
  type ObjectiveLevel,
  type ObjectiveStatus,
  type OutcomeCategory,
  type OutcomeStatus,
  type ContributionStatus,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Outcomes')
@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly outcomesService: OutcomesService) {}

  // ============================================================================
  // OBJECTIVES (OKRs)
  // ============================================================================

  @Get('objectives')
  @ApiOperation({ summary: 'List objectives' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiResponse({ status: 200, description: 'Objectives list' })
  async listObjectives(
    @TenantContext() ctx: TenantContextData,
    @Query('type') type?: ObjectiveType,
    @Query('level') level?: ObjectiveLevel,
    @Query('status') status?: ObjectiveStatus,
    @Query('ownerId') ownerId?: string,
    @Query('parentId') parentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.outcomesService.listObjectives(ctx.tenantId, {
      type,
      level,
      status,
      ownerId: ownerId as UserId | undefined,
      parentId: parentId as ObjectiveId | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get OKR dashboard' })
  @ApiResponse({ status: 200, description: 'OKR dashboard' })
  async getOKRDashboard(@TenantContext() ctx: TenantContextData) {
    return this.outcomesService.getOKRDashboard(ctx.tenantId);
  }

  @Get('objectives/:objectiveId')
  @ApiOperation({ summary: 'Get objective by ID' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 200, description: 'Objective details' })
  @ApiResponse({ status: 404, description: 'Objective not found' })
  async getObjective(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string
  ) {
    const objective = await this.outcomesService.getObjective(
      ctx.tenantId,
      objectiveId as ObjectiveId
    );
    if (!objective) {
      throw new NotFoundException(`Objective not found: ${objectiveId}`);
    }
    return objective;
  }

  @Post('objectives')
  @ApiOperation({ summary: 'Create objective' })
  @ApiResponse({ status: 201, description: 'Objective created' })
  async createObjective(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      title: string;
      description?: string;
      type?: ObjectiveType;
      level?: ObjectiveLevel;
      parentId?: string;
      startDate: string;
      endDate: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.outcomesService.createObjective(ctx.tenantId, {
      ...body,
      ownerId: ctx.userId,
      parentId: body.parentId as ObjectiveId | undefined,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Patch('objectives/:objectiveId')
  @ApiOperation({ summary: 'Update objective' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 200, description: 'Objective updated' })
  @ApiResponse({ status: 404, description: 'Objective not found' })
  async updateObjective(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: ObjectiveStatus;
      ownerId?: string;
      progress?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    const objective = await this.outcomesService.updateObjective(
      ctx.tenantId,
      objectiveId as ObjectiveId,
      {
        ...body,
        ownerId: body.ownerId as UserId | undefined,
      }
    );
    if (!objective) {
      throw new NotFoundException(`Objective not found: ${objectiveId}`);
    }
    return objective;
  }

  @Delete('objectives/:objectiveId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete objective' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 204, description: 'Objective deleted' })
  async deleteObjective(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string
  ) {
    await this.outcomesService.deleteObjective(ctx.tenantId, objectiveId as ObjectiveId);
  }

  // ============================================================================
  // KEY RESULTS
  // ============================================================================

  @Post('objectives/:objectiveId/key-results')
  @ApiOperation({ summary: 'Add key result to objective' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiResponse({ status: 201, description: 'Key result created' })
  async addKeyResult(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      metricType?: string;
      unit?: string;
      startValue?: number;
      targetValue: number;
      direction?: string;
    }
  ) {
    return this.outcomesService.addKeyResult(
      ctx.tenantId,
      objectiveId as ObjectiveId,
      body as any
    );
  }

  @Patch('objectives/:objectiveId/key-results/:keyResultId')
  @ApiOperation({ summary: 'Update key result' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'keyResultId', description: 'Key Result ID' })
  @ApiResponse({ status: 200, description: 'Key result updated' })
  async updateKeyResult(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Param('keyResultId') keyResultId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      targetValue?: number;
      unit?: string;
    }
  ) {
    const keyResult = await this.outcomesService.updateKeyResult(
      ctx.tenantId,
      objectiveId as ObjectiveId,
      keyResultId as KeyResultId,
      body
    );
    if (!keyResult) {
      throw new NotFoundException(`Key result not found: ${keyResultId}`);
    }
    return keyResult;
  }

  @Delete('objectives/:objectiveId/key-results/:keyResultId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete key result' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'keyResultId', description: 'Key Result ID' })
  @ApiResponse({ status: 204, description: 'Key result deleted' })
  async deleteKeyResult(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Param('keyResultId') keyResultId: string
  ) {
    await this.outcomesService.deleteKeyResult(
      ctx.tenantId,
      objectiveId as ObjectiveId,
      keyResultId as KeyResultId
    );
  }

  // ============================================================================
  // MEASUREMENTS
  // ============================================================================

  @Post('objectives/:objectiveId/key-results/:keyResultId/measurements')
  @ApiOperation({ summary: 'Record key result measurement' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'keyResultId', description: 'Key Result ID' })
  @ApiResponse({ status: 201, description: 'Measurement recorded' })
  async recordMeasurement(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Param('keyResultId') keyResultId: string,
    @Body()
    body: {
      value: number;
      note?: string;
    }
  ) {
    return this.outcomesService.recordMeasurement(
      ctx.tenantId,
      objectiveId as ObjectiveId,
      keyResultId as KeyResultId,
      {
        ...body,
        measuredById: ctx.userId,
      }
    );
  }

  // ============================================================================
  // SLICE LINKING
  // ============================================================================

  @Post('objectives/:objectiveId/link-slice/:sliceId')
  @ApiOperation({ summary: 'Link slice to objective' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, description: 'Slice linked' })
  async linkSlice(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Param('sliceId') sliceId: string,
    @Body()
    body?: {
      contribution?: number;
      notes?: string;
    }
  ) {
    return this.outcomesService.linkSliceToObjective(
      ctx.tenantId,
      sliceId,
      objectiveId as ObjectiveId,
      body?.contribution,
      body?.notes
    );
  }

  @Patch('objectives/:objectiveId/slices/:sliceId/status')
  @ApiOperation({ summary: 'Update slice objective status' })
  @ApiParam({ name: 'objectiveId', description: 'Objective ID' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateSliceObjectiveStatus(
    @TenantContext() ctx: TenantContextData,
    @Param('objectiveId') objectiveId: string,
    @Param('sliceId') sliceId: string,
    @Body()
    body: {
      status: ContributionStatus;
    }
  ) {
    const sliceObjective = await this.outcomesService.updateSliceObjectiveStatus(
      ctx.tenantId,
      sliceId,
      objectiveId as ObjectiveId,
      body.status
    );
    if (!sliceObjective) {
      throw new NotFoundException(`Slice objective not found`);
    }
    return sliceObjective;
  }

  // ============================================================================
  // CUSTOMER OUTCOMES
  // ============================================================================

  @Get('customer-outcomes')
  @ApiOperation({ summary: 'List customer outcomes' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Customer outcomes list' })
  async listCustomerOutcomes(
    @TenantContext() ctx: TenantContextData,
    @Query('customerId') customerId?: string,
    @Query('category') category?: OutcomeCategory,
    @Query('status') status?: OutcomeStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.outcomesService.listCustomerOutcomes(ctx.tenantId, {
      customerId: customerId as CustomerId | undefined,
      category,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('customer-outcomes')
  @ApiOperation({ summary: 'Create customer outcome' })
  @ApiResponse({ status: 201, description: 'Customer outcome created' })
  async createCustomerOutcome(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      customerId: string;
      title: string;
      description: string;
      category: OutcomeCategory;
      quantifiedValue?: number;
      valueUnit?: string;
      linkedArtifactIds?: string[];
      linkedSliceIds?: string[];
      linkedUseCaseId?: string;
    }
  ) {
    return this.outcomesService.createCustomerOutcome(ctx.tenantId, {
      ...body,
      customerId: body.customerId as CustomerId,
    });
  }

  @Post('customer-outcomes/:outcomeId/verify')
  @ApiOperation({ summary: 'Verify customer outcome' })
  @ApiParam({ name: 'outcomeId', description: 'Outcome ID' })
  @ApiResponse({ status: 200, description: 'Outcome verified' })
  async verifyCustomerOutcome(
    @TenantContext() ctx: TenantContextData,
    @Param('outcomeId') outcomeId: string
  ) {
    const outcome = await this.outcomesService.verifyCustomerOutcome(
      ctx.tenantId,
      outcomeId as any,
      ctx.userId
    );
    if (!outcome) {
      throw new NotFoundException(`Outcome not found: ${outcomeId}`);
    }
    return outcome;
  }
}
