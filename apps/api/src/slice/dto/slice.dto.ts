/**
 * @prompt-id forge-v4.1:api:dto:slice:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SliceStatus, SliceEvent } from '@forge/context';

// ============================================================================
// SLICE DTOs
// ============================================================================

export class CreateSliceDto {
  @ApiProperty({ description: 'Workspace to create the slice in' })
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({ description: 'Name of the slice' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Desired outcome of the slice' })
  @IsString()
  outcome!: string;

  @ApiPropertyOptional({ description: 'Items explicitly out of scope', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antiScope?: string[];

  @ApiPropertyOptional({ description: 'Constraints for AI generation', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({ description: 'Acceptance criteria', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria?: string[];
}

export class UpdateSliceDto {
  @ApiPropertyOptional({ description: 'Name of the slice' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Desired outcome of the slice' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Items explicitly out of scope', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  antiScope?: string[];
}

export class SliceConstraintDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  orderIndex!: number;
}

export class AcceptanceCriterionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  isCompleted!: boolean;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  orderIndex!: number;
}

export class SliceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  shortId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  outcome!: string;

  @ApiProperty({ type: [String] })
  antiScope!: string[];

  @ApiProperty({ enum: SliceStatus })
  status!: SliceStatus;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ type: [SliceConstraintDto] })
  constraints!: SliceConstraintDto[];

  @ApiProperty({ type: [AcceptanceCriterionDto] })
  acceptanceCriteria!: AcceptanceCriterionDto[];

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  archivedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ============================================================================
// TRANSITION DTOs
// ============================================================================

export class TransitionSliceDto {
  @ApiProperty({ enum: SliceEvent, description: 'Event to trigger the transition' })
  @IsEnum(SliceEvent)
  event!: SliceEvent;

  @ApiPropertyOptional({ description: 'Comment for the transition (required for request_changes)' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SliceTransitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sliceId!: string;

  @ApiPropertyOptional({ enum: SliceStatus })
  fromStatus?: SliceStatus;

  @ApiProperty({ enum: SliceStatus })
  toStatus!: SliceStatus;

  @ApiProperty()
  event!: string;

  @ApiProperty()
  actorId!: string;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  createdAt!: Date;
}

export class TransitionResultDto {
  @ApiProperty()
  slice!: SliceResponseDto;

  @ApiProperty()
  transition!: SliceTransitionDto;
}

// ============================================================================
// CONSTRAINT AND CRITERIA DTOs
// ============================================================================

export class AddConstraintDto {
  @ApiProperty({ description: 'Constraint content' })
  @IsString()
  content!: string;
}

export class AddAcceptanceCriterionDto {
  @ApiProperty({ description: 'Acceptance criterion content' })
  @IsString()
  content!: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class ListSlicesQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ enum: SliceStatus })
  @IsOptional()
  @IsEnum(SliceStatus)
  status?: SliceStatus;

  @ApiPropertyOptional({ description: 'Filter by owner' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
