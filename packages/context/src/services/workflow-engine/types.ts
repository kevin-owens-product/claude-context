/**
 * Workflow Engine Types - Enterprise workflow definitions
 *
 * Key concepts:
 * - Workflows are versioned and immutable once published
 * - Steps can be actions, conditions, approvals, delays, or sub-workflows
 * - Execution context carries data through the workflow
 * - Compensation handlers enable rollback on failure
 *
 * @prompt-id forge-v4.1:types:workflow-engine:001
 */

import type { TenantId as CoreTenantId, UserId } from '../../types';

// Re-export for external use
export type TenantId = CoreTenantId;

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type WorkflowId = string & { readonly __brand: 'WorkflowId' };
export type WorkflowVersionId = string & { readonly __brand: 'WorkflowVersionId' };
export type ExecutionId = string & { readonly __brand: 'ExecutionId' };
export type StepId = string & { readonly __brand: 'StepId' };
export type IdempotencyKey = string & { readonly __brand: 'IdempotencyKey' };

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';

export interface WorkflowDefinition {
  id: WorkflowId;
  tenantId: TenantId;
  name: string;
  description?: string;

  // Versioning
  version: number;
  versionId: WorkflowVersionId;
  status: WorkflowStatus;

  // Trigger
  trigger: WorkflowTrigger;

  // Steps (DAG structure)
  steps: WorkflowStep[];

  // Global error handling
  onError?: ErrorHandler;

  // Metadata
  tags?: string[];
  category?: string;

  // Ownership
  createdBy: UserId;
  createdAt: Date;
  updatedBy?: UserId;
  updatedAt?: Date;
  publishedAt?: Date;
  publishedBy?: UserId;

  // Statistics
  executionCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
}

// ============================================================================
// TRIGGERS
// ============================================================================

export type TriggerType = 'EVENT' | 'SIGNAL' | 'SCHEDULE' | 'MANUAL' | 'WEBHOOK' | 'API';

export interface BaseTrigger {
  type: TriggerType;
  conditions?: TriggerCondition[];
}

export interface EventTrigger extends BaseTrigger {
  type: 'EVENT';
  eventTypes: string[];
  entityTypes: string[];
  filters?: Record<string, unknown>;
}

export interface SignalTrigger extends BaseTrigger {
  type: 'SIGNAL';
  signalType: string;
  condition: 'crosses_threshold' | 'health_becomes' | 'trend_changes';
  threshold?: number;
  healthLevel?: 'CRITICAL' | 'WARNING' | 'HEALTHY';
}

export interface ScheduleTrigger extends BaseTrigger {
  type: 'SCHEDULE';
  cron: string;
  timezone: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ManualTrigger extends BaseTrigger {
  type: 'MANUAL';
  allowedRoles?: string[];
  requiredInputs?: InputDefinition[];
}

export interface WebhookTrigger extends BaseTrigger {
  type: 'WEBHOOK';
  path: string;
  method: 'POST' | 'PUT';
  authentication?: 'none' | 'api_key' | 'hmac' | 'oauth';
  secretKey?: string;
}

export interface ApiTrigger extends BaseTrigger {
  type: 'API';
  requiredInputs?: InputDefinition[];
}

export type WorkflowTrigger =
  | EventTrigger
  | SignalTrigger
  | ScheduleTrigger
  | ManualTrigger
  | WebhookTrigger
  | ApiTrigger;

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface InputDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'file';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message?: string;
}

// ============================================================================
// WORKFLOW STEPS
// ============================================================================

export type StepType =
  | 'ACTION'      // Execute an action
  | 'CONDITION'   // Branch based on condition
  | 'PARALLEL'    // Execute multiple branches in parallel
  | 'LOOP'        // Iterate over a collection
  | 'DELAY'       // Wait for a duration or until a time
  | 'APPROVAL'    // Human-in-the-loop approval
  | 'SUBWORKFLOW' // Invoke another workflow
  | 'TRANSFORM'   // Data transformation
  | 'AGGREGATE';  // Wait for multiple inputs

export interface BaseStep {
  id: StepId;
  name: string;
  type: StepType;
  description?: string;

  // Execution flow
  next?: StepId | StepId[];  // Next step(s) to execute

  // Error handling
  onError?: ErrorHandler;
  retryPolicy?: RetryPolicy;
  timeout?: number; // ms

  // Compensation (for saga pattern)
  compensation?: CompensationConfig;
}

export interface ActionStep extends BaseStep {
  type: 'ACTION';
  actionType: ActionType;
  config: Record<string, unknown>;

  // Output mapping
  outputMapping?: Record<string, string>;
}

export interface ConditionStep extends BaseStep {
  type: 'CONDITION';
  conditions: ConditionBranch[];
  defaultBranch?: StepId;
}

export interface ConditionBranch {
  name: string;
  condition: ConditionExpression;
  next: StepId;
}

export interface ParallelStep extends BaseStep {
  type: 'PARALLEL';
  branches: ParallelBranch[];
  joinType: 'ALL' | 'ANY' | 'N_OF_M';
  joinCount?: number; // For N_OF_M
  timeout?: number;
}

export interface ParallelBranch {
  name: string;
  startStep: StepId;
}

export interface LoopStep extends BaseStep {
  type: 'LOOP';
  collection: string; // Expression to get collection
  itemVariable: string;
  indexVariable?: string;
  body: StepId; // First step of loop body
  maxIterations?: number;
  continueOnError?: boolean;
}

export interface DelayStep extends BaseStep {
  type: 'DELAY';
  delayType: 'DURATION' | 'UNTIL' | 'SCHEDULE';
  duration?: number; // ms for DURATION
  until?: string; // Expression for UNTIL
  cron?: string; // For SCHEDULE
}

export interface ApprovalStep extends BaseStep {
  type: 'APPROVAL';
  approvers: ApproverConfig;
  approvalType: 'ANY' | 'ALL' | 'MAJORITY' | 'N_OF_M';
  requiredCount?: number;
  timeout?: number; // ms
  timeoutAction: 'APPROVE' | 'REJECT' | 'ESCALATE';
  escalateTo?: string[];
  reminderInterval?: number;
  formFields?: InputDefinition[];
}

export interface ApproverConfig {
  type: 'USERS' | 'ROLES' | 'DYNAMIC' | 'HIERARCHY';
  users?: string[];
  roles?: string[];
  expression?: string; // For DYNAMIC
  levels?: number; // For HIERARCHY
}

export interface SubworkflowStep extends BaseStep {
  type: 'SUBWORKFLOW';
  workflowId: WorkflowId;
  version?: number; // Specific version or latest
  inputMapping: Record<string, string>;
  outputMapping?: Record<string, string>;
  waitForCompletion: boolean;
}

export interface TransformStep extends BaseStep {
  type: 'TRANSFORM';
  transformations: Transformation[];
}

export interface Transformation {
  target: string;
  expression: string;
  type?: 'SET' | 'APPEND' | 'MERGE' | 'DELETE';
}

export interface AggregateStep extends BaseStep {
  type: 'AGGREGATE';
  sources: string[]; // Step IDs to aggregate from
  aggregationType: 'MERGE' | 'ARRAY' | 'CUSTOM';
  expression?: string; // For CUSTOM
}

export type WorkflowStep =
  | ActionStep
  | ConditionStep
  | ParallelStep
  | LoopStep
  | DelayStep
  | ApprovalStep
  | SubworkflowStep
  | TransformStep
  | AggregateStep;

// ============================================================================
// ACTIONS
// ============================================================================

export type ActionType =
  | 'HTTP_REQUEST'
  | 'SEND_EMAIL'
  | 'SEND_SLACK'
  | 'SEND_SMS'
  | 'CREATE_RECORD'
  | 'UPDATE_RECORD'
  | 'DELETE_RECORD'
  | 'QUERY_RECORDS'
  | 'RUN_SCRIPT'
  | 'CALL_FUNCTION'
  | 'PUBLISH_EVENT'
  | 'LOG_MESSAGE'
  | 'SET_VARIABLE'
  | 'CUSTOM';

export interface ActionDefinition {
  type: ActionType;
  name: string;
  description: string;
  inputSchema: Record<string, InputDefinition>;
  outputSchema: Record<string, { type: string; description: string }>;
  execute: (input: unknown, context: ExecutionContext) => Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  output?: unknown;
  error?: ActionError;
  metadata?: {
    durationMs: number;
    retryCount: number;
    externalId?: string;
  };
}

export interface ActionError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

// ============================================================================
// CONDITIONS
// ============================================================================

export type ConditionOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith'
  | 'matches' | 'isNull' | 'isNotNull' | 'isEmpty' | 'isNotEmpty'
  | 'between' | 'olderThan' | 'newerThan';

export interface ConditionExpression {
  type: 'SIMPLE' | 'COMPOUND' | 'EXPRESSION';

  // For SIMPLE
  field?: string;
  operator?: ConditionOperator;
  value?: unknown;

  // For COMPOUND
  logic?: 'AND' | 'OR' | 'NOT';
  conditions?: ConditionExpression[];

  // For EXPRESSION
  expression?: string; // JavaScript-like expression
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ErrorHandler {
  type: 'RETRY' | 'FALLBACK' | 'COMPENSATE' | 'ESCALATE' | 'IGNORE' | 'FAIL';
  config?: ErrorHandlerConfig;
}

export interface ErrorHandlerConfig {
  // For RETRY
  retryPolicy?: RetryPolicy;

  // For FALLBACK
  fallbackStep?: StepId;
  fallbackValue?: unknown;

  // For COMPENSATE
  compensationSteps?: StepId[];

  // For ESCALATE
  escalateTo?: string[];
  escalationMessage?: string;

  // Error matching
  errorCodes?: string[];
  errorTypes?: string[];
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface CompensationConfig {
  strategy: 'FORWARD' | 'BACKWARD' | 'PARALLEL';
  steps: CompensationStep[];
}

export interface CompensationStep {
  stepId: StepId;
  actionType: ActionType;
  config: Record<string, unknown>;
  required: boolean;
}

// ============================================================================
// EXECUTION
// ============================================================================

export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'      // Waiting for approval, delay, or external event
  | 'COMPENSATING' // Running compensation
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export interface WorkflowExecution {
  id: ExecutionId;
  workflowId: WorkflowId;
  workflowVersionId: WorkflowVersionId;
  tenantId: TenantId;

  // Idempotency
  idempotencyKey?: IdempotencyKey;

  // Status
  status: ExecutionStatus;

  // Trigger info
  triggerType: TriggerType;
  triggerData: Record<string, unknown>;
  triggeredBy?: UserId;

  // Execution data
  context: ExecutionContext;
  currentStepId?: StepId;

  // Step tracking
  stepExecutions: StepExecution[];

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Error info
  error?: ExecutionError;

  // Parent execution (for sub-workflows)
  parentExecutionId?: ExecutionId;
  parentStepId?: StepId;

  // Correlation
  correlationId: string;
  traceId?: string;
  spanId?: string;
}

export interface ExecutionContext {
  // Input data
  input: Record<string, unknown>;

  // Step outputs
  outputs: Record<StepId, unknown>;

  // Variables set during execution
  variables: Record<string, unknown>;

  // System context
  system: {
    tenantId: TenantId;
    executionId: ExecutionId;
    workflowId: WorkflowId;
    timestamp: Date;
    environment: string;
  };

  // Trigger context
  trigger: Record<string, unknown>;

  // Entity context (if triggered by entity event)
  entity?: Record<string, unknown>;
  previousState?: Record<string, unknown>;

  // User context
  user?: {
    id: UserId;
    email?: string;
    roles?: string[];
  };
}

export interface StepExecution {
  stepId: StepId;
  stepName: string;
  stepType: StepType;

  status: ExecutionStatus;

  input?: unknown;
  output?: unknown;

  startedAt?: Date;
  completedAt?: Date;

  retryCount: number;
  error?: ExecutionError;

  // For approval steps
  approvals?: ApprovalRecord[];

  // For parallel steps
  branchResults?: Record<string, unknown>;

  // For loop steps
  iterationResults?: unknown[];
}

export interface ApprovalRecord {
  approverId: string;
  approverType: 'USER' | 'ROLE';
  decision: 'APPROVED' | 'REJECTED' | 'PENDING';
  comment?: string;
  decidedAt?: Date;
  formData?: Record<string, unknown>;
}

export interface ExecutionError {
  code: string;
  message: string;
  stepId?: StepId;
  details?: unknown;
  stack?: string;
  retryable: boolean;
  timestamp: Date;
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

export type AuditEventType =
  | 'WORKFLOW_CREATED'
  | 'WORKFLOW_UPDATED'
  | 'WORKFLOW_PUBLISHED'
  | 'WORKFLOW_DEPRECATED'
  | 'WORKFLOW_ARCHIVED'
  | 'WORKFLOW_DELETED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'EXECUTION_CANCELLED'
  | 'STEP_STARTED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'STEP_RETRIED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'COMPENSATION_STARTED'
  | 'COMPENSATION_COMPLETED'
  | 'SECRET_ACCESSED'
  | 'DATA_EXPORTED';

export interface AuditEvent {
  id: string;
  tenantId: TenantId;
  timestamp: Date;
  eventType: AuditEventType;

  // Actor
  actorType: 'USER' | 'SYSTEM' | 'WORKFLOW';
  actorId: string;

  // Resource
  resourceType: 'WORKFLOW' | 'EXECUTION' | 'STEP' | 'APPROVAL';
  resourceId: string;

  // Details
  details: Record<string, unknown>;

  // Compliance
  ipAddress?: string;
  userAgent?: string;

  // Data sensitivity
  containsPII: boolean;
  dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}

// ============================================================================
// METRICS
// ============================================================================

export interface WorkflowMetrics {
  workflowId: WorkflowId;
  tenantId: TenantId;
  period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  periodStart: Date;

  executions: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    timedOut: number;
  };

  duration: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p99: number;
  };

  steps: Record<StepId, {
    executions: number;
    failures: number;
    avgDuration: number;
    retries: number;
  }>;

  errors: Array<{
    code: string;
    count: number;
    lastOccurred: Date;
  }>;
}

// ============================================================================
// RATE LIMITING & QUOTAS
// ============================================================================

export interface TenantQuotas {
  tenantId: TenantId;

  // Execution limits
  maxConcurrentExecutions: number;
  maxExecutionsPerHour: number;
  maxExecutionsPerDay: number;

  // Workflow limits
  maxWorkflows: number;
  maxStepsPerWorkflow: number;
  maxVersionsPerWorkflow: number;

  // Resource limits
  maxExecutionDuration: number; // ms
  maxPayloadSize: number; // bytes
  maxWebhookTimeout: number; // ms

  // Feature flags
  features: {
    approvals: boolean;
    subworkflows: boolean;
    customActions: boolean;
    webhookTriggers: boolean;
    scheduledTriggers: boolean;
  };
}

export interface QuotaUsage {
  tenantId: TenantId;
  period: Date;

  concurrentExecutions: number;
  executionsThisHour: number;
  executionsToday: number;

  workflowCount: number;
  activeExecutions: number;
}
