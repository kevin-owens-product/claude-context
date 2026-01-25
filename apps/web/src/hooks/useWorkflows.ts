/**
 * useWorkflows - React Query hooks for workflow automation
 * @prompt-id forge-v4.1:web:hooks:workflows:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workflowsApi,
  type WorkflowFilters,
  type ExecutionFilters,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type TriggerContext,
  type WorkflowTemplate,
  type ApplyTemplateInput,
} from '../api/workflows';

// Query Keys
export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters?: WorkflowFilters) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  executions: (workflowId?: string) => [...workflowKeys.all, 'executions', workflowId] as const,
  execution: (id: string) => [...workflowKeys.all, 'execution', id] as const,
  templates: () => [...workflowKeys.all, 'templates'] as const,
  templatesByCategory: (category?: WorkflowTemplate['category']) => [...workflowKeys.templates(), category] as const,
  template: (id: string) => [...workflowKeys.all, 'template', id] as const,
};

// ============================================================================
// WORKFLOW QUERIES
// ============================================================================

export function useWorkflows(filters?: WorkflowFilters) {
  return useQuery({
    queryKey: workflowKeys.list(filters),
    queryFn: () => workflowsApi.list(filters),
  });
}

export function useWorkflow(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.detail(workflowId),
    queryFn: () => workflowsApi.get(workflowId),
    enabled: !!workflowId,
  });
}

// ============================================================================
// WORKFLOW MUTATIONS
// ============================================================================

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkflowInput) => workflowsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateWorkflowInput) =>
      workflowsApi.update(id, data),
    onSuccess: (workflow) => {
      queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: workflowKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useEnableWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.enable(id),
    onSuccess: (workflow) => {
      queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useDisableWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowsApi.disable(id),
    onSuccess: (workflow) => {
      queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? workflowsApi.enable(id) : workflowsApi.disable(id),
    onSuccess: (workflow) => {
      queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useTestWorkflow() {
  return useMutation({
    mutationFn: ({ id, mockData }: { id: string; mockData: TriggerContext }) =>
      workflowsApi.test(id, mockData),
  });
}

export function useExecuteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, triggerData }: { id: string; triggerData: TriggerContext }) =>
      workflowsApi.execute(id, triggerData),
    onSuccess: (execution) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(execution.workflowId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(execution.workflowId) });
    },
  });
}

// ============================================================================
// EXECUTION QUERIES
// ============================================================================

export function useWorkflowExecutions(workflowId: string, filters?: Omit<ExecutionFilters, 'workflowId'>) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId),
    queryFn: () => workflowsApi.listExecutions(workflowId, filters),
    enabled: !!workflowId,
    refetchInterval: (query) => {
      // Refetch more frequently if there are running executions
      const data = query.state.data;
      const hasRunning = data?.data?.some(e => e.status === 'RUNNING');
      return hasRunning ? 5000 : false;
    },
  });
}

export function useAllExecutions(filters?: ExecutionFilters) {
  return useQuery({
    queryKey: [...workflowKeys.executions(undefined), filters],
    queryFn: () => workflowsApi.listAllExecutions(filters),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasRunning = data?.data?.some(e => e.status === 'RUNNING');
      return hasRunning ? 5000 : false;
    },
  });
}

export function useExecution(executionId: string) {
  return useQuery({
    queryKey: workflowKeys.execution(executionId),
    queryFn: () => workflowsApi.getExecution(executionId),
    enabled: !!executionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'PENDING' ? 2000 : false;
    },
  });
}

// ============================================================================
// EXECUTION MUTATIONS
// ============================================================================

export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: string) => workflowsApi.cancelExecution(executionId),
    onSuccess: (execution) => {
      queryClient.setQueryData(workflowKeys.execution(execution.id), execution);
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(execution.workflowId) });
    },
  });
}

export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: string) => workflowsApi.retryExecution(executionId),
    onSuccess: (execution) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(execution.workflowId) });
    },
  });
}

// ============================================================================
// COMBINED HOOKS
// ============================================================================

/**
 * Hook that provides all workflow-related mutations in one place
 */
export function useWorkflowActions() {
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const enableWorkflow = useEnableWorkflow();
  const disableWorkflow = useDisableWorkflow();
  const toggleWorkflow = useToggleWorkflow();
  const testWorkflow = useTestWorkflow();
  const executeWorkflow = useExecuteWorkflow();

  return {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    enableWorkflow,
    disableWorkflow,
    toggleWorkflow,
    testWorkflow,
    executeWorkflow,
    isLoading:
      createWorkflow.isPending ||
      updateWorkflow.isPending ||
      deleteWorkflow.isPending ||
      enableWorkflow.isPending ||
      disableWorkflow.isPending ||
      toggleWorkflow.isPending ||
      executeWorkflow.isPending,
  };
}

/**
 * Hook that provides all execution-related mutations in one place
 */
export function useExecutionActions() {
  const cancelExecution = useCancelExecution();
  const retryExecution = useRetryExecution();

  return {
    cancelExecution,
    retryExecution,
    isLoading: cancelExecution.isPending || retryExecution.isPending,
  };
}

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

export function useWorkflowTemplates(category?: WorkflowTemplate['category']) {
  return useQuery({
    queryKey: workflowKeys.templatesByCategory(category),
    queryFn: () => workflowsApi.listTemplates(category),
  });
}

export function useWorkflowTemplate(templateId: string) {
  return useQuery({
    queryKey: workflowKeys.template(templateId),
    queryFn: () => workflowsApi.getTemplate(templateId),
    enabled: !!templateId,
  });
}

export function useTemplatePreview(templateId: string, variables: Record<string, string>) {
  return useQuery({
    queryKey: [...workflowKeys.template(templateId), 'preview', variables],
    queryFn: () => workflowsApi.previewTemplate(templateId, variables),
    enabled: !!templateId,
  });
}

// ============================================================================
// TEMPLATE MUTATIONS
// ============================================================================

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, ...input }: { templateId: string } & Omit<ApplyTemplateInput, 'templateId'>) =>
      workflowsApi.applyTemplate(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

/**
 * Hook that provides all template-related actions
 */
export function useTemplateActions() {
  const applyTemplate = useApplyTemplate();

  return {
    applyTemplate,
    isLoading: applyTemplate.isPending,
  };
}
