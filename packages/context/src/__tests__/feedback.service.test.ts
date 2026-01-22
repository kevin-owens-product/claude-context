/**
 * @prompt-id forge-v4.1:test:feedback-service:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackService } from '../services/feedback.service';
import {
  FeedbackRating,
  type TenantId,
  type UserId,
  type SessionId,
  type WorkspaceId,
} from '../types';
import {
  SessionNotFoundError,
  FeedbackAlreadySubmittedError,
} from '../errors';

// Mock Prisma client
const mockPrisma = {
  aISession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  sessionFeedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  feedbackMetrics: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  contextNode: {
    findMany: vi.fn(),
  },
};

// Mock Redis client
const mockRedis = {
  hincrby: vi.fn(),
  hget: vi.fn(),
};

// Mock Queue
const mockQueue = {
  add: vi.fn(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;
  let serviceWithQueue: FeedbackService;
  const tenantId = 'tenant-1' as TenantId;
  const userId = 'user-1' as UserId;
  const workspaceId = 'workspace-1' as WorkspaceId;
  const sessionId = 'session-1' as SessionId;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeedbackService(mockPrisma as any, mockRedis as any);
    serviceWithQueue = new FeedbackService(
      mockPrisma as any,
      mockRedis as any,
      mockQueue as any,
    );
  });

  describe('createSession', () => {
    it('should create a new AI session', async () => {
      const sessionData = {
        sliceId: 'slice-1',
        contextNodeIds: ['node-1', 'node-2'],
        contextTokenCount: 500,
      };

      const mockSession = {
        id: sessionId,
        tenantId,
        workspaceId,
        userId,
        ...sessionData,
        contextCompiledAt: new Date(),
        startedAt: new Date(),
      };

      mockPrisma.aISession.create.mockResolvedValue(mockSession);
      mockRedis.hincrby.mockResolvedValue(1);

      const result = await service.createSession(
        tenantId,
        workspaceId,
        userId,
        sessionData,
      );

      expect(result.id).toBe(sessionId);
      expect(mockPrisma.aISession.create).toHaveBeenCalled();
      expect(mockRedis.hincrby).toHaveBeenCalled();
    });

    it('should increment session counter in Redis', async () => {
      mockPrisma.aISession.create.mockResolvedValue({ id: sessionId, workspaceId });
      mockRedis.hincrby.mockResolvedValue(1);

      await service.createSession(tenantId, workspaceId, userId, {
        contextNodeIds: [],
        contextTokenCount: 0,
      });

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        expect.stringContaining(`sessions:${workspaceId}`),
        'total',
        1,
      );
    });
  });

  describe('getSession', () => {
    it('should return a session when found', async () => {
      const mockSession = {
        id: sessionId,
        tenantId,
        feedback: null,
      };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);

      const result = await service.getSession(sessionId, tenantId);

      expect(result.id).toBe(sessionId);
    });

    it('should throw SessionNotFoundError when session not found', async () => {
      mockPrisma.aISession.findFirst.mockResolvedValue(null);

      await expect(service.getSession(sessionId, tenantId)).rejects.toThrow(
        SessionNotFoundError,
      );
    });
  });

  describe('endSession', () => {
    it('should set endedAt timestamp', async () => {
      const mockSession = { id: sessionId, tenantId };
      const endedSession = { ...mockSession, endedAt: new Date() };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.aISession.update.mockResolvedValue(endedSession);

      const result = await service.endSession(sessionId, tenantId);

      expect(result.endedAt).toBeDefined();
      expect(mockPrisma.aISession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { endedAt: expect.any(Date) },
      });
    });
  });

  describe('submitFeedback', () => {
    const feedbackRequest = {
      sessionId,
      rating: FeedbackRating.POSITIVE,
      comment: 'Great response!',
    };

    it('should create feedback for a session', async () => {
      const mockSession = { id: sessionId, tenantId, workspaceId };
      const mockFeedback = {
        id: 'feedback-1',
        sessionId,
        rating: FeedbackRating.POSITIVE,
        errorCategories: [],
      };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(null);
      mockPrisma.sessionFeedback.create.mockResolvedValue(mockFeedback);
      mockRedis.hincrby.mockResolvedValue(1);

      const result = await service.submitFeedback(tenantId, userId, feedbackRequest);

      expect(result.rating).toBe(FeedbackRating.POSITIVE);
      expect(mockPrisma.sessionFeedback.create).toHaveBeenCalled();
    });

    it('should throw FeedbackAlreadySubmittedError when feedback exists', async () => {
      const mockSession = { id: sessionId, tenantId, workspaceId };
      const existingFeedback = { id: 'existing-feedback', sessionId };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(existingFeedback);

      await expect(
        service.submitFeedback(tenantId, userId, feedbackRequest),
      ).rejects.toThrow(FeedbackAlreadySubmittedError);
    });

    it('should update Redis counters on feedback', async () => {
      const mockSession = { id: sessionId, tenantId, workspaceId };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(null);
      mockPrisma.sessionFeedback.create.mockResolvedValue({
        id: 'f1',
        ...feedbackRequest,
      });
      mockRedis.hincrby.mockResolvedValue(1);

      await service.submitFeedback(tenantId, userId, feedbackRequest);

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        expect.stringContaining(`feedback:${workspaceId}`),
        'positive',
        1,
      );
    });

    it('should queue background processing when queue available', async () => {
      const mockSession = { id: sessionId, tenantId, workspaceId };

      mockPrisma.aISession.findFirst.mockResolvedValue(mockSession);
      mockPrisma.sessionFeedback.findUnique.mockResolvedValue(null);
      mockPrisma.sessionFeedback.create.mockResolvedValue({
        id: 'f1',
        ...feedbackRequest,
      });
      mockRedis.hincrby.mockResolvedValue(1);
      mockQueue.add.mockResolvedValue({});

      await serviceWithQueue.submitFeedback(tenantId, userId, feedbackRequest);

      expect(mockQueue.add).toHaveBeenCalledWith('process_feedback', {
        feedbackId: 'f1',
        sessionId,
        workspaceId,
        rating: FeedbackRating.POSITIVE,
        errorCategories: undefined,
      });
    });
  });

  describe('getAnalytics', () => {
    it('should return workspace analytics', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      const mockMetrics = [
        {
          date: new Date('2026-01-15'),
          totalSessions: 100,
          positiveRatings: 80,
          negativeRatings: 15,
          skippedRatings: 5,
          firstPassAcceptanceRate: 85,
          averageEditDistance: 10,
          errorCategoryCounts: { HALLUCINATION: 5, MISSING_CONTEXT: 10 },
          avgAccuracyScore: 90,
          avgCompletenessScore: 85,
          avgStyleMatchScore: 88,
        },
      ];

      mockPrisma.feedbackMetrics.findMany.mockResolvedValue(mockMetrics);
      mockPrisma.aISession.findMany.mockResolvedValue([]);
      mockPrisma.contextNode.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics(
        tenantId,
        workspaceId,
        startDate,
        endDate,
      );

      expect(result.period.startDate).toEqual(startDate);
      expect(result.period.endDate).toEqual(endDate);
      expect(result.summary.totalSessions).toBe(100);
      expect(result.trends).toHaveLength(1);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return today metrics from Redis', async () => {
      mockRedis.hget
        .mockResolvedValueOnce('50')  // sessions
        .mockResolvedValueOnce('40')  // positive
        .mockResolvedValueOnce('8');  // negative

      const result = await service.getRealTimeMetrics(workspaceId);

      expect(result).toEqual({
        sessions: 50,
        positive: 40,
        negative: 8,
      });
    });

    it('should handle null Redis values', async () => {
      mockRedis.hget
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.getRealTimeMetrics(workspaceId);

      expect(result).toEqual({
        sessions: 0,
        positive: 0,
        negative: 0,
      });
    });
  });

  describe('aggregateDaily', () => {
    it('should aggregate daily metrics', async () => {
      const date = new Date('2026-01-15');
      const mockSessions = [
        {
          id: 's1',
          startedAt: date,
          feedback: {
            rating: FeedbackRating.POSITIVE,
            errorCategories: [],
            accuracyScore: 90,
            completenessScore: 85,
            styleMatchScore: 88,
            editDistance: null,
            reviewVerdict: null,
          },
        },
        {
          id: 's2',
          startedAt: date,
          feedback: {
            rating: FeedbackRating.NEGATIVE,
            errorCategories: ['HALLUCINATION'],
            accuracyScore: 60,
            completenessScore: 50,
            styleMatchScore: 55,
            editDistance: 20,
            reviewVerdict: 'REJECTED',
          },
        },
      ];

      mockPrisma.aISession.findMany.mockResolvedValue(mockSessions);
      mockPrisma.feedbackMetrics.upsert.mockResolvedValue({});

      await service.aggregateDaily(tenantId, workspaceId, date);

      expect(mockPrisma.feedbackMetrics.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_workspaceId_date: {
              tenantId,
              workspaceId,
              date: expect.any(Date),
            },
          },
          create: expect.objectContaining({
            totalSessions: 2,
            positiveRatings: 1,
            negativeRatings: 1,
          }),
          update: expect.objectContaining({
            totalSessions: 2,
          }),
        }),
      );
    });
  });
});
