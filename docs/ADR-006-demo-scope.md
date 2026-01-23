# ADR-006: Demo Scope and Strategy

## Status
Proposed

## Context

To pitch the Living Software Platform vision to Anthropic, we need a working demonstration that shows the concepts in action—not just documentation. However, the full vision is too large to build in a reasonable timeframe.

We need to decide what scope of demo will be most compelling while remaining achievable.

## Options Considered

### Option A: Horizontal Demo (Breadth)
- Show a little of each component
- Intent Graph exists, Context exists, Living Artifacts exist, Feedback exists
- Each component is minimal but functional

**Pros:**
- Shows complete vision
- Demonstrates integration
- Addresses "how does it all fit together?"

**Cons:**
- Nothing is deep enough to be impressive
- Risk of "vaporware" perception
- May raise more questions than it answers

### Option B: Vertical Demo (Depth)
- Pick one use case
- Implement it end-to-end with full depth
- Show the complete experience for one scenario

**Pros:**
- Actually impressive/functional
- Proves the concept works
- Users can really use it

**Cons:**
- May not convey the full vision
- "That's just a [specific tool]" perception risk
- Doesn't show cross-surface potential

### Option C: Hybrid Demo (Proposed)
- Deep implementation of Claude Context (the foundation)
- Medium implementation of Intent Graph for one domain
- Living Artifacts working for that domain
- Light demonstration of other capabilities

**Pros:**
- Shows depth where it matters (Context)
- Proves the core concept
- Sketches the broader vision
- Achievable timeline

**Cons:**
- Some components are "mockups"
- Risk of uneven quality perception
- More complex to build

## Decision

We will build **Option C: Hybrid Demo** with the following scope:

### Demo Scenario

**"Building a SaaS Dashboard Feature"**

A developer named Alex is building a new analytics dashboard feature for their SaaS product. They work across multiple sessions and tools, and Claude maintains continuity throughout.

### Demo Storyline

```
┌────────────────────────────────────────────────────────────────────────┐
│                         DEMO STORYLINE                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Scene 1: Initial Intent Capture                                       │
│  ─────────────────────────────                                         │
│  Alex describes what they want to build in natural language.           │
│  Claude captures this as an Intent Graph, showing:                     │
│    • Goals extracted                                                   │
│    • Constraints identified                                            │
│    • Entities recognized                                               │
│    • Clarifying questions asked                                        │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Intent capture from conversation                                  │
│    ✓ Intent Graph visualization                                        │
│    ✓ Clarification dialogue                                            │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 2: Initial Artifact Creation                                    │
│  ─────────────────────────────────                                     │
│  Based on the Intent Graph, Claude generates:                          │
│    • A React component for the dashboard                               │
│    • API schema for data endpoints                                     │
│    • Test cases from constraints                                       │
│                                                                        │
│  These are Living Artifacts—connected to the Intent Graph.             │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Intent → Code synthesis                                           │
│    ✓ Living Artifact creation                                          │
│    ✓ Provenance visible ("why does this code exist?")                  │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 3: Session Break and Continuity                                 │
│  ─────────────────────────────────────                                 │
│  Alex closes the session. Time passes (simulated).                     │
│  Alex returns and says: "Let's continue on the dashboard."             │
│                                                                        │
│  Claude Context activates:                                             │
│    • Recognizes the project                                            │
│    • Shows current state                                               │
│    • Knows what was decided                                            │
│    • Ready to continue                                                 │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Cross-session continuity                                          │
│    ✓ Project recognition                                               │
│    ✓ State restoration                                                 │
│    ✓ No "remind me what we're doing"                                   │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 4: Intent Evolution                                             │
│  ────────────────────────                                              │
│  Alex says: "Actually, we need to support real-time updates."          │
│                                                                        │
│  Claude:                                                               │
│    • Updates the Intent Graph (adds constraint)                        │
│    • Shows impact on existing artifacts                                │
│    • Proposes code changes                                             │
│    • Regenerates affected components                                   │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Intent modification                                               │
│    ✓ Change impact analysis                                            │
│    ✓ Artifact evolution (not just replacement)                         │
│    ✓ Intent version tracking                                           │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 5: Cross-Surface Work (Light)                                   │
│  ───────────────────────────────────                                   │
│  Alex switches from Chat to "Code" mode (simulated Claude Code).       │
│  The same context is available.                                        │
│  Changes made in Code mode update the shared state.                    │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Context flows across surfaces                                     │
│    ✓ Unified understanding                                             │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 6: Feedback Integration (Light)                                 │
│  ─────────────────────────────────────                                 │
│  Alex marks one of the generated tests as "this is what I need."       │
│  Claude acknowledges and shows how this shapes future suggestions.     │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Feedback capture                                                  │
│    ✓ Learning demonstration                                            │
│                                                                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                        │
│  Scene 7: Semantic Query                                               │
│  ───────────────────────                                               │
│  Alex asks: "What constraints have we defined for this dashboard?"     │
│                                                                        │
│  Claude queries the Intent Graph and answers comprehensively:          │
│    • Lists all constraints                                             │
│    • Shows which artifacts implement each                              │
│    • Notes any constraints not yet addressed                           │
│                                                                        │
│  Demonstration Points:                                                 │
│    ✓ Semantic querying of Intent Graph                                 │
│    ✓ Provenance tracking                                               │
│    ✓ "Understanding" not just "searching"                              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Implementation Depth

| Component | Depth | Notes |
|-----------|-------|-------|
| **Claude Context Store** | Full | Core infrastructure—must work properly |
| **Identity Graph** | Medium | Basic user recognition and preferences |
| **Project Graph** | Full | Complete for demo scenario |
| **Intent Graph Schema** | Full | Well-designed schema for dashboard domain |
| **Intent Capture** | Full | From conversation to graph |
| **Intent Visualization** | Full | Clear, interactive display |
| **Artifact Generation** | Full | Actual working code from intent |
| **Living Artifact Store** | Full | Persistence and versioning |
| **Artifact Evolution** | Full | Handle intent changes |
| **Cross-Session Continuity** | Full | Flagship feature |
| **Surface Switching** | Light | Simulated, not full integration |
| **Feedback Collection** | Light | Basic explicit feedback |
| **Observation** | Minimal | Mentioned, not demonstrated |
| **Proactive Suggestions** | Minimal | One scripted example |

### Technical Architecture for Demo

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEMO ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                          ┌─────────────┐                               │
│                          │   Demo UI   │                               │
│                          │   (React)   │                               │
│                          └──────┬──────┘                               │
│                                 │                                      │
│          ┌──────────────────────┼──────────────────────┐               │
│          │                      │                      │               │
│          ▼                      ▼                      ▼               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│  │    Chat      │     │   Canvas     │     │    Code      │           │
│  │   Surface    │     │   Surface    │     │   Surface    │           │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘           │
│         │                    │                    │                    │
│         └────────────────────┼────────────────────┘                    │
│                              │                                         │
│                              ▼                                         │
│                    ┌──────────────────┐                                │
│                    │  Demo Backend    │                                │
│                    │    (FastAPI)     │                                │
│                    └────────┬─────────┘                                │
│                             │                                          │
│         ┌───────────────────┼───────────────────┐                      │
│         │                   │                   │                      │
│         ▼                   ▼                   ▼                      │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  Context   │    │   Intent     │    │   Artifact   │               │
│  │   Store    │    │    Graph     │    │    Store     │               │
│  │ (Postgres  │    │   (Neo4j/    │    │  (Postgres   │               │
│  │ + Redis)   │    │   Memory)    │    │  + Storage)  │               │
│  └────────────┘    └──────────────┘    └──────────────┘               │
│                             │                                          │
│                             ▼                                          │
│                    ┌──────────────────┐                                │
│                    │  Claude API      │                                │
│                    │  (Anthropic)     │                                │
│                    └──────────────────┘                                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive
1. Demonstrates core value proposition clearly
2. Achievable in reasonable timeframe (4-6 weeks estimate)
3. Shows both depth and vision
4. Real working software, not mockups
5. Specific enough to be compelling

### Negative
1. Some components are shallow (acknowledged)
2. Demo scenario may not resonate with all audiences
3. Technical complexity still significant
4. Risk of over-scoping

### Neutral
1. Requires careful demo scripting
2. May need multiple versions for different audiences
3. Could be extended later if well-architected

## Implementation Notes

### Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Core Infrastructure** | 2 weeks | Context Store, basic Project Graph |
| **Phase 2: Intent System** | 2 weeks | Intent Graph schema, capture, visualization |
| **Phase 3: Artifact System** | 1 week | Living Artifacts, generation, versioning |
| **Phase 4: Integration** | 1 week | Demo UI, polish, script |

### Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Demo UI | React + TypeScript | Modern, familiar |
| Backend | FastAPI (Python) | Rapid development, good typing |
| Context Store | PostgreSQL + pgvector | Structured + vector search |
| Session State | Redis | Fast, ephemeral |
| Intent Graph | In-memory + JSON | Simple for demo |
| Artifact Store | PostgreSQL + S3 | Familiar, scalable pattern |
| LLM Integration | Anthropic API | Obviously |

### Demo Script Structure

1. **Cold Open** (2 min)
   - Show current Claude limitation (context dies)
   - Set up the problem

2. **The Vision** (3 min)
   - Explain Living Software concept
   - What we're about to show

3. **Live Demo** (15 min)
   - Walk through the 7 scenes
   - Allow some ad-lib/interaction

4. **Architecture Peek** (5 min)
   - Show Intent Graph visualization
   - Show Context Store contents
   - Show Artifact connections

5. **Scaling the Vision** (5 min)
   - How this extends to full platform
   - What's not shown but designed

## Related Decisions
- All other ADRs inform this demo scope

## Open Questions
1. Should we simulate "time passing" or actually wait between sessions?
2. How much live coding vs. pre-built artifacts?
3. Should we show failure cases (what happens when intent is ambiguous)?
4. Multiple demo versions for different audiences?
