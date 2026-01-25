/**
 * Workflow Templates DTOs
 * @prompt-id forge-v4.1:api:dto:workflow-templates:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyTemplateDto {
  @ApiProperty({ description: 'Template ID to apply' })
  @IsString()
  templateId: string;

  @ApiPropertyOptional({ description: 'Variable values to customize the template' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Optional name override for the workflow' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class TemplateVariableDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'select'] })
  type: 'string' | 'number' | 'boolean' | 'select';

  @ApiPropertyOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ type: [Object] })
  options?: Array<{ value: string; label: string }>;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  description: string;
}

export class WorkflowTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ['escalation', 'notification', 'assignment', 'status', 'integration'] })
  category: string;

  @ApiProperty({ enum: ['EVENT', 'SIGNAL', 'SCHEDULE', 'MANUAL'] })
  triggerType: string;

  @ApiProperty()
  triggerConfig: Record<string, unknown>;

  @ApiPropertyOptional()
  conditions?: Record<string, unknown>;

  @ApiProperty({ type: [Object] })
  actions: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: [TemplateVariableDto] })
  variables?: TemplateVariableDto[];
}
