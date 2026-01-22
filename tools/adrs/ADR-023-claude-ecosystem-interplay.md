# ADR-023: Claude Ecosystem Unified Integration Strategy

**Status:** Accepted
**Date:** January 2026
**Deciders:** Product, Architecture & Strategy Team
**Categories:** Strategy, Integration, Claude Ecosystem

## Context

Claude Context aims to be the **organizational memory layer** for the entire Claude ecosystem. Anthropic's product suite has evolved into three distinct but complementary products:

| Product | Target User | Primary Use Case | Interface |
|---------|-------------|------------------|-----------|
| **Claude Chat** | Everyone | Conversations, Q&A, analysis | Web (claude.ai) |
| **Claude Code** | Developers | Software development, CLI tasks | Terminal/IDE |
| **Claude CoWork** | Knowledge workers | File management, document workflows | Desktop app |

Each product serves different users and workflows, but all can benefit from shared organizational context. Our goal is to make Claude Context the **single source of truth** that powers context-aware AI across all three products.

### The Integration Challenge

Without unified context:
- **Chat**: Generic responses without organizational knowledge
- **Code**: Must rediscover patterns, no institutional memory
- **CoWork**: Organizes files without understanding their significance

With Claude Context:
- **Chat**: Answers grounded in organizational decisions and patterns
- **Code**: Implements features aligned with established architecture
- **CoWork**: Organizes and generates documents using proper taxonomy

## Decision

**We will implement a unified integration strategy using MCP as the common protocol, with product-specific optimizations for each Claude product's unique capabilities.**

### Unified Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOWS                                   │
├────────────────────┬────────────────────┬───────────────────────────────┤
│    Conversations   │    Development     │      Document Workflows       │
│    & Research      │    & Engineering   │      & File Management        │
└─────────┬──────────┴─────────┬──────────┴──────────────┬────────────────┘
          │                    │                         │
          ▼                    ▼                         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│   Claude Chat   │  │   Claude Code   │  │       Claude CoWork         │
│   (claude.ai)   │  │     (CLI)       │  │    (Desktop Agent)          │
│                 │  │                 │  │                             │
│  • Web interface│  │  • Terminal     │  │  • Sandboxed VM             │
│  • Projects     │  │  • IDE plugins  │  │  • File system access       │
│  • Artifacts    │  │  • Git aware    │  │  • Bulk operations          │
└────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘
         │                    │                          │
         │                    │                          │
         └────────────────────┼──────────────────────────┘
                              │
                              │  Model Context Protocol (MCP)
                              │  Unified Resources, Tools, Prompts
                              │
                    ┌─────────▼─────────┐
                    │                   │
                    │  Claude Context   │
                    │   MCP Server      │
                    │                   │
                    │ @claude-context/  │
                    │   mcp-server      │
                    │                   │
                    └─────────┬─────────┘
                              │
                              │ REST API
                              │
                    ┌─────────▼─────────┐
                    │                   │
                    │  Claude Context   │
                    │   Platform        │
                    │                   │
                    │  • Context Graphs │
                    │  • Work Slices    │
                    │  • Feedback Loop  │
                    │  • Analytics      │
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL +    │
                    │   pgvector        │
                    └───────────────────┘
```

### Product-Specific Capabilities Matrix

| Capability | Chat | Code | CoWork |
|------------|------|------|--------|
| **Search context** | ✅ Semantic search in conversation | ✅ Find relevant patterns | ✅ Locate related files |
| **Compile context** | ✅ Include in system prompt | ✅ Add to CLAUDE.md | ✅ Generate context files |
| **Create slice** | ✅ Plan work from discussion | ✅ Create from task | ✅ Create from documents |
| **Read slice** | ✅ Discuss requirements | ✅ Guide implementation | ✅ Generate slice docs |
| **Transition slice** | ✅ Update status | ✅ Mark complete | ✅ Bulk status updates |
| **Record feedback** | ✅ Rate responses | ✅ Rate code quality | ✅ Rate document quality |
| **Export to files** | ❌ Not applicable | ⚠️ Limited | ✅ Primary use case |
| **Bulk operations** | ❌ Not applicable | ⚠️ Batch scripts | ✅ Primary use case |
| **Real-time collab** | ✅ Share conversations | ⚠️ Git-based | ✅ Shared folders |

### MCP Capability Tiers

```typescript
// Tier 1: Universal (All Products)
const universalCapabilities = {
  resources: [
    'context://graphs',
    'context://graphs/{id}/nodes',
    'context://slices',
    'context://slices/{id}',
    'context://analytics',
  ],
  tools: [
    'search_context',
    'compile_context',
    'create_slice',
    'transition_slice',
    'record_feedback',
    'start_session',
  ],
  prompts: [
    'understand_codebase',
    'implement_feature',
    'review_changes',
    'debug_issue',
  ],
};

// Tier 2: Developer Tools (Code)
const developerCapabilities = {
  tools: [
    'analyze_dependencies',    // Understand code relationships
    'suggest_architecture',    // Recommend patterns from context
    'generate_tests',          // Create tests based on patterns
    'check_conventions',       // Validate against org standards
  ],
  prompts: [
    'refactor_with_patterns',  // Apply org patterns
    'document_code',           // Generate docs matching style
  ],
};

// Tier 3: File Operations (CoWork)
const coworkCapabilities = {
  tools: [
    'export_context_to_files',
    'export_slice_package',
    'generate_report',
    'sync_files_to_context',
    'organize_files_by_context',
    'create_document_from_template',
  ],
  prompts: [
    'prepare_meeting',
    'onboard_team_member',
    'audit_preparation',
    'weekly_digest',
  ],
};

// Tier 4: Conversation (Chat)
const chatCapabilities = {
  tools: [
    'summarize_context',       // Explain context in conversation
    'compare_decisions',       // Analyze ADR trade-offs
    'suggest_related',         // Recommend related context
  ],
  prompts: [
    'explain_architecture',    // Teach org patterns
    'plan_feature',            // Discuss before creating slice
    'retrospective',           // Analyze completed work
  ],
};
```

### Cross-Product Workflows

#### Workflow 1: Feature Development Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE DEVELOPMENT LIFECYCLE                     │
└─────────────────────────────────────────────────────────────────────┘

1. DISCOVERY (Claude Chat)
   ┌─────────────────────────────────────────────────────────────────┐
   │ User: "I want to add SSO support to our app"                    │
   │                                                                 │
   │ Claude Chat + Context:                                          │
   │ → Searches context for auth-related decisions                   │
   │ → Finds ADR-019 (Enterprise Authentication)                     │
   │ → Identifies existing JWT implementation                        │
   │ → Suggests SSO approach aligned with current architecture       │
   │                                                                 │
   │ Output: Preliminary plan + create_slice proposal                │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
2. PLANNING (Claude Chat → Context)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Action: create_slice                                            │
   │                                                                 │
   │ Slice SL-3001 created:                                          │
   │ • Outcome: "Add SAML 2.0 SSO support"                           │
   │ • Constraints: "Must integrate with existing JWT flow"          │
   │ • Acceptance Criteria: [5 items]                                │
   │ • Context linked: ADR-019, auth-patterns, security-guidelines   │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
3. DOCUMENTATION (Claude CoWork)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Action: export_slice_package                                    │
   │                                                                 │
   │ CoWork generates:                                               │
   │ /SSO-Implementation/                                            │
   │   ├── README.md                                                 │
   │   ├── requirements.md                                           │
   │   ├── context/                                                  │
   │   │   ├── current-auth-architecture.md                          │
   │   │   └── security-requirements.md                              │
   │   └── implementation-guide.md                                   │
   │                                                                 │
   │ Human reviews and shares with team                              │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
4. IMPLEMENTATION (Claude Code)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Developer starts Claude Code in project                         │
   │                                                                 │
   │ Claude Code + Context:                                          │
   │ → Loads slice SL-3001 via implement_feature prompt              │
   │ → Retrieves all linked context                                  │
   │ → Implements SAML following org patterns                        │
   │ → Validates against security guidelines                         │
   │ → Records feedback on context usefulness                        │
   │                                                                 │
   │ Action: transition_slice (PENDING → ACTIVE)                     │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
5. REVIEW (Claude Code + Chat)
   ┌─────────────────────────────────────────────────────────────────┐
   │ Developer submits PR                                            │
   │                                                                 │
   │ Claude Code: review_changes prompt                              │
   │ → Checks against org patterns from context                      │
   │ → Verifies acceptance criteria met                              │
   │ → Suggests improvements based on similar past work              │
   │                                                                 │
   │ Action: transition_slice (ACTIVE → IN_REVIEW)                   │
   │                                                                 │
   │ Claude Chat: Discuss review feedback with team                  │
   └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
6. COMPLETION (All Products)
   ┌─────────────────────────────────────────────────────────────────┐
   │ After approval and merge:                                       │
   │                                                                 │
   │ Claude Code: transition_slice (IN_REVIEW → COMPLETED)           │
   │                                                                 │
   │ Claude CoWork:                                                  │
   │ → Generate completion report                                    │
   │ → Archive slice documentation                                   │
   │ → Update team status files                                      │
   │                                                                 │
   │ Claude Chat:                                                    │
   │ → Discuss learnings                                             │
   │ → Suggest context updates based on implementation               │
   │                                                                 │
   │ Context Platform:                                               │
   │ → Aggregate feedback for analytics                              │
   │ → Update context effectiveness metrics                          │
   └─────────────────────────────────────────────────────────────────┘
```

#### Workflow 2: Knowledge Onboarding

```
New Team Member Joins
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude Chat    │     │  Claude CoWork  │     │  Claude Code    │
│                 │     │                 │     │                 │
│ "Explain our    │     │ Generate        │     │ Set up dev      │
│  architecture"  │────▶│ onboarding      │────▶│ environment     │
│                 │     │ document pack   │     │ with context    │
│ understand_     │     │                 │     │                 │
│ codebase prompt │     │ onboard_team_   │     │ compile_context │
│                 │     │ member prompt   │     │ → CLAUDE.md     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Workflow 3: Audit Preparation

```
Compliance Audit Scheduled
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Claude CoWork: audit_preparation prompt                             │
│                                                                     │
│ → Exports all ADRs and decisions                                    │
│ → Compiles security-related context                                 │
│ → Generates audit log exports                                       │
│ → Creates evidence folder structure                                 │
│ → Produces compliance checklist                                     │
│                                                                     │
│ Output: /Audit-Q1-2026/                                             │
│   ├── decisions/                                                    │
│   ├── security-controls/                                            │
│   ├── audit-logs/                                                   │
│   ├── data-handling/                                                │
│   └── compliance-checklist.md                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Feedback Loop Across Products

```
┌─────────────────────────────────────────────────────────────────────┐
│                     UNIFIED FEEDBACK LOOP                           │
└─────────────────────────────────────────────────────────────────────┘

Each product contributes feedback:

Chat Feedback                Code Feedback              CoWork Feedback
─────────────               ─────────────              ───────────────
"Response was               "Context helped            "Generated docs
 helpful"                    implementation"            were accurate"
     │                            │                          │
     │    record_feedback         │   record_feedback        │
     └────────────┬───────────────┴──────────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Feedback       │
         │  Aggregation    │
         │                 │
         │ • By context    │
         │   node          │
         │ • By product    │
         │ • By user/team  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Analytics      │
         │  Dashboard      │
         │                 │
         │ • Effectiveness │
         │   by product    │
         │ • Problem areas │
         │ • Improvements  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Context        │
         │  Improvement    │
         │                 │
         │ • Mark stale    │
         │ • Update nodes  │
         │ • Add missing   │
         └─────────────────┘
```

### Configuration by Product

```json
// Claude Chat (via claude.ai Projects)
// Project system prompt includes MCP server config
{
  "mcpServers": {
    "claude-context": {
      "capabilities": ["tier1", "tier4"],
      "defaultTokenBudget": 4000
    }
  }
}

// Claude Code (.claude/settings.json)
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_CAPABILITIES": "tier1,tier2"
      }
    }
  }
}

// Claude CoWork (Claude Desktop config)
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_CAPABILITIES": "tier1,tier3",
        "CLAUDE_CONTEXT_EXPORT_PATH": "/Users/jane/Claude-Context"
      }
    }
  }
}
```

## Consequences

### Positive

- **Unified context** - Single source of truth across all products
- **Workflow continuity** - Seamless transitions between products
- **Accumulated learning** - Feedback from all products improves context
- **Role-appropriate** - Each product optimized for its users
- **Future-proof** - MCP protocol supports new Claude products

### Negative

- **Complexity** - Three products to support and test
- **Consistency** - Must keep capabilities aligned
- **User education** - Users must understand product strengths

### Mitigations

1. **Capability tiers** - Clear separation of universal vs. specialized
2. **Integration tests** - Cross-product workflow testing
3. **Documentation** - Clear guidance on which product for which task

## References

- [Claude Chat](https://claude.ai)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Claude CoWork Announcement](https://venturebeat.com/technology/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [ADR-018: MCP Server Integration](./ADR-018-mcp-server-integration.md)
- [ADR-022: CoWork Integration](./ADR-022-cowork-integration.md)
