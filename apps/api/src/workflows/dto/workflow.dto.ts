/**
 * Workflow DTOs - Request/Response validation
 * @prompt-id forge-v4.1:api:dto:workflows:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum WorkflowTriggerType {
  EVENT = 'EVENT',
  SIGNAL = 'SIGNAL',
  SCHEDULE = 'SCHEDULE',
  MANUAL = 'MANUAL',
}

export enum ActionType {
  CHANGE_STATUS = 'CHANGE_STATUS',
  NOTIFY = 'NOTIFY',
  WEBHOOK = 'WEBHOOK',
  CREATE_ENTITY = 'CREATE_ENTITY',
  ASSIGN = 'ASSIGN',
  UPDATE_FIELD = 'UPDATE_FIELD',
}

export enum ConditionOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  OLDER_THAN = 'older_than',
  NEWER_THAN = 'newer_than',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

// Nested DTOs
export class ConditionRuleDto {
  @ApiProperty({ description: 'Field path to evaluate', example: 'entity.status' })
  @IsString()
  field: string;

  @ApiProperty({ enum: RuleOperator })
  @IsEnum(RuleOperator)
  operator: RuleOperator;

  @ApiPropertyOptional({ description: 'Value to compare against' })
  @IsOptional()
  value?: unknown;
}

export class WorkflowConditionsDto {
  @ApiProperty({ enum: ConditionOperator })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ type: [ConditionRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionRuleDto)
  @ArrayMinSize(1)
  rules: ConditionRuleDto[];
}

export class WorkflowActionDto {
  @ApiProperty({ enum: ActionType })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiProperty({ description: 'Action-specific configuration' })
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty({ description: 'Execution order', minimum: 1 })
  @IsNumber()
  @Min(1)
  order: number;
}

// Event Trigger Config
export class EventTriggerConfigDto {
  @ApiProperty({ type: [String], example: ['created', 'updated'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  eventTypes: string[];

  @ApiProperty({ type: [String], example: ['slice', 'deal'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  entityTypes: string[];

  @ApiPropertyOptional({ description: 'Field-level filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

// Signal Trigger Config
export class SignalTriggerConfigDto {
  @ApiProperty({ example: 'SATISFACTION' })
  @IsString()
  signalType: string;

  @ApiProperty({ enum: ['health_becomes', 'crosses_threshold'] })
  @IsEnum(['health_becomes', 'crosses_threshold'])
  condition: 'health_becomes' | 'crosses_threshold';

  @ApiProperty({ description: 'Threshold value or health level' })
  value: string | number;
}

// Schedule Trigger Config
export class ScheduleTriggerConfigDto {
  @ApiProperty({ description: 'Cron expression', example: '0 9 * * 1' })
  @IsString()
  cron: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone: string;
}

// Manual Trigger Config
export class ManualTriggerConfigDto {
  @ApiPropertyOptional({ type: [String], description: 'Roles allowed to trigger' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];
}

// Request DTOs
export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: WorkflowTriggerType })
  @IsEnum(WorkflowTriggerType)
  triggerType: WorkflowTriggerType;

  @ApiProperty({ description: 'Trigger-specific configuration' })
  @IsObject()
  triggerConfig: EventTriggerConfigDto | SignalTriggerConfigDto | ScheduleTriggerConfigDto | ManualTriggerConfigDto;

  @ApiPropertyOptional({ type: WorkflowConditionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConditionsDto)
  conditions?: WorkflowConditionsDto;

  @ApiProperty({ type: [WorkflowActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  @ArrayMinSize(1)
  actions: WorkflowActionDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: WorkflowTriggerType })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  triggerConfig?: EventTriggerConfigDto | SignalTriggerConfigDto | ScheduleTriggerConfigDto | ManualTriggerConfigDto;

  @ApiPropertyOptional({ type: WorkflowConditionsDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConditionsDto)
  conditions?: WorkflowConditionsDto | null;

  @ApiPropertyOptional({ type: [WorkflowActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  @ArrayMinSize(1)
  actions?: WorkflowActionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class TriggerContextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  entity?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  signal?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  previousState?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// Query DTOs
export class ListWorkflowsQueryDto {
  @ApiPropertyOptional({ enum: WorkflowTriggerType })
  @IsOptional()
  @IsEnum(WorkflowTriggerType)
  triggerType?: WorkflowTriggerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isEnabled?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsString()
  offset?: string;
}

export class ListExecutionsQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsString()
  offset?: string;
}

// Response DTOs
export class ActionResultDto {
  @ApiProperty({ enum: ActionType })
  actionType: ActionType;

  @ApiProperty()
  order: number;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  result?: unknown;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  executedAt: Date;
}

export class WorkflowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty({ enum: WorkflowTriggerType })
  triggerType: WorkflowTriggerType;

  @ApiProperty()
  triggerConfig: Record<string, unknown>;

  @ApiPropertyOptional()
  conditions?: WorkflowConditionsDto;

  @ApiProperty({ type: [WorkflowActionDto] })
  actions: WorkflowActionDto[];

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  runCount: number;

  @ApiPropertyOptional()
  lastRunAt?: Date;
}

export class WorkflowExecutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workflowId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  status: string;

  @ApiPropertyOptional()
  triggerEventId?: string;

  @ApiProperty()
  triggerData: Record<string, unknown>;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional({ type: [ActionResultDto] })
  actionsExecuted?: ActionResultDto[];

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ type: WorkflowResponseDto })
  workflow?: WorkflowResponseDto;
}

export class TestWorkflowResultDto {
  @ApiProperty()
  wouldTrigger: boolean;

  @ApiProperty()
  conditionsMet: boolean;

  @ApiProperty({ type: [ActionResultDto] })
  preview: ActionResultDto[];
}

export class PaginatedWorkflowsResponseDto {
  @ApiProperty({ type: [WorkflowResponseDto] })
  data: WorkflowResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}

export class PaginatedExecutionsResponseDto {
  @ApiProperty({ type: [WorkflowExecutionResponseDto] })
  data: WorkflowExecutionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}
