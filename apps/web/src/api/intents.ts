/**
 * Intents API Client
 *
 * Intents are the "why" of Living Software - the desired outcomes
 * we're trying to achieve.
 *
 * @prompt-id forge-v4.1:web:api:intents:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface IntentEvidence {
  type: 'user_research' | 'analytics' | 'feedback' | 'experiment' | 'market_data' | 'business_case';
  description: string;
  confidence: number;
  source?: string;
  date?: string;
}

export interface SuccessCriterion {
  description: string;
  metric?: string;
  targetValue?: number;
  unit?: string;
  isMet: boolean;
}

export interface BusinessValue {
  estimatedRevenue?: number;
  estimatedCostSaving?: number;
  estimatedTimeSaving?: number;
  strategicImportance?: 'critical' | 'high' | 'medium' | 'low';
  customerImpact?: number;
  revenueAtRisk?: number;
}

export type IntentPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'EXPLORATORY';
export type IntentStatus = 'HYPOTHESIZED' | 'VALIDATED' | 'ACTIVE' | 'FULFILLED' | 'ABANDONED' | 'SUPERSEDED';

export interface Intent {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  desiredState: string;
  projectId?: string;
  successCriteria: SuccessCriterion[];
  antiPatterns: string[];
  evidence: IntentEvidence[];
  priority: IntentPriority;
  status: IntentStatus;
  confidenceScore: number;
  fulfillmentScore: number;
  parentIntentId?: string;
  primaryStakeholder?: string;
  affectedPersonas: string[];
  businessValue?: BusinessValue;
  createdAt: string;
  updatedAt: string;
  lastEvidenceAt?: string;
}

export interface IntentHierarchyNode extends Intent {
  children: IntentHierarchyNode[];
}

export interface FulfillmentSummary {
  totalIntents: number;
  byStatus: Record<IntentStatus, number>;
  byPriority: Record<IntentPriority, number>;
  averageConfidence: number;
  averageFulfillment: number;
  criticalIntentsAtRisk: Intent[];
}

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// Create a new intent
export async function createIntent(data: {
  title: string;
  description: string;
  desiredState: string;
  projectId?: string;
  successCriteria?: SuccessCriterion[];
  antiPatterns?: string[];
  evidence?: IntentEvidence[];
  priority?: IntentPriority;
  parentIntentId?: string;
  primaryStakeholder?: string;
  affectedPersonas?: string[];
  businessValue?: BusinessValue;
}): Promise<Intent> {
  const response = await api.post<ApiResponse<Intent>>('/intents', data);
  return response.data;
}

// List intents with filtering
export async function listIntents(params?: {
  status?: IntentStatus;
  priority?: IntentPriority;
  projectId?: string;
  parentIntentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Intent[]; total: number }> {
  return api.get<ListResponse<Intent>>('/intents', params as Record<string, string | number | undefined>);
}

// Get a single intent
export async function getIntent(id: string): Promise<Intent> {
  const response = await api.get<ApiResponse<Intent>>(`/intents/${id}`);
  return response.data;
}

// Update an intent
export async function updateIntent(id: string, data: Partial<{
  title: string;
  description: string;
  desiredState: string;
  successCriteria: SuccessCriterion[];
  antiPatterns: string[];
  evidence: IntentEvidence[];
  priority: IntentPriority;
  status: IntentStatus;
  confidenceScore: number;
  primaryStakeholder: string;
  affectedPersonas: string[];
  businessValue: BusinessValue;
}>): Promise<Intent> {
  const response = await api.put<ApiResponse<Intent>>(`/intents/${id}`, data);
  return response.data;
}

// Add evidence to an intent
export async function addEvidence(id: string, evidence: Omit<IntentEvidence, 'date'>): Promise<Intent> {
  const response = await api.post<ApiResponse<Intent>>(`/intents/${id}/evidence`, evidence);
  return response.data;
}

// Get intent hierarchy
export async function getIntentHierarchy(rootIntentId?: string): Promise<IntentHierarchyNode[]> {
  const response = await api.get<ApiResponse<IntentHierarchyNode[]>>(
    '/intents/hierarchy',
    rootIntentId ? { rootIntentId } : undefined,
  );
  return response.data;
}

// Get fulfillment summary
export async function getFulfillmentSummary(projectId?: string): Promise<FulfillmentSummary> {
  const response = await api.get<ApiResponse<FulfillmentSummary>>(
    '/intents/summary',
    projectId ? { projectId } : undefined,
  );
  return response.data;
}
