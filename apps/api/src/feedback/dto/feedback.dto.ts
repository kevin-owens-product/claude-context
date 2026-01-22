/**
 * @prompt-id forge-v4.1:api:dto:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
  IsEnum,
  IsDate,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackRating, FeedbackErrorCategory } from '@forge/context';

// ============================================================================
// SESSION DTOs
// ============================================================================

export class CreateSessionDto {
  @ApiProperty({ description: 'Workspace for the session' })
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional({ description: 'Associated slice' })
  @IsOptional()
  @IsUUID()
  sliceId?: string;

  @ApiProperty({ description: 'Node IDs included in context', type: [String] })
  @IsArray()
  @IsString({ each: true })
  contextNodeIds!: string[];

  @ApiProperty({ description: 'Total tokens in context' })
  @IsInt()
  @Min(0)
  contextTokenCount!: number;
}

export class SessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiPropertyOptional()
  sliceId?: string;

  @ApiProperty({ type: [String] })
  contextNodeIds!: string[];

  @ApiProperty()
  contextTokenCount!: number;

  @ApiProperty()
  contextCompiledAt!: Date;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}

// ============================================================================
// FEEDBACK DTOs
// ============================================================================

export class QualityScoresDto {
  @ApiPropertyOptional({ description: 'Accuracy score (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Completeness score (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  completeness?: number;

  @ApiPropertyOptional({ description: 'Style match score (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  styleMatch?: number;
}

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Session to submit feedback for' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ enum: FeedbackRating, description: 'Overall rating' })
  @IsEnum(FeedbackRating)
  rating!: FeedbackRating;

  @ApiPropertyOptional({ enum: FeedbackErrorCategory, isArray: true, description: 'Error categories' })
  @IsOptional()
  @IsArray()
  @IsEnum(FeedbackErrorCategory, { each: true })
  errorCategories?: FeedbackErrorCategory[];

  @ApiPropertyOptional({ description: 'Description of missing context' })
  @IsOptional()
  @IsString()
  missingContext?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Quality scores' })
  @IsOptional()
  @ValidateNested()
  @Type(() => QualityScoresDto)
  qualityScores?: QualityScoresDto;
}

export class FeedbackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty({ enum: FeedbackRating })
  rating!: FeedbackRating;

  @ApiProperty({ type: [String] })
  errorCategories!: string[];

  @ApiPropertyOptional()
  missingContext?: string;

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  accuracyScore?: number;

  @ApiPropertyOptional()
  completenessScore?: number;

  @ApiPropertyOptional()
  styleMatchScore?: number;

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty()
  submittedById!: string;
}

// ============================================================================
// ANALYTICS DTOs
// ============================================================================

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for analytics period' })
  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @ApiProperty({ description: 'End date for analytics period' })
  @IsDate()
  @Type(() => Date)
  endDate!: Date;
}

export class FeedbackMetricsSummaryDto {
  @ApiProperty()
  totalSessions!: number;

  @ApiProperty()
  positiveRatings!: number;

  @ApiProperty()
  negativeRatings!: number;

  @ApiProperty()
  skippedRatings!: number;

  @ApiPropertyOptional()
  firstPassAcceptanceRate?: number;

  @ApiPropertyOptional()
  averageEditDistance?: number;

  @ApiPropertyOptional()
  avgAccuracyScore?: number;

  @ApiPropertyOptional()
  avgCompletenessScore?: number;

  @ApiPropertyOptional()
  avgStyleMatchScore?: number;

  @ApiProperty()
  errorCategoryCounts!: Record<string, number>;
}

export class TrendDataPointDto {
  @ApiProperty()
  date!: Date;

  @ApiProperty()
  sessions!: number;

  @ApiProperty()
  positiveRatings!: number;

  @ApiProperty()
  negativeRatings!: number;
}

export class TopContextDocumentDto {
  @ApiProperty()
  nodeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  usageCount!: number;

  @ApiProperty()
  effectivenessScore!: number;
}

export class CommonErrorDto {
  @ApiProperty({ enum: FeedbackErrorCategory })
  category!: FeedbackErrorCategory;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  percentage!: number;
}

export class WorkspaceAnalyticsResponseDto {
  @ApiProperty()
  period!: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty()
  summary!: FeedbackMetricsSummaryDto;

  @ApiProperty({ type: [TrendDataPointDto] })
  trends!: TrendDataPointDto[];

  @ApiProperty({ type: [TopContextDocumentDto] })
  topContext!: TopContextDocumentDto[];

  @ApiProperty({ type: [CommonErrorDto] })
  commonErrors!: CommonErrorDto[];
}

export class RealTimeMetricsResponseDto {
  @ApiProperty({ description: 'Sessions today' })
  sessions!: number;

  @ApiProperty({ description: 'Positive ratings today' })
  positive!: number;

  @ApiProperty({ description: 'Negative ratings today' })
  negative!: number;
}
