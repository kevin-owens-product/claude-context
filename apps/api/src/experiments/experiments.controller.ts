/**
 * ExperimentsController - API for managing experiments
 *
 * Experiments test hypotheses about how to improve intent fulfillment.
 * Every change is a hypothesis. Every deployment is an experiment.
 *
 * @prompt-id forge-v4.1:api:experiments:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TenantId as TenantIdDecorator } from '../common/decorators/tenant.decorator';
import { ExperimentService } from '@forge/context';
import type {
  TenantId,
  ExperimentId,
  IntentId,
  CapabilityId,
  SignalId,
  ExperimentType,
  ExperimentStatus,
  ExperimentVerdict,
  TargetAudience,
} from '@forge/context';

// DTOs - must be defined before controller class
class CreateExperimentDto {
  name!: string;
  description!: string;
  hypothesis!: string;
  rationale?: string;
  intentId?: string;
  capabilityId?: string;
  experimentType?: ExperimentType;
  targetMetrics!: Array<{
    signalId: string;
    name: string;
    weight: number;
    expectedImprovement: number;
  }>;
  successCriteria!: Array<{
    metricId: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    threshold: number;
    minSampleSize?: number;
  }>;
  guardrails?: Array<{
    metricId: string;
    name: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte';
    threshold: number;
    action: 'pause' | 'stop' | 'alert';
  }>;
  targetAudience?: TargetAudience;
  trafficPercent?: number;
  plannedDuration?: number;
  minSampleSize?: number;
}

class UpdateExperimentDto {
  name?: string;
  description?: string;
  hypothesis?: string;
  rationale?: string;
  targetMetrics?: Array<{
    signalId: string;
    name: string;
    weight: number;
    expectedImprovement: number;
  }>;
  successCriteria?: Array<{
    metricId: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    threshold: number;
    minSampleSize?: number;
  }>;
  guardrails?: Array<{
    metricId: string;
    name: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte';
    threshold: number;
    action: 'pause' | 'stop' | 'alert';
  }>;
  targetAudience?: TargetAudience;
  trafficPercent?: number;
  plannedDuration?: number;
  minSampleSize?: number;
}

@ApiTags('experiments')
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentService: ExperimentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new experiment' })
  async create(
    @TenantIdDecorator() tenantId: TenantId,
    @Body() body: CreateExperimentDto,
  ) {
    const experiment = await this.experimentService.createExperiment({
      tenantId,
      ...body,
      intentId: body.intentId as IntentId | undefined,
      capabilityId: body.capabilityId as CapabilityId | undefined,
      targetMetrics: body.targetMetrics.map(m => ({
        ...m,
        signalId: m.signalId as SignalId,
      })),
      successCriteria: body.successCriteria.map(c => ({
        ...c,
        metricId: c.metricId as SignalId,
      })),
      guardrails: body.guardrails?.map(g => ({
        ...g,
        metricId: g.metricId as SignalId,
      })),
    });
    return { data: experiment };
  }

  @Get()
  @ApiOperation({ summary: 'List experiments with filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'experimentType', required: false })
  @ApiQuery({ name: 'intentId', required: false })
  @ApiQuery({ name: 'capabilityId', required: false })
  @ApiQuery({ name: 'verdict', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('status') status?: ExperimentStatus,
    @Query('experimentType') experimentType?: ExperimentType,
    @Query('intentId') intentId?: string,
    @Query('capabilityId') capabilityId?: string,
    @Query('verdict') verdict?: ExperimentVerdict,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.experimentService.listExperiments(
      tenantId,
      {
        status,
        experimentType,
        intentId: intentId as IntentId | undefined,
        capabilityId: capabilityId as CapabilityId | undefined,
        verdict,
        search,
      },
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get experiment statistics' })
  async getStats(@TenantIdDecorator() tenantId: TenantId) {
    const stats = await this.experimentService.getExperimentStats(tenantId);
    return { data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an experiment by ID' })
  async get(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const experiment = await this.experimentService.getExperiment(tenantId, id as ExperimentId);
    if (!experiment) {
      return { error: 'Experiment not found', statusCode: 404 };
    }
    return { data: experiment };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an experiment' })
  async update(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: UpdateExperimentDto,
  ) {
    const experiment = await this.experimentService.updateExperiment(
      tenantId,
      id as ExperimentId,
      {
        ...body,
        targetMetrics: body.targetMetrics?.map(m => ({
          ...m,
          signalId: m.signalId as SignalId,
        })),
        successCriteria: body.successCriteria?.map(c => ({
          ...c,
          metricId: c.metricId as SignalId,
        })),
        guardrails: body.guardrails?.map(g => ({
          ...g,
          metricId: g.metricId as SignalId,
        })),
      },
    );
    return { data: experiment };
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an experiment' })
  async start(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const experiment = await this.experimentService.startExperiment(tenantId, id as ExperimentId);
    return { data: experiment };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a running experiment' })
  async pause(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const experiment = await this.experimentService.pauseExperiment(tenantId, id as ExperimentId);
    return { data: experiment };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused experiment' })
  async resume(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const experiment = await this.experimentService.resumeExperiment(tenantId, id as ExperimentId);
    return { data: experiment };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop an experiment and analyze results' })
  async stop(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const results = await this.experimentService.stopExperiment(
      tenantId,
      id as ExperimentId,
      body.reason,
    );
    return { data: results };
  }

  @Post(':id/learnings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record learnings from an experiment' })
  async recordLearnings(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: { learnings: string; applyToIntent?: boolean },
  ) {
    const experiment = await this.experimentService.recordLearnings(
      tenantId,
      id as ExperimentId,
      body.learnings,
      body.applyToIntent,
    );
    return { data: experiment };
  }

  @Get(':id/guardrails')
  @ApiOperation({ summary: 'Check guardrails for a running experiment' })
  async checkGuardrails(@Param('id') id: string) {
    const result = await this.experimentService.checkGuardrails(id as ExperimentId);
    return { data: result };
  }
}

export { CreateExperimentDto, UpdateExperimentDto };
