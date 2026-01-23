# Living Software Platform Architecture

## Executive Summary

This document describes a fundamental reimagining of Claude's product architecture—moving from a collection of stateless interfaces to an integrated platform for **Living Software**.

The core insight: Claude's current products are organized around **interfaces** (chat, CLI, desktop) inherited from the pre-AI paradigm. Users experience Claude as brilliant but amnesiac—powerful in moments, but unable to truly *know* them or their work.

The solution: Build infrastructure that makes Claude **continuous**. The companies that win the AI era will be those who build platforms for persistent, evolving AI relationships—not better chatbots.

---

## Current State Analysis

### Claude's Existing Product Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Claude.ai  │  │ Claude Code │  │   Cowork    │  │     API     │
│   (Chat)    │  │   (CLI)     │  │  (Desktop)  │  │ (Developer) │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Claude (Stateless)  │
                    │   Each session fresh  │
                    │   Context injected    │
                    └───────────────────────┘
```

### Problems with Current Architecture

| Problem | Impact | Root Cause |
|---------|--------|------------|
| Context dies at session boundaries | Users repeat themselves; Claude can't build understanding | No persistent semantic layer |
| Products organized by interface | Fragmented experience; artificial boundaries | Legacy paradigm thinking |
| Claude is purely reactive | Misses opportunities to help proactively | No observation capability |
| No feedback loops | Claude can't learn from outcomes | One-way information flow |
| Artifacts are dead ends | Created work leaves Claude's world | No persistent artifact layer |
| Projects are containers, not workspaces | Store context but don't actively use it | Passive storage model |
| Memory is a band-aid | Stores facts, not understanding | Wrong abstraction level |

---

## Proposed Architecture

### High-Level System View

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SURFACES                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Converse │ │  Build   │ │ Automate │ │ Observe  │ │  Canvas  │      │
│  │  (Chat)  │ │  (Code)  │ │(Workflow)│ │(Feedback)│ │ (Intent) │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └────────────┴────────────┴────────────┴────────────┘            │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                        CLAUDE CONTEXT                                    │
│                   (Continuous Intelligence Layer)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  • Cross-session continuity    • Proactive observation           │  │
│  │  • Semantic understanding      • Outcome tracking                │  │
│  │  • Pattern recognition         • Learning & adaptation           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Identity   │  │   Project   │  │ Interaction │  │   Outcome   │    │
│  │   Graph     │  │   Graphs    │  │   Memory    │  │   Ledger    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          INTENT LAYER                                    │
│                    (Persistent Source of Truth)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        INTENT GRAPH                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│  │
│  │  │  Goals  │  │Constrai-│  │Entities │  │Behaviors│  │ Context ││  │
│  │  │         │  │  nts    │  │         │  │         │  │         ││  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                       SYNTHESIS ENGINE                                   │
│                    (Code as Compiled Output)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Intent Graph ──► Code Generation ──► Multi-target Output        │  │
│  │                                                                   │  │
│  │  • On-demand synthesis    • Continuous re-synthesis              │  │
│  │  • Provenance tracking    • Optimization selection               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                        LIVING RUNTIME                                    │
│                    (Continuous Evolution)                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  • Feedback ingestion     • Anomaly detection                    │  │
│  │  • Real-time adaptation   • Suggested evolutions                 │  │
│  │  • Continuous deployment  • Outcome measurement                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Claude Context (The Foundation)

**Purpose**: The infrastructure layer that enables all other capabilities. Not a user-facing product itself, but the substrate everything runs on.

**Components**:

#### Identity Graph
- Who is this user?
- What do they care about?
- How do they think and communicate?
- What are their expertise areas?
- Evolves with every interaction

#### Project Graphs
- For each thing the user is working on
- Goals, constraints, entities, decisions
- History of changes and why
- Connected to relevant artifacts
- Can span multiple "projects" in current sense

#### Interaction Memory
- Not just "what was said"
- "What was learned" from each interaction
- Patterns recognized
- Preferences inferred
- Mistakes to avoid

#### Outcome Ledger
- What did Claude help create?
- What happened to it?
- Success/failure signals
- User feedback (explicit and implicit)

**Key Properties**:
- Queryable by Claude across all surfaces
- Continuously updated from all interactions
- User can inspect and edit (transparency)
- Portable (user owns their context)
- Privacy-preserving by design

---

### 2. Intent Layer

**Purpose**: The actual source of truth for what software should do. Not code. Not traditional specifications. A rich semantic representation.

**The Intent Graph** contains:

#### Goals
- What outcomes should this software produce?
- Business objectives
- User needs being served
- Success criteria

#### Constraints
- What must never happen?
- Security requirements
- Compliance needs
- Performance boundaries
- Resource limits

#### Entities
- Core domain concepts
- Relationships between them
- Validation rules
- State machines

#### Behaviors
- What should happen when X occurs?
- User journeys
- System responses
- Edge case handling

#### Context
- Why do we want this?
- Business reality
- Historical decisions
- Trade-off rationales

**Key Properties**:
- Versioned at the intent level, not code level
- Queryable ("what handles authentication failures?")
- Collaborative (multiple stakeholders can contribute)
- Executable (can generate working software)

---

### 3. Synthesis Engine

**Purpose**: Transform Intent Graphs into working code. Code is a projection of intent, not the source.

**Capabilities**:

#### On-Demand Generation
- Code synthesized when needed
- Not stored as primary artifact
- Regenerated as needed

#### Multi-Target Output
- Same intent → Python, JavaScript, whatever
- Different deployment targets from same source
- Optimized for different environments

#### Continuous Re-Synthesis
- As Intent Graph evolves, code regenerates
- As AI capabilities improve, code gets "better"
- No manual refactoring needed

#### Provenance Tracking
- Every line knows which intents it serves
- Can answer "why does this code exist?"
- Can identify unused/obsolete code

---

### 4. Living Artifacts

**Purpose**: Artifacts that maintain connection to Claude and can evolve.

**Lifecycle**:
```
Creation → Persistence → Evolution → Observation → Learning
    │          │            │            │            │
    └──────────┴────────────┴────────────┴────────────┘
                    Always Connected
```

**Properties**:
- Have persistent identifiers
- Versioned at intent level
- Can receive feedback signals
- Can be queried ("what does this do?")
- Can be evolved ("handle edge case X")
- Can be deployed while maintaining connection

---

### 5. Active Observation

**Purpose**: Claude learns by watching, not just responding.

**Observation Types**:

| Type | What's Observed | Permission Level |
|------|-----------------|------------------|
| Interaction | User behavior in Claude interfaces | Default |
| File System | Changes to files Claude helped create | Explicit opt-in |
| Repository | Code changes, CI/CD results | Integration required |
| Application | Usage patterns in deployed software | Deep integration |
| Outcome | Business metrics, user feedback | Custom integration |

**Capabilities**:
- Pattern recognition across interactions
- Proactive suggestion generation
- Anomaly detection
- Progress tracking

---

### 6. Feedback Loops

**Purpose**: Claude learns from outcomes, not just instructions.

**The Feedback Cycle**:
```
Intent ──► Claude Helps ──► Artifact Created ──► Deployed/Used
   ▲                                                    │
   │                                                    ▼
   └──── Learning ◄──── Outcome Observed ◄──── Signals Collected
```

**Signal Types**:
- Explicit: "This worked/didn't work", ratings, comments
- Implicit: User immediately edited, abandoned, kept using
- Measured: Performance metrics, error rates, user engagement
- Inferred: Patterns across many interactions

---

## Surface Evolution

### Current → Proposed Mapping

| Current | Proposed | Key Changes |
|---------|----------|-------------|
| Claude.ai Chat | **Converse** | Home shows projects, suggestions, artifacts; Chat is one mode |
| Claude Code | **Build** | Maintains living codebase model; Understands intent, not just code |
| Cowork | **Automate** | Notices patterns proactively; Suggests systematization |
| Projects | **Workspaces** | Active, not containers; Cross-surface continuity |
| Artifacts | **Living Artifacts** | Persistent; Evolvable; Connected |
| Memory | **Claude Context** | Understanding, not facts; Semantic, not keyword |
| — (new) | **Canvas** | Spatial intent editing; Collaborative; Source of truth |
| — (new) | **Observe** | Feedback collection; Outcome tracking; Learning surface |

---

## Data Flow Architecture

### Write Path (User → System)

```
User Interaction
       │
       ▼
┌──────────────┐
│   Surface    │ (Converse, Build, Automate, etc.)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Claude Core  │ (LLM Processing)
└──────┬───────┘
       │
       ├──────────────────────────────────┐
       ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│Claude Context│                  │ Intent Layer │
│   Update     │                  │   Update     │
└──────┬───────┘                  └──────┬───────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│  Identity/   │                  │    Intent    │
│  Project     │                  │    Graph     │
│  Graphs      │                  │   Storage    │
└──────────────┘                  └──────────────┘
```

### Read Path (System → Claude)

```
┌──────────────┐
│   Surface    │ (User starts interaction)
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│            Context Assembly                   │
│  ┌─────────────────────────────────────────┐ │
│  │ 1. Identity Graph (who is this user?)   │ │
│  │ 2. Relevant Project Graphs              │ │
│  │ 3. Interaction Memory (patterns)        │ │
│  │ 4. Outcome Ledger (what worked)         │ │
│  │ 5. Active Intent Graphs                 │ │
│  │ 6. Current Artifact States              │ │
│  └─────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
           ┌──────────────┐
           │ Claude Core  │ (Rich context available)
           └──────────────┘
```

### Feedback Path (Outcomes → Learning)

```
Deployed Artifact / User Action
           │
           ▼
   ┌──────────────┐
   │   Signals    │ (Metrics, feedback, behavior)
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Observation │ (Pattern detection)
   │    Engine    │
   └──────┬───────┘
          │
          ├─────────────────────┐
          ▼                     ▼
   ┌──────────────┐     ┌──────────────┐
   │Claude Context│     │ Proactive    │
   │   Update     │     │ Suggestions  │
   └──────────────┘     └──────────────┘
```

---

## Security & Privacy Architecture

### Data Classification

| Data Type | Sensitivity | Storage | User Control |
|-----------|-------------|---------|--------------|
| Identity Graph | High | Encrypted, user-owned | Full export, delete |
| Project Graphs | High | Encrypted, user-owned | Full export, delete |
| Intent Graphs | High | Encrypted, user-owned | Full export, delete |
| Interaction Memory | Medium | Anonymizable | View, edit, delete |
| Outcome Ledger | Medium | Aggregatable | View, export |
| Observation Data | High | Explicit consent | Granular opt-out |

### Permission Model

```
┌─────────────────────────────────────────────────────────────┐
│                    User Consent Layers                       │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Basic (Default)                                    │
│   • Interaction memory within sessions                      │
│   • Basic identity graph                                    │
│   • Standard artifact creation                              │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Enhanced (Opt-in)                                  │
│   • Cross-session memory                                    │
│   • Project graph persistence                               │
│   • Feedback collection                                     │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Active Observation (Explicit)                      │
│   • File system observation                                 │
│   • Repository integration                                  │
│   • Application monitoring                                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: Deep Integration (Custom)                          │
│   • Business metrics connection                             │
│   • Third-party integrations                                │
│   • Custom observation hooks                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Claude Context)
- Build the context storage layer
- Implement Identity Graph basics
- Add Project Graph structure
- Create context assembly pipeline
- Retrofit to existing surfaces

### Phase 2: Living Artifacts
- Artifact persistence layer
- Versioning system
- Cross-session artifact access
- Basic evolution capabilities

### Phase 3: Intent Layer (MVP)
- Intent Graph schema
- Basic intent capture
- Simple synthesis pipeline
- Canvas surface (basic)

### Phase 4: Feedback Loops
- Outcome Ledger implementation
- Explicit feedback collection
- Implicit signal detection
- Learning integration

### Phase 5: Active Observation
- Permission system
- File system hooks
- Repository integration
- Proactive suggestion engine

### Phase 6: Full Living Software
- Complete Intent→Code synthesis
- Continuous re-synthesis
- Living Runtime integration
- Enterprise features

---

## Success Metrics

### User Experience Metrics
- Time-to-value for returning users (should decrease)
- Repeat context provision (should approach zero)
- Cross-session task completion (should increase)
- User-reported understanding accuracy

### Technical Metrics
- Context assembly latency (<100ms target)
- Context relevance score (ML-measured)
- Artifact evolution frequency
- Feedback signal capture rate

### Business Metrics
- User retention (hypothesis: significant improvement)
- Session frequency (hypothesis: more frequent, shorter)
- Expansion to paid tiers (hypothesis: improved)
- Enterprise adoption (hypothesis: enabled by context)

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Privacy concerns | High | High | Transparency-first design; user control |
| Context pollution | Medium | Medium | Relevance filtering; user editing |
| Scope creep | High | Medium | Phased delivery; clear MVP |
| Technical complexity | High | High | Incremental architecture; good abstractions |
| User adoption | Medium | High | Graceful degradation; clear value props |

---

## Appendices

See individual documents for detailed specifications:
- ADRs for key architectural decisions
- PRDs for product requirements
- Tech Specs for implementation details
- Demo Plan for proof-of-concept scope
