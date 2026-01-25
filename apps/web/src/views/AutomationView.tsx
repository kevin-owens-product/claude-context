/**
 * AutomationView - Workflow Automation Management
 *
 * A comprehensive view for creating, managing, and monitoring workflow automations.
 * Supports event-based, signal-based, scheduled, and manual triggers.
 *
 * @prompt-id forge-v4.1:web:views:automation:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  WorkflowBuilder,
  WorkflowList,
  ExecutionHistory,
  type WorkflowData,
  type WorkflowSummary,
  type WorkflowExecution,
} from '../components/automation';
import {
  useWorkflows,
  useWorkflowActions,
  useWorkflowExecutions,
  useAllExecutions,
  useExecutionActions,
} from '../hooks/useWorkflows';
import type {
  Workflow,
  WorkflowTriggerType,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  TriggerContext,
} from '../api/workflows';

interface AutomationViewProps {
  tenantId: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'executions' | 'all-executions';

export function AutomationView({ tenantId }: AutomationViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | undefined>(undefined);

  // Queries
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useWorkflows();
  const { data: executionsData, isLoading: isLoadingExecutions } = useWorkflowExecutions(
    selectedWorkflowId || '',
    { limit: 50 }
  );
  const { data: allExecutionsData, isLoading: isLoadingAllExecutions } = useAllExecutions(
    { limit: 50 }
  );

  // Actions
  const {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    testWorkflow,
    isLoading: isActionsLoading,
  } = useWorkflowActions();

  const {
    cancelExecution,
    retryExecution,
    isLoading: isExecutionActionsLoading,
  } = useExecutionActions();

  // Transform API data to component types
  const workflows: WorkflowSummary[] = (workflowsData?.data || []).map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    isEnabled: w.isEnabled,
    triggerType: w.triggerType,
    runCount: w.runCount,
    lastRunAt: w.lastRunAt,
    createdAt: w.createdAt,
  }));

  const executions: WorkflowExecution[] = (
    viewMode === 'all-executions'
      ? allExecutionsData?.data || []
      : executionsData?.data || []
  ).map(e => ({
    id: e.id,
    workflowId: e.workflowId,
    workflowName: e.workflow?.name,
    status: e.status,
    triggerEventId: e.triggerEventId,
    triggerData: e.triggerData,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    actionsExecuted: e.actionsExecuted?.map(a => ({
      ...a,
      executedAt: a.executedAt,
    })),
    error: e.error,
  }));

  // Convert Workflow to WorkflowData for the builder
  const workflowToData = (w: Workflow): WorkflowData => ({
    id: w.id,
    name: w.name,
    description: w.description,
    isEnabled: w.isEnabled,
    triggerType: w.triggerType,
    triggerConfig: w.triggerConfig,
    conditions: w.conditions,
    actions: w.actions,
  });

  // Convert WorkflowData to CreateWorkflowInput
  const dataToCreateInput = (data: WorkflowData): CreateWorkflowInput => ({
    name: data.name,
    description: data.description,
    triggerType: data.triggerType,
    triggerConfig: data.triggerConfig,
    conditions: data.conditions,
    actions: data.actions,
    isEnabled: data.isEnabled,
  });

  // Handlers
  const handleCreateNew = useCallback(() => {
    setSelectedWorkflow(undefined);
    setViewMode('create');
  }, []);

  const handleEdit = useCallback((workflow: WorkflowSummary) => {
    const fullWorkflow = workflowsData?.data.find(w => w.id === workflow.id);
    if (fullWorkflow) {
      setSelectedWorkflow(workflowToData(fullWorkflow));
      setSelectedWorkflowId(workflow.id);
      setViewMode('edit');
    }
  }, [workflowsData]);

  const handleDelete = useCallback(async (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow.mutateAsync(workflowId);
    }
  }, [deleteWorkflow]);

  const handleToggleEnabled = useCallback(async (workflowId: string, enabled: boolean) => {
    await toggleWorkflow.mutateAsync({ id: workflowId, enabled });
  }, [toggleWorkflow]);

  const handleViewExecutions = useCallback((workflowId: string) => {
    const workflow = workflowsData?.data.find(w => w.id === workflowId);
    setSelectedWorkflowId(workflowId);
    setSelectedWorkflow(workflow ? workflowToData(workflow) : undefined);
    setViewMode('executions');
  }, [workflowsData]);

  const handleSave = useCallback(async (data: WorkflowData) => {
    if (data.id) {
      // Update existing
      await updateWorkflow.mutateAsync({
        id: data.id,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        conditions: data.conditions,
        actions: data.actions,
        isEnabled: data.isEnabled,
      });
    } else {
      // Create new
      await createWorkflow.mutateAsync(dataToCreateInput(data));
    }
    setViewMode('list');
    setSelectedWorkflow(undefined);
    setSelectedWorkflowId(null);
  }, [createWorkflow, updateWorkflow]);

  const handleTest = useCallback(async (data: WorkflowData) => {
    if (!selectedWorkflowId) {
      return { wouldTrigger: false, conditionsMet: false };
    }

    const mockData: TriggerContext = {
      eventType: 'updated',
      entityType: 'slice',
      entityId: 'mock-id',
      entity: { status: 'blocked', priority: 'HIGH' },
      metadata: { testMode: true },
    };

    const result = await testWorkflow.mutateAsync({
      id: selectedWorkflowId,
      mockData,
    });

    return {
      wouldTrigger: result.wouldTrigger,
      conditionsMet: result.conditionsMet,
    };
  }, [selectedWorkflowId, testWorkflow]);

  const handleCancel = useCallback(() => {
    setViewMode('list');
    setSelectedWorkflow(undefined);
    setSelectedWorkflowId(null);
  }, []);

  const handleRetryExecution = useCallback(async (executionId: string) => {
    await retryExecution.mutateAsync(executionId);
  }, [retryExecution]);

  const handleCancelExecution = useCallback(async (executionId: string) => {
    await cancelExecution.mutateAsync(executionId);
  }, [cancelExecution]);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedWorkflowId(null);
    setSelectedWorkflow(undefined);
  }, []);

  const handleViewAllExecutions = useCallback(() => {
    setViewMode('all-executions');
    setSelectedWorkflowId(null);
  }, []);

  // Render based on view mode
  switch (viewMode) {
    case 'create':
    case 'edit':
      return (
        <WorkflowBuilder
          workflow={selectedWorkflow}
          onSave={handleSave}
          onTest={viewMode === 'edit' ? handleTest : undefined}
          onCancel={handleCancel}
          isLoading={isActionsLoading}
        />
      );

    case 'executions':
    case 'all-executions':
      return (
        <ExecutionHistory
          executions={executions}
          workflowName={viewMode === 'executions' ? selectedWorkflow?.name : undefined}
          isLoading={viewMode === 'all-executions' ? isLoadingAllExecutions : isLoadingExecutions}
          onRetry={handleRetryExecution}
          onCancel={handleCancelExecution}
          onBack={handleBackToList}
        />
      );

    default:
      return (
        <div className="flex flex-col h-full">
          <WorkflowList
            workflows={workflows}
            isLoading={isLoadingWorkflows}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleEnabled={handleToggleEnabled}
            onViewExecutions={handleViewExecutions}
          />
          {/* Footer with All Executions link */}
          <div className="flex items-center justify-center px-6 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
            <button
              onClick={handleViewAllExecutions}
              className="text-sm text-claude-primary-400 hover:text-claude-primary-300 transition-colors"
            >
              View All Executions
            </button>
          </div>
        </div>
      );
  }
}

export default AutomationView;
