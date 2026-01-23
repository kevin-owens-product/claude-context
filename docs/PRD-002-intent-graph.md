# PRD-002: Intent Graph

## Document Information
| Field | Value |
|-------|-------|
| **Product** | Intent Graph |
| **Author** | Kevin [Last Name] |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Target Release** | Phase 2 |

---

## Executive Summary

The Intent Graph is a rich semantic representation of what software should do and why. It replaces code as the source of truth, enabling intent-first development where code is synthesized on demand from a persistent, queryable, versionable understanding of purpose.

**Key Insight:** Code is a lossy compression of intent. By keeping intent as the primary artifact, we preserve reasoning and enable capabilities impossible with code-first approaches.

---

## Problem Statement

### Developer Problems

1. **Intent Lost in Translation**
   - Developer has clear mental model
   - Translates to code (lossy)
   - Original reasoning lost
   - Future developers (or AI) can't recover "why"

2. **Requirements Rot**
   - Requirements docs become stale
   - Code diverges from specs
   - No single source of truth
   - "What is this supposed to do?" unanswerable

3. **Context Switching Cost**
   - Developer must re-load context every session
   - AI assistant starts from scratch
   - Collaborative work loses continuity
   - Onboarding is expensive

4. **Change Impact Unknown**
   - "If we change this requirement, what breaks?"
   - Manual impact analysis
   - Missed dependencies
   - Regression surprises

### AI-Era Problems

1. **AI Generates Code, Not Understanding**
   - LLM writes code based on prompt
   - Reasoning discarded
   - No way to query "why did you do this?"
   - Iteration starts over

2. **No Semantic Querying**
   - Can't ask "what handles authentication?"
   - Grep-based searching is textual, not semantic
   - Understanding is implicit in code, not explicit

3. **Regeneration Requires Full Re-explanation**
   - Want code in different language? Re-explain everything.
   - Want different tradeoffs? Re-explain everything.
   - Want updates for new AI capabilities? Manual.

---

## Solution Overview

The Intent Graph is a structured, semantic representation of software purpose that serves as the true source of truth:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTENT GRAPH                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │             │  │             │  │             │  │             │   │
│  │   GOALS     │  │ CONSTRAINTS │  │  ENTITIES   │  │ BEHAVIORS   │   │
│  │             │  │             │  │             │  │             │   │
│  │ What should │  │ What must   │  │ What are    │  │ What should │   │
│  │ this        │  │ NOT happen? │  │ the core    │  │ happen when │   │
│  │ achieve?    │  │ What are    │  │ concepts?   │  │ X occurs?   │   │
│  │             │  │ the limits? │  │             │  │             │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │          │
│         └────────────────┴────────────────┴────────────────┘          │
│                                   │                                    │
│                          ┌────────▼────────┐                          │
│                          │                 │                          │
│                          │    CONTEXT      │                          │
│                          │                 │                          │
│                          │ Why do we want  │                          │
│                          │ this? What's    │                          │
│                          │ the business    │                          │
│                          │ reality?        │                          │
│                          │                 │                          │
│                          └─────────────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### Intent Capture

**US-1: Natural Language Intent Definition**
> As a developer, I want to describe what I want to build in natural language so that I can focus on intent rather than implementation.

Acceptance Criteria:
- [ ] User describes desired functionality in conversation
- [ ] Claude extracts goals from description
- [ ] Claude identifies constraints (explicit and implied)
- [ ] Claude recognizes entities and relationships
- [ ] Claude asks clarifying questions for ambiguity
- [ ] User confirms or corrects extraction

**US-2: Structured Intent Editing**
> As a developer, I want to directly edit the Intent Graph so that I can make precise changes to requirements.

Acceptance Criteria:
- [ ] Intent Graph is visualizable
- [ ] Individual nodes can be selected and edited
- [ ] Relationships between nodes can be modified
- [ ] Changes are validated for consistency
- [ ] Version history is maintained

**US-3: Intent Import**
> As a developer, I want to import existing requirements from documents so that I can bring legacy projects into the Intent Graph.

Acceptance Criteria:
- [ ] Markdown/text documents can be processed
- [ ] Structured formats (OpenAPI, JSON Schema) can be imported
- [ ] Existing code can have intent inferred
- [ ] Import produces draft graph for review
- [ ] User can accept/reject/modify imports

### Intent Querying

**US-4: Semantic Queries**
> As a developer, I want to ask questions about my software's intent so that I can understand what it's supposed to do.

Acceptance Criteria:
- [ ] "What are the security constraints?" returns relevant constraints
- [ ] "What should happen when a user logs in?" returns relevant behaviors
- [ ] "Why did we decide X?" returns the decision and rationale
- [ ] Queries work in natural language
- [ ] Results are sourced/attributed

**US-5: Impact Analysis**
> As a developer, I want to understand the impact of changing a requirement so that I can make informed decisions.

Acceptance Criteria:
- [ ] "What if we remove constraint X?" shows dependent items
- [ ] "What artifacts implement goal Y?" shows connections
- [ ] Changes can be previewed before committing
- [ ] Warnings for breaking changes

### Intent to Code

**US-6: Code Synthesis**
> As a developer, I want code generated from my Intent Graph so that implementation is automated.

Acceptance Criteria:
- [ ] Complete intent produces working code
- [ ] Code includes comments linking to intent
- [ ] Multiple language targets supported
- [ ] Different tradeoff profiles available
- [ ] Generated code is testable

**US-7: Provenance Tracking**
> As a developer, I want to know which intent produced which code so that I can trace requirements to implementation.

Acceptance Criteria:
- [ ] Every generated code section links to intent nodes
- [ ] Clicking code shows originating intent
- [ ] Clicking intent shows generated code
- [ ] Changes to intent show affected code

**US-8: Re-synthesis**
> As a developer, I want to regenerate code when intent changes so that implementation stays aligned with requirements.

Acceptance Criteria:
- [ ] Intent change triggers re-synthesis option
- [ ] User can preview changes before applying
- [ ] Unchanged code is preserved
- [ ] Manual customizations are flagged
- [ ] Merge conflicts are surfaced

---

## Functional Requirements

### FR-1: Intent Graph Schema

**FR-1.1: Core Node Types**

```typescript
// Goal: What the software should achieve
interface Goal {
  id: UUID;
  type: 'goal';
  description: string;
  successCriteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'proposed' | 'accepted' | 'achieved' | 'abandoned';
  parentGoal?: UUID;
  subGoals: UUID[];
  linkedConstraints: UUID[];
  linkedBehaviors: UUID[];
  sourceContext: SourceContext;
}

// Constraint: What must/must not happen
interface Constraint {
  id: UUID;
  type: 'constraint';
  description: string;
  category: ConstraintCategory;
  severity: 'must' | 'should' | 'could';
  verificationMethod?: string;
  linkedGoals: UUID[];
  linkedEntities: UUID[];
  sourceContext: SourceContext;
}

type ConstraintCategory = 
  | 'functional'      // Must do X
  | 'security'        // Must prevent Y
  | 'performance'     // Must achieve Z speed/scale
  | 'compliance'      // Must meet regulation
  | 'compatibility'   // Must work with system
  | 'business'        // Must align with strategy
  | 'usability';      // Must be accessible/usable

// Entity: Core domain concept
interface Entity {
  id: UUID;
  type: 'entity';
  name: string;
  description: string;
  attributes: EntityAttribute[];
  relationships: EntityRelationship[];
  states?: StateMachine;
  validationRules: ValidationRule[];
  linkedBehaviors: UUID[];
  sourceContext: SourceContext;
}

interface EntityAttribute {
  name: string;
  type: DataType;
  required: boolean;
  constraints: string[];
  defaultValue?: any;
}

interface EntityRelationship {
  targetEntity: UUID;
  type: 'has_one' | 'has_many' | 'belongs_to' | 'many_to_many';
  name: string;
  constraints?: string[];
}

// Behavior: What happens when something occurs
interface Behavior {
  id: UUID;
  type: 'behavior';
  name: string;
  trigger: BehaviorTrigger;
  preconditions: string[];
  steps: BehaviorStep[];
  postconditions: string[];
  errorHandling: ErrorHandler[];
  linkedGoals: UUID[];
  linkedEntities: UUID[];
  linkedConstraints: UUID[];
  sourceContext: SourceContext;
}

interface BehaviorTrigger {
  type: 'user_action' | 'system_event' | 'time_based' | 'condition';
  description: string;
}

interface BehaviorStep {
  order: number;
  description: string;
  actor: 'user' | 'system' | 'external';
  entityInvolved?: UUID;
  alternativePaths?: BehaviorStep[][];
}

// Context: Why and business reality
interface IntentContext {
  id: UUID;
  type: 'context';
  category: 'business' | 'technical' | 'historical' | 'user_research';
  description: string;
  implications: string[];
  linkedNodes: UUID[];
  sourceContext: SourceContext;
}

// Source tracking
interface SourceContext {
  createdAt: Timestamp;
  createdFrom: 'conversation' | 'import' | 'manual' | 'inference';
  conversationRef?: UUID;
  confidence: number;
  userConfirmed: boolean;
}
```

**FR-1.2: Relationships**

| Relationship | From | To | Meaning |
|--------------|------|-----|---------|
| `achieves` | Behavior | Goal | Behavior contributes to goal |
| `constrains` | Constraint | Goal/Behavior/Entity | Constraint limits target |
| `involves` | Behavior | Entity | Behavior operates on entity |
| `depends_on` | Goal | Goal | Goal requires other goal |
| `conflicts_with` | Constraint | Constraint | Constraints are incompatible |
| `implements` | Artifact | Goal/Behavior | Code implements intent |
| `explained_by` | Node | Context | Context explains node |

### FR-2: Intent Capture

**FR-2.1: Conversation-Based Capture**
- System shall extract intent from natural language
- Extraction shall be interactive (confirm, clarify)
- Multiple conversation turns shall build complete graph
- Ambiguity shall be explicitly surfaced

**FR-2.2: Extraction Pipeline**

```
User Input ──► NLU ──► Intent Extraction ──► Graph Update ──► Confirmation
                │              │
                ▼              ▼
           Clarification   Conflict Detection
            Questions       & Resolution
```

**FR-2.3: Clarification Patterns**

| Ambiguity Type | Example | Clarification |
|----------------|---------|---------------|
| Missing constraint | "Handle user login" | "What happens if credentials are wrong?" |
| Undefined entity | "Store the data" | "What fields does this data have?" |
| Vague goal | "Make it fast" | "What's the target response time?" |
| Implicit behavior | "Standard signup" | "Does this include email verification?" |

### FR-3: Intent Querying

**FR-3.1: Query Types**

| Query Type | Example | Returns |
|------------|---------|---------|
| Goal retrieval | "What are the main goals?" | Goal nodes |
| Constraint filtering | "Security constraints" | Filtered constraints |
| Entity inspection | "What is a User?" | Entity definition |
| Behavior search | "What happens on login?" | Relevant behaviors |
| Impact analysis | "What depends on this?" | Connected graph |
| Provenance | "Why do we need X?" | Context nodes |

**FR-3.2: Query Language**

Natural language queries shall be supported:
- "Show me all security constraints"
- "What behaviors involve the User entity?"
- "Why did we decide to use OAuth?"
- "What would break if we removed password requirement?"

**FR-3.3: Query Results**
- Results shall include source attribution
- Results shall show confidence levels
- Results shall be filterable
- Results shall support drill-down

### FR-4: Intent Visualization

**FR-4.1: Graph View**
- Visual representation of full Intent Graph
- Nodes colored by type
- Relationships shown as edges
- Pan, zoom, search capabilities
- Layout algorithms for readability

**FR-4.2: Focused Views**

| View | Purpose | Shows |
|------|---------|-------|
| Goals | Strategic overview | Goal hierarchy |
| Constraints | Compliance check | All constraints by category |
| Entities | Data model | Entity-relationship diagram |
| Behaviors | Workflow | Behavior flows and triggers |
| Impact | Change analysis | Dependency chains |

**FR-4.3: Editing Interface**
- Direct manipulation of nodes
- Drag-and-drop relationship creation
- Inline editing of descriptions
- Batch operations

### FR-5: Code Synthesis

**FR-5.1: Synthesis Pipeline**

```
Intent Graph ──► Validation ──► Planning ──► Generation ──► Assembly
                     │             │            │
                     ▼             ▼            ▼
               Completeness   Architecture   Per-Component
                 Check        Selection      Generation
```

**FR-5.2: Generation Targets**

| Target | Output |
|--------|--------|
| React Frontend | JSX components, hooks, state |
| API Backend | Endpoints, handlers, middleware |
| Database | Schema, migrations, queries |
| Tests | Unit tests, integration tests |
| Documentation | API docs, user guides |

**FR-5.3: Provenance Embedding**

Generated code shall include:
```typescript
/**
 * @intent-goal gol_123: "Enable user authentication"
 * @intent-behavior beh_456: "Login with email and password"
 * @intent-constraint con_789: "Lock account after 5 failed attempts"
 */
async function handleLogin(email: string, password: string): Promise<AuthResult> {
  // Implementation...
}
```

**FR-5.4: Customization Preservation**
- Manual edits to generated code shall be tracked
- Re-synthesis shall preserve or warn about customizations
- Escape hatches for "don't regenerate this" markers
- Merge assistance for conflicts

---

## Non-Functional Requirements

### NFR-1: Performance

| Metric | Target | Critical |
|--------|--------|----------|
| Intent extraction latency | <2s | <5s |
| Graph query latency | <200ms | <500ms |
| Visualization load | <1s | <3s |
| Code synthesis (small) | <10s | <30s |
| Code synthesis (large) | <60s | <3min |

### NFR-2: Completeness

- 90% of simple applications expressible in Intent Graph
- Edge cases can be handled with "escape hatches"
- Schema extensible for domain-specific concepts

### NFR-3: Accuracy

- Intent extraction: >85% accuracy (user confirmation as ground truth)
- Code synthesis: Compilable code 100% of time
- Code correctness: >90% tests pass on first synthesis

---

## User Interface Requirements

### UI-1: Canvas (Intent Editor)

A spatial interface for working with Intent Graphs:

**Components:**
1. **Graph Canvas** - Visual node/edge editor
2. **Node Inspector** - Detail view/edit for selected node
3. **Query Bar** - Natural language queries
4. **Version History** - Timeline of changes
5. **Synthesis Controls** - Trigger code generation

**Interactions:**
- Double-click to add node
- Drag to connect nodes
- Right-click for context menu
- Keyboard shortcuts for power users

### UI-2: Chat Integration

Intent capture through conversation:

**Flow:**
1. User describes what they want
2. Claude extracts intent, shows draft nodes
3. User confirms/edits
4. Claude asks clarifying questions
5. Graph builds iteratively
6. User switches to Canvas for refinement

### UI-3: Code View Integration

Viewing generated code with intent overlay:

**Features:**
- Syntax-highlighted code
- Intent annotations visible
- Click annotation to see full intent
- Click intent to see all implementing code
- Diff view for changes

---

## Data Model

### Storage Schema

```typescript
interface IntentGraph {
  id: UUID;
  name: string;
  projectId: UUID;
  version: number;
  
  // Core nodes
  goals: Goal[];
  constraints: Constraint[];
  entities: Entity[];
  behaviors: Behavior[];
  contexts: IntentContext[];
  
  // Relationships (stored separately for querying)
  relationships: IntentRelationship[];
  
  // Synthesis state
  lastSynthesis?: SynthesisRecord;
  customizations: Customization[];
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UUID;
}

interface IntentRelationship {
  id: UUID;
  sourceId: UUID;
  targetId: UUID;
  type: RelationshipType;
  metadata?: Record<string, any>;
}

interface SynthesisRecord {
  id: UUID;
  intentVersion: number;
  generatedAt: Timestamp;
  target: string;
  artifacts: ArtifactRef[];
  metrics: SynthesisMetrics;
}

interface Customization {
  artifactId: UUID;
  location: CodeLocation;
  originalContent: string;
  customContent: string;
  reason?: string;
  preserveOnResynthesize: boolean;
}
```

---

## API Specification

### Graph APIs

```
GET /api/v1/intent-graphs/{graphId}
Returns: IntentGraph

POST /api/v1/intent-graphs
Body: { name, projectId }
Returns: IntentGraph

PATCH /api/v1/intent-graphs/{graphId}
Body: { ...updates }
Returns: IntentGraph
```

### Node APIs

```
POST /api/v1/intent-graphs/{graphId}/goals
Body: Goal
Returns: Goal

POST /api/v1/intent-graphs/{graphId}/constraints
Body: Constraint
Returns: Constraint

POST /api/v1/intent-graphs/{graphId}/entities
Body: Entity
Returns: Entity

POST /api/v1/intent-graphs/{graphId}/behaviors
Body: Behavior
Returns: Behavior

DELETE /api/v1/intent-graphs/{graphId}/nodes/{nodeId}
Returns: 204
```

### Query APIs

```
POST /api/v1/intent-graphs/{graphId}/query
Body: { query: "natural language query" }
Returns: QueryResult

GET /api/v1/intent-graphs/{graphId}/impact/{nodeId}
Returns: ImpactAnalysis
```

### Synthesis APIs

```
POST /api/v1/intent-graphs/{graphId}/synthesize
Body: { target, options }
Returns: SynthesisJob

GET /api/v1/synthesis-jobs/{jobId}
Returns: SynthesisJob (with status)

GET /api/v1/synthesis-jobs/{jobId}/artifacts
Returns: Artifact[]
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intent capture accuracy | >85% | User confirmation rate |
| Graph completeness | >90% | Synthesis success rate |
| Query relevance | >80% | User satisfaction |
| Synthesis compilation | 100% | Automated test |
| Synthesis correctness | >90% | Test pass rate |
| User adoption | >50% of code projects | Usage analytics |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Schema too rigid | Extensibility, escape hatches |
| Extraction accuracy | Interactive confirmation, learning |
| Synthesis quality | Start with constrained domains |
| User adoption | Gradual introduction, clear value prop |
| Complexity | Good defaults, progressive disclosure |

---

## Appendix

### A. Example Intent Graph (Authentication)

```yaml
goals:
  - id: gol_1
    description: "Users can securely access their accounts"
    successCriteria:
      - "Login succeeds with valid credentials"
      - "Unauthorized access prevented"
    
constraints:
  - id: con_1
    description: "Passwords must be hashed with bcrypt"
    category: security
    severity: must
    
  - id: con_2
    description: "Lock account after 5 failed attempts"
    category: security
    severity: must
    
entities:
  - id: ent_1
    name: "User"
    attributes:
      - name: email
        type: string
        required: true
      - name: passwordHash
        type: string
        required: true
      - name: failedAttempts
        type: integer
        required: false
        
behaviors:
  - id: beh_1
    name: "User Login"
    trigger:
      type: user_action
      description: "User submits login form"
    steps:
      - order: 1
        description: "Validate email format"
        actor: system
      - order: 2
        description: "Retrieve user by email"
        actor: system
        entityInvolved: ent_1
      - order: 3
        description: "Verify password hash"
        actor: system
    linkedGoals: [gol_1]
    linkedConstraints: [con_1, con_2]
```

### B. Related Documents

- ADR-001: Intent as Source of Truth
- SPEC-002: Intent Graph Schema
- SPEC-004: Synthesis Engine
