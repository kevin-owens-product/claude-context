/**
 * Signals API Client
 *
 * Signals are continuous evidence streams that measure whether
 * intents are being fulfilled and capabilities are effective.
 *
 * @prompt-id forge-v4.1:web:api:signals:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type SignalType =
  | 'USAGE'
  | 'PERFORMANCE'
  | 'ERROR_RATE'
  | 'SATISFACTION'
  | 'CONVERSION'
  | 'RETENTION'
  | 'ENGAGEMENT'
  | 'VALUE';

export type SignalHealth = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type SignalTrend = 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE';
export type MetricDirection = 'INCREASE' | 'DECREASE' | 'MAINTAIN';
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'P50' | 'P95' | 'P99';

export interface SignalSource {
  type: 'analytics' | 'api' | 'database' | 'external' | 'manual';
  config: Record<string, unknown>;
}

export interface Signal {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  signalType: SignalType;
  intentId?: string;
  capabilityId?: string;
  currentValue?: number;
  previousValue?: number;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction: MetricDirection;
  unit?: string;
  aggregation: AggregationType;
  windowMinutes: number;
  sources: SignalSource[];
  health: SignalHealth;
  trend: SignalTrend;
  lastMeasuredAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SignalMeasurement {
  id: string;
  signalId: string;
  value: number;
  sampleCount: number;
  metadata?: Record<string, unknown>;
  measuredAt: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  createdAt: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  sampleCount: number;
  isAnomaly: boolean;
}

export interface AnomalyResult {
  hasAnomaly: boolean;
  anomalyScore: number;
  direction: 'above' | 'below' | null;
  expectedValue: number;
  actualValue: number;
  standardDeviations: number;
}

export interface SignalDashboard {
  totalSignals: number;
  activeSignals: number;
  byHealth: Record<SignalHealth, number>;
  byType: Record<SignalType, number>;
  recentAnomalies: Signal[];
}

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// Create a new signal
export async function createSignal(data: {
  name: string;
  description?: string;
  signalType: SignalType;
  intentId?: string;
  capabilityId?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  direction?: MetricDirection;
  unit?: string;
  aggregation?: AggregationType;
  windowMinutes?: number;
  sources?: SignalSource[];
}): Promise<Signal> {
  const response = await api.post<ApiResponse<Signal>>('/signals', data);
  return response.data;
}

// List signals with filtering
export async function listSignals(params?: {
  signalType?: SignalType;
  health?: SignalHealth;
  intentId?: string;
  capabilityId?: string;
  isActive?: boolean;
  hasAnomaly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Signal[]; total: number }> {
  return api.get<ListResponse<Signal>>('/signals', params as Record<string, string | number | undefined>);
}

// Get a single signal
export async function getSignal(id: string): Promise<Signal> {
  const response = await api.get<ApiResponse<Signal>>(`/signals/${id}`);
  return response.data;
}

// Update a signal
export async function updateSignal(id: string, data: Partial<{
  name: string;
  description: string;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  direction: MetricDirection;
  unit: string;
  aggregation: AggregationType;
  windowMinutes: number;
  sources: SignalSource[];
  isActive: boolean;
}>): Promise<Signal> {
  const response = await api.put<ApiResponse<Signal>>(`/signals/${id}`, data);
  return response.data;
}

// Record a measurement
export async function recordMeasurement(signalId: string, data: {
  value: number;
  sampleCount?: number;
  metadata?: Record<string, unknown>;
  measuredAt?: string;
}): Promise<SignalMeasurement> {
  const response = await api.post<ApiResponse<SignalMeasurement>>(`/signals/${signalId}/measurements`, data);
  return response.data;
}

// Record measurements in batch
export async function recordMeasurementsBatch(measurements: Array<{
  signalId: string;
  value: number;
  sampleCount?: number;
  metadata?: Record<string, unknown>;
  measuredAt?: string;
}>): Promise<SignalMeasurement[]> {
  const response = await api.post<ApiResponse<SignalMeasurement[]>>('/signals/measurements/batch', { measurements });
  return response.data;
}

// Get time series data
export async function getTimeSeries(signalId: string, params: {
  startTime: string;
  endTime: string;
  resolution?: 'minute' | 'hour' | 'day';
}): Promise<TimeSeriesPoint[]> {
  const response = await api.get<ApiResponse<TimeSeriesPoint[]>>(
    `/signals/${signalId}/timeseries`,
    params as Record<string, string | number | undefined>,
  );
  return response.data;
}

// Detect anomalies
export async function detectAnomalies(signalId: string): Promise<AnomalyResult> {
  const response = await api.post<ApiResponse<AnomalyResult>>(`/signals/${signalId}/detect-anomalies`);
  return response.data;
}

// Get dashboard summary
export async function getSignalDashboard(): Promise<SignalDashboard> {
  const response = await api.get<ApiResponse<SignalDashboard>>('/signals/dashboard');
  return response.data;
}

// Get signals needing attention
export async function getSignalsNeedingAttention(): Promise<Signal[]> {
  const response = await api.get<ApiResponse<Signal[]>>('/signals/attention');
  return response.data;
}

// Get signals for an intent
export async function getIntentSignals(intentId: string): Promise<Signal[]> {
  const response = await api.get<ApiResponse<Signal[]>>(`/signals/intent/${intentId}`);
  return response.data;
}
