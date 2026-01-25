/**
 * Repository Sync Job Service
 * Background job processing for repository sync operations using BullMQ.
 *
 * @prompt-id forge-v4.1:service:repo-sync-job:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import type { TenantId } from '../types';
import type { RepositoryId, SyncJobType } from '../types/codebase.types';

// Job types
export interface RepoSyncJobData {
  tenantId: string;
  repositoryId: string;
  jobType: SyncJobType;
  options?: {
    fromCommit?: string;
    toCommit?: string;
    fileIds?: string[];
    force?: boolean;
  };
}

export interface RepoSyncJobResult {
  success: boolean;
  filesProcessed: number;
  commitsProcessed: number;
  symbolsExtracted?: number;
  error?: string;
  duration: number;
}

// Job names
export const REPO_SYNC_QUEUE = 'repo-sync';

export const JOB_NAMES = {
  INITIAL_CLONE: 'initial-clone',
  INCREMENTAL_SYNC: 'incremental-sync',
  FULL_RESYNC: 'full-resync',
  IMPORT_ANALYSIS: 'import-analysis',
  SYMBOL_ANALYSIS: 'symbol-analysis',
  FILE_TRACKING: 'file-tracking',
} as const;

export interface RepoSyncQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

const DEFAULT_CONFIG: RepoSyncQueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

export class RepoSyncJobService {
  private queue: Queue<RepoSyncJobData, RepoSyncJobResult>;
  private worker: Worker<RepoSyncJobData, RepoSyncJobResult> | null = null;
  private queueEvents: QueueEvents;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: RepoSyncQueueConfig = DEFAULT_CONFIG
  ) {
    // Initialize queue
    this.queue = new Queue<RepoSyncJobData, RepoSyncJobResult>(REPO_SYNC_QUEUE, {
      connection: this.config.redis,
      defaultJobOptions: this.config.defaultJobOptions,
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents(REPO_SYNC_QUEUE, {
      connection: this.config.redis,
    });
  }

  /**
   * Start the worker to process jobs
   */
  async startWorker(
    handlers: {
      onInitialClone?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
      onIncrementalSync?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
      onFullResync?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
      onImportAnalysis?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
      onSymbolAnalysis?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
      onFileTracking?: (job: Job<RepoSyncJobData>) => Promise<RepoSyncJobResult>;
    }
  ): Promise<void> {
    if (this.worker) {
      throw new Error('Worker already started');
    }

    this.worker = new Worker<RepoSyncJobData, RepoSyncJobResult>(
      REPO_SYNC_QUEUE,
      async (job) => {
        const startTime = Date.now();
        this.isProcessing = true;

        try {
          // Update job status in database
          await this.updateJobStatus(job.data.repositoryId, job.id!, 'RUNNING', {
            progressMessage: `Starting ${job.name}...`,
          });

          let result: RepoSyncJobResult;

          switch (job.name) {
            case JOB_NAMES.INITIAL_CLONE:
              if (!handlers.onInitialClone) {
                throw new Error('No handler for initial clone');
              }
              result = await handlers.onInitialClone(job);
              break;

            case JOB_NAMES.INCREMENTAL_SYNC:
              if (!handlers.onIncrementalSync) {
                throw new Error('No handler for incremental sync');
              }
              result = await handlers.onIncrementalSync(job);
              break;

            case JOB_NAMES.FULL_RESYNC:
              if (!handlers.onFullResync) {
                throw new Error('No handler for full resync');
              }
              result = await handlers.onFullResync(job);
              break;

            case JOB_NAMES.IMPORT_ANALYSIS:
              if (!handlers.onImportAnalysis) {
                throw new Error('No handler for import analysis');
              }
              result = await handlers.onImportAnalysis(job);
              break;

            case JOB_NAMES.SYMBOL_ANALYSIS:
              if (!handlers.onSymbolAnalysis) {
                throw new Error('No handler for symbol analysis');
              }
              result = await handlers.onSymbolAnalysis(job);
              break;

            case JOB_NAMES.FILE_TRACKING:
              if (!handlers.onFileTracking) {
                throw new Error('No handler for file tracking');
              }
              result = await handlers.onFileTracking(job);
              break;

            default:
              throw new Error(`Unknown job type: ${job.name}`);
          }

          // Update job status on success
          await this.updateJobStatus(job.data.repositoryId, job.id!, 'COMPLETED', {
            filesProcessed: result.filesProcessed,
            commitsProcessed: result.commitsProcessed,
          });

          return {
            ...result,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Update job status on failure
          await this.updateJobStatus(job.data.repositoryId, job.id!, 'FAILED', {
            error: errorMessage,
          });

          return {
            success: false,
            filesProcessed: 0,
            commitsProcessed: 0,
            error: errorMessage,
            duration: Date.now() - startTime,
          };
        } finally {
          this.isProcessing = false;
        }
      },
      {
        connection: this.config.redis,
        concurrency: 2, // Process 2 jobs at a time
      }
    );

    // Set up event handlers
    this.worker.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed:`, result);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress:`, progress);
    });
  }

  /**
   * Stop the worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  /**
   * Queue an initial clone job
   */
  async queueInitialClone(
    tenantId: TenantId,
    repositoryId: RepositoryId
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.INITIAL_CLONE,
      {
        tenantId,
        repositoryId,
        jobType: 'INITIAL_CLONE' as SyncJobType,
      },
      {
        priority: 1, // High priority
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'INITIAL_CLONE');
    return job.id!;
  }

  /**
   * Queue an incremental sync job
   */
  async queueIncrementalSync(
    tenantId: TenantId,
    repositoryId: RepositoryId,
    fromCommit?: string
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.INCREMENTAL_SYNC,
      {
        tenantId,
        repositoryId,
        jobType: 'INCREMENTAL_SYNC' as SyncJobType,
        options: { fromCommit },
      },
      {
        priority: 2,
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'INCREMENTAL_SYNC');
    return job.id!;
  }

  /**
   * Queue a full resync job
   */
  async queueFullResync(
    tenantId: TenantId,
    repositoryId: RepositoryId
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.FULL_RESYNC,
      {
        tenantId,
        repositoryId,
        jobType: 'FULL_RESYNC' as SyncJobType,
        options: { force: true },
      },
      {
        priority: 3,
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'FULL_RESYNC');
    return job.id!;
  }

  /**
   * Queue an import analysis job
   */
  async queueImportAnalysis(
    tenantId: TenantId,
    repositoryId: RepositoryId,
    fileIds?: string[]
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.IMPORT_ANALYSIS,
      {
        tenantId,
        repositoryId,
        jobType: 'IMPORT_ANALYSIS' as SyncJobType,
        options: { fileIds },
      },
      {
        priority: 4,
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'IMPORT_ANALYSIS');
    return job.id!;
  }

  /**
   * Queue a symbol analysis job
   */
  async queueSymbolAnalysis(
    tenantId: TenantId,
    repositoryId: RepositoryId,
    fileIds?: string[]
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.SYMBOL_ANALYSIS,
      {
        tenantId,
        repositoryId,
        jobType: 'SYMBOL_ANALYSIS' as SyncJobType,
        options: { fileIds },
      },
      {
        priority: 5,
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'SYMBOL_ANALYSIS');
    return job.id!;
  }

  /**
   * Queue a file tracking job
   */
  async queueFileTracking(
    tenantId: TenantId,
    repositoryId: RepositoryId,
    fromCommit: string,
    toCommit: string
  ): Promise<string> {
    const job = await this.queue.add(
      JOB_NAMES.FILE_TRACKING,
      {
        tenantId,
        repositoryId,
        jobType: 'FILE_TRACKING' as SyncJobType,
        options: { fromCommit, toCommit },
      },
      {
        priority: 4,
      }
    );

    await this.createJobRecord(tenantId, repositoryId, job.id!, 'FILE_TRACKING');
    return job.id!;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    result?: RepoSyncJobResult;
    error?: string;
  } | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress as number;

    return {
      state,
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue as RepoSyncJobResult | undefined,
      error: job.failedReason,
    };
  }

  /**
   * Get pending jobs for a repository
   */
  async getPendingJobs(repositoryId: RepositoryId): Promise<Job<RepoSyncJobData>[]> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
    return jobs.filter((job) => job.data.repositoryId === repositoryId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      return true;
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(maxAge, 1000, 'completed');
    await this.queue.clean(maxAge, 1000, 'failed');
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.stopWorker();
    await this.queue.close();
    await this.queueEvents.close();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async createJobRecord(
    tenantId: string,
    repositoryId: string,
    jobId: string,
    jobType: string
  ): Promise<void> {
    await this.prisma.repoSyncJob.create({
      data: {
        id: jobId,
        repositoryId,
        jobType: jobType as any,
        status: 'PENDING',
        progress: 0,
        filesProcessed: 0,
        commitsProcessed: 0,
        retryCount: 0,
      },
    });
  }

  private async updateJobStatus(
    repositoryId: string,
    jobId: string,
    status: 'RUNNING' | 'COMPLETED' | 'FAILED',
    updates: {
      progressMessage?: string;
      filesProcessed?: number;
      commitsProcessed?: number;
      error?: string;
    }
  ): Promise<void> {
    const data: any = {
      status,
      ...updates,
    };

    if (status === 'RUNNING') {
      data.startedAt = new Date();
    } else if (status === 'COMPLETED' || status === 'FAILED') {
      data.completedAt = new Date();
    }

    await this.prisma.repoSyncJob.update({
      where: { id: jobId },
      data,
    });

    // Also update repository status if needed
    if (status === 'RUNNING') {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: { status: 'SYNCING' },
      });
    } else if (status === 'COMPLETED') {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      });
    } else if (status === 'FAILED') {
      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          status: 'ERROR',
          statusMessage: updates.error,
        },
      });
    }
  }
}

/**
 * Create a default repo sync job service instance
 */
export function createRepoSyncJobService(
  prisma: PrismaClient,
  config?: Partial<RepoSyncQueueConfig>
): RepoSyncJobService {
  return new RepoSyncJobService(prisma, {
    ...DEFAULT_CONFIG,
    ...config,
    redis: {
      ...DEFAULT_CONFIG.redis,
      ...config?.redis,
    },
  });
}
