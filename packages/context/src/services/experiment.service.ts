/**
 * ExperimentService - Hypothesis testing for Living Software
 *
 * Every change is a hypothesis. Every deployment is an experiment.
 * This service manages the lifecycle of experiments that test whether
 * capabilities fulfill intents.
 *
 * Key responsibilities:
 * - Create and manage experiments
 * - Track experiment metrics
 * - Calculate statistical significance
 * - Capture learnings and apply them
 *
 * @prompt-id forge-v4.1:service:experiment:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type Redis from 'ioredis';

// Branded types
export type ExperimentId = string & { readonly __brand: 'ExperimentId' };
export type TenantId = string & { readonly __brand: 'TenantId' };
export type IntentId = string & { readonly __brand: 'IntentId' };
export type CapabilityId = string & { readonly __brand: 'CapabilityId' };
export type SignalId = string & { readonly __brand: 'SignalId' };

// Enums
export type ExperimentType = 'A_B_TEST' | 'FEATURE_FLAG' | 'GRADUAL_ROLLOUT' | 'CANARY' | 'SHADOW';
export type ExperimentStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'ANALYZING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type ExperimentVerdict = 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'GUARDRAIL_TRIPPED';

// Types
export interface TargetMetric {
  signalId: SignalId;
  name: string;
  weight: number; // Importance weight (0-1)
  expectedImprovement: number; // Expected % improvement
}

export interface SuccessCriterion {
  metricId: SignalId;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  minSampleSize?: number;
}

export interface Guardrail {
  metricId: SignalId;
  name: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte';
  threshold: number;
  action: 'pause' | 'stop' | 'alert';
}

export interface TargetAudience {
  type: 'percentage' | 'segment' | 'cohort';
  value: string | number;
  filters?: Record<string, unknown>;
}

export interface MetricSnapshot {
  signalId: SignalId;
  value: number;
  sampleSize: number;
  confidence: number;
  timestamp: Date;
}

export interface CreateExperimentInput {
  tenantId: TenantId;
  name: string;
  description: string;
  hypothesis: string;
  rationale?: string;
  intentId?: IntentId;
  capabilityId?: CapabilityId;
  experimentType?: ExperimentType;
  targetMetrics: TargetMetric[];
  successCriteria: SuccessCriterion[];
  guardrails?: Guardrail[];
  targetAudience?: TargetAudience;
  trafficPercent?: number;
  plannedDuration?: number;
  minSampleSize?: number;
  createdById?: string;
}

export interface UpdateExperimentInput {
  name?: string;
  description?: string;
  hypothesis?: string;
  rationale?: string;
  targetMetrics?: TargetMetric[];
  successCriteria?: SuccessCriterion[];
  guardrails?: Guardrail[];
  targetAudience?: TargetAudience;
  trafficPercent?: number;
  plannedDuration?: number;
  minSampleSize?: number;
}

export interface ExperimentFilter {
  status?: ExperimentStatus | ExperimentStatus[];
  experimentType?: ExperimentType | ExperimentType[];
  intentId?: IntentId;
  capabilityId?: CapabilityId;
  verdict?: ExperimentVerdict | null;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

export interface Experiment {
  id: ExperimentId;
  tenantId: TenantId;
  name: string;
  description: string;
  hypothesis: string;
  rationale: string | null;
  intentId: IntentId | null;
  capabilityId: CapabilityId | null;
  experimentType: ExperimentType;
  targetMetrics: TargetMetric[];
  successCriteria: SuccessCriterion[];
  guardrails: Guardrail[];
  targetAudience: TargetAudience | null;
  trafficPercent: number;
  plannedDuration: number | null;
  minSampleSize: number | null;
  status: ExperimentStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  controlMetrics: MetricSnapshot[] | null;
  treatmentMetrics: MetricSnapshot[] | null;
  statisticalSignificance: number | null;
  verdict: ExperimentVerdict | null;
  verdictReason: string | null;
  learnings: string | null;
  appliedToIntent: boolean;
  createdById: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentResults {
  experimentId: ExperimentId;
  controlMetrics: MetricSnapshot[];
  treatmentMetrics: MetricSnapshot[];
  improvement: number; // Percentage improvement
  statisticalSignificance: number;
  verdict: ExperimentVerdict;
  verdictReason: string;
  confidenceInterval: { lower: number; upper: number };
  sampleSizes: { control: number; treatment: number };
}

export class ExperimentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Create a new experiment
   */
  async createExperiment(input: CreateExperimentInput): Promise<Experiment> {
    const experiment = await this.prisma.experiment.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        hypothesis: input.hypothesis,
        rationale: input.rationale,
        intentId: input.intentId,
        capabilityId: input.capabilityId,
        experimentType: input.experimentType || 'A_B_TEST',
        targetMetrics: input.targetMetrics as unknown as Prisma.JsonArray,
        successCriteria: input.successCriteria as unknown as Prisma.JsonArray,
        guardrails: (input.guardrails || []) as unknown as Prisma.JsonArray,
        targetAudience: input.targetAudience as unknown as Prisma.JsonObject,
        trafficPercent: input.trafficPercent || 10,
        plannedDuration: input.plannedDuration,
        minSampleSize: input.minSampleSize,
        status: 'DRAFT',
        createdById: input.createdById,
      },
    });

    return this.mapToExperiment(experiment);
  }

  /**
   * Get an experiment by ID
   */
  async getExperiment(tenantId: TenantId, experimentId: ExperimentId): Promise<Experiment | null> {
    const experiment = await this.prisma.experiment.findFirst({
      where: { id: experimentId, tenantId },
    });

    return experiment ? this.mapToExperiment(experiment) : null;
  }

  /**
   * List experiments with filtering
   */
  async listExperiments(
    tenantId: TenantId,
    filter?: ExperimentFilter,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Experiment[]; total: number }> {
    const where: Prisma.ExperimentWhereInput = {
      tenantId,
      ...(filter?.status && {
        status: Array.isArray(filter.status) ? { in: filter.status } : filter.status,
      }),
      ...(filter?.experimentType && {
        experimentType: Array.isArray(filter.experimentType)
          ? { in: filter.experimentType }
          : filter.experimentType,
      }),
      ...(filter?.intentId && { intentId: filter.intentId }),
      ...(filter?.capabilityId && { capabilityId: filter.capabilityId }),
      ...(filter?.verdict !== undefined && { verdict: filter.verdict }),
      ...(filter?.createdAfter && { createdAt: { gte: filter.createdAfter } }),
      ...(filter?.createdBefore && { createdAt: { lte: filter.createdBefore } }),
      ...(filter?.search && {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { hypothesis: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [experiments, total] = await Promise.all([
      this.prisma.experiment.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: pagination?.limit || 50,
        skip: pagination?.offset || 0,
      }),
      this.prisma.experiment.count({ where }),
    ]);

    return {
      data: experiments.map(e => this.mapToExperiment(e)),
      total,
    };
  }

  /**
   * Update an experiment
   */
  async updateExperiment(
    tenantId: TenantId,
    experimentId: ExperimentId,
    input: UpdateExperimentInput,
  ): Promise<Experiment> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Can't update a running experiment's core parameters
    if (existing.status === 'RUNNING' && (input.targetMetrics || input.successCriteria)) {
      throw new Error('Cannot modify metrics or success criteria while experiment is running');
    }

    const experiment = await this.prisma.experiment.update({
      where: { id: experimentId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.hypothesis && { hypothesis: input.hypothesis }),
        ...(input.rationale !== undefined && { rationale: input.rationale }),
        ...(input.targetMetrics && { targetMetrics: input.targetMetrics as unknown as Prisma.JsonArray }),
        ...(input.successCriteria && { successCriteria: input.successCriteria as unknown as Prisma.JsonArray }),
        ...(input.guardrails && { guardrails: input.guardrails as unknown as Prisma.JsonArray }),
        ...(input.targetAudience && { targetAudience: input.targetAudience as unknown as Prisma.JsonObject }),
        ...(input.trafficPercent !== undefined && { trafficPercent: input.trafficPercent }),
        ...(input.plannedDuration !== undefined && { plannedDuration: input.plannedDuration }),
        ...(input.minSampleSize !== undefined && { minSampleSize: input.minSampleSize }),
      },
    });

    return this.mapToExperiment(experiment);
  }

  /**
   * Start an experiment
   */
  async startExperiment(tenantId: TenantId, experimentId: ExperimentId): Promise<Experiment> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
      throw new Error(`Cannot start experiment in status ${existing.status}`);
    }

    // Capture baseline metrics
    const controlMetrics = await this.captureMetrics(existing.targetMetrics);

    const experiment = await this.prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        controlMetrics: controlMetrics as unknown as Prisma.JsonArray,
      },
    });

    // Set up guardrail monitoring
    await this.setupGuardrailMonitoring(experimentId, existing.guardrails);

    return this.mapToExperiment(experiment);
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(tenantId: TenantId, experimentId: ExperimentId): Promise<Experiment> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (existing.status !== 'RUNNING') {
      throw new Error(`Cannot pause experiment in status ${existing.status}`);
    }

    const experiment = await this.prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'PAUSED' },
    });

    return this.mapToExperiment(experiment);
  }

  /**
   * Resume a paused experiment
   */
  async resumeExperiment(tenantId: TenantId, experimentId: ExperimentId): Promise<Experiment> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (existing.status !== 'PAUSED') {
      throw new Error(`Cannot resume experiment in status ${existing.status}`);
    }

    const experiment = await this.prisma.experiment.update({
      where: { id: experimentId },
      data: { status: 'RUNNING' },
    });

    return this.mapToExperiment(experiment);
  }

  /**
   * Stop an experiment and analyze results
   */
  async stopExperiment(
    tenantId: TenantId,
    experimentId: ExperimentId,
    reason?: string,
  ): Promise<ExperimentResults> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (existing.status !== 'RUNNING' && existing.status !== 'PAUSED') {
      throw new Error(`Cannot stop experiment in status ${existing.status}`);
    }

    // Capture final metrics
    const treatmentMetrics = await this.captureMetrics(existing.targetMetrics);

    // Analyze results
    const results = this.analyzeResults(
      existing.controlMetrics || [],
      treatmentMetrics,
      existing.successCriteria,
    );

    // Update experiment with results
    await this.prisma.experiment.update({
      where: { id: experimentId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        treatmentMetrics: treatmentMetrics as unknown as Prisma.JsonArray,
        statisticalSignificance: results.statisticalSignificance,
        verdict: results.verdict,
        verdictReason: results.verdictReason,
      },
    });

    return {
      experimentId,
      controlMetrics: existing.controlMetrics || [],
      treatmentMetrics,
      improvement: results.improvement,
      statisticalSignificance: results.statisticalSignificance,
      verdict: results.verdict,
      verdictReason: results.verdictReason,
      confidenceInterval: results.confidenceInterval,
      sampleSizes: results.sampleSizes,
    };
  }

  /**
   * Record learnings from an experiment
   */
  async recordLearnings(
    tenantId: TenantId,
    experimentId: ExperimentId,
    learnings: string,
    applyToIntent?: boolean,
  ): Promise<Experiment> {
    const existing = await this.getExperiment(tenantId, experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const experiment = await this.prisma.experiment.update({
      where: { id: experimentId },
      data: {
        learnings,
        appliedToIntent: applyToIntent || false,
      },
    });

    // If applying to intent, create an IntentLearning record
    if (applyToIntent && existing.intentId) {
      await this.prisma.intentLearning.create({
        data: {
          intentId: existing.intentId,
          title: `Learning from experiment: ${existing.name}`,
          description: learnings,
          learningType: existing.verdict === 'SUCCESS' ? 'APPROACH' : 'OBSTACLE',
          evidence: [
            {
              type: 'experiment',
              experimentId: experimentId,
              verdict: existing.verdict,
              improvement: existing.statisticalSignificance,
            },
          ] as unknown as Prisma.JsonArray,
          confidence: existing.statisticalSignificance || 0.5,
          sourceType: 'EXPERIMENT',
          sourceId: experimentId,
          appliedAt: new Date(),
        },
      });
    }

    return this.mapToExperiment(experiment);
  }

  /**
   * Check guardrails for a running experiment
   */
  async checkGuardrails(experimentId: ExperimentId): Promise<{
    passed: boolean;
    violations: Array<{ guardrail: Guardrail; currentValue: number }>;
  }> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment || experiment.status !== 'RUNNING') {
      return { passed: true, violations: [] };
    }

    const guardrails = (experiment.guardrails || []) as unknown as Guardrail[];
    const violations: Array<{ guardrail: Guardrail; currentValue: number }> = [];

    for (const guardrail of guardrails) {
      const signal = await this.prisma.signal.findUnique({
        where: { id: guardrail.metricId },
      });

      if (!signal) continue;

      const currentValue = Number(signal.currentValue);
      let violated = false;

      switch (guardrail.operator) {
        case 'gt':
          violated = currentValue > guardrail.threshold;
          break;
        case 'gte':
          violated = currentValue >= guardrail.threshold;
          break;
        case 'lt':
          violated = currentValue < guardrail.threshold;
          break;
        case 'lte':
          violated = currentValue <= guardrail.threshold;
          break;
      }

      if (violated) {
        violations.push({ guardrail, currentValue });

        if (guardrail.action === 'stop') {
          await this.prisma.experiment.update({
            where: { id: experimentId },
            data: {
              status: 'COMPLETED',
              endedAt: new Date(),
              verdict: 'GUARDRAIL_TRIPPED',
              verdictReason: `Guardrail "${guardrail.name}" violated: ${currentValue} ${guardrail.operator} ${guardrail.threshold}`,
            },
          });
        } else if (guardrail.action === 'pause') {
          await this.prisma.experiment.update({
            where: { id: experimentId },
            data: { status: 'PAUSED' },
          });
        }
      }
    }

    return { passed: violations.length === 0, violations };
  }

  /**
   * Get experiment statistics
   */
  async getExperimentStats(tenantId: TenantId): Promise<{
    total: number;
    byStatus: Record<ExperimentStatus, number>;
    byVerdict: Record<ExperimentVerdict, number>;
    avgDuration: number;
    successRate: number;
    recentLearnings: number;
  }> {
    const experiments = await this.prisma.experiment.findMany({
      where: { tenantId },
    });

    const byStatus = experiments.reduce((acc, e) => {
      const status = e.status as ExperimentStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<ExperimentStatus, number>);

    const completed = experiments.filter(e => e.status === 'COMPLETED' && e.verdict);
    const byVerdict = completed.reduce((acc, e) => {
      const verdict = e.verdict as ExperimentVerdict;
      acc[verdict] = (acc[verdict] || 0) + 1;
      return acc;
    }, {} as Record<ExperimentVerdict, number>);

    // Calculate average duration
    const withDuration = completed.filter(e => e.startedAt && e.endedAt);
    const avgDuration = withDuration.length > 0
      ? withDuration.reduce((sum, e) => {
          return sum + (e.endedAt!.getTime() - e.startedAt!.getTime());
        }, 0) / withDuration.length / (1000 * 60) // Convert to minutes
      : 0;

    const successRate = completed.length > 0
      ? (byVerdict.SUCCESS || 0) / completed.length
      : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentLearnings = experiments.filter(
      e => e.learnings && e.updatedAt > oneWeekAgo
    ).length;

    return {
      total: experiments.length,
      byStatus,
      byVerdict,
      avgDuration,
      successRate,
      recentLearnings,
    };
  }

  // Private helpers

  private async captureMetrics(targetMetrics: TargetMetric[]): Promise<MetricSnapshot[]> {
    const snapshots: MetricSnapshot[] = [];

    for (const metric of targetMetrics) {
      const signal = await this.prisma.signal.findUnique({
        where: { id: metric.signalId },
      });

      if (signal) {
        // Get recent measurements for sample size
        const measurements = await this.prisma.signalMeasurement.findMany({
          where: {
            signalId: metric.signalId,
            measuredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        snapshots.push({
          signalId: metric.signalId,
          value: Number(signal.currentValue),
          sampleSize: measurements.reduce((sum, m) => sum + m.sampleCount, 0),
          confidence: 0.95, // Default confidence
          timestamp: new Date(),
        });
      }
    }

    return snapshots;
  }

  private analyzeResults(
    controlMetrics: MetricSnapshot[],
    treatmentMetrics: MetricSnapshot[],
    successCriteria: SuccessCriterion[],
  ): {
    improvement: number;
    statisticalSignificance: number;
    verdict: ExperimentVerdict;
    verdictReason: string;
    confidenceInterval: { lower: number; upper: number };
    sampleSizes: { control: number; treatment: number };
  } {
    // Simple analysis - in production would use proper statistical tests
    let totalImprovement = 0;
    let criteriaMetCount = 0;

    const controlSampleSize = controlMetrics.reduce((sum, m) => sum + m.sampleSize, 0);
    const treatmentSampleSize = treatmentMetrics.reduce((sum, m) => sum + m.sampleSize, 0);

    for (const criterion of successCriteria) {
      const control = controlMetrics.find(m => m.signalId === criterion.metricId);
      const treatment = treatmentMetrics.find(m => m.signalId === criterion.metricId);

      if (!control || !treatment) continue;

      const improvement = ((treatment.value - control.value) / control.value) * 100;
      totalImprovement += improvement;

      let criteriaMet = false;
      switch (criterion.operator) {
        case 'gt':
          criteriaMet = treatment.value > criterion.threshold;
          break;
        case 'gte':
          criteriaMet = treatment.value >= criterion.threshold;
          break;
        case 'lt':
          criteriaMet = treatment.value < criterion.threshold;
          break;
        case 'lte':
          criteriaMet = treatment.value <= criterion.threshold;
          break;
        case 'eq':
          criteriaMet = Math.abs(treatment.value - criterion.threshold) < 0.001;
          break;
      }

      if (criteriaMet) {
        criteriaMetCount++;
      }
    }

    const avgImprovement = successCriteria.length > 0
      ? totalImprovement / successCriteria.length
      : 0;

    // Simplified statistical significance calculation
    // In production, would use proper t-tests or Bayesian analysis
    const minSampleSize = Math.min(controlSampleSize, treatmentSampleSize);
    const statisticalSignificance = Math.min(
      0.99,
      0.5 + (minSampleSize / 1000) * 0.49
    );

    // Determine verdict
    let verdict: ExperimentVerdict;
    let verdictReason: string;

    if (statisticalSignificance < 0.8) {
      verdict = 'INCONCLUSIVE';
      verdictReason = `Insufficient statistical significance (${(statisticalSignificance * 100).toFixed(1)}%). Need more samples.`;
    } else if (criteriaMetCount === successCriteria.length) {
      verdict = 'SUCCESS';
      verdictReason = `All ${successCriteria.length} success criteria met with ${avgImprovement.toFixed(1)}% improvement.`;
    } else if (criteriaMetCount >= successCriteria.length / 2) {
      verdict = 'SUCCESS';
      verdictReason = `${criteriaMetCount}/${successCriteria.length} success criteria met with ${avgImprovement.toFixed(1)}% improvement.`;
    } else if (avgImprovement < -5) {
      verdict = 'FAILURE';
      verdictReason = `Treatment performed worse than control with ${avgImprovement.toFixed(1)}% change.`;
    } else {
      verdict = 'INCONCLUSIVE';
      verdictReason = `Mixed results: ${criteriaMetCount}/${successCriteria.length} criteria met.`;
    }

    // Simplified confidence interval
    const margin = (1 - statisticalSignificance) * avgImprovement;
    const confidenceInterval = {
      lower: avgImprovement - margin,
      upper: avgImprovement + margin,
    };

    return {
      improvement: avgImprovement,
      statisticalSignificance,
      verdict,
      verdictReason,
      confidenceInterval,
      sampleSizes: { control: controlSampleSize, treatment: treatmentSampleSize },
    };
  }

  private async setupGuardrailMonitoring(
    experimentId: ExperimentId,
    guardrails: Guardrail[],
  ): Promise<void> {
    // In a real implementation, this would set up background jobs
    // or event listeners to monitor guardrails continuously
    const key = `experiment:guardrails:${experimentId}`;
    await this.redis.set(key, JSON.stringify(guardrails), 'EX', 86400 * 30); // 30 days
  }

  private mapToExperiment(prismaExperiment: {
    id: string;
    tenantId: string;
    name: string;
    description: string;
    hypothesis: string;
    rationale: string | null;
    intentId: string | null;
    capabilityId: string | null;
    experimentType: string;
    targetMetrics: Prisma.JsonValue;
    successCriteria: Prisma.JsonValue;
    guardrails: Prisma.JsonValue;
    targetAudience: Prisma.JsonValue;
    trafficPercent: number;
    plannedDuration: number | null;
    minSampleSize: number | null;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
    controlMetrics: Prisma.JsonValue;
    treatmentMetrics: Prisma.JsonValue;
    statisticalSignificance: number | null;
    verdict: string | null;
    verdictReason: string | null;
    learnings: string | null;
    appliedToIntent: boolean;
    createdById: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): Experiment {
    return {
      id: prismaExperiment.id as ExperimentId,
      tenantId: prismaExperiment.tenantId as TenantId,
      name: prismaExperiment.name,
      description: prismaExperiment.description,
      hypothesis: prismaExperiment.hypothesis,
      rationale: prismaExperiment.rationale,
      intentId: prismaExperiment.intentId as IntentId | null,
      capabilityId: prismaExperiment.capabilityId as CapabilityId | null,
      experimentType: prismaExperiment.experimentType as ExperimentType,
      targetMetrics: (prismaExperiment.targetMetrics || []) as unknown as TargetMetric[],
      successCriteria: (prismaExperiment.successCriteria || []) as unknown as SuccessCriterion[],
      guardrails: (prismaExperiment.guardrails || []) as unknown as Guardrail[],
      targetAudience: prismaExperiment.targetAudience as unknown as TargetAudience | null,
      trafficPercent: prismaExperiment.trafficPercent,
      plannedDuration: prismaExperiment.plannedDuration,
      minSampleSize: prismaExperiment.minSampleSize,
      status: prismaExperiment.status as ExperimentStatus,
      startedAt: prismaExperiment.startedAt,
      endedAt: prismaExperiment.endedAt,
      controlMetrics: prismaExperiment.controlMetrics as unknown as MetricSnapshot[] | null,
      treatmentMetrics: prismaExperiment.treatmentMetrics as unknown as MetricSnapshot[] | null,
      statisticalSignificance: prismaExperiment.statisticalSignificance,
      verdict: prismaExperiment.verdict as ExperimentVerdict | null,
      verdictReason: prismaExperiment.verdictReason,
      learnings: prismaExperiment.learnings,
      appliedToIntent: prismaExperiment.appliedToIntent,
      createdById: prismaExperiment.createdById,
      metadata: prismaExperiment.metadata as Record<string, unknown>,
      createdAt: prismaExperiment.createdAt,
      updatedAt: prismaExperiment.updatedAt,
    };
  }
}

export default ExperimentService;
