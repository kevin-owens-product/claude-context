# ADR-001: Intent as Source of Truth

## Status
Proposed

## Context

In traditional software development, code is the source of truth. Everything else—requirements, documentation, tests—is secondary and often becomes stale. When AI assists with coding, it generates code, but the reasoning, alternatives considered, and intent behind decisions are lost.

We need to decide what the fundamental "source of truth" should be in an AI-native software paradigm.

## Options Considered

### Option A: Code Remains Source of Truth (Status Quo)
- AI generates code, which is stored in repositories
- Documentation/requirements are maintained separately
- Intent is captured in comments, commit messages, PRs

**Pros:**
- Familiar to developers
- Existing tooling works
- Clear execution model

**Cons:**
- Intent is lost or degraded over time
- Regenerating code requires re-explaining context
- No semantic querying of "why"
- Code refactoring breaks intent tracking

### Option B: Specifications as Source of Truth
- Formal specs (OpenAPI, JSON Schema, etc.) define behavior
- Code is generated from specs
- Tests verify spec compliance

**Pros:**
- More structured than code-only
- Enables code generation
- Better than nothing for intent

**Cons:**
- Specs are still implementation-focused, not intent-focused
- "Why" is still not captured
- Specs become complex and require their own expertise
- Limited expressiveness for business logic

### Option C: Intent Graph as Source of Truth (Proposed)
- Rich semantic graph captures goals, constraints, entities, behaviors, context
- Code is synthesized from intent on demand
- Intent is versioned, not code

**Pros:**
- Preserves full reasoning and alternatives
- Enables semantic querying
- Supports re-synthesis with different tradeoffs
- Multiple stakeholders can contribute at their level
- AI capabilities improvement automatically improves output

**Cons:**
- Novel approach—tooling doesn't exist
- Schema design is hard
- Transition from existing codebases is challenging
- May not capture all nuances for complex systems

## Decision

We will adopt **Option C: Intent Graph as Source of Truth**.

The core insight is that code is a lossy compression of intent. When an LLM generates code, it discards enormous amounts of reasoning. By keeping intent as the primary artifact, we preserve that information and enable capabilities impossible with code-first approaches.

## Consequences

### Positive
1. Claude can maintain true continuity—"continuing the conversation" about software, not starting from scratch
2. Semantic querying becomes possible: "What handles authentication?" works at the intent level
3. Code can be regenerated with different targets, tradeoffs, or optimizations
4. Non-technical stakeholders can participate in the intent layer
5. As AI improves, existing intent graphs produce better code without manual refactoring

### Negative
1. Requires building new tooling (Intent Graph editor, synthesis engine)
2. Migration path for existing code is non-trivial
3. Some developers may resist the paradigm shift
4. Edge cases may require "escape hatches" to raw code

### Neutral
1. Changes how we think about versioning (intent versions, not code commits)
2. Changes debugging workflow (trace back to intent, not just stack traces)
3. Requires new mental models for developers

## Implementation Notes

- Start with a well-defined Intent Graph schema (see SPEC-002)
- Build a simple synthesis pipeline for common patterns
- Allow "code overrides" for cases where intent can't capture everything
- Track which code is fully synthesized vs. has manual overrides
- Create visualization tools for Intent Graphs

## Related Decisions
- ADR-002: Context Layer Architecture
- ADR-003: Living Artifacts

## References
- "The Future of Programming" - Bret Victor
- "Intentional Software" - Charles Simonyi
- "Domain-Driven Design" - Eric Evans
