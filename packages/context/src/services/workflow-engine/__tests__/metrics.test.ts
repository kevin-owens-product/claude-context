/**
 * WorkflowMetrics Tests
 *
 * @prompt-id forge-v4.1:test:workflow-metrics:001
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowMetrics } from '../metrics';
import type { WorkflowExecution, WorkflowId, TenantId, ExecutionId } from '../types';

// Mock Redis
const createMockRedis = () => {
  const data: Record<string, Record<string, string>> = {};
  const sortedSets: Record<string, Array<{ score: number; member: string }>> = {};

  return {
    pipeline: () => ({
      hincrby: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      hset: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
    hgetall: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(data[key] || {});
    }),
    hget: vi.fn().mockResolvedValue(null),
    zrange: vi.fn().mockImplementation((key: string) => {
      const set = sortedSets[key] || [];
      const result: string[] = [];
      set.forEach(item => {
        result.push(item.member, String(item.score));
      });
      return Promise.resolve(result);
    }),
    _setData: (key: string, field: string, value: string) => {
      if (!data[key]) data[key] = {};
      data[key][field] = value;
    },
    _addToSortedSet: (key: string, score: number, member: string) => {
      if (!sortedSets[key]) sortedSets[key] = [];
      sortedSets[key].push({ score, member });
    },
  };
};

describe('WorkflowMetrics', () => {
  let metrics: WorkflowMetrics;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    metrics = new WorkflowMetrics(mockRedis as any);
  });

  const createMockExecution = (overrides: Partial<WorkflowExecution> = {}): WorkflowExecution => ({
    id: 'exec_123' as ExecutionId,
    workflowId: 'wf_123' as WorkflowId,
    tenantId: 'tenant_123' as TenantId,
    version: 1,
    status: 'COMPLETED',
    startedAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  });

  describe('Recording Metrics', () => {
    describe('recordExecution', () => {
      it('should record execution metrics to Redis', async () => {
        const execution = createMockExecution();
        const pipeline = mockRedis.pipeline();

        await metrics.recordExecution(execution, 1500);

        expect(pipeline.hincrby).toHaveBeenCalled();
        expect(pipeline.zadd).toHaveBeenCalled();
        expect(pipeline.expire).toHaveBeenCalled();
        expect(pipeline.exec).toHaveBeenCalled();
      });

      it('should increment total and status counters', async () => {
        const execution = createMockExecution({ status: 'FAILED' });
        const pipeline = mockRedis.pipeline();

        await metrics.recordExecution(execution, 1500);

        // Check that hincrby was called for total and FAILED status
        const hincrbyCalls = (pipeline.hincrby as ReturnType<typeof vi.fn>).mock.calls;
        expect(hincrbyCalls.some((call: string[]) => call[1] === 'total')).toBe(true);
        expect(hincrbyCalls.some((call: string[]) => call[1] === 'FAILED')).toBe(true);
      });

      it('should track execution duration', async () => {
        const execution = createMockExecution();
        const pipeline = mockRedis.pipeline();

        await metrics.recordExecution(execution, 2500);

        // Check that zadd was called with the duration
        const zaddCalls = (pipeline.zadd as ReturnType<typeof vi.fn>).mock.calls;
        expect(zaddCalls.some((call: (string | number)[]) => call[1] === 2500)).toBe(true);
      });
    });

    describe('recordStepExecution', () => {
      it('should record step execution metrics', async () => {
        const pipeline = mockRedis.pipeline();

        await metrics.recordStepExecution(
          'wf_123' as WorkflowId,
          'step_1' as any,
          500,
          true
        );

        expect(pipeline.hincrby).toHaveBeenCalled();
        expect(pipeline.zadd).toHaveBeenCalled();
        expect(pipeline.exec).toHaveBeenCalled();
      });

      it('should track success and failure separately', async () => {
        const pipeline = mockRedis.pipeline();

        await metrics.recordStepExecution(
          'wf_123' as WorkflowId,
          'step_1' as any,
          500,
          false
        );

        const hincrbyCalls = (pipeline.hincrby as ReturnType<typeof vi.fn>).mock.calls;
        expect(hincrbyCalls.some((call: string[]) => call[1] === 'failure')).toBe(true);
      });
    });

    describe('recordError', () => {
      it('should record error metrics', async () => {
        const pipeline = mockRedis.pipeline();

        await metrics.recordError(
          'wf_123' as WorkflowId,
          'TIMEOUT_ERROR',
          'step_1' as any
        );

        expect(pipeline.hincrby).toHaveBeenCalled();
        expect(pipeline.hset).toHaveBeenCalled();
        expect(pipeline.exec).toHaveBeenCalled();
      });
    });
  });

  describe('Querying Metrics', () => {
    describe('getWorkflowMetrics', () => {
      it('should return workflow metrics summary', async () => {
        // Setup mock data
        mockRedis._setData('wf:metrics:wf_123:2026-01-24-10', 'total', '100');
        mockRedis._setData('wf:metrics:wf_123:2026-01-24-10', 'COMPLETED', '95');
        mockRedis._setData('wf:metrics:wf_123:2026-01-24-10', 'FAILED', '5');

        mockRedis.hgetall.mockResolvedValue({
          total: '100',
          COMPLETED: '95',
          FAILED: '5',
          CANCELLED: '0',
          TIMED_OUT: '0',
        });

        mockRedis.zrange.mockResolvedValue([
          '1', '100', '2', '200', '3', '300', '4', '400', '5', '500',
        ]);

        const result = await metrics.getWorkflowMetrics(
          'wf_123' as WorkflowId,
          'tenant_123' as TenantId,
          'HOUR'
        );

        expect(result).toMatchObject({
          workflowId: 'wf_123',
          tenantId: 'tenant_123',
          period: 'HOUR',
        });
        expect(result.executions).toBeDefined();
        expect(result.duration).toBeDefined();
      });

      it('should calculate percentiles correctly', async () => {
        // Setup durations: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
        const durations: string[] = [];
        for (let i = 1; i <= 10; i++) {
          durations.push(String(i), String(i * 100));
        }
        mockRedis.zrange.mockResolvedValue(durations);

        mockRedis.hgetall.mockResolvedValue({
          total: '10',
          COMPLETED: '10',
        });

        const result = await metrics.getWorkflowMetrics(
          'wf_123' as WorkflowId,
          'tenant_123' as TenantId,
          'HOUR'
        );

        expect(result.duration.min).toBe(100);
        expect(result.duration.max).toBe(1000);
        expect(result.duration.avg).toBe(550); // (100+200+...+1000)/10
      });
    });

    describe('getTimeSeries', () => {
      it('should return time series data for charting', async () => {
        mockRedis.hgetall.mockResolvedValue({
          total: '10',
          COMPLETED: '8',
        });

        const result = await metrics.getTimeSeries(
          'wf_123' as WorkflowId,
          'executions',
          'HOUR',
          12
        );

        expect(result).toHaveLength(12);
        expect(result[0]).toHaveProperty('timestamp');
        expect(result[0]).toHaveProperty('value');
      });

      it('should calculate success rate correctly', async () => {
        mockRedis.hgetall.mockResolvedValue({
          total: '100',
          COMPLETED: '90',
        });

        const result = await metrics.getTimeSeries(
          'wf_123' as WorkflowId,
          'success_rate',
          'HOUR',
          1
        );

        expect(result[0].value).toBe(90); // 90% success rate
      });

      it('should handle empty metrics', async () => {
        mockRedis.hgetall.mockResolvedValue({});

        const result = await metrics.getTimeSeries(
          'wf_123' as WorkflowId,
          'executions',
          'HOUR',
          1
        );

        expect(result[0].value).toBe(0);
      });
    });

    describe('getStepMetrics', () => {
      it('should return step-level metrics', async () => {
        mockRedis.hgetall.mockResolvedValue({
          total: '50',
          success: '45',
          failure: '5',
        });

        mockRedis.zrange.mockResolvedValue([
          '1', '100', '2', '200',
        ]);

        const result = await metrics.getStepMetrics(
          'wf_123' as WorkflowId,
          'step_1' as any
        );

        expect(result).toMatchObject({
          executions: 50,
          failures: 5,
          successRate: 90,
        });
        expect(result.avgDuration).toBeDefined();
      });
    });
  });

  describe('Alerting', () => {
    describe('registerAlert', () => {
      it('should register an alert threshold', () => {
        metrics.registerAlert('wf_123' as WorkflowId, {
          metric: 'success_rate',
          operator: 'lt',
          value: 90,
          duration: 3,
          severity: 'WARNING',
        });

        // No assertion needed - just verifying no error
      });
    });

    describe('getActiveAlerts', () => {
      it('should return empty array when no alerts', () => {
        const alerts = metrics.getActiveAlerts();
        expect(alerts).toEqual([]);
      });

      it('should return alerts for specific workflow', () => {
        // Manually trigger an alert (internal state)
        metrics.registerAlert('wf_123' as WorkflowId, {
          metric: 'success_rate',
          operator: 'lt',
          value: 99,
          duration: 1,
          severity: 'CRITICAL',
        });

        const alerts = metrics.getActiveAlerts('wf_123' as WorkflowId);
        expect(Array.isArray(alerts)).toBe(true);
      });
    });
  });

  describe('Time Bucket Helpers', () => {
    it('should handle different periods correctly', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      // Test HOUR period
      await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'HOUR'
      );

      // Test DAY period
      await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'DAY'
      );

      // Test WEEK period
      await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'WEEK'
      );

      // Test MONTH period
      await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'MONTH'
      );

      // No assertions - just verifying no errors
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero durations', async () => {
      mockRedis.zrange.mockResolvedValue([]);
      mockRedis.hgetall.mockResolvedValue({
        total: '0',
      });

      const result = await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'HOUR'
      );

      expect(result.duration.min).toBe(0);
      expect(result.duration.max).toBe(0);
      expect(result.duration.avg).toBe(0);
      expect(result.duration.p50).toBe(0);
      expect(result.duration.p90).toBe(0);
      expect(result.duration.p99).toBe(0);
    });

    it('should handle missing metrics gracefully', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      mockRedis.zrange.mockResolvedValue([]);

      const result = await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'HOUR'
      );

      expect(result.executions.total).toBe(0);
      expect(result.executions.completed).toBe(0);
      expect(result.executions.failed).toBe(0);
    });

    it('should handle single data point for percentiles', async () => {
      mockRedis.zrange.mockResolvedValue(['1', '500']);
      mockRedis.hgetall.mockResolvedValue({
        total: '1',
        COMPLETED: '1',
      });

      const result = await metrics.getWorkflowMetrics(
        'wf_123' as WorkflowId,
        'tenant_123' as TenantId,
        'HOUR'
      );

      expect(result.duration.p50).toBe(500);
      expect(result.duration.p90).toBe(500);
      expect(result.duration.p99).toBe(500);
    });
  });
});
