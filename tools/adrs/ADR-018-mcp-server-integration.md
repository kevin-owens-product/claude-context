# ADR-018: Model Context Protocol (MCP) Server Integration

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture Team
**Categories:** Integration, API, Claude Ecosystem

## Context

Claude Context's core value proposition is providing organizational knowledge to AI assistants. To deliver this value, we need seamless integration with:

1. **Claude Chat** (claude.ai) - Web-based conversational interface
2. **Claude Code** - CLI tool for developers
3. **CoWork** - Team collaboration features
4. **Third-party MCP clients** - Growing ecosystem of MCP-compatible tools

Anthropic released the Model Context Protocol (MCP) as an open standard for AI-tool integration. MCP has been widely adopted (including by OpenAI) and is now the de facto standard for connecting AI systems to external data sources.

### Options Considered

#### Option A: Custom REST API Only

Continue with our existing REST API and require each client to build custom integrations.

**Pros:**
- No new infrastructure
- Full control over API design
- Familiar technology

**Cons:**
- Each client needs custom integration code
- No ecosystem leverage
- Users must configure each tool separately
- Misses opportunity for Claude-native integration

#### Option B: MCP Server Implementation

Build an MCP server that exposes Context data via the standard protocol.

**Pros:**
- Native Claude Chat/Code integration
- Works with any MCP-compatible client
- Open standard with growing adoption
- Resources, Tools, and Prompts abstractions fit our domain
- One integration serves entire ecosystem

**Cons:**
- New protocol to learn and maintain
- MCP spec still evolving
- Additional package to maintain

#### Option C: Both REST API and MCP Server

Maintain REST API for web application while adding MCP server for Claude ecosystem.

**Pros:**
- Best of both worlds
- Web app continues using REST
- Claude tools use native MCP
- Gradual migration path

**Cons:**
- Two APIs to maintain
- Potential inconsistency between them

## Decision

**We will implement Option C: Both REST API and MCP Server.**

Rationale:
1. **Claude-native experience** - MCP enables first-class integration with Claude products
2. **Ecosystem leverage** - One implementation serves Claude Chat, Code, and third parties
3. **REST for web** - Web application continues using proven REST patterns
4. **Shared services** - MCP server calls REST API internally, ensuring consistency
5. **Future-proof** - MCP adoption is accelerating across the industry

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Ecosystem                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ Claude Chat │ Claude Code │   CoWork    │   Third Party    │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬─────────┘
       │             │             │               │
       └─────────────┴──────┬──────┴───────────────┘
                            │ MCP Protocol (stdio/SSE)
                    ┌───────▼───────┐
                    │  MCP Server   │
                    │  @claude-context/mcp-server
                    └───────┬───────┘
                            │ HTTP
                    ┌───────▼───────┐
                    │   REST API    │
                    │  (existing)   │
                    └───────────────┘
```

### MCP Capabilities

#### Resources (Read-only data access)

```typescript
// List available resources
resources: [
  {
    uri: 'context://graphs',
    name: 'Context Graphs',
    description: 'List of available context graphs',
  },
  {
    uri: 'context://slices',
    name: 'Work Slices',
    description: 'Active and recent work slices',
  },
  {
    uri: 'context://analytics',
    name: 'Context Analytics',
    description: 'Effectiveness metrics for context usage',
  },
]

// Dynamic URIs
context://graphs/{id}/nodes  // Get nodes in a graph
context://slices/{id}        // Get slice details
```

#### Tools (Actions)

```typescript
tools: [
  {
    name: 'search_context',
    description: 'Search organizational context using semantic search',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 10 },
        layer: { enum: ['ORGANIZATIONAL', 'WORKSPACE', 'SLICE'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'compile_context',
    description: 'Compile optimized context within token budget',
    inputSchema: {
      properties: {
        tokenBudget: { type: 'number', default: 8000 },
        nodeIds: { type: 'array', items: { type: 'string' } },
        includeSlice: { type: 'string' },
      },
    },
  },
  {
    name: 'create_slice',
    description: 'Create a new work slice',
    inputSchema: {
      properties: {
        outcome: { type: 'string' },
        antiScope: { type: 'string' },
        constraints: { type: 'array' },
        acceptanceCriteria: { type: 'array' },
      },
      required: ['outcome'],
    },
  },
  {
    name: 'transition_slice',
    description: 'Move slice through workflow states',
    inputSchema: {
      properties: {
        sliceId: { type: 'string' },
        action: { enum: ['start', 'submit', 'approve', 'reject', 'complete', 'archive'] },
        comment: { type: 'string' },
      },
      required: ['sliceId', 'action'],
    },
  },
  {
    name: 'record_feedback',
    description: 'Record feedback on AI output quality',
    inputSchema: {
      properties: {
        sessionId: { type: 'string' },
        rating: { enum: ['positive', 'negative', 'skipped'] },
        errorCategory: { enum: ['missing_context', 'wrong_context', 'hallucination', ...] },
        editDistance: { type: 'number' },
      },
      required: ['sessionId', 'rating'],
    },
  },
]
```

#### Prompts (Pre-built templates)

```typescript
prompts: [
  {
    name: 'understand_codebase',
    description: 'Context-aware codebase exploration',
    arguments: [{ name: 'focus', required: false }],
  },
  {
    name: 'implement_feature',
    description: 'Slice-guided feature implementation',
    arguments: [{ name: 'sliceId', required: true }],
  },
  {
    name: 'review_changes',
    description: 'Context-aware code review',
    arguments: [{ name: 'diff', required: true }],
  },
  {
    name: 'debug_issue',
    description: 'Context-aware debugging assistance',
    arguments: [{ name: 'error', required: true }],
  },
]
```

### Configuration

```json
// Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
// Claude Code: .claude/settings.json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_API_URL": "https://api.claude-context.com",
        "CLAUDE_CONTEXT_API_KEY": "cc_xxx",
        "CLAUDE_CONTEXT_TENANT_ID": "tenant-uuid",
        "CLAUDE_CONTEXT_WORKSPACE_ID": "workspace-uuid"
      }
    }
  }
}
```

### Security Considerations

1. **API Key Authentication** - MCP server authenticates via API key
2. **Tenant Isolation** - All requests scoped to configured tenant
3. **Permission Enforcement** - API key permissions control tool access
4. **Audit Logging** - All MCP tool calls logged in audit trail

## Consequences

### Positive

- **Native Claude integration** - First-class experience in Claude Chat and Code
- **Ecosystem leverage** - Works with any MCP-compatible client
- **Standardized interface** - Following industry-standard protocol
- **Rich capabilities** - Resources, Tools, and Prompts cover all use cases
- **Easy setup** - Single npx command to connect

### Negative

- **Protocol complexity** - MCP adds abstraction layer
- **Version management** - Must track MCP spec evolution
- **Two APIs** - REST and MCP to maintain

### Mitigations

1. **Shared service layer** - MCP calls REST API, single source of truth
2. **SDK usage** - Use official @modelcontextprotocol/sdk
3. **Version pinning** - Pin MCP spec version, upgrade deliberately

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
