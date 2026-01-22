/**
 * @prompt-id forge-v4.1:web:types:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ContextLayer {
  ORGANIZATIONAL = 'ORGANIZATIONAL',
  WORKSPACE = 'WORKSPACE',
  SLICE = 'SLICE',
}

export enum ContextNodeType {
  DOCUMENT = 'DOCUMENT',
  GUIDELINE = 'GUIDELINE',
  PATTERN = 'PATTERN',
  EXAMPLE = 'EXAMPLE',
  TEMPLATE = 'TEMPLATE',
  API_SPEC = 'API_SPEC',
  SNIPPET = 'SNIPPET',
}

export enum Freshness {
  CURRENT = 'CURRENT',
  STALE = 'STALE',
  ARCHIVED = 'ARCHIVED',
}

export enum SliceStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum SliceEvent {
  START = 'start',
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REQUEST_CHANGES = 'request_changes',
  CANCEL = 'cancel',
  REOPEN = 'reopen',
  ARCHIVE = 'archive',
}

export enum FeedbackRating {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  SKIPPED = 'SKIPPED',
}

export enum FeedbackErrorCategory {
  HALLUCINATION = 'HALLUCINATION',
  OUTDATED_INFO = 'OUTDATED_INFO',
  MISSING_CONTEXT = 'MISSING_CONTEXT',
  WRONG_STYLE = 'WRONG_STYLE',
  INCOMPLETE = 'INCOMPLETE',
  OTHER = 'OTHER',
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface ContextGraph {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContextNode {
  id: string;
  graphId: string;
  type: ContextNodeType;
  layer: ContextLayer;
  name: string;
  content?: string;
  metadata: Record<string, unknown>;
  externalUrl?: string;
  tokenCount: number;
  freshness: Freshness;
  createdAt: string;
  updatedAt: string;
}

export interface CompiledContext {
  compiledText: string;
  sections: CompiledContextSection[];
  totalTokens: number;
  budgetUtilization: number;
}

export interface CompiledContextSection {
  layer: ContextLayer;
  content: string;
  tokenCount: number;
  documentIds: string[];
}

// ============================================================================
// SLICE TYPES
// ============================================================================

export interface Slice {
  id: string;
  workspaceId: string;
  shortId: string;
  name: string;
  outcome: string;
  antiScope: string[];
  status: SliceStatus;
  ownerId: string;
  constraints: SliceConstraint[];
  acceptanceCriteria: AcceptanceCriterion[];
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SliceConstraint {
  id: string;
  content: string;
  orderIndex: number;
}

export interface AcceptanceCriterion {
  id: string;
  content: string;
  isCompleted: boolean;
  completedAt?: string;
  orderIndex: number;
}

export interface SliceTransition {
  id: string;
  sliceId: string;
  fromStatus?: SliceStatus;
  toStatus: SliceStatus;
  event: string;
  actorId: string;
  comment?: string;
  createdAt: string;
}

// ============================================================================
// FEEDBACK TYPES
// ============================================================================

export interface AISession {
  id: string;
  workspaceId: string;
  sliceId?: string;
  contextNodeIds: string[];
  contextTokenCount: number;
  contextCompiledAt: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface SessionFeedback {
  id: string;
  sessionId: string;
  rating: FeedbackRating;
  errorCategories: string[];
  missingContext?: string;
  comment?: string;
  accuracyScore?: number;
  completenessScore?: number;
  styleMatchScore?: number;
  createdAt: string;
}

export interface WorkspaceAnalytics {
  period: { startDate: string; endDate: string };
  summary: FeedbackMetrics;
  trends: TrendDataPoint[];
  topContext: TopContextDocument[];
  commonErrors: CommonError[];
}

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

export interface TrendDataPoint {
  date: string;
  sessions: number;
  positiveRatings: number;
  negativeRatings: number;
}

export interface TopContextDocument {
  nodeId: string;
  name: string;
  usageCount: number;
  effectivenessScore: number;
}

export interface CommonError {
  category: FeedbackErrorCategory;
  count: number;
  percentage: number;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  node: ContextNode;
  similarity: number;
}
