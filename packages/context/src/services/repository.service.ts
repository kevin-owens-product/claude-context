/**
 * Repository Service - Main service for codebase observation engine
 * @prompt-id forge-v4.1:service:repository:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { RepoProvider as RepoProviderEnum } from '@prisma/client';
import type { Redis } from 'ioredis';
import type {
  TenantId,
  PaginationOptions,
  PaginatedResult,
} from '../types';
import type {
  RepositoryId,
  CodeFileId,
  Repository,
  CodeFile,
  CodeCommit,
  CodeBranch,
  RepoSyncJob,
  CreateRepositoryRequest,
  UpdateRepositoryRequest,
  ListFilesFilter,
  ListCommitsFilter,
  RepositoryFilter,
  RepoStatus,
  RepoProvider,
  SyncJobType,
  SyncJobStatus,
  DependencyGraph,
  DependencyNode,
  FileHotspot,
  RepositoryStats,
  ChangeActivity,
} from '../types/codebase.types';
import { GitSyncService, type GitAuthConfig } from './git-sync.service';
import { FileTrackerService } from './file-tracker.service';
import { ImportAnalyzerService } from './import-analyzer.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_TTL = 300; // 5 minutes
const HOTSPOT_DAYS = 30;
const BATCH_SIZE = 1000;

// ============================================================================
// SERVICE
// ============================================================================

export class RepositoryService {
  private readonly gitSync: GitSyncService;
  private readonly fileTracker: FileTrackerService;
  private readonly importAnalyzer: ImportAnalyzerService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    baseRepoPath?: string
  ) {
    this.gitSync = new GitSyncService(baseRepoPath);
    this.importAnalyzer = new ImportAnalyzerService();
    this.fileTracker = new FileTrackerService(
      prisma,
      this.gitSync,
      this.importAnalyzer
    );
  }

  // ============================================================================
  // REPOSITORY CRUD
  // ============================================================================

  /**
   * Create a new repository to track
   */
  async createRepository(
    tenantId: TenantId,
    input: CreateRepositoryRequest,
    userId?: string
  ): Promise<Repository> {
    // Detect provider from URL
    const provider = input.provider || this.detectProvider(input.url);

    const repo = await this.prisma.repository.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        url: input.url,
        provider,
        defaultBranch: input.defaultBranch || 'main',
        authType: input.authType || 'NONE',
        authConfig: (input.authConfig || {}) as Prisma.InputJsonValue,
        status: 'PENDING',
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    await this.invalidateCache(tenantId, 'repositories');

    return this.mapRepository(repo);
  }

  /**
   * Get repository by ID
   */
  async getRepository(
    tenantId: TenantId,
    repoId: RepositoryId
  ): Promise<Repository | null> {
    const cacheKey = `repo:${tenantId}:${repoId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const repo = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        tenantId,
      },
      include: {
        branches: true,
      },
    });

    if (!repo) return null;

    const result = this.mapRepository(repo);
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  }

  /**
   * List repositories
   */
  async listRepositories(
    tenantId: TenantId,
    filter?: RepositoryFilter
  ): Promise<PaginatedResult<Repository>> {
    const limit = filter?.limit || 20;
    const offset = filter?.offset || 0;

    const where: Record<string, unknown> = { tenantId };

    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.provider) {
      where.provider = filter.provider;
    }
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [repos, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          branches: {
            where: { isDefault: true },
            take: 1,
          },
        },
      }),
      this.prisma.repository.count({ where }),
    ]);

    return {
      data: repos.map((r) => this.mapRepository(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update repository
   */
  async updateRepository(
    tenantId: TenantId,
    repoId: RepositoryId,
    input: UpdateRepositoryRequest
  ): Promise<Repository | null> {
    const existing = await this.prisma.repository.findFirst({
      where: { id: repoId, tenantId },
    });

    if (!existing) return null;

    const repo = await this.prisma.repository.update({
      where: { id: repoId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.defaultBranch && { defaultBranch: input.defaultBranch }),
        ...(input.authType && { authType: input.authType }),
        ...(input.authConfig && { authConfig: input.authConfig as Prisma.InputJsonValue }),
        ...(input.metadata && { metadata: input.metadata as Prisma.InputJsonValue }),
      },
    });

    await this.invalidateCache(tenantId, 'repositories');
    await this.redis.del(`repo:${tenantId}:${repoId}`);

    return this.mapRepository(repo);
  }

  /**
   * Delete repository
   */
  async deleteRepository(
    tenantId: TenantId,
    repoId: RepositoryId
  ): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repoId, tenantId },
    });

    if (!repo) return;

    // Delete local files if they exist
    if (repo.localPath) {
      try {
        await this.gitSync.deleteRepository(repo.localPath);
      } catch {
        // Ignore errors deleting local files
      }
    }

    await this.prisma.repository.delete({
      where: { id: repoId },
    });

    await this.invalidateCache(tenantId, 'repositories');
    await this.redis.del(`repo:${tenantId}:${repoId}`);
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  /**
   * Clone and initialize a repository
   */
  async cloneRepository(
    tenantId: TenantId,
    repoId: RepositoryId
  ): Promise<RepoSyncJob> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repoId, tenantId },
    });

    if (!repo) {
      throw new Error('Repository not found');
    }

    // Create sync job
    const job = await this.prisma.repoSyncJob.create({
      data: {
        repositoryId: repoId,
        jobType: 'INITIAL_CLONE',
        status: 'PENDING',
      },
    });

    // Update repository status
    await this.prisma.repository.update({
      where: { id: repoId },
      data: { status: 'CLONING' },
    });

    // Start clone (in real implementation, this would be queued)
    this.executeClone(tenantId, repoId, job.id).catch(console.error);

    return this.mapSyncJob(job);
  }

  /**
   * Sync repository with remote
   */
  async syncRepository(
    tenantId: TenantId,
    repoId: RepositoryId
  ): Promise<RepoSyncJob> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repoId, tenantId },
    });

    if (!repo) {
      throw new Error('Repository not found');
    }

    if (!repo.localPath || !repo.clonedAt) {
      throw new Error('Repository must be cloned first');
    }

    // Create sync job
    const job = await this.prisma.repoSyncJob.create({
      data: {
        repositoryId: repoId,
        jobType: 'INCREMENTAL_SYNC',
        status: 'PENDING',
        fromCommit: repo.lastSyncCommit,
      },
    });

    // Update repository status
    await this.prisma.repository.update({
      where: { id: repoId },
      data: { status: 'SYNCING' },
    });

    // Start sync
    this.executeSync(tenantId, repoId, job.id).catch(console.error);

    return this.mapSyncJob(job);
  }

  /**
   * Get sync job status
   */
  async getSyncJob(
    tenantId: TenantId,
    jobId: string
  ): Promise<RepoSyncJob | null> {
    const job = await this.prisma.repoSyncJob.findFirst({
      where: {
        id: jobId,
        repository: { tenantId },
      },
    });

    return job ? this.mapSyncJob(job) : null;
  }

  // ============================================================================
  // FILE QUERIES
  // ============================================================================

  /**
   * List files in a repository
   */
  async listFiles(
    tenantId: TenantId,
    repoId: RepositoryId,
    filter?: ListFilesFilter
  ): Promise<PaginatedResult<CodeFile>> {
    await this.verifyAccess(tenantId, repoId);

    const limit = filter?.limit || 100;
    const offset = filter?.offset || 0;

    const where: Record<string, unknown> = {
      repositoryId: repoId,
      deletedAt: null,
    };

    if (filter?.path) {
      where.path = { startsWith: filter.path };
    }
    if (filter?.extension) {
      where.extension = filter.extension;
    }
    if (filter?.language) {
      where.language = filter.language;
    }
    if (filter?.fileType) {
      where.fileType = filter.fileType;
    }
    if (filter?.minChangeFrequency) {
      where.changeFrequency = { gte: filter.minChangeFrequency };
    }

    const [files, total] = await Promise.all([
      this.prisma.codeFile.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { path: 'asc' },
      }),
      this.prisma.codeFile.count({ where }),
    ]);

    return {
      data: files.map((f) => this.mapCodeFile(f)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get file by path
   */
  async getFileByPath(
    tenantId: TenantId,
    repoId: RepositoryId,
    filePath: string
  ): Promise<CodeFile | null> {
    await this.verifyAccess(tenantId, repoId);

    const file = await this.prisma.codeFile.findFirst({
      where: {
        repositoryId: repoId,
        path: filePath,
        deletedAt: null,
      },
    });

    return file ? this.mapCodeFile(file) : null;
  }

  /**
   * Get file dependencies (import graph)
   */
  async getFileDependencies(
    tenantId: TenantId,
    repoId: RepositoryId,
    fileId: CodeFileId,
    depth: number = 3
  ): Promise<DependencyGraph> {
    await this.verifyAccess(tenantId, repoId);

    const file = await this.prisma.codeFile.findFirst({
      where: { id: fileId, repositoryId: repoId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    const root = await this.buildDependencyNode(fileId, 0, depth, new Set());

    const externalDeps = await this.prisma.fileImport.findMany({
      where: {
        repositoryId: repoId,
        isExternal: true,
      },
      select: {
        importPath: true,
        sourceFile: {
          select: { path: true },
        },
      },
    });

    // Group external dependencies
    const extMap = new Map<string, Set<string>>();
    for (const dep of externalDeps) {
      const pkgName = this.importAnalyzer.extractPackageName(dep.importPath);
      if (!extMap.has(pkgName)) {
        extMap.set(pkgName, new Set());
      }
      extMap.get(pkgName)!.add(dep.sourceFile.path);
    }

    return {
      root,
      totalNodes: this.countNodes(root),
      maxDepth: this.getMaxDepth(root),
      externalDependencies: Array.from(extMap.entries()).map(([name, files]) => ({
        name,
        importCount: files.size,
        files: Array.from(files),
      })),
    };
  }

  /**
   * Get files that import a given file (reverse dependencies)
   */
  async getFileImporters(
    tenantId: TenantId,
    repoId: RepositoryId,
    fileId: CodeFileId
  ): Promise<CodeFile[]> {
    await this.verifyAccess(tenantId, repoId);

    const imports = await this.prisma.fileImport.findMany({
      where: {
        targetFileId: fileId,
        repositoryId: repoId,
      },
      include: {
        sourceFile: true,
      },
    });

    return imports.map((i) => this.mapCodeFile(i.sourceFile));
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get high-churn files (hotspots)
   */
  async getHotspots(
    tenantId: TenantId,
    repoId: RepositoryId,
    days: number = HOTSPOT_DAYS
  ): Promise<FileHotspot[]> {
    await this.verifyAccess(tenantId, repoId);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Get change counts
    const changeCounts = await this.prisma.fileChange.groupBy({
      by: ['fileId'],
      where: {
        commit: {
          repositoryId: repoId,
          committedAt: { gte: sinceDate },
        },
        fileId: { not: null },
      },
      _count: { id: true },
    });

    // Get files with their stats
    const fileIds = changeCounts
      .filter((c) => c.fileId)
      .map((c) => c.fileId as string);

    const files = await this.prisma.codeFile.findMany({
      where: {
        id: { in: fileIds },
        deletedAt: null,
      },
    });

    // Get unique authors per file
    const authorCounts = await Promise.all(
      fileIds.map(async (fileId) => {
        const authors = await this.prisma.codeCommit.findMany({
          where: {
            fileChanges: {
              some: { fileId },
            },
            committedAt: { gte: sinceDate },
          },
          select: {
            authorEmail: true,
          },
          distinct: ['authorEmail'],
        });
        return { fileId, authors: authors.length };
      })
    );

    const authorMap = new Map(authorCounts.map((a) => [a.fileId, a.authors]));
    const changeMap = new Map(
      changeCounts.map((c) => [c.fileId, c._count.id])
    );

    // Calculate hotspots
    const hotspots: FileHotspot[] = files.map((file) => {
      const changeCount = changeMap.get(file.id) || 0;
      const uniqueAuthors = authorMap.get(file.id) || 0;
      const complexity = file.complexity as Record<string, number> | null;

      // Risk score: weighted combination of changes, authors, and complexity
      const complexityScore = complexity?.cyclomatic || 0;
      const riskScore = Math.min(
        100,
        Math.round(
          changeCount * 2 +
            uniqueAuthors * 5 +
            complexityScore * 0.5 +
            file.lineCount * 0.01
        )
      );

      return {
        fileId: file.id as CodeFileId,
        path: file.path,
        changeCount,
        uniqueAuthors,
        recentChanges: changeCount,
        complexity: complexity as any,
        riskScore,
      };
    });

    // Sort by risk score
    hotspots.sort((a, b) => b.riskScore - a.riskScore);

    return hotspots.slice(0, 50); // Top 50 hotspots
  }

  /**
   * Get repository statistics
   */
  async getRepositoryStats(
    tenantId: TenantId,
    repoId: RepositoryId
  ): Promise<RepositoryStats> {
    await this.verifyAccess(tenantId, repoId);

    const cacheKey = `repostats:${tenantId}:${repoId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const [fileStats, commitCount, contributors] = await Promise.all([
      this.fileTracker.computeFileStats(repoId),
      this.prisma.codeCommit.count({ where: { repositoryId: repoId } }),
      this.prisma.codeCommit.groupBy({
        by: ['authorEmail'],
        where: { repositoryId: repoId },
      }),
    ]);

    const avgComplexity = await this.prisma.codeFile.aggregate({
      where: { repositoryId: repoId, deletedAt: null },
      _avg: { lineCount: true },
    });

    const stats: RepositoryStats = {
      fileCount: fileStats.totalFiles,
      totalLines: fileStats.totalLines,
      languages: fileStats.byLanguage,
      commitCount,
      contributorCount: contributors.length,
      avgFileSize: avgComplexity._avg.lineCount || 0,
      avgComplexity: 0, // Would need to compute from complexity JSON
    };

    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));

    return stats;
  }

  /**
   * Get change activity over time
   */
  async getChangeActivity(
    tenantId: TenantId,
    repoId: RepositoryId,
    days: number = 30
  ): Promise<ChangeActivity[]> {
    await this.verifyAccess(tenantId, repoId);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const commits = await this.prisma.codeCommit.findMany({
      where: {
        repositoryId: repoId,
        committedAt: { gte: sinceDate },
      },
      select: {
        committedAt: true,
        filesChanged: true,
        insertions: true,
        deletions: true,
      },
    });

    // Group by date
    const activityMap = new Map<string, ChangeActivity>();

    for (const commit of commits) {
      const date = commit.committedAt.toISOString().split('T')[0];

      if (!activityMap.has(date)) {
        activityMap.set(date, {
          date,
          commits: 0,
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
        });
      }

      const activity = activityMap.get(date)!;
      activity.commits++;
      activity.filesChanged += commit.filesChanged;
      activity.insertions += commit.insertions;
      activity.deletions += commit.deletions;
    }

    // Sort by date
    return Array.from(activityMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  // ============================================================================
  // COMMIT QUERIES
  // ============================================================================

  /**
   * List commits
   */
  async listCommits(
    tenantId: TenantId,
    repoId: RepositoryId,
    filter?: ListCommitsFilter
  ): Promise<PaginatedResult<CodeCommit>> {
    await this.verifyAccess(tenantId, repoId);

    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;

    const where: Record<string, unknown> = { repositoryId: repoId };

    if (filter?.branch) {
      where.branchName = filter.branch;
    }
    if (filter?.author) {
      where.authorEmail = { contains: filter.author, mode: 'insensitive' };
    }
    if (filter?.since) {
      where.committedAt = { ...(where.committedAt as any), gte: filter.since };
    }
    if (filter?.until) {
      where.committedAt = { ...(where.committedAt as any), lte: filter.until };
    }

    const [commits, total] = await Promise.all([
      this.prisma.codeCommit.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { committedAt: 'desc' },
      }),
      this.prisma.codeCommit.count({ where }),
    ]);

    return {
      data: commits.map((c) => this.mapCommit(c)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get commit by SHA
   */
  async getCommitBySha(
    tenantId: TenantId,
    repoId: RepositoryId,
    sha: string
  ): Promise<CodeCommit | null> {
    await this.verifyAccess(tenantId, repoId);

    const commit = await this.prisma.codeCommit.findFirst({
      where: {
        repositoryId: repoId,
        sha: sha.length >= 40 ? sha : { startsWith: sha },
      },
      include: {
        fileChanges: {
          include: {
            file: true,
          },
        },
      },
    });

    return commit ? this.mapCommit(commit) : null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async verifyAccess(tenantId: TenantId, repoId: RepositoryId): Promise<void> {
    const repo = await this.prisma.repository.findFirst({
      where: { id: repoId, tenantId },
      select: { id: true },
    });

    if (!repo) {
      throw new Error('Repository not found');
    }
  }

  private async executeClone(
    tenantId: TenantId,
    repoId: RepositoryId,
    jobId: string
  ): Promise<void> {
    const job = await this.prisma.repoSyncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
    });

    if (!repo) return;

    try {
      // Build local path
      const localPath = this.gitSync.getRepoLocalPath(tenantId, repoId);

      // Clone repository
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { progress: 10, progressMessage: 'Cloning repository...' },
      });

      const auth: GitAuthConfig | undefined = repo.authType !== 'NONE'
        ? { type: repo.authType as any, ...(repo.authConfig as any) }
        : undefined;

      await this.gitSync.cloneRepository(repo.url, localPath, auth, {
        branch: repo.defaultBranch,
      });

      // Get head commit
      const headCommit = await this.gitSync.getHeadCommit(localPath);

      // Update repository
      await this.prisma.repository.update({
        where: { id: repoId },
        data: {
          localPath,
          clonedAt: new Date(),
          lastSyncCommit: headCommit,
          status: 'ACTIVE',
        },
      });

      // Initialize file tracking
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { progress: 50, progressMessage: 'Indexing files...' },
      });

      const trackingResult = await this.fileTracker.initializeRepository(
        repoId,
        localPath
      );

      // Update stats
      const stats = await this.fileTracker.computeFileStats(repoId);

      await this.prisma.repository.update({
        where: { id: repoId },
        data: {
          fileCount: stats.totalFiles,
          totalLines: stats.totalLines,
          languages: stats.byLanguage,
          lastSyncAt: new Date(),
        },
      });

      // Analyze imports
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { progress: 80, progressMessage: 'Analyzing imports...' },
      });

      await this.fileTracker.analyzeImportsForRepository(repoId, localPath);

      // Complete job
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          progressMessage: 'Clone complete',
          completedAt: new Date(),
          toCommit: headCommit,
          filesProcessed: trackingResult.filesAdded,
        },
      });
    } catch (error) {
      await this.prisma.repository.update({
        where: { id: repoId },
        data: {
          status: 'ERROR',
          statusMessage: error instanceof Error ? error.message : String(error),
        },
      });

      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
    }
  }

  private async executeSync(
    tenantId: TenantId,
    repoId: RepositoryId,
    jobId: string
  ): Promise<void> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repoId },
    });

    if (!repo || !repo.localPath) return;

    try {
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      // Fetch updates
      const auth: GitAuthConfig | undefined = repo.authType !== 'NONE'
        ? { type: repo.authType as any, ...(repo.authConfig as any) }
        : undefined;

      await this.gitSync.fetchUpdates(repo.localPath, auth, { prune: true });
      await this.gitSync.pull(repo.localPath, repo.defaultBranch);

      const newHeadCommit = await this.gitSync.getHeadCommit(repo.localPath);

      // Track changes
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { progress: 50, progressMessage: 'Processing changes...' },
      });

      const trackingResult = await this.fileTracker.trackFileChanges(
        repoId,
        repo.localPath,
        repo.lastSyncCommit,
        newHeadCommit
      );

      // Update stats
      const stats = await this.fileTracker.computeFileStats(repoId);
      await this.fileTracker.updateChangeFrequencies(repoId);

      await this.prisma.repository.update({
        where: { id: repoId },
        data: {
          fileCount: stats.totalFiles,
          totalLines: stats.totalLines,
          languages: stats.byLanguage,
          lastSyncCommit: newHeadCommit,
          lastSyncAt: new Date(),
          status: 'ACTIVE',
        },
      });

      // Re-analyze imports for changed files
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: { progress: 80, progressMessage: 'Updating imports...' },
      });

      await this.fileTracker.analyzeImportsForRepository(repoId, repo.localPath);

      // Complete
      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          progressMessage: 'Sync complete',
          completedAt: new Date(),
          toCommit: newHeadCommit,
          filesProcessed:
            trackingResult.filesAdded +
            trackingResult.filesModified +
            trackingResult.filesDeleted,
          commitsProcessed: trackingResult.commitsProcessed,
        },
      });

      await this.invalidateCache(tenantId, 'repositories');
    } catch (error) {
      await this.prisma.repository.update({
        where: { id: repoId },
        data: { status: 'ACTIVE' }, // Revert to active
      });

      await this.prisma.repoSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
    }
  }

  private async buildDependencyNode(
    fileId: CodeFileId,
    depth: number,
    maxDepth: number,
    visited: Set<string>
  ): Promise<DependencyNode> {
    visited.add(fileId);

    const file = await this.prisma.codeFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return {
        fileId,
        path: 'unknown',
        depth,
        children: [],
      };
    }

    const node: DependencyNode = {
      fileId,
      path: file.path,
      language: file.language || undefined,
      depth,
      children: [],
    };

    if (depth >= maxDepth) {
      return node;
    }

    // Get imports for this file
    const imports = await this.prisma.fileImport.findMany({
      where: {
        sourceFileId: fileId,
        isExternal: false,
        targetFileId: { not: null },
      },
    });

    for (const imp of imports) {
      if (imp.targetFileId && !visited.has(imp.targetFileId)) {
        const child = await this.buildDependencyNode(
          imp.targetFileId as CodeFileId,
          depth + 1,
          maxDepth,
          visited
        );
        node.children.push(child);
      }
    }

    return node;
  }

  private countNodes(node: DependencyNode): number {
    return 1 + node.children.reduce((sum, child) => sum + this.countNodes(child), 0);
  }

  private getMaxDepth(node: DependencyNode): number {
    if (node.children.length === 0) {
      return node.depth;
    }
    return Math.max(...node.children.map((c) => this.getMaxDepth(c)));
  }

  private detectProvider(url: string): RepoProviderEnum {
    if (url.includes('github.com')) return RepoProviderEnum.GITHUB;
    if (url.includes('gitlab.com')) return RepoProviderEnum.GITLAB;
    if (url.includes('bitbucket.org')) return RepoProviderEnum.BITBUCKET;
    if (url.includes('dev.azure.com') || url.includes('visualstudio.com')) {
      return RepoProviderEnum.AZURE_DEVOPS;
    }
    return RepoProviderEnum.OTHER;
  }

  private async invalidateCache(tenantId: TenantId, prefix: string): Promise<void> {
    const pattern = `${prefix}:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapRepository(repo: any): Repository {
    return {
      id: repo.id as RepositoryId,
      tenantId: repo.tenantId,
      name: repo.name,
      description: repo.description,
      url: repo.url,
      provider: repo.provider,
      defaultBranch: repo.defaultBranch,
      authType: repo.authType,
      authConfig: repo.authConfig,
      status: repo.status,
      statusMessage: repo.statusMessage,
      clonedAt: repo.clonedAt,
      lastSyncAt: repo.lastSyncAt,
      lastSyncCommit: repo.lastSyncCommit,
      localPath: repo.localPath,
      fileCount: repo.fileCount,
      totalLines: repo.totalLines,
      languages: repo.languages as Record<string, number>,
      metadata: repo.metadata as Record<string, unknown>,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      createdById: repo.createdById,
      branches: repo.branches?.map((b: any) => this.mapBranch(b)),
    };
  }

  private mapBranch(branch: any): CodeBranch {
    return {
      id: branch.id,
      repositoryId: branch.repositoryId,
      name: branch.name,
      isDefault: branch.isDefault,
      isTracked: branch.isTracked,
      headCommit: branch.headCommit,
      aheadOfDefault: branch.aheadOfDefault,
      behindDefault: branch.behindDefault,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  private mapCodeFile(file: any): CodeFile {
    return {
      id: file.id as CodeFileId,
      repositoryId: file.repositoryId,
      path: file.path,
      name: file.name,
      extension: file.extension,
      language: file.language,
      fileType: file.fileType,
      contentHash: file.contentHash,
      lineCount: file.lineCount,
      byteSize: file.byteSize,
      lastModifiedCommit: file.lastModifiedCommit,
      lastModifiedAt: file.lastModifiedAt,
      changeFrequency: file.changeFrequency,
      complexity: file.complexity as any,
      deletedAt: file.deletedAt,
      deletedInCommit: file.deletedInCommit,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private mapCommit(commit: any): CodeCommit {
    return {
      id: commit.id,
      repositoryId: commit.repositoryId,
      sha: commit.sha,
      shortSha: commit.shortSha,
      message: commit.message,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      authoredAt: commit.authoredAt,
      committerName: commit.committerName,
      committerEmail: commit.committerEmail,
      committedAt: commit.committedAt,
      parentShas: commit.parentShas as string[],
      isMerge: commit.isMerge,
      filesChanged: commit.filesChanged,
      insertions: commit.insertions,
      deletions: commit.deletions,
      branchName: commit.branchName,
      createdAt: commit.createdAt,
      fileChanges: commit.fileChanges?.map((c: any) => ({
        id: c.id,
        commitId: c.commitId,
        fileId: c.fileId,
        changeType: c.changeType,
        oldPath: c.oldPath,
        newPath: c.newPath,
        insertions: c.insertions,
        deletions: c.deletions,
        oldHash: c.oldHash,
        newHash: c.newHash,
        createdAt: c.createdAt,
      })),
    };
  }

  private mapSyncJob(job: any): RepoSyncJob {
    return {
      id: job.id,
      repositoryId: job.repositoryId,
      jobType: job.jobType,
      status: job.status,
      progress: job.progress,
      progressMessage: job.progressMessage,
      fromCommit: job.fromCommit,
      toCommit: job.toCommit,
      filesProcessed: job.filesProcessed,
      commitsProcessed: job.commitsProcessed,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      retryCount: job.retryCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
