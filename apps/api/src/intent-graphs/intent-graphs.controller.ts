/**
 * Intent Graphs Controller - REST API for intent graph management
 * @prompt-id forge-v4.1:api:controller:intent-graphs:001
 * @generated-at 2026-01-23T00:00:00Z
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
  IntentGraphService,
  type TenantId,
  type UserId,
  type ProjectId,
  type IntentGraphId,
  type IntentGraphStatus,
  type GoalPriority,
  type GoalStatus,
  type ConstraintCategory,
  type ConstraintSeverity,
  type ContextCategory,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Intent Graphs')
@Controller('intent-graphs')
export class IntentGraphsController {
  constructor(private readonly intentGraphService: IntentGraphService) {}

  @Get()
  @ApiOperation({ summary: 'List intent graphs for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Intent graphs list' })
  async listIntentGraphs(
    @TenantContext() ctx: TenantContextData,
    @Query('projectId') projectId: string,
    @Query('status') status?: IntentGraphStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.intentGraphService.listIntentGraphs(
      ctx.tenantId,
      projectId as ProjectId,
      {
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }
    );
  }

  @Get(':graphId')
  @ApiOperation({ summary: 'Get intent graph by ID' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 200, description: 'Intent graph details' })
  @ApiResponse({ status: 404, description: 'Intent graph not found' })
  async getIntentGraph(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string
  ) {
    const graph = await this.intentGraphService.getIntentGraph(
      ctx.tenantId,
      graphId as IntentGraphId
    );
    if (!graph) {
      throw new NotFoundException(`Intent graph not found: ${graphId}`);
    }
    return graph;
  }

  @Post()
  @ApiOperation({ summary: 'Create new intent graph' })
  @ApiResponse({ status: 201, description: 'Intent graph created' })
  async createIntentGraph(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      projectId: string;
      name: string;
      description?: string;
    }
  ) {
    return this.intentGraphService.createIntentGraph(ctx.tenantId, ctx.userId, {
      projectId: body.projectId as ProjectId,
      name: body.name,
      description: body.description,
    });
  }

  @Patch(':graphId')
  @ApiOperation({ summary: 'Update intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 200, description: 'Intent graph updated' })
  async updateIntentGraph(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: IntentGraphStatus;
    }
  ) {
    const graph = await this.intentGraphService.updateIntentGraph(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
    if (!graph) {
      throw new NotFoundException(`Intent graph not found: ${graphId}`);
    }
    return graph;
  }

  @Delete(':graphId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 204, description: 'Intent graph deleted' })
  async deleteIntentGraph(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string
  ) {
    await this.intentGraphService.deleteIntentGraph(
      ctx.tenantId,
      graphId as IntentGraphId
    );
  }

  @Get(':graphId/validate')
  @ApiOperation({ summary: 'Validate intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateIntentGraph(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string
  ) {
    return this.intentGraphService.validateIntentGraph(
      ctx.tenantId,
      graphId as IntentGraphId
    );
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  @Post(':graphId/goals')
  @ApiOperation({ summary: 'Add goal to intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 201, description: 'Goal created' })
  async addGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      description: string;
      successCriteria?: string[];
      priority?: GoalPriority;
      parentGoalId?: string;
      linkedConstraintIds?: string[];
      linkedBehaviorIds?: string[];
      rationale?: string;
    }
  ) {
    return this.intentGraphService.addGoal(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
  }

  @Patch(':graphId/goals/:goalId')
  @ApiOperation({ summary: 'Update goal' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal updated' })
  async updateGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Param('goalId') goalId: string,
    @Body()
    body: {
      description?: string;
      successCriteria?: string[];
      priority?: GoalPriority;
      status?: GoalStatus;
      userConfirmed?: boolean;
    }
  ) {
    const goal = await this.intentGraphService.updateGoal(
      ctx.tenantId,
      graphId as IntentGraphId,
      goalId,
      body
    );
    if (!goal) {
      throw new NotFoundException(`Goal not found: ${goalId}`);
    }
    return goal;
  }

  // ============================================================================
  // CONSTRAINTS
  // ============================================================================

  @Post(':graphId/constraints')
  @ApiOperation({ summary: 'Add constraint to intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 201, description: 'Constraint created' })
  async addConstraint(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      description: string;
      category: ConstraintCategory;
      severity?: ConstraintSeverity;
      verificationMethod?: string;
      linkedGoalIds?: string[];
      linkedEntityIds?: string[];
      linkedBehaviorIds?: string[];
    }
  ) {
    return this.intentGraphService.addConstraint(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
  }

  // ============================================================================
  // ENTITIES
  // ============================================================================

  @Post(':graphId/entities')
  @ApiOperation({ summary: 'Add entity to intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 201, description: 'Entity created' })
  async addEntity(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      attributes?: any[];
      relationships?: any[];
      stateMachine?: any;
      validationRules?: any[];
    }
  ) {
    return this.intentGraphService.addEntity(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
  }

  // ============================================================================
  // BEHAVIORS
  // ============================================================================

  @Post(':graphId/behaviors')
  @ApiOperation({ summary: 'Add behavior to intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 201, description: 'Behavior created' })
  async addBehavior(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      trigger: any;
      preconditions?: string[];
      steps?: any[];
      postconditions?: string[];
      errorHandlers?: any[];
      linkedGoalIds?: string[];
      linkedEntityIds?: string[];
      linkedConstraintIds?: string[];
    }
  ) {
    return this.intentGraphService.addBehavior(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
  }

  // ============================================================================
  // CONTEXTS
  // ============================================================================

  @Post(':graphId/contexts')
  @ApiOperation({ summary: 'Add context to intent graph' })
  @ApiParam({ name: 'graphId', description: 'Intent Graph ID' })
  @ApiResponse({ status: 201, description: 'Context created' })
  async addContext(
    @TenantContext() ctx: TenantContextData,
    @Param('graphId') graphId: string,
    @Body()
    body: {
      category: ContextCategory;
      description: string;
      implications?: string[];
      linkedNodeIds?: string[];
    }
  ) {
    return this.intentGraphService.addContext(
      ctx.tenantId,
      graphId as IntentGraphId,
      body
    );
  }
}
