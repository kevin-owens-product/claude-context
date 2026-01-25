/**
 * Projects Controller - REST API for project management
 * @prompt-id forge-v4.1:api:controller:projects:001
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
  ProjectService,
  type TenantId,
  type UserId,
  type ProjectId,
  type ProjectStatus,
  type GoalPriority,
  type GoalStatus,
  type ConstraintCategory,
  type ConstraintSeverity,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Projects')
@Controller('context/projects')
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Projects list' })
  async listProjects(
    @TenantContext() ctx: TenantContextData,
    @Query('status') status?: ProjectStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.projectService.listProjects(ctx.tenantId, ctx.userId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string
  ) {
    const project = await this.projectService.getProject(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId
    );
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
    return project;
  }

  @Post()
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async createProject(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      name: string;
      description?: string;
      workspaceId?: string;
      goals?: Array<{
        description: string;
        successCriteria?: string[];
        priority?: GoalPriority;
      }>;
      constraints?: Array<{
        description: string;
        category: ConstraintCategory;
        severity?: ConstraintSeverity;
        verificationMethod?: string;
      }>;
    }
  ) {
    return this.projectService.createProject(ctx.tenantId, ctx.userId, body as any);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }
  ) {
    const project = await this.projectService.updateProject(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      body
    );
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }
    return project;
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  async deleteProject(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string
  ) {
    await this.projectService.deleteProject(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId
    );
  }

  // ============================================================================
  // GOALS
  // ============================================================================

  @Post(':projectId/goals')
  @ApiOperation({ summary: 'Add goal to project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Goal created' })
  async addGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      description: string;
      successCriteria?: string[];
      priority?: GoalPriority;
      parentGoalId?: string;
    }
  ) {
    return this.projectService.addGoal(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      body
    );
  }

  @Patch(':projectId/goals/:goalId')
  @ApiOperation({ summary: 'Update goal' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal updated' })
  async updateGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Param('goalId') goalId: string,
    @Body()
    body: {
      description?: string;
      successCriteria?: string[];
      priority?: GoalPriority;
      status?: GoalStatus;
    }
  ) {
    const goal = await this.projectService.updateGoal(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      goalId,
      body
    );
    if (!goal) {
      throw new NotFoundException(`Goal not found: ${goalId}`);
    }
    return goal;
  }

  @Delete(':projectId/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete goal' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 204, description: 'Goal deleted' })
  async deleteGoal(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Param('goalId') goalId: string
  ) {
    await this.projectService.deleteGoal(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      goalId
    );
  }

  // ============================================================================
  // CONSTRAINTS
  // ============================================================================

  @Post(':projectId/constraints')
  @ApiOperation({ summary: 'Add constraint to project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Constraint created' })
  async addConstraint(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      description: string;
      category: ConstraintCategory;
      severity?: ConstraintSeverity;
      verificationMethod?: string;
    }
  ) {
    return this.projectService.addConstraint(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      body
    );
  }

  @Delete(':projectId/constraints/:constraintId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete constraint' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'constraintId', description: 'Constraint ID' })
  @ApiResponse({ status: 204, description: 'Constraint deleted' })
  async deleteConstraint(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Param('constraintId') constraintId: string
  ) {
    await this.projectService.deleteConstraint(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      constraintId
    );
  }

  // ============================================================================
  // DECISIONS
  // ============================================================================

  @Post(':projectId/decisions')
  @ApiOperation({ summary: 'Record decision for project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Decision recorded' })
  async addDecision(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      description: string;
      rationale?: string;
      alternativesConsidered?: string[];
    }
  ) {
    return this.projectService.addDecision(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      body
    );
  }

  @Post(':projectId/decisions/:decisionId/reverse')
  @ApiOperation({ summary: 'Reverse a decision' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'decisionId', description: 'Decision ID' })
  @ApiResponse({ status: 200, description: 'Decision reversed' })
  async reverseDecision(
    @TenantContext() ctx: TenantContextData,
    @Param('projectId') projectId: string,
    @Param('decisionId') decisionId: string
  ) {
    const decision = await this.projectService.reverseDecision(
      ctx.tenantId,
      ctx.userId,
      projectId as ProjectId,
      decisionId
    );
    if (!decision) {
      throw new NotFoundException(`Decision not found: ${decisionId}`);
    }
    return decision;
  }
}
