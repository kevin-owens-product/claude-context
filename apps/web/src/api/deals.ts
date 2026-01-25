/**
 * Deals API - Sales pipeline and opportunity management
 * @prompt-id forge-v4.1:web:api:deals:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface Deal {
  id: string;
  name: string;
  company: string;
  customerId?: string;
  value: number;
  stage: DealStage;
  probability: number;
  closeDate: string;
  daysUntilClose: number;
  champion: string;
  championTitle: string;
  owner: string;
  blockers: DealBlocker[];
  activities: DealActivity[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
}

export type DealStage =
  | 'qualification'
  | 'discovery'
  | 'validation'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface DealBlocker {
  id: string;
  feature: string;
  priority: 'high' | 'medium' | 'low';
  featureRequestId?: string;
}

export interface DealActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal' | 'note';
  date: string;
  note: string;
  createdBy: string;
}

export interface DealFilters {
  stage?: DealStage;
  owner?: string;
  customerId?: string;
  minValue?: number;
  maxValue?: number;
  closingWithin?: number; // days
  hasBlockers?: boolean;
  search?: string;
}

export interface DealsResponse {
  data: Deal[];
  total: number;
  metrics: {
    totalPipeline: number;
    weightedPipeline: number;
    closingSoon: number;
    blockedDeals: number;
    wonThisMonth: number;
  };
}

export interface CreateDealInput {
  name: string;
  company: string;
  customerId?: string;
  value: number;
  stage: DealStage;
  probability?: number;
  closeDate: string;
  champion: string;
  championTitle?: string;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  stage?: DealStage;
}

// API functions
export const dealsApi = {
  list: (filters?: DealFilters) =>
    api.get<DealsResponse>('/deals', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Deal>(`/deals/${id}`),

  create: (data: CreateDealInput) =>
    api.post<Deal>('/deals', data),

  update: (id: string, data: UpdateDealInput) =>
    api.put<Deal>(`/deals/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/deals/${id}`),

  // Stage management
  moveStage: (id: string, stage: DealStage) =>
    api.put<Deal>(`/deals/${id}/stage`, { stage }),

  // Blockers
  addBlocker: (id: string, blocker: Omit<DealBlocker, 'id'>) =>
    api.post<DealBlocker>(`/deals/${id}/blockers`, blocker),

  removeBlocker: (dealId: string, blockerId: string) =>
    api.delete<void>(`/deals/${dealId}/blockers/${blockerId}`),

  // Activities
  addActivity: (id: string, activity: Omit<DealActivity, 'id' | 'createdBy'>) =>
    api.post<DealActivity>(`/deals/${id}/activities`, activity),

  // Analytics
  getPipelineStats: () =>
    api.get<{
      byStage: Record<DealStage, { count: number; value: number }>;
      byOwner: Array<{ owner: string; totalValue: number; dealCount: number }>;
      forecast: Array<{ month: string; predicted: number; actual?: number }>;
    }>('/deals/analytics/pipeline'),
};
