# Claude Code CLI Prompts for Autonomous Development

A library of CLI prompts to autonomously generate requirements, design, and code for the Forge Factory / Claude Context platform.

---

## Phase 1: Requirements Gathering

### 1.1 Generate Product Requirements Document (PRD)

```bash
claude "Read the-forge-method.md and claude-context-pitch.md, then generate a detailed PRD for the Claude Context product. Include:
1. Executive summary
2. Problem statement with quantified pain points
3. Target users and personas (at least 3)
4. Core features with priority ranking (P0/P1/P2)
5. Success metrics and KPIs
6. Technical constraints
7. Dependencies and assumptions
8. Out of scope items
Output as tools/docs/PRD-claude-context.md"
```

### 1.2 Generate User Stories from Specifications

```bash
claude "Analyze claude-context-ux-spec.md and extract all user stories in the format:
'As a [persona], I want to [action] so that [benefit]'
Group by feature area: Context Management, Slices, Feedback, Integrations.
Include acceptance criteria for each story.
Estimate complexity (S/M/L/XL).
Output as tools/docs/user-stories.md"
```

### 1.3 Generate ADR from Requirements

```bash
claude "Based on the-forge-method.md, create Architecture Decision Records for the following topics. Follow the ADR template (Title, Status, Context, Decision, Consequences):
1. ADR-014: Context Graph Storage Strategy
2. ADR-015: Slice State Machine
3. ADR-016: Feedback Collection Pipeline
4. ADR-017: MCP Server Architecture
Create each file in tools/adrs/"
```

### 1.4 Requirements Gap Analysis

```bash
claude "Compare claude-context-pitch.md against the-forge-method.md. Identify:
1. Features mentioned in the pitch but missing from Forge packages
2. Forge packages that need modification for Claude Context
3. New packages required
4. Integration points between systems
Output a gap analysis report to tools/docs/gap-analysis.md"
```

---

## Phase 2: Design & Architecture

### 2.1 Generate System Architecture Diagram (Mermaid)

```bash
claude "Create a comprehensive C4 system architecture diagram for Claude Context using Mermaid syntax. Include:
- Level 1: System Context (Claude Context + external systems)
- Level 2: Container diagram (services, databases, queues)
- Level 3: Component diagram for the Context Service
Reference the architecture in claude-context-pitch.md.
Output to tools/diagrams/claude-context-architecture.md"
```

### 2.2 Generate Database Schema Design

```bash
claude "Design the Prisma schema for Claude Context based on claude-context-pitch.md and claude-context-ux-spec.md. Include models for:
- Workspace, ContextGraph, ContextNode, ContextEdge
- Slice, SliceConstraint, SliceContext
- Feedback, FeedbackDimension, AISession
- Integration, SyncJob
Follow Forge conventions: tenant isolation, audit fields, soft delete.
Output to packages/prisma/schema-context.prisma"
```

### 2.3 Generate API Design (OpenAPI)

```bash
claude "Design the REST API specification for Claude Context. Based on claude-context-ux-spec.md, create endpoints for:
- Context CRUD (/workspaces, /context-graphs, /nodes)
- Slice management (/slices, /slices/:id/compile)
- Feedback collection (/sessions, /feedback)
- MCP server endpoints
Include request/response schemas, error codes, and authentication.
Output OpenAPI 3.1 spec to tools/docs/openapi-context.yaml"
```

### 2.4 Generate Component Design Document

```bash
claude "Create a detailed component design for the Slice system. Based on the Slice concept in claude-context-pitch.md:
1. State machine diagram (pending → active → review → completed)
2. Context compilation algorithm (pseudocode)
3. Token budget optimization strategy
4. Constraint validation rules
5. Integration with external tools (GitHub, Figma, Notion)
Output to tools/docs/slice-design.md"
```

### 2.5 Generate UI Component Inventory

```bash
claude "Based on claude-context-ux-spec.md, create a complete UI component inventory for the design system. For each component specify:
- Component name and description
- Props interface (TypeScript)
- Variants and states
- Accessibility requirements
- Storybook scenarios
Group by: Context Panel, Slice Management, Feedback, Analytics.
Output to packages/design-system/COMPONENTS.md"
```

---

## Phase 3: Implementation

### 3.1 Scaffold the Context Package

```bash
claude "Create the @forge/context package following the Forge Method conventions. Include:
1. Package structure (index.ts, types, service, repository, errors)
2. ContextService interface with methods: compile, search, add, remove, getGraph
3. ContextRepository with Prisma integration
4. Unit test stubs with Vitest
5. README.md and CHANGELOG.md
Follow prompt-id conventions from CLAUDE.md.
Create all files in packages/context/"
```

### 3.2 Implement the Slice Service

```bash
claude "Implement the SliceService in packages/context/src/slice.service.ts:
1. Create, update, delete, list slices
2. State machine transitions with validation
3. Context compilation (gather org + workspace + slice context)
4. Token budget management
5. Constraint validation
Include comprehensive unit tests.
Follow Forge conventions: audit calls, typed errors, tenant isolation."
```

### 3.3 Generate Context Graph Implementation

```bash
claude "Implement the Context Graph system:
1. ContextGraphService - CRUD for graphs and nodes
2. ContextNodeTypes: Document, Decision, Pattern, ExternalLink
3. Edge types: references, implements, constrains
4. Semantic search using embeddings (interface only)
5. Freshness tracking and validation
Create in packages/context/src/graph/"
```

### 3.4 Implement MCP Server

```bash
claude "Create an MCP server for Claude Context following the MCP specification. Implement tools:
- get_active_context(slice_id, token_budget)
- search_context(query, workspace_id)
- record_feedback(session_id, score, errors)
- get_slice(slice_id)
Follow the pattern in claude-context-pitch.md.
Create in packages/context/src/mcp/"
```

### 3.5 Generate React Components for Context Panel

```bash
claude "Implement the Context Panel React components from claude-context-ux-spec.md:
1. ContextPanel (collapsed/expanded states)
2. ContextPackageTree (org/workspace/slice hierarchy)
3. TokenBudgetIndicator
4. ContextCitation (for AI responses)
5. AddContextModal
Use Radix UI primitives, Tailwind CSS, and follow accessibility guidelines.
Include Storybook stories for each component.
Create in packages/design-system/src/context-panel/"
```

### 3.6 Generate Slice Management UI

```bash
claude "Implement the Slice management React components:
1. SliceList - card-based list with status indicators
2. SliceDetail - full slice view with context, constraints, criteria
3. SliceForm - create/edit slice
4. ConstraintEditor - add/edit constraints
5. AcceptanceCriteriaChecklist
Include keyboard navigation (⌘K command palette integration).
Create in packages/design-system/src/slices/"
```

### 3.7 Generate NestJS API Module

```bash
claude "Create the NestJS ContextModule for the API:
1. ContextController with REST endpoints
2. SliceController with CRUD + compile endpoint
3. FeedbackController for session feedback
4. GraphController for context graph management
5. Guards: TenantGuard, PermissionGuard
6. DTOs with Zod validation
7. OpenAPI decorators
Create in apps/api/src/modules/context/"
```

### 3.8 Generate Integration Tests

```bash
claude "Create comprehensive integration tests for the Context system:
1. Context compilation with various token budgets
2. Slice state machine transitions
3. Multi-tenant isolation verification
4. API endpoint tests with MSW
5. Database transaction tests
Use Vitest and follow Forge testing conventions.
Create in packages/context/src/__tests__/integration/"
```

### 3.9 Generate E2E Tests

```bash
claude "Create Playwright E2E tests for critical user journeys:
1. Create workspace and add context documents
2. Create slice with outcome, constraints, and criteria
3. Start AI session with compiled context
4. Provide feedback on AI session
5. Review context compilation preview
Create in apps/portal/e2e/context/"
```

---

## Phase 4: Quality & Operations

### 4.1 Generate Terraform Infrastructure

```bash
claude "Create Terraform modules for Claude Context infrastructure:
1. RDS PostgreSQL with PgBouncer (RDS Proxy)
2. Redis for context caching
3. S3 for external document storage
4. Lambda for async context compilation
5. API Gateway for MCP server
Follow multi-region patterns from the-forge-method.md.
Create in tools/terraform/modules/context/"
```

### 4.2 Generate Runbooks

```bash
claude "Create operational runbooks for Claude Context:
1. Context compilation timeout troubleshooting
2. Slice stuck in pending state
3. Token budget exceeded alerts
4. Integration sync failures
5. Context graph corruption recovery
Follow Forge runbook format with severity, symptoms, diagnosis, resolution.
Create in tools/runbooks/context/"
```

### 4.3 Generate Monitoring Dashboard

```bash
claude "Create a Grafana dashboard specification for Claude Context:
1. Context compilation latency (p50, p95, p99)
2. Token usage by workspace
3. Slice state distribution
4. Feedback scores over time
5. Integration sync health
6. Error rates by type
Output JSON dashboard to tools/grafana/context-dashboard.json"
```

### 4.4 Generate Security Scan Rules

```bash
claude "Create Semgrep rules specific to Claude Context:
1. Prevent raw context injection (must use sanitization)
2. Ensure tenant isolation on all queries
3. Validate token limits before compilation
4. Audit logging required for context mutations
5. No PII in compiled context output
Create in tools/semgrep/context-rules.yaml"
```

---

## Phase 5: Full Autonomous Build

### 5.1 Complete Vertical Slice

```bash
claude "Execute a complete vertical slice for 'Context Management':
1. Read the-forge-method.md and AUTONOMOUS.md for conventions
2. Create Prisma schema for Context entities
3. Implement @forge/context package (service, repository, types, errors)
4. Create NestJS ContextModule with REST + tRPC endpoints
5. Implement React components (ContextPanel, ContextTree)
6. Create unit tests (80%+ coverage)
7. Create integration tests
8. Create E2E test for happy path
9. Add i18n translations (en-US, de-DE, ja-JP)
10. Generate OpenAPI documentation
11. Create ADR for any decisions made
12. Commit with conventional commit message
Follow all Forge Laws and quality gates. Track progress with todos."
```

### 5.2 Full Platform Build (Phased)

```bash
claude "Execute Phase 1 (Foundation) of the autonomous build per AUTONOMOUS.md:
1. Create @forge/database package with connection pooling
2. Create @forge/cache package with Redis patterns
3. Create @forge/queue package with BullMQ
4. Create @forge/storage package with S3 abstraction
Run quality gates after each package.
Track progress in .claude/build-state.json.
Commit after each successful package."
```

### 5.3 Build Feature from ADR

```bash
claude "Build the Slice Management feature from ADR-015 (if exists) or create the ADR first:
1. Read all related ADRs and dependencies
2. Verify prerequisites are satisfied
3. Generate complete vertical slice
4. Run all quality gates
5. Create PR with summary
Follow AUTONOMOUS.md skill pattern for /build-feature."
```

---

## Quick Reference Commands

### Status & Planning
```bash
# Check what's implemented
claude "Analyze the codebase and report: which Forge packages exist vs are planned in the-forge-method.md. Output as a table with status (implemented/partial/missing)."

# Get next priority
claude "Based on AUTONOMOUS.md build phases and current code, what should be built next? Consider dependencies and blocking factors."

# Generate sprint plan
claude "Create a 2-week sprint plan for implementing Claude Context MVP. Include stories from the PRD, estimate points, identify risks."
```

### Code Generation
```bash
# Generate from pattern
claude "Find an existing service in packages/ and create a new service following the same pattern for [FEATURE_NAME]."

# Add feature flag
claude "Add a feature flag 'context_v2_enabled' following Forge conventions. Update packages/feature-flags and add toggle in admin."

# Add new permission
claude "Add permission 'context:compile' to the permission catalog per packages/roles specification. Update guards and tests."
```

### Testing & Quality
```bash
# Generate missing tests
claude "Find all files in packages/context with <80% test coverage and generate comprehensive tests to reach 80%+."

# Run quality gates
claude "Run all Forge quality gates: TypeScript, ESLint, Prettier, circular deps, tests, coverage, security scan. Report results."

# Fix lint errors
claude "Run ESLint on packages/context, fix all auto-fixable issues, and report remaining issues that need manual review."
```

---

## Usage Notes

1. **Start with requirements** - Run Phase 1 prompts first to establish clear requirements and ADRs
2. **Design before code** - Phase 2 prompts create the architectural foundation
3. **Vertical slices** - Always implement complete features (schema → API → UI → tests)
4. **Track progress** - Use the todo list and build-state.json for complex builds
5. **Quality first** - Run quality gates frequently, not just at the end

Each prompt is designed to be self-contained and can be run independently or as part of a larger workflow.
