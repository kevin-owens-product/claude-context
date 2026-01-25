/**
 * SignalService - Continuous evidence streams for Living Software
 *
 * Signals are the nervous system of Living Software. They continuously
 * measure whether intents are being fulfilled and capabilities are effective.
 *
 * Key responsibilities:
 * - Collect and aggregate signal measurements
 * - Detect anomalies and trend changes
 * - Update intent fulfillment scores
 * - Trigger alerts when signals go critical
 *
 * @prompt-id forge-v4.1:service:signal:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type Redis from 'ioredis';

// Branded types
export type SignalId = string & { readonly __brand: 'SignalId' };
export type TenantId = string & { readonly __brand: 'TenantId' };
export type IntentId = string & { readonly __brand: 'IntentId' };
export type CapabilityId = string & { readonly __brand: 'CapabilityId' };

// Enums matching Prisma schema
export type SignalType =
  | 'USAGE'
  | 'PERFORMANCE'
  | 'ERROR_RATE'
  | 'SATISFACTION'
  | 'CONVERSION'
  | 'RETENTION'
  | 'ENGAGEMENT'
  | 'VALUE'
  | 'HEALTH'
  | 'CUSTOM';

export type SignalTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE';
export type SignalHealth = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type MetricDirection = 'INCREASE' | 'DECREASE' | 'MAINTAIN';
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'P50' | 'P95' | 'P99';

// Types
export interface SignalSource {
  type: 'api' | 'webhook' | 'database' | 'analytics' | 'manual';
  name: string;
  config?: Record<string, unknown>;
  lastSyncAt?: string;
}

export interface AnomalyDetails {
  type: 'spike' | 'drop' | 'trend_change' | 'pattern_break';
  expectedValue: number;
  actualValue: number;
  deviation: number;
  confidence: number;
  possibleCauses?: string[];
}

export interface CreateSignalInput {
  tenantId: TenantId;
  name: string;
  description?: string;
  signalType: SignalType;
  intentId?: IntentId;
  capabilityId?: CapabilityId;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction?: MetricDirection;
  unit?: string;
  aggregation?: AggregationType;
  windowMinutes?: number;
  sources?: SignalSource[];
}

export interface UpdateSignalInput {
  name?: string;
  description?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction?: MetricDirection;
  unit?: string;
  aggregation?: AggregationType;
  windowMinutes?: number;
  sources?: SignalSource[];
  isActive?: boolean;
}

export interface RecordMeasurementInput {
  signalId: SignalId;
  value: number;
  sampleCount?: number;
  metadata?: Record<string, unknown>;
  measuredAt?: Date;
}

export interface SignalFilter {
  signalType?: SignalType | SignalType[];
  health?: SignalHealth | SignalHealth[];
  intentId?: IntentId;
  capabilityId?: CapabilityId;
  isActive?: boolean;
  hasAnomaly?: boolean;
  search?: string;
}

export interface Signal {
  id: SignalId;
  tenantId: TenantId;
  name: string;
  description: string | null;
  signalType: SignalType;
  intentId: IntentId | null;
  capabilityId: CapabilityId | null;
  currentValue: number;
  previousValue: number | null;
  trend: SignalTrend;
  health: SignalHealth;
  targetValue: number | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  direction: MetricDirection;
  unit: string | null;
  aggregation: AggregationType;
  windowMinutes: number;
  sources: SignalSource[];
  anomalyDetected: boolean;
  anomalyDetails: AnomalyDetails | null;
  lastAnomalyAt: Date | null;
  isActive: boolean;
  lastMeasuredAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignalMeasurement {
  id: string;
  signalId: SignalId;
  value: number;
  sampleCount: number;
  metadata: Record<string, unknown>;
  measuredAt: Date;
  createdAt: Date;
}

export interface SignalTimeSeries {
  signalId: SignalId;
  measurements: Array<{
    value: number;
    measuredAt: Date;
  }>;
  stats: {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
    trend: SignalTrend;
  };
}

export class SignalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Create a new signal
   */
  async createSignal(input: CreateSignalInput): Promise<Signal> {
    const signal = await this.prisma.signal.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        signalType: input.signalType,
        intentId: input.intentId,
        capabilityId: input.capabilityId,
        targetValue: input.targetValue,
        warningThreshold: input.warningThreshold,
        criticalThreshold: input.criticalThreshold,
        direction: input.direction || 'INCREASE',
        unit: input.unit,
        aggregation: input.aggregation || 'AVG',
        windowMinutes: input.windowMinutes || 60,
        sources: (input.sources || []) as unknown as Prisma.JsonArray,
        health: 'UNKNOWN',
        trend: 'STABLE',
      },
    });

    return this.mapToSignal(signal);
  }

  /**
   * Get a signal by ID
   */
  async getSignal(tenantId: TenantId, signalId: SignalId): Promise<Signal | null> {
    const signal = await this.prisma.signal.findFirst({
      where: { id: signalId, tenantId },
    });

    return signal ? this.mapToSignal(signal) : null;
  }

  /**
   * List signals with filtering
   */
  async listSignals(
    tenantId: TenantId,
    filter?: SignalFilter,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Signal[]; total: number }> {
    const where: Prisma.SignalWhereInput = {
      tenantId,
      ...(filter?.signalType && {
        signalType: Array.isArray(filter.signalType)
          ? { in: filter.signalType }
          : filter.signalType,
      }),
      ...(filter?.health && {
        health: Array.isArray(filter.health) ? { in: filter.health } : filter.health,
      }),
      ...(filter?.intentId && { intentId: filter.intentId }),
      ...(filter?.capabilityId && { capabilityId: filter.capabilityId }),
      ...(filter?.isActive !== undefined && { isActive: filter.isActive }),
      ...(filter?.hasAnomaly !== undefined && { anomalyDetected: filter.hasAnomaly }),
      ...(filter?.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [signals, total] = await Promise.all([
      this.prisma.signal.findMany({
        where,
        orderBy: [{ health: 'asc' }, { lastMeasuredAt: 'desc' }],
        take: pagination?.limit || 50,
        skip: pagination?.offset || 0,
      }),
      this.prisma.signal.count({ where }),
    ]);

    return {
      data: signals.map(s => this.mapToSignal(s)),
      total,
    };
  }

  /**
   * Update a signal
   */
  async updateSignal(
    tenantId: TenantId,
    signalId: SignalId,
    input: UpdateSignalInput,
  ): Promise<Signal> {
    const signal = await this.prisma.signal.update({
      where: { id: signalId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.targetValue !== undefined && { targetValue: input.targetValue }),
        ...(input.warningThreshold !== undefined && { warningThreshold: input.warningThreshold }),
        ...(input.criticalThreshold !== undefined && { criticalThreshold: input.criticalThreshold }),
        ...(input.direction && { direction: input.direction }),
        ...(input.unit !== undefined && { unit: input.unit }),
        ...(input.aggregation && { aggregation: input.aggregation }),
        ...(input.windowMinutes && { windowMinutes: input.windowMinutes }),
        ...(input.sources && { sources: input.sources as unknown as Prisma.JsonArray }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    return this.mapToSignal(signal);
  }

  /**
   * Record a new measurement for a signal
   * This is the core data ingestion method
   */
  async recordMeasurement(input: RecordMeasurementInput): Promise<SignalMeasurement> {
    const measuredAt = input.measuredAt || new Date();

    // Create the measurement
    const measurement = await this.prisma.signalMeasurement.create({
      data: {
        signalId: input.signalId,
        value: input.value,
        sampleCount: input.sampleCount || 1,
        metadata: (input.metadata || {}) as Prisma.JsonObject,
        measuredAt,
      },
    });

    // Update the signal's current state
    await this.updateSignalState(input.signalId, input.value);

    return {
      id: measurement.id,
      signalId: measurement.signalId as SignalId,
      value: Number(measurement.value),
      sampleCount: measurement.sampleCount,
      metadata: measurement.metadata as Record<string, unknown>,
      measuredAt: measurement.measuredAt,
      createdAt: measurement.createdAt,
    };
  }

  /**
   * Record multiple measurements in batch
   */
  async recordMeasurementsBatch(
    measurements: RecordMeasurementInput[],
  ): Promise<{ recorded: number; failed: number }> {
    let recorded = 0;
    let failed = 0;

    // Group by signal for efficient processing
    const bySignal = new Map<SignalId, RecordMeasurementInput[]>();
    for (const m of measurements) {
      const existing = bySignal.get(m.signalId) || [];
      existing.push(m);
      bySignal.set(m.signalId, existing);
    }

    for (const [signalId, signalMeasurements] of bySignal) {
      try {
        // Bulk insert measurements
        await this.prisma.signalMeasurement.createMany({
          data: signalMeasurements.map(m => ({
            signalId: m.signalId,
            value: m.value,
            sampleCount: m.sampleCount || 1,
            metadata: (m.metadata || {}) as Prisma.JsonObject,
            measuredAt: m.measuredAt || new Date(),
          })),
        });

        // Update signal state with most recent value
        const latest = signalMeasurements.sort(
          (a, b) => (b.measuredAt?.getTime() || 0) - (a.measuredAt?.getTime() || 0)
        )[0];
        await this.updateSignalState(signalId, latest.value);

        recorded += signalMeasurements.length;
      } catch (error) {
        console.error(`Failed to record measurements for signal ${signalId}:`, error);
        failed += signalMeasurements.length;
      }
    }

    return { recorded, failed };
  }

  /**
   * Get time series data for a signal
   */
  async getTimeSeries(
    signalId: SignalId,
    startTime: Date,
    endTime: Date,
    resolution?: 'minute' | 'hour' | 'day',
  ): Promise<SignalTimeSeries> {
    const measurements = await this.prisma.signalMeasurement.findMany({
      where: {
        signalId,
        measuredAt: { gte: startTime, lte: endTime },
      },
      orderBy: { measuredAt: 'asc' },
    });

    const values = measurements.map(m => Number(m.value));

    // Calculate statistics
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    // Standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.length > 0
      ? squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length
      : 0;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Calculate trend
    const trend = this.calculateTrend(values);

    return {
      signalId,
      measurements: measurements.map(m => ({
        value: Number(m.value),
        measuredAt: m.measuredAt,
      })),
      stats: { min, max, avg, stdDev, trend },
    };
  }

  /**
   * Get all signals for an intent with their current health
   */
  async getIntentSignals(
    tenantId: TenantId,
    intentId: IntentId,
  ): Promise<{ signals: Signal[]; aggregateHealth: SignalHealth; fulfillmentScore: number }> {
    const signals = await this.prisma.signal.findMany({
      where: { tenantId, intentId, isActive: true },
    });

    const mappedSignals = signals.map(s => this.mapToSignal(s));

    // Calculate aggregate health
    const aggregateHealth = this.calculateAggregateHealth(mappedSignals);

    // Calculate fulfillment score (weighted average of signal performance)
    const fulfillmentScore = this.calculateFulfillmentScore(mappedSignals);

    return {
      signals: mappedSignals,
      aggregateHealth,
      fulfillmentScore,
    };
  }

  /**
   * Detect anomalies in recent measurements
   */
  async detectAnomalies(signalId: SignalId): Promise<AnomalyDetails | null> {
    const signal = await this.prisma.signal.findUnique({
      where: { id: signalId },
    });

    if (!signal) return null;

    // Get recent measurements
    const now = new Date();
    const windowStart = new Date(now.getTime() - signal.windowMinutes * 60 * 1000);
    const historicalStart = new Date(now.getTime() - signal.windowMinutes * 60 * 1000 * 24); // 24x window for baseline

    const [recentMeasurements, historicalMeasurements] = await Promise.all([
      this.prisma.signalMeasurement.findMany({
        where: { signalId, measuredAt: { gte: windowStart } },
        orderBy: { measuredAt: 'desc' },
      }),
      this.prisma.signalMeasurement.findMany({
        where: { signalId, measuredAt: { gte: historicalStart, lt: windowStart } },
      }),
    ]);

    if (recentMeasurements.length === 0 || historicalMeasurements.length < 10) {
      return null; // Not enough data
    }

    const recentValues = recentMeasurements.map(m => Number(m.value));
    const historicalValues = historicalMeasurements.map(m => Number(m.value));

    // Calculate baseline statistics
    const historicalAvg = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const historicalStdDev = Math.sqrt(
      historicalValues.reduce((sum, v) => sum + Math.pow(v - historicalAvg, 2), 0) /
        historicalValues.length
    );

    // Check current value against baseline
    const currentValue = recentValues[0];
    const deviation = Math.abs(currentValue - historicalAvg) / (historicalStdDev || 1);

    // Anomaly if deviation > 3 standard deviations
    if (deviation > 3) {
      const anomaly: AnomalyDetails = {
        type: currentValue > historicalAvg ? 'spike' : 'drop',
        expectedValue: historicalAvg,
        actualValue: currentValue,
        deviation,
        confidence: Math.min(0.99, 0.5 + deviation * 0.1),
      };

      // Update signal with anomaly
      await this.prisma.signal.update({
        where: { id: signalId },
        data: {
          anomalyDetected: true,
          anomalyDetails: anomaly as unknown as Prisma.JsonObject,
          lastAnomalyAt: new Date(),
        },
      });

      return anomaly;
    }

    // Clear anomaly if it was previously set
    if (signal.anomalyDetected) {
      await this.prisma.signal.update({
        where: { id: signalId },
        data: {
          anomalyDetected: false,
          anomalyDetails: Prisma.JsonNull,
        },
      });
    }

    return null;
  }

  /**
   * Get signals that need attention (warning or critical health)
   */
  async getSignalsNeedingAttention(
    tenantId: TenantId,
  ): Promise<{ critical: Signal[]; warning: Signal[]; anomalies: Signal[] }> {
    const [critical, warning, anomalies] = await Promise.all([
      this.prisma.signal.findMany({
        where: { tenantId, isActive: true, health: 'CRITICAL' },
      }),
      this.prisma.signal.findMany({
        where: { tenantId, isActive: true, health: 'WARNING' },
      }),
      this.prisma.signal.findMany({
        where: { tenantId, isActive: true, anomalyDetected: true },
      }),
    ]);

    return {
      critical: critical.map(s => this.mapToSignal(s)),
      warning: warning.map(s => this.mapToSignal(s)),
      anomalies: anomalies.map(s => this.mapToSignal(s)),
    };
  }

  /**
   * Get signal dashboard summary
   */
  async getSignalDashboard(tenantId: TenantId): Promise<{
    total: number;
    byHealth: Record<SignalHealth, number>;
    byType: Record<SignalType, number>;
    avgHealth: number;
    anomalyCount: number;
    lastUpdated: Date | null;
  }> {
    const signals = await this.prisma.signal.findMany({
      where: { tenantId, isActive: true },
    });

    const byHealth = signals.reduce((acc, s) => {
      const health = s.health as SignalHealth;
      acc[health] = (acc[health] || 0) + 1;
      return acc;
    }, {} as Record<SignalHealth, number>);

    const byType = signals.reduce((acc, s) => {
      const type = s.signalType as SignalType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<SignalType, number>);

    // Health score: EXCELLENT=1, GOOD=0.75, WARNING=0.5, CRITICAL=0.25, UNKNOWN=0
    const healthScores: Record<SignalHealth, number> = {
      EXCELLENT: 1,
      GOOD: 0.75,
      WARNING: 0.5,
      CRITICAL: 0.25,
      UNKNOWN: 0,
    };

    const avgHealth = signals.length > 0
      ? signals.reduce((sum, s) => sum + healthScores[s.health as SignalHealth], 0) / signals.length
      : 0;

    const anomalyCount = signals.filter(s => s.anomalyDetected).length;

    const lastUpdated = signals.reduce((latest, s) => {
      if (!s.lastMeasuredAt) return latest;
      if (!latest) return s.lastMeasuredAt;
      return s.lastMeasuredAt > latest ? s.lastMeasuredAt : latest;
    }, null as Date | null);

    return {
      total: signals.length,
      byHealth,
      byType,
      avgHealth,
      anomalyCount,
      lastUpdated,
    };
  }

  // Private helpers

  private async updateSignalState(signalId: SignalId, currentValue: number): Promise<void> {
    const signal = await this.prisma.signal.findUnique({
      where: { id: signalId },
    });

    if (!signal) return;

    const previousValue = signal.currentValue ? Number(signal.currentValue) : null;

    // Calculate health based on thresholds
    const health = this.calculateHealth(
      currentValue,
      signal.targetValue ? Number(signal.targetValue) : null,
      signal.warningThreshold ? Number(signal.warningThreshold) : null,
      signal.criticalThreshold ? Number(signal.criticalThreshold) : null,
      signal.direction as MetricDirection,
    );

    // Calculate trend from recent values
    const recentMeasurements = await this.prisma.signalMeasurement.findMany({
      where: { signalId },
      orderBy: { measuredAt: 'desc' },
      take: 10,
    });

    const trend = this.calculateTrend(recentMeasurements.map(m => Number(m.value)));

    await this.prisma.signal.update({
      where: { id: signalId },
      data: {
        currentValue,
        previousValue: previousValue,
        health,
        trend,
        lastMeasuredAt: new Date(),
      },
    });

    // If signal is tied to an intent, update intent fulfillment
    if (signal.intentId) {
      await this.updateIntentFulfillment(signal.intentId);
    }
  }

  private calculateHealth(
    currentValue: number,
    targetValue: number | null,
    warningThreshold: number | null,
    criticalThreshold: number | null,
    direction: MetricDirection,
  ): SignalHealth {
    if (criticalThreshold !== null) {
      if (direction === 'INCREASE' && currentValue <= criticalThreshold) return 'CRITICAL';
      if (direction === 'DECREASE' && currentValue >= criticalThreshold) return 'CRITICAL';
    }

    if (warningThreshold !== null) {
      if (direction === 'INCREASE' && currentValue <= warningThreshold) return 'WARNING';
      if (direction === 'DECREASE' && currentValue >= warningThreshold) return 'WARNING';
    }

    if (targetValue !== null) {
      const progress = direction === 'DECREASE'
        ? targetValue / currentValue
        : currentValue / targetValue;

      if (progress >= 1) return 'EXCELLENT';
      if (progress >= 0.8) return 'GOOD';
      if (progress >= 0.5) return 'WARNING';
      return 'CRITICAL';
    }

    // No thresholds set
    return 'UNKNOWN';
  }

  private calculateTrend(values: number[]): SignalTrend {
    if (values.length < 3) return 'STABLE';

    // Simple linear regression
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, i) => sum + i * y, 0);

    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);

    // Calculate coefficient of variation for volatility
    const avg = ySum / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / n;
    const cv = avg !== 0 ? Math.sqrt(variance) / Math.abs(avg) : 0;

    if (cv > 0.5) return 'VOLATILE';
    if (slope > 0.05) return 'IMPROVING';
    if (slope < -0.05) return 'DECLINING';
    return 'STABLE';
  }

  private calculateAggregateHealth(signals: Signal[]): SignalHealth {
    if (signals.length === 0) return 'UNKNOWN';

    const hasCritical = signals.some(s => s.health === 'CRITICAL');
    if (hasCritical) return 'CRITICAL';

    const warningCount = signals.filter(s => s.health === 'WARNING').length;
    if (warningCount > signals.length / 2) return 'WARNING';

    const goodOrBetter = signals.filter(
      s => s.health === 'GOOD' || s.health === 'EXCELLENT'
    ).length;
    if (goodOrBetter === signals.length) return 'EXCELLENT';
    if (goodOrBetter >= signals.length * 0.8) return 'GOOD';

    return 'WARNING';
  }

  private calculateFulfillmentScore(signals: Signal[]): number {
    if (signals.length === 0) return 0;

    const healthScores: Record<SignalHealth, number> = {
      EXCELLENT: 1,
      GOOD: 0.8,
      WARNING: 0.5,
      CRITICAL: 0.2,
      UNKNOWN: 0.5,
    };

    const totalScore = signals.reduce((sum, s) => sum + healthScores[s.health], 0);
    return totalScore / signals.length;
  }

  private async updateIntentFulfillment(intentId: string): Promise<void> {
    const signals = await this.prisma.signal.findMany({
      where: { intentId, isActive: true },
    });

    if (signals.length === 0) return;

    const fulfillmentScore = this.calculateFulfillmentScore(
      signals.map(s => this.mapToSignal(s))
    );

    await this.prisma.intent.update({
      where: { id: intentId },
      data: { fulfillmentScore },
    });
  }

  private mapToSignal(prismaSignal: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    signalType: string;
    intentId: string | null;
    capabilityId: string | null;
    currentValue: Prisma.Decimal;
    previousValue: Prisma.Decimal | null;
    trend: string;
    health: string;
    targetValue: Prisma.Decimal | null;
    warningThreshold: Prisma.Decimal | null;
    criticalThreshold: Prisma.Decimal | null;
    direction: string;
    unit: string | null;
    aggregation: string;
    windowMinutes: number;
    sources: Prisma.JsonValue;
    anomalyDetected: boolean;
    anomalyDetails: Prisma.JsonValue;
    lastAnomalyAt: Date | null;
    isActive: boolean;
    lastMeasuredAt: Date | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): Signal {
    return {
      id: prismaSignal.id as SignalId,
      tenantId: prismaSignal.tenantId as TenantId,
      name: prismaSignal.name,
      description: prismaSignal.description,
      signalType: prismaSignal.signalType as SignalType,
      intentId: prismaSignal.intentId as IntentId | null,
      capabilityId: prismaSignal.capabilityId as CapabilityId | null,
      currentValue: Number(prismaSignal.currentValue),
      previousValue: prismaSignal.previousValue ? Number(prismaSignal.previousValue) : null,
      trend: prismaSignal.trend as SignalTrend,
      health: prismaSignal.health as SignalHealth,
      targetValue: prismaSignal.targetValue ? Number(prismaSignal.targetValue) : null,
      warningThreshold: prismaSignal.warningThreshold ? Number(prismaSignal.warningThreshold) : null,
      criticalThreshold: prismaSignal.criticalThreshold ? Number(prismaSignal.criticalThreshold) : null,
      direction: prismaSignal.direction as MetricDirection,
      unit: prismaSignal.unit,
      aggregation: prismaSignal.aggregation as AggregationType,
      windowMinutes: prismaSignal.windowMinutes,
      sources: (prismaSignal.sources || []) as unknown as SignalSource[],
      anomalyDetected: prismaSignal.anomalyDetected,
      anomalyDetails: prismaSignal.anomalyDetails as AnomalyDetails | null,
      lastAnomalyAt: prismaSignal.lastAnomalyAt,
      isActive: prismaSignal.isActive,
      lastMeasuredAt: prismaSignal.lastMeasuredAt,
      metadata: prismaSignal.metadata as Record<string, unknown>,
      createdAt: prismaSignal.createdAt,
      updatedAt: prismaSignal.updatedAt,
    };
  }
}

export default SignalService;
