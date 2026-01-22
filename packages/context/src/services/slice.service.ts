/**
 * @prompt-id forge-v4.1:service:slice:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import {
  type SliceId,
  type WorkspaceId,
  type TenantId,
  type UserId,
  type Slice,
  type SliceTransition,
  type SliceTransitionResult,
  type SliceEvent,
  type CreateSliceRequest,
  type UpdateSliceRequest,
  type PaginationOptions,
  type PaginatedResult,
  SliceStatus,
} from '../types/index.js';
import {
  SliceNotFoundError,
  InvalidSliceTransitionError,
  SliceTransitionGuardError,
  AcceptanceCriteriaIncompleteError,
  SelfApprovalNotAllowedError,
  SliceReopenWindowExpiredError,
} from '../errors/index.js';

const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// State machine definition
const STATE_TRANSITIONS: Record<SliceStatus, Partial<Record<SliceEvent, SliceStatus>>> = {
  [SliceStatus.PENDING]: {
    start: SliceStatus.ACTIVE,
  },
  [SliceStatus.ACTIVE]: {
    submit: SliceStatus.IN_REVIEW,
    cancel: SliceStatus.PENDING,
  },
  [SliceStatus.IN_REVIEW]: {
    approve: SliceStatus.COMPLETED,
    request_changes: SliceStatus.ACTIVE,
  },
  [SliceStatus.COMPLETED]: {
    reopen: SliceStatus.ACTIVE,
    archive: SliceStatus.ARCHIVED,
  },
  [SliceStatus.ARCHIVED]: {},
};

export class SliceService {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async get(sliceId: SliceId, tenantId: TenantId): Promise<Slice> {
    const slice = await this.prisma.slice.findFirst({
      where: { id: sliceId, tenantId },
      include: {
        constraints: { orderBy: { orderIndex: 'asc' } },
        acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!slice) {
      throw new SliceNotFoundError(sliceId);
    }

    return slice as unknown as Slice;
  }

  async list(
    workspaceId: WorkspaceId,
    tenantId: TenantId,
    options: PaginationOptions & { status?: SliceStatus; ownerId?: UserId } = {}
  ): Promise<PaginatedResult<Slice>> {
    const { limit = 20, offset = 0, status, ownerId } = options;

    const where = {
      workspaceId,
      tenantId,
      ...(status && { status }),
      ...(ownerId && { ownerId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.slice.findMany({
        where,
        include: {
          constraints: { orderBy: { orderIndex: 'asc' } },
          acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.slice.count({ where }),
    ]);

    return {
      data: data as unknown as Slice[],
      total,
      limit,
      offset,
    };
  }

  async create(
    tenantId: TenantId,
    userId: UserId,
    request: CreateSliceRequest
  ): Promise<Slice> {
    const shortId = await this.generateShortId(tenantId);

    const slice = await this.prisma.slice.create({
      data: {
        tenantId,
        workspaceId: request.workspaceId,
        shortId,
        name: request.name,
        outcome: request.outcome,
        antiScope: request.antiScope ?? [],
        status: SliceStatus.PENDING,
        ownerId: userId,
        createdById: userId,
        constraints: request.constraints?.length
          ? {
              create: request.constraints.map((content, index) => ({
                content,
                orderIndex: index,
              })),
            }
          : undefined,
        acceptanceCriteria: request.acceptanceCriteria?.length
          ? {
              create: request.acceptanceCriteria.map((content, index) => ({
                content,
                orderIndex: index,
                isCompleted: false,
              })),
            }
          : undefined,
      },
      include: {
        constraints: { orderBy: { orderIndex: 'asc' } },
        acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
      },
    });

    // Record initial transition
    await this.recordTransition(
      tenantId,
      slice.id as SliceId,
      null,
      SliceStatus.PENDING,
      'create',
      userId
    );

    return slice as unknown as Slice;
  }

  async update(
    sliceId: SliceId,
    tenantId: TenantId,
    request: UpdateSliceRequest
  ): Promise<Slice> {
    await this.get(sliceId, tenantId); // Verify exists

    const slice = await this.prisma.slice.update({
      where: { id: sliceId },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.outcome && { outcome: request.outcome }),
        ...(request.antiScope && { antiScope: request.antiScope }),
        updatedAt: new Date(),
      },
      include: {
        constraints: { orderBy: { orderIndex: 'asc' } },
        acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return slice as unknown as Slice;
  }

  async delete(sliceId: SliceId, tenantId: TenantId): Promise<void> {
    await this.get(sliceId, tenantId); // Verify exists

    await this.prisma.slice.delete({
      where: { id: sliceId },
    });
  }

  // ============================================================================
  // STATE MACHINE TRANSITIONS
  // ============================================================================

  async transition(
    sliceId: SliceId,
    tenantId: TenantId,
    actorId: UserId,
    event: SliceEvent,
    comment?: string
  ): Promise<SliceTransitionResult> {
    const slice = await this.get(sliceId, tenantId);
    const currentStatus = slice.status;

    // Validate transition
    const allowedTransitions = STATE_TRANSITIONS[currentStatus];
    const nextStatus = allowedTransitions[event];

    if (!nextStatus) {
      throw new InvalidSliceTransitionError(
        currentStatus,
        event,
        Object.keys(allowedTransitions)
      );
    }

    // Execute guards
    await this.executeGuards(slice, event, actorId);

    // Update slice status
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    // Set timestamps based on transition
    if (event === 'start') {
      updateData.startedAt = new Date();
    } else if (event === 'submit') {
      updateData.submittedAt = new Date();
    } else if (event === 'approve') {
      updateData.completedAt = new Date();
    } else if (event === 'archive') {
      updateData.archivedAt = new Date();
    } else if (event === 'reopen') {
      updateData.completedAt = null;
    }

    const updatedSlice = await this.prisma.slice.update({
      where: { id: sliceId },
      data: updateData,
      include: {
        constraints: { orderBy: { orderIndex: 'asc' } },
        acceptanceCriteria: { orderBy: { orderIndex: 'asc' } },
      },
    });

    // Record transition
    const transition = await this.recordTransition(
      tenantId,
      sliceId,
      currentStatus,
      nextStatus,
      event,
      actorId,
      comment
    );

    return {
      slice: updatedSlice as unknown as Slice,
      transition,
    };
  }

  // ============================================================================
  // ACCEPTANCE CRITERIA
  // ============================================================================

  async toggleCriterion(
    criterionId: string,
    tenantId: TenantId
  ): Promise<void> {
    const criterion = await this.prisma.acceptanceCriterion.findFirst({
      where: { id: criterionId },
      include: { slice: true },
    });

    if (!criterion || criterion.slice.tenantId !== tenantId) {
      throw new SliceNotFoundError(criterionId);
    }

    await this.prisma.acceptanceCriterion.update({
      where: { id: criterionId },
      data: {
        isCompleted: !criterion.isCompleted,
        completedAt: !criterion.isCompleted ? new Date() : null,
      },
    });
  }

  async addConstraint(
    sliceId: SliceId,
    tenantId: TenantId,
    content: string
  ): Promise<void> {
    await this.get(sliceId, tenantId); // Verify exists

    const maxOrder = await this.prisma.sliceConstraint.aggregate({
      where: { sliceId },
      _max: { orderIndex: true },
    });

    await this.prisma.sliceConstraint.create({
      data: {
        sliceId,
        content,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });
  }

  async addAcceptanceCriterion(
    sliceId: SliceId,
    tenantId: TenantId,
    content: string
  ): Promise<void> {
    await this.get(sliceId, tenantId); // Verify exists

    const maxOrder = await this.prisma.acceptanceCriterion.aggregate({
      where: { sliceId },
      _max: { orderIndex: true },
    });

    await this.prisma.acceptanceCriterion.create({
      data: {
        sliceId,
        content,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        isCompleted: false,
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async executeGuards(
    slice: Slice,
    event: SliceEvent,
    actorId: UserId
  ): Promise<void> {
    switch (event) {
      case 'submit':
        await this.guardAllCriteriaComplete(slice);
        break;
      case 'approve':
        this.guardReviewerIsNotOwner(slice, actorId);
        break;
      case 'request_changes':
        // Comment is required - handled at controller level
        break;
      case 'reopen':
        this.guardWithinReopenWindow(slice);
        break;
    }
  }

  private async guardAllCriteriaComplete(slice: Slice): Promise<void> {
    const criteria = await this.prisma.acceptanceCriterion.findMany({
      where: { sliceId: slice.id },
    });

    const incomplete = criteria.filter((c) => !c.isCompleted);

    if (incomplete.length > 0) {
      throw new AcceptanceCriteriaIncompleteError(
        slice.id,
        incomplete.length,
        criteria.length
      );
    }
  }

  private guardReviewerIsNotOwner(slice: Slice, reviewerId: UserId): void {
    if (reviewerId === slice.ownerId) {
      throw new SelfApprovalNotAllowedError(slice.id);
    }
  }

  private guardWithinReopenWindow(slice: Slice): void {
    if (!slice.completedAt) {
      throw new SliceTransitionGuardError(
        'withinReopenWindow',
        'Slice was never completed'
      );
    }

    const elapsed = Date.now() - slice.completedAt.getTime();
    if (elapsed > REOPEN_WINDOW_MS) {
      throw new SliceReopenWindowExpiredError(slice.id, slice.completedAt);
    }
  }

  private async recordTransition(
    tenantId: TenantId,
    sliceId: SliceId,
    fromStatus: SliceStatus | null,
    toStatus: SliceStatus,
    event: string,
    actorId: UserId,
    comment?: string
  ): Promise<SliceTransition> {
    const transition = await this.prisma.sliceTransition.create({
      data: {
        tenantId,
        sliceId,
        fromStatus,
        toStatus,
        event,
        actorId,
        comment,
      },
    });

    return transition as unknown as SliceTransition;
  }

  private async generateShortId(tenantId: TenantId): Promise<string> {
    const count = await this.prisma.slice.count({
      where: { tenantId },
    });

    return `SL-${(count + 1).toString().padStart(4, '0')}`;
  }
}
