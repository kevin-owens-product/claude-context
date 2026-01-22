/**
 * @prompt-id forge-v4.1:test:api:feedback-controller:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import {
  FeedbackService,
  SessionNotFoundError,
  FeedbackAlreadySubmittedError,
  type TenantId,
  type UserId,
  type SessionId,
  type WorkspaceId,
  type NodeId,
  FeedbackRating,
  FeedbackErrorCategory,
} from '@forge/context';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let feedbackService: jest.Mocked<FeedbackService>;

  const mockTenantId = 'tenant-123' as TenantId;
  const mockUserId = 'user-456' as UserId;
  const mockWorkspaceId = 'workspace-789' as WorkspaceId;
  const mockSessionId = 'session-abc' as SessionId;
  const mockNodeId = 'node-def' as NodeId;

  const mockSliceId = 'slice-123' as any; // Cast to avoid branded type issues in tests

  const mockSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    workspaceId: mockWorkspaceId,
    userId: mockUserId,
    sliceId: mockSliceId,
    contextNodeIds: [mockNodeId],
    contextTokenCount: 5000,
    contextCompiledAt: new Date(),
    startedAt: new Date(),
    createdAt: new Date(),
  };

  const mockFeedback = {
    id: 'feedback-123',
    tenantId: mockTenantId,
    sessionId: mockSessionId,
    rating: FeedbackRating.POSITIVE,
    errorCategories: [],
    outputIssues: [],
    submittedAt: new Date(),
    submittedById: mockUserId,
  };

  const mockAnalytics = {
    period: {
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-22'),
    },
    summary: {
      totalSessions: 100,
      positiveRatings: 75,
      negativeRatings: 15,
      skippedRatings: 10,
      firstPassAcceptanceRate: 85,
      averageEditDistance: 12.5,
      avgAccuracyScore: 88,
      avgCompletenessScore: 82,
      avgStyleMatchScore: 90,
      errorCategoryCounts: {
        [FeedbackErrorCategory.MISSING_CONTEXT]: 5,
        [FeedbackErrorCategory.HALLUCINATION]: 3,
      },
    },
    trends: [
      {
        date: new Date('2026-01-20'),
        sessions: 10,
        positiveRatings: 8,
        negativeRatings: 2,
      },
    ],
    topContext: [
      {
        nodeId: mockNodeId,
        name: 'API Guidelines',
        usageCount: 50,
        effectivenessScore: 92,
      },
    ],
    commonErrors: [
      {
        category: FeedbackErrorCategory.MISSING_CONTEXT,
        count: 5,
        percentage: 33.3,
      },
    ],
  };

  beforeEach(async () => {
    const mockFeedbackService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      endSession: jest.fn(),
      submitFeedback: jest.fn(),
      getAnalytics: jest.fn(),
      getRealTimeMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: mockFeedbackService,
        },
      ],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
    feedbackService = module.get(FeedbackService);
  });

  describe('Session Operations', () => {
    describe('createSession', () => {
      it('should create a new AI session', async () => {
        feedbackService.createSession.mockResolvedValue(mockSession);

        const createDto = {
          workspaceId: mockWorkspaceId,
          sliceId: mockSliceId,
          contextNodeIds: [mockNodeId],
          contextTokenCount: 5000,
        };

        const result = await controller.createSession(
          mockTenantId,
          mockUserId,
          createDto,
        );

        expect(result.id).toBe(mockSessionId);
        expect(result.contextTokenCount).toBe(5000);
        expect(feedbackService.createSession).toHaveBeenCalledWith(
          mockTenantId,
          mockWorkspaceId,
          mockUserId,
          {
            sliceId: 'slice-123',
            contextNodeIds: [mockNodeId],
            contextTokenCount: 5000,
          },
        );
      });

      it('should create session without slice', async () => {
        feedbackService.createSession.mockResolvedValue({
          ...mockSession,
          sliceId: undefined,
        });

        const createDto = {
          workspaceId: mockWorkspaceId,
          contextNodeIds: [mockNodeId],
          contextTokenCount: 3000,
        };

        await controller.createSession(mockTenantId, mockUserId, createDto);

        expect(feedbackService.createSession).toHaveBeenCalledWith(
          mockTenantId,
          mockWorkspaceId,
          mockUserId,
          {
            sliceId: undefined,
            contextNodeIds: [mockNodeId],
            contextTokenCount: 3000,
          },
        );
      });
    });

    describe('getSession', () => {
      it('should return a session by ID', async () => {
        feedbackService.getSession.mockResolvedValue(mockSession);

        const result = await controller.getSession(mockTenantId, mockSessionId);

        expect(result).toEqual(mockSession);
        expect(feedbackService.getSession).toHaveBeenCalledWith(
          mockSessionId,
          mockTenantId,
        );
      });

      it('should throw SessionNotFoundError when session not found', async () => {
        feedbackService.getSession.mockRejectedValue(
          new SessionNotFoundError(mockSessionId),
        );

        await expect(
          controller.getSession(mockTenantId, mockSessionId),
        ).rejects.toThrow(SessionNotFoundError);
      });
    });

    describe('endSession', () => {
      it('should end an AI session', async () => {
        const endedSession = {
          ...mockSession,
          endedAt: new Date(),
        };
        feedbackService.endSession.mockResolvedValue(endedSession);

        const result = await controller.endSession(mockTenantId, mockSessionId);

        expect(result.endedAt).toBeDefined();
        expect(feedbackService.endSession).toHaveBeenCalledWith(
          mockSessionId,
          mockTenantId,
        );
      });
    });
  });

  describe('Feedback Operations', () => {
    describe('submitFeedback', () => {
      it('should submit positive feedback', async () => {
        feedbackService.submitFeedback.mockResolvedValue(mockFeedback);

        const submitDto = {
          sessionId: mockSessionId,
          rating: FeedbackRating.POSITIVE,
        };

        const result = await controller.submitFeedback(
          mockTenantId,
          mockUserId,
          submitDto,
        );

        expect(result.rating).toBe(FeedbackRating.POSITIVE);
        expect(feedbackService.submitFeedback).toHaveBeenCalledWith(
          mockTenantId,
          mockUserId,
          {
            sessionId: mockSessionId,
            rating: FeedbackRating.POSITIVE,
            errorCategories: undefined,
            missingContext: undefined,
            comment: undefined,
            qualityScores: undefined,
          },
        );
      });

      it('should submit negative feedback with error categories', async () => {
        const negativeFeedback = {
          ...mockFeedback,
          rating: FeedbackRating.NEGATIVE,
          errorCategories: [
            FeedbackErrorCategory.MISSING_CONTEXT,
            FeedbackErrorCategory.HALLUCINATION,
          ],
          missingContext: 'Missing API documentation',
          comment: 'The response was incomplete',
        };
        feedbackService.submitFeedback.mockResolvedValue(negativeFeedback);

        const submitDto = {
          sessionId: mockSessionId,
          rating: FeedbackRating.NEGATIVE,
          errorCategories: [
            FeedbackErrorCategory.MISSING_CONTEXT,
            FeedbackErrorCategory.HALLUCINATION,
          ],
          missingContext: 'Missing API documentation',
          comment: 'The response was incomplete',
        };

        const result = await controller.submitFeedback(
          mockTenantId,
          mockUserId,
          submitDto,
        );

        expect(result.rating).toBe(FeedbackRating.NEGATIVE);
        expect(result.errorCategories).toHaveLength(2);
        expect(result.missingContext).toBe('Missing API documentation');
      });

      it('should submit feedback with quality scores', async () => {
        const feedbackWithScores = {
          ...mockFeedback,
          accuracyScore: 85,
          completenessScore: 90,
          styleMatchScore: 95,
        };
        feedbackService.submitFeedback.mockResolvedValue(feedbackWithScores);

        const submitDto = {
          sessionId: mockSessionId,
          rating: FeedbackRating.POSITIVE,
          qualityScores: {
            accuracy: 85,
            completeness: 90,
            styleMatch: 95,
          },
        };

        const result = await controller.submitFeedback(
          mockTenantId,
          mockUserId,
          submitDto,
        );

        expect(result.accuracyScore).toBe(85);
        expect(result.completenessScore).toBe(90);
        expect(result.styleMatchScore).toBe(95);
      });

      it('should throw FeedbackAlreadySubmittedError for duplicate feedback', async () => {
        feedbackService.submitFeedback.mockRejectedValue(
          new FeedbackAlreadySubmittedError(mockSessionId),
        );

        const submitDto = {
          sessionId: mockSessionId,
          rating: FeedbackRating.POSITIVE,
        };

        await expect(
          controller.submitFeedback(mockTenantId, mockUserId, submitDto),
        ).rejects.toThrow(FeedbackAlreadySubmittedError);
      });

      it('should submit skipped feedback', async () => {
        const skippedFeedback = {
          ...mockFeedback,
          rating: FeedbackRating.SKIPPED,
        };
        feedbackService.submitFeedback.mockResolvedValue(skippedFeedback);

        const submitDto = {
          sessionId: mockSessionId,
          rating: FeedbackRating.SKIPPED,
        };

        const result = await controller.submitFeedback(
          mockTenantId,
          mockUserId,
          submitDto,
        );

        expect(result.rating).toBe(FeedbackRating.SKIPPED);
      });
    });
  });

  describe('Analytics Operations', () => {
    describe('getAnalytics', () => {
      it('should return workspace analytics for date range', async () => {
        feedbackService.getAnalytics.mockResolvedValue(mockAnalytics);

        const queryDto = {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-22'),
        };

        const result = await controller.getAnalytics(
          mockTenantId,
          mockWorkspaceId,
          queryDto,
        );

        expect(result.summary.totalSessions).toBe(100);
        expect(result.summary.positiveRatings).toBe(75);
        expect(result.trends).toHaveLength(1);
        expect(result.topContext).toHaveLength(1);
        expect(feedbackService.getAnalytics).toHaveBeenCalledWith(
          mockTenantId,
          mockWorkspaceId,
          queryDto.startDate,
          queryDto.endDate,
        );
      });

      it('should include common errors in analytics', async () => {
        feedbackService.getAnalytics.mockResolvedValue(mockAnalytics);

        const queryDto = {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-22'),
        };

        const result = await controller.getAnalytics(
          mockTenantId,
          mockWorkspaceId,
          queryDto,
        );

        expect(result.commonErrors).toHaveLength(1);
        expect(result.commonErrors[0].category).toBe(
          FeedbackErrorCategory.MISSING_CONTEXT,
        );
      });
    });

    describe('getRealTimeMetrics', () => {
      it('should return real-time metrics for today', async () => {
        const realTimeMetrics = {
          sessions: 15,
          positive: 12,
          negative: 3,
        };
        feedbackService.getRealTimeMetrics.mockResolvedValue(realTimeMetrics);

        const result = await controller.getRealTimeMetrics(mockWorkspaceId);

        expect(result.sessions).toBe(15);
        expect(result.positive).toBe(12);
        expect(result.negative).toBe(3);
        expect(feedbackService.getRealTimeMetrics).toHaveBeenCalledWith(
          mockWorkspaceId,
        );
      });

      it('should return zero counts when no activity', async () => {
        const emptyMetrics = {
          sessions: 0,
          positive: 0,
          negative: 0,
        };
        feedbackService.getRealTimeMetrics.mockResolvedValue(emptyMetrics);

        const result = await controller.getRealTimeMetrics(mockWorkspaceId);

        expect(result.sessions).toBe(0);
        expect(result.positive).toBe(0);
        expect(result.negative).toBe(0);
      });
    });
  });
});
