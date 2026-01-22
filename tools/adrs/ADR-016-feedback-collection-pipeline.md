# ADR-016: Feedback Collection Pipeline

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture Team
**Categories:** Data, Analytics, Machine Learning

## Context

Claude Context needs to capture structured feedback on AI session quality to:

1. **Improve context selection** - Learn which documents are most valuable
2. **Track effectiveness** - Measure first-pass acceptance rate, edit distance
3. **Identify patterns** - Surface common AI errors (hallucinations, constraint violations)
4. **Enable reporting** - Provide workspace-level analytics dashboards
5. **Feed model improvement** - Aggregate anonymized signals for Claude training

### Requirements

- Low-friction feedback capture (thumbs up/down + optional details)
- Structured error categorization
- Edit distance tracking between AI output and final version
- Real-time aggregation for dashboards
- Privacy-preserving export for model improvement
- Multi-dimensional quality scoring

## Decision

We will implement a multi-stage feedback collection pipeline:

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK COLLECTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   AI        │    │   Feedback   │    │   Queue      │    │  Store   │  │
│  │   Session   │───▶│   Capture    │───▶│   (BullMQ)   │───▶│  (PG)    │  │
│  │             │    │   UI/CLI     │    │              │    │          │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────┬─────┘  │
│                                                                    │        │
│                      ┌─────────────────────────────────────────────┘        │
│                      │                                                       │
│                      ▼                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   Real-time │    │   Batch      │    │   Analytics  │    │  Export  │  │
│  │   Aggregator│◀───│   Processor  │───▶│   Store      │───▶│  (S3)    │  │
│  │   (Redis)   │    │   (Cron)     │    │   (TimescaleDB)   │          │  │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feedback Data Model

```typescript
// packages/context/src/feedback/feedback.types.ts

export interface AISession {
  id: string;
  tenantId: string;
  workspaceId: string;
  sliceId?: string;
  userId: string;

  // Context used
  contextSnapshot: {
    documentIds: string[];
    tokenCount: number;
    compiledAt: Date;
  };

  // Session details
  query: string;
  responseId: string;
  startedAt: Date;
  endedAt: Date;

  // Feedback (filled after session)
  feedback?: SessionFeedback;
}

export interface SessionFeedback {
  sessionId: string;

  // Quick feedback
  rating: 'positive' | 'negative' | 'skipped';

  // Detailed feedback (on negative)
  errorCategories?: FeedbackErrorCategory[];
  missingContext?: string;
  comment?: string;

  // Quality dimensions (for reviewed outputs)
  qualityScores?: {
    accuracy: number;      // 0-100
    completeness: number;  // 0-100
    styleMatch: number;    // 0-100
  };

  // Output review
  outputReview?: {
    verdict: 'approved' | 'changes_requested' | 'rejected';
    editDistance?: number;  // 0-100 percentage
    issues: OutputIssue[];
  };

  submittedAt: Date;
  submittedBy: string;
}

export type FeedbackErrorCategory =
  | 'missing_context'      // Claude didn't know something it should have
  | 'wrong_context'        // Claude used outdated or irrelevant information
  | 'ignored_constraints'  // Claude didn't follow the requirements
  | 'hallucination'        // Claude made something up
  | 'style_mismatch'       // Format or tone wasn't right
  | 'other';

export type OutputIssue =
  | 'hallucination'
  | 'missed_requirement'
  | 'style_issue'
  | 'security_concern'
  | 'performance_concern';
```

### Database Schema

```sql
-- AI Sessions
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  slice_id UUID REFERENCES slices(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Context snapshot
  context_document_ids UUID[] NOT NULL,
  context_token_count INTEGER NOT NULL,
  context_compiled_at TIMESTAMPTZ NOT NULL,

  -- Session
  query_hash VARCHAR(64), -- SHA256 of query (privacy)
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Feedback
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID NOT NULL REFERENCES ai_sessions(id),

  -- Quick rating
  rating VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'skipped'

  -- Error details
  error_categories TEXT[],
  missing_context TEXT,
  comment TEXT,

  -- Quality scores
  accuracy_score INTEGER,
  completeness_score INTEGER,
  style_match_score INTEGER,

  -- Output review
  review_verdict VARCHAR(20),
  edit_distance INTEGER,
  output_issues TEXT[],

  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id)
);

-- Aggregated metrics (materialized for performance)
CREATE TABLE feedback_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  date DATE NOT NULL,

  -- Counts
  total_sessions INTEGER DEFAULT 0,
  positive_ratings INTEGER DEFAULT 0,
  negative_ratings INTEGER DEFAULT 0,
  skipped_ratings INTEGER DEFAULT 0,

  -- Rates
  first_pass_acceptance_rate NUMERIC(5,2),
  average_edit_distance NUMERIC(5,2),

  -- Error distribution
  error_category_counts JSONB,

  -- Quality averages
  avg_accuracy_score NUMERIC(5,2),
  avg_completeness_score NUMERIC(5,2),
  avg_style_match_score NUMERIC(5,2),

  UNIQUE(tenant_id, workspace_id, date)
);

-- Indexes
CREATE INDEX idx_ai_sessions_workspace ON ai_sessions(workspace_id);
CREATE INDEX idx_ai_sessions_slice ON ai_sessions(slice_id);
CREATE INDEX idx_ai_sessions_user ON ai_sessions(user_id);
CREATE INDEX idx_session_feedback_session ON session_feedback(session_id);
CREATE INDEX idx_feedback_metrics_lookup ON feedback_metrics_daily(tenant_id, workspace_id, date);
```

### Processing Pipeline

```typescript
// packages/context/src/feedback/feedback.processor.ts

import { Queue, Worker } from 'bullmq';

export const feedbackQueue = new Queue('feedback-processing');

// Job types
interface FeedbackJob {
  type: 'process_feedback';
  sessionId: string;
  feedback: SessionFeedback;
}

interface AggregationJob {
  type: 'aggregate_daily';
  tenantId: string;
  workspaceId: string;
  date: string;
}

// Worker
export const feedbackWorker = new Worker('feedback-processing', async (job) => {
  switch (job.data.type) {
    case 'process_feedback':
      await processFeedback(job.data);
      break;
    case 'aggregate_daily':
      await aggregateDaily(job.data);
      break;
  }
});

async function processFeedback(data: FeedbackJob) {
  // 1. Store feedback
  await feedbackRepository.create(data.feedback);

  // 2. Update real-time counters in Redis
  await redis.hincrby(
    `feedback:${data.feedback.workspaceId}:today`,
    data.feedback.rating,
    1
  );

  // 3. Update context document effectiveness scores
  if (data.feedback.rating === 'negative' && data.feedback.errorCategories) {
    await updateContextEffectiveness(data.sessionId, data.feedback);
  }

  // 4. Emit event for downstream consumers
  await eventBus.emit('feedback.submitted', {
    sessionId: data.sessionId,
    rating: data.feedback.rating,
    workspaceId: data.feedback.workspaceId,
  });
}

async function aggregateDaily(data: AggregationJob) {
  const sessions = await sessionRepository.findByDate(
    data.tenantId,
    data.workspaceId,
    data.date
  );

  const feedback = await feedbackRepository.findBySessionIds(
    sessions.map(s => s.id)
  );

  const metrics = calculateMetrics(sessions, feedback);

  await metricsRepository.upsertDaily(data.tenantId, data.workspaceId, data.date, metrics);
}
```

### Edit Distance Calculation

```typescript
// packages/context/src/feedback/edit-distance.ts

import { diffChars } from 'diff';

export function calculateEditDistance(original: string, revised: string): number {
  const changes = diffChars(original, revised);

  let totalChars = 0;
  let changedChars = 0;

  for (const change of changes) {
    totalChars += change.value.length;
    if (change.added || change.removed) {
      changedChars += change.value.length;
    }
  }

  // Return percentage changed (0-100)
  return Math.round((changedChars / totalChars) * 100);
}
```

### Privacy-Preserving Export

```typescript
// packages/context/src/feedback/feedback-export.ts

export interface AnonymizedFeedback {
  // No PII - only aggregated patterns
  contextCategories: string[];  // Document types used
  tokenBudgetUtilization: number;
  rating: string;
  errorCategories?: string[];
  qualityScores?: {
    accuracy: number;
    completeness: number;
    styleMatch: number;
  };
  editDistance?: number;
}

export async function exportAnonymizedFeedback(
  tenantId: string,
  dateRange: DateRange
): Promise<AnonymizedFeedback[]> {
  const feedback = await feedbackRepository.findByDateRange(tenantId, dateRange);

  return feedback.map(f => ({
    contextCategories: categorizeDocuments(f.session.contextDocumentIds),
    tokenBudgetUtilization: f.session.contextTokenCount / MAX_TOKENS,
    rating: f.rating,
    errorCategories: f.errorCategories,
    qualityScores: f.qualityScores,
    editDistance: f.outputReview?.editDistance,
  }));
}
```

## Consequences

### Positive

- **Low friction** - Quick thumbs up/down captures most feedback
- **Rich signals** - Detailed feedback available when needed
- **Real-time dashboards** - Redis counters enable live metrics
- **Privacy-preserving** - Anonymized export protects user data
- **Actionable insights** - Error categorization guides improvements

### Negative

- **Storage growth** - Session data accumulates over time
- **Processing overhead** - Queue and aggregation jobs add complexity
- **Cold start** - New workspaces have no baseline data

### Mitigations

1. **Data retention policy** - Archive sessions older than 90 days
2. **Sampling** - Process only a sample at high volume
3. **Synthetic baseline** - Provide industry benchmarks for new workspaces

## References

- [Claude Context UX Spec - Feedback Patterns](../claude-context-ux-spec.md)
- [Forge Method v4.1 - Analytics Packages](../the-forge-method.md)
- [BullMQ Documentation](https://docs.bullmq.io/)
