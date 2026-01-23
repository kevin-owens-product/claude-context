# SPEC-001: Context Store Technical Specification

## Document Information
| Field | Value |
|-------|-------|
| **Component** | Context Store |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Related PRD** | PRD-001: Claude Context |

---

## Overview

The Context Store is the persistence layer for Claude Context—storing Identity Graphs, Project Graphs, Interaction Memory, and Outcome Ledgers. This specification defines the data models, storage architecture, APIs, and operational requirements.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT STORE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      API LAYER (FastAPI)                        │   │
│  │                                                                 │   │
│  │  /context  /identity  /projects  /memory  /outcomes  /assembly  │   │
│  └─────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼───────────────────────────────┐   │
│  │                     SERVICE LAYER                                │   │
│  │                                                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │   │
│  │  │ Identity │ │ Project  │ │ Memory   │ │ Context Assembly │   │   │
│  │  │ Service  │ │ Service  │ │ Service  │ │     Service      │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │   │
│  └─────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼───────────────────────────────┐   │
│  │                    STORAGE LAYER                                 │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  PostgreSQL  │  │    Redis     │  │   pgvector   │          │   │
│  │  │  (Primary)   │  │   (Cache)    │  │  (Semantic)  │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API Framework | FastAPI (Python) | Async, typed, fast development |
| Primary Database | PostgreSQL 15+ | Robust, JSONB support, pgvector |
| Vector Search | pgvector extension | Semantic search, same DB |
| Cache Layer | Redis 7+ | Session state, hot data |
| Message Queue | Redis Streams | Event processing |
| Object Storage | S3-compatible | Large artifacts, exports |

---

## Data Models

### Core Tables

```sql
-- User context root
CREATE TABLE user_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_contexts_user ON user_contexts(user_id);

-- Identity attributes
CREATE TABLE identity_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL, -- string, number, array, object
    confidence FLOAT DEFAULT 0.5,
    source VARCHAR(50) NOT NULL, -- explicit, inferred, corrected
    source_ref UUID, -- Reference to interaction
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE,
    UNIQUE(context_id, key)
);

CREATE INDEX idx_identity_context ON identity_attributes(context_id);
CREATE INDEX idx_identity_key ON identity_attributes(key);
CREATE INDEX idx_identity_confidence ON identity_attributes(confidence);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, archived
    confidence FLOAT DEFAULT 0.5,
    user_confirmed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_context ON projects(context_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_last_active ON projects(last_active_at DESC);

-- Project goals
CREATE TABLE project_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    description TEXT NOT NULL,
    success_criteria JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    status VARCHAR(50) DEFAULT 'active', -- proposed, active, achieved, abandoned
    parent_goal_id UUID,
    confidence FLOAT DEFAULT 0.5,
    source_ref UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent FOREIGN KEY (parent_goal_id) REFERENCES project_goals(id)
);

CREATE INDEX idx_goals_project ON project_goals(project_id);
CREATE INDEX idx_goals_status ON project_goals(status);

-- Project constraints
CREATE TABLE project_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- technical, business, regulatory, personal
    severity VARCHAR(20) DEFAULT 'should', -- must, should, could
    verification_method TEXT,
    confidence FLOAT DEFAULT 0.5,
    source_ref UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_constraints_project ON project_constraints(project_id);
CREATE INDEX idx_constraints_category ON project_constraints(category);

-- Project decisions
CREATE TABLE project_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT,
    alternatives_considered JSONB DEFAULT '[]'::jsonb,
    made_at TIMESTAMPTZ DEFAULT NOW(),
    reversed_at TIMESTAMPTZ,
    source_ref UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_decisions_project ON project_decisions(project_id);
CREATE INDEX idx_decisions_made ON project_decisions(made_at DESC);

-- Interaction memory patterns
CREATE TABLE interaction_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    description TEXT NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- success, failure, workflow, topic
    frequency INTEGER DEFAULT 1,
    last_occurred TIMESTAMPTZ DEFAULT NOW(),
    examples JSONB DEFAULT '[]'::jsonb, -- Array of interaction refs
    confidence FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE
);

CREATE INDEX idx_patterns_context ON interaction_patterns(context_id);
CREATE INDEX idx_patterns_type ON interaction_patterns(pattern_type);

-- Corrections log
CREATE TABLE interaction_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    original_output TEXT NOT NULL,
    corrected_to TEXT NOT NULL,
    category VARCHAR(100),
    interaction_ref UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE
);

CREATE INDEX idx_corrections_context ON interaction_corrections(context_id);
CREATE INDEX idx_corrections_category ON interaction_corrections(category);

-- Outcome tracking
CREATE TABLE artifact_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    artifact_id UUID NOT NULL,
    feedback_signals JSONB DEFAULT '[]'::jsonb,
    usage_metrics JSONB,
    final_status VARCHAR(50), -- active, abandoned, superseded
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE
);

CREATE INDEX idx_outcomes_context ON artifact_outcomes(context_id);
CREATE INDEX idx_outcomes_artifact ON artifact_outcomes(artifact_id);

-- Semantic embeddings for search
CREATE TABLE context_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- identity, project, goal, constraint, decision, pattern
    source_id UUID NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA256 of embedded content
    embedding vector(1536), -- OpenAI ada-002 or similar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_context FOREIGN KEY (context_id) REFERENCES user_contexts(id) ON DELETE CASCADE
);

CREATE INDEX idx_embeddings_context ON context_embeddings(context_id);
CREATE INDEX idx_embeddings_source ON context_embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_vector ON context_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### TypeScript Interfaces

```typescript
// Core types matching database schema

interface UserContext {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ContextSettings;
}

interface IdentityAttribute {
  id: string;
  contextId: string;
  key: string;
  value: any;
  valueType: 'string' | 'number' | 'array' | 'object';
  confidence: number;
  source: 'explicit' | 'inferred' | 'corrected';
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  contextId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  confidence: number;
  userConfirmed: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  
  // Loaded relations
  goals?: ProjectGoal[];
  constraints?: ProjectConstraint[];
  decisions?: ProjectDecision[];
}

interface ProjectGoal {
  id: string;
  projectId: string;
  description: string;
  successCriteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'proposed' | 'active' | 'achieved' | 'abandoned';
  parentGoalId?: string;
  confidence: number;
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectConstraint {
  id: string;
  projectId: string;
  description: string;
  category: 'technical' | 'business' | 'regulatory' | 'personal';
  severity: 'must' | 'should' | 'could';
  verificationMethod?: string;
  confidence: number;
  sourceRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectDecision {
  id: string;
  projectId: string;
  description: string;
  rationale?: string;
  alternativesConsidered: string[];
  madeAt: Date;
  reversedAt?: Date;
  sourceRef?: string;
  createdAt: Date;
}

interface InteractionPattern {
  id: string;
  contextId: string;
  description: string;
  patternType: 'success' | 'failure' | 'workflow' | 'topic';
  frequency: number;
  lastOccurred: Date;
  examples: string[]; // Interaction refs
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

interface InteractionCorrection {
  id: string;
  contextId: string;
  originalOutput: string;
  correctedTo: string;
  category?: string;
  interactionRef?: string;
  createdAt: Date;
}

interface ArtifactOutcome {
  id: string;
  contextId: string;
  artifactId: string;
  feedbackSignals: FeedbackSignal[];
  usageMetrics?: UsageMetrics;
  finalStatus?: 'active' | 'abandoned' | 'superseded';
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackSignal {
  type: 'rating' | 'comment' | 'implicit';
  value: any;
  timestamp: Date;
  source: string;
}

interface ContextSettings {
  memoryEnabled: boolean;
  observationLevel: 0 | 1 | 2 | 3 | 4;
  retentionDays?: number;
  excludedTopics: string[];
}
```

---

## API Specification

### Base URL
```
https://api.claude.ai/v1/context
```

### Authentication
All endpoints require Bearer token authentication.

### Endpoints

#### Get Full Context
```
GET /

Response 200:
{
  "id": "uuid",
  "userId": "uuid",
  "identity": {
    "attributes": [IdentityAttribute]
  },
  "projects": [Project],
  "memory": {
    "patterns": [InteractionPattern],
    "corrections": [InteractionCorrection]
  },
  "outcomes": {
    "artifacts": [ArtifactOutcome]
  },
  "settings": ContextSettings
}
```

#### Get Identity
```
GET /identity

Response 200:
{
  "attributes": [IdentityAttribute]
}
```

#### Update Identity Attribute
```
PUT /identity/attributes/{key}

Request:
{
  "value": any,
  "source": "explicit" | "inferred" | "corrected"
}

Response 200:
IdentityAttribute
```

#### Delete Identity Attribute
```
DELETE /identity/attributes/{key}

Response 204
```

#### List Projects
```
GET /projects
Query params: status, limit, offset

Response 200:
{
  "projects": [Project],
  "total": number
}
```

#### Get Project
```
GET /projects/{projectId}
Query params: include (goals, constraints, decisions)

Response 200:
Project (with requested includes)
```

#### Create Project
```
POST /projects

Request:
{
  "name": string,
  "description"?: string,
  "goals"?: [GoalInput],
  "constraints"?: [ConstraintInput]
}

Response 201:
Project
```

#### Update Project
```
PATCH /projects/{projectId}

Request:
{
  "name"?: string,
  "description"?: string,
  "status"?: string
}

Response 200:
Project
```

#### Add Goal to Project
```
POST /projects/{projectId}/goals

Request:
{
  "description": string,
  "successCriteria"?: string[],
  "priority"?: string,
  "parentGoalId"?: string
}

Response 201:
ProjectGoal
```

#### Add Constraint to Project
```
POST /projects/{projectId}/constraints

Request:
{
  "description": string,
  "category": string,
  "severity"?: string
}

Response 201:
ProjectConstraint
```

#### Add Decision to Project
```
POST /projects/{projectId}/decisions

Request:
{
  "description": string,
  "rationale"?: string,
  "alternativesConsidered"?: string[]
}

Response 201:
ProjectDecision
```

#### Context Assembly (for Claude injection)
```
POST /assembly

Request:
{
  "query": string,
  "projectId"?: string,
  "maxTokens"?: number
}

Response 200:
{
  "context": string, // Formatted for Claude
  "sources": [ContextSource], // Attribution
  "relevanceScores": Record<string, number>
}
```

#### Export Context
```
POST /export

Request:
{
  "format": "json" | "yaml",
  "include"?: string[] // identity, projects, memory, outcomes
}

Response 202:
{
  "exportId": string,
  "status": "pending",
  "estimatedCompletion": timestamp
}

GET /export/{exportId}

Response 200:
{
  "exportId": string,
  "status": "completed" | "pending" | "failed",
  "downloadUrl"?: string,
  "expiresAt"?: timestamp
}
```

#### Delete All Context
```
DELETE /

Response 202:
{
  "deletionId": string,
  "status": "pending"
}
```

---

## Context Assembly Algorithm

### Overview

Context Assembly creates a relevance-ranked context payload for injection into Claude's system prompt.

### Algorithm

```python
async def assemble_context(
    user_id: str,
    query: str,
    project_id: Optional[str] = None,
    max_tokens: int = 4000
) -> AssembledContext:
    
    # 1. Load base context
    identity = await load_identity(user_id)
    
    # 2. Determine active project
    if project_id:
        project = await load_project(project_id)
    else:
        project = await infer_active_project(user_id, query)
    
    # 3. Generate query embedding
    query_embedding = await embed_text(query)
    
    # 4. Semantic search across context
    relevant_items = await semantic_search(
        user_id=user_id,
        embedding=query_embedding,
        limit=50
    )
    
    # 5. Score and rank items
    scored_items = []
    for item in relevant_items:
        score = calculate_relevance_score(
            item=item,
            query_embedding=query_embedding,
            project=project,
            recency_weight=0.3,
            confidence_weight=0.2,
            semantic_weight=0.5
        )
        scored_items.append((item, score))
    
    scored_items.sort(key=lambda x: x[1], reverse=True)
    
    # 6. Select items within token budget
    selected = []
    token_count = 0
    
    # Always include high-confidence identity
    for attr in identity.attributes:
        if attr.confidence > 0.8:
            tokens = count_tokens(format_identity_attr(attr))
            if token_count + tokens < max_tokens * 0.2:  # 20% budget for identity
                selected.append(('identity', attr))
                token_count += tokens
    
    # Include project context if active
    if project:
        project_context = format_project_context(project)
        tokens = count_tokens(project_context)
        if token_count + tokens < max_tokens * 0.5:  # 50% budget for project
            selected.append(('project', project))
            token_count += tokens
    
    # Fill remaining with relevant items
    for item, score in scored_items:
        if score < 0.3:  # Relevance threshold
            break
        tokens = count_tokens(format_item(item))
        if token_count + tokens > max_tokens:
            break
        selected.append((item.type, item))
        token_count += tokens
    
    # 7. Format for Claude
    formatted = format_for_claude(selected)
    
    return AssembledContext(
        context=formatted,
        sources=[item for _, item in selected],
        token_count=token_count
    )


def calculate_relevance_score(
    item: ContextItem,
    query_embedding: List[float],
    project: Optional[Project],
    recency_weight: float,
    confidence_weight: float,
    semantic_weight: float
) -> float:
    # Semantic similarity
    semantic_score = cosine_similarity(item.embedding, query_embedding)
    
    # Recency (decay over 30 days)
    days_old = (now() - item.updated_at).days
    recency_score = max(0, 1 - (days_old / 30))
    
    # Confidence
    confidence_score = item.confidence
    
    # Project relevance boost
    project_boost = 0
    if project and item.project_id == project.id:
        project_boost = 0.2
    
    return (
        semantic_score * semantic_weight +
        recency_score * recency_weight +
        confidence_score * confidence_weight +
        project_boost
    )
```

### Output Format

```xml
<claude_context>
  <user_identity confidence="0.85">
    <name>Alex Chen</name>
    <expertise area="frontend" level="senior"/>
    <expertise area="react" level="expert"/>
    <communication style="concise" detail_level="high"/>
    <preferences>
      <preference key="code_style">TypeScript with strict mode</preference>
      <preference key="documentation">inline comments preferred</preference>
    </preferences>
  </user_identity>
  
  <active_project name="Analytics Dashboard" id="proj_123" confidence="0.92">
    <status>active</status>
    <last_active>2024-01-20T15:30:00Z</last_active>
    
    <goals>
      <goal id="goal_1" status="active" priority="high">
        Build real-time analytics dashboard for customer metrics
      </goal>
      <goal id="goal_2" status="active" priority="medium">
        Support filtering by date range and customer segment
      </goal>
    </goals>
    
    <constraints>
      <constraint category="technical" severity="must">
        Must use existing GraphQL API - no REST endpoints
      </constraint>
      <constraint category="performance" severity="must">
        Dashboard must load in under 2 seconds
      </constraint>
      <constraint category="business" severity="should">
        Prefer charts consistent with existing design system
      </constraint>
    </constraints>
    
    <decisions>
      <decision made="2024-01-15">
        Using React Query for data fetching - chosen over SWR for better DevTools
      </decision>
      <decision made="2024-01-18">
        D3.js for custom visualizations where Recharts is insufficient
      </decision>
    </decisions>
  </active_project>
  
  <interaction_memory>
    <pattern type="success" frequency="5">
      User prefers seeing code examples before explanations
    </pattern>
    <pattern type="workflow" frequency="3">
      User typically starts with component structure, then adds logic
    </pattern>
    <correction>
      User corrected: prefers TypeScript strict mode, not loose
    </correction>
  </interaction_memory>
  
  <relevant_artifacts>
    <artifact id="art_456" type="component" name="DashboardLayout">
      Last modified: 2024-01-19
    </artifact>
  </relevant_artifacts>
</claude_context>
```

---

## Caching Strategy

### Redis Cache Structure

```
# User context summary (hot data)
context:{user_id}:summary -> JSON (TTL: 5 min)

# Active project
context:{user_id}:active_project -> project_id (TTL: 1 hour)

# Recent interactions
context:{user_id}:recent -> List of interaction IDs (TTL: 24 hours)

# Embeddings cache
embeddings:{content_hash} -> vector (TTL: 7 days)

# Assembly cache (query-specific)
assembly:{user_id}:{query_hash} -> AssembledContext (TTL: 5 min)
```

### Cache Invalidation

| Event | Invalidation |
|-------|--------------|
| Identity update | `context:{user_id}:summary` |
| Project update | `context:{user_id}:summary`, `context:{user_id}:active_project` |
| New interaction | `context:{user_id}:recent` |
| Any context change | `assembly:{user_id}:*` |

---

## Performance Requirements

| Operation | Target | P99 |
|-----------|--------|-----|
| Get context summary | 50ms | 150ms |
| Get full context | 100ms | 300ms |
| Update attribute | 50ms | 150ms |
| Context assembly | 100ms | 250ms |
| Semantic search | 50ms | 150ms |
| Export (small) | 5s | 15s |
| Export (large) | 30s | 120s |

---

## Security

### Data Encryption

- At rest: AES-256 via PostgreSQL TDE or application-level
- In transit: TLS 1.3 required
- Embeddings: Encrypted same as source data

### Access Control

```python
# All operations require user authentication
@require_auth
async def get_context(user_id: str, current_user: User):
    # Users can only access their own context
    if user_id != current_user.id:
        raise ForbiddenError()
    ...
```

### Audit Logging

All mutations logged:
```json
{
  "timestamp": "2024-01-20T15:30:00Z",
  "user_id": "user_123",
  "action": "update_identity_attribute",
  "resource": "identity.expertise.python",
  "old_value": "intermediate",
  "new_value": "advanced",
  "source_ip": "192.168.1.1"
}
```

---

## Monitoring

### Key Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| Context assembly latency p99 | > 250ms |
| Database connection pool usage | > 80% |
| Cache hit rate | < 70% |
| Error rate | > 1% |
| Storage per user (avg) | > 100MB |

### Health Checks

```
GET /health

Response 200:
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected",
  "latency_ms": 12
}
```

---

## Migration Strategy

### From Current Memory System

1. Export existing memory as identity attributes
2. Set confidence = 0.5 (unconfirmed)
3. Prompt users to confirm/correct on next session
4. Deprecate old memory after 30 days

---

## Related Documents

- PRD-001: Claude Context
- ADR-002: Context Layer Architecture
- SPEC-002: Intent Graph Schema
