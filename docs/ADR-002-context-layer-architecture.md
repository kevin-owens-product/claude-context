# ADR-002: Context Layer Architecture

## Status
Proposed

## Context

Claude currently operates statelessly—each conversation starts fresh, with context injected via system prompts, uploaded files, or the limited "memory" feature. This creates several problems:

1. Users repeat themselves across sessions
2. Claude can't build genuine understanding over time
3. Context is assembled ad-hoc, not systematically
4. No learning from outcomes occurs

We need to decide how to architect a persistent context layer that enables continuous understanding.

## Options Considered

### Option A: Enhanced Memory (Incremental)
- Expand current memory feature
- Store more facts about users
- Better retrieval algorithms

**Pros:**
- Low implementation risk
- Backward compatible
- Users already understand "memory"

**Cons:**
- Facts ≠ understanding
- Doesn't address structural issues
- Keyword-based, not semantic
- No outcome learning
- Still feels like "searching notes" not "knowing"

### Option B: Conversation History Database
- Store all conversations
- Search/retrieve relevant past context
- Inject into new sessions

**Pros:**
- Rich source material
- Can find specific past discussions
- Relatively simple to implement

**Cons:**
- Raw conversations are noisy
- Retrieval relevance is challenging
- Doesn't extract learning, just stores data
- Privacy concerns with full history
- Context window limitations

### Option C: Semantic Context Graphs (Proposed)
- Multiple specialized graphs: Identity, Project, Interaction Memory, Outcome Ledger
- Continuously updated from interactions
- Semantic structure enables reasoning, not just retrieval

**Pros:**
- Understanding, not just facts
- Queryable at semantic level
- Supports different query types (who, what, why, when)
- Enables learning and pattern recognition
- Can be inspected and edited by users

**Cons:**
- Complex to build
- Schema design is critical and hard
- Requires sophisticated update logic
- More storage and computation

## Decision

We will adopt **Option C: Semantic Context Graphs**.

The context layer will consist of four primary graphs:

### 1. Identity Graph
**Purpose:** Understand who this user is
**Contains:**
- Demographics (as provided)
- Expertise areas and levels
- Communication preferences
- Working patterns
- Values and priorities
- Relationships (team members, collaborators)

**Update triggers:** All interactions
**Query examples:** 
- "What's this user's expertise level in Python?"
- "How does this user prefer to receive feedback?"

### 2. Project Graphs (Multiple)
**Purpose:** Understand what the user is working on
**Contains:**
- Goals and success criteria
- Constraints and requirements
- Key decisions and rationale
- Entities and their relationships
- Current status and blockers
- History of evolution

**Update triggers:** Project-related interactions
**Query examples:**
- "What are the security constraints for Project X?"
- "What decisions have we made about the data model?"

### 3. Interaction Memory
**Purpose:** Learn from how interactions go
**Contains:**
- Patterns that worked/didn't work
- Corrections made (Claude was wrong about X)
- Preferences expressed
- Implicit signals (user edited immediately = not quite right)
- Topic trajectories

**Update triggers:** End of interactions, explicit feedback
**Query examples:**
- "What mistakes have I made with this user?"
- "What patterns does this user follow when starting new projects?"

### 4. Outcome Ledger
**Purpose:** Track what happened to Claude's outputs
**Contains:**
- Artifacts created and their status
- Explicit feedback received
- Measured outcomes (if connected)
- Success/failure patterns
- Time-to-value metrics

**Update triggers:** Feedback signals, outcome observations
**Query examples:**
- "How successful have my code suggestions been for this user?"
- "What types of artifacts does this user find most valuable?"

## Consequences

### Positive
1. Claude can genuinely understand users over time
2. Context assembly becomes systematic, not ad-hoc
3. Different surfaces can share understanding
4. Users don't have to repeat themselves
5. Learning from outcomes becomes possible
6. Users can inspect and correct Claude's understanding

### Negative
1. Significant infrastructure investment
2. Privacy implications require careful handling
3. Context pollution is possible (need quality controls)
4. Update logic is complex to get right
5. Cross-graph querying adds latency

### Neutral
1. Changes how we think about Claude's "state"
2. Requires new UX for context transparency
3. May enable new product capabilities we haven't conceived

## Implementation Notes

### Storage
- Each graph stored as a combination of:
  - Structured data (entities, relationships)
  - Embeddings (for semantic search)
  - Full text (for retrieval)
- Encrypted at rest, user-owned
- Export/delete must be trivial

### Update Pipeline
```
Interaction ──► Extraction ──► Validation ──► Merge ──► Persist
                    │              │
                    ▼              ▼
              Claude processes   Quality checks
              raw signal         Conflict resolution
```

### Query Pipeline
```
Request ──► Intent Classification ──► Graph Selection ──► Query Execution
                                                              │
                                                              ▼
                                                      ┌───────────────┐
                                                      │ Context       │
                                                      │ Assembly      │
                                                      │ (relevance    │
                                                      │ ranking)      │
                                                      └───────────────┘
```

### Privacy Controls
- Granular opt-in/opt-out per graph
- Visibility controls (what Claude can "remember")
- Retention policies
- Right to deletion
- No cross-user aggregation without explicit consent

## Related Decisions
- ADR-001: Intent as Source of Truth
- ADR-004: Feedback Loop Design
- ADR-005: Observation Permissions

## References
- Personal Knowledge Graphs research
- Memory-augmented neural networks
- Knowledge graph completion techniques
