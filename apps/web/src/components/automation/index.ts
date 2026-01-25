/**
 * Automation Components Index
 * @prompt-id forge-v4.1:web:components:automation:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

// Legacy component
export { WorkflowAutomation } from './WorkflowAutomation';

// Workflow Builder
export { WorkflowBuilder } from './WorkflowBuilder';
export type { WorkflowData, WorkflowTriggerType, WorkflowExecutionStatus } from './WorkflowBuilder';

// Trigger Configuration
export { TriggerConfig } from './TriggerConfig';
export type {
  TriggerConfigData,
  EventTriggerConfig,
  SignalTriggerConfig,
  ScheduleTriggerConfig,
  ManualTriggerConfig,
} from './TriggerConfig';

// Condition Builder
export { ConditionBuilder } from './ConditionBuilder';
export type { ConditionData, ConditionRule, ConditionOperator, RuleOperator } from './ConditionBuilder';

// Action Configuration
export { ActionConfig } from './ActionConfig';
export type { ActionConfigData, ActionType } from './ActionConfig';

// Workflow List
export { WorkflowList } from './WorkflowList';
export type { WorkflowSummary } from './WorkflowList';

// Execution History
export { ExecutionHistory } from './ExecutionHistory';
export type { WorkflowExecution } from './ExecutionHistory';

// Analytics
export { WorkflowAnalytics } from './WorkflowAnalytics';

// Templates
export { WorkflowTemplateSelector } from './WorkflowTemplateSelector';
