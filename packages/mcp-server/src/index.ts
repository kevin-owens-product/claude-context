/**
 * @prompt-id forge-v4.1:mcp:server:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 *
 * Claude Context MCP Server
 *
 * This server implements the Model Context Protocol (MCP) to provide
 * Claude Chat, Claude Code, and CoWork with access to organizational
 * context, work slices, and feedback capabilities.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Tool input schemas
const SearchContextSchema = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().optional().default(10).describe('Maximum results to return'),
  layer: z
    .enum(['ORGANIZATIONAL', 'WORKSPACE', 'SLICE'])
    .optional()
    .describe('Filter by context layer'),
});

const CompileContextSchema = z.object({
  tokenBudget: z.number().default(8000).describe('Maximum tokens for compiled context'),
  nodeIds: z.array(z.string()).optional().describe('Specific nodes to include'),
  includeSlice: z.string().optional().describe('Include context from a specific slice'),
});

const CreateSliceSchema = z.object({
  outcome: z.string().describe('What this slice will accomplish'),
  antiScope: z.string().optional().describe('What is explicitly out of scope'),
  constraints: z.array(z.string()).optional().describe('Technical or business constraints'),
  acceptanceCriteria: z
    .array(z.string())
    .optional()
    .describe('Criteria for completion'),
});

const TransitionSliceSchema = z.object({
  sliceId: z.string().describe('ID of the slice to transition'),
  action: z
    .enum(['start', 'submit', 'approve', 'reject', 'complete', 'archive', 'reopen'])
    .describe('Transition action'),
  comment: z.string().optional().describe('Comment for the transition'),
});

const RecordFeedbackSchema = z.object({
  sessionId: z.string().describe('AI session ID'),
  rating: z.enum(['positive', 'negative', 'skipped']).describe('Quick rating'),
  errorCategory: z
    .enum([
      'missing_context',
      'wrong_context',
      'ignored_constraints',
      'hallucination',
      'style_mismatch',
      'other',
    ])
    .optional()
    .describe('Error category if negative'),
  editDistance: z.number().optional().describe('0-1 score of output quality'),
  notes: z.string().optional().describe('Additional feedback notes'),
});

// Server configuration
interface ServerConfig {
  apiBaseUrl: string;
  apiKey?: string;
  tenantId: string;
  workspaceId: string;
}

export function createMcpServer(config: ServerConfig) {
  const server = new Server(
    {
      name: 'claude-context',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );

  // Helper to make API calls
  async function apiCall<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${config.apiBaseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': config.tenantId,
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // RESOURCES - Read-only access to context data
  // ============================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: `context://graphs`,
          name: 'Context Graphs',
          description: 'List of available context graphs in this workspace',
          mimeType: 'application/json',
        },
        {
          uri: `context://slices`,
          name: 'Work Slices',
          description: 'Active and recent work slices',
          mimeType: 'application/json',
        },
        {
          uri: `context://analytics`,
          name: 'Context Analytics',
          description: 'Effectiveness metrics for context usage',
          mimeType: 'application/json',
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'context://graphs') {
      const graphs = await apiCall<unknown[]>(
        'GET',
        `/api/v1/context/graphs?workspaceId=${config.workspaceId}`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(graphs, null, 2),
          },
        ],
      };
    }

    if (uri === 'context://slices') {
      const slices = await apiCall<unknown[]>(
        'GET',
        `/api/v1/slices?workspaceId=${config.workspaceId}`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(slices, null, 2),
          },
        ],
      };
    }

    if (uri === 'context://analytics') {
      const analytics = await apiCall<unknown>(
        'GET',
        `/api/v1/workspaces/${config.workspaceId}/analytics?days=30`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(analytics, null, 2),
          },
        ],
      };
    }

    // Handle dynamic URIs like context://graphs/{id}/nodes
    const graphNodesMatch = uri.match(/^context:\/\/graphs\/([^/]+)\/nodes$/);
    if (graphNodesMatch) {
      const graphId = graphNodesMatch[1];
      const nodes = await apiCall<unknown[]>(
        'GET',
        `/api/v1/context/graphs/${graphId}/nodes`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(nodes, null, 2),
          },
        ],
      };
    }

    const sliceMatch = uri.match(/^context:\/\/slices\/([^/]+)$/);
    if (sliceMatch) {
      const sliceId = sliceMatch[1];
      const slice = await apiCall<unknown>('GET', `/api/v1/slices/${sliceId}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(slice, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  // ============================================
  // TOOLS - Actions that modify data
  // ============================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_context',
          description:
            'Search organizational context using semantic search. Returns relevant documents, decisions, and patterns.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Natural language search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum results to return (default: 10)',
              },
              layer: {
                type: 'string',
                enum: ['ORGANIZATIONAL', 'WORKSPACE', 'SLICE'],
                description: 'Filter by context layer',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'compile_context',
          description:
            'Compile optimized context within a token budget. Prioritizes most relevant and recent context.',
          inputSchema: {
            type: 'object',
            properties: {
              tokenBudget: {
                type: 'number',
                description: 'Maximum tokens for compiled context (default: 8000)',
              },
              nodeIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific nodes to include',
              },
              includeSlice: {
                type: 'string',
                description: 'Include context from a specific slice',
              },
            },
          },
        },
        {
          name: 'create_slice',
          description:
            'Create a new work slice with defined outcome, constraints, and acceptance criteria.',
          inputSchema: {
            type: 'object',
            properties: {
              outcome: {
                type: 'string',
                description: 'What this slice will accomplish',
              },
              antiScope: {
                type: 'string',
                description: 'What is explicitly out of scope',
              },
              constraints: {
                type: 'array',
                items: { type: 'string' },
                description: 'Technical or business constraints',
              },
              acceptanceCriteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'Criteria for completion',
              },
            },
            required: ['outcome'],
          },
        },
        {
          name: 'transition_slice',
          description:
            'Move a slice through its workflow: start, submit, approve, reject, complete, archive, or reopen.',
          inputSchema: {
            type: 'object',
            properties: {
              sliceId: {
                type: 'string',
                description: 'ID of the slice to transition',
              },
              action: {
                type: 'string',
                enum: [
                  'start',
                  'submit',
                  'approve',
                  'reject',
                  'complete',
                  'archive',
                  'reopen',
                ],
                description: 'Transition action',
              },
              comment: {
                type: 'string',
                description: 'Comment for the transition',
              },
            },
            required: ['sliceId', 'action'],
          },
        },
        {
          name: 'record_feedback',
          description:
            'Record feedback on AI output quality. Helps improve context selection over time.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'AI session ID',
              },
              rating: {
                type: 'string',
                enum: ['positive', 'negative', 'skipped'],
                description: 'Quick rating',
              },
              errorCategory: {
                type: 'string',
                enum: [
                  'missing_context',
                  'wrong_context',
                  'ignored_constraints',
                  'hallucination',
                  'style_mismatch',
                  'other',
                ],
                description: 'Error category if negative',
              },
              editDistance: {
                type: 'number',
                description: '0-1 score of output quality',
              },
              notes: {
                type: 'string',
                description: 'Additional feedback notes',
              },
            },
            required: ['sessionId', 'rating'],
          },
        },
        {
          name: 'start_session',
          description:
            'Start a new AI session to track context usage and gather feedback.',
          inputSchema: {
            type: 'object',
            properties: {
              contextNodeIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Context nodes being used in this session',
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'search_context': {
        const input = SearchContextSchema.parse(args);
        const results = await apiCall<unknown>(
          'POST',
          `/api/v1/context/search`,
          {
            workspaceId: config.workspaceId,
            query: input.query,
            limit: input.limit,
            layer: input.layer,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'compile_context': {
        const input = CompileContextSchema.parse(args);
        const compiled = await apiCall<{ text: string; tokenCount: number }>(
          'POST',
          `/api/v1/context/compile`,
          {
            workspaceId: config.workspaceId,
            tokenBudget: input.tokenBudget,
            nodeIds: input.nodeIds,
            sliceId: input.includeSlice,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: compiled.text,
            },
          ],
        };
      }

      case 'create_slice': {
        const input = CreateSliceSchema.parse(args);
        const slice = await apiCall<unknown>('POST', `/api/v1/slices`, {
          workspaceId: config.workspaceId,
          outcome: input.outcome,
          antiScope: input.antiScope,
          constraints: input.constraints,
          acceptanceCriteria: input.acceptanceCriteria,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Created slice: ${JSON.stringify(slice, null, 2)}`,
            },
          ],
        };
      }

      case 'transition_slice': {
        const input = TransitionSliceSchema.parse(args);
        const result = await apiCall<unknown>(
          'POST',
          `/api/v1/slices/${input.sliceId}/transition`,
          {
            action: input.action,
            comment: input.comment,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Transition complete: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'record_feedback': {
        const input = RecordFeedbackSchema.parse(args);
        await apiCall<unknown>('POST', `/api/v1/feedback`, {
          sessionId: input.sessionId,
          quickRating: input.rating.toUpperCase(),
          errorCategory: input.errorCategory,
          editDistance: input.editDistance,
          notes: input.notes,
        });
        return {
          content: [
            {
              type: 'text',
              text: 'Feedback recorded successfully',
            },
          ],
        };
      }

      case 'start_session': {
        const input = z
          .object({
            contextNodeIds: z.array(z.string()).optional(),
          })
          .parse(args);

        const session = await apiCall<{ id: string }>('POST', `/api/v1/sessions`, {
          workspaceId: config.workspaceId,
          contextSnapshot: {
            nodeIds: input.contextNodeIds || [],
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: `Session started: ${session.id}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // ============================================
  // PROMPTS - Pre-built prompt templates
  // ============================================

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'understand_codebase',
          description:
            'Get a comprehensive understanding of the codebase with organizational context',
          arguments: [
            {
              name: 'focus',
              description: 'Specific area to focus on (e.g., "authentication", "data layer")',
              required: false,
            },
          ],
        },
        {
          name: 'implement_feature',
          description: 'Implement a feature using slice-guided development with full context',
          arguments: [
            {
              name: 'sliceId',
              description: 'The slice ID defining the work to be done',
              required: true,
            },
          ],
        },
        {
          name: 'review_changes',
          description: 'Review code changes with organizational context and standards',
          arguments: [
            {
              name: 'diff',
              description: 'The code diff to review',
              required: true,
            },
          ],
        },
        {
          name: 'debug_issue',
          description: 'Debug an issue with full context about the system',
          arguments: [
            {
              name: 'error',
              description: 'The error message or issue description',
              required: true,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Compile relevant context
    const contextResponse = await apiCall<{ text: string }>(
      'POST',
      `/api/v1/context/compile`,
      {
        workspaceId: config.workspaceId,
        tokenBudget: 4000,
      }
    );
    const context = contextResponse.text;

    switch (name) {
      case 'understand_codebase': {
        const focus = args?.focus || 'general architecture';
        return {
          description: `Understanding ${focus} in the codebase`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are helping me understand the codebase, specifically focusing on: ${focus}

Here is the organizational context for this codebase:

<context>
${context}
</context>

Please provide a comprehensive explanation of how ${focus} works in this codebase, including:
1. Key files and their responsibilities
2. Data flow and architecture
3. Important patterns and conventions used
4. Common pitfalls or areas requiring careful attention

Focus on giving me practical understanding I can use immediately.`,
              },
            },
          ],
        };
      }

      case 'implement_feature': {
        const sliceId = args?.sliceId;
        if (!sliceId) {
          throw new Error('sliceId is required');
        }

        const slice = await apiCall<{
          outcome: string;
          antiScope?: string;
          constraints: { content: string }[];
          acceptanceCriteria: { content: string }[];
        }>('GET', `/api/v1/slices/${sliceId}`);

        return {
          description: `Implementing: ${slice.outcome}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are implementing a feature defined by the following work slice:

## Outcome
${slice.outcome}

${slice.antiScope ? `## Anti-Scope (Out of Scope)\n${slice.antiScope}` : ''}

## Constraints
${slice.constraints.map((c) => `- ${c.content}`).join('\n')}

## Acceptance Criteria
${slice.acceptanceCriteria.map((ac) => `- [ ] ${ac.content}`).join('\n')}

## Organizational Context
<context>
${context}
</context>

Please implement this feature following these guidelines:
1. Adhere strictly to the constraints and stay within scope
2. Follow the patterns and conventions from the organizational context
3. Ensure all acceptance criteria will be met
4. Write clean, maintainable code

Let's begin the implementation.`,
              },
            },
          ],
        };
      }

      case 'review_changes': {
        const diff = args?.diff;
        if (!diff) {
          throw new Error('diff is required');
        }

        return {
          description: 'Reviewing code changes',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are reviewing the following code changes against our organizational standards.

## Organizational Context & Standards
<context>
${context}
</context>

## Code Changes to Review
\`\`\`diff
${diff}
\`\`\`

Please review these changes and provide feedback on:
1. **Correctness**: Are there any bugs or logic errors?
2. **Standards Compliance**: Do the changes follow our organizational patterns?
3. **Security**: Are there any security concerns?
4. **Performance**: Are there any performance implications?
5. **Maintainability**: Is the code clean and easy to understand?

Provide specific, actionable feedback.`,
              },
            },
          ],
        };
      }

      case 'debug_issue': {
        const error = args?.error;
        if (!error) {
          throw new Error('error is required');
        }

        return {
          description: 'Debugging issue',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I'm encountering an issue and need help debugging it.

## Error / Issue
${error}

## System Context
<context>
${context}
</context>

Please help me debug this issue by:
1. Analyzing the error in the context of our system architecture
2. Identifying likely root causes based on the organizational context
3. Suggesting specific debugging steps
4. Providing potential fixes with code examples

Let's solve this step by step.`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  return server;
}

// Main entry point
async function main() {
  // Configuration from environment
  const config: ServerConfig = {
    apiBaseUrl: process.env.CLAUDE_CONTEXT_API_URL || 'http://localhost:3001',
    apiKey: process.env.CLAUDE_CONTEXT_API_KEY,
    tenantId: process.env.CLAUDE_CONTEXT_TENANT_ID || 'default',
    workspaceId: process.env.CLAUDE_CONTEXT_WORKSPACE_ID || 'default',
  };

  const server = createMcpServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Claude Context MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { ServerConfig };
