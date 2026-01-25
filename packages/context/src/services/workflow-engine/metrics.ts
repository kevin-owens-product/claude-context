/**
 * WorkflowMetrics - Observability and performance tracking
 *
 * Features:
 * - Execution metrics (count, duration, success rate)
 * - Step-level metrics
 * - Percentile calculations
 * - Time-series data for dashboards
 * - Alerting thresholds
 *
 * @prompt-id forge-v4.1:service:workflow-metrics:001
 */

import type { Redis } from 'ioredis';
import type {
  WorkflowId,
  WorkflowExecution,
  StepId,
  WorkflowMetrics as WorkflowMetricsType,
  TenantId,
} from './types';

export interface MetricPoint {
  timestamp: Date;
  value: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
  duration: number; // consecutive periods
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface Alert {
  id: string;
  threshold: AlertThreshold;
  workflowId: WorkflowId;
  triggeredAt: Date;
  currentValue: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export class WorkflowMetrics {
  private readonly keyPrefix = 'wf:metrics';
  private readonly alertThresholds: Map<string, AlertThreshold[]> = new Map();
  private readonly alerts: Alert[] = [];

  constructor(private readonly redis: Redis) {}

  // ============================================================================
  // RECORDING METRICS
  // ============================================================================

  /**
   * Record an execution completion
   */
  async recordExecution(execution: WorkflowExecution, durationMs: number): Promise<void> {
    const timestamp = Date.now();
    const hour = this.getHourBucket(timestamp);
    const day = this.getDayBucket(timestamp);

    // Increment counters
    const pipeline = this.redis.pipeline();

    // Total executions
    pipeline.hincrby(`${this.keyPrefix}:${execution.workflowId}:${hour}`, 'total', 1);
    pipeline.hincrby(`${this.keyPrefix}:${execution.workflowId}:${day}`, 'total', 1);

    // Status-specific counters
    pipeline.hincrby(`${this.keyPrefix}:${execution.workflowId}:${hour}`, execution.status, 1);
    pipeline.hincrby(`${this.keyPrefix}:${execution.workflowId}:${day}`, execution.status, 1);

    // Duration tracking (for percentiles)
    pipeline.zadd(
      `${this.keyPrefix}:${execution.workflowId}:durations:${hour}`,
      durationMs,
      `${timestamp}`
    );

    // Set TTL for cleanup
    pipeline.expire(`${this.keyPrefix}:${execution.workflowId}:${hour}`, 86400 * 7); // 7 days
    pipeline.expire(`${this.keyPrefix}:${execution.workflowId}:${day}`, 86400 * 90); // 90 days
    pipeline.expire(`${this.keyPrefix}:${execution.workflowId}:durations:${hour}`, 86400 * 7);

    await pipeline.exec();

    // Check alert thresholds
    await this.checkAlerts(execution.workflowId, execution.tenantId);
  }

  /**
   * Record a step execution
   */
  async recordStepExecution(
    workflowId: WorkflowId,
    stepId: StepId,
    durationMs: number,
    success: boolean
  ): Promise<void> {
    const timestamp = Date.now();
    const hour = this.getHourBucket(timestamp);

    const pipeline = this.redis.pipeline();

    // Step execution count
    pipeline.hincrby(`${this.keyPrefix}:${workflowId}:steps:${stepId}:${hour}`, 'total', 1);

    // Success/failure
    if (success) {
      pipeline.hincrby(`${this.keyPrefix}:${workflowId}:steps:${stepId}:${hour}`, 'success', 1);
    } else {
      pipeline.hincrby(`${this.keyPrefix}:${workflowId}:steps:${stepId}:${hour}`, 'failure', 1);
    }

    // Duration tracking
    pipeline.zadd(
      `${this.keyPrefix}:${workflowId}:steps:${stepId}:durations:${hour}`,
      durationMs,
      `${timestamp}`
    );

    // TTL
    pipeline.expire(`${this.keyPrefix}:${workflowId}:steps:${stepId}:${hour}`, 86400 * 7);
    pipeline.expire(`${this.keyPrefix}:${workflowId}:steps:${stepId}:durations:${hour}`, 86400 * 7);

    await pipeline.exec();
  }

  /**
   * Record an error
   */
  async recordError(
    workflowId: WorkflowId,
    errorCode: string,
    stepId?: StepId
  ): Promise<void> {
    const timestamp = Date.now();
    const day = this.getDayBucket(timestamp);

    const pipeline = this.redis.pipeline();

    // Error count by code
    pipeline.hincrby(`${this.keyPrefix}:${workflowId}:errors:${day}`, errorCode, 1);

    // Last occurrence
    pipeline.hset(`${this.keyPrefix}:${workflowId}:errors:last`, errorCode, timestamp);

    // Step-specific errors
    if (stepId) {
      pipeline.hincrby(`${this.keyPrefix}:${workflowId}:errors:${day}:${stepId}`, errorCode, 1);
    }

    await pipeline.exec();
  }

  // ============================================================================
  // QUERYING METRICS
  // ============================================================================

  /**
   * Get workflow metrics summary
   */
  async getWorkflowMetrics(
    workflowId: WorkflowId,
    tenantId: TenantId,
    period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'
  ): Promise<WorkflowMetricsType> {
    const now = Date.now();
    const buckets = this.getBucketsForPeriod(period, now);

    // Aggregate metrics from all buckets
    let total = 0, completed = 0, failed = 0, cancelled = 0, timedOut = 0;
    const durations: number[] = [];

    for (const bucket of buckets) {
      const metrics = await this.redis.hgetall(`${this.keyPrefix}:${workflowId}:${bucket}`);
      total += parseInt(metrics.total || '0', 10);
      completed += parseInt(metrics.COMPLETED || '0', 10);
      failed += parseInt(metrics.FAILED || '0', 10);
      cancelled += parseInt(metrics.CANCELLED || '0', 10);
      timedOut += parseInt(metrics.TIMED_OUT || '0', 10);

      // Get durations for this bucket
      const bucketDurations = await this.redis.zrange(
        `${this.keyPrefix}:${workflowId}:durations:${bucket}`,
        0, -1, 'WITHSCORES'
      );

      for (let i = 1; i < bucketDurations.length; i += 2) {
        durations.push(parseFloat(bucketDurations[i]));
      }
    }

    // Calculate percentiles
    durations.sort((a, b) => a - b);

    return {
      workflowId,
      tenantId,
      period,
      periodStart: new Date(now - this.getPeriodMs(period)),
      executions: { total, completed, failed, cancelled, timedOut },
      duration: {
        min: durations[0] || 0,
        max: durations[durations.length - 1] || 0,
        avg: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        p50: this.percentile(durations, 50),
        p90: this.percentile(durations, 90),
        p99: this.percentile(durations, 99),
      },
      steps: {},
      errors: await this.getErrorSummary(workflowId, buckets),
    };
  }

  /**
   * Get time-series data for charting
   */
  async getTimeSeries(
    workflowId: WorkflowId,
    metric: 'executions' | 'success_rate' | 'avg_duration',
    period: 'HOUR' | 'DAY' | 'WEEK',
    points: number = 24
  ): Promise<MetricPoint[]> {
    const now = Date.now();
    const intervalMs = this.getPeriodMs(period) / points;
    const result: MetricPoint[] = [];

    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      const bucket = this.getBucketForTimestamp(timestamp.getTime(), period === 'HOUR' ? 'minute' : 'hour');

      const metrics = await this.redis.hgetall(`${this.keyPrefix}:${workflowId}:${bucket}`);

      let value: number;
      switch (metric) {
        case 'executions':
          value = parseInt(metrics.total || '0', 10);
          break;
        case 'success_rate':
          const total = parseInt(metrics.total || '0', 10);
          const completed = parseInt(metrics.COMPLETED || '0', 10);
          value = total > 0 ? (completed / total) * 100 : 100;
          break;
        case 'avg_duration':
          const durations = await this.redis.zrange(
            `${this.keyPrefix}:${workflowId}:durations:${bucket}`,
            0, -1, 'WITHSCORES'
          );
          const durationValues = durations.filter((_, i) => i % 2 === 1).map(Number);
          value = durationValues.length > 0
            ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length
            : 0;
          break;
        default:
          value = 0;
      }

      result.push({ timestamp, value });
    }

    return result;
  }

  /**
   * Get step-level metrics
   */
  async getStepMetrics(
    workflowId: WorkflowId,
    stepId: StepId
  ): Promise<{
    executions: number;
    failures: number;
    avgDuration: number;
    successRate: number;
  }> {
    const hour = this.getHourBucket(Date.now());

    const metrics = await this.redis.hgetall(
      `${this.keyPrefix}:${workflowId}:steps:${stepId}:${hour}`
    );

    const total = parseInt(metrics.total || '0', 10);
    const failures = parseInt(metrics.failure || '0', 10);

    const durations = await this.redis.zrange(
      `${this.keyPrefix}:${workflowId}:steps:${stepId}:durations:${hour}`,
      0, -1, 'WITHSCORES'
    );

    const durationValues = durations.filter((_, i) => i % 2 === 1).map(Number);
    const avgDuration = durationValues.length > 0
      ? durationValues.reduce((a, b) => a + b, 0) / durationValues.length
      : 0;

    return {
      executions: total,
      failures,
      avgDuration,
      successRate: total > 0 ? ((total - failures) / total) * 100 : 100,
    };
  }

  // ============================================================================
  // ALERTING
  // ============================================================================

  /**
   * Register an alert threshold
   */
  registerAlert(workflowId: WorkflowId, threshold: AlertThreshold): void {
    const key = workflowId;
    const existing = this.alertThresholds.get(key) || [];
    existing.push(threshold);
    this.alertThresholds.set(key, existing);
  }

  /**
   * Check alerts for a workflow
   */
  private async checkAlerts(workflowId: WorkflowId, tenantId: TenantId): Promise<void> {
    const thresholds = this.alertThresholds.get(workflowId);
    if (!thresholds) return;

    const metrics = await this.getWorkflowMetrics(workflowId, tenantId, 'HOUR');

    for (const threshold of thresholds) {
      const value = this.getMetricValue(metrics, threshold.metric);
      const isTriggered = this.evaluateThreshold(value, threshold);

      const existingAlert = this.alerts.find(
        a => a.workflowId === workflowId &&
             a.threshold.metric === threshold.metric &&
             !a.resolved
      );

      if (isTriggered && !existingAlert) {
        // Create new alert
        this.alerts.push({
          id: `alert_${Date.now()}`,
          threshold,
          workflowId,
          triggeredAt: new Date(),
          currentValue: value,
          resolved: false,
        });

        // In production: send notification
        console.log(`Alert triggered for ${workflowId}: ${threshold.metric} = ${value}`);

      } else if (!isTriggered && existingAlert) {
        // Resolve existing alert
        existingAlert.resolved = true;
        existingAlert.resolvedAt = new Date();
      }
    }
  }

  private getMetricValue(metrics: WorkflowMetricsType, metricName: string): number {
    switch (metricName) {
      case 'success_rate':
        const total = metrics.executions.total;
        return total > 0 ? (metrics.executions.completed / total) * 100 : 100;
      case 'failure_rate':
        const t = metrics.executions.total;
        return t > 0 ? (metrics.executions.failed / t) * 100 : 0;
      case 'avg_duration':
        return metrics.duration.avg;
      case 'p99_duration':
        return metrics.duration.p99;
      default:
        return 0;
    }
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lt': return value < threshold.value;
      case 'lte': return value <= threshold.value;
      case 'eq': return value === threshold.value;
      default: return false;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(workflowId?: WorkflowId): Alert[] {
    return this.alerts.filter(a =>
      !a.resolved &&
      (!workflowId || a.workflowId === workflowId)
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getHourBucket(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
  }

  private getDayBucket(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private getBucketForTimestamp(timestamp: number, granularity: 'minute' | 'hour'): string {
    if (granularity === 'minute') {
      const date = new Date(timestamp);
      return `${this.getHourBucket(timestamp)}-${String(date.getUTCMinutes()).padStart(2, '0')}`;
    }
    return this.getHourBucket(timestamp);
  }

  private getBucketsForPeriod(period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH', now: number): string[] {
    const buckets: string[] = [];
    const periodMs = this.getPeriodMs(period);
    const bucketMs = period === 'HOUR' ? 3600000 : 86400000;
    const numBuckets = Math.ceil(periodMs / bucketMs);

    for (let i = 0; i < numBuckets; i++) {
      const timestamp = now - i * bucketMs;
      buckets.push(period === 'HOUR' ? this.getHourBucket(timestamp) : this.getDayBucket(timestamp));
    }

    return buckets;
  }

  private getPeriodMs(period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH'): number {
    switch (period) {
      case 'HOUR': return 3600000;
      case 'DAY': return 86400000;
      case 'WEEK': return 604800000;
      case 'MONTH': return 2592000000;
    }
  }

  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  private async getErrorSummary(
    workflowId: WorkflowId,
    buckets: string[]
  ): Promise<Array<{ code: string; count: number; lastOccurred: Date }>> {
    const errorCounts: Record<string, number> = {};

    for (const bucket of buckets) {
      const errors = await this.redis.hgetall(`${this.keyPrefix}:${workflowId}:errors:${bucket}`);
      for (const [code, count] of Object.entries(errors)) {
        errorCounts[code] = (errorCounts[code] || 0) + parseInt(count, 10);
      }
    }

    const lastOccurrences = await this.redis.hgetall(`${this.keyPrefix}:${workflowId}:errors:last`);

    return Object.entries(errorCounts).map(([code, count]) => ({
      code,
      count,
      lastOccurred: new Date(parseInt(lastOccurrences[code] || '0', 10)),
    }));
  }
}
