/**
 * @prompt-id forge-v4.1:test:api:slice-controller:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SliceController } from './slice.controller';
import {
  SliceService,
  SliceNotFoundError,
  InvalidSliceTransitionError,
  type TenantId,
  type UserId,
  type SliceId,
  type WorkspaceId,
  SliceStatus,
} from '@forge/context';

describe('SliceController', () => {
  let controller: SliceController;
  let sliceService: jest.Mocked<SliceService>;

  const mockTenantId = 'tenant-123' as TenantId;
  const mockUserId = 'user-456' as UserId;
  const mockWorkspaceId = 'workspace-789' as WorkspaceId;
  const mockSliceId = 'slice-abc' as SliceId;

  const mockSlice = {
    id: mockSliceId,
    tenantId: mockTenantId,
    workspaceId: mockWorkspaceId,
    shortId: 'SL-001',
    name: 'Test Slice',
    outcome: 'Implement test feature',
    antiScope: ['Performance optimization'],
    status: SliceStatus.PENDING,
    ownerId: mockUserId,
    createdById: mockUserId,
    constraints: [],
    acceptanceCriteria: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransition = {
    id: 'transition-123',
    tenantId: mockTenantId,
    sliceId: mockSliceId,
    fromStatus: SliceStatus.PENDING,
    toStatus: SliceStatus.ACTIVE,
    event: 'start',
    actorId: mockUserId,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockSliceService = {
      get: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transition: jest.fn(),
      addConstraint: jest.fn(),
      addAcceptanceCriterion: jest.fn(),
      toggleCriterion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SliceController],
      providers: [
        {
          provide: SliceService,
          useValue: mockSliceService,
        },
      ],
    }).compile();

    controller = module.get<SliceController>(SliceController);
    sliceService = module.get(SliceService);
  });

  describe('CRUD Operations', () => {
    describe('list', () => {
      it('should return paginated list of slices', async () => {
        const mockResult = {
          data: [mockSlice],
          total: 1,
          limit: 20,
          offset: 0,
        };
        sliceService.list.mockResolvedValue(mockResult);

        const result = await controller.list(mockTenantId, mockWorkspaceId, {
          limit: 20,
          offset: 0,
        });

        expect(result).toEqual(mockResult);
        expect(sliceService.list).toHaveBeenCalledWith(
          mockWorkspaceId,
          mockTenantId,
          { limit: 20, offset: 0, status: undefined, ownerId: undefined },
        );
      });

      it('should filter slices by status', async () => {
        const mockResult = {
          data: [mockSlice],
          total: 1,
          limit: 20,
          offset: 0,
        };
        sliceService.list.mockResolvedValue(mockResult);

        await controller.list(mockTenantId, mockWorkspaceId, {
          limit: 20,
          offset: 0,
          status: SliceStatus.ACTIVE,
        });

        expect(sliceService.list).toHaveBeenCalledWith(
          mockWorkspaceId,
          mockTenantId,
          { limit: 20, offset: 0, status: SliceStatus.ACTIVE, ownerId: undefined },
        );
      });

      it('should filter slices by owner', async () => {
        const mockResult = {
          data: [mockSlice],
          total: 1,
          limit: 20,
          offset: 0,
        };
        sliceService.list.mockResolvedValue(mockResult);

        await controller.list(mockTenantId, mockWorkspaceId, {
          limit: 20,
          offset: 0,
          ownerId: mockUserId,
        });

        expect(sliceService.list).toHaveBeenCalledWith(
          mockWorkspaceId,
          mockTenantId,
          { limit: 20, offset: 0, status: undefined, ownerId: mockUserId },
        );
      });
    });

    describe('get', () => {
      it('should return a slice by ID', async () => {
        sliceService.get.mockResolvedValue(mockSlice);

        const result = await controller.get(mockTenantId, mockSliceId);

        expect(result).toEqual(mockSlice);
        expect(sliceService.get).toHaveBeenCalledWith(mockSliceId, mockTenantId);
      });

      it('should throw when slice not found', async () => {
        sliceService.get.mockRejectedValue(new SliceNotFoundError(mockSliceId));

        await expect(controller.get(mockTenantId, mockSliceId)).rejects.toThrow(
          SliceNotFoundError,
        );
      });
    });

    describe('create', () => {
      it('should create a new slice', async () => {
        const createDto = {
          workspaceId: mockWorkspaceId,
          name: 'New Slice',
          outcome: 'Build new feature',
          antiScope: ['Out of scope item'],
          constraints: ['Must use TypeScript'],
          acceptanceCriteria: ['Feature works correctly'],
        };
        sliceService.create.mockResolvedValue({
          ...mockSlice,
          name: createDto.name,
          outcome: createDto.outcome,
        });

        const result = await controller.create(
          mockTenantId,
          mockUserId,
          createDto,
        );

        expect(result.name).toBe(createDto.name);
        expect(sliceService.create).toHaveBeenCalledWith(
          mockTenantId,
          mockUserId,
          {
            workspaceId: mockWorkspaceId,
            name: createDto.name,
            outcome: createDto.outcome,
            antiScope: createDto.antiScope,
            constraints: createDto.constraints,
            acceptanceCriteria: createDto.acceptanceCriteria,
          },
        );
      });

      it('should create slice without optional fields', async () => {
        const createDto = {
          workspaceId: mockWorkspaceId,
          name: 'Minimal Slice',
          outcome: 'Simple outcome',
        };
        sliceService.create.mockResolvedValue({
          ...mockSlice,
          name: createDto.name,
          outcome: createDto.outcome,
        });

        await controller.create(mockTenantId, mockUserId, createDto);

        expect(sliceService.create).toHaveBeenCalledWith(
          mockTenantId,
          mockUserId,
          {
            workspaceId: mockWorkspaceId,
            name: createDto.name,
            outcome: createDto.outcome,
            antiScope: undefined,
            constraints: undefined,
            acceptanceCriteria: undefined,
          },
        );
      });
    });

    describe('update', () => {
      it('should update an existing slice', async () => {
        const updateDto = {
          name: 'Updated Slice Name',
          outcome: 'Updated outcome',
        };
        sliceService.update.mockResolvedValue({
          ...mockSlice,
          ...updateDto,
        });

        const result = await controller.update(
          mockTenantId,
          mockSliceId,
          updateDto,
        );

        expect(result.name).toBe(updateDto.name);
        expect(sliceService.update).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
          updateDto,
        );
      });
    });

    describe('delete', () => {
      it('should delete a slice', async () => {
        sliceService.delete.mockResolvedValue(undefined);

        await controller.delete(mockTenantId, mockSliceId);

        expect(sliceService.delete).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
        );
      });
    });
  });

  describe('State Machine Operations', () => {
    describe('transition', () => {
      it('should transition slice to ACTIVE state with start event', async () => {
        const transitionResult = {
          slice: { ...mockSlice, status: SliceStatus.ACTIVE },
          transition: mockTransition,
        };
        sliceService.transition.mockResolvedValue(transitionResult);

        const result = await controller.transition(
          mockTenantId,
          mockUserId,
          mockSliceId,
          { event: 'start' as any },
        );

        expect(result.slice.status).toBe(SliceStatus.ACTIVE);
        expect(sliceService.transition).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
          mockUserId,
          'start',
          undefined,
        );
      });

      it('should transition to IN_REVIEW state with submit event', async () => {
        const transitionResult = {
          slice: { ...mockSlice, status: SliceStatus.IN_REVIEW },
          transition: { ...mockTransition, toStatus: SliceStatus.IN_REVIEW, event: 'submit' },
        };
        sliceService.transition.mockResolvedValue(transitionResult);

        const result = await controller.transition(
          mockTenantId,
          mockUserId,
          mockSliceId,
          { event: 'submit' as any },
        );

        expect(result.slice.status).toBe(SliceStatus.IN_REVIEW);
      });

      it('should require comment for request_changes event', async () => {
        await expect(
          controller.transition(mockTenantId, mockUserId, mockSliceId, {
            event: 'request_changes' as any,
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept request_changes with comment', async () => {
        const transitionResult = {
          slice: { ...mockSlice, status: SliceStatus.ACTIVE },
          transition: {
            ...mockTransition,
            toStatus: SliceStatus.ACTIVE,
            event: 'request_changes',
            comment: 'Please fix the tests',
          },
        };
        sliceService.transition.mockResolvedValue(transitionResult);

        const result = await controller.transition(
          mockTenantId,
          mockUserId,
          mockSliceId,
          { event: 'request_changes' as any, comment: 'Please fix the tests' },
        );

        expect(result.transition.comment).toBe('Please fix the tests');
        expect(sliceService.transition).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
          mockUserId,
          'request_changes',
          'Please fix the tests',
        );
      });

      it('should throw InvalidSliceTransitionError for invalid transitions', async () => {
        sliceService.transition.mockRejectedValue(
          new InvalidSliceTransitionError(SliceStatus.PENDING, 'approve', ['start']),
        );

        await expect(
          controller.transition(mockTenantId, mockUserId, mockSliceId, {
            event: 'approve' as any,
          }),
        ).rejects.toThrow(InvalidSliceTransitionError);
      });
    });
  });

  describe('Constraint Operations', () => {
    describe('addConstraint', () => {
      it('should add a constraint to a slice', async () => {
        sliceService.addConstraint.mockResolvedValue(undefined);

        await controller.addConstraint(mockTenantId, mockSliceId, {
          content: 'Must use React 18',
        });

        expect(sliceService.addConstraint).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
          'Must use React 18',
        );
      });
    });
  });

  describe('Acceptance Criteria Operations', () => {
    describe('addAcceptanceCriterion', () => {
      it('should add an acceptance criterion to a slice', async () => {
        sliceService.addAcceptanceCriterion.mockResolvedValue(undefined);

        await controller.addAcceptanceCriterion(mockTenantId, mockSliceId, {
          content: 'All tests pass',
        });

        expect(sliceService.addAcceptanceCriterion).toHaveBeenCalledWith(
          mockSliceId,
          mockTenantId,
          'All tests pass',
        );
      });
    });

    describe('toggleCriterion', () => {
      it('should toggle an acceptance criterion completion status', async () => {
        sliceService.toggleCriterion.mockResolvedValue(undefined);
        const criterionId = 'criterion-123';

        await controller.toggleCriterion(mockTenantId, criterionId);

        expect(sliceService.toggleCriterion).toHaveBeenCalledWith(
          criterionId,
          mockTenantId,
        );
      });
    });
  });
});
