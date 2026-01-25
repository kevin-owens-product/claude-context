/**
 * Objectives API - OKRs and business outcomes tracking
 * @prompt-id forge-v4.1:web:api:objectives:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface Objective {
  id: string;
  title: string;
  description: string;
  level: 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
  status: 'DRAFT' | 'ACTIVE' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
  progress: number;
  owner: string;
  ownerAvatar?: string;
  timeframe: {
    startDate: string;
    endDate: string;
    quarter?: string;
    year: number;
  };
  keyResults: KeyResult[];
  parentId?: string;
  children?: Objective[];
  linkedSlices?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  id: string;
  title: string;
  type: 'NUMBER' | 'PERCENTAGE' | 'CURRENCY' | 'BOOLEAN';
  currentValue: number;
  targetValue: number;
  startValue: number;
  unit?: string;
  progress: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'ACHIEVED';
  measurements: KeyResultMeasurement[];
}

export interface KeyResultMeasurement {
  id: string;
  value: number;
  date: string;
  note?: string;
}

export interface ObjectiveFilters {
  level?: Objective['level'];
  status?: Objective['status'];
  owner?: string;
  quarter?: string;
  year?: number;
  search?: string;
}

export interface ObjectivesResponse {
  data: Objective[];
  total: number;
  metrics: {
    total: number;
    achieved: number;
    active: number;
    atRisk: number;
    avgProgress: number;
    krsOnTrack: number;
  };
}

export interface CreateObjectiveInput {
  title: string;
  description?: string;
  level: Objective['level'];
  owner: string;
  timeframe: {
    startDate: string;
    endDate: string;
  };
  parentId?: string;
  keyResults?: Array<{
    title: string;
    type: KeyResult['type'];
    targetValue: number;
    startValue?: number;
    unit?: string;
  }>;
}

export interface UpdateObjectiveInput extends Partial<CreateObjectiveInput> {
  status?: Objective['status'];
}

// API functions
export const objectivesApi = {
  list: (filters?: ObjectiveFilters) =>
    api.get<ObjectivesResponse>('/objectives', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Objective>(`/objectives/${id}`),

  create: (data: CreateObjectiveInput) =>
    api.post<Objective>('/objectives', data),

  update: (id: string, data: UpdateObjectiveInput) =>
    api.put<Objective>(`/objectives/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/objectives/${id}`),

  // Key Results
  addKeyResult: (objectiveId: string, data: Omit<KeyResult, 'id' | 'progress' | 'status' | 'measurements' | 'currentValue'>) =>
    api.post<KeyResult>(`/objectives/${objectiveId}/key-results`, data),

  updateKeyResult: (objectiveId: string, krId: string, data: Partial<KeyResult>) =>
    api.put<KeyResult>(`/objectives/${objectiveId}/key-results/${krId}`, data),

  deleteKeyResult: (objectiveId: string, krId: string) =>
    api.delete<void>(`/objectives/${objectiveId}/key-results/${krId}`),

  // Measurements
  addMeasurement: (objectiveId: string, krId: string, data: { value: number; note?: string }) =>
    api.post<KeyResultMeasurement>(`/objectives/${objectiveId}/key-results/${krId}/measurements`, data),

  // Hierarchy
  getTree: (level?: Objective['level']) =>
    api.get<Objective[]>('/objectives/tree', { level }),

  // Link to slices
  linkSlice: (objectiveId: string, sliceId: string) =>
    api.post<void>(`/objectives/${objectiveId}/slices/${sliceId}`),

  unlinkSlice: (objectiveId: string, sliceId: string) =>
    api.delete<void>(`/objectives/${objectiveId}/slices/${sliceId}`),
};
