# Claude Context MCP Server

Connect Claude Chat, Claude Code, and any MCP-compatible client to your organizational context.

## Features

### Resources
Read-only access to your context data:
- `context://graphs` - List available context graphs
- `context://graphs/{id}/nodes` - Get nodes in a graph
- `context://slices` - List work slices
- `context://slices/{id}` - Get slice details

### Tools
Actions to interact with context:
- `search_context` - Semantic search across context
- `compile_context` - Generate optimized context for token budget
- `create_slice` - Create new work slice
- `transition_slice` - Move slice through workflow
- `record_feedback` - Submit AI session feedback
- `start_session` - Begin tracking an AI session

### Prompts
Pre-built prompt templates:
- `understand_codebase` - Context-aware codebase exploration
- `implement_feature` - Slice-guided implementation
- `review_changes` - Context-aware code review
- `debug_issue` - Context-aware debugging

## Installation

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_API_URL": "https://your-api.example.com",
        "CLAUDE_CONTEXT_API_KEY": "your-api-key",
        "CLAUDE_CONTEXT_TENANT_ID": "your-tenant-id",
        "CLAUDE_CONTEXT_WORKSPACE_ID": "your-workspace-id"
      }
    }
  }
}
```

### Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["@claude-context/mcp-server"],
      "env": {
        "CLAUDE_CONTEXT_API_URL": "http://localhost:3001",
        "CLAUDE_CONTEXT_TENANT_ID": "your-tenant-id",
        "CLAUDE_CONTEXT_WORKSPACE_ID": "your-workspace-id"
      }
    }
  }
}
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `CLAUDE_CONTEXT_API_URL` | No | `http://localhost:3001` | API server URL |
| `CLAUDE_CONTEXT_API_KEY` | No | - | API authentication key |
| `CLAUDE_CONTEXT_TENANT_ID` | No | `default` | Your tenant ID |
| `CLAUDE_CONTEXT_WORKSPACE_ID` | No | `default` | Your workspace ID |

## Usage Examples

### Search Context
```
Use the search_context tool to find: "authentication flow"
```

### Implement a Feature
```
Use the implement_feature prompt with slice ID: abc123
```

### Start a Tracked Session
```
Use the start_session tool, then record_feedback when done
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
pnpm start
```

## License

MIT
