# PRD-001: Claude Context

## Document Information
| Field | Value |
|-------|-------|
| **Product** | Claude Context |
| **Author** | Kevin [Last Name] |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Target Release** | Phase 1 |

---

## Executive Summary

Claude Context is the foundational infrastructure layer that enables Claude to maintain continuous understanding across sessions, surfaces, and interactions. It transforms Claude from a brilliant-but-amnesiac assistant into an intelligence that genuinely knows users and their work.

**Key Insight:** Current "memory" features store facts. Claude Context stores *understanding*.

---

## Problem Statement

### User Problems

1. **Repetitive Context Provision**
   - Users re-explain their situation, preferences, and history every session
   - "As I mentioned before..." is meaningless to Claude
   - Project context must be manually injected

2. **Lost Continuity**
   - Conversations don't build on each other
   - Claude can't recognize patterns across sessions
   - No learning from what worked/didn't work

3. **Fragmented Experience**
   - Context doesn't transfer between Claude.ai, Claude Code, Cowork
   - Each surface treats user as new
   - No unified understanding

4. **Static Assistance**
   - Claude waits for prompts rather than anticipating needs
   - No proactive insights based on accumulated understanding
   - Can't notice patterns user might miss

### Business Problems

1. **Differentiation Challenge**
   - Model quality alone is increasingly commoditized
   - Competitors can match capabilities
   - Need sustainable moat

2. **Retention Risk**
   - Users don't build "relationship" with Claude
   - Easy to switch to alternatives
   - No accumulated value from continued use

3. **Enterprise Blockers**
   - Organizations need persistent context for teams
   - Compliance requires audit trails
   - Integration requires shared state

---

## Solution Overview

Claude Context is a persistent, semantic understanding layer consisting of four interconnected components:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CONTEXT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │  IDENTITY       │      │  PROJECT        │                  │
│  │  GRAPH          │      │  GRAPHS         │                  │
│  │                 │      │                 │                  │
│  │  Who is this    │      │  What are they  │                  │
│  │  user?          │      │  working on?    │                  │
│  └─────────────────┘      └─────────────────┘                  │
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │  INTERACTION    │      │  OUTCOME        │                  │
│  │  MEMORY         │      │  LEDGER         │                  │
│  │                 │      │                 │                  │
│  │  What patterns  │      │  What happened  │                  │
│  │  emerged?       │      │  to outputs?    │                  │
│  └─────────────────┘      └─────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### Core Experience

**US-1: Seamless Session Continuity**
> As a returning user, I want Claude to remember our ongoing work so that I don't have to re-explain my context every session.

Acceptance Criteria:
- [ ] User returns after 24+ hours
- [ ] Claude recognizes ongoing projects without prompting
- [ ] Claude recalls relevant decisions and constraints
- [ ] User confirms context is accurate
- [ ] User can correct if context is wrong

**US-2: Project Understanding**
> As a user working on a multi-session project, I want Claude to maintain understanding of my project's goals, constraints, and decisions so that our work builds on itself.

Acceptance Criteria:
- [ ] User can establish a "project" explicitly or implicitly
- [ ] Claude extracts goals from conversation
- [ ] Claude identifies and tracks constraints
- [ ] Claude remembers decisions and their rationale
- [ ] User can query project state ("what have we decided about X?")

**US-3: Preference Learning**
> As a regular Claude user, I want Claude to learn my preferences over time so that its help becomes more tailored without me having to explicitly configure everything.

Acceptance Criteria:
- [ ] Communication style preferences are detected
- [ ] Technical level adjusts based on user expertise
- [ ] Format preferences are learned (code style, documentation depth)
- [ ] Preferences can be inspected and edited
- [ ] Preferences apply across sessions

**US-4: Cross-Surface Continuity**
> As a user who works in both Claude.ai and Claude Code, I want my context to be available in both so that I have a unified experience.

Acceptance Criteria:
- [ ] Projects started in one surface are accessible in another
- [ ] Decisions made in Claude Code are known in Claude.ai
- [ ] Identity understanding is consistent across surfaces
- [ ] Artifacts are accessible from any surface

### Transparency and Control

**US-5: Context Inspection**
> As a user, I want to see what Claude understands about me and my work so that I can verify accuracy and maintain trust.

Acceptance Criteria:
- [ ] Dashboard shows Identity Graph contents
- [ ] Dashboard shows active Project Graphs
- [ ] User can drill into specific items
- [ ] Last updated timestamps visible
- [ ] Source of each item traceable

**US-6: Context Correction**
> As a user, I want to correct Claude's understanding when it's wrong so that errors don't persist.

Acceptance Criteria:
- [ ] Any item can be edited or deleted
- [ ] Corrections take effect immediately
- [ ] Claude acknowledges corrections
- [ ] Corrected items are flagged in history

**US-7: Context Export**
> As a user, I want to export my context data so that I maintain ownership and portability.

Acceptance Criteria:
- [ ] Full export in standard format (JSON)
- [ ] Selective export by component
- [ ] Export includes history
- [ ] Can be used to migrate to new account

**US-8: Context Deletion**
> As a user, I want to delete some or all of my context data so that I control what Claude retains.

Acceptance Criteria:
- [ ] Delete single items
- [ ] Delete entire projects
- [ ] Delete all context (nuclear option)
- [ ] Deletion is immediate and complete
- [ ] Deletion is auditable

---

## Functional Requirements

### FR-1: Identity Graph

**FR-1.1: Automatic Extraction**
- System shall extract identity information from conversations
- Extraction shall be continuous (every interaction)
- Extraction shall not require explicit user action
- System shall handle conflicting information gracefully

**FR-1.2: Identity Components**

| Component | Description | Update Frequency |
|-----------|-------------|------------------|
| Demographics | Name, location, timezone | Low (explicit) |
| Expertise Areas | Domains of knowledge, skill levels | Medium (inferred) |
| Communication Style | Formality, detail level, humor | Medium (inferred) |
| Working Patterns | Typical session times, duration | High (observed) |
| Preferences | Stated likes/dislikes, format preferences | Medium (mixed) |

**FR-1.3: Confidence Scoring**
- Each identity attribute shall have confidence score
- Score shall reflect source quality and recency
- Low-confidence attributes shall not be used until confirmed
- User corrections shall set confidence to 1.0

### FR-2: Project Graphs

**FR-2.1: Project Recognition**
- System shall detect when user is working on a "project"
- Detection based on: explicit naming, sustained topic, artifact creation
- New projects can be created explicitly or implicitly
- Projects can be merged if determined to be same

**FR-2.2: Project Structure**

```typescript
interface ProjectGraph {
  id: UUID;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  
  // Understanding
  goals: Goal[];
  constraints: Constraint[];
  decisions: Decision[];
  entities: Entity[];
  openQuestions: Question[];
  
  // Artifacts
  linkedArtifacts: ArtifactRef[];
  
  // History
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  interactionHistory: InteractionRef[];
  
  // Meta
  confidence: number;
  userConfirmed: boolean;
}
```

**FR-2.3: Goal Tracking**
- Goals shall be extracted from conversation
- Goals shall have completion status
- Sub-goals shall be supported
- Goal changes shall be versioned

**FR-2.4: Constraint Tracking**
- Constraints shall be extracted and categorized
- Categories: technical, business, regulatory, personal
- Constraint violations in suggestions shall be flagged
- Constraints shall be linkable to decisions

**FR-2.5: Decision Logging**
- Decisions shall capture: what, why, when, alternatives considered
- Decisions shall be reversible (with history)
- Related decisions shall be linked
- Impact of decision changes shall be traceable

### FR-3: Interaction Memory

**FR-3.1: Pattern Recognition**
- System shall identify recurring patterns in interactions
- Patterns include: question types, topic trajectories, success/failure patterns
- Patterns shall inform future interactions
- Patterns shall be user-inspectable

**FR-3.2: Correction Tracking**
- When user corrects Claude, correction shall be logged
- Future interactions shall avoid repeated mistakes
- Correction patterns shall be analyzed
- Systematic errors shall be flagged

**FR-3.3: Preference Inference**
- Implicit preferences shall be extracted from behavior
- Preferences shall require confirmation for high-impact use
- Conflicting preferences shall prompt clarification
- Preference confidence shall be tracked

### FR-4: Outcome Ledger

**FR-4.1: Artifact Outcome Tracking**
- System shall track what happens to created artifacts
- Explicit feedback shall be captured
- Usage patterns shall be observed (if permitted)
- Outcomes shall inform future suggestions

**FR-4.2: Success Metrics**
- Per-user success patterns shall be learned
- Metrics: continued use, modifications, explicit feedback
- Aggregate patterns shall be anonymized for improvement
- Users shall see their own success metrics

### FR-5: Context Assembly

**FR-5.1: Query-Time Assembly**
- At each interaction, relevant context shall be assembled
- Assembly shall be fast (<100ms)
- Context shall be relevance-ranked
- Context window shall be managed

**FR-5.2: Relevance Determination**
- Current query shall be analyzed for relevance signals
- Active projects shall be prioritized
- Recent interactions shall be weighted higher
- User can pin specific context

**FR-5.3: Context Injection**
- Assembled context shall be injected to Claude
- Injection format shall be optimized for Claude's processing
- Context shall not overwhelm the query
- Context source shall be traceable

---

## Non-Functional Requirements

### NFR-1: Performance

| Metric | Target | Critical |
|--------|--------|----------|
| Context assembly latency | <100ms | <250ms |
| Identity Graph update | <500ms | <1s |
| Project Graph query | <200ms | <500ms |
| Full context export | <30s | <2min |

### NFR-2: Reliability

- Context store availability: 99.9%
- No data loss on system failure
- Graceful degradation if context unavailable
- Eventual consistency acceptable (<5s)

### NFR-3: Security

- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- User authentication required for all access
- No cross-user data leakage
- Audit log for all access

### NFR-4: Privacy

- User owns all context data
- No sharing without explicit consent
- Deletion requests honored within 24 hours
- Anonymization for aggregate analysis
- GDPR/CCPA compliant

### NFR-5: Scalability

- Support 10M+ users
- Support 1000+ projects per user
- Support 100K+ context items per user
- Horizontal scaling capability

---

## User Interface Requirements

### UI-1: Context Dashboard

**Location:** Settings > Claude Context (or dedicated page)

**Components:**

1. **Overview Panel**
   - Total items in context
   - Last updated
   - Health status

2. **Identity Section**
   - Show extracted identity attributes
   - Confidence indicators
   - Edit/delete actions

3. **Projects Section**
   - List active projects
   - Project status indicators
   - Quick access to project details

4. **Memory Section**
   - Pattern summary
   - Recent corrections
   - Learned preferences

5. **Outcome Section**
   - Artifact success rate
   - Recent feedback
   - Learning highlights

### UI-2: In-Conversation Context Display

**Trigger:** User asks "what do you know about..." or clicks context indicator

**Display:**
- Relevant context used for current response
- Source attribution (which graph, when learned)
- Quick edit capability
- Confidence levels

### UI-3: Context Conflicts

**Trigger:** Claude detects conflicting information

**Display:**
- Show both pieces of information
- Ask user to resolve
- Provide context for each
- Allow "both are true" option

---

## Data Model

### Core Entities

```typescript
// User's complete context
interface ClaudeContext {
  userId: UUID;
  identityGraph: IdentityGraph;
  projectGraphs: ProjectGraph[];
  interactionMemory: InteractionMemory;
  outcomeLedger: OutcomeLedger;
  settings: ContextSettings;
}

// Identity understanding
interface IdentityGraph {
  attributes: IdentityAttribute[];
  relationships: Relationship[];
  updatedAt: Timestamp;
}

interface IdentityAttribute {
  key: string;
  value: any;
  confidence: number;
  source: 'explicit' | 'inferred' | 'corrected';
  sourceRef: InteractionRef;
  updatedAt: Timestamp;
}

// Project understanding
interface ProjectGraph {
  id: UUID;
  name: string;
  status: ProjectStatus;
  goals: Goal[];
  constraints: Constraint[];
  decisions: Decision[];
  entities: Entity[];
  openQuestions: Question[];
  linkedArtifacts: ArtifactRef[];
  interactionHistory: InteractionRef[];
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

interface Goal {
  id: UUID;
  description: string;
  status: 'active' | 'achieved' | 'abandoned';
  subGoals: UUID[];
  parentGoal?: UUID;
  confidence: number;
  sourceRef: InteractionRef;
}

interface Constraint {
  id: UUID;
  description: string;
  category: 'technical' | 'business' | 'regulatory' | 'personal';
  severity: 'must' | 'should' | 'nice-to-have';
  linkedDecisions: UUID[];
  confidence: number;
  sourceRef: InteractionRef;
}

interface Decision {
  id: UUID;
  description: string;
  rationale: string;
  alternativesConsidered: string[];
  linkedConstraints: UUID[];
  linkedGoals: UUID[];
  madeAt: Timestamp;
  reversedAt?: Timestamp;
  sourceRef: InteractionRef;
}

// Interaction memory
interface InteractionMemory {
  patterns: Pattern[];
  corrections: Correction[];
  preferences: InferredPreference[];
}

interface Pattern {
  id: UUID;
  description: string;
  type: 'success' | 'failure' | 'workflow' | 'topic';
  frequency: number;
  lastOccurred: Timestamp;
  examples: InteractionRef[];
}

interface Correction {
  id: UUID;
  originalOutput: string;
  correctedTo: string;
  category: string;
  timestamp: Timestamp;
  sourceRef: InteractionRef;
}

// Outcome tracking
interface OutcomeLedger {
  artifactOutcomes: ArtifactOutcome[];
  aggregateMetrics: OutcomeMetrics;
}

interface ArtifactOutcome {
  artifactId: UUID;
  feedback: FeedbackSignal[];
  usageMetrics?: UsageMetrics;
  finalStatus: 'active' | 'abandoned' | 'superseded';
}
```

---

## API Specification

### Context Read APIs

```
GET /api/v1/context
Returns: Full ClaudeContext for authenticated user

GET /api/v1/context/identity
Returns: IdentityGraph

GET /api/v1/context/projects
Returns: ProjectGraph[] (list)

GET /api/v1/context/projects/{projectId}
Returns: ProjectGraph (single)

GET /api/v1/context/memory
Returns: InteractionMemory

GET /api/v1/context/outcomes
Returns: OutcomeLedger

GET /api/v1/context/assembly?query={query}
Returns: AssembledContext (relevance-ranked for query)
```

### Context Write APIs

```
POST /api/v1/context/identity/attributes
Body: { key, value, source }
Returns: IdentityAttribute

PATCH /api/v1/context/identity/attributes/{key}
Body: { value }
Returns: IdentityAttribute

DELETE /api/v1/context/identity/attributes/{key}
Returns: 204

POST /api/v1/context/projects
Body: { name, goals?, constraints? }
Returns: ProjectGraph

PATCH /api/v1/context/projects/{projectId}
Body: { ...updates }
Returns: ProjectGraph

POST /api/v1/context/projects/{projectId}/goals
Body: Goal
Returns: Goal

POST /api/v1/context/projects/{projectId}/decisions
Body: Decision
Returns: Decision

DELETE /api/v1/context/projects/{projectId}
Returns: 204
```

### Context Admin APIs

```
POST /api/v1/context/export
Returns: { downloadUrl, expiresAt }

DELETE /api/v1/context
Returns: 204 (deletes everything)

GET /api/v1/context/audit
Returns: AuditLog[]
```

---

## Integration Points

### Claude API Integration

- Context assembly called before each Claude API request
- Context injected via system prompt (structured format)
- Response analysis extracts new context items
- Feedback captured from response rating

### Surface Integration

- All surfaces use same Context APIs
- Surface identifier included in updates
- Cross-surface sync is automatic
- Surface-specific views supported

### Artifact Integration

- Artifacts linked to Project Graphs
- Artifact creation updates Outcome Ledger
- Artifact feedback flows to Context

---

## Success Metrics

### User Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Context accuracy (user-reported) | N/A | >90% | Survey |
| Session context provision (user actions) | ~5/session | <1/session | Analytics |
| Return user session start time | N/A | Faster than new user | Analytics |
| Cross-session task completion | N/A | >70% | Analytics |

### Technical Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Context assembly p95 latency | <100ms | >250ms |
| Context store uptime | 99.9% | <99.5% |
| Data sync lag | <5s | >30s |
| Export completion rate | >99% | <95% |

### Business Metrics

| Metric | Hypothesis | Measurement |
|--------|------------|-------------|
| User retention | Improved by 20% | Cohort analysis |
| Session frequency | Increased | Daily/weekly active |
| Pro conversion | Improved | Funnel analysis |
| NPS | Improved | Survey |

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Context pollution (bad data) | Medium | High | Confidence scoring, easy correction, decay |
| Privacy concerns | High | High | Transparency, control, clear policies |
| Performance degradation | Medium | Medium | Caching, optimization, monitoring |
| Cross-surface sync issues | Medium | Medium | Eventual consistency, conflict resolution |
| User confusion | Medium | Medium | Clear UX, onboarding, help content |

---

## Dependencies

- Claude API access
- User authentication system
- Storage infrastructure (Postgres, Redis)
- Vector database for semantic search
- Analytics pipeline

---

## Open Questions

1. How much context is "too much" for a single query?
2. How to handle team/organization contexts?
3. What's the right default for privacy settings?
4. How to explain context usage to users?
5. How to handle context migration between accounts?

---

## Appendix

### A. Context Injection Format

```xml
<claude_context>
  <user_identity confidence="0.9">
    <name>Alex Chen</name>
    <expertise area="frontend" level="senior"/>
    <expertise area="react" level="expert"/>
    <preference type="communication" value="concise"/>
  </user_identity>
  
  <active_project name="Analytics Dashboard" status="active">
    <goal status="active">Build real-time analytics dashboard</goal>
    <constraint category="technical">Must use existing GraphQL API</constraint>
    <constraint category="business">Launch by Q2</constraint>
    <decision made="2024-01-15">Using React + D3 for visualization</decision>
  </active_project>
  
  <interaction_memory>
    <pattern type="success">Prefers code examples before explanations</pattern>
    <correction>User prefers TypeScript over JavaScript</correction>
  </interaction_memory>
</claude_context>
```

### B. Competitive Analysis

| Feature | Claude (Current) | Claude Context | GPT-4 | Gemini |
|---------|------------------|----------------|-------|--------|
| Session memory | None | Full | Limited | Limited |
| Cross-session | Memory (facts) | Understanding | Memory | Memory |
| Project tracking | None | Full | None | None |
| Outcome learning | None | Full | None | None |
| Transparency | N/A | Full | Limited | Limited |

### C. Related Documents

- ADR-002: Context Layer Architecture
- SPEC-001: Context Store Technical Specification
- ADR-004: Feedback Loop Design
