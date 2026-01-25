/**
 * Workflows Controller - REST API for workflow automation
 * @prompt-id forge-v4.1:api:controller:workflows:001
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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  WorkflowService,
  type TenantId,
  type UserId,
  type WorkflowId,
  type WorkflowExecutionId,
  type WorkflowTriggerType,
  type WorkflowExecutionStatus,
  type CreateWorkflowRequest,
  type UpdateWorkflowRequest,
  type TriggerContext,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  // ============================================================================
  // WORKFLOW CRUD
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List workflows' })
  @ApiQuery({ name: 'triggerType', required: false, enum: ['EVENT', 'SIGNAL', 'SCHEDULE', 'MANUAL'] })
  @ApiQuery({ name: 'isEnabled', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async listWorkflows(
    @TenantContext() ctx: TenantContextData,
    @Query('triggerType') triggerType?: WorkflowTriggerType,
    @Query('isEnabled') isEnabled?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.workflowService.listWorkflows(ctx.tenantId, {
      triggerType,
      isEnabled: isEnabled === 'true' ? true : isEnabled === 'false' ? false : undefined,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':workflowId')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string
  ) {
    const workflow = await this.workflowService.getWorkflow(ctx.tenantId, workflowId as WorkflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }
    return workflow;
  }

  @Post()
  @ApiOperation({ summary: 'Create workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  @ApiResponse({ status: 400, description: 'Invalid workflow configuration' })
  async createWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Body() body: Omit<CreateWorkflowRequest, 'createdById'>
  ) {
    try {
      return await this.workflowService.createWorkflow(ctx.tenantId, {
        ...body,
        createdById: ctx.userId,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':workflowId')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Invalid workflow configuration' })
  async updateWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowRequest
  ) {
    try {
      const workflow = await this.workflowService.updateWorkflow(
        ctx.tenantId,
        workflowId as WorkflowId,
        body
      );
      if (!workflow) {
        throw new NotFoundException(`Workflow not found: ${workflowId}`);
      }
      return workflow;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':workflowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 204, description: 'Workflow deleted' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async deleteWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string
  ) {
    const deleted = await this.workflowService.deleteWorkflow(ctx.tenantId, workflowId as WorkflowId);
    if (!deleted) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }
  }

  // ============================================================================
  // WORKFLOW MANAGEMENT
  // ============================================================================

  @Post(':workflowId/enable')
  @ApiOperation({ summary: 'Enable workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow enabled' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async enableWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string
  ) {
    const workflow = await this.workflowService.enableWorkflow(ctx.tenantId, workflowId as WorkflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }
    return workflow;
  }

  @Post(':workflowId/disable')
  @ApiOperation({ summary: 'Disable workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow disabled' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async disableWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string
  ) {
    const workflow = await this.workflowService.disableWorkflow(ctx.tenantId, workflowId as WorkflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }
    return workflow;
  }

  @Post(':workflowId/test')
  @ApiOperation({ summary: 'Test workflow with mock data' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Test results' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async testWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string,
    @Body() mockData: TriggerContext
  ) {
    try {
      return await this.workflowService.testWorkflow(
        ctx.tenantId,
        workflowId as WorkflowId,
        mockData
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Workflow not found: ${workflowId}`);
      }
      throw error;
    }
  }

  @Post(':workflowId/execute')
  @ApiOperation({ summary: 'Manually execute workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Execution started' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async executeWorkflow(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string,
    @Body() triggerData: TriggerContext
  ) {
    try {
      return await this.workflowService.executeWorkflow(
        ctx.tenantId,
        workflowId as WorkflowId,
        triggerData
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Workflow not found: ${workflowId}`);
      }
      throw error;
    }
  }

  // ============================================================================
  // EXECUTIONS
  // ============================================================================

  @Get(':workflowId/executions')
  @ApiOperation({ summary: 'List workflow executions' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Executions list' })
  async listExecutions(
    @TenantContext() ctx: TenantContextData,
    @Param('workflowId') workflowId: string,
    @Query('status') status?: WorkflowExecutionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.workflowService.listExecutions(ctx.tenantId, {
      workflowId: workflowId as WorkflowId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('executions/all')
  @ApiOperation({ summary: 'List all executions across all workflows' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'All executions list' })
  async listAllExecutions(
    @TenantContext() ctx: TenantContextData,
    @Query('status') status?: WorkflowExecutionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.workflowService.listExecutions(ctx.tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecution(
    @TenantContext() ctx: TenantContextData,
    @Param('executionId') executionId: string
  ) {
    const execution = await this.workflowService.getExecution(
      ctx.tenantId,
      executionId as WorkflowExecutionId
    );
    if (!execution) {
      throw new NotFoundException(`Execution not found: ${executionId}`);
    }
    return execution;
  }

  @Post('executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel running execution' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution cancelled' })
  @ApiResponse({ status: 404, description: 'Execution not found or not running' })
  async cancelExecution(
    @TenantContext() ctx: TenantContextData,
    @Param('executionId') executionId: string
  ) {
    const execution = await this.workflowService.cancelExecution(
      ctx.tenantId,
      executionId as WorkflowExecutionId
    );
    if (!execution) {
      throw new NotFoundException(`Execution not found or not running: ${executionId}`);
    }
    return execution;
  }

  @Post('executions/:executionId/retry')
  @ApiOperation({ summary: 'Retry failed execution' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'New execution started' })
  @ApiResponse({ status: 404, description: 'Execution not found or not failed' })
  async retryExecution(
    @TenantContext() ctx: TenantContextData,
    @Param('executionId') executionId: string
  ) {
    const execution = await this.workflowService.retryExecution(
      ctx.tenantId,
      executionId as WorkflowExecutionId
    );
    if (!execution) {
      throw new NotFoundException(`Execution not found or not failed: ${executionId}`);
    }
    return execution;
  }
}
