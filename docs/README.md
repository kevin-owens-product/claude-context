# Living Software Platform

## A New Paradigm for AI-Native Software Development

This documentation package contains the complete architecture, requirements, and specifications for rebuilding Claude's product suite around the concept of **Living Software**—software that is declared through intent, continuously synthesized, and evolves based on feedback.

## Vision Statement

> Software should not be written, then run. It should be **declared**, then **continuously become**.

The current paradigm treats code as the source of truth. We propose a fundamental inversion: **intent becomes the source of truth**, and code becomes an ephemeral, regenerable artifact—like a rendered frame in a video.

## Documentation Structure

```
living-software-platform/
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture overview
├── architecture/
│   └── system-context.md        # C4 model context diagram
├── adrs/                        # Architecture Decision Records
│   ├── ADR-001-intent-as-source-of-truth.md
│   ├── ADR-002-context-layer-architecture.md
│   ├── ADR-003-living-artifacts.md
│   ├── ADR-004-feedback-loop-design.md
│   ├── ADR-005-observation-permissions.md
│   └── ADR-006-demo-scope.md
├── prds/                        # Product Requirements Documents
│   ├── PRD-001-claude-context.md
│   ├── PRD-002-intent-graph.md
│   ├── PRD-003-living-artifacts.md
│   ├── PRD-004-active-observation.md
│   ├── PRD-005-feedback-loops.md
│   └── PRD-006-unified-surfaces.md
├── tech-specs/                  # Technical Specifications
│   ├── SPEC-001-context-store.md
│   ├── SPEC-002-intent-graph-schema.md
│   ├── SPEC-003-artifact-lifecycle.md
│   ├── SPEC-004-synthesis-engine.md
│   └── SPEC-005-observation-hooks.md
└── demo/                        # Demo Implementation
    ├── DEMO-PLAN.md
    ├── DEMO-ARCHITECTURE.md
    └── implementation/          # Actual demo code (to be built)
```

## Core Concepts

### 1. Intent Layer
The persistent, evolving representation of what software should do and why. Not code. Not specifications. A rich semantic graph of goals, constraints, entities, behaviors, and context.

### 2. Claude Context
The infrastructure layer that maintains continuous understanding across all interactions. Identity graphs, project graphs, interaction memory, and outcome ledgers.

### 3. Living Artifacts
Artifacts that don't die when exported. They persist, evolve, receive feedback, and maintain connection to Claude's understanding.

### 4. Active Observation
Claude stops being purely reactive. It observes (with permission), learns patterns, notices issues, and surfaces proactive insights.

### 5. Feedback Loops
Every output can receive signals about its real-world outcomes. Claude learns what works for each specific user.

## How to Use This Documentation

### For the Pitch
Start with `ARCHITECTURE.md` for the big picture, then reference specific PRDs to show depth of thinking.

### For Building the Demo
Follow `demo/DEMO-PLAN.md` which outlines a phased approach to building a working demonstration.

### For Technical Discussion
The ADRs explain key decisions and their rationale. Tech specs provide implementation details.

## Key Principles

1. **Intent over Implementation** - The "what and why" matters more than the "how"
2. **Continuity over Sessions** - Understanding persists and evolves
3. **Feedback over Fire-and-Forget** - Outcomes inform future interactions
4. **Proactive over Reactive** - Claude can observe and initiate
5. **Transparent over Magical** - Users can inspect and modify all layers

## Target Audience

- **Mike Krieger & Anthropic Product Leadership**: Understanding the vision and strategic opportunity
- **Engineering Teams**: Implementation guidance
- **Kevin**: Building the demo and refining the pitch

---

*This documentation represents a comprehensive reimagining of how AI-native software should work. It's not incremental improvement—it's a paradigm shift.*
