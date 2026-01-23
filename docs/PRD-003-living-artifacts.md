# PRD-003: Living Artifacts

## Document Information
| Field | Value |
|-------|-------|
| **Product** | Living Artifacts |
| **Author** | Kevin [Last Name] |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Target Release** | Phase 2 |

---

## Executive Summary

Living Artifacts transforms Claude's outputs from static exports into persistent, evolving objects that maintain their connection to Claude's understanding. Artifacts can be queried, evolved, observed, and improved over time—they don't die when exported.

**Key Insight:** Currently, artifacts leave Claude's world on export. Living Artifacts maintain bidirectional connection, enabling continuous evolution and feedback-driven improvement.

---

## Problem Statement

### Current State Problems

1. **Artifacts Die on Export**
   - User creates code, document, or diagram
   - Exports from Claude
   - Artifact becomes static file
   - Claude has no memory of it

2. **Evolution Requires Full Re-explanation**
   - "Update the dashboard I made last week"
   - Claude: "I don't have access to that"
   - User must re-upload and re-explain context
   - Previous reasoning is lost

3. **No Feedback Loop**
   - Artifact is used (or not)
   - Errors are found (or not)
   - Claude never knows
   - Can't improve based on real outcomes

4. **Cross-Surface Fragmentation**
   - Created in Claude.ai Chat
   - Need to use in Claude Code
   - No transfer mechanism
   - Recreate from scratch

---

## Solution Overview

Living Artifacts have:

| Property | Description |
|----------|-------------|
| **Persistent Identity** | Unique ID survives exports and sessions |
| **Intent Connection** | Links to Intent Graph that defined it |
| **Version History** | Tracked at intent level, not just bytes |
| **Feedback Channel** | Can receive outcome signals |
| **Cross-Surface Access** | Available from any Claude surface |
| **Evolution Capability** | Can be modified through continued conversation |

---

## User Stories

### Persistence and Access

**US-1: Cross-Session Artifact Access**
> As a user, I want to reference artifacts from previous sessions so that I can continue working on them.

Acceptance Criteria:
- [ ] User can say "open the dashboard component"
- [ ] Claude recognizes and retrieves artifact
- [ ] Full artifact content is available
- [ ] Original intent/context is preserved
- [ ] User can continue editing

**US-2: Cross-Surface Artifact Access**
> As a user, I want my artifacts available in any Claude surface so that I have a unified experience.

Acceptance Criteria:
- [ ] Artifact created in Chat available in Code
- [ ] Artifact created in Code available in Chat
- [ ] Artifact metadata consistent across surfaces
- [ ] Edit in one surface, changes visible in others

**US-3: Artifact Discovery**
> As a user, I want to browse and search my artifacts so that I can find what I've created.

Acceptance Criteria:
- [ ] List view of all artifacts
- [ ] Search by name, type, content
- [ ] Filter by project, date, status
- [ ] Preview without full load
- [ ] Quick access to recent artifacts

### Evolution

**US-4: Conversational Evolution**
> As a user, I want to evolve artifacts through conversation so that updates are natural.

Acceptance Criteria:
- [ ] "Add error handling to the login function"
- [ ] Claude identifies the artifact
- [ ] Claude applies changes with context
- [ ] Version history tracks change and reason
- [ ] User confirms or adjusts

**US-5: Intent-Driven Evolution**
> As a user, I want artifact changes linked to intent changes so that requirements and implementation stay aligned.

Acceptance Criteria:
- [ ] Intent change triggers artifact update suggestion
- [ ] User can see which intent changed
- [ ] User can preview artifact changes
- [ ] User can accept, modify, or reject
- [ ] Provenance maintained

**US-6: Version Comparison**
> As a user, I want to compare artifact versions so that I can understand what changed.

Acceptance Criteria:
- [ ] View any previous version
- [ ] Diff between versions
- [ ] See what intent drove each change
- [ ] Restore previous version if needed

### Feedback Integration

**US-7: Explicit Artifact Feedback**
> As a user, I want to give feedback on artifacts so that Claude can learn what works.

Acceptance Criteria:
- [ ] Rate artifact quality
- [ ] Mark as "works" or "doesn't work"
- [ ] Provide specific feedback
- [ ] Feedback stored with artifact
- [ ] Claude uses feedback in future suggestions

**US-8: Usage-Based Feedback**
> As a user, I want Claude to learn from how I use artifacts so that it understands what's valuable.

Acceptance Criteria:
- [ ] Artifacts I keep using = valuable
- [ ] Artifacts I immediately edit = needs improvement
- [ ] Artifacts I abandon = missed the mark
- [ ] Patterns inform future generation

### Export and Sync

**US-9: Export with Identity**
> As a user, I want exported artifacts to maintain their identity so that they can reconnect later.

Acceptance Criteria:
- [ ] Export includes embedded artifact ID
- [ ] Exported file works standalone
- [ ] Re-import reconnects to original
- [ ] External edits can be synced

**US-10: External Integration**
> As a user, I want to connect artifacts to external systems so that they stay in sync.

Acceptance Criteria:
- [ ] Connect artifact to GitHub file
- [ ] Connect artifact to Google Doc
- [ ] Bi-directional sync available
- [ ] Conflict resolution for divergence

---

## Functional Requirements

### FR-1: Artifact Identity

**FR-1.1: Unique Identification**
- Every artifact shall have globally unique ID (UUID)
- ID shall be immutable for artifact lifetime
- ID shall survive all operations (edit, export, import)
- ID shall be human-shareable (short form available)

**FR-1.2: Identity Embedding**
- Exported artifacts shall contain embedded ID
- ID location depends on format (comment, metadata)
- Embedding shall not affect artifact functionality
- Embedding shall be extractable by re-import

### FR-2: Artifact Storage

**FR-2.1: Content Storage**
```typescript
interface LivingArtifact {
  // Identity
  id: UUID;
  shortId: string; // Human-readable
  name: string;
  type: ArtifactType;
  
  // Content
  content: ArtifactContent;
  contentType: string; // MIME type
  size: number;
  
  // Intent Connection
  projectId: UUID;
  intentGraphId: UUID;
  intentNodeIds: UUID[];
  
  // Versioning
  version: number;
  intentVersion: number;
  versionHistory: ArtifactVersion[];
  
  // Feedback
  feedbackSignals: FeedbackSignal[];
  qualityScore?: number;
  
  // Lifecycle
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAccessedAt: Timestamp;
  
  // Cross-Surface
  originSurface: Surface;
  accessedFrom: Surface[];
  
  // External Links
  externalLinks: ExternalLink[];
  lastSyncedAt?: Timestamp;
}

type ArtifactType = 
  | 'code'           // Source code
  | 'component'      // UI component
  | 'document'       // Text document
  | 'diagram'        // Visual diagram
  | 'schema'         // Data schema
  | 'configuration'  // Config files
  | 'composite';     // Multi-file artifact
```

**FR-2.2: Version Management**
- Every modification creates new version
- Versions linked to intent versions
- Versions include change rationale
- Any version retrievable
- Diff computation supported

### FR-3: Artifact Access

**FR-3.1: Retrieval Methods**

| Method | Trigger | Context |
|--------|---------|---------|
| Direct ID | User provides ID | None required |
| Name reference | "the dashboard component" | Project context |
| Contextual | Inferred from conversation | Full context |
| Browse | User opens artifact list | None required |
| Search | User searches artifacts | Query terms |

**FR-3.2: Access Control**
- Artifacts belong to user (private default)
- Shareable via generated link
- Share link can be read-only or editable
- Team artifacts for collaborative projects

### FR-4: Artifact Evolution

**FR-4.1: Evolution Triggers**

| Trigger | Flow |
|---------|------|
| User request | "Add feature X" → Identify artifact → Apply change |
| Intent change | Intent updated → Affected artifacts flagged → User decides |
| Feedback | Negative feedback → Claude suggests improvement |
| External change | Synced source changed → Merge flow |

**FR-4.2: Change Application**
- Claude applies changes with full context
- Changes preview before commit
- Rationale recorded with change
- Rollback available

**FR-4.3: Conflict Resolution**
- Multiple evolution sources detected
- User shown all pending changes
- User can merge, accept one, or modify
- Resolution recorded

### FR-5: Feedback Integration

**FR-5.1: Explicit Feedback**
- Rating (1-5 stars or thumbs up/down)
- Text feedback
- Issue flagging
- Success confirmation

**FR-5.2: Implicit Feedback**
- Access patterns (frequent = valuable)
- Edit timing (immediate edit = not quite right)
- Retention (kept vs. deleted)
- Usage duration

**FR-5.3: Feedback Usage**
- Quality score computed from signals
- Informs future similar generations
- Surfaced in artifact list
- Aggregate patterns for improvement

### FR-6: External Integration

**FR-6.1: Supported Integrations**

| System | Capabilities |
|--------|-------------|
| GitHub | Sync with repo files |
| GitLab | Sync with repo files |
| Google Docs | Sync with documents |
| Notion | Sync with pages |
| Local filesystem | Via Claude Code |

**FR-6.2: Sync Behavior**
- Two-way sync available
- Conflict detection
- Sync frequency configurable
- Manual sync option

---

## Non-Functional Requirements

### NFR-1: Performance

| Operation | Target | Critical |
|-----------|--------|----------|
| Artifact retrieval | <500ms | <2s |
| Version diff | <1s | <3s |
| Export | <2s | <5s |
| Search | <1s | <3s |

### NFR-2: Storage

- Artifact size limit: 10MB (soft), 50MB (hard)
- Version retention: 100 versions (configurable)
- Total storage per user: 10GB (expandable)
- Compression for inactive artifacts

### NFR-3: Reliability

- Artifact durability: 99.999999999% (11 nines)
- No data loss on any failure
- Sync conflicts never lose data (both preserved)

---

## User Interface Requirements

### UI-1: Artifact Library

**Location:** Accessible from all surfaces

**Components:**
1. **List View** - Name, type, status, last modified
2. **Grid View** - Previews with quick actions
3. **Search Bar** - Full-text and filtered search
4. **Filters** - By type, project, date, status
5. **Quick Actions** - Open, share, delete, archive

### UI-2: Artifact Detail View

**Components:**
1. **Content Display** - Rendered or syntax-highlighted
2. **Metadata Panel** - ID, versions, intent links
3. **Version Timeline** - Visual history
4. **Feedback Section** - Ratings, comments
5. **External Links** - Connected systems

### UI-3: Evolution Interface

**Components:**
1. **Change Preview** - Side-by-side diff
2. **Intent Context** - What changed and why
3. **Action Buttons** - Accept, modify, reject
4. **Conflict Resolution** - When applicable

---

## API Specification

### Artifact CRUD

```
GET /api/v1/artifacts
Query: { projectId?, type?, status?, search?, limit, offset }
Returns: { artifacts: Artifact[], total: number }

GET /api/v1/artifacts/{artifactId}
Returns: Artifact

POST /api/v1/artifacts
Body: { name, type, content, projectId, intentNodeIds }
Returns: Artifact

PATCH /api/v1/artifacts/{artifactId}
Body: { content?, name?, status? }
Query: { reason: string } // For version history
Returns: Artifact

DELETE /api/v1/artifacts/{artifactId}
Returns: 204
```

### Version Management

```
GET /api/v1/artifacts/{artifactId}/versions
Returns: ArtifactVersion[]

GET /api/v1/artifacts/{artifactId}/versions/{version}
Returns: ArtifactVersion

GET /api/v1/artifacts/{artifactId}/diff
Query: { from: number, to: number }
Returns: Diff

POST /api/v1/artifacts/{artifactId}/restore/{version}
Returns: Artifact
```

### Feedback

```
POST /api/v1/artifacts/{artifactId}/feedback
Body: { type: 'rating' | 'comment', value: any }
Returns: FeedbackSignal
```

### External Sync

```
POST /api/v1/artifacts/{artifactId}/link
Body: { system: string, target: string }
Returns: ExternalLink

POST /api/v1/artifacts/{artifactId}/sync
Returns: SyncResult

DELETE /api/v1/artifacts/{artifactId}/link/{linkId}
Returns: 204
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Artifact re-access rate | >30% | Analytics |
| Cross-session continuity | >50% of artifacts accessed later | Analytics |
| Evolution success | >80% changes accepted | User actions |
| Feedback provision | >10% of artifacts | Analytics |
| External sync usage | >20% of code artifacts | Analytics |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Storage costs | Tiered storage, archive inactive |
| Sync conflicts | Never lose data, clear resolution UX |
| Version explosion | Retention policies, smart consolidation |
| Performance at scale | Lazy loading, caching, CDN |

---

## Appendix

### A. Artifact ID Embedding Examples

**JavaScript/TypeScript:**
```javascript
/**
 * @artifact-id art_abc123xyz
 * @artifact-version 3
 * @intent-ref gol_456
 */
export function Dashboard() {
  // ...
}
```

**Markdown:**
```markdown
<!-- artifact:art_abc123xyz:v3 -->
# Dashboard Design Document
...
```

**JSON:**
```json
{
  "$artifact": {
    "id": "art_abc123xyz",
    "version": 3
  },
  "data": {
    // actual content
  }
}
```

### B. Related Documents

- ADR-003: Living Artifacts
- PRD-001: Claude Context
- PRD-002: Intent Graph
