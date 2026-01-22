/**
 * @prompt-id forge-v4.1:service:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import {
  type GraphId,
  type NodeId,
  type WorkspaceId,
  type TenantId,
  type ContextGraph,
  type ContextNode,
  type CompiledContext,
  type CompileContextOptions,
  type CompiledContextSection,
  type RelevantDocument,
  type SearchContextOptions,
  type CreateContextNodeRequest,
  type UpdateContextNodeRequest,
  type PaginationOptions,
  type PaginatedResult,
  ContextLayer,
  Freshness,
} from '../types';
import {
  GraphNotFoundError,
  NodeNotFoundError,
  NoContextAvailableError,
} from '../errors';
import { countTokens } from '../utils/tokens';

const CACHE_TTL = 300; // 5 minutes
const MAX_SEMANTIC_RESULTS = 50;

export class ContextService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // CONTEXT GRAPH OPERATIONS
  // ============================================================================

  async getGraph(graphId: GraphId, tenantId: TenantId): Promise<ContextGraph> {
    const graph = await this.prisma.contextGraph.findFirst({
      where: { id: graphId, tenantId },
    });

    if (!graph) {
      throw new GraphNotFoundError(graphId);
    }

    return graph as unknown as ContextGraph;
  }

  async listGraphs(
    workspaceId: WorkspaceId,
    tenantId: TenantId,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<ContextGraph>> {
    const { limit = 20, offset = 0 } = options;

    const [data, total] = await Promise.all([
      this.prisma.contextGraph.findMany({
        where: { workspaceId, tenantId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contextGraph.count({
        where: { workspaceId, tenantId },
      }),
    ]);

    return {
      data: data as unknown as ContextGraph[],
      total,
      limit,
      offset,
    };
  }

  async createGraph(
    workspaceId: WorkspaceId,
    tenantId: TenantId,
    data: { name: string; description?: string; isDefault?: boolean }
  ): Promise<ContextGraph> {
    const graph = await this.prisma.contextGraph.create({
      data: {
        workspaceId,
        tenantId,
        name: data.name,
        description: data.description,
        isDefault: data.isDefault ?? false,
      },
    });

    return graph as unknown as ContextGraph;
  }

  // ============================================================================
  // CONTEXT NODE OPERATIONS
  // ============================================================================

  async getNode(nodeId: NodeId, tenantId: TenantId): Promise<ContextNode> {
    const node = await this.prisma.contextNode.findFirst({
      where: { id: nodeId, tenantId },
    });

    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    return node as unknown as ContextNode;
  }

  async listNodes(
    graphId: GraphId,
    tenantId: TenantId,
    options: PaginationOptions & {
      type?: string;
      layer?: string;
      freshness?: string;
    } = {}
  ): Promise<PaginatedResult<ContextNode>> {
    const { limit = 20, offset = 0, type, layer, freshness } = options;

    const where = {
      graphId,
      tenantId,
      ...(type && { type: type as any }),
      ...(layer && { layer: layer as any }),
      ...(freshness && { freshness: freshness as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.contextNode.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contextNode.count({ where }),
    ]);

    return {
      data: data as unknown as ContextNode[],
      total,
      limit,
      offset,
    };
  }

  async createNode(
    tenantId: TenantId,
    request: CreateContextNodeRequest
  ): Promise<ContextNode> {
    const tokenCount = request.content ? countTokens(request.content) : 0;

    const node = await this.prisma.contextNode.create({
      data: {
        tenantId,
        graphId: request.graphId,
        type: request.type as any,
        layer: request.layer as any,
        name: request.name,
        content: request.content,
        metadata: (request.metadata ?? {}) as any,
        externalUrl: request.externalUrl,
        tokenCount,
        freshness: Freshness.CURRENT as any,
      },
    });

    // Invalidate cache
    await this.invalidateGraphCache(request.graphId);

    return node as unknown as ContextNode;
  }

  async updateNode(
    nodeId: NodeId,
    tenantId: TenantId,
    request: UpdateContextNodeRequest
  ): Promise<ContextNode> {
    const existing = await this.getNode(nodeId, tenantId);

    const tokenCount = request.content
      ? countTokens(request.content)
      : existing.tokenCount;

    const node = await this.prisma.contextNode.update({
      where: { id: nodeId },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.content !== undefined && { content: request.content }),
        ...(request.metadata && { metadata: request.metadata as any }),
        ...(request.freshness && { freshness: request.freshness as any }),
        tokenCount,
        updatedAt: new Date(),
      },
    });

    await this.invalidateGraphCache(existing.graphId);

    return node as unknown as ContextNode;
  }

  async deleteNode(nodeId: NodeId, tenantId: TenantId): Promise<void> {
    const node = await this.getNode(nodeId, tenantId);

    await this.prisma.contextNode.delete({
      where: { id: nodeId },
    });

    await this.invalidateGraphCache(node.graphId);
  }

  // ============================================================================
  // SEMANTIC SEARCH
  // ============================================================================

  async searchNodes(
    tenantId: TenantId,
    options: SearchContextOptions
  ): Promise<RelevantDocument[]> {
    const { graphId, query, limit = 20, filters } = options;

    // Generate embedding for query (placeholder - would call embedding service)
    const queryEmbedding = await this.generateEmbedding(query);

    // Build filter conditions
    const typeFilter = filters?.types?.length
      ? `AND type = ANY(ARRAY['${filters.types.join("','")}']::context_node_type[])`
      : '';
    const layerFilter = filters?.layers?.length
      ? `AND layer = ANY(ARRAY['${filters.layers.join("','")}']::context_layer[])`
      : '';
    const freshnessFilter = filters?.freshness?.length
      ? `AND freshness = ANY(ARRAY['${filters.freshness.join("','")}']::freshness[])`
      : '';

    // Semantic search using pgvector
    const results = await this.prisma.$queryRaw<
      Array<{ id: string; similarity: number }>
    >`
      SELECT
        id,
        1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
      FROM context_nodes
      WHERE graph_id = ${graphId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND freshness != 'ARCHIVED'
        AND embedding IS NOT NULL
        ${this.prisma.$queryRawUnsafe(typeFilter)}
        ${this.prisma.$queryRawUnsafe(layerFilter)}
        ${this.prisma.$queryRawUnsafe(freshnessFilter)}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${Math.min(limit, MAX_SEMANTIC_RESULTS)}
    `;

    // Fetch full node data
    const nodeIds = results.map((r) => r.id);
    const nodes = await this.prisma.contextNode.findMany({
      where: { id: { in: nodeIds } },
    });

    // Combine with similarity scores
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return results
      .map((r) => ({
        node: nodeMap.get(r.id) as unknown as ContextNode,
        similarity: r.similarity,
      }))
      .filter((r) => r.node !== undefined);
  }

  // ============================================================================
  // CONTEXT COMPILATION
  // ============================================================================

  async compile(
    tenantId: TenantId,
    options: CompileContextOptions
  ): Promise<CompiledContext> {
    const { workspaceId, sliceId, query, tokenBudget } = options;

    // Get default graph for workspace
    const graph = await this.prisma.contextGraph.findFirst({
      where: { workspaceId, tenantId, isDefault: true },
    });

    if (!graph) {
      throw new NoContextAvailableError(workspaceId);
    }

    const sections: CompiledContextSection[] = [];
    let remainingBudget = tokenBudget;

    // 1. Organizational context (always included)
    const orgNodes = await this.getNodesByLayer(
      graph.id as GraphId,
      tenantId,
      ContextLayer.ORGANIZATIONAL
    );
    const orgSection = this.buildSection(
      ContextLayer.ORGANIZATIONAL,
      orgNodes,
      Math.floor(remainingBudget * 0.2) // 20% budget for org context
    );
    sections.push(orgSection);
    remainingBudget -= orgSection.tokenCount;

    // 2. Slice context (if slice provided)
    if (sliceId) {
      const sliceNodes = await this.getSliceContextNodes(sliceId, tenantId);
      const sliceSection = this.buildSection(
        ContextLayer.SLICE,
        sliceNodes,
        Math.floor(remainingBudget * 0.4) // 40% budget for slice context
      );
      sections.push(sliceSection);
      remainingBudget -= sliceSection.tokenCount;
    }

    // 3. Workspace context (semantic search if query provided)
    let workspaceNodes: ContextNode[];
    if (query) {
      const searchResults = await this.searchNodes(tenantId, {
        graphId: graph.id as GraphId,
        query,
        limit: 30,
        filters: { layers: [ContextLayer.WORKSPACE] },
      });
      workspaceNodes = searchResults.map((r) => r.node);
    } else {
      workspaceNodes = await this.getNodesByLayer(
        graph.id as GraphId,
        tenantId,
        ContextLayer.WORKSPACE
      );
    }

    const workspaceSection = this.buildSection(
      ContextLayer.WORKSPACE,
      workspaceNodes,
      remainingBudget
    );
    sections.push(workspaceSection);

    // Build compiled text
    const compiledText = this.formatCompiledContext(sections);
    const totalTokens = sections.reduce((sum, s) => sum + s.tokenCount, 0);

    return {
      compiledText,
      sections,
      totalTokens,
      budgetUtilization: totalTokens / tokenBudget,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getNodesByLayer(
    graphId: GraphId,
    tenantId: TenantId,
    layer: ContextLayer
  ): Promise<ContextNode[]> {
    const nodes = await this.prisma.contextNode.findMany({
      where: {
        graphId,
        tenantId,
        layer,
        freshness: { not: Freshness.ARCHIVED },
      },
      orderBy: { tokenCount: 'asc' },
    });

    return nodes as unknown as ContextNode[];
  }

  private async getSliceContextNodes(
    sliceId: string,
    tenantId: TenantId
  ): Promise<ContextNode[]> {
    const sliceContext = await this.prisma.sliceContext.findMany({
      where: {
        sliceId,
        slice: { tenantId },
      },
      include: { node: true },
      orderBy: { isPinned: 'desc' },
    });

    return sliceContext.map((sc) => sc.node) as unknown as ContextNode[];
  }

  private buildSection(
    layer: ContextLayer,
    nodes: ContextNode[],
    budgetLimit: number
  ): CompiledContextSection {
    const includedNodes: ContextNode[] = [];
    let currentTokens = 0;

    for (const node of nodes) {
      if (currentTokens + node.tokenCount <= budgetLimit) {
        includedNodes.push(node);
        currentTokens += node.tokenCount;
      }
    }

    const content = includedNodes
      .map((n) => `## ${n.name}\n\n${n.content || ''}`)
      .join('\n\n---\n\n');

    return {
      layer,
      content,
      tokenCount: currentTokens,
      documentIds: includedNodes.map((n) => n.id),
    };
  }

  private formatCompiledContext(sections: CompiledContextSection[]): string {
    const layerTitles: Record<ContextLayer, string> = {
      [ContextLayer.ORGANIZATIONAL]: 'ORGANIZATIONAL CONTEXT',
      [ContextLayer.WORKSPACE]: 'WORKSPACE CONTEXT',
      [ContextLayer.SLICE]: 'SLICE CONTEXT',
    };

    return sections
      .filter((s) => s.content.trim().length > 0)
      .map((s) => `[${layerTitles[s.layer]}]\n\n${s.content}`)
      .join('\n\n' + '='.repeat(60) + '\n\n');
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - would call OpenAI or other embedding service
    // Returns a 1536-dimensional vector
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }

  private async invalidateGraphCache(graphId: GraphId): Promise<void> {
    const pattern = `context:graph:${graphId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
