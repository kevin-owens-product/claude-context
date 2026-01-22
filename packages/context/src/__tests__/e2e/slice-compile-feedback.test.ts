/**
 * @prompt-id forge-v4.1:test:e2e:slice-compile-feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextService } from '../../services/context.service';
import { SliceService } from '../../services/slice.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  type TenantId,
  type UserId,
  type WorkspaceId,
  type GraphId,
  type NodeId,
  type SliceId,
  type SessionId,
  ContextLayer,
  SliceStatus,
  FeedbackRating,
  FeedbackErrorCategory,
} from '../../types';

/**
 * End-to-End test for the complete user journey:
 *
 * 1. Create a work slice with outcome and acceptance criteria
 * 2. Start work on the slice (PENDING -> ACTIVE)
 * 3. Compile context for AI consumption
 * 4. Simulate AI session and submit feedback
 * 5. Complete acceptance criteria
 * 6. Submit slice for review (ACTIVE -> IN_REVIEW)
 * 7. Approve the slice (IN_REVIEW -> COMPLETED)
 * 8. Verify analytics reflect the session
 */

// Mock database storage
const mockData = {
  graphs: new Map<string, any>(),
  nodes: new Map<string, any>(),
  slices: new Map<string, any>(),
  sliceTransitions: new Map<string, any>(),
  acceptanceCriteria: new Map<string, any>(),
  sessions: new Map<string, any>(),
  feedback: new Map<string, any>(),
};

// Mock Prisma
const mockPrisma = {
  contextGraph: {
    findFirst: vi.fn().mockImplementation(({ where }) => {
      for (const g of mockData.graphs.values()) {
        if (
          (where.id === undefined || g.id === where.id) &&
          g.tenantId === where.tenantId &&
          (where.isDefault === undefined || g.isDefault === where.isDefault) &&
          (where.workspaceId === undefined || g.workspaceId === where.workspaceId)
        ) {
          return g;
        }
      }
      return null;
    }),
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `graph-${mockData.graphs.size + 1}`;
      const graph = { id, ...data };
      mockData.graphs.set(id, graph);
      return graph;
    }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  },
  contextNode: {
    findFirst: vi.fn().mockImplementation(({ where }) => {
      for (const n of mockData.nodes.values()) {
        if (n.id === where.id && n.tenantId === where.tenantId) {
          return n;
        }
      }
      return null;
    }),
    findMany: vi.fn().mockImplementation(({ where }) => {
      const results: any[] = [];
      for (const n of mockData.nodes.values()) {
        if (n.graphId === where.graphId && n.tenantId === where.tenantId) {
          if (where.layer && n.layer !== where.layer) continue;
          if (where.freshness?.not && n.freshness === where.freshness.not) continue;
          results.push(n);
        }
      }
      return results;
    }),
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `node-${mockData.nodes.size + 1}`;
      const node = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      mockData.nodes.set(id, node);
      return node;
    }),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  slice: {
    findFirst: vi.fn().mockImplementation(({ where, include }) => {
      for (const s of mockData.slices.values()) {
        if (s.id === where.id && s.tenantId === where.tenantId) {
          if (include?.constraints || include?.acceptanceCriteria) {
            return {
              ...s,
              constraints: Array.from(mockData.acceptanceCriteria.values())
                .filter((c: any) => c.sliceId === s.id && c.type === 'constraint'),
              acceptanceCriteria: Array.from(mockData.acceptanceCriteria.values())
                .filter((c: any) => c.sliceId === s.id && c.type === 'criterion'),
            };
          }
          return s;
        }
      }
      return null;
    }),
    create: vi.fn().mockImplementation(({ data, include }) => {
      const id = `slice-${mockData.slices.size + 1}`;
      const slice = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        constraints: [],
        acceptanceCriteria: [],
      };

      // Create acceptance criteria
      if (data.acceptanceCriteria?.create) {
        for (const criterion of data.acceptanceCriteria.create) {
          const criterionId = `criterion-${mockData.acceptanceCriteria.size + 1}`;
          mockData.acceptanceCriteria.set(criterionId, {
            id: criterionId,
            sliceId: id,
            type: 'criterion',
            ...criterion,
          });
          slice.acceptanceCriteria.push({
            id: criterionId,
            ...criterion,
          });
        }
      }

      mockData.slices.set(id, slice);
      return slice;
    }),
    update: vi.fn().mockImplementation(({ where, data, include }) => {
      const slice = mockData.slices.get(where.id);
      if (slice) {
        Object.assign(slice, data);
        slice.updatedAt = new Date();

        if (include?.constraints || include?.acceptanceCriteria) {
          return {
            ...slice,
            constraints: Array.from(mockData.acceptanceCriteria.values())
              .filter((c: any) => c.sliceId === slice.id && c.type === 'constraint'),
            acceptanceCriteria: Array.from(mockData.acceptanceCriteria.values())
              .filter((c: any) => c.sliceId === slice.id && c.type === 'criterion'),
          };
        }
        return slice;
      }
      return null;
    }),
    count: vi.fn().mockResolvedValue(0),
  },
  sliceTransition: {
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `transition-${mockData.sliceTransitions.size + 1}`;
      const transition = { id, ...data, createdAt: new Date() };
      mockData.sliceTransitions.set(id, transition);
      return transition;
    }),
  },
  acceptanceCriterion: {
    findFirst: vi.fn().mockImplementation(({ where, include }) => {
      const criterion = mockData.acceptanceCriteria.get(where.id);
      if (criterion && criterion.type === 'criterion') {
        if (include?.slice) {
          return {
            ...criterion,
            slice: mockData.slices.get(criterion.sliceId),
          };
        }
        return criterion;
      }
      return null;
    }),
    findMany: vi.fn().mockImplementation(({ where }) => {
      return Array.from(mockData.acceptanceCriteria.values())
        .filter((c: any) => c.sliceId === where.sliceId && c.type === 'criterion');
    }),
    update: vi.fn().mockImplementation(({ where, data }) => {
      const criterion = mockData.acceptanceCriteria.get(where.id);
      if (criterion) {
        Object.assign(criterion, data);
        return criterion;
      }
      return null;
    }),
    aggregate: vi.fn().mockResolvedValue({ _max: { orderIndex: 0 } }),
    create: vi.fn(),
  },
  sliceContext: {
    findMany: vi.fn().mockImplementation(({ where }) => {
      return [];
    }),
  },
  aISession: {
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `session-${mockData.sessions.size + 1}`;
      const session = {
        id,
        ...data,
        contextCompiledAt: new Date(),
        startedAt: new Date(),
        createdAt: new Date(),
      };
      mockData.sessions.set(id, session);
      return session;
    }),
    findFirst: vi.fn().mockImplementation(({ where, include }) => {
      for (const s of mockData.sessions.values()) {
        if (s.id === where.id && s.tenantId === where.tenantId) {
          if (include?.feedback) {
            return {
              ...s,
              feedback: mockData.feedback.get(s.id) || null,
            };
          }
          return s;
        }
      }
      return null;
    }),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockImplementation(({ where, data }) => {
      const session = mockData.sessions.get(where.id);
      if (session) {
        Object.assign(session, data);
        return session;
      }
      return null;
    }),
  },
  sessionFeedback: {
    findUnique: vi.fn().mockImplementation(({ where }) => {
      return mockData.feedback.get(where.sessionId) || null;
    }),
    create: vi.fn().mockImplementation(({ data }) => {
      const id = `feedback-${mockData.feedback.size + 1}`;
      const feedback = { id, ...data, createdAt: new Date() };
      mockData.feedback.set(data.sessionId, feedback);
      return feedback;
    }),
  },
  feedbackMetrics: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};

// Mock Redis
const mockRedis = {
  keys: vi.fn().mockResolvedValue([]),
  del: vi.fn().mockResolvedValue(0),
  hincrby: vi.fn().mockResolvedValue(1),
  hget: vi.fn().mockResolvedValue('1'),
};

// Mock Queue
const mockQueue = {
  add: vi.fn().mockResolvedValue({}),
};

describe('E2E: Create Slice -> Compile -> Feedback Journey', () => {
  const tenantId = 'tenant-e2e' as TenantId;
  const ownerId = 'owner-e2e' as UserId;
  const reviewerId = 'reviewer-e2e' as UserId;
  const workspaceId = 'workspace-e2e' as WorkspaceId;

  let contextService: ContextService;
  let sliceService: SliceService;
  let feedbackService: FeedbackService;

  let graphId: GraphId;
  let sliceId: SliceId;
  let sessionId: SessionId;
  let contextNodeIds: NodeId[];

  beforeEach(() => {
    // Clear mock data
    mockData.graphs.clear();
    mockData.nodes.clear();
    mockData.slices.clear();
    mockData.sliceTransitions.clear();
    mockData.acceptanceCriteria.clear();
    mockData.sessions.clear();
    mockData.feedback.clear();
    vi.clearAllMocks();

    // Initialize services
    contextService = new ContextService(mockPrisma as any, mockRedis as any);
    sliceService = new SliceService(mockPrisma as any);
    feedbackService = new FeedbackService(mockPrisma as any, mockRedis as any, mockQueue as any);
  });

  it('should complete the full journey from slice creation to feedback', async () => {
    // =========================================================================
    // STEP 1: Setup - Create context graph and documents
    // =========================================================================
    console.log('Step 1: Setting up context graph and documents...');

    const graph = await contextService.createGraph(workspaceId, tenantId, {
      name: 'E2E Test Graph',
      isDefault: true,
    });
    graphId = graph.id as GraphId;

    // Create organizational context
    const orgDoc = await contextService.createNode(tenantId, {
      graphId,
      type: 'GUIDELINE' as any,
      layer: ContextLayer.ORGANIZATIONAL,
      name: 'Coding Standards',
      content: 'All code must follow company coding standards including proper error handling and documentation.',
    });

    // Create workspace context
    const wsDoc = await contextService.createNode(tenantId, {
      graphId,
      type: 'DOCUMENT' as any,
      layer: ContextLayer.WORKSPACE,
      name: 'Project Architecture',
      content: 'This project uses a layered architecture with services, repositories, and controllers.',
    });

    contextNodeIds = [orgDoc.id, wsDoc.id] as NodeId[];

    expect(graph).toBeDefined();
    expect(orgDoc).toBeDefined();
    expect(wsDoc).toBeDefined();

    // =========================================================================
    // STEP 2: Create a work slice
    // =========================================================================
    console.log('Step 2: Creating work slice...');

    const slice = await sliceService.create(tenantId, ownerId, {
      workspaceId,
      name: 'Add User Authentication',
      outcome: 'Users can register and login to the application',
      antiScope: ['Social login', 'Two-factor authentication'],
      constraints: [],
      acceptanceCriteria: [
        'User can register with email and password',
        'User can login with credentials',
        'Passwords are securely hashed',
      ],
    });
    sliceId = slice.id as SliceId;

    expect(slice.status).toBe(SliceStatus.PENDING);
    expect(slice.shortId).toMatch(/^SL-\d{4}$/);
    expect(slice.acceptanceCriteria).toHaveLength(3);

    // =========================================================================
    // STEP 3: Start work on the slice (PENDING -> ACTIVE)
    // =========================================================================
    console.log('Step 3: Starting work on slice...');

    const startResult = await sliceService.transition(
      sliceId,
      tenantId,
      ownerId,
      'start',
    );

    expect(startResult.slice.status).toBe(SliceStatus.ACTIVE);
    expect(startResult.transition.fromStatus).toBe(SliceStatus.PENDING);
    expect(startResult.transition.toStatus).toBe(SliceStatus.ACTIVE);

    // =========================================================================
    // STEP 4: Compile context for AI session
    // =========================================================================
    console.log('Step 4: Compiling context for AI...');

    const compiledContext = await contextService.compile(tenantId, {
      workspaceId,
      sliceId,
      tokenBudget: 8000,
    });

    expect(compiledContext.compiledText).toContain('Coding Standards');
    expect(compiledContext.compiledText).toContain('Project Architecture');
    expect(compiledContext.totalTokens).toBeLessThanOrEqual(8000);
    expect(compiledContext.budgetUtilization).toBeLessThanOrEqual(1);

    // =========================================================================
    // STEP 5: Create AI session and simulate work
    // =========================================================================
    console.log('Step 5: Creating AI session...');

    const session = await feedbackService.createSession(tenantId, workspaceId, ownerId, {
      sliceId,
      contextNodeIds,
      contextTokenCount: compiledContext.totalTokens,
    });
    sessionId = session.id as SessionId;

    expect(session).toBeDefined();
    expect(session.contextTokenCount).toBe(compiledContext.totalTokens);

    // Simulate AI interaction...
    // (In real app, user would interact with AI here)

    // End the session
    const endedSession = await feedbackService.endSession(sessionId, tenantId);
    expect(endedSession.endedAt).toBeDefined();

    // =========================================================================
    // STEP 6: Submit positive feedback
    // =========================================================================
    console.log('Step 6: Submitting feedback...');

    const feedback = await feedbackService.submitFeedback(tenantId, ownerId, {
      sessionId,
      rating: FeedbackRating.POSITIVE,
      comment: 'The context was very helpful!',
      qualityScores: {
        accuracy: 95,
        completeness: 90,
        styleMatch: 85,
      },
    });

    expect(feedback.rating).toBe(FeedbackRating.POSITIVE);
    expect(feedback.accuracyScore).toBe(95);

    // Verify queue was notified
    expect(mockQueue.add).toHaveBeenCalledWith(
      'process_feedback',
      expect.objectContaining({
        sessionId,
        rating: FeedbackRating.POSITIVE,
      }),
    );

    // =========================================================================
    // STEP 7: Complete acceptance criteria
    // =========================================================================
    console.log('Step 7: Completing acceptance criteria...');

    // Get fresh slice with criteria
    const sliceWithCriteria = await sliceService.get(sliceId, tenantId);

    for (const criterion of sliceWithCriteria.acceptanceCriteria) {
      await sliceService.toggleCriterion(criterion.id, tenantId);
    }

    // Verify all criteria completed
    const updatedSlice = await sliceService.get(sliceId, tenantId);
    const allCompleted = updatedSlice.acceptanceCriteria.every((c) => c.isCompleted);
    expect(allCompleted).toBe(true);

    // =========================================================================
    // STEP 8: Submit for review (ACTIVE -> IN_REVIEW)
    // =========================================================================
    console.log('Step 8: Submitting for review...');

    const submitResult = await sliceService.transition(
      sliceId,
      tenantId,
      ownerId,
      'submit',
    );

    expect(submitResult.slice.status).toBe(SliceStatus.IN_REVIEW);
    expect(submitResult.slice.submittedAt).toBeDefined();

    // =========================================================================
    // STEP 9: Approve the slice (IN_REVIEW -> COMPLETED)
    // =========================================================================
    console.log('Step 9: Approving slice...');

    const approveResult = await sliceService.transition(
      sliceId,
      tenantId,
      reviewerId, // Different user (not owner)
      'approve',
    );

    expect(approveResult.slice.status).toBe(SliceStatus.COMPLETED);
    expect(approveResult.slice.completedAt).toBeDefined();
    expect(approveResult.transition.event).toBe('approve');

    // =========================================================================
    // STEP 10: Verify analytics
    // =========================================================================
    console.log('Step 10: Verifying analytics...');

    const realTimeMetrics = await feedbackService.getRealTimeMetrics(workspaceId);

    expect(realTimeMetrics).toBeDefined();
    // Note: In a real test with actual data, we would verify:
    // - Session count increased
    // - Positive rating count increased

    // =========================================================================
    // COMPLETE: Full journey successful!
    // =========================================================================
    console.log('Journey complete! All steps passed.');

    // Final verification of slice state
    const finalSlice = await sliceService.get(sliceId, tenantId);
    expect(finalSlice.status).toBe(SliceStatus.COMPLETED);

    // Verify transition history
    expect(mockPrisma.sliceTransition.create).toHaveBeenCalledTimes(4);
    // 1. create (initial)
    // 2. start
    // 3. submit
    // 4. approve
  });

  it('should handle the negative feedback path', async () => {
    // Setup graph
    const graph = await contextService.createGraph(workspaceId, tenantId, {
      name: 'Test Graph',
      isDefault: true,
    });

    // Create session with insufficient context
    const session = await feedbackService.createSession(tenantId, workspaceId, ownerId, {
      contextNodeIds: [],
      contextTokenCount: 100,
    });

    // End session
    await feedbackService.endSession(session.id as SessionId, tenantId);

    // Submit negative feedback with error categories
    const feedback = await feedbackService.submitFeedback(tenantId, ownerId, {
      sessionId: session.id as SessionId,
      rating: FeedbackRating.NEGATIVE,
      errorCategories: [
        FeedbackErrorCategory.MISSING_CONTEXT,
        FeedbackErrorCategory.INCOMPLETE,
      ],
      missingContext: 'Needed information about database schema',
      comment: 'Response was incomplete due to missing technical context',
    });

    expect(feedback.rating).toBe(FeedbackRating.NEGATIVE);
    expect(feedback.errorCategories).toContain(FeedbackErrorCategory.MISSING_CONTEXT);

    // Verify queue received error categories
    expect(mockQueue.add).toHaveBeenCalledWith(
      'process_feedback',
      expect.objectContaining({
        errorCategories: [
          FeedbackErrorCategory.MISSING_CONTEXT,
          FeedbackErrorCategory.INCOMPLETE,
        ],
      }),
    );
  });

  it('should handle request changes flow', async () => {
    // Create and start slice
    const slice = await sliceService.create(tenantId, ownerId, {
      workspaceId,
      name: 'Feature Slice',
      outcome: 'New feature',
      acceptanceCriteria: ['Criteria 1'],
    });
    sliceId = slice.id as SliceId;

    await sliceService.transition(sliceId, tenantId, ownerId, 'start');

    // Complete criteria and submit
    const sliceWithCriteria = await sliceService.get(sliceId, tenantId);
    for (const c of sliceWithCriteria.acceptanceCriteria) {
      await sliceService.toggleCriterion(c.id, tenantId);
    }
    await sliceService.transition(sliceId, tenantId, ownerId, 'submit');

    // Reviewer requests changes
    const changesResult = await sliceService.transition(
      sliceId,
      tenantId,
      reviewerId,
      'request_changes',
      'Please add unit tests',
    );

    expect(changesResult.slice.status).toBe(SliceStatus.ACTIVE);
    expect(changesResult.transition.comment).toBe('Please add unit tests');

    // Owner can now work on changes and resubmit
    const resubmitResult = await sliceService.transition(
      sliceId,
      tenantId,
      ownerId,
      'submit',
    );

    expect(resubmitResult.slice.status).toBe(SliceStatus.IN_REVIEW);
  });
});
