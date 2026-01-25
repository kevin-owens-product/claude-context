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

// CoWork-specific schemas (Tier 3: File Operations)
const ExportContextSchema = z.object({
  outputPath: z.string().describe('Local folder path for export'),
  graphId: z.string().optional().describe('Specific graph to export'),
  nodeTypes: z
    .array(z.enum(['DOCUMENT', 'DECISION', 'PATTERN', 'EXTERNAL_LINK']))
    .optional()
    .describe('Filter by node types'),
  format: z.enum(['markdown', 'json', 'yaml']).default('markdown').describe('Export format'),
});

const ExportSlicePackageSchema = z.object({
  sliceId: z.string().describe('ID of the slice to export'),
  outputPath: z.string().describe('Local folder path for export'),
  includeHistory: z.boolean().default(false).describe('Include state transition history'),
  includeContext: z.boolean().default(true).describe('Include linked context nodes'),
});

const GenerateReportSchema = z.object({
  reportType: z
    .enum(['weekly_summary', 'slice_status', 'context_health', 'team_activity', 'audit_export'])
    .describe('Type of report to generate'),
  outputPath: z.string().describe('Local file path for the report'),
  dateRange: z
    .object({
      start: z.string().describe('Start date (ISO format)'),
      end: z.string().describe('End date (ISO format)'),
    })
    .optional()
    .describe('Date range for the report'),
  format: z.enum(['markdown', 'html', 'json']).default('markdown').describe('Output format'),
});

const CreateDocumentFromTemplateSchema = z.object({
  templateType: z
    .enum(['adr', 'slice_brief', 'onboarding_guide', 'review_checklist', 'meeting_agenda'])
    .describe('Type of document template'),
  outputPath: z.string().describe('Local file path for the document'),
  variables: z.record(z.string()).optional().describe('Template variables to fill in'),
});

// Reactive Context Schemas (Tier 1: Universal - Real-time capabilities)
const SubscribeContextSchema = z.object({
  scopes: z.array(z.object({
    type: z.enum(['workspace', 'graph', 'slice', 'node', 'pattern']),
    id: z.string().optional(),
    pattern: z.string().optional(),
  })).describe('Scopes to subscribe to'),
  filters: z.object({
    nodeTypes: z.array(z.string()).optional(),
    layers: z.array(z.string()).optional(),
    eventTypes: z.array(z.string()).optional(),
  }).optional().describe('Optional filters'),
  options: z.object({
    mode: z.enum(['realtime', 'batched', 'polling']).default('realtime'),
    batchWindow: z.number().optional().describe('Batch window in ms for batched mode'),
  }).optional().describe('Delivery options'),
});

const GetContextUpdatesSchema = z.object({
  sinceVersion: z.string().optional().describe('Global version to get updates since'),
  sinceTimestamp: z.string().optional().describe('ISO timestamp to get updates since'),
  graphId: z.string().optional().describe('Filter to specific graph'),
  entityTypes: z.array(z.string()).optional().describe('Filter by entity types'),
  limit: z.number().default(100).describe('Maximum events to return'),
});

const GetEntityVersionSchema = z.object({
  entityType: z.string().describe('Type of entity (context_node, slice, etc.)'),
  entityId: z.string().describe('ID of the entity'),
});

const GetEntityHistorySchema = z.object({
  entityType: z.string().describe('Type of entity'),
  entityId: z.string().describe('ID of the entity'),
  fromVersion: z.number().optional().describe('Start version'),
  toVersion: z.number().optional().describe('End version'),
  limit: z.number().default(50).describe('Maximum changes to return'),
});

const RollbackEntitySchema = z.object({
  entityType: z.string().describe('Type of entity'),
  entityId: z.string().describe('ID of the entity'),
  toVersion: z.number().describe('Version to rollback to'),
});

// ============================================
// Living Software Platform Schemas
// ============================================

const AssembleContextSchema = z.object({
  query: z.string().describe('Natural language query for context assembly'),
  projectId: z.string().optional().describe('Project ID to focus context on'),
  maxTokens: z.number().default(4000).describe('Maximum tokens for assembled context'),
});

const UpdateIdentitySchema = z.object({
  key: z.string().describe('Attribute key (e.g., "preferred_language", "expertise")'),
  value: z.string().describe('Attribute value'),
  category: z.enum(['demographic', 'preference', 'skill', 'goal', 'constraint', 'context']).optional().describe('Attribute category'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence level (0-1)'),
});

const AddProjectGoalSchema = z.object({
  projectId: z.string().describe('Project ID'),
  description: z.string().describe('Goal description'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).describe('Goal priority'),
  parentGoalId: z.string().optional().describe('Parent goal ID for hierarchical goals'),
  successCriteria: z.array(z.string()).optional().describe('Success criteria for the goal'),
});

const RecordProjectDecisionSchema = z.object({
  projectId: z.string().describe('Project ID'),
  description: z.string().describe('Decision description'),
  rationale: z.string().describe('Rationale for the decision'),
  alternatives: z.array(z.string()).optional().describe('Alternatives considered'),
});

const AddProjectConstraintSchema = z.object({
  projectId: z.string().describe('Project ID'),
  description: z.string().describe('Constraint description'),
  category: z.enum(['technical', 'business', 'regulatory', 'security', 'performance', 'accessibility', 'compatibility', 'budget', 'timeline']).describe('Constraint category'),
  severity: z.enum(['must', 'should', 'could', 'wont']).describe('Constraint severity (MoSCoW)'),
  rationale: z.string().optional().describe('Rationale for the constraint'),
});

const CreateIntentGraphSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Intent graph name'),
  description: z.string().optional().describe('Intent graph description'),
});

const AddIntentGoalSchema = z.object({
  graphId: z.string().describe('Intent graph ID'),
  description: z.string().describe('Goal description'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).describe('Priority'),
  successCriteria: z.array(z.string()).optional().describe('Success criteria'),
  parentId: z.string().optional().describe('Parent goal ID'),
});

const AddIntentEntitySchema = z.object({
  graphId: z.string().describe('Intent graph ID'),
  name: z.string().describe('Entity name'),
  description: z.string().describe('Entity description'),
  attributes: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(true),
    description: z.string().optional(),
  })).describe('Entity attributes'),
});

const CreateArtifactSchema = z.object({
  projectId: z.string().describe('Project ID'),
  intentGraphId: z.string().optional().describe('Intent graph ID'),
  name: z.string().describe('Artifact name'),
  description: z.string().optional().describe('Artifact description'),
  type: z.enum(['code', 'test', 'documentation', 'schema', 'config', 'api_spec', 'diagram', 'other']).describe('Artifact type'),
  content: z.string().describe('Artifact content'),
});

const ProposeArtifactEvolutionSchema = z.object({
  artifactId: z.string().describe('Artifact ID'),
  changedIntentNodeIds: z.array(z.string()).describe('Intent node IDs that have changed'),
});

// ============================================
// Codebase Observation Schemas
// ============================================

const ListRepositoriesSchema = z.object({
  status: z.enum(['PENDING', 'CLONING', 'ACTIVE', 'SYNCING', 'ERROR', 'ARCHIVED']).optional().describe('Filter by status'),
  provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'OTHER']).optional().describe('Filter by provider'),
  search: z.string().optional().describe('Search by name'),
  limit: z.number().optional().default(20).describe('Maximum results'),
});

const GetRepositoryFilesSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  path: z.string().optional().describe('Filter by path prefix'),
  extension: z.string().optional().describe('Filter by file extension'),
  language: z.string().optional().describe('Filter by language'),
  limit: z.number().optional().default(100).describe('Maximum results'),
});

const GetFileDependenciesSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  fileId: z.string().describe('File ID'),
  depth: z.number().optional().default(3).describe('Maximum depth to traverse'),
});

const GetRecentChangesSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  branch: z.string().optional().describe('Filter by branch'),
  author: z.string().optional().describe('Filter by author email'),
  since: z.string().optional().describe('ISO date - commits after this date'),
  limit: z.number().optional().default(50).describe('Maximum commits'),
});

const AnalyzeHotspotsSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  days: z.number().optional().default(30).describe('Analysis period in days'),
});

const SyncRepositorySchema = z.object({
  repoId: z.string().describe('Repository ID'),
});

const CreateRepositorySchema = z.object({
  name: z.string().describe('Repository name'),
  url: z.string().describe('Git clone URL'),
  description: z.string().optional().describe('Repository description'),
  provider: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'OTHER']).optional().describe('Git provider'),
  defaultBranch: z.string().optional().default('main').describe('Default branch name'),
  authType: z.enum(['NONE', 'PAT', 'SSH_KEY', 'GITHUB_APP']).optional().describe('Auth type'),
  authToken: z.string().optional().describe('Auth token (if PAT)'),
});

const SearchCodeSymbolsSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  query: z.string().describe('Symbol name or pattern to search'),
  symbolType: z.enum(['function', 'class', 'interface', 'variable', 'type']).optional().describe('Filter by symbol type'),
  limit: z.number().optional().default(20).describe('Maximum results'),
});

const GetCapabilityCodeSchema = z.object({
  capabilityId: z.string().describe('Capability ID'),
  includeTests: z.boolean().optional().default(true).describe('Include test files'),
});

const GetCallGraphSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  fileId: z.string().optional().describe('File ID (optional if symbolId provided)'),
  symbolId: z.string().optional().describe('Symbol ID to build graph from'),
  direction: z.enum(['callers', 'callees', 'both']).optional().default('both').describe('Graph direction'),
  depth: z.number().optional().default(2).describe('Maximum depth'),
});

// Symbol Analysis Schemas (Phase 2)
const GetSymbolDetailsSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  symbolId: z.string().describe('Symbol ID'),
});

const GetSymbolReferencesSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  symbolId: z.string().describe('Symbol ID'),
  direction: z.enum(['incoming', 'outgoing', 'both']).optional().default('both').describe('Reference direction'),
  referenceType: z.enum(['CALL', 'INSTANTIATION', 'EXTENSION', 'TYPE_REFERENCE', 'IMPORT']).optional().describe('Filter by reference type'),
  limit: z.number().optional().default(50).describe('Maximum results'),
});

const GetComplexityReportSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  fileId: z.string().optional().describe('Filter to specific file'),
  minComplexity: z.number().optional().default(10).describe('Minimum complexity threshold'),
  limit: z.number().optional().default(20).describe('Maximum results'),
});

const AnalyzeSymbolsSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  fileIds: z.array(z.string()).optional().describe('Specific files to analyze (or all if not provided)'),
});

const FindSymbolPathSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  sourceSymbolId: z.string().describe('Source symbol ID'),
  targetSymbolId: z.string().describe('Target symbol ID'),
  maxDepth: z.number().optional().default(10).describe('Maximum search depth'),
});

const DetectCyclesSchema = z.object({
  repoId: z.string().describe('Repository ID'),
  startSymbolId: z.string().optional().describe('Start symbol (or search all if not provided)'),
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

    return response.json() as Promise<T>;
  }

  // ============================================
  // RESOURCES - Read-only access to context data
  // ============================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        // Living Software Platform Resources
        {
          uri: `claude_context://identity`,
          name: 'Identity Graph',
          description: 'User identity attributes and preferences for personalized context',
          mimeType: 'application/json',
        },
        {
          uri: `claude_context://projects`,
          name: 'Projects',
          description: 'Active projects with goals, constraints, and decisions',
          mimeType: 'application/json',
        },
        {
          uri: `claude_context://intent-graphs`,
          name: 'Intent Graphs',
          description: 'Intent graphs capturing goals, entities, and behaviors',
          mimeType: 'application/json',
        },
        {
          uri: `claude_context://artifacts`,
          name: 'Living Artifacts',
          description: 'Code and documentation artifacts with intent provenance',
          mimeType: 'application/json',
        },
        {
          uri: `claude_context://assembly`,
          name: 'Assembled Context',
          description: 'Pre-assembled context optimized for Claude injection',
          mimeType: 'application/xml',
        },
        // Legacy Resources
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
        {
          uri: `context://version`,
          name: 'Current Version',
          description: 'Current global version for sync purposes',
          mimeType: 'application/json',
        },
        {
          uri: `context://subscriptions`,
          name: 'Active Subscriptions',
          description: 'List of active context subscriptions',
          mimeType: 'application/json',
        },
        // Codebase Observation Resources
        {
          uri: `codebase://repositories`,
          name: 'Code Repositories',
          description: 'Tracked git repositories with file and dependency information',
          mimeType: 'application/json',
        },
        {
          uri: `codebase://repositories/{id}/structure`,
          name: 'Repository Structure',
          description: 'File tree and directory structure of a repository',
          mimeType: 'application/json',
        },
        {
          uri: `codebase://repositories/{id}/dependencies`,
          name: 'Repository Dependencies',
          description: 'Import graph and external dependencies of a repository',
          mimeType: 'application/json',
        },
        {
          uri: `codebase://repositories/{id}/activity`,
          name: 'Repository Activity',
          description: 'Recent commits and change activity in a repository',
          mimeType: 'application/json',
        },
        {
          uri: `codebase://repositories/{id}/hotspots`,
          name: 'Repository Hotspots',
          description: 'High-churn files that may need attention',
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

    // Reactive context resources
    if (uri === 'context://version') {
      const version = await apiCall<{ globalVersion: string; timestamp: string }>(
        'GET',
        `/api/v1/context/version`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(version, null, 2),
          },
        ],
      };
    }

    if (uri === 'context://subscriptions') {
      const subscriptions = await apiCall<{ subscriptions: unknown[] }>(
        'GET',
        `/api/v1/context/subscriptions`
      );
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(subscriptions, null, 2),
          },
        ],
      };
    }

    // Living Software Platform Resources
    if (uri === 'claude_context://identity') {
      const identity = await apiCall<{
        contextId: string;
        attributes: Array<{
          key: string;
          value: string;
          category: string;
          confidence: number;
          source: string;
        }>;
      }>('GET', `/api/v1/context/identity`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(identity, null, 2),
          },
        ],
      };
    }

    if (uri === 'claude_context://projects') {
      const projects = await apiCall<{
        projects: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          goals: unknown[];
          constraints: unknown[];
        }>;
        total: number;
      }>('GET', `/api/v1/context/projects`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    }

    const projectMatch = uri.match(/^claude_context:\/\/projects\/([^/]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      const project = await apiCall<unknown>('GET', `/api/v1/context/projects/${projectId}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }

    if (uri === 'claude_context://intent-graphs') {
      const graphs = await apiCall<{
        graphs: Array<{
          id: string;
          name: string;
          status: string;
          goals: unknown[];
          entities: unknown[];
          behaviors: unknown[];
        }>;
        total: number;
      }>('GET', `/api/v1/intent-graphs`);
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

    const intentGraphMatch = uri.match(/^claude_context:\/\/intent-graphs\/([^/]+)$/);
    if (intentGraphMatch) {
      const graphId = intentGraphMatch[1];
      const graph = await apiCall<unknown>('GET', `/api/v1/intent-graphs/${graphId}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(graph, null, 2),
          },
        ],
      };
    }

    if (uri === 'claude_context://artifacts') {
      const artifacts = await apiCall<{
        artifacts: Array<{
          id: string;
          name: string;
          type: string;
          status: string;
          currentVersion: number;
        }>;
        total: number;
      }>('GET', `/api/v1/artifacts`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(artifacts, null, 2),
          },
        ],
      };
    }

    const artifactMatch = uri.match(/^claude_context:\/\/artifacts\/([^/]+)$/);
    if (artifactMatch) {
      const artifactId = artifactMatch[1];
      const artifact = await apiCall<unknown>('GET', `/api/v1/artifacts/${artifactId}`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(artifact, null, 2),
          },
        ],
      };
    }

    if (uri === 'claude_context://assembly') {
      const assembled = await apiCall<{
        context: string;
        sources: Array<{ id: string; type: string; name: string; relevanceScore: number }>;
        tokenBudget: { total: { used: number; allocated: number } };
      }>('POST', `/api/v1/context/assembly`, {
        query: 'general context',
        maxTokens: 4000,
      });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/xml',
            text: assembled.context,
          },
        ],
      };
    }

    // ============================================
    // Codebase Observation Resources
    // ============================================

    if (uri === 'codebase://repositories') {
      const repositories = await apiCall<unknown[]>('GET', `/api/v1/repositories`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(repositories, null, 2),
          },
        ],
      };
    }

    const repoStructureMatch = uri.match(/^codebase:\/\/repositories\/([^/]+)\/structure$/);
    if (repoStructureMatch) {
      const repoId = repoStructureMatch[1];
      const files = await apiCall<unknown[]>('GET', `/api/v1/repositories/${repoId}/files?limit=500`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }

    const repoDepsMatch = uri.match(/^codebase:\/\/repositories\/([^/]+)\/dependencies$/);
    if (repoDepsMatch) {
      const repoId = repoDepsMatch[1];
      const stats = await apiCall<unknown>('GET', `/api/v1/repositories/${repoId}/stats`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }

    const repoActivityMatch = uri.match(/^codebase:\/\/repositories\/([^/]+)\/activity$/);
    if (repoActivityMatch) {
      const repoId = repoActivityMatch[1];
      const activity = await apiCall<unknown[]>('GET', `/api/v1/repositories/${repoId}/activity?days=30`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(activity, null, 2),
          },
        ],
      };
    }

    const repoHotspotsMatch = uri.match(/^codebase:\/\/repositories\/([^/]+)\/hotspots$/);
    if (repoHotspotsMatch) {
      const repoId = repoHotspotsMatch[1];
      const hotspots = await apiCall<unknown[]>('GET', `/api/v1/repositories/${repoId}/hotspots?days=30`);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(hotspots, null, 2),
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
        // ============================================
        // CoWork-specific tools (Tier 3: File Operations)
        // ============================================
        {
          name: 'export_context_to_files',
          description:
            'Export context nodes to local markdown/json files organized by category. Ideal for CoWork file-based workflows.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: {
                type: 'string',
                description: 'Local folder path for export',
              },
              graphId: {
                type: 'string',
                description: 'Specific graph to export (defaults to workspace default)',
              },
              nodeTypes: {
                type: 'array',
                items: { type: 'string', enum: ['DOCUMENT', 'DECISION', 'PATTERN', 'EXTERNAL_LINK'] },
                description: 'Filter by node types',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'json', 'yaml'],
                description: 'Export format (default: markdown)',
              },
            },
            required: ['outputPath'],
          },
        },
        {
          name: 'export_slice_package',
          description:
            'Export a complete slice with all context, constraints, and criteria as a folder structure.',
          inputSchema: {
            type: 'object',
            properties: {
              sliceId: {
                type: 'string',
                description: 'ID of the slice to export',
              },
              outputPath: {
                type: 'string',
                description: 'Local folder path for export',
              },
              includeHistory: {
                type: 'boolean',
                description: 'Include state transition history (default: false)',
              },
              includeContext: {
                type: 'boolean',
                description: 'Include linked context nodes (default: true)',
              },
            },
            required: ['sliceId', 'outputPath'],
          },
        },
        {
          name: 'generate_report',
          description:
            'Generate a formatted report from context and analytics data. Supports weekly summaries, slice status, and audit exports.',
          inputSchema: {
            type: 'object',
            properties: {
              reportType: {
                type: 'string',
                enum: ['weekly_summary', 'slice_status', 'context_health', 'team_activity', 'audit_export'],
                description: 'Type of report to generate',
              },
              outputPath: {
                type: 'string',
                description: 'Local file path for the report',
              },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: 'Start date (ISO format)' },
                  end: { type: 'string', description: 'End date (ISO format)' },
                },
                description: 'Date range for the report',
              },
              format: {
                type: 'string',
                enum: ['markdown', 'html', 'json'],
                description: 'Output format (default: markdown)',
              },
            },
            required: ['reportType', 'outputPath'],
          },
        },
        {
          name: 'create_document_from_template',
          description:
            'Generate a document using context-aware templates (ADR, slice brief, onboarding guide, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              templateType: {
                type: 'string',
                enum: ['adr', 'slice_brief', 'onboarding_guide', 'review_checklist', 'meeting_agenda'],
                description: 'Type of document template',
              },
              outputPath: {
                type: 'string',
                description: 'Local file path for the document',
              },
              variables: {
                type: 'object',
                additionalProperties: { type: 'string' },
                description: 'Template variables to fill in',
              },
            },
            required: ['templateType', 'outputPath'],
          },
        },
        // ============================================
        // Reactive Context Tools (Tier 1: Universal - Real-time)
        // ============================================
        {
          name: 'subscribe_context',
          description:
            'Subscribe to context changes for real-time updates. Returns subscription details for WebSocket or polling-based sync.',
          inputSchema: {
            type: 'object',
            properties: {
              scopes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['workspace', 'graph', 'slice', 'node', 'pattern'] },
                    id: { type: 'string', description: 'ID for workspace/graph/slice/node scopes' },
                    pattern: { type: 'string', description: 'Glob pattern for pattern scope' },
                  },
                  required: ['type'],
                },
                description: 'Scopes to subscribe to',
              },
              filters: {
                type: 'object',
                properties: {
                  nodeTypes: { type: 'array', items: { type: 'string' }, description: 'Filter by node types' },
                  layers: { type: 'array', items: { type: 'string' }, description: 'Filter by context layers' },
                  eventTypes: { type: 'array', items: { type: 'string' }, description: 'Filter by event types' },
                },
                description: 'Optional filters',
              },
              options: {
                type: 'object',
                properties: {
                  mode: { type: 'string', enum: ['realtime', 'batched', 'polling'], description: 'Delivery mode' },
                  batchWindow: { type: 'number', description: 'Batch window in ms for batched mode' },
                },
                description: 'Delivery options',
              },
            },
            required: ['scopes'],
          },
        },
        {
          name: 'get_context_updates',
          description:
            'Poll for context updates since a specific version or timestamp. Use for clients without WebSocket support.',
          inputSchema: {
            type: 'object',
            properties: {
              sinceVersion: { type: 'string', description: 'Global version to get updates since' },
              sinceTimestamp: { type: 'string', description: 'ISO timestamp to get updates since' },
              graphId: { type: 'string', description: 'Filter to specific graph' },
              entityTypes: { type: 'array', items: { type: 'string' }, description: 'Filter by entity types' },
              limit: { type: 'number', description: 'Maximum events to return (default: 100)' },
            },
          },
        },
        {
          name: 'get_entity_version',
          description:
            'Get the current version information for an entity including version number and last modified time.',
          inputSchema: {
            type: 'object',
            properties: {
              entityType: { type: 'string', description: 'Type of entity (context_node, slice, graph)' },
              entityId: { type: 'string', description: 'ID of the entity' },
            },
            required: ['entityType', 'entityId'],
          },
        },
        {
          name: 'get_entity_history',
          description:
            'Get the change history for an entity showing all modifications over time.',
          inputSchema: {
            type: 'object',
            properties: {
              entityType: { type: 'string', description: 'Type of entity' },
              entityId: { type: 'string', description: 'ID of the entity' },
              fromVersion: { type: 'number', description: 'Start version (optional)' },
              toVersion: { type: 'number', description: 'End version (optional)' },
              limit: { type: 'number', description: 'Maximum changes to return (default: 50)' },
            },
            required: ['entityType', 'entityId'],
          },
        },
        {
          name: 'get_entity_at_version',
          description:
            'Get the state of an entity at a specific version for point-in-time queries.',
          inputSchema: {
            type: 'object',
            properties: {
              entityType: { type: 'string', description: 'Type of entity' },
              entityId: { type: 'string', description: 'ID of the entity' },
              version: { type: 'number', description: 'Version number to retrieve' },
            },
            required: ['entityType', 'entityId', 'version'],
          },
        },
        {
          name: 'diff_entity_versions',
          description:
            'Compare two versions of an entity and get a detailed diff of changes.',
          inputSchema: {
            type: 'object',
            properties: {
              entityType: { type: 'string', description: 'Type of entity' },
              entityId: { type: 'string', description: 'ID of the entity' },
              fromVersion: { type: 'number', description: 'Source version' },
              toVersion: { type: 'number', description: 'Target version' },
            },
            required: ['entityType', 'entityId', 'fromVersion', 'toVersion'],
          },
        },
        {
          name: 'unsubscribe_context',
          description:
            'Unsubscribe from context updates.',
          inputSchema: {
            type: 'object',
            properties: {
              subscriptionId: { type: 'string', description: 'ID of the subscription to remove' },
            },
            required: ['subscriptionId'],
          },
        },
        // ============================================
        // Living Software Platform Tools
        // ============================================
        {
          name: 'assemble_context',
          description:
            'Assemble optimized context for Claude injection with semantic search, relevance scoring, and token budgets.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Natural language query for context assembly' },
              projectId: { type: 'string', description: 'Project ID to focus context on' },
              maxTokens: { type: 'number', description: 'Maximum tokens for assembled context (default: 4000)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'update_identity',
          description:
            'Update or create an identity attribute. Identity attributes personalize context and AI behavior.',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Attribute key (e.g., "preferred_language", "expertise")' },
              value: { type: 'string', description: 'Attribute value' },
              category: {
                type: 'string',
                enum: ['demographic', 'preference', 'skill', 'goal', 'constraint', 'context'],
                description: 'Attribute category',
              },
              confidence: { type: 'number', description: 'Confidence level (0-1)' },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'add_project_goal',
          description:
            'Add a goal to a project. Goals define what the project should accomplish.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              description: { type: 'string', description: 'Goal description' },
              priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Goal priority' },
              parentGoalId: { type: 'string', description: 'Parent goal ID for hierarchical goals' },
              successCriteria: { type: 'array', items: { type: 'string' }, description: 'Success criteria' },
            },
            required: ['projectId', 'description', 'priority'],
          },
        },
        {
          name: 'record_decision',
          description:
            'Record a project decision with rationale and alternatives considered.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              description: { type: 'string', description: 'Decision description' },
              rationale: { type: 'string', description: 'Rationale for the decision' },
              alternatives: { type: 'array', items: { type: 'string' }, description: 'Alternatives considered' },
            },
            required: ['projectId', 'description', 'rationale'],
          },
        },
        {
          name: 'add_project_constraint',
          description:
            'Add a constraint to a project using MoSCoW prioritization.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              description: { type: 'string', description: 'Constraint description' },
              category: {
                type: 'string',
                enum: ['technical', 'business', 'regulatory', 'security', 'performance', 'accessibility', 'compatibility', 'budget', 'timeline'],
                description: 'Constraint category',
              },
              severity: { type: 'string', enum: ['must', 'should', 'could', 'wont'], description: 'MoSCoW severity' },
              rationale: { type: 'string', description: 'Rationale for the constraint' },
            },
            required: ['projectId', 'description', 'category', 'severity'],
          },
        },
        {
          name: 'create_intent_graph',
          description:
            'Create an intent graph to capture goals, constraints, entities, and behaviors for a project.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              name: { type: 'string', description: 'Intent graph name' },
              description: { type: 'string', description: 'Intent graph description' },
            },
            required: ['projectId', 'name'],
          },
        },
        {
          name: 'add_intent_goal',
          description:
            'Add a goal to an intent graph with success criteria.',
          inputSchema: {
            type: 'object',
            properties: {
              graphId: { type: 'string', description: 'Intent graph ID' },
              description: { type: 'string', description: 'Goal description' },
              priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Priority' },
              successCriteria: { type: 'array', items: { type: 'string' }, description: 'Success criteria' },
              parentId: { type: 'string', description: 'Parent goal ID' },
            },
            required: ['graphId', 'description', 'priority'],
          },
        },
        {
          name: 'add_intent_entity',
          description:
            'Add an entity to an intent graph with attributes and relationships.',
          inputSchema: {
            type: 'object',
            properties: {
              graphId: { type: 'string', description: 'Intent graph ID' },
              name: { type: 'string', description: 'Entity name' },
              description: { type: 'string', description: 'Entity description' },
              attributes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    description: { type: 'string' },
                  },
                  required: ['name', 'type'],
                },
                description: 'Entity attributes',
              },
            },
            required: ['graphId', 'name', 'description', 'attributes'],
          },
        },
        {
          name: 'create_artifact',
          description:
            'Create a living artifact with intent provenance tracking.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              intentGraphId: { type: 'string', description: 'Intent graph ID for provenance' },
              name: { type: 'string', description: 'Artifact name' },
              description: { type: 'string', description: 'Artifact description' },
              type: {
                type: 'string',
                enum: ['code', 'test', 'documentation', 'schema', 'config', 'api_spec', 'diagram', 'other'],
                description: 'Artifact type',
              },
              content: { type: 'string', description: 'Artifact content' },
            },
            required: ['projectId', 'name', 'type', 'content'],
          },
        },
        {
          name: 'propose_artifact_evolution',
          description:
            'Propose artifact updates based on changes to linked intent nodes.',
          inputSchema: {
            type: 'object',
            properties: {
              artifactId: { type: 'string', description: 'Artifact ID' },
              changedIntentNodeIds: { type: 'array', items: { type: 'string' }, description: 'Changed intent node IDs' },
            },
            required: ['artifactId', 'changedIntentNodeIds'],
          },
        },
        // ============================================
        // Codebase Observation Tools
        // ============================================
        {
          name: 'list_repositories',
          description:
            'List tracked code repositories with their status, file counts, and language breakdown.',
          inputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['PENDING', 'CLONING', 'ACTIVE', 'SYNCING', 'ERROR', 'ARCHIVED'], description: 'Filter by status' },
              provider: { type: 'string', enum: ['GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'OTHER'], description: 'Filter by provider' },
              search: { type: 'string', description: 'Search by repository name' },
              limit: { type: 'number', description: 'Maximum results (default: 20)' },
            },
          },
        },
        {
          name: 'create_repository',
          description:
            'Add a git repository to track. Once created, use sync_repository to clone and index files.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Repository name' },
              url: { type: 'string', description: 'Git clone URL' },
              description: { type: 'string', description: 'Repository description' },
              provider: { type: 'string', enum: ['GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'OTHER'], description: 'Git provider' },
              defaultBranch: { type: 'string', description: 'Default branch name (default: main)' },
              authType: { type: 'string', enum: ['NONE', 'PAT', 'SSH_KEY', 'GITHUB_APP'], description: 'Authentication type' },
              authToken: { type: 'string', description: 'Authentication token (for PAT auth)' },
            },
            required: ['name', 'url'],
          },
        },
        {
          name: 'get_repository_files',
          description:
            'List files in a repository with optional filtering by path, extension, or language.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              path: { type: 'string', description: 'Filter by path prefix (e.g., "src/components")' },
              extension: { type: 'string', description: 'Filter by file extension (e.g., "ts", "tsx")' },
              language: { type: 'string', description: 'Filter by language (e.g., "typescript")' },
              limit: { type: 'number', description: 'Maximum results (default: 100)' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'get_file_dependencies',
          description:
            'Get the import/dependency graph for a file, showing what it imports and what imports it.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              fileId: { type: 'string', description: 'File ID' },
              depth: { type: 'number', description: 'Maximum depth to traverse (default: 3)' },
            },
            required: ['repoId', 'fileId'],
          },
        },
        {
          name: 'get_recent_changes',
          description:
            'Get recent commits and changes in a repository.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              branch: { type: 'string', description: 'Filter by branch name' },
              author: { type: 'string', description: 'Filter by author email' },
              since: { type: 'string', description: 'ISO date - get commits after this date' },
              limit: { type: 'number', description: 'Maximum commits (default: 50)' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'analyze_hotspots',
          description:
            'Identify high-churn files (hotspots) that may need attention due to frequent changes.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              days: { type: 'number', description: 'Analysis period in days (default: 30)' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'sync_repository',
          description:
            'Sync a repository with its remote, fetching new commits and updating file tracking.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'get_repository_stats',
          description:
            'Get statistics for a repository including file counts, line counts, and language breakdown.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'search_code_symbols',
          description:
            'Search for code symbols (functions, classes, interfaces) by name or pattern.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              query: { type: 'string', description: 'Symbol name or pattern to search' },
              symbolType: { type: 'string', enum: ['function', 'class', 'interface', 'variable', 'type'], description: 'Filter by symbol type' },
              limit: { type: 'number', description: 'Maximum results (default: 20)' },
            },
            required: ['repoId', 'query'],
          },
        },
        {
          name: 'get_capability_code',
          description:
            'Get code files associated with a business capability, including implementation and tests.',
          inputSchema: {
            type: 'object',
            properties: {
              capabilityId: { type: 'string', description: 'Capability ID' },
              includeTests: { type: 'boolean', description: 'Include test files (default: true)' },
            },
            required: ['capabilityId'],
          },
        },
        {
          name: 'get_call_graph',
          description:
            'Get the call graph for a symbol showing function calls and dependencies.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              fileId: { type: 'string', description: 'File ID (optional if symbolId provided)' },
              symbolId: { type: 'string', description: 'Symbol ID to build graph from' },
              direction: { type: 'string', enum: ['callers', 'callees', 'both'], description: 'Graph direction (default: both)' },
              depth: { type: 'number', description: 'Maximum depth (default: 2)' },
            },
            required: ['repoId'],
          },
        },
        // Symbol Analysis Tools (Phase 2)
        {
          name: 'get_symbol_details',
          description:
            'Get detailed information about a code symbol including signature, complexity, and location.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              symbolId: { type: 'string', description: 'Symbol ID' },
            },
            required: ['repoId', 'symbolId'],
          },
        },
        {
          name: 'get_symbol_references',
          description:
            'Get all references to or from a symbol (callers, callees, type references).',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              symbolId: { type: 'string', description: 'Symbol ID' },
              direction: { type: 'string', enum: ['incoming', 'outgoing', 'both'], description: 'Reference direction (default: both)' },
              referenceType: { type: 'string', enum: ['CALL', 'INSTANTIATION', 'EXTENSION', 'TYPE_REFERENCE', 'IMPORT'], description: 'Filter by reference type' },
              limit: { type: 'number', description: 'Maximum results (default: 50)' },
            },
            required: ['repoId', 'symbolId'],
          },
        },
        {
          name: 'get_complexity_report',
          description:
            'Get complexity metrics report for a repository or file, showing high-complexity symbols.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              fileId: { type: 'string', description: 'Filter to specific file' },
              minComplexity: { type: 'number', description: 'Minimum complexity threshold (default: 10)' },
              limit: { type: 'number', description: 'Maximum results (default: 20)' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'analyze_symbols',
          description:
            'Trigger symbol analysis for a repository to extract functions, classes, and call references.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              fileIds: { type: 'array', items: { type: 'string' }, description: 'Specific files to analyze' },
            },
            required: ['repoId'],
          },
        },
        {
          name: 'find_symbol_path',
          description:
            'Find the shortest call path between two symbols in the codebase.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              sourceSymbolId: { type: 'string', description: 'Source symbol ID' },
              targetSymbolId: { type: 'string', description: 'Target symbol ID' },
              maxDepth: { type: 'number', description: 'Maximum search depth (default: 10)' },
            },
            required: ['repoId', 'sourceSymbolId', 'targetSymbolId'],
          },
        },
        {
          name: 'detect_cycles',
          description:
            'Detect circular dependencies in the call graph.',
          inputSchema: {
            type: 'object',
            properties: {
              repoId: { type: 'string', description: 'Repository ID' },
              startSymbolId: { type: 'string', description: 'Start symbol (searches all if not provided)' },
            },
            required: ['repoId'],
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

      // ============================================
      // CoWork-specific tools (Tier 3: File Operations)
      // ============================================

      case 'export_context_to_files': {
        const input = ExportContextSchema.parse(args);

        // Get nodes from API
        const graphId = input.graphId || 'default';
        const nodes = await apiCall<Array<{
          id: string;
          name: string;
          type: string;
          layer: string;
          content: string;
          freshness: string;
          tokenCount: number;
          updatedAt: string;
        }>>('GET', `/api/v1/context/graphs/${graphId}/nodes`);

        // Filter by type if specified
        const filteredNodes = input.nodeTypes
          ? nodes.filter((n) => input.nodeTypes!.includes(n.type as any))
          : nodes;

        // Generate export structure description
        const exportStructure = filteredNodes.map((node) => {
          const filename = `${node.name.toLowerCase().replace(/\s+/g, '-')}.${input.format === 'markdown' ? 'md' : input.format}`;
          const folder = node.layer.toLowerCase();
          return {
            path: `${input.outputPath}/${folder}/${filename}`,
            node: {
              id: node.id,
              name: node.name,
              type: node.type,
              layer: node.layer,
              freshness: node.freshness,
              tokens: node.tokenCount,
            },
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: `Export plan for ${filteredNodes.length} context nodes:\n\n${JSON.stringify(exportStructure, null, 2)}\n\nTo complete the export, create these files with the node content. Each file should include YAML frontmatter with the node metadata.`,
            },
          ],
        };
      }

      case 'export_slice_package': {
        const input = ExportSlicePackageSchema.parse(args);

        // Get slice details
        const slice = await apiCall<{
          id: string;
          shortId: string;
          name: string;
          outcome: string;
          antiScope: string[];
          status: string;
          constraints: { content: string; orderIndex: number }[];
          acceptanceCriteria: { content: string; isCompleted: boolean; orderIndex: number }[];
          transitions?: { fromStatus: string; toStatus: string; event: string; createdAt: string; comment?: string }[];
        }>('GET', `/api/v1/slices/${input.sliceId}`);

        // Build package structure
        const packageStructure = {
          basePath: `${input.outputPath}/${slice.shortId}-${slice.name.toLowerCase().replace(/\s+/g, '-')}`,
          files: [
            {
              path: 'README.md',
              description: 'Slice overview with outcome and status',
            },
            {
              path: 'OUTCOME.md',
              content: slice.outcome,
            },
            {
              path: 'CONSTRAINTS.md',
              content: slice.constraints.map((c, i) => `${i + 1}. ${c.content}`).join('\n'),
            },
            {
              path: 'ACCEPTANCE_CRITERIA.md',
              content: slice.acceptanceCriteria
                .map((ac) => `- [${ac.isCompleted ? 'x' : ' '}] ${ac.content}`)
                .join('\n'),
            },
            {
              path: 'metadata.json',
              content: JSON.stringify({ id: slice.id, shortId: slice.shortId, status: slice.status }, null, 2),
            },
          ],
        };

        if (input.includeHistory && slice.transitions) {
          packageStructure.files.push({
            path: 'history/transitions.json',
            content: JSON.stringify(slice.transitions, null, 2),
          });
        }

        if (input.includeContext) {
          packageStructure.files.push({
            path: 'context/',
            description: 'Folder for linked context nodes (fetch separately)',
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Slice package export plan:\n\nBase path: ${packageStructure.basePath}\n\nFiles to create:\n${packageStructure.files.map((f) => `- ${f.path}`).join('\n')}\n\nDetailed structure:\n${JSON.stringify(packageStructure, null, 2)}`,
            },
          ],
        };
      }

      case 'generate_report': {
        const input = GenerateReportSchema.parse(args);

        // Get analytics data
        const endDate = input.dateRange?.end || new Date().toISOString().split('T')[0];
        const startDate = input.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const analytics = await apiCall<{
          totalSessions: number;
          positiveRatings: number;
          negativeRatings: number;
          satisfactionRate: number;
          topContextNodes: { name: string; usageCount: number }[];
        }>('GET', `/api/v1/workspaces/${config.workspaceId}/analytics?startDate=${startDate}&endDate=${endDate}`);

        const slices = await apiCall<Array<{
          shortId: string;
          name: string;
          status: string;
          outcome: string;
        }>>('GET', `/api/v1/slices?workspaceId=${config.workspaceId}`);

        // Generate report content based on type
        let reportContent = '';

        switch (input.reportType) {
          case 'weekly_summary':
            reportContent = `# Weekly Summary Report\n\n**Period:** ${startDate} to ${endDate}\n\n## AI Session Metrics\n- Total Sessions: ${analytics.totalSessions}\n- Satisfaction Rate: ${(analytics.satisfactionRate * 100).toFixed(1)}%\n- Positive Ratings: ${analytics.positiveRatings}\n- Negative Ratings: ${analytics.negativeRatings}\n\n## Slice Activity\n${slices.map((s) => `- [${s.status}] ${s.shortId}: ${s.name}`).join('\n')}\n\n## Top Context Nodes\n${analytics.topContextNodes?.map((n, i) => `${i + 1}. ${n.name} (${n.usageCount} uses)`).join('\n') || 'No data available'}`;
            break;
          case 'slice_status':
            const byStatus = slices.reduce((acc, s) => {
              acc[s.status] = acc[s.status] || [];
              acc[s.status].push(s);
              return acc;
            }, {} as Record<string, typeof slices>);
            reportContent = `# Slice Status Report\n\n**Generated:** ${new Date().toISOString()}\n\n${Object.entries(byStatus).map(([status, items]) => `## ${status}\n${items.map((s) => `- **${s.shortId}**: ${s.name}\n  ${s.outcome.substring(0, 100)}...`).join('\n\n')}`).join('\n\n')}`;
            break;
          case 'audit_export':
            reportContent = `# Audit Export\n\n**Period:** ${startDate} to ${endDate}\n**Workspace:** ${config.workspaceId}\n**Tenant:** ${config.tenantId}\n\n## Summary\n- Total AI Sessions: ${analytics.totalSessions}\n- Active Slices: ${slices.filter((s) => s.status === 'ACTIVE').length}\n- Completed Slices: ${slices.filter((s) => s.status === 'COMPLETED').length}\n\n## Compliance Notes\n- All sessions tracked with context snapshots\n- Feedback collected for quality assurance\n- Full audit log available via /audit/export endpoint`;
            break;
          default:
            reportContent = `# ${input.reportType} Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify({ analytics, sliceCount: slices.length }, null, 2)}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Report generated for ${input.outputPath}:\n\n${reportContent}`,
            },
          ],
        };
      }

      // ============================================
      // Reactive Context Tools
      // ============================================

      case 'subscribe_context': {
        const input = SubscribeContextSchema.parse(args);

        const subscription = await apiCall<{
          subscriptionId: string;
          websocketUrl: string;
          currentVersion: string;
        }>('POST', `/api/v1/context/subscribe`, {
          clientId: `mcp-${config.workspaceId}-${Date.now()}`,
          product: 'code', // MCP server is typically used by Claude Code
          productVersion: '1.0.0',
          scopes: input.scopes,
          filters: input.filters,
          options: {
            delivery: {
              mode: input.options?.mode || 'realtime',
              batchWindow: input.options?.batchWindow,
            },
            content: {
              includePayload: true,
              deltaOnly: false,
              compress: false,
            },
            reliability: {
              ackRequired: true,
              retryOnFailure: true,
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Subscription created successfully!\n\n` +
                `Subscription ID: ${subscription.subscriptionId}\n` +
                `WebSocket URL: ${subscription.websocketUrl}\n` +
                `Current Version: ${subscription.currentVersion}\n\n` +
                `To receive real-time updates, connect to the WebSocket URL and send:\n` +
                `{ "type": "subscribe", "payload": { "subscriptionId": "${subscription.subscriptionId}" } }`,
            },
          ],
        };
      }

      case 'get_context_updates': {
        const input = GetContextUpdatesSchema.parse(args);

        const updates = await apiCall<{
          events: Array<{
            id: string;
            eventType: string;
            entityType: string;
            entityId: string;
            version: number;
            globalVersion: string;
            payload: unknown;
            timestamp: string;
          }>;
          currentVersion: string;
          hasMore: boolean;
        }>('GET', `/api/v1/context/updates?` + new URLSearchParams({
          ...(input.sinceVersion && { sinceVersion: input.sinceVersion }),
          ...(input.sinceTimestamp && { sinceTimestamp: input.sinceTimestamp }),
          ...(input.graphId && { graphId: input.graphId }),
          ...(input.entityTypes && { entityTypes: input.entityTypes.join(',') }),
          limit: input.limit.toString(),
        }).toString());

        const summary = updates.events.length > 0
          ? `Found ${updates.events.length} updates since version ${input.sinceVersion || 'start'}:\n\n` +
            updates.events.map(e =>
              `- [${e.eventType}] ${e.entityType}/${e.entityId} (v${e.version})`
            ).join('\n')
          : 'No updates since the specified version.';

        return {
          content: [
            {
              type: 'text',
              text: `${summary}\n\nCurrent Version: ${updates.currentVersion}\nHas More: ${updates.hasMore}\n\nFull data:\n${JSON.stringify(updates, null, 2)}`,
            },
          ],
        };
      }

      case 'get_entity_version': {
        const input = GetEntityVersionSchema.parse(args);

        const version = await apiCall<{
          entityType: string;
          entityId: string;
          version: number;
          updatedAt: string;
        }>('GET', `/api/v1/entities/${input.entityType}/${input.entityId}/version`);

        return {
          content: [
            {
              type: 'text',
              text: `Entity: ${input.entityType}/${input.entityId}\nVersion: ${version.version}\nLast Updated: ${version.updatedAt}`,
            },
          ],
        };
      }

      case 'get_entity_history': {
        const input = GetEntityHistorySchema.parse(args);

        const history = await apiCall<Array<{
          version: number;
          changeType: string;
          changedFields: string[];
          actorId: string;
          timestamp: string;
        }>>('GET', `/api/v1/entities/${input.entityType}/${input.entityId}/history?` +
          new URLSearchParams({
            ...(input.fromVersion && { fromVersion: input.fromVersion.toString() }),
            ...(input.toVersion && { toVersion: input.toVersion.toString() }),
            limit: input.limit.toString(),
          }).toString()
        );

        const historyText = history.map(h =>
          `v${h.version} [${h.changeType}] - ${h.changedFields.join(', ')} (${h.timestamp})`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Change history for ${input.entityType}/${input.entityId}:\n\n${historyText || 'No history found.'}`,
            },
          ],
        };
      }

      case 'get_entity_at_version': {
        const input = z.object({
          entityType: z.string(),
          entityId: z.string(),
          version: z.number(),
        }).parse(args);

        const entity = await apiCall<unknown>(
          'GET',
          `/api/v1/entities/${input.entityType}/${input.entityId}/versions/${input.version}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `Entity ${input.entityType}/${input.entityId} at version ${input.version}:\n\n${JSON.stringify(entity, null, 2)}`,
            },
          ],
        };
      }

      case 'diff_entity_versions': {
        const input = z.object({
          entityType: z.string(),
          entityId: z.string(),
          fromVersion: z.number(),
          toVersion: z.number(),
        }).parse(args);

        const diff = await apiCall<{
          fromVersion: number;
          toVersion: number;
          fieldDiffs: Array<{
            field: string;
            from: unknown;
            to: unknown;
            type: 'added' | 'removed' | 'changed';
          }>;
        }>('GET', `/api/v1/entities/${input.entityType}/${input.entityId}/diff?` +
          new URLSearchParams({
            fromVersion: input.fromVersion.toString(),
            toVersion: input.toVersion.toString(),
          }).toString()
        );

        const diffText = diff.fieldDiffs.map(d => {
          switch (d.type) {
            case 'added':
              return `+ ${d.field}: ${JSON.stringify(d.to)}`;
            case 'removed':
              return `- ${d.field}: ${JSON.stringify(d.from)}`;
            case 'changed':
              return `~ ${d.field}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`;
          }
        }).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Diff of ${input.entityType}/${input.entityId} from v${input.fromVersion} to v${input.toVersion}:\n\n${diffText || 'No differences found.'}`,
            },
          ],
        };
      }

      case 'unsubscribe_context': {
        const input = z.object({ subscriptionId: z.string() }).parse(args);

        await apiCall<{ success: boolean }>(
          'DELETE',
          `/api/v1/context/subscriptions/${input.subscriptionId}`
        );

        return {
          content: [
            {
              type: 'text',
              text: `Successfully unsubscribed from ${input.subscriptionId}`,
            },
          ],
        };
      }

      case 'create_document_from_template': {
        const input = CreateDocumentFromTemplateSchema.parse(args);

        // Compile context for template
        const contextResponse = await apiCall<{ text: string }>(
          'POST',
          `/api/v1/context/compile`,
          { workspaceId: config.workspaceId, tokenBudget: 2000 }
        );

        let template = '';
        const vars = input.variables || {};

        switch (input.templateType) {
          case 'adr':
            template = `# ADR-XXX: ${vars.title || '[Title]'}

**Status:** ${vars.status || 'Proposed'}
**Date:** ${new Date().toISOString().split('T')[0]}
**Deciders:** ${vars.deciders || '[Team]'}
**Categories:** ${vars.categories || '[Categories]'}

## Context

${vars.context || '[Describe the context and problem]'}

### Options Considered

#### Option A: ${vars.optionA || '[Option A]'}

**Pros:**
-

**Cons:**
-

#### Option B: ${vars.optionB || '[Option B]'}

**Pros:**
-

**Cons:**
-

## Decision

**We will implement Option [X].**

Rationale:
1.

## Consequences

### Positive

-

### Negative

-

### Mitigations

1.

## References

- `;
            break;

          case 'slice_brief':
            template = `# Slice Brief: ${vars.name || '[Slice Name]'}

## Outcome

${vars.outcome || '[What will this slice accomplish?]'}

## Anti-Scope

${vars.antiScope || '[What is explicitly OUT of scope?]'}

## Constraints

1. ${vars.constraint1 || '[Technical or business constraint]'}
2.
3.

## Acceptance Criteria

- [ ] ${vars.criterion1 || '[Measurable criterion]'}
- [ ]
- [ ]

## Context References

${contextResponse.text.substring(0, 500)}...

## Notes

`;
            break;

          case 'onboarding_guide':
            template = `# Onboarding Guide: ${vars.role || '[Role]'}

Welcome to the team! This guide will help you get started.

## Team Overview

${vars.teamDescription || '[Team description]'}

## Key Systems

${contextResponse.text.substring(0, 1000)}

## Getting Started

### Day 1
- [ ] Set up development environment
- [ ] Review organizational context
- [ ] Meet with buddy

### Week 1
- [ ] Complete codebase walkthrough
- [ ] Shadow team members
- [ ] Pick up first slice

## Key Contacts

- Manager: ${vars.manager || '[Name]'}
- Buddy: ${vars.buddy || '[Name]'}

## Resources

- Context Platform: [Claude Context URL]
- Documentation: [Wiki URL]
`;
            break;

          case 'meeting_agenda':
            template = `# Meeting: ${vars.title || '[Meeting Title]'}

**Date:** ${vars.date || new Date().toISOString().split('T')[0]}
**Attendees:** ${vars.attendees || '[Names]'}
**Duration:** ${vars.duration || '30 min'}

## Objectives

1. ${vars.objective1 || '[Primary objective]'}
2.
3.

## Agenda

| Time | Topic | Owner |
|------|-------|-------|
| 5 min | Opening & context | ${vars.facilitator || '[Facilitator]'} |
| 15 min | Main discussion | |
| 5 min | Action items | |
| 5 min | Wrap-up | |

## Pre-read Materials

${contextResponse.text.substring(0, 300)}...

## Notes

[To be filled during meeting]

## Action Items

- [ ]
`;
            break;

          default:
            template = `# ${input.templateType}\n\nGenerated: ${new Date().toISOString()}\n\nVariables: ${JSON.stringify(vars, null, 2)}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Document template for ${input.outputPath}:\n\n${template}`,
            },
          ],
        };
      }

      // ============================================
      // Living Software Platform Tools
      // ============================================

      case 'assemble_context': {
        const input = AssembleContextSchema.parse(args);

        const assembled = await apiCall<{
          context: string;
          sources: Array<{ id: string; type: string; name: string; relevanceScore: number }>;
          relevanceScores: Array<{ nodeId: string; totalScore: number }>;
          tokenBudget: { total: { used: number; allocated: number } };
        }>('POST', `/api/v1/context/assembly`, {
          query: input.query,
          projectId: input.projectId,
          maxTokens: input.maxTokens,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Assembled context (${assembled.tokenBudget.total.used}/${assembled.tokenBudget.total.allocated} tokens):\n\n` +
                `Sources: ${assembled.sources.map(s => `${s.name} (${Math.round(s.relevanceScore * 100)}%)`).join(', ')}\n\n` +
                assembled.context,
            },
          ],
        };
      }

      case 'update_identity': {
        const input = UpdateIdentitySchema.parse(args);

        const attribute = await apiCall<{
          key: string;
          value: string;
          category: string;
          confidence: number;
        }>('PUT', `/api/v1/context/identity/attributes/${input.key}`, {
          value: input.value,
          category: input.category || 'preference',
          confidence: input.confidence || 0.8,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Identity attribute updated:\n\nKey: ${attribute.key}\nValue: ${attribute.value}\nCategory: ${attribute.category}\nConfidence: ${Math.round(attribute.confidence * 100)}%`,
            },
          ],
        };
      }

      case 'add_project_goal': {
        const input = AddProjectGoalSchema.parse(args);

        const goal = await apiCall<{
          id: string;
          description: string;
          priority: string;
          status: string;
        }>('POST', `/api/v1/context/projects/${input.projectId}/goals`, {
          description: input.description,
          priority: input.priority,
          parentGoalId: input.parentGoalId,
          successCriteria: input.successCriteria,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Goal added to project:\n\nID: ${goal.id}\nDescription: ${goal.description}\nPriority: ${goal.priority}\nStatus: ${goal.status}`,
            },
          ],
        };
      }

      case 'record_decision': {
        const input = RecordProjectDecisionSchema.parse(args);

        const decision = await apiCall<{
          id: string;
          description: string;
          rationale: string;
          madeAt: string;
        }>('POST', `/api/v1/context/projects/${input.projectId}/decisions`, {
          description: input.description,
          rationale: input.rationale,
          alternatives: input.alternatives,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Decision recorded:\n\nID: ${decision.id}\nDescription: ${decision.description}\nRationale: ${decision.rationale}\nMade at: ${decision.madeAt}`,
            },
          ],
        };
      }

      case 'add_project_constraint': {
        const input = AddProjectConstraintSchema.parse(args);

        const constraint = await apiCall<{
          id: string;
          description: string;
          category: string;
          severity: string;
        }>('POST', `/api/v1/context/projects/${input.projectId}/constraints`, {
          description: input.description,
          category: input.category,
          severity: input.severity,
          rationale: input.rationale,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Constraint added:\n\nID: ${constraint.id}\nDescription: ${constraint.description}\nCategory: ${constraint.category}\nSeverity: ${constraint.severity}`,
            },
          ],
        };
      }

      case 'create_intent_graph': {
        const input = CreateIntentGraphSchema.parse(args);

        const graph = await apiCall<{
          id: string;
          name: string;
          status: string;
          version: number;
        }>('POST', `/api/v1/intent-graphs`, {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Intent graph created:\n\nID: ${graph.id}\nName: ${graph.name}\nStatus: ${graph.status}\nVersion: ${graph.version}`,
            },
          ],
        };
      }

      case 'add_intent_goal': {
        const input = AddIntentGoalSchema.parse(args);

        const goal = await apiCall<{
          id: string;
          description: string;
          priority: string;
        }>('POST', `/api/v1/intent-graphs/${input.graphId}/goals`, {
          description: input.description,
          priority: input.priority,
          successCriteria: input.successCriteria,
          parentId: input.parentId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Intent goal added:\n\nID: ${goal.id}\nDescription: ${goal.description}\nPriority: ${goal.priority}`,
            },
          ],
        };
      }

      case 'add_intent_entity': {
        const input = AddIntentEntitySchema.parse(args);

        const entity = await apiCall<{
          id: string;
          name: string;
          description: string;
          attributes: Array<{ name: string; type: string }>;
        }>('POST', `/api/v1/intent-graphs/${input.graphId}/entities`, {
          name: input.name,
          description: input.description,
          attributes: input.attributes,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Intent entity added:\n\nID: ${entity.id}\nName: ${entity.name}\nDescription: ${entity.description}\nAttributes: ${entity.attributes.map(a => `${a.name}: ${a.type}`).join(', ')}`,
            },
          ],
        };
      }

      case 'create_artifact': {
        const input = CreateArtifactSchema.parse(args);

        const artifact = await apiCall<{
          id: string;
          name: string;
          type: string;
          status: string;
          currentVersion: number;
        }>('POST', `/api/v1/artifacts`, {
          projectId: input.projectId,
          intentGraphId: input.intentGraphId,
          name: input.name,
          description: input.description,
          type: input.type,
          content: input.content,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Artifact created:\n\nID: ${artifact.id}\nName: ${artifact.name}\nType: ${artifact.type}\nStatus: ${artifact.status}\nVersion: ${artifact.currentVersion}`,
            },
          ],
        };
      }

      case 'propose_artifact_evolution': {
        const input = ProposeArtifactEvolutionSchema.parse(args);

        const proposal = await apiCall<{
          artifactId: string;
          changedIntentNodes: string[];
          proposedChanges: string;
          impactAnalysis: string;
        } | { message: string }>('POST', `/api/v1/artifacts/${input.artifactId}/propose-evolution`, {
          changedIntentNodeIds: input.changedIntentNodeIds,
        });

        if ('message' in proposal) {
          return {
            content: [
              {
                type: 'text',
                text: proposal.message,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Evolution proposal for artifact ${proposal.artifactId}:\n\n` +
                `Changed Intent Nodes: ${proposal.changedIntentNodes.join(', ')}\n\n` +
                `Proposed Changes:\n${proposal.proposedChanges}\n\n` +
                `Impact Analysis:\n${proposal.impactAnalysis}`,
            },
          ],
        };
      }

      // ============================================
      // Codebase Observation Tool Handlers
      // ============================================

      case 'list_repositories': {
        const input = ListRepositoriesSchema.parse(args);
        const params = new URLSearchParams();
        if (input.status) params.append('status', input.status);
        if (input.provider) params.append('provider', input.provider);
        if (input.search) params.append('search', input.search);
        if (input.limit) params.append('limit', input.limit.toString());

        const repos = await apiCall<unknown>('GET', `/api/v1/repositories?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      }

      case 'create_repository': {
        const input = CreateRepositorySchema.parse(args);
        const repo = await apiCall<unknown>('POST', `/api/v1/repositories`, {
          name: input.name,
          url: input.url,
          description: input.description,
          provider: input.provider,
          defaultBranch: input.defaultBranch,
          authType: input.authType,
          authConfig: input.authToken ? { token: input.authToken } : undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: `Repository created: ${JSON.stringify(repo, null, 2)}`,
            },
          ],
        };
      }

      case 'get_repository_files': {
        const input = GetRepositoryFilesSchema.parse(args);
        const params = new URLSearchParams();
        if (input.path) params.append('path', input.path);
        if (input.extension) params.append('extension', input.extension);
        if (input.language) params.append('language', input.language);
        if (input.limit) params.append('limit', input.limit.toString());

        const files = await apiCall<unknown>('GET', `/api/v1/repositories/${input.repoId}/files?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case 'get_file_dependencies': {
        const input = GetFileDependenciesSchema.parse(args);
        const deps = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/files/${input.fileId}/dependencies?depth=${input.depth || 3}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deps, null, 2),
            },
          ],
        };
      }

      case 'get_recent_changes': {
        const input = GetRecentChangesSchema.parse(args);
        const params = new URLSearchParams();
        if (input.branch) params.append('branch', input.branch);
        if (input.author) params.append('author', input.author);
        if (input.since) params.append('since', input.since);
        if (input.limit) params.append('limit', input.limit.toString());

        const commits = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/commits?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(commits, null, 2),
            },
          ],
        };
      }

      case 'analyze_hotspots': {
        const input = AnalyzeHotspotsSchema.parse(args);
        const hotspots = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/hotspots?days=${input.days || 30}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(hotspots, null, 2),
            },
          ],
        };
      }

      case 'sync_repository': {
        const input = SyncRepositorySchema.parse(args);
        const job = await apiCall<unknown>('POST', `/api/v1/repositories/${input.repoId}/sync`);
        return {
          content: [
            {
              type: 'text',
              text: `Sync started: ${JSON.stringify(job, null, 2)}`,
            },
          ],
        };
      }

      case 'get_repository_stats': {
        const input = z.object({ repoId: z.string() }).parse(args);
        const stats = await apiCall<unknown>('GET', `/api/v1/repositories/${input.repoId}/stats`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case 'search_code_symbols': {
        const input = SearchCodeSymbolsSchema.parse(args);
        const params = new URLSearchParams();
        params.append('query', input.query);
        if (input.symbolType) params.append('symbolType', input.symbolType);
        if (input.limit) params.append('limit', input.limit.toString());

        // Note: This endpoint would need to be implemented for full symbol search
        // For now, we search files by name pattern as a basic implementation
        const files = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/files?path=${encodeURIComponent(input.query)}&limit=${input.limit || 20}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case 'get_capability_code': {
        const input = GetCapabilityCodeSchema.parse(args);
        // This would link capabilities to code files via SymbolCapabilityLink
        // For now, return a placeholder
        return {
          content: [
            {
              type: 'text',
              text: `Capability code mapping not yet implemented. Capability: ${input.capabilityId}`,
            },
          ],
        };
      }

      case 'get_call_graph': {
        const input = GetCallGraphSchema.parse(args);
        let endpoint = `/api/v1/repositories/${input.repoId}/symbols/call-graph`;
        const params = new URLSearchParams();
        if (input.symbolId) params.append('symbolId', input.symbolId);
        if (input.fileId) params.append('fileId', input.fileId);
        if (input.direction) params.append('direction', input.direction);
        if (input.depth) params.append('depth', input.depth.toString());

        const graph = await apiCall<unknown>(
          'GET',
          `${endpoint}?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(graph, null, 2),
            },
          ],
        };
      }

      // Symbol Analysis Tool Handlers (Phase 2)
      case 'get_symbol_details': {
        const input = GetSymbolDetailsSchema.parse(args);
        const symbol = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/symbols/${input.symbolId}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(symbol, null, 2),
            },
          ],
        };
      }

      case 'get_symbol_references': {
        const input = GetSymbolReferencesSchema.parse(args);
        const params = new URLSearchParams();
        if (input.direction) params.append('direction', input.direction);
        if (input.referenceType) params.append('referenceType', input.referenceType);
        if (input.limit) params.append('limit', input.limit.toString());

        const refs = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/symbols/${input.symbolId}/references?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(refs, null, 2),
            },
          ],
        };
      }

      case 'get_complexity_report': {
        const input = GetComplexityReportSchema.parse(args);
        const params = new URLSearchParams();
        if (input.fileId) params.append('fileId', input.fileId);
        if (input.minComplexity) params.append('minComplexity', input.minComplexity.toString());
        if (input.limit) params.append('limit', input.limit.toString());

        const report = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/symbols/complexity?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      }

      case 'analyze_symbols': {
        const input = AnalyzeSymbolsSchema.parse(args);
        const result = await apiCall<unknown>(
          'POST',
          `/api/v1/repositories/${input.repoId}/symbols/analyze`,
          { fileIds: input.fileIds }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'find_symbol_path': {
        const input = FindSymbolPathSchema.parse(args);
        const path = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/symbols/path?source=${input.sourceSymbolId}&target=${input.targetSymbolId}&maxDepth=${input.maxDepth || 10}`
        );
        return {
          content: [
            {
              type: 'text',
              text: path ? JSON.stringify(path, null, 2) : 'No path found between the symbols.',
            },
          ],
        };
      }

      case 'detect_cycles': {
        const input = DetectCyclesSchema.parse(args);
        const params = new URLSearchParams();
        if (input.startSymbolId) params.append('startSymbolId', input.startSymbolId);

        const cycles = await apiCall<unknown>(
          'GET',
          `/api/v1/repositories/${input.repoId}/symbols/cycles?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cycles, null, 2),
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
        // ============================================
        // CoWork-specific prompts (Tier 3)
        // ============================================
        {
          name: 'prepare_meeting',
          description: 'Compile relevant context and create meeting preparation documents',
          arguments: [
            {
              name: 'topic',
              description: 'Meeting topic or agenda',
              required: true,
            },
            {
              name: 'participants',
              description: 'List of participants',
              required: false,
            },
            {
              name: 'outputFolder',
              description: 'Folder to save meeting materials',
              required: true,
            },
          ],
        },
        {
          name: 'onboard_team_member',
          description: 'Generate onboarding documentation package for a new team member',
          arguments: [
            {
              name: 'role',
              description: 'Role of the new team member',
              required: true,
            },
            {
              name: 'team',
              description: 'Team they are joining',
              required: true,
            },
            {
              name: 'outputFolder',
              description: 'Folder to save onboarding materials',
              required: true,
            },
          ],
        },
        {
          name: 'audit_preparation',
          description: 'Export and organize all compliance-relevant documentation for audits',
          arguments: [
            {
              name: 'auditType',
              description: 'Type of audit (soc2, gdpr, hipaa, or custom)',
              required: true,
            },
            {
              name: 'outputFolder',
              description: 'Folder to save audit materials',
              required: true,
            },
          ],
        },
        {
          name: 'weekly_digest',
          description: 'Generate a weekly summary of context changes, slice progress, and team activity',
          arguments: [
            {
              name: 'outputFolder',
              description: 'Folder to save the digest',
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

      // ============================================
      // CoWork-specific prompts (Tier 3)
      // ============================================

      case 'prepare_meeting': {
        const topic = args?.topic;
        const participants = args?.participants || 'team members';
        const outputFolder = args?.outputFolder;

        if (!topic || !outputFolder) {
          throw new Error('topic and outputFolder are required');
        }

        return {
          description: `Preparing meeting materials for: ${topic}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I need to prepare materials for an upcoming meeting.

## Meeting Details
- **Topic:** ${topic}
- **Participants:** ${participants}
- **Output Folder:** ${outputFolder}

## Organizational Context
<context>
${context}
</context>

Please help me prepare for this meeting by:

1. **Create a meeting agenda** (${outputFolder}/agenda.md)
   - Include relevant context from our organizational knowledge
   - Suggest discussion points based on the topic
   - Allocate time for each item

2. **Compile relevant context** (${outputFolder}/context/)
   - Export related decisions and patterns
   - Include any relevant slice information
   - Add background documents participants should review

3. **Create a pre-read summary** (${outputFolder}/pre-read.md)
   - Summarize key points participants need to know
   - Highlight any decisions that need to be made
   - List open questions

4. **Prepare a notes template** (${outputFolder}/notes.md)
   - Structure for capturing discussion points
   - Action item tracking section
   - Decision log

Please generate these materials with content appropriate for the meeting topic and participants.`,
              },
            },
          ],
        };
      }

      case 'onboard_team_member': {
        const role = args?.role;
        const team = args?.team;
        const outputFolder = args?.outputFolder;

        if (!role || !team || !outputFolder) {
          throw new Error('role, team, and outputFolder are required');
        }

        return {
          description: `Creating onboarding package for ${role} on ${team}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I need to create an onboarding documentation package for a new team member.

## New Hire Details
- **Role:** ${role}
- **Team:** ${team}
- **Output Folder:** ${outputFolder}

## Organizational Context
<context>
${context}
</context>

Please create a comprehensive onboarding package:

1. **Welcome Guide** (${outputFolder}/welcome.md)
   - Team overview and mission
   - Key contacts and communication channels
   - First week checklist

2. **Technical Overview** (${outputFolder}/technical/)
   - Architecture decisions relevant to their role
   - Key patterns and conventions they need to know
   - Development environment setup guide

3. **Context Export** (${outputFolder}/context/)
   - Export organizational context relevant to their role
   - Include key decisions they should understand
   - Add patterns they'll work with frequently

4. **Learning Path** (${outputFolder}/learning-path.md)
   - Suggested order for reviewing documentation
   - Key slices to study for examples
   - Recommended pairing sessions

5. **Quick Reference** (${outputFolder}/quick-reference.md)
   - Common commands and workflows
   - Links to important resources
   - FAQ for common questions

Please tailor all materials to be appropriate for a ${role} joining the ${team} team.`,
              },
            },
          ],
        };
      }

      case 'audit_preparation': {
        const auditType = args?.auditType;
        const outputFolder = args?.outputFolder;

        if (!auditType || !outputFolder) {
          throw new Error('auditType and outputFolder are required');
        }

        const auditRequirements: Record<string, string> = {
          soc2: 'SOC 2 Type II - Security, Availability, Confidentiality',
          gdpr: 'GDPR - Data Protection and Privacy',
          hipaa: 'HIPAA - Health Information Privacy',
          custom: 'Custom Audit Requirements',
        };

        return {
          description: `Preparing ${auditType.toUpperCase()} audit documentation`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I need to prepare documentation for an upcoming compliance audit.

## Audit Details
- **Type:** ${auditRequirements[auditType] || auditType}
- **Output Folder:** ${outputFolder}

## Organizational Context
<context>
${context}
</context>

Please prepare a comprehensive audit documentation package:

1. **Executive Summary** (${outputFolder}/executive-summary.md)
   - Overview of compliance posture
   - Key controls and measures in place
   - Summary of evidence collected

2. **Architecture Decisions** (${outputFolder}/decisions/)
   - Export all ADRs related to security and compliance
   - Include data handling decisions
   - Document access control decisions

3. **Security Controls** (${outputFolder}/security/)
   - Authentication and authorization documentation
   - Data encryption practices
   - Access logging and monitoring

4. **Audit Trail Export** (${outputFolder}/audit-logs/)
   - Export relevant audit logs
   - Include access patterns
   - Document any incidents and resolutions

5. **Data Handling** (${outputFolder}/data-handling/)
   - Data flow documentation
   - Retention policies
   - Privacy controls

6. **Compliance Checklist** (${outputFolder}/checklist.md)
   - ${auditType.toUpperCase()} specific requirements
   - Evidence mapping for each requirement
   - Status of each control

Please organize all materials according to ${auditType.toUpperCase()} audit requirements and ensure all sensitive information is properly redacted.`,
              },
            },
          ],
        };
      }

      case 'weekly_digest': {
        const outputFolder = args?.outputFolder;

        if (!outputFolder) {
          throw new Error('outputFolder is required');
        }

        // Get current date info for the digest
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
          description: 'Generating weekly digest',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please generate a weekly digest of team activity and context changes.

## Digest Period
- **Start:** ${weekStart.toISOString().split('T')[0]}
- **End:** ${now.toISOString().split('T')[0]}
- **Output Folder:** ${outputFolder}

## Organizational Context
<context>
${context}
</context>

Please create the following digest materials:

1. **Weekly Summary** (${outputFolder}/weekly-summary.md)
   - Highlight key accomplishments
   - List slices completed or transitioned
   - Note any important decisions made

2. **Context Changes** (${outputFolder}/context-changes.md)
   - New context nodes added
   - Updated documentation
   - Deprecated or archived content

3. **Slice Progress** (${outputFolder}/slice-progress.md)
   - Status of active slices
   - Upcoming work
   - Blocked items needing attention

4. **AI Usage Analytics** (${outputFolder}/ai-analytics.md)
   - Session statistics
   - Feedback summary
   - Context effectiveness metrics

5. **Team Highlights** (${outputFolder}/highlights.md)
   - Notable achievements
   - Learning opportunities
   - Recognition for team members

6. **Next Week Preview** (${outputFolder}/next-week.md)
   - Planned work
   - Key meetings or milestones
   - Focus areas

Please compile this digest using the available data and context.`,
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
