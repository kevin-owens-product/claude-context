# Forge Method: ADR-First Development Plan

The Forge Method requires Architecture Decision Records (ADRs) before implementation. This plan creates all ADRs first, then proceeds to design and implementation.

---

## Complete ADR Inventory

### Core Platform ADRs (from Forge Method v4.1)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | Vertical Slice Architecture | Required |
| ADR-002 | API Strategy (REST + tRPC) | Required |
| ADR-003 | Tenant Isolation | Required |
| ADR-004 | Caching Strategy | Required |
| ADR-005 | Deployment Strategy | Required |
| ADR-006 | Multi-Region Architecture | Required |
| ADR-007 | i18n Strategy | Required |
| ADR-008 | SSO Architecture | Required |
| ADR-009 | Connection Pooling (PgBouncer) | Required |
| ADR-010 | Custom Roles & Permissions | Required |
| ADR-011 | Approval Workflows | Required |
| ADR-012 | Sandbox Environments | Required |
| ADR-013 | SIEM Integration | Required |

### Claude Context ADRs (Product-Specific)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-014 | Context Graph Storage Strategy | Required |
| ADR-015 | Slice State Machine | Required |
| ADR-016 | Feedback Collection Pipeline | Required |
| ADR-017 | MCP Server Architecture | Required |
| ADR-018 | Context Compilation Algorithm | Required |
| ADR-019 | Token Budget Management | Required |
| ADR-020 | External Integration Sync | Required |

---

## ADR Template (Forge Standard)

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue we're seeing that motivates this decision?]

## Decision
[What is the change we're proposing and/or doing?]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Risks
- [Risk 1 and mitigation]

## Alternatives Considered
1. [Alternative 1] - [Why rejected]
2. [Alternative 2] - [Why rejected]

## Implementation Notes
[Technical details, dependencies, migration path]

## References
- [Link to related docs, specs, or other ADRs]
```

---

## Phase 0: Generate All ADRs

### Prompt: Generate Core Platform ADRs

```
Read the-forge-method.md thoroughly. Create all 13 core platform ADRs following the Forge ADR template.

For each ADR, extract the decision from the-forge-method.md and expand with:
- Context: Why this decision matters for enterprise SaaS
- Consequences: Positive, negative, and risks
- Alternatives: What else was considered
- Implementation notes: Key technical details

Create these files in tools/adrs/:
1. ADR-001-vertical-slice-architecture.md
2. ADR-002-api-strategy.md
3. ADR-003-tenant-isolation.md
4. ADR-004-caching-strategy.md
5. ADR-005-deployment-strategy.md
6. ADR-006-multi-region.md
7. ADR-007-i18n-strategy.md
8. ADR-008-sso-architecture.md
9. ADR-009-connection-pooling.md
10. ADR-010-custom-roles.md
11. ADR-011-approval-workflows.md
12. ADR-012-sandbox-environments.md
13. ADR-013-siem-integration.md

Also create tools/adrs/README.md with an index of all ADRs and their status.

Commit with message: "docs: Add core platform ADRs (001-013) per Forge Method"
```

### Prompt: Generate Claude Context ADRs

```
Read claude-context-pitch.md and claude-context-ux-spec.md. Create product-specific ADRs for Claude Context.

ADR-014: Context Graph Storage Strategy
- Decision: How to store and query the context graph (PostgreSQL with JSONB vs graph DB vs hybrid)
- Consider: Query patterns, scalability, tenant isolation

ADR-015: Slice State Machine
- Decision: State transitions (draft → active → review → completed → archived)
- Consider: Validation rules, rollback, concurrent editing

ADR-016: Feedback Collection Pipeline
- Decision: How to capture, store, and process feedback signals
- Consider: Real-time vs batch, aggregation, privacy

ADR-017: MCP Server Architecture
- Decision: How to expose Claude Context via MCP protocol
- Consider: Tool definitions, authentication, rate limiting

ADR-018: Context Compilation Algorithm
- Decision: How to select and prioritize context for token budget
- Consider: Relevance scoring, summarization, caching

ADR-019: Token Budget Management
- Decision: How to allocate and track token usage across context types
- Consider: Org vs workspace vs slice budgets, overflow handling

ADR-020: External Integration Sync
- Decision: How to sync context from GitHub, Figma, Notion, etc.
- Consider: Webhooks vs polling, conflict resolution, freshness

Create in tools/adrs/ and update the README index.

Commit with message: "docs: Add Claude Context ADRs (014-020)"
```

---

## Revised Development Plan (ADR-First)

### Phase 0: Architecture Decisions (Do This First)
1. Generate all 13 core platform ADRs
2. Generate all 7 Claude Context ADRs
3. Create ADR review queue (tools/adrs/review-queue.md)
4. **Checkpoint: All ADRs committed before any code**

### Phase 1: Requirements (With ADR References)
1. Generate PRD referencing relevant ADRs ✅ (Done)
2. Generate user stories with ADR traceability ✅ (Done)
3. Gap analysis mapping stories to ADRs

### Phase 2: Design (Implementing ADR Decisions)
1. C4 diagrams reflecting ADR-002 (API), ADR-003 (Tenant), ADR-006 (Multi-region)
2. Prisma schema reflecting ADR-003, ADR-014 (Context Graph)
3. API spec reflecting ADR-002, ADR-017 (MCP)
4. Component design reflecting ADR-015 (Slice State Machine)

### Phase 3: Implementation (ADR-Verified)
1. Each package references its governing ADRs
2. Code comments link to ADR decisions
3. Tests verify ADR constraints (e.g., tenant isolation from ADR-003)

### Phase 4: Quality (ADR Compliance)
1. CI checks for ADR references in new code
2. ADR review every 30 days (Law #29)
3. Track ADR violations in quality dashboard

---

## Quick Start: Run This Now

Paste this into Claude Code to generate all ADRs:

```
Execute Phase 0 - ADR Generation following the Forge Method:

1. Read the-forge-method.md completely
2. Create tools/adrs/ directory structure
3. Generate ADRs 001-013 (Core Platform) with full content:
   - Context explaining the problem
   - Decision with specific choices made
   - Consequences (positive, negative, risks)
   - Alternatives considered
   - Implementation notes
4. Read claude-context-pitch.md and claude-context-ux-spec.md
5. Generate ADRs 014-020 (Claude Context) with full content
6. Create tools/adrs/README.md as master index
7. Create tools/adrs/review-queue.md for tracking reviews

Use the Forge ADR template. Each ADR should be 100-200 lines with substantive content.

Track progress with todos. Commit after core ADRs (001-013), then again after product ADRs (014-020).
```

---

## ADR Governance (From Forge Law #29)

After ADRs are created:

```
Create tools/adrs/review-queue.md with:
1. Review schedule (every 30 days)
2. ADR status tracking
3. Deprecation process
4. Amendment process

Format as a table:
| ADR | Last Review | Next Review | Status | Owner |
```
