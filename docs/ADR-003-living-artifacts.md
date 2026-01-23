# ADR-003: Living Artifacts

## Status
Proposed

## Context

Currently, when Claude creates an artifact (code, document, diagram, etc.), it has a brief existence within the conversation and then "dies" when exported. The artifact leaves Claude's world and becomes a static file that Claude has no further connection to.

This creates problems:
1. Claude can't answer questions about artifacts it created
2. Evolution requires re-explaining context
3. No feedback loop from artifact usage
4. Artifacts created in one surface (chat) aren't available in another (code)

We need to decide how artifacts should behave in an AI-native paradigm.

## Options Considered

### Option A: Enhanced Export (Incremental)
- Better export formats
- Include metadata/comments
- Maybe store a copy in conversation history

**Pros:**
- Simple to implement
- Doesn't change mental model
- Backward compatible

**Cons:**
- Doesn't solve the fundamental problem
- Artifacts still die on export
- No evolution capability
- No feedback possibility

### Option B: Artifact Storage Service
- Store all artifacts in a cloud service
- Reference by ID in future conversations
- Version history

**Pros:**
- Artifacts persist
- Can retrieve in future sessions
- Version tracking possible

**Cons:**
- Still passive storage
- No semantic connection maintained
- Evolution still requires manual effort
- Storage costs could be significant

### Option C: Living Artifacts with Active Connection (Proposed)
- Artifacts maintain connection to Claude's understanding
- Can be queried, evolved, and observed
- Bidirectional relationship: artifact ↔ intent

**Pros:**
- True persistence with understanding
- Natural evolution workflow
- Feedback loops possible
- Cross-surface availability
- Can answer "what does this do?" long after creation

**Cons:**
- Complex to implement
- Storage and sync challenges
- Need to handle offline/exported copies
- Version management is non-trivial

## Decision

We will adopt **Option C: Living Artifacts with Active Connection**.

Artifacts become first-class citizens in the Living Software Platform with the following properties:

### Artifact Properties

| Property | Description |
|----------|-------------|
| **Identity** | Persistent, unique identifier (survives exports) |
| **Intent Link** | Connection to the Intent Graph nodes that define it |
| **Version History** | Tracked at intent level, not just content level |
| **Feedback Channel** | Can receive signals about usage/outcomes |
| **Cross-Surface** | Available from any Claude surface |
| **Evolution Ready** | Can be modified through conversation |

### Artifact Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ARTIFACT LIFECYCLE                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐          │
│  │ Create  │───►│ Persist │───►│  Live   │───►│ Evolve  │──┐       │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │       │
│       │                             │              │        │       │
│       │                             │              │        │       │
│       ▼                             ▼              ▼        │       │
│  ┌─────────┐                  ┌─────────┐    ┌─────────┐   │       │
│  │ Intent  │                  │ Observe │───►│  Learn  │───┘       │
│  │ Capture │                  └─────────┘    └─────────┘           │
│  └─────────┘                        │                               │
│                                     │                               │
│                                     ▼                               │
│                              ┌─────────────┐                        │
│                              │  Feedback   │                        │
│                              │   Signals   │                        │
│                              └─────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Artifact Types

| Type | Examples | Special Considerations |
|------|----------|----------------------|
| **Code Artifacts** | Functions, components, scripts | Execution environment links |
| **Document Artifacts** | Reports, emails, specifications | Format preservation |
| **Visual Artifacts** | Diagrams, charts, designs | Rendering requirements |
| **Data Artifacts** | Schemas, datasets, configs | Validation rules |
| **Composite Artifacts** | Applications, systems | Dependency management |

## Consequences

### Positive
1. "What does this code do?" works months later
2. "Update this to handle X" continues naturally
3. Feedback from deployment improves future artifacts
4. Cross-surface: create in chat, refine in Claude Code
5. Users build a portfolio of living work, not dead files

### Negative
1. Storage requirements increase significantly
2. Sync with exported copies is hard
3. "Which version is canonical?" questions arise
4. Need to handle artifacts that reference deleted intents
5. Performance implications of maintaining connections

### Neutral
1. Changes mental model of "files" vs "artifacts"
2. Requires clear UX for artifact management
3. Export becomes "snapshot" rather than "transfer"

## Implementation Notes

### Artifact Storage Schema

```typescript
interface LivingArtifact {
  // Identity
  id: UUID;
  type: ArtifactType;
  name: string;
  
  // Content
  content: ArtifactContent;
  contentHash: string;
  
  // Intent Connection
  intentGraphId: UUID;
  intentNodeIds: UUID[];
  
  // Version Tracking
  version: number;
  intentVersion: number;
  history: ArtifactVersion[];
  
  // Lifecycle
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAccessedAt: Timestamp;
  
  // Feedback
  feedbackSignals: FeedbackSignal[];
  outcomeLinks: OutcomeLink[];
  
  // Cross-Surface
  surfaceOrigin: Surface;
  surfaceAccess: Surface[];
  
  // Export Tracking
  exports: ExportRecord[];
}
```

### Intent Connection

Each artifact links to specific nodes in the Intent Graph:
- Goals it serves
- Constraints it respects
- Entities it implements
- Behaviors it executes

When intent changes, connected artifacts are flagged for potential re-synthesis.

### Export Handling

When an artifact is exported:
1. A snapshot is created with embedded artifact ID
2. The artifact knows it has been exported
3. If the exported copy is later re-imported, it reconnects
4. Divergent copies are handled as branches (like git)

### Cross-Surface Protocol

```
Surface A                    Artifact Store                    Surface B
    │                              │                               │
    │  Create artifact             │                               │
    │─────────────────────────────►│                               │
    │                              │                               │
    │                              │◄────── Query for artifacts ───│
    │                              │                               │
    │                              │─────── Return artifact ──────►│
    │                              │                               │
    │                              │◄────── Evolve request ────────│
    │                              │                               │
    │◄─── Notify of update ────────│                               │
```

## Related Decisions
- ADR-001: Intent as Source of Truth
- ADR-002: Context Layer Architecture
- ADR-004: Feedback Loop Design

## Open Questions
1. How long do artifacts live without access?
2. How to handle artifacts whose intents are deleted?
3. What's the sync strategy with external systems (GitHub, Google Docs)?
4. Should users be able to "freeze" an artifact (stop living)?
