/**
 * Capabilities API Client
 *
 * Capabilities are what the system can DO to fulfill intents.
 * They measure their own effectiveness.
 *
 * @prompt-id forge-v4.1:web:api:capabilities:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type CapabilityStatus = 'CONCEPT' | 'DEVELOPMENT' | 'TESTING' | 'ACTIVE' | 'DEPRECATED' | 'RETIRED';
export type MaturityLevel = 'INITIAL' | 'REPEATABLE' | 'DEFINED' | 'MANAGED' | 'OPTIMIZING';
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CapabilityGap {
  description: string;
  severity: GapSeverity;
  detectedAt: string;
  resolvedAt?: string;
  affectedUseCases: string[];
  suggestedFix?: string;
}

export interface CapabilityUsage {
  period: string;
  invocations: number;
  successRate: number;
  avgDuration: number;
  p95Duration: number;
  errorRate: number;
}

export interface ValueDelivered {
  timeSaved?: number;
  errorsPrevented?: number;
  revenueGenerated?: number;
  costReduced?: number;
  customMetrics?: Record<string, number>;
}

export interface Capability {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  provides: string;
  limitations: string[];
  assumptions: string[];
  intentId?: string;
  artifactIds: string[];
  dependsOn: string[];
  status: CapabilityStatus;
  maturityLevel: MaturityLevel;
  effectivenessScore: number;
  usage: CapabilityUsage[];
  gaps: CapabilityGap[];
  valueDelivered?: ValueDelivered;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilitySummary {
  totalCapabilities: number;
  byStatus: Record<CapabilityStatus, number>;
  byMaturity: Record<MaturityLevel, number>;
  totalGaps: number;
  averageEffectiveness: number;
  capabilitiesWithGaps: Capability[];
}

export interface DependencyNode {
  capability: Capability;
  dependents: DependencyNode[];
}

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// Create a new capability
export async function createCapability(data: {
  name: string;
  description: string;
  provides: string;
  limitations?: string[];
  assumptions?: string[];
  intentId?: string;
  artifactIds?: string[];
  dependsOn?: string[];
  maturityLevel?: MaturityLevel;
}): Promise<Capability> {
  const response = await api.post<ApiResponse<Capability>>('/capabilities', data);
  return response.data;
}

// List capabilities with filtering
export async function listCapabilities(params?: {
  status?: CapabilityStatus;
  maturityLevel?: MaturityLevel;
  intentId?: string;
  hasGaps?: boolean;
  minEffectiveness?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Capability[]; total: number }> {
  return api.get<ListResponse<Capability>>('/capabilities', params as Record<string, string | number | undefined>);
}

// Get a single capability
export async function getCapability(id: string): Promise<Capability> {
  const response = await api.get<ApiResponse<Capability>>(`/capabilities/${id}`);
  return response.data;
}

// Update a capability
export async function updateCapability(id: string, data: Partial<{
  name: string;
  description: string;
  provides: string;
  limitations: string[];
  assumptions: string[];
  intentId: string | null;
  artifactIds: string[];
  dependsOn: string[];
  status: CapabilityStatus;
  maturityLevel: MaturityLevel;
  gaps: CapabilityGap[];
  valueDelivered: ValueDelivered;
}>): Promise<Capability> {
  const response = await api.put<ApiResponse<Capability>>(`/capabilities/${id}`, data);
  return response.data;
}

// Record usage
export async function recordCapabilityUsage(id: string, data: {
  success: boolean;
  timestamp?: string;
  duration?: number;
  context?: Record<string, unknown>;
}): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/capabilities/${id}/usage`, data);
}

// Add a gap
export async function addCapabilityGap(id: string, gap: Omit<CapabilityGap, 'detectedAt' | 'resolvedAt'>): Promise<Capability> {
  const response = await api.post<ApiResponse<Capability>>(`/capabilities/${id}/gaps`, gap);
  return response.data;
}

// Resolve a gap
export async function resolveCapabilityGap(id: string, gapIndex: number): Promise<Capability> {
  const response = await api.post<ApiResponse<Capability>>(`/capabilities/${id}/gaps/${gapIndex}/resolve`);
  return response.data;
}

// Update value delivered
export async function updateValueDelivered(id: string, value: Partial<ValueDelivered>): Promise<Capability> {
  const response = await api.put<ApiResponse<Capability>>(`/capabilities/${id}/value`, value);
  return response.data;
}

// Get dependency graph
export async function getDependencyGraph(id: string): Promise<DependencyNode> {
  const response = await api.get<ApiResponse<DependencyNode>>(`/capabilities/${id}/dependencies`);
  return response.data;
}

// Get capability summary
export async function getCapabilitySummary(): Promise<CapabilitySummary> {
  const response = await api.get<ApiResponse<CapabilitySummary>>('/capabilities/summary');
  return response.data;
}

// Get capabilities by intent
export async function getCapabilitiesByIntent(intentId: string): Promise<Capability[]> {
  const response = await api.get<ApiResponse<Capability[]>>(`/capabilities/intent/${intentId}`);
  return response.data;
}
