/**
 * WorkflowScheduler Tests
 *
 * @prompt-id forge-v4.1:test:workflow-scheduler:001
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowScheduler } from '../scheduler';
import type { WorkflowDefinition, ScheduleTrigger, TenantId, WorkflowId } from '../types';

// Mock Redis
const createMockRedis = () => ({
  hset: vi.fn().mockResolvedValue(1),
  hdel: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  hget: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  eval: vi.fn().mockResolvedValue(1),
});

describe('WorkflowScheduler', () => {
  let scheduler: WorkflowScheduler;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let onTrigger: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    onTrigger = vi.fn().mockResolvedValue(undefined);
    scheduler = new WorkflowScheduler(mockRedis as any, onTrigger);
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  describe('Cron Parsing', () => {
    describe('isValidCron', () => {
      it('should validate standard cron expressions', () => {
        expect(scheduler.isValidCron('* * * * *')).toBe(true);
        expect(scheduler.isValidCron('0 * * * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 * * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 1 * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 * * 0')).toBe(true);
      });

      it('should validate cron with ranges', () => {
        expect(scheduler.isValidCron('0-30 * * * *')).toBe(true);
        expect(scheduler.isValidCron('0 9-17 * * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 1-15 * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 * * 1-5')).toBe(true);
      });

      it('should validate cron with steps', () => {
        expect(scheduler.isValidCron('*/5 * * * *')).toBe(true);
        expect(scheduler.isValidCron('0 */2 * * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 */3 * *')).toBe(true);
      });

      it('should validate cron with lists', () => {
        expect(scheduler.isValidCron('0,15,30,45 * * * *')).toBe(true);
        expect(scheduler.isValidCron('0 9,12,15 * * *')).toBe(true);
        expect(scheduler.isValidCron('0 0 * * 0,6')).toBe(true);
      });

      it('should reject invalid cron expressions', () => {
        expect(scheduler.isValidCron('* * * *')).toBe(false); // Only 4 fields
        expect(scheduler.isValidCron('* * * * * *')).toBe(false); // 6 fields
        expect(scheduler.isValidCron('')).toBe(false);
        expect(scheduler.isValidCron('invalid')).toBe(false);
      });
    });

    describe('getNextRun', () => {
      it('should calculate next run for every minute', () => {
        const now = new Date('2026-01-24T10:30:00Z');
        const next = scheduler.getNextRun('* * * * *', 'UTC', now);

        expect(next.getMinutes()).toBe(31);
        expect(next.getHours()).toBe(10);
      });

      it('should calculate next run for every hour', () => {
        const now = new Date('2026-01-24T10:30:00Z');
        const next = scheduler.getNextRun('0 * * * *', 'UTC', now);

        expect(next.getMinutes()).toBe(0);
        expect(next.getHours()).toBe(11);
      });

      it('should calculate next run for daily at midnight', () => {
        const now = new Date('2026-01-24T10:30:00Z');
        const next = scheduler.getNextRun('0 0 * * *', 'UTC', now);

        expect(next.getMinutes()).toBe(0);
        expect(next.getHours()).toBe(0);
        expect(next.getDate()).toBe(25);
      });

      it('should calculate next run for specific time', () => {
        const now = new Date('2026-01-24T08:00:00Z');
        const next = scheduler.getNextRun('30 9 * * *', 'UTC', now);

        expect(next.getMinutes()).toBe(30);
        expect(next.getHours()).toBe(9);
        expect(next.getDate()).toBe(24);
      });

      it('should calculate next run for weekdays only', () => {
        // Friday
        const friday = new Date('2026-01-24T20:00:00Z');
        const next = scheduler.getNextRun('0 9 * * 1-5', 'UTC', friday);

        // Should be Monday (Jan 27)
        expect(next.getDay()).toBe(1); // Monday
        expect(next.getDate()).toBe(27);
      });

      it('should calculate next run with step values', () => {
        const now = new Date('2026-01-24T10:02:00Z');
        const next = scheduler.getNextRun('*/15 * * * *', 'UTC', now);

        expect(next.getMinutes()).toBe(15);
      });

      it('should calculate next run for specific day of month', () => {
        const now = new Date('2026-01-24T10:00:00Z');
        const next = scheduler.getNextRun('0 0 1 * *', 'UTC', now);

        expect(next.getDate()).toBe(1);
        expect(next.getMonth()).toBe(1); // February
      });
    });

    describe('describe', () => {
      it('should describe common cron patterns', () => {
        expect(WorkflowScheduler.describe('* * * * *')).toBe('Every minute');
        expect(WorkflowScheduler.describe('0 * * * *')).toBe('Every hour');
        expect(WorkflowScheduler.describe('0 0 * * *')).toBe('Every day at midnight');
        expect(WorkflowScheduler.describe('0 0 * * 0')).toBe('Every Sunday at midnight');
        expect(WorkflowScheduler.describe('0 0 1 * *')).toBe('First day of every month at midnight');
      });

      it('should describe custom patterns', () => {
        expect(WorkflowScheduler.describe('30 9 * * *')).toContain('at minute 30');
        expect(WorkflowScheduler.describe('0 9 * * 1')).toContain('on Mon');
        expect(WorkflowScheduler.describe('*/15 * * * *')).toContain('every 15 minutes');
      });

      it('should handle invalid expressions', () => {
        expect(WorkflowScheduler.describe('invalid')).toBe('Invalid cron expression');
      });
    });
  });

  describe('Workflow Scheduling', () => {
    const createMockWorkflow = (overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition => ({
      id: 'wf_123' as WorkflowId,
      tenantId: 'tenant_123' as TenantId,
      name: 'Test Workflow',
      version: 1,
      status: 'PUBLISHED',
      trigger: {
        type: 'SCHEDULE',
        cron: '0 9 * * *',
        timezone: 'UTC',
      } as ScheduleTrigger,
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user_123',
      ...overrides,
    });

    it('should schedule a workflow', async () => {
      const workflow = createMockWorkflow();

      await scheduler.schedule(workflow);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'scheduler:jobs',
        workflow.id,
        expect.any(String)
      );

      const jobs = scheduler.getJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].workflowId).toBe(workflow.id);
    });

    it('should reject non-schedule triggers', async () => {
      const workflow = createMockWorkflow({
        trigger: { type: 'MANUAL' } as any,
      });

      await expect(scheduler.schedule(workflow)).rejects.toThrow('does not have a schedule trigger');
    });

    it('should reject invalid cron expressions', async () => {
      const workflow = createMockWorkflow({
        trigger: {
          type: 'SCHEDULE',
          cron: 'invalid',
          timezone: 'UTC',
        } as ScheduleTrigger,
      });

      await expect(scheduler.schedule(workflow)).rejects.toThrow('Invalid cron expression');
    });

    it('should unschedule a workflow', async () => {
      const workflow = createMockWorkflow();

      await scheduler.schedule(workflow);
      await scheduler.unschedule(workflow.id);

      expect(mockRedis.hdel).toHaveBeenCalledWith('scheduler:jobs', workflow.id);
      expect(scheduler.getJobs()).toHaveLength(0);
    });

    it('should update a workflow schedule', async () => {
      const workflow = createMockWorkflow();

      await scheduler.schedule(workflow);
      await scheduler.update(workflow.id, '0 18 * * *');

      const jobs = scheduler.getJobs();
      expect(jobs[0].cron).toBe('0 18 * * *');
    });

    it('should throw when updating non-existent workflow', async () => {
      await expect(
        scheduler.update('wf_nonexistent' as WorkflowId, '0 9 * * *')
      ).rejects.toThrow('Workflow not scheduled');
    });
  });

  describe('Upcoming Runs', () => {
    it('should return upcoming runs for a workflow', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf_123' as WorkflowId,
        tenantId: 'tenant_123' as TenantId,
        name: 'Test Workflow',
        version: 1,
        status: 'PUBLISHED',
        trigger: {
          type: 'SCHEDULE',
          cron: '0 * * * *', // Every hour
          timezone: 'UTC',
        } as ScheduleTrigger,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      };

      await scheduler.schedule(workflow);

      const runs = scheduler.getUpcomingRuns(workflow.id, 5);

      expect(runs).toHaveLength(5);

      // Each run should be 1 hour apart
      for (let i = 1; i < runs.length; i++) {
        const diff = runs[i].getTime() - runs[i - 1].getTime();
        expect(diff).toBe(60 * 60 * 1000); // 1 hour in ms
      }
    });

    it('should return empty array for non-existent workflow', () => {
      const runs = scheduler.getUpcomingRuns('wf_nonexistent' as WorkflowId);
      expect(runs).toHaveLength(0);
    });
  });

  describe('Job Loading', () => {
    it('should load jobs from Redis on start', async () => {
      const jobData = {
        workflowId: 'wf_123',
        tenantId: 'tenant_123',
        cron: '0 9 * * *',
        timezone: 'UTC',
        nextRun: new Date().toISOString(),
        enabled: true,
      };

      mockRedis.hgetall.mockResolvedValue({
        'wf_123': JSON.stringify(jobData),
      });

      await scheduler.start();

      expect(scheduler.getJobs()).toHaveLength(1);
    });

    it('should handle malformed job data gracefully', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'wf_123': 'not valid json',
      });

      // Should not throw
      await scheduler.start();

      expect(scheduler.getJobs()).toHaveLength(0);
    });
  });

  describe('Distributed Locking', () => {
    it('should acquire lock for job execution', async () => {
      const workflow: WorkflowDefinition = {
        id: 'wf_123' as WorkflowId,
        tenantId: 'tenant_123' as TenantId,
        name: 'Test Workflow',
        version: 1,
        status: 'PUBLISHED',
        trigger: {
          type: 'SCHEDULE',
          cron: '* * * * *', // Every minute
          timezone: 'UTC',
        } as ScheduleTrigger,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      };

      await scheduler.schedule(workflow);

      // Simulate job becoming due
      const jobs = scheduler.getJobs();
      jobs[0].nextRun = new Date(Date.now() - 60000); // 1 minute ago

      await scheduler.start();

      // Should have tried to acquire lock
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('scheduler:lock:wf_123'),
        expect.any(String),
        'EX',
        60,
        'NX'
      );
    });

    it('should skip job if lock not acquired', async () => {
      mockRedis.set.mockResolvedValue(null); // Lock not acquired

      const workflow: WorkflowDefinition = {
        id: 'wf_123' as WorkflowId,
        tenantId: 'tenant_123' as TenantId,
        name: 'Test Workflow',
        version: 1,
        status: 'PUBLISHED',
        trigger: {
          type: 'SCHEDULE',
          cron: '* * * * *',
          timezone: 'UTC',
        } as ScheduleTrigger,
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      };

      await scheduler.schedule(workflow);

      // Simulate job becoming due
      const jobs = scheduler.getJobs();
      jobs[0].nextRun = new Date(Date.now() - 60000);

      await scheduler.start();

      // Trigger should not have been called
      expect(onTrigger).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop cleanly', async () => {
      await scheduler.start();
      await scheduler.stop();

      // No assertions needed - just verifying no errors thrown
    });

    it('should handle multiple stop calls gracefully', async () => {
      await scheduler.start();
      await scheduler.stop();
      await scheduler.stop();

      // No assertions needed - just verifying no errors thrown
    });
  });
});
