/**
 * Solutions API - Use cases and solution templates
 * @prompt-id forge-v4.1:web:api:solutions:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface Solution {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  valueProposition: string;
  prerequisites: string[];
  steps: SolutionStep[];
  artifacts: SolutionArtifact[];
  implementations: SolutionImplementation[];
  metrics: {
    implementationCount: number;
    avgTimeSaved: number; // hours
    successRate: number; // percentage
    avgRating: number;
  };
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface SolutionStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedTime?: number; // minutes
  optional: boolean;
}

export interface SolutionArtifact {
  id: string;
  type: 'TEMPLATE' | 'CODE' | 'DOCUMENTATION' | 'CONFIG' | 'WORKFLOW';
  name: string;
  url: string;
  artifactId?: string;
}

export interface SolutionImplementation {
  id: string;
  customerId: string;
  customerName: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string;
  timeSaved?: number;
  feedback?: string;
  rating?: number;
}

export interface SolutionFilters {
  category?: string;
  complexity?: Solution['complexity'];
  status?: Solution['status'];
  tags?: string[];
  search?: string;
}

export interface SolutionsResponse {
  data: Solution[];
  total: number;
  categories: Array<{ name: string; count: number }>;
  metrics: {
    published: number;
    totalImplementations: number;
    avgSuccessRate: number;
    totalHoursSaved: number;
  };
}

export interface CreateSolutionInput {
  title: string;
  description: string;
  category: string;
  complexity: Solution['complexity'];
  valueProposition: string;
  prerequisites?: string[];
  tags?: string[];
  steps?: Array<Omit<SolutionStep, 'id'>>;
}

export interface UpdateSolutionInput extends Partial<CreateSolutionInput> {
  status?: Solution['status'];
}

// API functions
export const solutionsApi = {
  list: (filters?: SolutionFilters) =>
    api.get<SolutionsResponse>('/solutions', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Solution>(`/solutions/${id}`),

  create: (data: CreateSolutionInput) =>
    api.post<Solution>('/solutions', data),

  update: (id: string, data: UpdateSolutionInput) =>
    api.put<Solution>(`/solutions/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/solutions/${id}`),

  // Publish/Archive
  publish: (id: string) =>
    api.post<Solution>(`/solutions/${id}/publish`),

  archive: (id: string) =>
    api.post<Solution>(`/solutions/${id}/archive`),

  // Steps
  addStep: (solutionId: string, step: Omit<SolutionStep, 'id'>) =>
    api.post<SolutionStep>(`/solutions/${solutionId}/steps`, step),

  updateStep: (solutionId: string, stepId: string, data: Partial<SolutionStep>) =>
    api.put<SolutionStep>(`/solutions/${solutionId}/steps/${stepId}`, data),

  deleteStep: (solutionId: string, stepId: string) =>
    api.delete<void>(`/solutions/${solutionId}/steps/${stepId}`),

  reorderSteps: (solutionId: string, stepIds: string[]) =>
    api.put<SolutionStep[]>(`/solutions/${solutionId}/steps/reorder`, { stepIds }),

  // Artifacts
  addArtifact: (solutionId: string, artifact: Omit<SolutionArtifact, 'id'>) =>
    api.post<SolutionArtifact>(`/solutions/${solutionId}/artifacts`, artifact),

  removeArtifact: (solutionId: string, artifactId: string) =>
    api.delete<void>(`/solutions/${solutionId}/artifacts/${artifactId}`),

  // Implementations
  startImplementation: (solutionId: string, customerId: string) =>
    api.post<SolutionImplementation>(`/solutions/${solutionId}/implementations`, { customerId }),

  completeImplementation: (solutionId: string, implementationId: string, data: {
    timeSaved?: number;
    feedback?: string;
    rating?: number;
  }) =>
    api.put<SolutionImplementation>(
      `/solutions/${solutionId}/implementations/${implementationId}/complete`,
      data
    ),

  abandonImplementation: (solutionId: string, implementationId: string, reason?: string) =>
    api.put<SolutionImplementation>(
      `/solutions/${solutionId}/implementations/${implementationId}/abandon`,
      { reason }
    ),

  // Categories
  getCategories: () =>
    api.get<Array<{ name: string; count: number; icon?: string }>>('/solutions/categories'),
};
