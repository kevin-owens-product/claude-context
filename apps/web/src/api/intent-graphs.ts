/**
 * Intent Graphs API - Client for intent graph operations
 * @prompt-id forge-v4.1:web:api:intent-graphs:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type IntentGraphStatus = 'draft' | 'active' | 'archived';

export interface IntentGoal {
  id: string;
  graphId: string;
  parentId?: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  successCriteria: string[];
  children?: IntentGoal[];
}

export interface IntentConstraint {
  id: string;
  graphId: string;
  type: 'must' | 'should' | 'could' | 'wont';
  category: string;
  description: string;
  rationale?: string;
}

export interface EntityAttribute {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  validationRules?: string[];
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  guards?: string[];
  actions?: string[];
}

export interface EntityStateMachine {
  states: string[];
  initialState: string;
  transitions: StateTransition[];
}

export interface IntentEntity {
  id: string;
  graphId: string;
  name: string;
  description: string;
  attributes: EntityAttribute[];
  relationships?: Array<{
    targetEntityId: string;
    type: string;
    cardinality: string;
  }>;
  stateMachine?: EntityStateMachine;
}

export interface BehaviorStep {
  order: number;
  action: string;
  description?: string;
  errorHandling?: string;
}

export interface IntentBehavior {
  id: string;
  graphId: string;
  name: string;
  description: string;
  triggerType: 'user_action' | 'system_event' | 'scheduled' | 'conditional';
  triggerCondition?: string;
  steps: BehaviorStep[];
  errorHandlers?: Array<{
    errorType: string;
    handler: string;
  }>;
}

export interface IntentContext {
  id: string;
  graphId: string;
  category: 'business' | 'technical' | 'historical';
  content: string;
  sourceType?: string;
  sourceReference?: string;
}

export interface IntentGraph {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: IntentGraphStatus;
  version: number;
  goals: IntentGoal[];
  constraints: IntentConstraint[];
  entities: IntentEntity[];
  behaviors: IntentBehavior[];
  contexts: IntentContext[];
  createdAt: string;
  updatedAt: string;
}

export interface IntentGraphListResponse {
  graphs: IntentGraph[];
  total: number;
}

interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Normalize status from uppercase (API) to lowercase (frontend)
function normalizeGraph(graph: any): IntentGraph {
  return {
    ...graph,
    status: graph.status?.toLowerCase() as IntentGraphStatus,
    goals: graph.goals || [],
    constraints: graph.constraints || [],
    entities: graph.entities || [],
    behaviors: graph.behaviors || [],
    contexts: graph.contexts || [],
  };
}

export const intentGraphsApi = {
  listGraphs: async (projectId: string, params?: { status?: IntentGraphStatus; limit?: number; offset?: number }): Promise<IntentGraphListResponse> => {
    const response = await api.get<ApiPaginatedResponse<IntentGraph>>('/intent-graphs', { projectId, ...params });
    return { graphs: (response.data || []).map(normalizeGraph), total: response.total };
  },

  getGraph: async (graphId: string): Promise<IntentGraph> => {
    const response = await api.get<IntentGraph>(`/intent-graphs/${graphId}`);
    return normalizeGraph(response);
  },

  createGraph: (data: { projectId: string; name: string; description?: string }) =>
    api.post<IntentGraph>('/intent-graphs', data),

  updateGraph: (graphId: string, data: Partial<Pick<IntentGraph, 'name' | 'description' | 'status'>>) =>
    api.put<IntentGraph>(`/intent-graphs/${graphId}`, data),

  deleteGraph: (graphId: string) => api.delete<void>(`/intent-graphs/${graphId}`),

  // Goals
  addGoal: (graphId: string, data: Omit<IntentGoal, 'id' | 'graphId'>) =>
    api.post<IntentGoal>(`/intent-graphs/${graphId}/goals`, data),

  updateGoal: (graphId: string, goalId: string, data: Partial<IntentGoal>) =>
    api.put<IntentGoal>(`/intent-graphs/${graphId}/goals/${goalId}`, data),

  deleteGoal: (graphId: string, goalId: string) =>
    api.delete<void>(`/intent-graphs/${graphId}/goals/${goalId}`),

  // Constraints
  addConstraint: (graphId: string, data: Omit<IntentConstraint, 'id' | 'graphId'>) =>
    api.post<IntentConstraint>(`/intent-graphs/${graphId}/constraints`, data),

  deleteConstraint: (graphId: string, constraintId: string) =>
    api.delete<void>(`/intent-graphs/${graphId}/constraints/${constraintId}`),

  // Entities
  addEntity: (graphId: string, data: Omit<IntentEntity, 'id' | 'graphId'>) =>
    api.post<IntentEntity>(`/intent-graphs/${graphId}/entities`, data),

  updateEntity: (graphId: string, entityId: string, data: Partial<IntentEntity>) =>
    api.put<IntentEntity>(`/intent-graphs/${graphId}/entities/${entityId}`, data),

  deleteEntity: (graphId: string, entityId: string) =>
    api.delete<void>(`/intent-graphs/${graphId}/entities/${entityId}`),

  // Behaviors
  addBehavior: (graphId: string, data: Omit<IntentBehavior, 'id' | 'graphId'>) =>
    api.post<IntentBehavior>(`/intent-graphs/${graphId}/behaviors`, data),

  updateBehavior: (graphId: string, behaviorId: string, data: Partial<IntentBehavior>) =>
    api.put<IntentBehavior>(`/intent-graphs/${graphId}/behaviors/${behaviorId}`, data),

  deleteBehavior: (graphId: string, behaviorId: string) =>
    api.delete<void>(`/intent-graphs/${graphId}/behaviors/${behaviorId}`),

  // Contexts
  addContext: (graphId: string, data: Omit<IntentContext, 'id' | 'graphId'>) =>
    api.post<IntentContext>(`/intent-graphs/${graphId}/contexts`, data),

  deleteContext: (graphId: string, contextId: string) =>
    api.delete<void>(`/intent-graphs/${graphId}/contexts/${contextId}`),

  // Validation
  validateGraph: (graphId: string) =>
    api.get<{ valid: boolean; errors: string[]; warnings: string[] }>(`/intent-graphs/${graphId}/validate`),
};
