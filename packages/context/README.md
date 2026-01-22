# @forge/context

Context management package for Claude Context platform. Provides services for managing context graphs, work slices, context compilation, and feedback collection.

## Features

- **Context Graphs**: CRUD operations for context nodes and edges
- **Semantic Search**: Vector similarity search via pgvector
- **Work Slices**: Slice lifecycle management with state machine
- **Context Compilation**: Intelligent context assembly with token optimization
- **Feedback Collection**: Session tracking and quality metrics

## Installation

```bash
pnpm add @forge/context
```

## Usage

### Context Service

```typescript
import { ContextService } from '@forge/context';

const contextService = new ContextService(prisma, redis);

// Compile context for an AI session
const compiled = await contextService.compile({
  workspaceId: 'workspace-uuid',
  sliceId: 'slice-uuid',
  query: 'Help me implement the payment retry logic',
  tokenBudget: 100000,
});

console.log(compiled.compiledText);
console.log(`Used ${compiled.totalTokens} tokens`);
```

### Slice Service

```typescript
import { SliceService } from '@forge/context';

const sliceService = new SliceService(prisma);

// Create a slice
const slice = await sliceService.create({
  workspaceId: 'workspace-uuid',
  name: 'Payment Retry Logic',
  outcome: 'Achieve 23% recovery rate on soft declines',
  constraints: [
    'Use idempotency keys for all Stripe calls',
    'Maximum 3 retry attempts',
  ],
  acceptanceCriteria: [
    'Soft declines trigger retry within 15 minutes',
    'Hard declines immediately marked terminal',
  ],
});

// Transition state
await sliceService.transition(slice.id, 'start');
await sliceService.transition(slice.id, 'submit');
```

### Feedback Service

```typescript
import { FeedbackService } from '@forge/context';

const feedbackService = new FeedbackService(prisma, queue);

// Submit feedback
await feedbackService.submitFeedback({
  sessionId: 'session-uuid',
  rating: 'positive',
});

// Get workspace analytics
const analytics = await feedbackService.getAnalytics({
  workspaceId: 'workspace-uuid',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
});
```

## Architecture

```
src/
├── types/           # TypeScript interfaces and types
├── services/        # Business logic
│   ├── context.service.ts
│   ├── slice.service.ts
│   └── feedback.service.ts
├── repositories/    # Data access layer
├── errors/          # Typed error classes
└── utils/           # Utilities (token counting, etc.)
```

## Related ADRs

- [ADR-014: Context Graph Storage](../../tools/adrs/ADR-014-context-graph-storage.md)
- [ADR-015: Slice State Machine](../../tools/adrs/ADR-015-slice-state-machine.md)
- [ADR-016: Feedback Pipeline](../../tools/adrs/ADR-016-feedback-collection-pipeline.md)
