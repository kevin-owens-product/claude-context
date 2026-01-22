/**
 * @prompt-id forge-v4.1:test:context-service:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextService } from '../services/context.service';
import {
  ContextLayer,
  Freshness,
  type TenantId,
  type GraphId,
  type NodeId,
  type WorkspaceId,
} from '../types';
import {
  GraphNotFoundError,
  NodeNotFoundError,
  NoContextAvailableError,
} from '../errors';

// Mock Prisma client
const mockPrisma = {
  contextGraph: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  contextNode: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  sliceContext: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $queryRawUnsafe: vi.fn().mockImplementation((sql) => sql),
};

// Mock Redis client
const mockRedis = {
  keys: vi.fn(),
  del: vi.fn(),
};

describe('ContextService', () => {
  let service: ContextService;
  const tenantId = 'tenant-1' as TenantId;
  const graphId = 'graph-1' as GraphId;
  const nodeId = 'node-1' as NodeId;
  const workspaceId = 'workspace-1' as WorkspaceId;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContextService(mockPrisma as any, mockRedis as any);
  });

  describe('getGraph', () => {
    it('should return a graph when found', async () => {
      const mockGraph = {
        id: graphId,
        tenantId,
        name: 'Test Graph',
        isDefault: true,
      };

      mockPrisma.contextGraph.findFirst.mockResolvedValue(mockGraph);

      const result = await service.getGraph(graphId, tenantId);

      expect(result).toEqual(mockGraph);
      expect(mockPrisma.contextGraph.findFirst).toHaveBeenCalledWith({
        where: { id: graphId, tenantId },
      });
    });

    it('should throw GraphNotFoundError when graph not found', async () => {
      mockPrisma.contextGraph.findFirst.mockResolvedValue(null);

      await expect(service.getGraph(graphId, tenantId)).rejects.toThrow(
        GraphNotFoundError,
      );
    });
  });

  describe('listGraphs', () => {
    it('should return paginated graphs', async () => {
      const mockGraphs = [
        { id: 'graph-1', name: 'Graph 1' },
        { id: 'graph-2', name: 'Graph 2' },
      ];

      mockPrisma.contextGraph.findMany.mockResolvedValue(mockGraphs);
      mockPrisma.contextGraph.count.mockResolvedValue(10);

      const result = await service.listGraphs(workspaceId, tenantId, {
        limit: 20,
        offset: 0,
      });

      expect(result.data).toEqual(mockGraphs);
      expect(result.total).toBe(10);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('createGraph', () => {
    it('should create a graph', async () => {
      const mockGraph = {
        id: graphId,
        workspaceId,
        tenantId,
        name: 'New Graph',
        isDefault: false,
      };

      mockPrisma.contextGraph.create.mockResolvedValue(mockGraph);

      const result = await service.createGraph(workspaceId, tenantId, {
        name: 'New Graph',
      });

      expect(result.name).toBe('New Graph');
      expect(mockPrisma.contextGraph.create).toHaveBeenCalled();
    });
  });

  describe('getNode', () => {
    it('should return a node when found', async () => {
      const mockNode = {
        id: nodeId,
        tenantId,
        graphId,
        name: 'Test Node',
        layer: ContextLayer.WORKSPACE,
        tokenCount: 100,
      };

      mockPrisma.contextNode.findFirst.mockResolvedValue(mockNode);

      const result = await service.getNode(nodeId, tenantId);

      expect(result).toEqual(mockNode);
    });

    it('should throw NodeNotFoundError when node not found', async () => {
      mockPrisma.contextNode.findFirst.mockResolvedValue(null);

      await expect(service.getNode(nodeId, tenantId)).rejects.toThrow(
        NodeNotFoundError,
      );
    });
  });

  describe('createNode', () => {
    it('should create a node with token count', async () => {
      const mockNode = {
        id: nodeId,
        graphId,
        tenantId,
        name: 'Test Node',
        content: 'This is test content for token counting.',
        layer: ContextLayer.WORKSPACE,
        freshness: Freshness.CURRENT,
        tokenCount: 10,
      };

      mockPrisma.contextNode.create.mockResolvedValue(mockNode);
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.createNode(tenantId, {
        graphId,
        type: 'DOCUMENT' as any,
        layer: ContextLayer.WORKSPACE,
        name: 'Test Node',
        content: 'This is test content for token counting.',
      });

      expect(result.name).toBe('Test Node');
      expect(mockPrisma.contextNode.create).toHaveBeenCalled();
    });

    it('should invalidate graph cache on create', async () => {
      mockPrisma.contextNode.create.mockResolvedValue({
        id: nodeId,
        graphId,
      });
      mockRedis.keys.mockResolvedValue(['context:graph:graph-1:key1']);
      mockRedis.del.mockResolvedValue(1);

      await service.createNode(tenantId, {
        graphId,
        type: 'DOCUMENT' as any,
        layer: ContextLayer.WORKSPACE,
        name: 'Test',
      });

      expect(mockRedis.keys).toHaveBeenCalledWith(`context:graph:${graphId}:*`);
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('updateNode', () => {
    it('should update a node and recalculate tokens', async () => {
      const existingNode = {
        id: nodeId,
        graphId,
        tenantId,
        tokenCount: 50,
      };

      const updatedNode = {
        ...existingNode,
        name: 'Updated Name',
        tokenCount: 100,
      };

      mockPrisma.contextNode.findFirst.mockResolvedValue(existingNode);
      mockPrisma.contextNode.update.mockResolvedValue(updatedNode);
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.updateNode(nodeId, tenantId, {
        name: 'Updated Name',
        content: 'New content for updated token count calculation.',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.contextNode.update).toHaveBeenCalled();
    });
  });

  describe('deleteNode', () => {
    it('should delete a node', async () => {
      const mockNode = { id: nodeId, graphId, tenantId };

      mockPrisma.contextNode.findFirst.mockResolvedValue(mockNode);
      mockPrisma.contextNode.delete.mockResolvedValue(mockNode);
      mockRedis.keys.mockResolvedValue([]);

      await service.deleteNode(nodeId, tenantId);

      expect(mockPrisma.contextNode.delete).toHaveBeenCalledWith({
        where: { id: nodeId },
      });
    });
  });

  describe('compile', () => {
    it('should compile context within token budget', async () => {
      const mockGraph = {
        id: graphId,
        isDefault: true,
      };

      const mockOrgNodes = [
        {
          id: 'org-1',
          name: 'Org Doc',
          content: 'Org content',
          layer: ContextLayer.ORGANIZATIONAL,
          tokenCount: 100,
          freshness: Freshness.CURRENT,
        },
      ];

      const mockWorkspaceNodes = [
        {
          id: 'ws-1',
          name: 'Workspace Doc',
          content: 'Workspace content',
          layer: ContextLayer.WORKSPACE,
          tokenCount: 200,
          freshness: Freshness.CURRENT,
        },
      ];

      mockPrisma.contextGraph.findFirst.mockResolvedValue(mockGraph);
      mockPrisma.contextNode.findMany
        .mockResolvedValueOnce(mockOrgNodes)
        .mockResolvedValueOnce(mockWorkspaceNodes);

      const result = await service.compile(tenantId, {
        workspaceId,
        tokenBudget: 8000,
      });

      expect(result.sections).toHaveLength(2);
      expect(result.totalTokens).toBeLessThanOrEqual(8000);
      expect(result.budgetUtilization).toBeLessThanOrEqual(1);
    });

    it('should throw NoContextAvailableError when no default graph', async () => {
      mockPrisma.contextGraph.findFirst.mockResolvedValue(null);

      await expect(
        service.compile(tenantId, {
          workspaceId,
          tokenBudget: 8000,
        }),
      ).rejects.toThrow(NoContextAvailableError);
    });

    it('should include slice context when sliceId provided', async () => {
      const mockGraph = { id: graphId, isDefault: true };
      const mockSliceNodes = [
        {
          id: 'slice-1',
          name: 'Slice Doc',
          content: 'Slice content',
          tokenCount: 150,
        },
      ];

      mockPrisma.contextGraph.findFirst.mockResolvedValue(mockGraph);
      mockPrisma.contextNode.findMany.mockResolvedValue([]);
      mockPrisma.sliceContext.findMany.mockResolvedValue(
        mockSliceNodes.map((n) => ({ node: n })),
      );

      const result = await service.compile(tenantId, {
        workspaceId,
        sliceId: 'slice-1',
        tokenBudget: 8000,
      });

      expect(result.sections.some((s) => s.layer === ContextLayer.SLICE)).toBe(true);
    });
  });
});
