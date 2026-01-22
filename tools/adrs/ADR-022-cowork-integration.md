# ADR-022: Claude CoWork Integration

**Status:** Accepted
**Date:** January 2026
**Deciders:** Product & Architecture Team
**Categories:** Integration, Claude Ecosystem, Agents

## Context

[Claude CoWork](https://venturebeat.com/technology/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no/) is Anthropic's general-purpose AI agent launched in January 2026, described as "Claude Code for the rest of your work." Unlike Claude Code (developer-focused CLI), CoWork targets non-technical users with file management, document processing, and workflow automation capabilities.

### CoWork Characteristics

| Aspect | Description |
|--------|-------------|
| **Target Users** | Non-technical knowledge workers |
| **Platform** | macOS (Windows mid-2026) |
| **Execution** | Sandboxed VM via Apple Virtualization Framework |
| **Model** | Claude Opus 4.5 with extended thinking |
| **Access Model** | Scoped folder access, human-in-the-loop for high-stakes |
| **Integration** | MCP protocol (same as Claude Chat/Code) |

### Use Cases for Claude Context + CoWork

1. **Document organization** - Auto-categorize files based on context graph taxonomy
2. **Report generation** - Generate reports using slice outcomes and context
3. **Meeting prep** - Compile relevant context for upcoming discussions
4. **Onboarding packets** - Assemble context documents for new team members
5. **Audit preparation** - Export and organize compliance documentation
6. **Knowledge sync** - Keep local documents aligned with context graph

### Integration Requirements

1. **MCP compatibility** - CoWork uses same MCP protocol as Chat/Code
2. **File-based workflows** - CoWork operates on local files
3. **Bulk operations** - CoWork excels at multi-file tasks
4. **Human approval** - High-stakes actions require confirmation
5. **Context awareness** - CoWork should understand organizational context

## Decision

**We will extend our MCP server with CoWork-specific tools and create a file-based context sync capability.**

Our existing MCP server (ADR-018) already provides the foundation. We'll add:
1. **File export tools** - Export context to local files
2. **Bulk operations** - Multi-document context compilation
3. **Sync workflows** - Bidirectional context ↔ file synchronization
4. **Template generation** - Create document templates from context

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude CoWork                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Sandboxed VM (Apple Virtualization Framework)            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  User's Designated Folder                          │  │   │
│  │  │  /Users/jane/Claude-Context-Workspace/             │  │   │
│  │  │    ├── context-exports/                            │  │   │
│  │  │    │   ├── architecture-decisions/                 │  │   │
│  │  │    │   ├── coding-patterns/                        │  │   │
│  │  │    │   └── team-guidelines/                        │  │   │
│  │  │    ├── slice-packages/                             │  │   │
│  │  │    │   ├── SL-2847-user-auth/                      │  │   │
│  │  │    │   └── SL-2848-dark-mode/                      │  │   │
│  │  │    └── reports/                                    │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ MCP Protocol                      │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Claude Context MCP Server                    │   │
│  │  @claude-context/mcp-server                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────┐
                    │  Claude Context │
                    │      API        │
                    └─────────────────┘
```

### New MCP Tools for CoWork

```typescript
// File Export Tools
{
  name: 'export_context_to_files',
  description: 'Export context nodes to local markdown files organized by category',
  inputSchema: {
    properties: {
      outputPath: { type: 'string', description: 'Local folder path for export' },
      graphId: { type: 'string' },
      nodeTypes: { type: 'array', items: { enum: ['DOCUMENT', 'DECISION', 'PATTERN'] } },
      format: { enum: ['markdown', 'json', 'yaml'], default: 'markdown' },
    },
    required: ['outputPath'],
  },
}

{
  name: 'export_slice_package',
  description: 'Export a complete slice with all context, constraints, and criteria as a folder structure',
  inputSchema: {
    properties: {
      sliceId: { type: 'string' },
      outputPath: { type: 'string' },
      includeHistory: { type: 'boolean', default: false },
    },
    required: ['sliceId', 'outputPath'],
  },
}

{
  name: 'generate_report',
  description: 'Generate a formatted report from context and analytics data',
  inputSchema: {
    properties: {
      reportType: {
        enum: ['weekly_summary', 'slice_status', 'context_health', 'team_activity', 'audit_export'],
      },
      outputPath: { type: 'string' },
      dateRange: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
      format: { enum: ['markdown', 'html', 'pdf'], default: 'markdown' },
    },
    required: ['reportType', 'outputPath'],
  },
}

// Sync Tools
{
  name: 'sync_files_to_context',
  description: 'Import local files into context graph (with human approval for modifications)',
  inputSchema: {
    properties: {
      sourcePath: { type: 'string', description: 'Local folder to sync from' },
      graphId: { type: 'string' },
      layer: { enum: ['ORGANIZATIONAL', 'WORKSPACE', 'SLICE'] },
      dryRun: { type: 'boolean', default: true, description: 'Preview changes without applying' },
    },
    required: ['sourcePath', 'graphId'],
  },
}

{
  name: 'watch_folder_for_context',
  description: 'Set up continuous sync between a local folder and context graph',
  inputSchema: {
    properties: {
      folderPath: { type: 'string' },
      graphId: { type: 'string' },
      syncDirection: { enum: ['to_context', 'from_context', 'bidirectional'] },
    },
    required: ['folderPath', 'graphId', 'syncDirection'],
  },
}

// Template Tools
{
  name: 'create_document_from_template',
  description: 'Generate a document using context-aware templates',
  inputSchema: {
    properties: {
      templateType: {
        enum: ['adr', 'slice_brief', 'onboarding_guide', 'review_checklist', 'meeting_agenda'],
      },
      outputPath: { type: 'string' },
      variables: { type: 'object', description: 'Template variables to fill in' },
    },
    required: ['templateType', 'outputPath'],
  },
}

// Bulk Operations
{
  name: 'organize_files_by_context',
  description: 'Reorganize local files into folders based on context graph structure',
  inputSchema: {
    properties: {
      sourcePath: { type: 'string' },
      outputPath: { type: 'string' },
      organizationStrategy: { enum: ['by_type', 'by_layer', 'by_slice', 'by_freshness'] },
      dryRun: { type: 'boolean', default: true },
    },
    required: ['sourcePath', 'outputPath', 'organizationStrategy'],
  },
}
```

### New MCP Prompts for CoWork

```typescript
prompts: [
  {
    name: 'prepare_meeting',
    description: 'Compile relevant context and create meeting preparation documents',
    arguments: [
      { name: 'topic', required: true },
      { name: 'participants', required: false },
      { name: 'outputFolder', required: true },
    ],
  },
  {
    name: 'onboard_team_member',
    description: 'Generate onboarding documentation package for a new team member',
    arguments: [
      { name: 'role', required: true },
      { name: 'team', required: true },
      { name: 'outputFolder', required: true },
    ],
  },
  {
    name: 'audit_preparation',
    description: 'Export and organize all compliance-relevant documentation',
    arguments: [
      { name: 'auditType', required: true, description: 'soc2, gdpr, hipaa, or custom' },
      { name: 'outputFolder', required: true },
    ],
  },
  {
    name: 'weekly_digest',
    description: 'Generate a weekly summary of context changes, slice progress, and team activity',
    arguments: [
      { name: 'outputFolder', required: true },
    ],
  },
]
```

### File Export Formats

#### Context Node Export (Markdown)
```markdown
---
id: node-uuid
type: DECISION
layer: ORGANIZATIONAL
freshness: CURRENT
tokens: 1234
lastValidated: 2026-01-20
tags: [authentication, security]
---

# Authentication Strategy

## Decision
We will use JWT tokens with short-lived access tokens (1 hour)
and long-lived refresh tokens (7 days).

## Context
[Original context content...]

## Related Nodes
- [API Security Guidelines](./api-security-guidelines.md)
- [Session Management](./session-management.md)
```

#### Slice Package Export
```
SL-2847-user-authentication/
├── README.md              # Slice overview
├── OUTCOME.md             # Detailed outcome statement
├── CONSTRAINTS.md         # All constraints
├── ACCEPTANCE_CRITERIA.md # Checklist format
├── context/               # Related context nodes
│   ├── auth-patterns.md
│   └── security-guidelines.md
├── history/               # State transitions (optional)
│   └── transitions.json
└── metadata.json          # Machine-readable slice data
```

### Security Considerations

1. **Scoped access** - CoWork only accesses designated folders
2. **Human approval** - Sync to context requires confirmation
3. **Dry run default** - Bulk operations preview before executing
4. **Audit logging** - All file operations logged
5. **No credentials in files** - Sensitive data filtered on export

### Configuration

```json
// Claude Desktop config for CoWork
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_API_URL": "https://api.claude-context.com",
        "CLAUDE_CONTEXT_API_KEY": "cc_xxx",
        "CLAUDE_CONTEXT_TENANT_ID": "tenant-uuid",
        "CLAUDE_CONTEXT_WORKSPACE_ID": "workspace-uuid",
        "CLAUDE_CONTEXT_EXPORT_PATH": "/Users/jane/Claude-Context-Workspace"
      }
    }
  }
}
```

## Consequences

### Positive

- **Non-technical access** - Knowledge workers can interact with context via files
- **Offline capability** - Exported files work without connectivity
- **Bulk efficiency** - CoWork excels at multi-file operations
- **Workflow integration** - Context becomes part of daily document workflows
- **Audit readiness** - Easy export for compliance reviews

### Negative

- **Sync complexity** - Bidirectional sync can cause conflicts
- **Stale exports** - Local files may diverge from source
- **File sprawl** - Easy to create many exported files

### Mitigations

1. **Freshness indicators** - Include timestamps in exports
2. **Conflict resolution** - Clear merge strategies for sync
3. **Cleanup tools** - Prune stale exports automatically

## References

- [Claude CoWork Announcement](https://venturebeat.com/technology/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no/)
- [Simon Willison's CoWork Review](https://simonw.substack.com/p/first-impressions-of-claude-cowork)
- [ADR-018: MCP Server Integration](./ADR-018-mcp-server-integration.md)
- [MCP Specification](https://modelcontextprotocol.io)
