# ADR-015: Slice State Machine

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture Team
**Categories:** Domain Logic, Workflow

## Context

Work Slices are the core work unit in Claude Context - AI-ready packages containing outcomes, constraints, acceptance criteria, and curated context. Slices progress through a defined lifecycle from creation to completion, with multiple actors (creators, reviewers, AI) interacting at different stages.

We need a state machine that:

1. **Enforces valid transitions** - Only allowed state changes can occur
2. **Supports collaboration** - Multiple users can work on and review slices
3. **Tracks progress** - Completion percentage and acceptance criteria status
4. **Enables automation** - AI sessions, notifications, and integrations trigger on state changes
5. **Maintains audit trail** - All transitions logged for compliance

### Requirements

- Slices must have a clear owner and optional reviewers
- Acceptance criteria must be complete before submission for review
- Review can result in approval or return to active state with feedback
- Completed slices are immutable (archived for reference)
- State transitions emit events for downstream systems

## Decision

We will implement a finite state machine with the following states and transitions:

### State Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │                                     │
                                    ▼                                     │
┌──────────┐    create    ┌──────────────┐    start    ┌──────────────┐  │
│          │─────────────▶│              │────────────▶│              │  │
│  (none)  │              │   PENDING    │             │    ACTIVE    │──┘
│          │              │              │◀────────────│              │ request_changes
└──────────┘              └──────────────┘   reopen    └──────┬───────┘
                                                              │
                                                              │ submit
                                                              ▼
                          ┌──────────────┐   approve   ┌──────────────┐
                          │              │◀────────────│              │
                          │  COMPLETED   │             │   IN_REVIEW  │
                          │              │             │              │
                          └──────┬───────┘             └──────────────┘
                                 │
                                 │ archive
                                 ▼
                          ┌──────────────┐
                          │              │
                          │   ARCHIVED   │
                          │              │
                          └──────────────┘
```

### States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `PENDING` | Slice created but work not started | Edit, Start, Delete |
| `ACTIVE` | Work in progress | Edit, AI Sessions, Submit, Cancel |
| `IN_REVIEW` | Submitted for review | Review, Approve, Request Changes |
| `COMPLETED` | Approved and finished | Archive, View |
| `ARCHIVED` | Historical reference | View only |

### Transitions

| Transition | From | To | Trigger | Guards |
|------------|------|-----|---------|--------|
| `create` | - | PENDING | User creates slice | Valid outcome required |
| `start` | PENDING | ACTIVE | User starts work | - |
| `submit` | ACTIVE | IN_REVIEW | User submits | All acceptance criteria checked |
| `approve` | IN_REVIEW | COMPLETED | Reviewer approves | Reviewer != Owner |
| `request_changes` | IN_REVIEW | ACTIVE | Reviewer requests changes | Comment required |
| `reopen` | COMPLETED | ACTIVE | Owner reopens | Within 7 days of completion |
| `archive` | COMPLETED | ARCHIVED | User or system archives | - |
| `cancel` | ACTIVE | PENDING | User cancels work | - |

### Implementation

```typescript
// packages/context/src/slice/slice-state-machine.ts

import { createMachine, assign } from 'xstate';

export type SliceState =
  | 'pending'
  | 'active'
  | 'in_review'
  | 'completed'
  | 'archived';

export type SliceEvent =
  | { type: 'START' }
  | { type: 'SUBMIT' }
  | { type: 'APPROVE'; reviewerId: string; comment?: string }
  | { type: 'REQUEST_CHANGES'; reviewerId: string; comment: string }
  | { type: 'REOPEN' }
  | { type: 'ARCHIVE' }
  | { type: 'CANCEL' };

export interface SliceContext {
  sliceId: string;
  ownerId: string;
  acceptanceCriteria: { id: string; completed: boolean }[];
  reviewers: string[];
  completedAt?: Date;
  history: SliceTransition[];
}

export interface SliceTransition {
  from: SliceState;
  to: SliceState;
  event: string;
  actorId: string;
  timestamp: Date;
  comment?: string;
}

export const sliceStateMachine = createMachine({
  id: 'slice',
  initial: 'pending',
  context: {} as SliceContext,
  states: {
    pending: {
      on: {
        START: {
          target: 'active',
          actions: ['recordTransition', 'emitStartedEvent'],
        },
      },
    },
    active: {
      on: {
        SUBMIT: {
          target: 'in_review',
          guards: ['allCriteriaComplete'],
          actions: ['recordTransition', 'notifyReviewers', 'emitSubmittedEvent'],
        },
        CANCEL: {
          target: 'pending',
          actions: ['recordTransition'],
        },
      },
    },
    in_review: {
      on: {
        APPROVE: {
          target: 'completed',
          guards: ['reviewerIsNotOwner'],
          actions: [
            'recordTransition',
            'setCompletedAt',
            'notifyOwner',
            'emitCompletedEvent',
          ],
        },
        REQUEST_CHANGES: {
          target: 'active',
          guards: ['hasComment'],
          actions: ['recordTransition', 'notifyOwner', 'emitChangesRequestedEvent'],
        },
      },
    },
    completed: {
      on: {
        REOPEN: {
          target: 'active',
          guards: ['withinReopenWindow'],
          actions: ['recordTransition', 'clearCompletedAt', 'emitReopenedEvent'],
        },
        ARCHIVE: {
          target: 'archived',
          actions: ['recordTransition', 'emitArchivedEvent'],
        },
      },
    },
    archived: {
      type: 'final',
    },
  },
});

// Guards
export const sliceGuards = {
  allCriteriaComplete: (context: SliceContext) => {
    return context.acceptanceCriteria.every((c) => c.completed);
  },

  reviewerIsNotOwner: (context: SliceContext, event: { reviewerId: string }) => {
    return event.reviewerId !== context.ownerId;
  },

  hasComment: (_context: SliceContext, event: { comment: string }) => {
    return event.comment && event.comment.trim().length > 0;
  },

  withinReopenWindow: (context: SliceContext) => {
    if (!context.completedAt) return false;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - context.completedAt.getTime() < sevenDaysMs;
  },
};
```

### Events Emitted

| Event | Payload | Consumers |
|-------|---------|-----------|
| `slice.started` | sliceId, ownerId | Analytics, Notifications |
| `slice.submitted` | sliceId, reviewers | Notifications, Slack/Teams |
| `slice.completed` | sliceId, ownerId, reviewerId | Analytics, GitHub (close issue) |
| `slice.changes_requested` | sliceId, comment | Notifications |
| `slice.reopened` | sliceId, reason | Analytics |
| `slice.archived` | sliceId | Cleanup jobs |

### Database Schema

```sql
-- Slice status stored as enum
CREATE TYPE slice_status AS ENUM (
  'pending', 'active', 'in_review', 'completed', 'archived'
);

-- Slice transitions for audit trail
CREATE TABLE slice_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slice_id UUID NOT NULL REFERENCES slices(id),
  from_status slice_status,
  to_status slice_status NOT NULL,
  event VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL REFERENCES users(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slice_transitions_slice ON slice_transitions(slice_id);
```

## Consequences

### Positive

- **Clear lifecycle** - Users understand slice progression
- **Enforced quality** - Criteria must be complete before review
- **Collaboration** - Review workflow built into the model
- **Audit trail** - All transitions tracked for compliance
- **Event-driven** - Easy to add integrations and notifications

### Negative

- **Rigidity** - Fixed states may not fit all workflows
- **Complexity** - State machine adds conceptual overhead
- **Edge cases** - Some scenarios may require workarounds

### Mitigations

1. **Custom workflows (future)** - Allow enterprise customers to customize states
2. **Escape hatches** - Admin can force state transitions when necessary
3. **Clear documentation** - User guides explain the workflow

## References

- [XState Documentation](https://xstate.js.org/)
- [Claude Context UX Spec - Slice Workflow](../claude-context-ux-spec.md)
- [Forge Method v4.1 - Approval Workflows](../the-forge-method.md)
