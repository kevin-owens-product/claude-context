# PRD-004: Active Observation

## Document Information
| Field | Value |
|-------|-------|
| **Product** | Active Observation |
| **Author** | Kevin [Last Name] |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Target Release** | Phase 4 |

---

## Executive Summary

Active Observation enables Claude to learn from watching—not just responding. With user permission, Claude can observe file systems, repositories, applications, and outcomes to provide proactive insights and continuous improvement.

---

## Problem Statement

1. **Reactive-Only Assistance** - Claude waits for prompts; misses opportunities to help
2. **No Outcome Visibility** - Claude doesn't know if its outputs succeeded or failed
3. **Context Gaps** - Claude can't see what user does outside conversations
4. **Pattern Blindness** - User patterns visible to human observer invisible to Claude

---

## Solution Overview

Observation capabilities with graduated permissions:

| Level | Capability | Permission |
|-------|------------|------------|
| **Level 0** | Conversation only | Default |
| **Level 1** | Cross-session memory | Opt-in |
| **Level 2** | File/repo observation | Explicit |
| **Level 3** | Integration observation | Per-service |
| **Level 4** | Production monitoring | Custom agreement |

---

## Key User Stories

**US-1: Repository Observation**
> As a developer, I want Claude to observe my codebase so it can proactively identify issues.

**US-2: Outcome Observation**
> As a user, I want Claude to learn from whether its outputs worked so future help improves.

**US-3: Pattern Detection**
> As a user, I want Claude to notice patterns in my work so it can suggest systematization.

**US-4: Granular Permission Control**
> As a user, I want fine-grained control over what Claude can observe so I maintain privacy.

---

## Functional Requirements

### FR-1: Observation Types

| Type | What's Observed | Insights Generated |
|------|-----------------|-------------------|
| File System | File changes, project structure | Code quality, refactor suggestions |
| Repository | Commits, PRs, CI/CD | Development patterns, blockers |
| Application | User behavior, errors | Usability issues, bugs |
| Metrics | Analytics, performance | Optimization opportunities |

### FR-2: Permission Model

- Graduated layers (see ADR-005)
- Per-scope permissions (project, time, task)
- Transparent usage logging
- Easy revocation
- Privacy-first design

### FR-3: Proactive Insights

- Pattern detection across observations
- Insight generation with confidence scores
- User-controllable notification preferences
- Actionable suggestions

### FR-4: Observation Dashboard

- What's being observed
- When it was last accessed
- What insights were generated
- Pause/resume controls
- Full history

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Permission check latency | <10ms |
| Observation processing | Background, non-blocking |
| Privacy compliance | GDPR, CCPA |
| Data retention | User-configurable |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Observation opt-in rate | >30% |
| Proactive insight acceptance | >50% |
| Permission-related support tickets | <1% |
| User trust score (survey) | >4/5 |

---

## Related Documents

- ADR-005: Observation Permissions
- PRD-001: Claude Context
- PRD-005: Feedback Loops
