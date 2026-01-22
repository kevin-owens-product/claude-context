/**
 * @prompt-id forge-v4.1:test:slice-service:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SliceService } from '../services/slice.service';
import {
  SliceStatus,
  type TenantId,
  type UserId,
  type SliceId,
  type WorkspaceId,
} from '../types';
import {
  SliceNotFoundError,
  InvalidSliceTransitionError,
  AcceptanceCriteriaIncompleteError,
  SelfApprovalNotAllowedError,
  SliceReopenWindowExpiredError,
} from '../errors';

// Mock Prisma client
const mockPrisma = {
  slice: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  sliceTransition: {
    create: vi.fn(),
  },
  sliceConstraint: {
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  acceptanceCriterion: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('SliceService', () => {
  let service: SliceService;
  const tenantId = 'tenant-1' as TenantId;
  const userId = 'user-1' as UserId;
  const workspaceId = 'workspace-1' as WorkspaceId;
  const sliceId = 'slice-1' as SliceId;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SliceService(mockPrisma as any);
  });

  describe('get', () => {
    it('should return a slice when found', async () => {
      const mockSlice = {
        id: sliceId,
        tenantId,
        name: 'Test Slice',
        status: SliceStatus.PENDING,
        constraints: [],
        acceptanceCriteria: [],
      };

      mockPrisma.slice.findFirst.mockResolvedValue(mockSlice);

      const result = await service.get(sliceId, tenantId);

      expect(result).toEqual(mockSlice);
      expect(mockPrisma.slice.findFirst).toHaveBeenCalledWith({
        where: { id: sliceId, tenantId },
        include: {
          constraints: { orderBy: { orderIndex: 'asc' } },
          acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
        },
      });
    });

    it('should throw SliceNotFoundError when slice not found', async () => {
      mockPrisma.slice.findFirst.mockResolvedValue(null);

      await expect(service.get(sliceId, tenantId)).rejects.toThrow(
        SliceNotFoundError,
      );
    });
  });

  describe('create', () => {
    it('should create a slice with generated shortId', async () => {
      const request = {
        workspaceId,
        name: 'New Slice',
        outcome: 'Test outcome',
        constraints: ['Constraint 1'],
        acceptanceCriteria: ['Criterion 1'],
      };

      mockPrisma.slice.count.mockResolvedValue(5);
      mockPrisma.slice.create.mockResolvedValue({
        id: sliceId,
        shortId: 'SL-0006',
        ...request,
        status: SliceStatus.PENDING,
        constraints: [{ id: 'c1', content: 'Constraint 1', orderIndex: 0 }],
        acceptanceCriteria: [
          { id: 'ac1', content: 'Criterion 1', orderIndex: 0, isCompleted: false },
        ],
      });
      mockPrisma.sliceTransition.create.mockResolvedValue({});

      const result = await service.create(tenantId, userId, request);

      expect(result.shortId).toBe('SL-0006');
      expect(result.status).toBe(SliceStatus.PENDING);
      expect(mockPrisma.sliceTransition.create).toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    const mockSlice = {
      id: sliceId,
      tenantId,
      workspaceId,
      name: 'Test Slice',
      status: SliceStatus.PENDING,
      ownerId: userId,
      constraints: [],
      acceptanceCriteria: [],
    };

    it('should transition from PENDING to ACTIVE on start event', async () => {
      mockPrisma.slice.findFirst.mockResolvedValue(mockSlice);
      mockPrisma.slice.update.mockResolvedValue({
        ...mockSlice,
        status: SliceStatus.ACTIVE,
        startedAt: new Date(),
      });
      mockPrisma.sliceTransition.create.mockResolvedValue({
        id: 't1',
        fromStatus: SliceStatus.PENDING,
        toStatus: SliceStatus.ACTIVE,
        event: 'start',
      });

      const result = await service.transition(sliceId, tenantId, userId, 'start');

      expect(result.slice.status).toBe(SliceStatus.ACTIVE);
      expect(result.transition.toStatus).toBe(SliceStatus.ACTIVE);
    });

    it('should throw InvalidSliceTransitionError for invalid transition', async () => {
      mockPrisma.slice.findFirst.mockResolvedValue(mockSlice);

      await expect(
        service.transition(sliceId, tenantId, userId, 'approve'),
      ).rejects.toThrow(InvalidSliceTransitionError);
    });

    it('should prevent submit when acceptance criteria incomplete', async () => {
      const sliceWithCriteria = {
        ...mockSlice,
        status: SliceStatus.ACTIVE,
        acceptanceCriteria: [
          { id: 'ac1', content: 'Criterion 1', isCompleted: false },
        ],
      };

      mockPrisma.slice.findFirst.mockResolvedValue(sliceWithCriteria);
      mockPrisma.acceptanceCriterion.findMany.mockResolvedValue([
        { id: 'ac1', content: 'Criterion 1', isCompleted: false },
      ]);

      await expect(
        service.transition(sliceId, tenantId, userId, 'submit'),
      ).rejects.toThrow(AcceptanceCriteriaIncompleteError);
    });

    it('should allow submit when all criteria complete', async () => {
      const sliceWithCriteria = {
        ...mockSlice,
        status: SliceStatus.ACTIVE,
        acceptanceCriteria: [
          { id: 'ac1', content: 'Criterion 1', isCompleted: true },
        ],
      };

      mockPrisma.slice.findFirst.mockResolvedValue(sliceWithCriteria);
      mockPrisma.acceptanceCriterion.findMany.mockResolvedValue([
        { id: 'ac1', content: 'Criterion 1', isCompleted: true },
      ]);
      mockPrisma.slice.update.mockResolvedValue({
        ...sliceWithCriteria,
        status: SliceStatus.IN_REVIEW,
        submittedAt: new Date(),
      });
      mockPrisma.sliceTransition.create.mockResolvedValue({});

      const result = await service.transition(sliceId, tenantId, userId, 'submit');

      expect(result.slice.status).toBe(SliceStatus.IN_REVIEW);
    });

    it('should prevent self-approval', async () => {
      const inReviewSlice = {
        ...mockSlice,
        status: SliceStatus.IN_REVIEW,
        ownerId: userId,
      };

      mockPrisma.slice.findFirst.mockResolvedValue(inReviewSlice);

      await expect(
        service.transition(sliceId, tenantId, userId, 'approve'),
      ).rejects.toThrow(SelfApprovalNotAllowedError);
    });

    it('should allow approval by different user', async () => {
      const inReviewSlice = {
        ...mockSlice,
        status: SliceStatus.IN_REVIEW,
        ownerId: 'other-user' as UserId,
      };

      mockPrisma.slice.findFirst.mockResolvedValue(inReviewSlice);
      mockPrisma.slice.update.mockResolvedValue({
        ...inReviewSlice,
        status: SliceStatus.COMPLETED,
        completedAt: new Date(),
      });
      mockPrisma.sliceTransition.create.mockResolvedValue({});

      const result = await service.transition(sliceId, tenantId, userId, 'approve');

      expect(result.slice.status).toBe(SliceStatus.COMPLETED);
    });

    it('should prevent reopen after window expires', async () => {
      const completedSlice = {
        ...mockSlice,
        status: SliceStatus.COMPLETED,
        completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      mockPrisma.slice.findFirst.mockResolvedValue(completedSlice);

      await expect(
        service.transition(sliceId, tenantId, userId, 'reopen'),
      ).rejects.toThrow(SliceReopenWindowExpiredError);
    });

    it('should allow reopen within window', async () => {
      const completedSlice = {
        ...mockSlice,
        status: SliceStatus.COMPLETED,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      mockPrisma.slice.findFirst.mockResolvedValue(completedSlice);
      mockPrisma.slice.update.mockResolvedValue({
        ...completedSlice,
        status: SliceStatus.ACTIVE,
        completedAt: null,
      });
      mockPrisma.sliceTransition.create.mockResolvedValue({});

      const result = await service.transition(sliceId, tenantId, userId, 'reopen');

      expect(result.slice.status).toBe(SliceStatus.ACTIVE);
    });
  });

  describe('toggleCriterion', () => {
    it('should toggle criterion completion status', async () => {
      const criterion = {
        id: 'ac1',
        sliceId,
        isCompleted: false,
        slice: { tenantId },
      };

      mockPrisma.acceptanceCriterion.findFirst.mockResolvedValue(criterion);
      mockPrisma.acceptanceCriterion.update.mockResolvedValue({
        ...criterion,
        isCompleted: true,
        completedAt: new Date(),
      });

      await service.toggleCriterion('ac1', tenantId);

      expect(mockPrisma.acceptanceCriterion.update).toHaveBeenCalledWith({
        where: { id: 'ac1' },
        data: {
          isCompleted: true,
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw error when criterion not found', async () => {
      mockPrisma.acceptanceCriterion.findFirst.mockResolvedValue(null);

      await expect(service.toggleCriterion('invalid', tenantId)).rejects.toThrow(
        SliceNotFoundError,
      );
    });
  });

  describe('addConstraint', () => {
    it('should add constraint with correct order index', async () => {
      mockPrisma.slice.findFirst.mockResolvedValue({ id: sliceId, tenantId });
      mockPrisma.sliceConstraint.aggregate.mockResolvedValue({
        _max: { orderIndex: 2 },
      });
      mockPrisma.sliceConstraint.create.mockResolvedValue({});

      await service.addConstraint(sliceId, tenantId, 'New constraint');

      expect(mockPrisma.sliceConstraint.create).toHaveBeenCalledWith({
        data: {
          sliceId,
          content: 'New constraint',
          orderIndex: 3,
        },
      });
    });
  });

  describe('addAcceptanceCriterion', () => {
    it('should add criterion with correct order index', async () => {
      mockPrisma.slice.findFirst.mockResolvedValue({ id: sliceId, tenantId });
      mockPrisma.acceptanceCriterion.aggregate.mockResolvedValue({
        _max: { orderIndex: 1 },
      });
      mockPrisma.acceptanceCriterion.create.mockResolvedValue({});

      await service.addAcceptanceCriterion(sliceId, tenantId, 'New criterion');

      expect(mockPrisma.acceptanceCriterion.create).toHaveBeenCalledWith({
        data: {
          sliceId,
          content: 'New criterion',
          orderIndex: 2,
          isCompleted: false,
        },
      });
    });
  });
});
