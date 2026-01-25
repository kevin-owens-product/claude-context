/**
 * CapabilitiesController - API for managing capabilities
 *
 * Capabilities are what the system can DO to fulfill intents.
 * They measure their own effectiveness.
 *
 * @prompt-id forge-v4.1:api:capabilities:001
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
import { CapabilityService } from '@forge/context';
import type {
  TenantId,
  CapabilityId,
  IntentId,
  ArtifactId,
  CapabilityStatus,
  MaturityLevel,
  CapabilityGap,
  ValueDelivered,
} from '@forge/context';

// DTOs - must be defined before controller class
class CreateCapabilityDto {
  name!: string;
  description!: string;
  provides!: string;
  limitations?: string[];
  assumptions?: string[];
  intentId?: string;
  artifactIds?: string[];
  dependsOn?: string[];
  maturityLevel?: MaturityLevel;
}

class UpdateCapabilityDto {
  name?: string;
  description?: string;
  provides?: string;
  limitations?: string[];
  assumptions?: string[];
  intentId?: string | null;
  artifactIds?: string[];
  dependsOn?: string[];
  status?: CapabilityStatus;
  maturityLevel?: MaturityLevel;
  gaps?: CapabilityGap[];
  valueDelivered?: ValueDelivered;
}

class RecordUsageDto {
  success!: boolean;
  timestamp?: string;
  duration?: number;
  context?: Record<string, unknown>;
}

class AddGapDto {
  description!: string;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  affectedUseCases?: string[];
  suggestedFix?: string;
}

@ApiTags('capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new capability' })
  async create(
    @TenantIdDecorator() tenantId: TenantId,
    @Body() body: CreateCapabilityDto,
  ) {
    const capability = await this.capabilityService.createCapability({
      tenantId,
      ...body,
      intentId: body.intentId as IntentId | undefined,
      artifactIds: body.artifactIds as ArtifactId[] | undefined,
      dependsOn: body.dependsOn as CapabilityId[] | undefined,
    });
    return { data: capability };
  }

  @Get()
  @ApiOperation({ summary: 'List capabilities with filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'maturityLevel', required: false })
  @ApiQuery({ name: 'intentId', required: false })
  @ApiQuery({ name: 'hasGaps', required: false, type: Boolean })
  @ApiQuery({ name: 'minEffectiveness', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('status') status?: CapabilityStatus,
    @Query('maturityLevel') maturityLevel?: MaturityLevel,
    @Query('intentId') intentId?: string,
    @Query('hasGaps') hasGaps?: string,
    @Query('minEffectiveness') minEffectiveness?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.capabilityService.listCapabilities(
      tenantId,
      {
        status,
        maturityLevel,
        intentId: intentId as IntentId | undefined,
        hasGaps: hasGaps !== undefined ? hasGaps === 'true' : undefined,
        minEffectiveness: minEffectiveness ? parseFloat(minEffectiveness) : undefined,
        search,
      },
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
    return result;
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get capability health summary' })
  async getSummary(@TenantIdDecorator() tenantId: TenantId) {
    const summary = await this.capabilityService.getCapabilitySummary(tenantId);
    return { data: summary };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a capability by ID' })
  async get(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const capability = await this.capabilityService.getCapability(tenantId, id as CapabilityId);
    if (!capability) {
      return { error: 'Capability not found', statusCode: 404 };
    }
    return { data: capability };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a capability' })
  async update(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: UpdateCapabilityDto,
  ) {
    const capability = await this.capabilityService.updateCapability(
      tenantId,
      id as CapabilityId,
      {
        ...body,
        intentId: body.intentId as IntentId | null | undefined,
        artifactIds: body.artifactIds as ArtifactId[] | undefined,
        dependsOn: body.dependsOn as CapabilityId[] | undefined,
      },
    );
    return { data: capability };
  }

  @Post(':id/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record usage of a capability' })
  async recordUsage(
    @Param('id') id: string,
    @Body() body: RecordUsageDto,
  ) {
    await this.capabilityService.recordUsage({
      capabilityId: id as CapabilityId,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      success: body.success,
      duration: body.duration,
      context: body.context,
    });
    return { success: true };
  }

  @Post(':id/gaps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a detected gap to a capability' })
  async addGap(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: AddGapDto,
  ) {
    const capability = await this.capabilityService.addGap(tenantId, id as CapabilityId, body);
    return { data: capability };
  }

  @Post(':id/gaps/:gapIndex/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a gap' })
  async resolveGap(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Param('gapIndex') gapIndex: string,
  ) {
    const capability = await this.capabilityService.resolveGap(
      tenantId,
      id as CapabilityId,
      parseInt(gapIndex, 10),
    );
    return { data: capability };
  }

  @Put(':id/value')
  @ApiOperation({ summary: 'Update value delivered by a capability' })
  async updateValue(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: Partial<ValueDelivered>,
  ) {
    const capability = await this.capabilityService.updateValueDelivered(
      tenantId,
      id as CapabilityId,
      body,
    );
    return { data: capability };
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'Get capability dependency graph' })
  async getDependencies(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const graph = await this.capabilityService.getDependencyGraph(tenantId, id as CapabilityId);
    return { data: graph };
  }

  @Get('intent/:intentId')
  @ApiOperation({ summary: 'Get capabilities by intent' })
  async getByIntent(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('intentId') intentId: string,
  ) {
    const capabilities = await this.capabilityService.getCapabilitiesByIntent(
      tenantId,
      intentId as IntentId,
    );
    return { data: capabilities };
  }
}

export { CreateCapabilityDto, UpdateCapabilityDto, RecordUsageDto, AddGapDto };
