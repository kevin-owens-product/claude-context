# ADR-004: Feedback Loop Design

## Status
Proposed

## Context

Claude currently operates in a fire-and-forget mode: it produces outputs, but rarely learns whether those outputs achieved their intended purpose. This creates several problems:

1. Claude can't improve for specific users based on what works for them
2. Aggregate learning is limited to RLHF on broad preferences
3. No mechanism to catch systematic errors with specific users
4. Users can't tell Claude "that worked" or "that didn't work" in a durable way

We need to design how feedback flows through the system to enable continuous improvement.

## Options Considered

### Option A: Explicit Feedback Only
- Thumbs up/down on responses
- Optional comments
- No implicit signals

**Pros:**
- Clear user intent
- Low implementation complexity
- Privacy-friendly (users control what's sent)

**Cons:**
- Most interactions get no feedback
- Biased toward strong opinions
- Doesn't capture nuance
- Missing outcome data

### Option B: Implicit Signals Only
- Track user behavior after Claude's response
- Edits, abandonment, continued use, etc.
- Infer quality from behavior

**Pros:**
- Captures all interactions
- No user effort required
- More naturalistic data

**Cons:**
- Signals are ambiguous
- Privacy concerns
- Can be gamed/misinterpreted
- Doesn't capture outcomes beyond session

### Option C: Multi-Signal Feedback System (Proposed)
- Explicit feedback for direct user input
- Implicit signals for behavioral inference
- Outcome measurement for deployed artifacts
- Aggregated learning with privacy preservation

**Pros:**
- Comprehensive signal capture
- Balances user control with passive learning
- Enables outcome tracking
- Supports personalization and aggregate improvement

**Cons:**
- Complex to implement
- Privacy design is critical
- Signal weighting is non-trivial
- Storage and processing costs

## Decision

We will adopt **Option C: Multi-Signal Feedback System**.

### Signal Types

| Signal Type | Source | Latency | Confidence | Privacy Level |
|-------------|--------|---------|------------|---------------|
| **Explicit Rating** | User thumbs up/down | Immediate | High | User-initiated |
| **Explicit Comment** | User text feedback | Immediate | High | User-initiated |
| **Immediate Edit** | User modifies output | Seconds | Medium | Implicit |
| **Abandonment** | User stops mid-task | Minutes | Low | Implicit |
| **Retry Pattern** | User rephrases request | Minutes | Medium | Implicit |
| **Continued Use** | User keeps using artifact | Hours/Days | Medium | Implicit |
| **Outcome Metric** | Connected system data | Hours/Days | High | Integration-required |
| **Long-term Edit** | User modifies later | Days/Weeks | Medium | Artifact-linked |

### Feedback Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK FLOW                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     SIGNAL COLLECTION                            │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Explicit │  │ Implicit │  │ Outcome  │  │ Artifact │        │ │
│  │  │ Ratings  │  │ Behavior │  │ Metrics  │  │ Tracking │        │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │ │
│  │       │              │             │             │              │ │
│  └───────┼──────────────┼─────────────┼─────────────┼──────────────┘ │
│          │              │             │             │                │
│          └──────────────┴──────┬──────┴─────────────┘                │
│                                │                                      │
│                                ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    SIGNAL PROCESSING                             │ │
│  │                                                                  │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │ │
│  │  │ Normalize  │  │  Combine   │  │   Weight   │                 │ │
│  │  │  Signals   │──►│  Signals   │──►│  by Type   │                 │ │
│  │  └────────────┘  └────────────┘  └────────────┘                 │ │
│  │                                         │                        │ │
│  └─────────────────────────────────────────┼────────────────────────┘ │
│                                            │                          │
│                    ┌───────────────────────┼───────────────────────┐  │
│                    │                       │                       │  │
│                    ▼                       ▼                       ▼  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐
│  │   USER LEARNING      │  │  INTERACTION MEMORY  │  │   AGGREGATE    │
│  │                      │  │                      │  │   LEARNING     │
│  │ • Personalization    │  │ • Pattern storage    │  │                │
│  │ • Preference update  │  │ • Context update     │  │ • Model tuning │
│  │ • Outcome tracking   │  │ • Mistake tracking   │  │ • Broad improve│
│  └──────────────────────┘  └──────────────────────┘  └────────────────┘
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Feedback Applications

| Application | Input Signals | Output |
|-------------|---------------|--------|
| **Personalization** | All user signals | Adjusted behavior for user |
| **Mistake Tracking** | Edits, corrections, complaints | "Don't do X with this user" |
| **Style Learning** | Edit patterns, explicit prefs | Communication style adjustment |
| **Domain Calibration** | Corrections, outcome data | Confidence adjustment per domain |
| **Artifact Quality** | Continued use, outcomes | Quality prediction for future |
| **Aggregate Training** | Anonymized patterns | Model improvement |

## Consequences

### Positive
1. Claude gets measurably better for individual users
2. Systematic errors get caught and corrected
3. Outcome data enables "what actually works" learning
4. Personalization goes beyond stated preferences
5. Users can shape Claude's behavior through natural use

### Negative
1. Privacy implications require careful handling
2. Signal weighting is imperfect—may amplify biases
3. Implicit signals can be misinterpreted
4. Storage and processing costs are significant
5. User trust could be damaged if not handled transparently

### Neutral
1. Requires clear privacy controls and transparency
2. Changes how we think about model improvement
3. Enables new product capabilities (outcome guarantees)

## Implementation Notes

### Signal Collection

**Explicit Signals:**
```typescript
interface ExplicitFeedback {
  type: 'rating' | 'comment';
  value: number | string;
  targetId: UUID;  // Response or artifact
  timestamp: Timestamp;
  context: InteractionContext;
}
```

**Implicit Signals:**
```typescript
interface ImplicitSignal {
  type: 'edit' | 'abandon' | 'retry' | 'continue';
  timing: Duration;
  targetId: UUID;
  changeDetails?: Diff;  // For edits
  retryQuery?: string;   // For retries
  timestamp: Timestamp;
}
```

**Outcome Signals:**
```typescript
interface OutcomeSignal {
  artifactId: UUID;
  metricType: string;
  value: number;
  timestamp: Timestamp;
  source: 'integration' | 'user_report';
}
```

### Privacy Controls

1. **Explicit consent** for implicit signal collection
2. **Granular opt-out** per signal type
3. **Transparency dashboard** showing what's collected
4. **Anonymization** for aggregate learning
5. **Retention limits** configurable by user
6. **No cross-user correlation** without explicit features

### Signal Weighting

Initial weights (tunable):

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Explicit positive | 1.0 | Clear signal |
| Explicit negative | 1.5 | Negative feedback often under-reported |
| Immediate edit | 0.6 | Could be refinement, not correction |
| Abandonment | 0.3 | Ambiguous—many causes |
| Retry | 0.7 | Suggests dissatisfaction |
| Continued use | 0.4 | Positive but noisy |
| Outcome metric | 0.9 | High-quality signal |

### Feedback Latency Requirements

| Loop | Latency Target | Mechanism |
|------|----------------|-----------|
| Immediate personalization | <1 session | Context injection |
| Pattern learning | <10 sessions | Interaction Memory update |
| Outcome integration | <24 hours | Background processing |
| Aggregate model improvement | Weeks | Training pipeline |

## Related Decisions
- ADR-002: Context Layer Architecture
- ADR-005: Observation Permissions
- ADR-003: Living Artifacts

## Open Questions
1. How to handle conflicting signals (user says good, then heavily edits)?
2. What's the decay rate for old feedback signals?
3. How to prevent feedback gaming?
4. How to explain personalization to users ("Why did Claude do X?")?
