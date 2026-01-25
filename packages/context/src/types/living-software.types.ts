/**
 * Living Software Platform Types
 * @prompt-id forge-v4.1:types:living-software:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { TenantId, UserId, WorkspaceId } from './index';

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type ContextId = string & { __brand: 'ContextId' };
export type ProjectId = string & { __brand: 'ProjectId' };
export type IntentGraphId = string & { __brand: 'IntentGraphId' };
export type ArtifactId = string & { __brand: 'ArtifactId' };

// ============================================================================
// IDENTITY TYPES
// ============================================================================

export interface UserContext {
  id: ContextId;
  tenantId: TenantId;
  userId: UserId;
  settings: ContextSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextSettings {
  memoryEnabled: boolean;
  observationLevel: 0 | 1 | 2 | 3 | 4;
  retentionDays?: number;
  excludedTopics: string[];
}

export interface IdentityAttribute {
  id: string;
  contextId: ContextId;
  key: string;
  value: unknown;
  valueType: 'string' | 'number' | 'array' | 'object' | 'boolean';
  confidence: number;
  source: 'explicit' | 'inferred' | 'corrected';
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityGraph {
  contextId: ContextId;
  userId: UserId;
  tenantId: TenantId;
  attributes: (IdentityAttribute & { category?: string })[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum GoalPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum GoalStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  ABANDONED = 'ABANDONED',
}

export enum ConstraintCategory {
  FUNCTIONAL = 'FUNCTIONAL',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  SCALABILITY = 'SCALABILITY',
  COMPLIANCE = 'COMPLIANCE',
  COMPATIBILITY = 'COMPATIBILITY',
  USABILITY = 'USABILITY',
  BUSINESS = 'BUSINESS',
  TECHNICAL = 'TECHNICAL',
}

export enum ConstraintSeverity {
  MUST = 'MUST',
  SHOULD = 'SHOULD',
  COULD = 'COULD',
}

export interface Project {
  id: ProjectId;
  tenantId: TenantId;
  contextId: ContextId;
  workspaceId?: WorkspaceId;
  name: string;
  description?: string;
  status: ProjectStatus;
  confidence: number;
  userConfirmed: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  goals?: ProjectGoal[];
  constraints?: ProjectConstraint[];
  decisions?: ProjectDecision[];
}

export interface ProjectGoal {
  id: string;
  projectId: ProjectId;
  description: string;
  successCriteria: string[];
  priority: GoalPriority;
  status: GoalStatus;
  parentGoalId?: string;
  confidence: number;
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
  subGoals?: ProjectGoal[];
}

export interface ProjectConstraint {
  id: string;
  projectId: ProjectId;
  description: string;
  category: ConstraintCategory;
  severity: ConstraintSeverity;
  verificationMethod?: string;
  confidence: number;
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDecision {
  id: string;
  projectId: ProjectId;
  description: string;
  rationale?: string;
  alternativesConsidered: string[];
  madeAt: Date;
  reversedAt?: Date;
  sourceRef?: string;
  createdAt: Date;
}

// ============================================================================
// INTERACTION MEMORY TYPES
// ============================================================================

export enum PatternType {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  WORKFLOW = 'WORKFLOW',
  TOPIC = 'TOPIC',
}

export interface InteractionPattern {
  id: string;
  contextId: ContextId;
  description: string;
  patternType: PatternType;
  frequency: number;
  lastOccurred: Date;
  examples: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractionCorrection {
  id: string;
  contextId: ContextId;
  originalOutput: string;
  correctedTo: string;
  category?: string;
  interactionRef?: string;
  createdAt: Date;
}

export interface InteractionMemory {
  patterns: InteractionPattern[];
  corrections: InteractionCorrection[];
}

// ============================================================================
// INTENT GRAPH TYPES
// ============================================================================

export enum IntentGraphStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum ContextCategory {
  BUSINESS = 'BUSINESS',
  TECHNICAL = 'TECHNICAL',
  HISTORICAL = 'HISTORICAL',
  USER_RESEARCH = 'USER_RESEARCH',
  COMPETITIVE = 'COMPETITIVE',
  REGULATORY = 'REGULATORY',
}

export interface IntentGraph {
  id: IntentGraphId;
  tenantId: TenantId;
  projectId: ProjectId;
  name: string;
  description?: string;
  version: number;
  status: IntentGraphStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdById?: UserId;
  goals?: IntentGoal[];
  constraints?: IntentConstraint[];
  entities?: IntentEntity[];
  behaviors?: IntentBehavior[];
  contexts?: IntentContext[];
}

export interface IntentGoal {
  id: string;
  intentGraphId: IntentGraphId;
  description: string;
  successCriteria: string[];
  priority: GoalPriority;
  status: GoalStatus;
  parentGoalId?: string;
  linkedConstraintIds: string[];
  linkedBehaviorIds: string[];
  rationale?: string;
  confidence: number;
  userConfirmed: boolean;
  sourceOrigin: 'conversation' | 'import' | 'manual' | 'inference' | 'synthesis';
  createdAt: Date;
  updatedAt: Date;
  subGoals?: IntentGoal[];
}

export interface IntentConstraint {
  id: string;
  intentGraphId: IntentGraphId;
  description: string;
  category: ConstraintCategory;
  severity: ConstraintSeverity;
  verificationMethod?: string;
  linkedGoalIds: string[];
  linkedEntityIds: string[];
  linkedBehaviorIds: string[];
  conflictsWith: string[];
  confidence: number;
  userConfirmed: boolean;
  sourceOrigin: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntentEntity {
  id: string;
  intentGraphId: IntentGraphId;
  name: string;
  description?: string;
  attributes: EntityAttribute[];
  relationships: EntityRelationship[];
  stateMachine?: StateMachine;
  validationRules: ValidationRule[];
  linkedBehaviorIds: string[];
  confidence: number;
  userConfirmed: boolean;
  sourceOrigin: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityAttribute {
  name: string;
  dataType: DataType;
  required: boolean;
  unique: boolean;
  defaultValue?: unknown;
  constraints: string[];
  description?: string;
}

export interface DataType {
  primitive?: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'json';
  array?: DataType;
  enum?: string[];
  reference?: string;
}

export interface EntityRelationship {
  name: string;
  targetEntityId: string;
  type: 'has_one' | 'has_many' | 'belongs_to' | 'many_to_many';
  inverse?: string;
  cascade: 'none' | 'delete' | 'nullify';
  constraints: string[];
}

export interface StateMachine {
  states: State[];
  initialState: string;
  transitions: StateTransition[];
}

export interface State {
  name: string;
  description?: string;
  isFinal: boolean;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  guard?: string;
  action?: string;
}

export interface ValidationRule {
  expression: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface IntentBehavior {
  id: string;
  intentGraphId: IntentGraphId;
  name: string;
  description?: string;
  trigger: BehaviorTrigger;
  preconditions: string[];
  steps: BehaviorStep[];
  postconditions: string[];
  errorHandlers: ErrorHandler[];
  linkedGoalIds: string[];
  linkedEntityIds: string[];
  linkedConstraintIds: string[];
  confidence: number;
  userConfirmed: boolean;
  sourceOrigin: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BehaviorTrigger {
  type: 'user_action' | 'system_event' | 'time_based' | 'condition' | 'api_call';
  description: string;
  parameters: TriggerParameter[];
}

export interface TriggerParameter {
  name: string;
  dataType: DataType;
  required: boolean;
  description?: string;
}

export interface BehaviorStep {
  order: number;
  description: string;
  actor: 'user' | 'system' | 'external';
  entityId?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'validate' | 'transform' | 'notify' | 'custom';
  condition?: string;
  alternativePaths?: AlternativePath[];
}

export interface AlternativePath {
  condition: string;
  steps: BehaviorStep[];
}

export interface ErrorHandler {
  errorType: string;
  condition?: string;
  handling: 'retry' | 'fallback' | 'abort' | 'ignore' | 'custom';
  customAction?: string;
  userMessage?: string;
}

export interface IntentContext {
  id: string;
  intentGraphId: IntentGraphId;
  category: ContextCategory;
  description: string;
  implications: string[];
  linkedNodeIds: string[];
  confidence: number;
  userConfirmed: boolean;
  sourceOrigin: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ARTIFACT TYPES
// ============================================================================

export enum ArtifactType {
  CODE = 'CODE',
  COMPONENT = 'COMPONENT',
  API_SCHEMA = 'API_SCHEMA',
  TEST = 'TEST',
  DOCUMENTATION = 'DOCUMENTATION',
  CONFIGURATION = 'CONFIGURATION',
  DATA_MODEL = 'DATA_MODEL',
}

export enum ArtifactStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum ArtifactLinkType {
  IMPLEMENTS = 'IMPLEMENTS',
  SATISFIES = 'SATISFIES',
  REFERENCES = 'REFERENCES',
  TESTS = 'TESTS',
}

export interface Artifact {
  id: ArtifactId;
  tenantId: TenantId;
  projectId: ProjectId;
  intentGraphId?: IntentGraphId;
  name: string;
  description?: string;
  type: ArtifactType;
  status: ArtifactStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdById?: UserId;
  versions?: ArtifactVersion[];
  links?: ArtifactLink[];
}

export interface ArtifactVersion {
  id: string;
  artifactId: ArtifactId;
  version: number;
  content: string;
  contentHash: string;
  synthesizedFrom: string[];
  changelog?: string;
  createdAt: Date;
  createdById?: UserId;
}

export interface ArtifactLink {
  id: string;
  artifactId: ArtifactId;
  intentNodeId: string;
  intentNodeType: 'goal' | 'constraint' | 'entity' | 'behavior';
  linkType: ArtifactLinkType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ArtifactOutcome {
  id: string;
  contextId: ContextId;
  artifactId: ArtifactId;
  feedbackSignals: FeedbackSignal[];
  usageMetrics?: UsageMetrics;
  finalStatus?: 'active' | 'abandoned' | 'superseded';
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackSignal {
  type: 'rating' | 'comment' | 'implicit';
  value: unknown;
  timestamp: Date;
  source: string;
}

export interface UsageMetrics {
  views: number;
  edits: number;
  copies: number;
  lastUsedAt: Date;
}

// ============================================================================
// CONTEXT ASSEMBLY TYPES
// ============================================================================

export interface AssembleContextOptions {
  userId: UserId;
  query: string;
  projectId?: ProjectId;
  maxTokens?: number;
}

export interface AssembledContext {
  contextXml: string;
  sources: ContextSource[];
  relevanceScores: Record<string, number>;
  tokenCount: number;
}

export interface ContextSource {
  id: string;
  type: 'identity' | 'project' | 'goal' | 'constraint' | 'decision' | 'pattern' | 'artifact';
  name: string;
  confidence: number;
  relevance: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateIdentityAttributeRequest {
  key: string;
  value: unknown;
  valueType?: 'string' | 'number' | 'array' | 'object' | 'boolean';
  source?: 'explicit' | 'inferred' | 'corrected';
  confidence?: number;
}

export interface UpdateIdentityAttributeRequest {
  value?: unknown;
  confidence?: number;
  source?: 'explicit' | 'inferred' | 'corrected';
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  workspaceId?: WorkspaceId;
  goals?: CreateGoalRequest[];
  constraints?: CreateConstraintRequest[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateGoalRequest {
  description: string;
  successCriteria?: string[];
  priority?: GoalPriority;
  parentGoalId?: string;
}

export interface CreateConstraintRequest {
  description: string;
  category: ConstraintCategory;
  severity?: ConstraintSeverity;
  verificationMethod?: string;
}

export interface CreateDecisionRequest {
  description: string;
  rationale?: string;
  alternativesConsidered?: string[];
}

export interface CreateIntentGraphRequest {
  projectId: ProjectId;
  name: string;
  description?: string;
}

export interface CreateArtifactRequest {
  projectId: ProjectId;
  intentGraphId?: IntentGraphId;
  name: string;
  description?: string;
  type: ArtifactType;
  content: string;
}

export interface SynthesizeArtifactRequest {
  intentGraphId: IntentGraphId;
  targetType: ArtifactType;
  targetLanguage?: string;
  customInstructions?: string;
}
