/**
 * Code Health API Client
 *
 * API client for the Codebase Observation Engine - Health metrics,
 * capability health tracking, and code quality monitoring.
 *
 * @prompt-id forge-v4.1:web:api:code-health:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING';
export type EvolutionType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'REFACTORED' | 'SPLIT' | 'MERGED';

export interface CapabilityHealth {
  id: string;
  capabilityId: string;
  capabilityName: string;
  repositoryId: string;
  date: string;
  healthScore: number;
  status: HealthStatus;
  symbolCount: number;
  fileCount: number;
  avgComplexity: number;
  maxComplexity: number;
  testCoverage?: number;
  docCoverage?: number;
  changeFrequency: number;
  bugCount?: number;
  technicalDebtHours?: number;
  metrics: HealthMetrics;
}

export interface HealthMetrics {
  codeQuality: number;
  maintainability: number;
  testability: number;
  documentation: number;
  stability: number;
  performance?: number;
}

export interface CapabilityEvolution {
  id: string;
  capabilityId: string;
  capabilityName: string;
  evolutionType: EvolutionType;
  detectedAt: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  symbolsAdded: number;
  symbolsRemoved: number;
  symbolsModified: number;
  complexityDelta: number;
  description: string;
}

export interface HealthTrend {
  capabilityId: string;
  capabilityName: string;
  dataPoints: HealthDataPoint[];
  trend: TrendDirection;
  trendMagnitude: number;
  periodStart: string;
  periodEnd: string;
}

export interface HealthDataPoint {
  date: string;
  healthScore: number;
  symbolCount: number;
  avgComplexity: number;
  changeCount: number;
}

export interface CodeHealthSummary {
  repositoryId: string;
  repositoryName: string;
  overallHealth: number;
  status: HealthStatus;
  trend: TrendDirection;
  capabilityCount: number;
  healthyCapabilities: number;
  warningCapabilities: number;
  criticalCapabilities: number;
  topIssues: HealthIssue[];
  recentEvolutions: CapabilityEvolution[];
}

export interface HealthIssue {
  id: string;
  capabilityId: string;
  capabilityName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'complexity' | 'coverage' | 'documentation' | 'stability' | 'debt';
  title: string;
  description: string;
  affectedSymbols: string[];
  suggestedAction?: string;
  detectedAt: string;
}

export interface HealthComparison {
  capabilityId: string;
  capabilityName: string;
  baseline: HealthSnapshot;
  current: HealthSnapshot;
  changes: HealthChangeDetail[];
}

export interface HealthSnapshot {
  date: string;
  healthScore: number;
  symbolCount: number;
  avgComplexity: number;
  testCoverage?: number;
}

export interface HealthChangeDetail {
  metric: string;
  baselineValue: number;
  currentValue: number;
  percentChange: number;
  trend: TrendDirection;
}

export interface TechnicalDebtItem {
  id: string;
  repositoryId: string;
  capabilityId?: string;
  capabilityName?: string;
  filePath: string;
  symbolId?: string;
  symbolName?: string;
  category: 'complexity' | 'duplication' | 'coverage' | 'documentation' | 'deprecated' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedHours: number;
  detectedAt: string;
  resolvedAt?: string;
}

// =============================================================================
// Response wrappers
// =============================================================================

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// =============================================================================
// Code Health Summary Operations
// =============================================================================

export async function getCodeHealthSummary(repositoryId: string): Promise<CodeHealthSummary> {
  const response = await api.get<ApiResponse<CodeHealthSummary>>(`/repositories/${repositoryId}/health/summary`);
  return response.data;
}

export async function getAllRepositoriesHealth(): Promise<{ data: CodeHealthSummary[]; total: number }> {
  return api.get<ListResponse<CodeHealthSummary>>('/health/repositories');
}

// =============================================================================
// Capability Health Operations
// =============================================================================

export async function getCapabilityHealth(capabilityId: string, params?: {
  date?: string;
}): Promise<CapabilityHealth> {
  const response = await api.get<ApiResponse<CapabilityHealth>>(
    `/capabilities/${capabilityId}/health`,
    params as Record<string, string | number | undefined>
  );
  return response.data;
}

export async function listCapabilityHealth(repositoryId: string, params?: {
  status?: HealthStatus;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'healthScore' | 'complexity' | 'changeFrequency' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ data: CapabilityHealth[]; total: number }> {
  return api.get<ListResponse<CapabilityHealth>>(
    `/repositories/${repositoryId}/health/capabilities`,
    params as Record<string, string | number | undefined>
  );
}

export async function getCapabilityHealthHistory(capabilityId: string, params?: {
  days?: number;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<{ data: CapabilityHealth[]; total: number }> {
  return api.get<ListResponse<CapabilityHealth>>(
    `/capabilities/${capabilityId}/health/history`,
    params as Record<string, string | number | undefined>
  );
}

// =============================================================================
// Health Trends Operations
// =============================================================================

export async function getHealthTrends(repositoryId: string, params?: {
  days?: number;
  capabilityIds?: string[];
}): Promise<{ data: HealthTrend[]; total: number }> {
  const queryParams: Record<string, string | number | undefined> = {
    days: params?.days,
    capabilityIds: params?.capabilityIds?.join(','),
  };
  return api.get<ListResponse<HealthTrend>>(
    `/repositories/${repositoryId}/health/trends`,
    queryParams
  );
}

export async function compareHealth(capabilityId: string, params: {
  baselineDate: string;
  compareDate?: string;
}): Promise<HealthComparison> {
  const response = await api.get<ApiResponse<HealthComparison>>(
    `/capabilities/${capabilityId}/health/compare`,
    params as Record<string, string | number | undefined>
  );
  return response.data;
}

// =============================================================================
// Capability Evolution Operations
// =============================================================================

export async function listCapabilityEvolutions(repositoryId: string, params?: {
  capabilityId?: string;
  evolutionType?: EvolutionType;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: CapabilityEvolution[]; total: number }> {
  return api.get<ListResponse<CapabilityEvolution>>(
    `/repositories/${repositoryId}/health/evolutions`,
    params as Record<string, string | number | undefined>
  );
}

export async function getCapabilityEvolution(evolutionId: string): Promise<CapabilityEvolution> {
  const response = await api.get<ApiResponse<CapabilityEvolution>>(`/health/evolutions/${evolutionId}`);
  return response.data;
}

// =============================================================================
// Health Issues Operations
// =============================================================================

export async function listHealthIssues(repositoryId: string, params?: {
  capabilityId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'complexity' | 'coverage' | 'documentation' | 'stability' | 'debt';
  resolved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ data: HealthIssue[]; total: number }> {
  return api.get<ListResponse<HealthIssue>>(
    `/repositories/${repositoryId}/health/issues`,
    params as Record<string, string | number | undefined>
  );
}

export async function getHealthIssue(issueId: string): Promise<HealthIssue> {
  const response = await api.get<ApiResponse<HealthIssue>>(`/health/issues/${issueId}`);
  return response.data;
}

export async function resolveHealthIssue(issueId: string, data?: {
  resolution?: string;
}): Promise<HealthIssue> {
  const response = await api.post<ApiResponse<HealthIssue>>(`/health/issues/${issueId}/resolve`, data);
  return response.data;
}

// =============================================================================
// Technical Debt Operations
// =============================================================================

export async function listTechnicalDebt(repositoryId: string, params?: {
  capabilityId?: string;
  category?: TechnicalDebtItem['category'];
  severity?: TechnicalDebtItem['severity'];
  resolved?: boolean;
  sortBy?: 'estimatedHours' | 'severity' | 'detectedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ data: TechnicalDebtItem[]; total: number }> {
  return api.get<ListResponse<TechnicalDebtItem>>(
    `/repositories/${repositoryId}/health/debt`,
    params as Record<string, string | number | undefined>
  );
}

export async function getTechnicalDebtSummary(repositoryId: string): Promise<{
  totalItems: number;
  totalHours: number;
  byCategory: Record<TechnicalDebtItem['category'], { count: number; hours: number }>;
  bySeverity: Record<TechnicalDebtItem['severity'], { count: number; hours: number }>;
  trend: TrendDirection;
}> {
  const response = await api.get<ApiResponse<{
    totalItems: number;
    totalHours: number;
    byCategory: Record<TechnicalDebtItem['category'], { count: number; hours: number }>;
    bySeverity: Record<TechnicalDebtItem['severity'], { count: number; hours: number }>;
    trend: TrendDirection;
  }>>(`/repositories/${repositoryId}/health/debt/summary`);
  return response.data;
}

export async function resolveTechnicalDebt(debtId: string, data?: {
  resolution?: string;
}): Promise<TechnicalDebtItem> {
  const response = await api.post<ApiResponse<TechnicalDebtItem>>(`/health/debt/${debtId}/resolve`, data);
  return response.data;
}

// =============================================================================
// Health Metrics Operations
// =============================================================================

export async function calculateHealthMetrics(repositoryId: string): Promise<{ jobId: string }> {
  return api.post<{ jobId: string }>(`/repositories/${repositoryId}/health/calculate`);
}

export async function getHealthMetricsProgress(repositoryId: string, jobId: string): Promise<{
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  message?: string;
}> {
  return api.get<{
    status: 'pending' | 'running' | 'complete' | 'error';
    progress: number;
    message?: string;
  }>(`/repositories/${repositoryId}/health/calculate/${jobId}`);
}
