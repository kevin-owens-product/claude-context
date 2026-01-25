/**
 * @forge/context
 *
 * Context management package for Claude Context platform.
 * Living Software Platform - Intent as Source of Truth
 *
 * @prompt-id forge-v4.1:package:context:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

// Types
export * from './types';
export * from './types/living-software.types';
export * from './types/codebase.types';

// Errors
export * from './errors';

// Core Services
export { ContextService } from './services/context.service';
export { SliceService } from './services/slice.service';
export { FeedbackService } from './services/feedback.service';

// Living Software Platform Services
export { IdentityService } from './services/identity.service';
export { ProjectService } from './services/project.service';
export { EmbeddingService } from './services/embedding.service';
export { IntentGraphService } from './services/intent-graph.service';
export { ArtifactService } from './services/artifact.service';
export { AssemblyService } from './services/assembly.service';

// Living Software Services
export { IntentService } from './services/intent.service';
export { SignalService } from './services/signal.service';
export { CapabilityService } from './services/capability.service';
export { ExperimentService } from './services/experiment.service';

// Business Outcomes Services
export { CustomerService } from './services/customer.service';
export { CustomerFeedbackService } from './services/customer-feedback.service';
export { FeatureRequestService } from './services/feature-request.service';
export { DealService } from './services/deal.service';
export { OutcomesService } from './services/outcomes.service';
export { UseCaseService } from './services/use-case.service';
export { ReleaseService } from './services/release.service';
export { RevenueAttributionService } from './services/revenue-attribution.service';

// Workflow Automation Services
export { WorkflowService } from './services/workflow.service';
export { WorkflowTemplatesService, workflowTemplates } from './services/workflow-templates.service';
export {
  WebhookExecutorService,
  NotificationExecutorService,
} from './services/webhook-executor.service';
export type {
  WorkflowTemplate,
  TemplateVariable,
} from './services/workflow-templates.service';
export type {
  WebhookConfig,
  WebhookResult,
  RetryConfig,
  NotificationConfig,
  NotificationResult,
} from './services/webhook-executor.service';

// Business Outcomes Types (re-exported for convenience)
export type {
  CustomerId,
  CustomerType,
  CustomerTier,
  ContactRole,
  SubscriptionStatus,
  BillingCycle,
  EngagementType,
  Customer,
  CustomerContact,
  CustomerSubscription,
  CustomerEngagement,
  CustomerHealthInput,
} from './services/customer.service';

export type {
  FeedbackId,
  FeedbackType,
  FeedbackChannel,
  FeedbackStatus,
  SentimentLabel,
  CustomerFeedback,
  NPSMetrics,
  SentimentMetrics,
} from './services/customer-feedback.service';

export type {
  FeatureRequestId,
  FeatureRequestStatus,
  FeatureRequestPriority,
  FeatureRequest,
  FeatureVote,
  FeatureImpactAnalysis,
} from './services/feature-request.service';

export type {
  DealId,
  DealStage,
  ActivityType,
  Deal,
  DealBlocker,
  DealActivity,
  PipelineMetrics,
} from './services/deal.service';

export type {
  ObjectiveId,
  KeyResultId,
  CustomerOutcomeId,
  ObjectiveType,
  ObjectiveLevel,
  ObjectiveStatus,
  MetricType,
  MetricDirection,
  KeyResultStatus,
  ContributionStatus,
  OutcomeCategory,
  OutcomeStatus,
  BusinessObjective,
  KeyResult,
  SliceObjective,
  CustomerOutcome,
} from './services/outcomes.service';

export type {
  UseCaseId,
  UseCaseStatus,
  ImplementationStatus,
  UseCase,
  UseCaseArtifact,
  UseCaseImplementation,
} from './services/use-case.service';

export type {
  ReleaseId,
  ReleaseType,
  ReleaseStatus,
  ReleaseItemType,
  AnnouncementChannel,
  AnnouncementStatus,
  Release,
  ReleaseItem,
  ReleaseAnnouncement,
  ReleaseMetrics,
} from './services/release.service';

export type {
  RevenueEventId,
  RevenueEvent,
  RevenueMetrics,
  SliceROI,
  FeatureROI,
} from './services/revenue-attribution.service';

// Living Software Types
export type {
  IntentId,
  IntentPriority,
  IntentStatus,
  IntentEvidence,
  IntentSuccessCriterion,
  BusinessValue,
  Intent,
  IntentHierarchy,
  CreateIntentInput,
  UpdateIntentInput,
  IntentFilter,
} from './services/intent.service';

export type {
  SignalId,
  SignalType,
  SignalTrend,
  SignalHealth,
  AggregationType,
  SignalSource,
  AnomalyDetails,
  Signal,
  SignalMeasurement,
  SignalTimeSeries,
  CreateSignalInput,
  UpdateSignalInput,
  RecordMeasurementInput,
  SignalFilter,
} from './services/signal.service';

export type {
  CapabilityId,
  CapabilityStatus,
  MaturityLevel,
  CapabilityGap,
  ValueDelivered,
  Capability,
  CapabilityUsageEvent,
  CreateCapabilityInput,
  UpdateCapabilityInput,
  CapabilityFilter,
} from './services/capability.service';

export type {
  ExperimentId,
  ExperimentType,
  ExperimentStatus,
  ExperimentVerdict,
  TargetMetric,
  SuccessCriterion,
  Guardrail,
  TargetAudience,
  MetricSnapshot,
  Experiment,
  ExperimentResults,
  CreateExperimentInput,
  UpdateExperimentInput,
  ExperimentFilter,
} from './services/experiment.service';

// Workflow Automation Types
export type {
  WorkflowId,
  WorkflowExecutionId,
  WorkflowTriggerType,
  WorkflowExecutionStatus,
  ConditionOperator,
  RuleOperator,
  ActionType,
  ConditionRule,
  WorkflowConditions,
  EventTriggerConfig,
  SignalTriggerConfig,
  ScheduleTriggerConfig,
  ManualTriggerConfig,
  TriggerConfig,
  WorkflowAction,
  ActionResult,
  Workflow,
  WorkflowExecution,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowFilter,
  TriggerContext,
} from './services/workflow.service';

// Enterprise Workflow Engine
export {
  WorkflowEngine,
  WorkflowExecutor,
  WorkflowScheduler,
  ActionRegistry,
  ConditionEvaluator,
  CircuitBreaker,
  WorkflowAuditLog,
  WorkflowMetrics,
} from './services/workflow-engine';

// Enterprise Workflow Engine Types
export type {
  // Core workflow types
  WorkflowId as EnterpriseWorkflowId,
  WorkflowVersionId,
  ExecutionId,
  StepId,
  IdempotencyKey,
  WorkflowDefinition,
  WorkflowStatus,

  // Step types
  StepType,
  WorkflowStep,
  ActionStep,
  ConditionStep,
  ParallelStep,
  LoopStep,
  DelayStep,
  ApprovalStep,
  SubworkflowStep,
  TransformStep,
  AggregateStep,

  // Execution types
  WorkflowExecution as EnterpriseWorkflowExecution,
  ExecutionStatus,
  StepExecution,
  ExecutionContext,
  ExecutionError,

  // Trigger types
  TriggerType,
  WorkflowTrigger,
  EventTrigger,
  SignalTrigger,
  ScheduleTrigger,
  WebhookTrigger,
  ManualTrigger,
  ApiTrigger,

  // Condition types
  ConditionExpression,
  ConditionOperator as EnterpriseConditionOperator,

  // Error handling types
  ErrorHandler,
  RetryPolicy,
  CompensationConfig,

  // Audit types
  AuditEvent,
  AuditEventType,

  // Metrics types
  WorkflowMetrics as WorkflowMetricsType,

  // Action types
  ActionType as EnterpriseActionType,
  ActionDefinition,
  ActionResult as EnterpriseActionResult,
  ActionError,

  // Quota types
  TenantQuotas,
  QuotaUsage,
} from './services/workflow-engine';

// Codebase Observation Engine
export { RepositoryService } from './services/repository.service';
export { GitSyncService, type GitAuthConfig, type GitRepoInfo, type GitFileTree } from './services/git-sync.service';
export { ImportAnalyzerService, type FileResolver, type LanguageParser } from './services/import-analyzer.service';
export { FileTrackerService, type FileTrackingResult, type TrackedFile, type FileStats } from './services/file-tracker.service';

// Symbol Analysis Engine
export {
  SymbolAnalyzerService,
  type ExtractedSymbol,
  type ExtractedReference,
  type SymbolAnalysisResult,
} from './services/symbol-analyzer.service';

export {
  CallGraphService,
  type CallGraphOptions,
  type CallGraphEdge,
  type SymbolNode,
} from './services/call-graph.service';

// Capability Mapping (Phase 3)
export { CapabilityMapperService } from './services/capability-mapper.service';

// Background Job Processing
export {
  RepoSyncJobService,
  createRepoSyncJobService,
  REPO_SYNC_QUEUE,
  JOB_NAMES,
  type RepoSyncJobData,
  type RepoSyncJobResult,
  type RepoSyncQueueConfig,
} from './services/repo-sync-job.service';

// Utilities
export { countTokens, truncateToTokenBudget, chunkText } from './utils/tokens';
