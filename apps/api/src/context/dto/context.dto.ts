/**
 * @prompt-id forge-v4.1:api:dto:context:001
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
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContextLayer, ContextNodeType, Freshness } from '@forge/context';

// ============================================================================
// GRAPH DTOs
// ============================================================================

export class CreateGraphDto {
  @ApiProperty({ description: 'Name of the context graph' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the graph' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default graph for the workspace' })
  @IsOptional()
  isDefault?: boolean;
}

export class GraphResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ============================================================================
// NODE DTOs
// ============================================================================

export class CreateNodeDto {
  @ApiProperty({ description: 'Graph to add the node to' })
  @IsUUID()
  graphId!: string;

  @ApiProperty({ enum: ContextNodeType, description: 'Type of context node' })
  @IsEnum(ContextNodeType)
  type!: ContextNodeType;

  @ApiProperty({ enum: ContextLayer, description: 'Layer of the context hierarchy' })
  @IsEnum(ContextLayer)
  layer!: ContextLayer;

  @ApiProperty({ description: 'Name of the node' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Content of the node' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'External URL for linked content' })
  @IsOptional()
  @IsString()
  externalUrl?: string;
}

export class UpdateNodeDto {
  @ApiPropertyOptional({ description: 'Name of the node' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Content of the node' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: Freshness, description: 'Freshness status' })
  @IsOptional()
  @IsEnum(Freshness)
  freshness?: Freshness;
}

export class NodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  graphId!: string;

  @ApiProperty({ enum: ContextNodeType })
  type!: ContextNodeType;

  @ApiProperty({ enum: ContextLayer })
  layer!: ContextLayer;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional()
  externalUrl?: string;

  @ApiProperty()
  tokenCount!: number;

  @ApiProperty({ enum: Freshness })
  freshness!: Freshness;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ============================================================================
// SEARCH DTOs
// ============================================================================

export class SearchFiltersDto {
  @ApiPropertyOptional({ type: [String], enum: ContextNodeType })
  @IsOptional()
  @IsArray()
  @IsEnum(ContextNodeType, { each: true })
  types?: ContextNodeType[];

  @ApiPropertyOptional({ type: [String], enum: ContextLayer })
  @IsOptional()
  @IsArray()
  @IsEnum(ContextLayer, { each: true })
  layers?: ContextLayer[];

  @ApiPropertyOptional({ type: [String], enum: Freshness })
  @IsOptional()
  @IsArray()
  @IsEnum(Freshness, { each: true })
  freshness?: Freshness[];
}

export class SearchNodesDto {
  @ApiProperty({ description: 'Graph to search in' })
  @IsUUID()
  graphId!: string;

  @ApiProperty({ description: 'Search query' })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ description: 'Maximum results', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filters to apply' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;
}

export class SearchResultDto {
  @ApiProperty()
  node!: NodeResponseDto;

  @ApiProperty({ description: 'Semantic similarity score (0-1)' })
  similarity!: number;
}

// ============================================================================
// COMPILATION DTOs
// ============================================================================

export class CompileContextDto {
  @ApiProperty({ description: 'Workspace to compile context for' })
  @IsUUID()
  workspaceId!: string;

  @ApiPropertyOptional({ description: 'Slice to include context from' })
  @IsOptional()
  @IsUUID()
  sliceId?: string;

  @ApiPropertyOptional({ description: 'Query for semantic search' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ description: 'Maximum token budget', default: 8000 })
  @IsInt()
  @Min(1000)
  @Max(128000)
  tokenBudget!: number;
}

export class CompiledSectionDto {
  @ApiProperty({ enum: ContextLayer })
  layer!: ContextLayer;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  tokenCount!: number;

  @ApiProperty({ type: [String] })
  documentIds!: string[];
}

export class CompiledContextResponseDto {
  @ApiProperty({ description: 'Compiled context text ready for AI' })
  compiledText!: string;

  @ApiProperty({ type: [CompiledSectionDto] })
  sections!: CompiledSectionDto[];

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty({ description: 'Percentage of budget used (0-1)' })
  budgetUtilization!: number;
}

// ============================================================================
// PAGINATION DTOs
// ============================================================================

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class ListNodesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContextNodeType })
  @IsOptional()
  @IsEnum(ContextNodeType)
  type?: ContextNodeType;

  @ApiPropertyOptional({ enum: ContextLayer })
  @IsOptional()
  @IsEnum(ContextLayer)
  layer?: ContextLayer;

  @ApiPropertyOptional({ enum: Freshness })
  @IsOptional()
  @IsEnum(Freshness)
  freshness?: Freshness;
}

export class PaginatedResponseDto<T> {
  data!: T[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
