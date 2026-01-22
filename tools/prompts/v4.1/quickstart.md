# Quickstart: Sync & Run Autonomous Development

## Step 1: Sync Repository Locally

```bash
# Clone (if new machine)
git clone https://github.com/kevin-owens-product/claude-context.git
cd claude-context

# Or pull latest (if already cloned)
git fetch origin
git checkout main
git pull origin main

# Switch to development branch (if working on feature)
git checkout claude/review-md-create-prompts-pjH3G
git pull origin claude/review-md-create-prompts-pjH3G
```

---

## Step 2: Launch Claude Code

```bash
# Start Claude Code in the project directory
cd claude-context
claude
```

---

## Step 3: Kickoff Autonomous Development

### Option A: Full Sequential Build (Recommended for Fresh Start)

Copy and paste this into Claude Code to start the complete build process:

```
Read AUTONOMOUS.md, the-forge-method.md, and CLAUDE.md to understand the project conventions. Then execute the following phases in order:

PHASE 1 - REQUIREMENTS:
1. Generate PRD from claude-context-pitch.md → tools/docs/PRD-claude-context.md
2. Extract user stories from claude-context-ux-spec.md → tools/docs/user-stories.md
3. Create missing ADRs for Context Graph, Slice State Machine, Feedback Pipeline → tools/adrs/

PHASE 2 - DESIGN:
4. Create C4 architecture diagrams (Mermaid) → tools/diagrams/
5. Design Prisma schema for Context entities → packages/prisma/
6. Design OpenAPI spec for Context API → tools/docs/openapi-context.yaml

PHASE 3 - IMPLEMENTATION:
7. Scaffold @forge/context package with service, repository, types, errors
8. Implement ContextService with compile, search, add, remove methods
9. Implement SliceService with state machine and context compilation
10. Create NestJS ContextModule with REST endpoints
11. Create React components: ContextPanel, SliceList, SliceDetail

PHASE 4 - QUALITY:
12. Generate unit tests (target 80%+ coverage)
13. Generate integration tests for multi-tenant isolation
14. Create E2E test for create-slice-compile-feedback journey

Track progress with the todo list. Commit after each major phase. Report blockers immediately.
```

### Option B: Phase-by-Phase (More Control)

Run each phase separately:

**Start with Requirements:**
```
Read the-forge-method.md, claude-context-pitch.md, and claude-context-ux-spec.md. Generate:
1. PRD at tools/docs/PRD-claude-context.md
2. User stories at tools/docs/user-stories.md
3. Gap analysis at tools/docs/gap-analysis.md
Commit when complete.
```

**Then Design:**
```
Based on the PRD and user stories just created, generate:
1. C4 architecture diagram at tools/diagrams/claude-context-c4.md
2. Prisma schema at packages/prisma/schema-context.prisma
3. Component inventory at packages/design-system/COMPONENTS.md
Commit when complete.
```

**Then Implement:**
```
Based on the design artifacts, implement the @forge/context package:
1. Create package structure following Forge conventions
2. Implement ContextService and SliceService
3. Create unit tests with 80%+ coverage
Commit when complete.
```

### Option C: Single Feature Slice (Quick Win)

Build one complete feature end-to-end:

```
Execute a complete vertical slice for "Slice Management" following Forge Method conventions:

1. Schema: Add Slice, SliceConstraint, SliceAcceptanceCriteria models to Prisma
2. Package: Create slice.service.ts, slice.repository.ts, slice.types.ts in packages/context/
3. API: Create SliceController with CRUD + compile endpoints in apps/api/
4. UI: Create SliceList, SliceDetail, SliceForm components
5. Tests: Unit tests (80%+), integration test, E2E test
6. i18n: Add translations for en-US
7. Docs: Update README with Slice API documentation

Follow all 32 Laws of the Forge. Use prompt-id annotations. Commit with conventional commit message.
```

---

## Step 4: Monitor Progress

While Claude is working, you can:

```bash
# Check todo list progress (in another terminal)
cat .claude/build-state.json 2>/dev/null || echo "No build state yet"

# Watch for new files
watch -n 5 'git status --short'

# Check recent commits
git log --oneline -10
```

---

## Step 5: Review & Push

After Claude completes:

```bash
# Review changes
git diff --stat
git log --oneline -5

# Run quality checks (if tooling exists)
pnpm install 2>/dev/null || npm install 2>/dev/null
pnpm test 2>/dev/null || npm test 2>/dev/null
pnpm lint 2>/dev/null || npm run lint 2>/dev/null

# Push to remote
git push origin HEAD
```

---

## Quick Reference: Single-Command Kickoffs

Copy these directly into Claude Code:

### Generate All Documentation
```
Generate complete documentation suite: PRD, user stories, ADRs, architecture diagrams, and API specs based on the markdown files in this repo. Output to tools/docs/ and tools/adrs/. Commit when done.
```

### Scaffold All Packages
```
Create the package structure for @forge/context, @forge/database, @forge/cache, and @forge/queue following the-forge-method.md specifications. Include index.ts, types, service interface, and README for each. Commit when done.
```

### Build MVP Backend
```
Implement the minimum viable backend for Claude Context: ContextService, SliceService, FeedbackService with Prisma repositories and NestJS controllers. Include tenant isolation and audit logging. Target 80% test coverage. Commit when done.
```

### Build MVP Frontend
```
Implement the minimum viable frontend components for Claude Context: ContextPanel, SliceList, SliceDetail, FeedbackModal. Use Radix UI + Tailwind. Include Storybook stories and accessibility tests. Commit when done.
```

---

## Troubleshooting

**Claude stops mid-task:**
```
Continue from where you left off. Check the todo list for pending items and resume execution.
```

**Need to restart:**
```
Read .claude/build-state.json (if exists) and continue the build from the last checkpoint. If no state exists, start fresh with Phase 1.
```

**Quality gate failures:**
```
Run quality gates and fix all failures: TypeScript errors, ESLint warnings, test failures, coverage gaps. Report what was fixed.
```
