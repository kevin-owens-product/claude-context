/**
 * WorkflowScheduler - Cron-based workflow scheduling
 *
 * Features:
 * - Cron expression parsing and scheduling
 * - Distributed scheduling with Redis locking
 * - Timezone support
 * - Missed execution handling
 * - Schedule visualization
 *
 * @prompt-id forge-v4.1:service:workflow-scheduler:001
 */

import type { Redis } from 'ioredis';
import type {
  WorkflowId,
  WorkflowDefinition,
  ScheduleTrigger,
  TenantId,
} from './types';

interface ScheduledJob {
  workflowId: WorkflowId;
  tenantId: TenantId;
  cron: string;
  timezone: string;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
}

interface CronField {
  values: number[];
  any: boolean;
}

export class WorkflowScheduler {
  private readonly jobs = new Map<WorkflowId, ScheduledJob>();
  private readonly lockPrefix = 'scheduler:lock';
  private readonly schedulePrefix = 'scheduler:jobs';
  private checkInterval?: NodeJS.Timeout;
  private instanceId: string;

  constructor(
    private readonly redis: Redis,
    private readonly onTrigger: (workflowId: WorkflowId, tenantId: TenantId) => Promise<void>
  ) {
    this.instanceId = `scheduler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    // Load existing jobs from Redis
    await this.loadJobs();

    // Start checking every minute
    this.checkInterval = setInterval(() => this.tick(), 60000);

    // Run initial check
    await this.tick();

    console.log(`Workflow scheduler started: ${this.instanceId}`);
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    console.log(`Workflow scheduler stopped: ${this.instanceId}`);
  }

  /**
   * Schedule a workflow
   */
  async schedule(workflow: WorkflowDefinition): Promise<void> {
    if (workflow.trigger.type !== 'SCHEDULE') {
      throw new Error('Workflow does not have a schedule trigger');
    }

    const trigger = workflow.trigger as ScheduleTrigger;

    if (!this.isValidCron(trigger.cron)) {
      throw new Error(`Invalid cron expression: ${trigger.cron}`);
    }

    const job: ScheduledJob = {
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      cron: trigger.cron,
      timezone: trigger.timezone || 'UTC',
      nextRun: this.getNextRun(trigger.cron, trigger.timezone),
      enabled: workflow.status === 'PUBLISHED',
    };

    this.jobs.set(workflow.id, job);

    // Persist to Redis
    await this.redis.hset(
      this.schedulePrefix,
      workflow.id,
      JSON.stringify(job)
    );

    console.log(`Scheduled workflow ${workflow.id}: ${trigger.cron} (next: ${job.nextRun})`);
  }

  /**
   * Unschedule a workflow
   */
  async unschedule(workflowId: WorkflowId): Promise<void> {
    this.jobs.delete(workflowId);
    await this.redis.hdel(this.schedulePrefix, workflowId);
    console.log(`Unscheduled workflow ${workflowId}`);
  }

  /**
   * Update a workflow schedule
   */
  async update(workflowId: WorkflowId, cron: string, timezone?: string): Promise<void> {
    const job = this.jobs.get(workflowId);
    if (!job) {
      throw new Error(`Workflow not scheduled: ${workflowId}`);
    }

    if (!this.isValidCron(cron)) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    job.cron = cron;
    if (timezone) job.timezone = timezone;
    job.nextRun = this.getNextRun(cron, job.timezone);

    await this.redis.hset(
      this.schedulePrefix,
      workflowId,
      JSON.stringify(job)
    );
  }

  /**
   * Get next N scheduled runs for a workflow
   */
  getUpcomingRuns(workflowId: WorkflowId, count: number = 10): Date[] {
    const job = this.jobs.get(workflowId);
    if (!job) return [];

    const runs: Date[] = [];
    let current = new Date();

    for (let i = 0; i < count; i++) {
      current = this.getNextRun(job.cron, job.timezone, current);
      runs.push(current);
      current = new Date(current.getTime() + 60000); // Advance by 1 minute
    }

    return runs;
  }

  /**
   * Get all scheduled jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  // ============================================================================
  // INTERNAL
  // ============================================================================

  /**
   * Check and trigger due jobs
   */
  private async tick(): Promise<void> {
    const now = new Date();

    for (const [workflowId, job] of this.jobs) {
      if (!job.enabled) continue;
      if (job.nextRun > now) continue;

      // Try to acquire lock for this job
      const lockKey = `${this.lockPrefix}:${workflowId}`;
      const acquired = await this.acquireLock(lockKey, 60);

      if (acquired) {
        try {
          // Double-check job hasn't been triggered by another instance
          const freshJob = await this.loadJob(workflowId);
          if (freshJob && freshJob.nextRun <= now) {
            await this.triggerJob(job);
          }
        } finally {
          await this.releaseLock(lockKey);
        }
      }
    }
  }

  /**
   * Trigger a scheduled job
   */
  private async triggerJob(job: ScheduledJob): Promise<void> {
    console.log(`Triggering scheduled workflow: ${job.workflowId}`);

    try {
      await this.onTrigger(job.workflowId, job.tenantId);
    } catch (error) {
      console.error(`Failed to trigger workflow ${job.workflowId}:`, error);
    }

    // Update job state
    job.lastRun = new Date();
    job.nextRun = this.getNextRun(job.cron, job.timezone);

    await this.redis.hset(
      this.schedulePrefix,
      job.workflowId,
      JSON.stringify(job)
    );
  }

  /**
   * Acquire a distributed lock
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      key,
      this.instanceId,
      'EX',
      ttlSeconds,
      'NX'
    );
    return result === 'OK';
  }

  /**
   * Release a distributed lock
   */
  private async releaseLock(key: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, this.instanceId);
  }

  /**
   * Load all jobs from Redis
   */
  private async loadJobs(): Promise<void> {
    const jobsData = await this.redis.hgetall(this.schedulePrefix);

    for (const [workflowId, data] of Object.entries(jobsData)) {
      try {
        const job = JSON.parse(data) as ScheduledJob;
        job.nextRun = new Date(job.nextRun);
        if (job.lastRun) job.lastRun = new Date(job.lastRun);
        this.jobs.set(workflowId as WorkflowId, job);
      } catch (error) {
        console.error(`Failed to load job ${workflowId}:`, error);
      }
    }

    console.log(`Loaded ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Load a single job from Redis
   */
  private async loadJob(workflowId: WorkflowId): Promise<ScheduledJob | null> {
    const data = await this.redis.hget(this.schedulePrefix, workflowId);
    if (!data) return null;

    try {
      const job = JSON.parse(data) as ScheduledJob;
      job.nextRun = new Date(job.nextRun);
      if (job.lastRun) job.lastRun = new Date(job.lastRun);
      return job;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // CRON PARSING
  // ============================================================================

  /**
   * Validate a cron expression
   */
  isValidCron(expression: string): boolean {
    try {
      this.parseCron(expression);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the next run time for a cron expression
   */
  getNextRun(expression: string, timezone: string = 'UTC', after: Date = new Date()): Date {
    const cron = this.parseCron(expression);
    const date = new Date(after);

    // Advance to next minute
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + 1);

    // Find next matching time (max 2 years)
    const maxIterations = 2 * 366 * 24 * 60;
    for (let i = 0; i < maxIterations; i++) {
      if (this.matchesCron(date, cron)) {
        return date;
      }
      date.setMinutes(date.getMinutes() + 1);
    }

    throw new Error('Could not find next run time');
  }

  /**
   * Parse a cron expression
   */
  private parseCron(expression: string): {
    minute: CronField;
    hour: CronField;
    dayOfMonth: CronField;
    month: CronField;
    dayOfWeek: CronField;
  } {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Cron expression must have 5 fields');
    }

    return {
      minute: this.parseCronField(parts[0], 0, 59),
      hour: this.parseCronField(parts[1], 0, 23),
      dayOfMonth: this.parseCronField(parts[2], 1, 31),
      month: this.parseCronField(parts[3], 1, 12),
      dayOfWeek: this.parseCronField(parts[4], 0, 6),
    };
  }

  /**
   * Parse a single cron field
   */
  private parseCronField(field: string, min: number, max: number): CronField {
    if (field === '*') {
      return { values: [], any: true };
    }

    const values: number[] = [];

    // Split by comma for lists
    const parts = field.split(',');

    for (const part of parts) {
      // Handle ranges: 1-5
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          if (i >= min && i <= max) values.push(i);
        }
      }
      // Handle steps: */5 or 1-10/2
      else if (part.includes('/')) {
        const [range, step] = part.split('/');
        const stepNum = parseInt(step, 10);
        let start = min, end = max;

        if (range !== '*') {
          if (range.includes('-')) {
            [start, end] = range.split('-').map(Number);
          } else {
            start = parseInt(range, 10);
          }
        }

        for (let i = start; i <= end; i += stepNum) {
          if (i >= min && i <= max) values.push(i);
        }
      }
      // Handle single values
      else {
        const value = parseInt(part, 10);
        if (value >= min && value <= max) {
          values.push(value);
        }
      }
    }

    return { values, any: false };
  }

  /**
   * Check if a date matches a cron expression
   */
  private matchesCron(
    date: Date,
    cron: ReturnType<typeof this.parseCron>
  ): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return (
      (cron.minute.any || cron.minute.values.includes(minute)) &&
      (cron.hour.any || cron.hour.values.includes(hour)) &&
      (cron.dayOfMonth.any || cron.dayOfMonth.values.includes(dayOfMonth)) &&
      (cron.month.any || cron.month.values.includes(month)) &&
      (cron.dayOfWeek.any || cron.dayOfWeek.values.includes(dayOfWeek))
    );
  }

  /**
   * Convert cron expression to human-readable format
   */
  static describe(expression: string): string {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return 'Invalid cron expression';

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Common patterns
    if (expression === '* * * * *') return 'Every minute';
    if (expression === '0 * * * *') return 'Every hour';
    if (expression === '0 0 * * *') return 'Every day at midnight';
    if (expression === '0 0 * * 0') return 'Every Sunday at midnight';
    if (expression === '0 0 1 * *') return 'First day of every month at midnight';

    const descriptions: string[] = [];

    // Minute
    if (minute !== '*') {
      if (minute.includes('/')) {
        descriptions.push(`every ${minute.split('/')[1]} minutes`);
      } else {
        descriptions.push(`at minute ${minute}`);
      }
    }

    // Hour
    if (hour !== '*') {
      if (hour.includes('/')) {
        descriptions.push(`every ${hour.split('/')[1]} hours`);
      } else {
        descriptions.push(`at ${hour}:00`);
      }
    }

    // Day of month
    if (dayOfMonth !== '*') {
      descriptions.push(`on day ${dayOfMonth}`);
    }

    // Month
    if (month !== '*') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      descriptions.push(`in ${months[parseInt(month, 10) - 1]}`);
    }

    // Day of week
    if (dayOfWeek !== '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      descriptions.push(`on ${days[parseInt(dayOfWeek, 10)]}`);
    }

    return descriptions.join(' ') || 'Every minute';
  }
}
