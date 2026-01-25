/**
 * Call Graph Service - Build and query call graphs from symbol references
 * @prompt-id forge-v4.1:service:call-graph:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import {
  SymbolKind,
  ReferenceType,
  GraphType,
} from '../types/codebase.types';
import type {
  RepositoryId,
  CodeSymbolId,
  CodeFileId,
  CallGraphNode,
  CallGraphData,
  CallGraphMetrics,
  ExternalCallInfo,
  CachedDependencyGraph,
} from '../types/codebase.types';

// ============================================================================
// TYPES
// ============================================================================

export interface CallGraphOptions {
  maxDepth?: number;
  includeExternal?: boolean;
  filterKinds?: SymbolKind[];
  direction?: 'outgoing' | 'incoming' | 'both';
}

export interface CallGraphEdge {
  sourceSymbolId: CodeSymbolId;
  targetSymbolId: CodeSymbolId;
  sourceName: string;
  targetName: string;
  sourceFile: string;
  targetFile: string;
  referenceType: ReferenceType;
  callCount: number;
}

export interface SymbolNode {
  id: CodeSymbolId;
  name: string;
  kind: SymbolKind;
  filePath: string;
  fileId: CodeFileId;
  complexity: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class CallGraphService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  /**
   * Build a call graph starting from a specific symbol
   */
  async buildCallGraph(
    repositoryId: RepositoryId,
    symbolId: CodeSymbolId,
    options: CallGraphOptions = {}
  ): Promise<CallGraphData> {
    const {
      maxDepth = 5,
      includeExternal = true,
      filterKinds,
      direction = 'outgoing',
    } = options;

    // Check cache first
    const cacheKey = `callgraph:${repositoryId}:${symbolId}:${direction}:${maxDepth}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get the root symbol
    const rootSymbol = await this.prisma.codeSymbol.findUnique({
      where: { id: symbolId },
      include: { file: true },
    });

    if (!rootSymbol) {
      throw new Error('Symbol not found');
    }

    // Build the graph
    const visited = new Set<string>();
    const externalCalls = new Map<string, ExternalCallInfo>();

    const rootNode = await this.buildNode(
      rootSymbol,
      0,
      maxDepth,
      visited,
      externalCalls,
      direction,
      filterKinds,
      includeExternal
    );

    // Compute metrics
    const allNodes = this.flattenNodes(rootNode);
    const metrics = this.computeMetrics(rootNode, allNodes);

    const result: CallGraphData = {
      root: rootNode,
      totalNodes: allNodes.length,
      maxDepth: this.getMaxDepth(rootNode),
      externalCalls: Array.from(externalCalls.values()),
      metrics,
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  /**
   * Build call graph for an entire file
   */
  async buildFileCallGraph(
    repositoryId: RepositoryId,
    fileId: CodeFileId,
    options: CallGraphOptions = {}
  ): Promise<CallGraphData[]> {
    // Get all top-level symbols in the file
    const symbols = await this.prisma.codeSymbol.findMany({
      where: {
        fileId,
        parentSymbolId: null,
        deletedAt: null,
        kind: {
          in: ['FUNCTION', 'CLASS', 'METHOD'],
        },
      },
    });

    const graphs: CallGraphData[] = [];
    for (const symbol of symbols) {
      const graph = await this.buildCallGraph(
        repositoryId,
        symbol.id as CodeSymbolId,
        options
      );
      graphs.push(graph);
    }

    return graphs;
  }

  /**
   * Get all callers of a symbol (incoming references)
   */
  async getCallers(
    repositoryId: RepositoryId,
    symbolId: CodeSymbolId,
    depth: number = 1
  ): Promise<CallGraphNode[]> {
    const graph = await this.buildCallGraph(repositoryId, symbolId, {
      maxDepth: depth,
      direction: 'incoming',
    });
    return graph.root.children;
  }

  /**
   * Get all callees of a symbol (outgoing calls)
   */
  async getCallees(
    repositoryId: RepositoryId,
    symbolId: CodeSymbolId,
    depth: number = 1
  ): Promise<CallGraphNode[]> {
    const graph = await this.buildCallGraph(repositoryId, symbolId, {
      maxDepth: depth,
      direction: 'outgoing',
    });
    return graph.root.children;
  }

  /**
   * Get all edges (calls) between symbols
   */
  async getCallEdges(
    repositoryId: RepositoryId,
    options?: {
      sourceFileId?: CodeFileId;
      targetFileId?: CodeFileId;
      referenceType?: ReferenceType;
      limit?: number;
    }
  ): Promise<CallGraphEdge[]> {
    const where: Record<string, unknown> = {
      repositoryId,
      targetSymbolId: { not: null },
    };

    if (options?.sourceFileId) {
      where.sourceFileId = options.sourceFileId;
    }
    if (options?.targetFileId) {
      where.targetFileId = options.targetFileId;
    }
    if (options?.referenceType) {
      where.referenceType = options.referenceType;
    }

    const references = await this.prisma.symbolReference.findMany({
      where,
      take: options?.limit || 1000,
      include: {
        sourceSymbol: {
          include: { file: true },
        },
        targetSymbol: {
          include: { file: true },
        },
      },
    });

    // Group by source-target pair and count
    const edgeMap = new Map<string, CallGraphEdge>();

    for (const ref of references) {
      if (!ref.targetSymbol) continue;

      const key = `${ref.sourceSymbolId}:${ref.targetSymbolId}`;
      const existing = edgeMap.get(key);

      if (existing) {
        existing.callCount++;
      } else {
        edgeMap.set(key, {
          sourceSymbolId: ref.sourceSymbolId as CodeSymbolId,
          targetSymbolId: ref.targetSymbolId as CodeSymbolId,
          sourceName: ref.sourceSymbol.name,
          targetName: ref.targetSymbol.name,
          sourceFile: ref.sourceSymbol.file.path,
          targetFile: ref.targetSymbol.file.path,
          referenceType: ref.referenceType as ReferenceType,
          callCount: 1,
        });
      }
    }

    return Array.from(edgeMap.values());
  }

  /**
   * Find shortest path between two symbols
   */
  async findPath(
    repositoryId: RepositoryId,
    sourceSymbolId: CodeSymbolId,
    targetSymbolId: CodeSymbolId,
    maxDepth: number = 10
  ): Promise<SymbolNode[] | null> {
    // BFS to find shortest path
    const queue: Array<{ symbolId: string; path: SymbolNode[] }> = [];
    const visited = new Set<string>();

    const sourceSymbol = await this.prisma.codeSymbol.findUnique({
      where: { id: sourceSymbolId },
      include: { file: true },
    });

    if (!sourceSymbol) return null;

    queue.push({
      symbolId: sourceSymbolId,
      path: [this.toSymbolNode(sourceSymbol)],
    });
    visited.add(sourceSymbolId);

    while (queue.length > 0) {
      const { symbolId, path } = queue.shift()!;

      if (path.length > maxDepth) continue;

      // Get outgoing references
      const refs = await this.prisma.symbolReference.findMany({
        where: {
          sourceSymbolId: symbolId,
          targetSymbolId: { not: null },
        },
        include: {
          targetSymbol: {
            include: { file: true },
          },
        },
      });

      for (const ref of refs) {
        if (!ref.targetSymbol || visited.has(ref.targetSymbolId!)) continue;

        const targetNode = this.toSymbolNode(ref.targetSymbol);

        if (ref.targetSymbolId === targetSymbolId) {
          return [...path, targetNode];
        }

        visited.add(ref.targetSymbolId!);
        queue.push({
          symbolId: ref.targetSymbolId!,
          path: [...path, targetNode],
        });
      }
    }

    return null;
  }

  /**
   * Detect circular dependencies in the call graph
   */
  async detectCycles(
    repositoryId: RepositoryId,
    startSymbolId?: CodeSymbolId
  ): Promise<Array<SymbolNode[]>> {
    const cycles: Array<SymbolNode[]> = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: SymbolNode[] = [];

    const symbols = startSymbolId
      ? [await this.prisma.codeSymbol.findUnique({
          where: { id: startSymbolId },
          include: { file: true },
        })]
      : await this.prisma.codeSymbol.findMany({
          where: {
            repositoryId,
            deletedAt: null,
            kind: { in: ['FUNCTION', 'METHOD', 'CLASS'] },
          },
          include: { file: true },
        });

    for (const symbol of symbols) {
      if (symbol && !visited.has(symbol.id)) {
        await this.detectCyclesDFS(
          symbol.id,
          visited,
          recursionStack,
          path,
          cycles
        );
      }
    }

    return cycles;
  }

  /**
   * Cache a computed call graph
   */
  async cacheCallGraph(
    repositoryId: RepositoryId,
    symbolId: CodeSymbolId,
    graphData: CallGraphData,
    commitSha: string
  ): Promise<void> {
    await this.prisma.dependencyGraph.upsert({
      where: {
        repositoryId_graphType_rootId: {
          repositoryId,
          graphType: 'SYMBOL_CALLS',
          rootId: symbolId,
        },
      },
      create: {
        repositoryId,
        graphType: 'SYMBOL_CALLS',
        rootId: symbolId,
        graphData: graphData as any,
        nodeCount: graphData.totalNodes,
        edgeCount: this.countEdges(graphData.root),
        maxDepth: graphData.maxDepth,
        commitSha,
        computedAt: new Date(),
      },
      update: {
        graphData: graphData as any,
        nodeCount: graphData.totalNodes,
        edgeCount: this.countEdges(graphData.root),
        maxDepth: graphData.maxDepth,
        commitSha,
        computedAt: new Date(),
        isStale: false,
      },
    });
  }

  /**
   * Get cached call graph
   */
  async getCachedCallGraph(
    repositoryId: RepositoryId,
    symbolId: CodeSymbolId
  ): Promise<CachedDependencyGraph | null> {
    const cached = await this.prisma.dependencyGraph.findUnique({
      where: {
        repositoryId_graphType_rootId: {
          repositoryId,
          graphType: 'SYMBOL_CALLS',
          rootId: symbolId,
        },
      },
    });

    if (!cached || cached.isStale) return null;

    return cached as any;
  }

  /**
   * Mark cached graphs as stale
   */
  async invalidateGraphs(repositoryId: RepositoryId): Promise<void> {
    await this.prisma.dependencyGraph.updateMany({
      where: { repositoryId },
      data: { isStale: true },
    });

    // Also clear Redis cache
    const pattern = `callgraph:${repositoryId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async buildNode(
    symbol: any,
    depth: number,
    maxDepth: number,
    visited: Set<string>,
    externalCalls: Map<string, ExternalCallInfo>,
    direction: 'outgoing' | 'incoming' | 'both',
    filterKinds?: SymbolKind[],
    includeExternal: boolean = true
  ): Promise<CallGraphNode> {
    visited.add(symbol.id);

    const node: CallGraphNode = {
      symbolId: symbol.id as CodeSymbolId,
      name: symbol.name,
      kind: symbol.kind as SymbolKind,
      filePath: symbol.file.path,
      fileId: symbol.fileId as CodeFileId,
      depth,
      complexity: symbol.cyclomaticComplexity,
      callCount: 0,
      children: [],
    };

    if (depth >= maxDepth) {
      return node;
    }

    // Get references based on direction
    const references = await this.getReferences(symbol.id, direction);

    for (const ref of references) {
      // Handle external calls
      if (ref.isExternal && includeExternal) {
        const pkg = ref.externalPackage || 'unknown';
        const key = `${pkg}:${ref.targetName}`;
        const existing = externalCalls.get(key);

        if (existing) {
          existing.callCount++;
          if (!existing.calledFrom.includes(symbol.file.path)) {
            existing.calledFrom.push(symbol.file.path);
          }
        } else {
          externalCalls.set(key, {
            package: pkg,
            symbol: ref.targetName,
            callCount: 1,
            calledFrom: [symbol.file.path],
          });
        }
        continue;
      }

      // Get target symbol
      const targetSymbol = direction === 'incoming'
        ? ref.sourceSymbol
        : ref.targetSymbol;

      if (!targetSymbol || visited.has(targetSymbol.id)) {
        continue;
      }

      // Filter by kind
      if (filterKinds && !filterKinds.includes(targetSymbol.kind as SymbolKind)) {
        continue;
      }

      // Recursively build child node
      const childNode = await this.buildNode(
        targetSymbol,
        depth + 1,
        maxDepth,
        visited,
        externalCalls,
        direction,
        filterKinds,
        includeExternal
      );

      childNode.callCount = 1; // Could aggregate if same symbol called multiple times
      node.children.push(childNode);
    }

    return node;
  }

  private async getReferences(
    symbolId: string,
    direction: 'outgoing' | 'incoming' | 'both'
  ): Promise<any[]> {
    const conditions: any[] = [];

    if (direction === 'outgoing' || direction === 'both') {
      conditions.push({ sourceSymbolId: symbolId });
    }
    if (direction === 'incoming' || direction === 'both') {
      conditions.push({ targetSymbolId: symbolId });
    }

    return this.prisma.symbolReference.findMany({
      where: {
        OR: conditions,
        referenceType: { in: ['CALL', 'INSTANTIATION'] },
      },
      include: {
        sourceSymbol: {
          include: { file: true },
        },
        targetSymbol: {
          include: { file: true },
        },
      },
    });
  }

  private async detectCyclesDFS(
    symbolId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: SymbolNode[],
    cycles: Array<SymbolNode[]>
  ): Promise<void> {
    visited.add(symbolId);
    recursionStack.add(symbolId);

    const symbol = await this.prisma.codeSymbol.findUnique({
      where: { id: symbolId },
      include: { file: true },
    });

    if (!symbol) return;

    path.push(this.toSymbolNode(symbol));

    const refs = await this.prisma.symbolReference.findMany({
      where: {
        sourceSymbolId: symbolId,
        targetSymbolId: { not: null },
        referenceType: { in: ['CALL', 'INSTANTIATION'] },
      },
    });

    for (const ref of refs) {
      if (!ref.targetSymbolId) continue;

      if (!visited.has(ref.targetSymbolId)) {
        await this.detectCyclesDFS(
          ref.targetSymbolId,
          visited,
          recursionStack,
          path,
          cycles
        );
      } else if (recursionStack.has(ref.targetSymbolId)) {
        // Found a cycle
        const cycleStart = path.findIndex((n) => n.id === ref.targetSymbolId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart)]);
        }
      }
    }

    path.pop();
    recursionStack.delete(symbolId);
  }

  private toSymbolNode(symbol: any): SymbolNode {
    return {
      id: symbol.id as CodeSymbolId,
      name: symbol.name,
      kind: symbol.kind as SymbolKind,
      filePath: symbol.file.path,
      fileId: symbol.fileId as CodeFileId,
      complexity: symbol.cyclomaticComplexity,
    };
  }

  private flattenNodes(node: CallGraphNode): CallGraphNode[] {
    const result: CallGraphNode[] = [node];
    for (const child of node.children) {
      result.push(...this.flattenNodes(child));
    }
    return result;
  }

  private getMaxDepth(node: CallGraphNode): number {
    if (node.children.length === 0) {
      return node.depth;
    }
    return Math.max(...node.children.map((c) => this.getMaxDepth(c)));
  }

  private countEdges(node: CallGraphNode): number {
    let count = node.children.length;
    for (const child of node.children) {
      count += this.countEdges(child);
    }
    return count;
  }

  private computeMetrics(
    root: CallGraphNode,
    allNodes: CallGraphNode[]
  ): CallGraphMetrics {
    if (allNodes.length === 0) {
      return {
        avgFanOut: 0,
        avgFanIn: 0,
        maxFanOut: 0,
        maxFanIn: 0,
        couplingScore: 0,
      };
    }

    // Fan-out: number of children
    const fanOuts = allNodes.map((n) => n.children.length);
    const avgFanOut = fanOuts.reduce((a, b) => a + b, 0) / fanOuts.length;
    const maxFanOut = Math.max(...fanOuts);

    // Fan-in: how many times each node appears as a child
    const fanInMap = new Map<string, number>();
    for (const node of allNodes) {
      for (const child of node.children) {
        fanInMap.set(child.symbolId, (fanInMap.get(child.symbolId) || 0) + 1);
      }
    }
    const fanIns = Array.from(fanInMap.values());
    const avgFanIn = fanIns.length > 0
      ? fanIns.reduce((a, b) => a + b, 0) / fanIns.length
      : 0;
    const maxFanIn = fanIns.length > 0 ? Math.max(...fanIns) : 0;

    // Coupling score: based on connections / possible connections
    const totalEdges = this.countEdges(root);
    const possibleEdges = allNodes.length * (allNodes.length - 1);
    const couplingScore = possibleEdges > 0
      ? Math.round((totalEdges / possibleEdges) * 100)
      : 0;

    return {
      avgFanOut: Math.round(avgFanOut * 100) / 100,
      avgFanIn: Math.round(avgFanIn * 100) / 100,
      maxFanOut,
      maxFanIn,
      couplingScore: Math.min(100, couplingScore),
    };
  }
}
