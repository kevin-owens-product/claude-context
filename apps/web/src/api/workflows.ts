/**
 * Workflows API - Workflow automation management
 * @prompt-id forge-v4.1:web:api:workflows:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

// Types
export type WorkflowTriggerType = 'EVENT' | 'SIGNAL' | 'SCHEDULE' | 'MANUAL';
export type WorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ConditionOperator = 'AND' | 'OR';
export type RuleOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than' | 'older_than' | 'newer_than' | 'is_null' | 'is_not_null';
export type ActionType = 'CHANGE_STATUS' | 'NOTIFY' | 'WEBHOOK' | 'CREATE_ENTITY' | 'ASSIGN' | 'UPDATE_FIELD';

export interface EventTriggerConfig {
  eventTypes: string[];
  entityTypes: string[];
  filters?: Record<string, unknown>;
}

export interface SignalTriggerConfig {
  signalType: string;
  condition: 'health_becomes' | 'crosses_threshold';
  value: string | number;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone: string;
}

export interface ManualTriggerConfig {
  allowedRoles?: string[];
}

export type TriggerConfig = EventTriggerConfig | SignalTriggerConfig | ScheduleTriggerConfig | ManualTriggerConfig;

export interface ConditionRule {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export interface WorkflowConditions {
  operator: ConditionOperator;
  rules: ConditionRule[];
}

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
}

export interface ActionResult {
  actionType: ActionType;
  order: number;
  success: boolean;
  result?: unknown;
  error?: string;
  executedAt: string;
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  lastRunAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  status: WorkflowExecutionStatus;
  triggerEventId?: string;
  triggerData: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  actionsExecuted?: ActionResult[];
  error?: string;
  workflow?: Workflow;
}

export interface TriggerContext {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  entity?: Record<string, unknown>;
  signal?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkflowFilters {
  triggerType?: WorkflowTriggerType;
  isEnabled?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: WorkflowExecutionStatus;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  isEnabled?: boolean;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: TriggerConfig;
  conditions?: WorkflowConditions | null;
  actions?: WorkflowAction[];
  isEnabled?: boolean;
}

export interface TestWorkflowResult {
  wouldTrigger: boolean;
  conditionsMet: boolean;
  preview: ActionResult[];
}

// Template types
export interface TemplateVariable {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  required: boolean;
  description: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'escalation' | 'notification' | 'assignment' | 'status' | 'integration';
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  variables?: TemplateVariable[];
}

export interface ApplyTemplateInput {
  templateId: string;
  variables?: Record<string, unknown>;
  name?: string;
}

export interface TemplatePreview {
  template: {
    id: string;
    name: string;
    category: string;
  };
  variablesApplied: Record<string, unknown>;
  workflow: Omit<WorkflowTemplate, 'id' | 'category' | 'variables'>;
}

// API functions
export const workflowsApi = {
  // Workflow CRUD
  list: (filters?: WorkflowFilters) =>
    api.get<PaginatedResponse<Workflow>>('/workflows', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Workflow>(`/workflows/${id}`),

  create: (data: CreateWorkflowInput) =>
    api.post<Workflow>('/workflows', data),

  update: (id: string, data: UpdateWorkflowInput) =>
    api.put<Workflow>(`/workflows/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/workflows/${id}`),

  // Workflow management
  enable: (id: string) =>
    api.post<Workflow>(`/workflows/${id}/enable`),

  disable: (id: string) =>
    api.post<Workflow>(`/workflows/${id}/disable`),

  test: (id: string, mockData: TriggerContext) =>
    api.post<TestWorkflowResult>(`/workflows/${id}/test`, mockData),

  execute: (id: string, triggerData: TriggerContext) =>
    api.post<WorkflowExecution>(`/workflows/${id}/execute`, triggerData),

  // Executions
  listExecutions: (workflowId: string, filters?: Omit<ExecutionFilters, 'workflowId'>) =>
    api.get<PaginatedResponse<WorkflowExecution>>(
      `/workflows/${workflowId}/executions`,
      filters as Record<string, string | number | undefined>
    ),

  listAllExecutions: (filters?: ExecutionFilters) =>
    api.get<PaginatedResponse<WorkflowExecution>>(
      '/workflows/executions/all',
      filters as Record<string, string | number | undefined>
    ),

  getExecution: (executionId: string) =>
    api.get<WorkflowExecution>(`/workflows/executions/${executionId}`),

  cancelExecution: (executionId: string) =>
    api.post<WorkflowExecution>(`/workflows/executions/${executionId}/cancel`),

  retryExecution: (executionId: string) =>
    api.post<WorkflowExecution>(`/workflows/executions/${executionId}/retry`),

  // Templates
  listTemplates: (category?: WorkflowTemplate['category']) =>
    api.get<WorkflowTemplate[]>('/workflows/templates', category ? { category } : undefined),

  getTemplate: (templateId: string) =>
    api.get<WorkflowTemplate>(`/workflows/templates/${templateId}`),

  applyTemplate: (templateId: string, input: Omit<ApplyTemplateInput, 'templateId'>) =>
    api.post<Workflow>(`/workflows/templates/${templateId}/apply`, input),

  previewTemplate: (templateId: string, variables: Record<string, string>) =>
    api.get<TemplatePreview>(`/workflows/templates/${templateId}/preview`, variables),
};
