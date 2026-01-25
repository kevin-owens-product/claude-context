/**
 * SignalsController - API for managing signals
 *
 * Signals are continuous evidence streams that measure whether
 * intents are being fulfilled and capabilities are effective.
 *
 * @prompt-id forge-v4.1:api:signals:001
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
import { SignalService } from '@forge/context';
import type {
  TenantId,
  SignalId,
  IntentId,
  CapabilityId,
  SignalType,
  SignalHealth,
  MetricDirection,
  AggregationType,
  SignalSource,
} from '@forge/context';

// DTOs - must be defined before controller class
class CreateSignalDto {
  name!: string;
  description?: string;
  signalType!: SignalType;
  intentId?: string;
  capabilityId?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction?: MetricDirection;
  unit?: string;
  aggregation?: AggregationType;
  windowMinutes?: number;
  sources?: SignalSource[];
}

class UpdateSignalDto {
  name?: string;
  description?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction?: MetricDirection;
  unit?: string;
  aggregation?: AggregationType;
  windowMinutes?: number;
  sources?: SignalSource[];
  isActive?: boolean;
}

class RecordMeasurementDto {
  signalId!: string;
  value!: number;
  sampleCount?: number;
  metadata?: Record<string, unknown>;
  measuredAt?: string;
}

@ApiTags('signals')
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalService: SignalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new signal' })
  async create(
    @TenantIdDecorator() tenantId: TenantId,
    @Body() body: CreateSignalDto,
  ) {
    const signal = await this.signalService.createSignal({
      tenantId,
      ...body,
      intentId: body.intentId as IntentId | undefined,
      capabilityId: body.capabilityId as CapabilityId | undefined,
    });
    return { data: signal };
  }

  @Get()
  @ApiOperation({ summary: 'List signals with filtering' })
  @ApiQuery({ name: 'signalType', required: false })
  @ApiQuery({ name: 'health', required: false })
  @ApiQuery({ name: 'intentId', required: false })
  @ApiQuery({ name: 'capabilityId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'hasAnomaly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async list(
    @TenantIdDecorator() tenantId: TenantId,
    @Query('signalType') signalType?: SignalType,
    @Query('health') health?: SignalHealth,
    @Query('intentId') intentId?: string,
    @Query('capabilityId') capabilityId?: string,
    @Query('isActive') isActive?: string,
    @Query('hasAnomaly') hasAnomaly?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.signalService.listSignals(
      tenantId,
      {
        signalType,
        health,
        intentId: intentId as IntentId | undefined,
        capabilityId: capabilityId as CapabilityId | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        hasAnomaly: hasAnomaly !== undefined ? hasAnomaly === 'true' : undefined,
        search,
      },
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );
    return result;
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get signal dashboard summary' })
  async getDashboard(@TenantIdDecorator() tenantId: TenantId) {
    const dashboard = await this.signalService.getSignalDashboard(tenantId);
    return { data: dashboard };
  }

  @Get('attention')
  @ApiOperation({ summary: 'Get signals needing attention' })
  async getAttentionNeeded(@TenantIdDecorator() tenantId: TenantId) {
    const attention = await this.signalService.getSignalsNeedingAttention(tenantId);
    return { data: attention };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a signal by ID' })
  async get(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
  ) {
    const signal = await this.signalService.getSignal(tenantId, id as SignalId);
    if (!signal) {
      return { error: 'Signal not found', statusCode: 404 };
    }
    return { data: signal };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a signal' })
  async update(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('id') id: string,
    @Body() body: UpdateSignalDto,
  ) {
    const signal = await this.signalService.updateSignal(tenantId, id as SignalId, body);
    return { data: signal };
  }

  @Post(':id/measurements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a measurement for a signal' })
  async recordMeasurement(
    @Param('id') id: string,
    @Body() body: RecordMeasurementDto,
  ) {
    const measurement = await this.signalService.recordMeasurement({
      signalId: id as SignalId,
      value: body.value,
      sampleCount: body.sampleCount,
      metadata: body.metadata,
      measuredAt: body.measuredAt ? new Date(body.measuredAt) : undefined,
    });
    return { data: measurement };
  }

  @Post('measurements/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record multiple measurements in batch' })
  async recordMeasurementsBatch(@Body() body: { measurements: RecordMeasurementDto[] }) {
    const result = await this.signalService.recordMeasurementsBatch(
      body.measurements.map(m => ({
        signalId: m.signalId as SignalId,
        value: m.value,
        sampleCount: m.sampleCount,
        metadata: m.metadata,
        measuredAt: m.measuredAt ? new Date(m.measuredAt) : undefined,
      })),
    );
    return { data: result };
  }

  @Get(':id/timeseries')
  @ApiOperation({ summary: 'Get time series data for a signal' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'resolution', required: false })
  async getTimeSeries(
    @Param('id') id: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('resolution') resolution?: 'minute' | 'hour' | 'day',
  ) {
    const timeSeries = await this.signalService.getTimeSeries(
      id as SignalId,
      new Date(startTime),
      new Date(endTime),
      resolution,
    );
    return { data: timeSeries };
  }

  @Post(':id/detect-anomalies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run anomaly detection on a signal' })
  async detectAnomalies(@Param('id') id: string) {
    const anomaly = await this.signalService.detectAnomalies(id as SignalId);
    return { data: anomaly };
  }

  @Get('intent/:intentId')
  @ApiOperation({ summary: 'Get all signals for an intent' })
  async getIntentSignals(
    @TenantIdDecorator() tenantId: TenantId,
    @Param('intentId') intentId: string,
  ) {
    const result = await this.signalService.getIntentSignals(tenantId, intentId as IntentId);
    return { data: result };
  }
}

export { CreateSignalDto, UpdateSignalDto, RecordMeasurementDto };
