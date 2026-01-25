/**
 * Repositories Controller - REST API for codebase observation
 * @prompt-id forge-v4.1:api:controller:repositories:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  RepositoryService,
  type TenantId,
  type UserId,
  type RepositoryId,
  type CodeFileId,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';
import {
  CreateRepositoryDto,
  UpdateRepositoryDto,
  ListRepositoriesQueryDto,
  ListFilesQueryDto,
  ListCommitsQueryDto,
  GetDependenciesQueryDto,
  GetHotspotsQueryDto,
  GetActivityQueryDto,
} from './dto/repository.dto';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Repositories')
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoryService: RepositoryService) {}

  // ============================================================================
  // REPOSITORY CRUD
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List repositories' })
  @ApiResponse({ status: 200, description: 'Repositories list' })
  async listRepositories(
    @TenantContext() ctx: TenantContextData,
    @Query() query: ListRepositoriesQueryDto
  ) {
    return this.repositoryService.listRepositories(ctx.tenantId, {
      status: query.status as any,
      provider: query.provider as any,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':repoId')
  @ApiOperation({ summary: 'Get repository by ID' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Repository details' })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async getRepository(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string
  ) {
    const repo = await this.repositoryService.getRepository(
      ctx.tenantId,
      repoId as RepositoryId
    );
    if (!repo) {
      throw new NotFoundException(`Repository not found: ${repoId}`);
    }
    return repo;
  }

  @Post()
  @ApiOperation({ summary: 'Create repository' })
  @ApiResponse({ status: 201, description: 'Repository created' })
  async createRepository(
    @TenantContext() ctx: TenantContextData,
    @Body() dto: CreateRepositoryDto
  ) {
    return this.repositoryService.createRepository(
      ctx.tenantId,
      {
        name: dto.name,
        description: dto.description,
        url: dto.url,
        provider: dto.provider as any,
        defaultBranch: dto.defaultBranch,
        authType: dto.authType as any,
        authConfig: dto.authConfig,
        metadata: dto.metadata,
      },
      ctx.userId
    );
  }

  @Patch(':repoId')
  @ApiOperation({ summary: 'Update repository' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Repository updated' })
  async updateRepository(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Body() dto: UpdateRepositoryDto
  ) {
    const repo = await this.repositoryService.updateRepository(
      ctx.tenantId,
      repoId as RepositoryId,
      {
        name: dto.name,
        description: dto.description,
        defaultBranch: dto.defaultBranch,
        authType: dto.authType as any,
        authConfig: dto.authConfig,
        metadata: dto.metadata,
      }
    );
    if (!repo) {
      throw new NotFoundException(`Repository not found: ${repoId}`);
    }
    return repo;
  }

  @Delete(':repoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete repository' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 204, description: 'Repository deleted' })
  async deleteRepository(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string
  ) {
    await this.repositoryService.deleteRepository(ctx.tenantId, repoId as RepositoryId);
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  @Post(':repoId/clone')
  @ApiOperation({ summary: 'Clone repository' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 202, description: 'Clone started' })
  async cloneRepository(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string
  ) {
    try {
      return await this.repositoryService.cloneRepository(
        ctx.tenantId,
        repoId as RepositoryId
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to clone repository'
      );
    }
  }

  @Post(':repoId/sync')
  @ApiOperation({ summary: 'Sync repository with remote' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 202, description: 'Sync started' })
  async syncRepository(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string
  ) {
    try {
      return await this.repositoryService.syncRepository(
        ctx.tenantId,
        repoId as RepositoryId
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to sync repository'
      );
    }
  }

  @Get('sync-jobs/:jobId')
  @ApiOperation({ summary: 'Get sync job status' })
  @ApiParam({ name: 'jobId' })
  @ApiResponse({ status: 200, description: 'Sync job status' })
  async getSyncJob(
    @TenantContext() ctx: TenantContextData,
    @Param('jobId') jobId: string
  ) {
    const job = await this.repositoryService.getSyncJob(ctx.tenantId, jobId);
    if (!job) {
      throw new NotFoundException(`Sync job not found: ${jobId}`);
    }
    return job;
  }

  // ============================================================================
  // FILE QUERIES
  // ============================================================================

  @Get(':repoId/files')
  @ApiOperation({ summary: 'List files in repository' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Files list' })
  async listFiles(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Query() query: ListFilesQueryDto
  ) {
    return this.repositoryService.listFiles(ctx.tenantId, repoId as RepositoryId, {
      path: query.path,
      extension: query.extension,
      language: query.language,
      fileType: query.fileType as any,
      minChangeFrequency: query.minChangeFrequency,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':repoId/files/by-path')
  @ApiOperation({ summary: 'Get file by path' })
  @ApiParam({ name: 'repoId' })
  @ApiQuery({ name: 'path', required: true })
  @ApiResponse({ status: 200, description: 'File details' })
  async getFileByPath(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Query('path') filePath: string
  ) {
    const file = await this.repositoryService.getFileByPath(
      ctx.tenantId,
      repoId as RepositoryId,
      filePath
    );
    if (!file) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }
    return file;
  }

  @Get(':repoId/files/:fileId/dependencies')
  @ApiOperation({ summary: 'Get file dependencies (import graph)' })
  @ApiParam({ name: 'repoId' })
  @ApiParam({ name: 'fileId' })
  @ApiResponse({ status: 200, description: 'Dependency graph' })
  async getFileDependencies(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Param('fileId') fileId: string,
    @Query() query: GetDependenciesQueryDto
  ) {
    return this.repositoryService.getFileDependencies(
      ctx.tenantId,
      repoId as RepositoryId,
      fileId as CodeFileId,
      query.depth || 3
    );
  }

  @Get(':repoId/files/:fileId/importers')
  @ApiOperation({ summary: 'Get files that import this file' })
  @ApiParam({ name: 'repoId' })
  @ApiParam({ name: 'fileId' })
  @ApiResponse({ status: 200, description: 'List of importing files' })
  async getFileImporters(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Param('fileId') fileId: string
  ) {
    return this.repositoryService.getFileImporters(
      ctx.tenantId,
      repoId as RepositoryId,
      fileId as CodeFileId
    );
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  @Get(':repoId/hotspots')
  @ApiOperation({ summary: 'Get high-churn files (hotspots)' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'File hotspots' })
  async getHotspots(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Query() query: GetHotspotsQueryDto
  ) {
    return this.repositoryService.getHotspots(
      ctx.tenantId,
      repoId as RepositoryId,
      query.days || 30
    );
  }

  @Get(':repoId/stats')
  @ApiOperation({ summary: 'Get repository statistics' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Repository statistics' })
  async getRepositoryStats(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string
  ) {
    return this.repositoryService.getRepositoryStats(
      ctx.tenantId,
      repoId as RepositoryId
    );
  }

  @Get(':repoId/activity')
  @ApiOperation({ summary: 'Get change activity over time' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Change activity' })
  async getChangeActivity(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Query() query: GetActivityQueryDto
  ) {
    return this.repositoryService.getChangeActivity(
      ctx.tenantId,
      repoId as RepositoryId,
      query.days || 30
    );
  }

  // ============================================================================
  // COMMITS
  // ============================================================================

  @Get(':repoId/commits')
  @ApiOperation({ summary: 'List commits' })
  @ApiParam({ name: 'repoId' })
  @ApiResponse({ status: 200, description: 'Commits list' })
  async listCommits(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Query() query: ListCommitsQueryDto
  ) {
    return this.repositoryService.listCommits(ctx.tenantId, repoId as RepositoryId, {
      branch: query.branch,
      author: query.author,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':repoId/commits/:sha')
  @ApiOperation({ summary: 'Get commit by SHA' })
  @ApiParam({ name: 'repoId' })
  @ApiParam({ name: 'sha' })
  @ApiResponse({ status: 200, description: 'Commit details' })
  async getCommit(
    @TenantContext() ctx: TenantContextData,
    @Param('repoId') repoId: string,
    @Param('sha') sha: string
  ) {
    const commit = await this.repositoryService.getCommitBySha(
      ctx.tenantId,
      repoId as RepositoryId,
      sha
    );
    if (!commit) {
      throw new NotFoundException(`Commit not found: ${sha}`);
    }
    return commit;
  }
}
