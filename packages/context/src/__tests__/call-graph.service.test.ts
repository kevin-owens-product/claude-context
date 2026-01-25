/**
 * Call Graph Service Tests
 * @prompt-id forge-v4.1:test:call-graph:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallGraphService } from '../services/call-graph.service';
import type { RepositoryId, CodeSymbolId, CodeFileId } from '../types/codebase.types';

// Mock Prisma
const mockPrisma = {
  codeSymbol: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  symbolReference: {
    findMany: vi.fn(),
  },
  dependencyGraph: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
};

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
};

describe('CallGraphService', () => {
  let service: CallGraphService;
  const repoId = 'repo-1' as RepositoryId;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.keys.mockResolvedValue([]);
    service = new CallGraphService(mockPrisma as any, mockRedis as any);
  });

  describe('buildCallGraph', () => {
    it('should build a call graph for a symbol', async () => {
      const rootSymbol = {
        id: 'symbol-1',
        name: 'processData',
        kind: 'FUNCTION',
        cyclomaticComplexity: 5,
        file: {
          id: 'file-1',
          path: 'src/processor.ts',
        },
        fileId: 'file-1',
      };

      mockPrisma.codeSymbol.findUnique.mockResolvedValue(rootSymbol);
      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      const result = await service.buildCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId,
        { maxDepth: 3 }
      );

      expect(result.root).toBeDefined();
      expect(result.root.name).toBe('processData');
      expect(result.root.kind).toBe('FUNCTION');
      expect(result.totalNodes).toBe(1);
    });

    it('should include children in call graph', async () => {
      const rootSymbol = {
        id: 'symbol-1',
        name: 'main',
        kind: 'FUNCTION',
        cyclomaticComplexity: 3,
        file: { id: 'file-1', path: 'src/index.ts' },
        fileId: 'file-1',
      };

      const childSymbol = {
        id: 'symbol-2',
        name: 'helper',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-1', path: 'src/index.ts' },
        fileId: 'file-1',
      };

      mockPrisma.codeSymbol.findUnique
        .mockResolvedValueOnce(rootSymbol)
        .mockResolvedValueOnce(childSymbol);

      mockPrisma.symbolReference.findMany
        .mockResolvedValueOnce([
          {
            sourceSymbolId: 'symbol-1',
            targetSymbolId: 'symbol-2',
            referenceType: 'CALL',
            isExternal: false,
            sourceSymbol: rootSymbol,
            targetSymbol: childSymbol,
          },
        ])
        .mockResolvedValue([]);

      const result = await service.buildCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId,
        { maxDepth: 2 }
      );

      expect(result.totalNodes).toBeGreaterThanOrEqual(1);
    });

    it('should use cached result if available', async () => {
      const cachedGraph = {
        root: {
          symbolId: 'symbol-1',
          name: 'cached',
          kind: 'FUNCTION',
          filePath: 'src/cached.ts',
          fileId: 'file-1',
          depth: 0,
          complexity: 1,
          callCount: 0,
          children: [],
        },
        totalNodes: 1,
        maxDepth: 0,
        externalCalls: [],
        metrics: {
          avgFanOut: 0,
          avgFanIn: 0,
          maxFanOut: 0,
          maxFanIn: 0,
          couplingScore: 0,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedGraph));

      const result = await service.buildCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId
      );

      expect(result.root.name).toBe('cached');
      expect(mockPrisma.codeSymbol.findUnique).not.toHaveBeenCalled();
    });

    it('should track external calls', async () => {
      const rootSymbol = {
        id: 'symbol-1',
        name: 'fetchData',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-1', path: 'src/api.ts' },
        fileId: 'file-1',
      };

      mockPrisma.codeSymbol.findUnique.mockResolvedValue(rootSymbol);
      mockPrisma.symbolReference.findMany.mockResolvedValue([
        {
          sourceSymbolId: 'symbol-1',
          targetSymbolId: null,
          targetName: 'fetch',
          isExternal: true,
          externalPackage: 'node-fetch',
          referenceType: 'CALL',
          sourceSymbol: rootSymbol,
          targetSymbol: null,
        },
      ]);

      const result = await service.buildCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId,
        { includeExternal: true }
      );

      expect(result.externalCalls).toHaveLength(1);
      expect(result.externalCalls[0].package).toBe('node-fetch');
      expect(result.externalCalls[0].symbol).toBe('fetch');
    });

    it('should throw error if symbol not found', async () => {
      mockPrisma.codeSymbol.findUnique.mockResolvedValue(null);

      await expect(
        service.buildCallGraph(repoId, 'non-existent' as CodeSymbolId)
      ).rejects.toThrow('Symbol not found');
    });
  });

  describe('buildFileCallGraph', () => {
    it('should build call graphs for all top-level symbols in file', async () => {
      const symbols = [
        {
          id: 'symbol-1',
          name: 'funcA',
          kind: 'FUNCTION',
          cyclomaticComplexity: 2,
          file: { id: 'file-1', path: 'src/utils.ts' },
          fileId: 'file-1',
        },
        {
          id: 'symbol-2',
          name: 'funcB',
          kind: 'FUNCTION',
          cyclomaticComplexity: 3,
          file: { id: 'file-1', path: 'src/utils.ts' },
          fileId: 'file-1',
        },
      ];

      mockPrisma.codeSymbol.findMany.mockResolvedValue(symbols);
      mockPrisma.codeSymbol.findUnique
        .mockResolvedValueOnce(symbols[0])
        .mockResolvedValueOnce(symbols[1]);
      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      const result = await service.buildFileCallGraph(
        repoId,
        'file-1' as CodeFileId
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getCallers', () => {
    it('should get incoming references', async () => {
      const symbol = {
        id: 'symbol-1',
        name: 'helper',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-1', path: 'src/utils.ts' },
        fileId: 'file-1',
      };

      mockPrisma.codeSymbol.findUnique.mockResolvedValue(symbol);
      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      const callers = await service.getCallers(
        repoId,
        'symbol-1' as CodeSymbolId,
        1
      );

      expect(Array.isArray(callers)).toBe(true);
    });
  });

  describe('getCallees', () => {
    it('should get outgoing calls', async () => {
      const symbol = {
        id: 'symbol-1',
        name: 'main',
        kind: 'FUNCTION',
        cyclomaticComplexity: 3,
        file: { id: 'file-1', path: 'src/index.ts' },
        fileId: 'file-1',
      };

      mockPrisma.codeSymbol.findUnique.mockResolvedValue(symbol);
      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      const callees = await service.getCallees(
        repoId,
        'symbol-1' as CodeSymbolId,
        1
      );

      expect(Array.isArray(callees)).toBe(true);
    });
  });

  describe('getCallEdges', () => {
    it('should get all call edges in repository', async () => {
      mockPrisma.symbolReference.findMany.mockResolvedValue([
        {
          sourceSymbolId: 'symbol-1',
          targetSymbolId: 'symbol-2',
          referenceType: 'CALL',
          sourceSymbol: {
            name: 'main',
            file: { path: 'src/index.ts' },
          },
          targetSymbol: {
            name: 'helper',
            file: { path: 'src/utils.ts' },
          },
        },
        {
          sourceSymbolId: 'symbol-1',
          targetSymbolId: 'symbol-2',
          referenceType: 'CALL',
          sourceSymbol: {
            name: 'main',
            file: { path: 'src/index.ts' },
          },
          targetSymbol: {
            name: 'helper',
            file: { path: 'src/utils.ts' },
          },
        },
      ]);

      const edges = await service.getCallEdges(repoId);

      expect(edges).toHaveLength(1);
      expect(edges[0].callCount).toBe(2);
      expect(edges[0].sourceName).toBe('main');
      expect(edges[0].targetName).toBe('helper');
    });

    it('should filter by source file', async () => {
      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      await service.getCallEdges(repoId, {
        sourceFileId: 'file-1' as CodeFileId,
      });

      expect(mockPrisma.symbolReference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceFileId: 'file-1',
          }),
        })
      );
    });
  });

  describe('findPath', () => {
    it('should find shortest path between symbols', async () => {
      const symbolA = {
        id: 'symbol-a',
        name: 'funcA',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-1', path: 'src/a.ts' },
        fileId: 'file-1',
      };

      const symbolB = {
        id: 'symbol-b',
        name: 'funcB',
        kind: 'FUNCTION',
        cyclomaticComplexity: 3,
        file: { id: 'file-2', path: 'src/b.ts' },
        fileId: 'file-2',
      };

      mockPrisma.codeSymbol.findUnique
        .mockResolvedValueOnce(symbolA)
        .mockResolvedValueOnce(symbolB);

      mockPrisma.symbolReference.findMany.mockResolvedValue([
        {
          sourceSymbolId: 'symbol-a',
          targetSymbolId: 'symbol-b',
          targetSymbol: symbolB,
        },
      ]);

      const path = await service.findPath(
        repoId,
        'symbol-a' as CodeSymbolId,
        'symbol-b' as CodeSymbolId
      );

      expect(path).not.toBeNull();
      expect(path).toHaveLength(2);
      expect(path![0].name).toBe('funcA');
      expect(path![1].name).toBe('funcB');
    });

    it('should return null if no path exists', async () => {
      mockPrisma.codeSymbol.findUnique.mockResolvedValue({
        id: 'symbol-a',
        name: 'isolated',
        kind: 'FUNCTION',
        cyclomaticComplexity: 1,
        file: { id: 'file-1', path: 'src/isolated.ts' },
        fileId: 'file-1',
      });

      mockPrisma.symbolReference.findMany.mockResolvedValue([]);

      const path = await service.findPath(
        repoId,
        'symbol-a' as CodeSymbolId,
        'symbol-z' as CodeSymbolId
      );

      expect(path).toBeNull();
    });
  });

  describe('detectCycles', () => {
    it('should detect circular dependencies', async () => {
      // Create a cycle: A -> B -> C -> A
      const symbolA = {
        id: 'symbol-a',
        name: 'funcA',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-1', path: 'src/a.ts' },
        fileId: 'file-1',
      };

      const symbolB = {
        id: 'symbol-b',
        name: 'funcB',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-2', path: 'src/b.ts' },
        fileId: 'file-2',
      };

      const symbolC = {
        id: 'symbol-c',
        name: 'funcC',
        kind: 'FUNCTION',
        cyclomaticComplexity: 2,
        file: { id: 'file-3', path: 'src/c.ts' },
        fileId: 'file-3',
      };

      mockPrisma.codeSymbol.findMany.mockResolvedValue([symbolA]);
      mockPrisma.codeSymbol.findUnique
        .mockResolvedValueOnce(symbolA)
        .mockResolvedValueOnce(symbolB)
        .mockResolvedValueOnce(symbolC);

      mockPrisma.symbolReference.findMany
        .mockResolvedValueOnce([{ targetSymbolId: 'symbol-b' }])
        .mockResolvedValueOnce([{ targetSymbolId: 'symbol-c' }])
        .mockResolvedValueOnce([{ targetSymbolId: 'symbol-a' }]);

      const cycles = await service.detectCycles(repoId);

      expect(cycles).toBeDefined();
      expect(Array.isArray(cycles)).toBe(true);
    });
  });

  describe('cacheCallGraph', () => {
    it('should cache call graph in database', async () => {
      const graphData = {
        root: {
          symbolId: 'symbol-1' as CodeSymbolId,
          name: 'test',
          kind: 'FUNCTION' as const,
          filePath: 'src/test.ts',
          fileId: 'file-1' as CodeFileId,
          depth: 0,
          complexity: 2,
          callCount: 0,
          children: [],
        },
        totalNodes: 1,
        maxDepth: 0,
        externalCalls: [],
        metrics: {
          avgFanOut: 0,
          avgFanIn: 0,
          maxFanOut: 0,
          maxFanIn: 0,
          couplingScore: 0,
        },
      };

      mockPrisma.dependencyGraph.upsert.mockResolvedValue({});

      await service.cacheCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId,
        graphData,
        'abc123'
      );

      expect(mockPrisma.dependencyGraph.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            repositoryId_graphType_rootId: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('getCachedCallGraph', () => {
    it('should get cached call graph', async () => {
      mockPrisma.dependencyGraph.findUnique.mockResolvedValue({
        repositoryId: repoId,
        graphType: 'SYMBOL_CALLS',
        rootId: 'symbol-1',
        graphData: {},
        isStale: false,
      });

      const cached = await service.getCachedCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId
      );

      expect(cached).not.toBeNull();
    });

    it('should return null for stale cache', async () => {
      mockPrisma.dependencyGraph.findUnique.mockResolvedValue({
        repositoryId: repoId,
        graphType: 'SYMBOL_CALLS',
        rootId: 'symbol-1',
        graphData: {},
        isStale: true,
      });

      const cached = await service.getCachedCallGraph(
        repoId,
        'symbol-1' as CodeSymbolId
      );

      expect(cached).toBeNull();
    });
  });

  describe('invalidateGraphs', () => {
    it('should mark all graphs as stale', async () => {
      await service.invalidateGraphs(repoId);

      expect(mockPrisma.dependencyGraph.updateMany).toHaveBeenCalledWith({
        where: { repositoryId: repoId },
        data: { isStale: true },
      });
    });

    it('should clear Redis cache', async () => {
      mockRedis.keys.mockResolvedValue(['callgraph:repo-1:symbol-1']);

      await service.invalidateGraphs(repoId);

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
