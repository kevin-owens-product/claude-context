# PRD-006: Unified Surfaces

## Document Information
| Field | Value |
|-------|-------|
| **Product** | Unified Surfaces |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Target Release** | Phase 3-4 |

---

## Executive Summary

Unified Surfaces reimagines Claude's product interfaces—moving from separate tools (Chat, Code, Cowork) to integrated surfaces that share context and work together seamlessly. The user experiences one Claude that understands them, not multiple disconnected products.

---

## Problem Statement

### Current State

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Claude.ai  │  │ Claude Code │  │   Cowork    │  │  Artifacts  │
│   (Chat)    │  │   (CLI)     │  │  (Desktop)  │  │  (Embedded) │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
      │                │                │                │
      └────────────────┴────────────────┴────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  NO SHARED STATE  │
                    │  Each is isolated │
                    └───────────────────┘
```

### Problems

1. **Fragmented Experience** - Each surface treats user as new
2. **Context Doesn't Transfer** - Work in Chat doesn't inform Code
3. **Artificial Boundaries** - Why is "coding" separate from "chatting about code"?
4. **Multiple Mental Models** - Users must learn each tool separately
5. **No Unified Home** - No single place to see all Claude work

---

## Solution: Integrated Surface Architecture

### Proposed State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE UNIFIED                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         HOME                                     │   │
│  │  • Active projects        • Recent artifacts                    │   │
│  │  • Proactive suggestions  • Quick actions                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Converse │ │  Build   │ │ Automate │ │  Canvas  │ │ Observe  │     │
│  │          │ │          │ │          │ │          │ │          │     │
│  │  Chat    │ │  Code    │ │ Workflows│ │  Intent  │ │ Feedback │     │
│  │  Explore │ │  Create  │ │  Tasks   │ │  Edit    │ │ Metrics  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│       │            │            │            │            │            │
│       └────────────┴────────────┴────────────┴────────────┘            │
│                                 │                                       │
│                    ┌────────────▼────────────┐                         │
│                    │     CLAUDE CONTEXT      │                         │
│                    │   (Shared Foundation)   │                         │
│                    └─────────────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Surface Definitions

### 1. Home

**Purpose:** Central hub showing user's Claude world at a glance.

**Components:**
| Component | Description |
|-----------|-------------|
| Active Projects | Current work with status indicators |
| Recent Artifacts | Quick access to recent creations |
| Proactive Insights | Claude's suggestions based on observation |
| Quick Actions | Common tasks, continue recent work |
| Context Health | What Claude knows, accuracy indicators |

**Key Behaviors:**
- Personalized based on user patterns
- Updates in real-time
- Entry point, not destination
- Surfaces what's relevant now

---

### 2. Converse (Evolution of Chat)

**Purpose:** Natural language interaction for exploration, discussion, and general assistance.

**Evolution from Current:**
| Current | Evolved |
|---------|---------|
| Blank chat | Context-aware start |
| Session-isolated | Cross-session continuity |
| Text-only output | Integrated artifact creation |
| No project awareness | Project context available |

**Key Features:**
- Conversation threads linked to projects
- Inline artifact creation and editing
- Seamless handoff to other surfaces
- History with semantic search

---

### 3. Build (Evolution of Claude Code)

**Purpose:** Development environment for creating and evolving software.

**Evolution from Current:**
| Current | Evolved |
|---------|---------|
| CLI tool | Integrated surface |
| File-system focused | Intent-aware |
| Session commands | Continuous understanding |
| Code generation | Living artifact management |

**Key Features:**
- Intent Graph integration
- Codebase understanding persists
- Artifact versioning and evolution
- CI/CD observation and feedback
- Multi-file project management

---

### 4. Automate (Evolution of Cowork)

**Purpose:** Workflow automation and task orchestration.

**Evolution from Current:**
| Current | Evolved |
|---------|---------|
| Desktop automation | Cross-platform workflows |
| Manual setup | Pattern-detected suggestions |
| Isolated tasks | Connected to projects |
| No learning | Feedback-driven improvement |

**Key Features:**
- Workflow templates from patterns
- Cross-service orchestration
- Scheduled and triggered tasks
- Performance tracking
- Proactive automation suggestions

---

### 5. Canvas (New Surface)

**Purpose:** Visual interface for working with Intent Graphs directly.

**Capabilities:**
- Spatial intent visualization
- Direct manipulation editing
- Collaborative editing
- Real-time synthesis preview
- Impact analysis visualization

**Key Features:**
- Drag-and-drop intent nodes
- Visual relationship mapping
- Multi-stakeholder collaboration
- Version timeline
- Export to documentation

---

### 6. Observe (New Surface)

**Purpose:** Feedback collection, outcome tracking, and learning visibility.

**Components:**
| Component | Description |
|-----------|-------------|
| Feedback Dashboard | Collected signals, ratings |
| Outcome Tracker | What happened to artifacts |
| Learning Log | What Claude learned |
| Metrics View | Performance and quality data |
| Corrections | User corrections to Claude's understanding |

**Key Features:**
- Transparency into Claude's learning
- User control over what's learned
- Aggregate insights (anonymized)
- Feedback on feedback (did learning help?)

---

## Cross-Surface Behaviors

### Context Continuity

Every surface has access to:
- Current user identity
- Active project context
- Relevant artifacts
- Interaction history
- Learned preferences

### Seamless Transitions

| From | To | Trigger | Context Carried |
|------|-----|---------|-----------------|
| Converse | Build | "Let's implement this" | Full conversation, decisions |
| Build | Canvas | "Show me the intent" | Code context, changes |
| Canvas | Build | "Generate this" | Intent graph, constraints |
| Any | Observe | "How did this work?" | Artifact reference |
| Home | Any | Click project | Full project context |

### Unified Artifact Access

- Artifacts visible from all surfaces
- Edit artifact, changes reflect everywhere
- Surface-appropriate views (code view vs. preview)
- Consistent versioning across surfaces

---

## User Stories

**US-1: Unified Home Experience**
> As a user, I want a single place to see all my Claude work so I don't have to remember which tool I used.

**US-2: Seamless Surface Switching**
> As a user, I want to move between surfaces without losing context so my work flows naturally.

**US-3: Project-Centric Navigation**
> As a user, I want to organize my work by project so I can focus on what matters.

**US-4: Proactive Home Insights**
> As a user, I want Claude to surface relevant suggestions on my home so I discover opportunities.

**US-5: Consistent Identity**
> As a user, I want Claude to know me the same way everywhere so I don't repeat myself.

---

## Functional Requirements

### FR-1: Home Surface

**FR-1.1: Project Cards**
- Show active projects with status
- Last activity timestamp
- Quick actions (continue, archive)
- Progress indicators where applicable

**FR-1.2: Proactive Suggestions**
- Generated from observation + context
- Confidence-ranked
- Dismissable with feedback
- Actionable (one-click to start)

**FR-1.3: Recent Artifacts**
- Last 10 artifacts accessed
- Quick preview
- Open in appropriate surface
- Search all artifacts

### FR-2: Surface Navigation

**FR-2.1: Persistent Navigation**
- Surface switcher always visible
- Current surface indicated
- Project context shown
- Quick surface switch (keyboard shortcut)

**FR-2.2: Deep Linking**
- Every state has shareable URL
- URLs include context parameters
- External links restore full state

### FR-3: Cross-Surface Data

**FR-3.1: Shared State**
- Context available to all surfaces
- Real-time sync (< 1s)
- Offline-capable with sync
- Conflict resolution for concurrent edits

---

## UI/UX Requirements

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Home | Converse | Build | Automate | Canvas | Observe  [User] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │                 │  │                                 │  │
│  │   Project       │  │        Surface Content          │  │
│  │   Sidebar       │  │                                 │  │
│  │                 │  │                                 │  │
│  │   • Project A   │  │                                 │  │
│  │   • Project B   │  │                                 │  │
│  │   • Project C   │  │                                 │  │
│  │                 │  │                                 │  │
│  │   [+ New]       │  │                                 │  │
│  │                 │  │                                 │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Consistency** - Same patterns across surfaces
2. **Context Visibility** - Always show what Claude knows
3. **Progressive Disclosure** - Simple default, power available
4. **Responsive** - Works on desktop, tablet, mobile
5. **Accessible** - WCAG 2.1 AA compliance

---

## Technical Requirements

### State Management

```typescript
interface UnifiedState {
  user: UserContext;
  currentProject: ProjectContext | null;
  currentSurface: Surface;
  surfaceStates: Map<Surface, SurfaceState>;
  sharedArtifacts: ArtifactRef[];
  navigationHistory: NavigationEntry[];
}

interface SurfaceState {
  surface: Surface;
  localState: any; // Surface-specific
  lastActive: Timestamp;
  pendingChanges: Change[];
}
```

### Sync Protocol

- WebSocket for real-time updates
- Optimistic updates with reconciliation
- Conflict resolution: last-write-wins with merge option
- Offline queue with sync on reconnect

---

## Migration Path

### Phase 1: Foundation
- Claude Context deployed
- Existing surfaces connected to Context
- Basic cross-surface state

### Phase 2: Home + Integration
- Home surface launched
- Navigation unified
- Project organization

### Phase 3: New Surfaces
- Canvas surface launched
- Observe surface launched
- Deep integration complete

### Phase 4: Legacy Deprecation
- Old standalone tools deprecated
- Migration assistance
- Feature parity confirmed

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Cross-surface usage | >40% of users use 2+ surfaces |
| Context continuity success | >90% seamless transitions |
| Home engagement | >60% start sessions from Home |
| Surface switch friction | <2 clicks to any surface |
| User satisfaction (unified) | >4.5/5 survey score |

---

## Related Documents

- PRD-001: Claude Context
- ADR-002: Context Layer Architecture
- ARCHITECTURE.md: System overview
