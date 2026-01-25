/**
 * IntentsController - API for managing intents
 *
 * Intents are the "why" of Living Software - the desired outcomes
 * we're trying to achieve.
 *
 * @prompt-id forge-v4.1:api:intents:001
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
import { IntentService } from '@forge/context';
import type { TenantId, IntentId, IntentStatus, IntentPriority, IntentEvidence } from '@forge/context';

// DTOs - must be defined before controller class
class CreateIntentDto {
  title!: string;
  description!: string;
  desiredState!: string;
  projectId?: string;
  successCriteria?: Array<{
    description: string;
    metric?: string;
    targetValue?: number;
    unit?: string;
    isMet: boolean;
  }>;
  antiPatterns?: string[];
  evidence?: IntentEvidence[];
  priority?: IntentPriority;
  parentIntentId?: string;
  primaryStakeholder?: string;
  affectedPersonas?: string[];
  businessValue?: {
    estimatedRevenue?: number;
    estimatedCostSaving?: number;
    estimatedTimeSaving?: number;
    strategicImportance?: 'critical' | 'high' | 'medium' | 'low';
    customerImpact?: number;
    revenueAtRisk?: number;
  };
}

class UpdateIntentDto {
  title?: string;
  description?: string;
  desiredState?: string;
  successCriteria?: Array<{
    description: string;
    metric?: string;
    targetValue?: number;
    unit?: string;
    isMet: boolean;
  }>;
  antiPatterns?: string[];
  evidence?: IntentEvidence[];
  priority?: IntentPriority;
  status?: IntentStatus;
  confidenceScore?: number;
  primaryStakeholder?: string;
  affectedPersonas?: string[];
  businessValue?: {
    estimatedRevenue?: number;
    estimatedCostSaving?: number;
    estimatedTimeSaving?: number;
    strategicImportance?: 'critical' | 'high' | 'medium' | 'low';
    customerImpact?: number;
    revenueAtRisk?: number;
  };
}

class AddEvidenceDto {
  type!: 'user_research' | 'analytics' | 'feedback' | 'experiment' | 'market_data' | 'business_case';
  description!: string;
  confidence!: number;
  source?: string;
  date?: string;
}

@ApiTags('intents')
@Controller('intents')
export class IntentsController {
  constructor(private readonly intentService: IntentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new intent' })
  async create(
    @TenantIdDecorator() tenantId: TenantId,
    @Body() body: CreateIntentDto,
  ) {
    const intent = await this.intentService.createIntent({
      tenantId,
      title: body.title,
      description: body.description,
      desiredState: body.desiredState,
      projectId: body.projectId,
      successCriteria: body.successCriteria,
      antiPatterns: body.antiPatterns,
      evidence: body.evidence,
      priority: body.priority,
      parentIntentId: body.parentIntentId as IntentId | undefined,
      primaryStakeholder: body.primaryStakeholder,
      affectedPersonas: body.affectedPersonas,
      businessValue: body.businessValue,
    });
    return { data: intent };
  }

  @Get()
  @ApiOperation({ summary: 'List intents with filtering' })
  @ApiQuery({ name: 'status', required: false, enum: ['HYPOTHESIZED', 'VALIDATED', 'ACTIVE', 'FULFILLED', 'ABANDONED', 'SUPERSEDED'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'EXPLORATORY'] })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'parentIntentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('status') status?: IntentStatus,
    @Query('priority') priority?: IntentPriority,
    @Query('projectId') projectId?: string,
    @Query('parentIntentId') parentIntentId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.intentService.listIntents(
      tenantId,
      {
        status,
        priority,
        projectId,
        parentIntentId: parentIntentId as IntentId,
        search,
      },
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
    return result;
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get intent hierarchy tree' })
  @ApiQuery({ name: 'rootIntentId', required: false })
  async getHierarchy(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('rootIntentId') rootIntentId?: string,
  ) {
    const hierarchy = await this.intentService.getIntentHierarchy(
      tenantId,
      rootIntentId as IntentId | undefined,
    );
    return { data: hierarchy };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get fulfillment summary for dashboard' })
  @ApiQuery({ name: 'projectId', required: false })
  async getSummary(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('projectId') projectId?: string,
  ) {
    const summary = await this.intentService.getFulfillmentSummary(tenantId, projectId);
    return { data: summary };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an intent by ID' })
  async get(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const intent = await this.intentService.getIntent(tenantId, id as IntentId);
    if (!intent) {
      return { error: 'Intent not found', statusCode: 404 };
    }
    return { data: intent };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an intent' })
  async update(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: UpdateIntentDto,
  ) {
    const intent = await this.intentService.updateIntent(tenantId, id as IntentId, body);
    return { data: intent };
  }

  @Post(':id/evidence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add evidence to an intent' })
  async addEvidence(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: AddEvidenceDto,
  ) {
    const intent = await this.intentService.addEvidence(tenantId, id as IntentId, body);
    return { data: intent };
  }

  @Get(':id/capabilities')
  @ApiOperation({ summary: 'Get capabilities that serve this intent' })
  async getCapabilities(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const intent = await this.intentService.getIntent(tenantId, id as IntentId);
    return { data: intent };
  }
}

export { CreateIntentDto, UpdateIntentDto, AddEvidenceDto };
