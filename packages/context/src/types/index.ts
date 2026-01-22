/**
 * @prompt-id forge-v4.1:types:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type TenantId = string & { __brand: 'TenantId' };
export type WorkspaceId = string & { __brand: 'WorkspaceId' };
export type GraphId = string & { __brand: 'GraphId' };
export type NodeId = string & { __brand: 'NodeId' };
export type SliceId = string & { __brand: 'SliceId' };
export type SessionId = string & { __brand: 'SessionId' };
export type UserId = string & { __brand: 'UserId' };

// ============================================================================
// ENUMS
// ============================================================================

export enum ContextNodeType {
  DOCUMENT = 'DOCUMENT',
  DECISION = 'DECISION',
  PATTERN = 'PATTERN',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
}

export enum ContextLayer {
  ORGANIZATIONAL = 'ORGANIZATIONAL',
  WORKSPACE = 'WORKSPACE',
  SLICE = 'SLICE',
}

export enum Freshness {
  CURRENT = 'CURRENT',
  STALE = 'STALE',
  ARCHIVED = 'ARCHIVED',
}

export enum EdgeType {
  REFERENCES = 'REFERENCES',
  IMPLEMENTS = 'IMPLEMENTS',
  CONSTRAINS = 'CONSTRAINS',
  DEPENDS_ON = 'DEPENDS_ON',
  SUPERSEDES = 'SUPERSEDES',
}

export enum SliceStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum FeedbackRating {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  SKIPPED = 'SKIPPED',
}

export enum FeedbackErrorCategory {
  MISSING_CONTEXT = 'missing_context',
  WRONG_CONTEXT = 'wrong_context',
  IGNORED_CONSTRAINTS = 'ignored_constraints',
  HALLUCINATION = 'hallucination',
  STYLE_MISMATCH = 'style_mismatch',
  OTHER = 'other',
}

// ============================================================================
// CONTEXT GRAPH TYPES
// ============================================================================

export interface ContextGraph {
  id: GraphId;
  tenantId: TenantId;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextNode {
  id: NodeId;
  tenantId: TenantId;
  graphId: GraphId;
  type: ContextNodeType;
  layer: ContextLayer;
  name: string;
  content?: string;
  metadata: Record<string, unknown>;
  freshness: Freshness;
  validatedAt?: Date;
  externalUrl?: string;
  externalId?: string;
  externalSyncAt?: Date;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdById?: UserId;
}

export interface ContextEdge {
  id: string;
  tenantId: TenantId;
  graphId: GraphId;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  relationshipType: EdgeType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// SLICE TYPES
// ============================================================================

export interface Slice {
  id: SliceId;
  tenantId: TenantId;
  workspaceId: WorkspaceId;
  shortId: string;
  name: string;
  outcome: string;
  antiScope: string[];
  status: SliceStatus;
  ownerId: UserId;
  createdById: UserId;
  startedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  constraints?: SliceConstraint[];
  acceptanceCriteria?: AcceptanceCriterion[];
}

export interface SliceConstraint {
  id: string;
  sliceId: SliceId;
  content: string;
  orderIndex: number;
  createdAt: Date;
}

export interface AcceptanceCriterion {
  id: string;
  sliceId: SliceId;
  content: string;
  isCompleted: boolean;
  completedAt?: Date;
  orderIndex: number;
  createdAt: Date;
}

export interface SliceTransition {
  id: string;
  tenantId: TenantId;
  sliceId: SliceId;
  fromStatus?: SliceStatus;
  toStatus: SliceStatus;
  event: string;
  actorId: UserId;
  comment?: string;
  createdAt: Date;
}

// ============================================================================
// SLICE STATE MACHINE TYPES
// ============================================================================

export type SliceEvent =
  | 'start'
  | 'submit'
  | 'approve'
  | 'request_changes'
  | 'reopen'
  | 'archive'
  | 'cancel';

export interface SliceTransitionResult {
  slice: Slice;
  transition: SliceTransition;
}

// ============================================================================
// CONTEXT COMPILATION TYPES
// ============================================================================

export interface CompileContextOptions {
  workspaceId: WorkspaceId;
  sliceId?: SliceId;
  query?: string;
  tokenBudget: number;
}

export interface CompiledContextSection {
  layer: ContextLayer;
  content: string;
  tokenCount: number;
  documentIds: NodeId[];
}

export interface CompiledContext {
  compiledText: string;
  sections: CompiledContextSection[];
  totalTokens: number;
  budgetUtilization: number;
}

export interface RelevantDocument {
  node: ContextNode;
  similarity: number;
}

// ============================================================================
// AI SESSION TYPES
// ============================================================================

export interface AISession {
  id: SessionId;
  tenantId: TenantId;
  workspaceId: WorkspaceId;
  sliceId?: SliceId;
  userId: UserId;
  contextNodeIds: NodeId[];
  contextTokenCount: number;
  contextCompiledAt: Date;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface SessionFeedback {
  id: string;
  tenantId: TenantId;
  sessionId: SessionId;
  rating: FeedbackRating;
  errorCategories: FeedbackErrorCategory[];
  missingContext?: string;
  comment?: string;
  accuracyScore?: number;
  completenessScore?: number;
  styleMatchScore?: number;
  reviewVerdict?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  editDistance?: number;
  outputIssues: string[];
  submittedAt: Date;
  submittedById: UserId;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface FeedbackMetrics {
  totalSessions: number;
  positiveRatings: number;
  negativeRatings: number;
  skippedRatings: number;
  firstPassAcceptanceRate?: number;
  averageEditDistance?: number;
  avgAccuracyScore?: number;
  avgCompletenessScore?: number;
  avgStyleMatchScore?: number;
  errorCategoryCounts: Record<string, number>;
}

export interface WorkspaceAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: FeedbackMetrics;
  trends: Array<{
    date: Date;
    sessions: number;
    positiveRatings: number;
    negativeRatings: number;
  }>;
  topContext: Array<{
    nodeId: NodeId;
    name: string;
    usageCount: number;
    effectivenessScore: number;
  }>;
  commonErrors: Array<{
    category: FeedbackErrorCategory;
    count: number;
    percentage: number;
  }>;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateContextNodeRequest {
  graphId: GraphId;
  type: ContextNodeType;
  layer: ContextLayer;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  externalUrl?: string;
}

export interface UpdateContextNodeRequest {
  name?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  freshness?: Freshness;
}

export interface CreateSliceRequest {
  workspaceId: WorkspaceId;
  name: string;
  outcome: string;
  antiScope?: string[];
  constraints?: string[];
  acceptanceCriteria?: string[];
}

export interface UpdateSliceRequest {
  name?: string;
  outcome?: string;
  antiScope?: string[];
}

export interface SubmitFeedbackRequest {
  sessionId: SessionId;
  rating: FeedbackRating;
  errorCategories?: FeedbackErrorCategory[];
  missingContext?: string;
  comment?: string;
  qualityScores?: {
    accuracy?: number;
    completeness?: number;
    styleMatch?: number;
  };
}

export interface SearchContextOptions {
  graphId: GraphId;
  query: string;
  limit?: number;
  filters?: {
    types?: ContextNodeType[];
    layers?: ContextLayer[];
    freshness?: Freshness[];
  };
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
