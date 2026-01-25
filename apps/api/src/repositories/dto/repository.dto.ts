/**
 * Repository DTOs
 * @prompt-id forge-v4.1:api:dto:repository:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsNumber, Min, Max } from 'class-validator';

export enum RepoProviderDto {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET',
  AZURE_DEVOPS = 'AZURE_DEVOPS',
  OTHER = 'OTHER',
}

export enum RepoAuthTypeDto {
  NONE = 'NONE',
  SSH_KEY = 'SSH_KEY',
  PAT = 'PAT',
  GITHUB_APP = 'GITHUB_APP',
  OAUTH = 'OAUTH',
}

export enum RepoStatusDto {
  PENDING = 'PENDING',
  CLONING = 'CLONING',
  ACTIVE = 'ACTIVE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
  ARCHIVED = 'ARCHIVED',
}

export enum FileTypeDto {
  SOURCE = 'SOURCE',
  TEST = 'TEST',
  CONFIG = 'CONFIG',
  DOCUMENTATION = 'DOCUMENTATION',
  GENERATED = 'GENERATED',
  ASSET = 'ASSET',
  OTHER = 'OTHER',
}

export class CreateRepositoryDto {
  @ApiProperty({ description: 'Repository name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Repository description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Git clone URL' })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ enum: RepoProviderDto, description: 'Git provider' })
  @IsOptional()
  @IsEnum(RepoProviderDto)
  provider?: RepoProviderDto;

  @ApiPropertyOptional({ description: 'Default branch name' })
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @ApiPropertyOptional({ enum: RepoAuthTypeDto, description: 'Authentication type' })
  @IsOptional()
  @IsEnum(RepoAuthTypeDto)
  authType?: RepoAuthTypeDto;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateRepositoryDto {
  @ApiPropertyOptional({ description: 'Repository name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Repository description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Default branch name' })
  @IsOptional()
  @IsString()
  defaultBranch?: string;

  @ApiPropertyOptional({ enum: RepoAuthTypeDto, description: 'Authentication type' })
  @IsOptional()
  @IsEnum(RepoAuthTypeDto)
  authType?: RepoAuthTypeDto;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListRepositoriesQueryDto {
  @ApiPropertyOptional({ enum: RepoStatusDto, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(RepoStatusDto)
  status?: RepoStatusDto;

  @ApiPropertyOptional({ enum: RepoProviderDto, description: 'Filter by provider' })
  @IsOptional()
  @IsEnum(RepoProviderDto)
  provider?: RepoProviderDto;

  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by path prefix' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'Filter by file extension' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: FileTypeDto, description: 'Filter by file type' })
  @IsOptional()
  @IsEnum(FileTypeDto)
  fileType?: FileTypeDto;

  @ApiPropertyOptional({ description: 'Minimum change frequency' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minChangeFrequency?: number;

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class ListCommitsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by branch name' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ description: 'Filter by author email' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Commits since date (ISO 8601)' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ description: 'Commits until date (ISO 8601)' })
  @IsOptional()
  @IsString()
  until?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class GetDependenciesQueryDto {
  @ApiPropertyOptional({ description: 'Maximum depth to traverse' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  depth?: number;
}

export class GetHotspotsQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to analyze' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

export class GetActivityQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to analyze' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}
