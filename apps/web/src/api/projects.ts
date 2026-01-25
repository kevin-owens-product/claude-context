/**
 * Projects API - Client for project management operations
 * @prompt-id forge-v4.1:web:api:projects:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';
export type GoalStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'abandoned';
export type ConstraintCategory =
  | 'technical'
  | 'business'
  | 'regulatory'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'compatibility'
  | 'budget'
  | 'timeline';
export type ConstraintSeverity = 'must' | 'should' | 'could' | 'wont';

export interface ProjectGoal {
  id: string;
  projectId: string;
  parentGoalId?: string;
  description: string;
  priority: GoalPriority;
  status: GoalStatus;
  successCriteria: string[];
  children?: ProjectGoal[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConstraint {
  id: string;
  projectId: string;
  description: string;
  category: ConstraintCategory;
  severity: ConstraintSeverity;
  rationale?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDecision {
  id: string;
  projectId: string;
  description: string;
  rationale: string;
  alternatives: string[];
  madeBy: string;
  madeAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface Project {
  id: string;
  contextId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  goals?: ProjectGoal[];
  constraints?: ProjectConstraint[];
  decisions?: ProjectDecision[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Normalize status from uppercase (API) to lowercase (frontend)
function normalizeProject(project: any): Project {
  return {
    ...project,
    status: project.status?.toLowerCase() as ProjectStatus,
    goals: project.goals?.map((g: any) => ({
      ...g,
      priority: g.priority?.toLowerCase() as GoalPriority,
      status: g.status?.toLowerCase() as GoalStatus,
      children: g.subGoals?.map((sg: any) => ({
        ...sg,
        priority: sg.priority?.toLowerCase() as GoalPriority,
        status: sg.status?.toLowerCase() as GoalStatus,
      })),
    })) || [],
    constraints: project.constraints?.map((c: any) => ({
      ...c,
      category: c.category?.toLowerCase() as ConstraintCategory,
      severity: c.severity?.toLowerCase() as ConstraintSeverity,
    })) || [],
    decisions: project.decisions || [],
  };
}

export const projectsApi = {
  listProjects: async (params?: { status?: ProjectStatus; limit?: number; offset?: number }): Promise<ProjectListResponse> => {
    const response = await api.get<ApiPaginatedResponse<Project>>('/context/projects', params);
    return { projects: (response.data || []).map(normalizeProject), total: response.total };
  },

  getProject: async (projectId: string): Promise<Project> => {
    const response = await api.get<Project>(`/context/projects/${projectId}`);
    return normalizeProject(response);
  },

  createProject: (data: { name: string; description?: string }) =>
    api.post<Project>('/context/projects', data),

  updateProject: (projectId: string, data: Partial<Pick<Project, 'name' | 'description' | 'status'>>) =>
    api.put<Project>(`/context/projects/${projectId}`, data),

  deleteProject: (projectId: string) => api.delete<void>(`/context/projects/${projectId}`),

  // Goals
  addGoal: (projectId: string, data: {
    description: string;
    priority: GoalPriority;
    successCriteria?: string[];
    parentGoalId?: string;
  }) => api.post<ProjectGoal>(`/context/projects/${projectId}/goals`, data),

  updateGoal: (projectId: string, goalId: string, data: Partial<ProjectGoal>) =>
    api.put<ProjectGoal>(`/context/projects/${projectId}/goals/${goalId}`, data),

  deleteGoal: (projectId: string, goalId: string) =>
    api.delete<void>(`/context/projects/${projectId}/goals/${goalId}`),

  // Constraints
  addConstraint: (projectId: string, data: {
    description: string;
    category: ConstraintCategory;
    severity: ConstraintSeverity;
    rationale?: string;
  }) => api.post<ProjectConstraint>(`/context/projects/${projectId}/constraints`, data),

  deleteConstraint: (projectId: string, constraintId: string) =>
    api.delete<void>(`/context/projects/${projectId}/constraints/${constraintId}`),

  // Decisions
  addDecision: (projectId: string, data: {
    description: string;
    rationale: string;
    alternatives?: string[];
  }) => api.post<ProjectDecision>(`/context/projects/${projectId}/decisions`, data),

  reverseDecision: (projectId: string, decisionId: string, reason: string) =>
    api.post<ProjectDecision>(`/context/projects/${projectId}/decisions/${decisionId}/reverse`, { reason }),
};
