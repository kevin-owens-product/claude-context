/**
 * @prompt-id forge-v4.1:errors:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

export class ContextError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

// ============================================================================
// CONTEXT GRAPH ERRORS
// ============================================================================

export class GraphNotFoundError extends ContextError {
  constructor(graphId: string) {
    super('GRAPH_NOT_FOUND', `Context graph not found: ${graphId}`, { graphId });
    this.name = 'GraphNotFoundError';
  }
}

export class NodeNotFoundError extends ContextError {
  constructor(nodeId: string) {
    super('NODE_NOT_FOUND', `Context node not found: ${nodeId}`, { nodeId });
    this.name = 'NodeNotFoundError';
  }
}

export class DuplicateNodeError extends ContextError {
  constructor(name: string, graphId: string) {
    super('DUPLICATE_NODE', `Node with name "${name}" already exists in graph`, {
      name,
      graphId,
    });
    this.name = 'DuplicateNodeError';
  }
}

export class InvalidNodeTypeError extends ContextError {
  constructor(type: string) {
    super('INVALID_NODE_TYPE', `Invalid context node type: ${type}`, { type });
    this.name = 'InvalidNodeTypeError';
  }
}

// ============================================================================
// SLICE ERRORS
// ============================================================================

export class SliceNotFoundError extends ContextError {
  constructor(sliceId: string) {
    super('SLICE_NOT_FOUND', `Slice not found: ${sliceId}`, { sliceId });
    this.name = 'SliceNotFoundError';
  }
}

export class InvalidSliceTransitionError extends ContextError {
  constructor(
    currentStatus: string,
    event: string,
    allowedEvents: string[]
  ) {
    super(
      'INVALID_SLICE_TRANSITION',
      `Cannot transition from "${currentStatus}" with event "${event}". Allowed: ${allowedEvents.join(', ')}`,
      { currentStatus, event, allowedEvents }
    );
    this.name = 'InvalidSliceTransitionError';
  }
}

export class SliceTransitionGuardError extends ContextError {
  constructor(guard: string, reason: string) {
    super(
      'SLICE_TRANSITION_GUARD_FAILED',
      `Transition guard "${guard}" failed: ${reason}`,
      { guard, reason }
    );
    this.name = 'SliceTransitionGuardError';
  }
}

export class AcceptanceCriteriaIncompleteError extends ContextError {
  constructor(sliceId: string, incomplete: number, total: number) {
    super(
      'ACCEPTANCE_CRITERIA_INCOMPLETE',
      `Cannot submit slice: ${incomplete} of ${total} acceptance criteria are incomplete`,
      { sliceId, incomplete, total }
    );
    this.name = 'AcceptanceCriteriaIncompleteError';
  }
}

export class SelfApprovalNotAllowedError extends ContextError {
  constructor(sliceId: string) {
    super(
      'SELF_APPROVAL_NOT_ALLOWED',
      'Slice owner cannot approve their own slice',
      { sliceId }
    );
    this.name = 'SelfApprovalNotAllowedError';
  }
}

export class SliceReopenWindowExpiredError extends ContextError {
  constructor(sliceId: string, completedAt: Date) {
    super(
      'SLICE_REOPEN_WINDOW_EXPIRED',
      'Cannot reopen slice: 7-day reopen window has expired',
      { sliceId, completedAt: completedAt.toISOString() }
    );
    this.name = 'SliceReopenWindowExpiredError';
  }
}

// ============================================================================
// COMPILATION ERRORS
// ============================================================================

export class TokenBudgetExceededError extends ContextError {
  constructor(required: number, budget: number) {
    super(
      'TOKEN_BUDGET_EXCEEDED',
      `Required tokens (${required}) exceed budget (${budget})`,
      { required, budget }
    );
    this.name = 'TokenBudgetExceededError';
  }
}

export class NoContextAvailableError extends ContextError {
  constructor(workspaceId: string) {
    super(
      'NO_CONTEXT_AVAILABLE',
      `No context documents available for workspace: ${workspaceId}`,
      { workspaceId }
    );
    this.name = 'NoContextAvailableError';
  }
}

// ============================================================================
// SESSION ERRORS
// ============================================================================

export class SessionNotFoundError extends ContextError {
  constructor(sessionId: string) {
    super('SESSION_NOT_FOUND', `AI session not found: ${sessionId}`, { sessionId });
    this.name = 'SessionNotFoundError';
  }
}

export class FeedbackAlreadySubmittedError extends ContextError {
  constructor(sessionId: string) {
    super(
      'FEEDBACK_ALREADY_SUBMITTED',
      `Feedback already submitted for session: ${sessionId}`,
      { sessionId }
    );
    this.name = 'FeedbackAlreadySubmittedError';
  }
}

// ============================================================================
// INTEGRATION ERRORS
// ============================================================================

export class IntegrationNotFoundError extends ContextError {
  constructor(integrationId: string) {
    super('INTEGRATION_NOT_FOUND', `Integration not found: ${integrationId}`, {
      integrationId,
    });
    this.name = 'IntegrationNotFoundError';
  }
}

export class IntegrationSyncError extends ContextError {
  constructor(provider: string, reason: string) {
    super('INTEGRATION_SYNC_ERROR', `Sync failed for ${provider}: ${reason}`, {
      provider,
      reason,
    });
    this.name = 'IntegrationSyncError';
  }
}

// ============================================================================
// AUTHORIZATION ERRORS
// ============================================================================

export class UnauthorizedError extends ContextError {
  constructor(action: string, resource: string) {
    super(
      'UNAUTHORIZED',
      `Not authorized to ${action} on ${resource}`,
      { action, resource }
    );
    this.name = 'UnauthorizedError';
  }
}

export class TenantMismatchError extends ContextError {
  constructor() {
    super(
      'TENANT_MISMATCH',
      'Resource does not belong to the current tenant'
    );
    this.name = 'TenantMismatchError';
  }
}
