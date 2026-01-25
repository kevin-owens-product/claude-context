/**
 * Experiments API Client
 *
 * Experiments test hypotheses about how to improve intent fulfillment.
 * Every change is a hypothesis. Every deployment is an experiment.
 *
 * @prompt-id forge-v4.1:web:api:experiments:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type ExperimentType = 'A_B_TEST' | 'FEATURE_FLAG' | 'GRADUAL_ROLLOUT' | 'CANARY' | 'SHADOW';
export type ExperimentStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'ANALYZING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type ExperimentVerdict = 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'GUARDRAIL_TRIPPED';
export type GuardrailAction = 'pause' | 'stop' | 'alert';

export interface TargetMetric {
  signalId: string;
  name: string;
  weight: number;
  expectedImprovement: number;
}

export interface SuccessCriterion {
  metricId: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  threshold: number;
  minSampleSize?: number;
}

export interface Guardrail {
  metricId: string;
  name: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte';
  threshold: number;
  action: GuardrailAction;
}

export interface TargetAudience {
  percentage: number;
  segments?: string[];
  excludeSegments?: string[];
  rules?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

export interface ExperimentResult {
  metricId: string;
  controlValue: number;
  treatmentValue: number;
  absoluteChange: number;
  relativeChange: number;
  pValue: number;
  confidenceInterval: [number, number];
  isSignificant: boolean;
  sampleSize: number;
}

export interface Experiment {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  hypothesis: string;
  rationale?: string;
  intentId?: string;
  capabilityId?: string;
  experimentType: ExperimentType;
  status: ExperimentStatus;
  targetMetrics: TargetMetric[];
  successCriteria: SuccessCriterion[];
  guardrails: Guardrail[];
  targetAudience?: TargetAudience;
  trafficPercent: number;
  startedAt?: string;
  endedAt?: string;
  plannedDuration?: number;
  minSampleSize?: number;
  controlMetrics?: Record<string, number>;
  treatmentMetrics?: Record<string, number>;
  statisticalSignificance?: number;
  verdict?: ExperimentVerdict;
  verdictReason?: string;
  learnings?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentStats {
  totalExperiments: number;
  byStatus: Record<ExperimentStatus, number>;
  byVerdict: Record<ExperimentVerdict, number>;
  averageRunDuration: number;
  winRate: number;
  activeExperiments: Experiment[];
}

export interface GuardrailCheckResult {
  guardrail: Guardrail;
  currentValue: number;
  isTriggered: boolean;
  triggeredAt?: string;
}

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// Create a new experiment
export async function createExperiment(data: {
  name: string;
  description: string;
  hypothesis: string;
  rationale?: string;
  intentId?: string;
  capabilityId?: string;
  experimentType?: ExperimentType;
  targetMetrics: TargetMetric[];
  successCriteria: SuccessCriterion[];
  guardrails?: Guardrail[];
  targetAudience?: TargetAudience;
  trafficPercent?: number;
  plannedDuration?: number;
  minSampleSize?: number;
}): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>('/experiments', data);
  return response.data;
}

// List experiments with filtering
export async function listExperiments(params?: {
  status?: ExperimentStatus;
  experimentType?: ExperimentType;
  intentId?: string;
  capabilityId?: string;
  verdict?: ExperimentVerdict;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Experiment[]; total: number }> {
  return api.get<ListResponse<Experiment>>('/experiments', params as Record<string, string | number | undefined>);
}

// Get a single experiment
export async function getExperiment(id: string): Promise<Experiment> {
  const response = await api.get<ApiResponse<Experiment>>(`/experiments/${id}`);
  return response.data;
}

// Update an experiment
export async function updateExperiment(id: string, data: Partial<{
  name: string;
  description: string;
  hypothesis: string;
  rationale: string;
  targetMetrics: TargetMetric[];
  successCriteria: SuccessCriterion[];
  guardrails: Guardrail[];
  targetAudience: TargetAudience;
  trafficPercent: number;
  plannedDuration: number;
  minSampleSize: number;
}>): Promise<Experiment> {
  const response = await api.put<ApiResponse<Experiment>>(`/experiments/${id}`, data);
  return response.data;
}

// Start an experiment
export async function startExperiment(id: string): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>(`/experiments/${id}/start`);
  return response.data;
}

// Pause an experiment
export async function pauseExperiment(id: string): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>(`/experiments/${id}/pause`);
  return response.data;
}

// Resume an experiment
export async function resumeExperiment(id: string): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>(`/experiments/${id}/resume`);
  return response.data;
}

// Stop an experiment
export async function stopExperiment(id: string, reason?: string): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>(`/experiments/${id}/stop`, { reason });
  return response.data;
}

// Record learnings
export async function recordLearnings(id: string, learnings: string, applyToIntent?: boolean): Promise<Experiment> {
  const response = await api.post<ApiResponse<Experiment>>(`/experiments/${id}/learnings`, { learnings, applyToIntent });
  return response.data;
}

// Check guardrails
export async function checkGuardrails(id: string): Promise<GuardrailCheckResult[]> {
  const response = await api.get<ApiResponse<GuardrailCheckResult[]>>(`/experiments/${id}/guardrails`);
  return response.data;
}

// Get experiment statistics
export async function getExperimentStats(): Promise<ExperimentStats> {
  const response = await api.get<ApiResponse<ExperimentStats>>('/experiments/stats');
  return response.data;
}
