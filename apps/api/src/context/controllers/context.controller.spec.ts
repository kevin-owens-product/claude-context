/**
 * @prompt-id forge-v4.1:test:api:context-controller:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContextController } from './context.controller';
import {
  ContextService,
  GraphNotFoundError,
  NodeNotFoundError,
  type TenantId,
  type GraphId,
  type NodeId,
  type WorkspaceId,
  ContextNodeType,
  ContextLayer,
  Freshness,
} from '@forge/context';

describe('ContextController', () => {
  let controller: ContextController;
  let contextService: jest.Mocked<ContextService>;

  const mockTenantId = 'tenant-123' as TenantId;
  const mockWorkspaceId = 'workspace-456' as WorkspaceId;
  const mockGraphId = 'graph-789' as GraphId;
  const mockNodeId = 'node-abc' as NodeId;

  const mockGraph = {
    id: mockGraphId,
    tenantId: mockTenantId,
    workspaceId: mockWorkspaceId,
    name: 'Test Graph',
    description: 'A test graph',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNode = {
    id: mockNodeId,
    tenantId: mockTenantId,
    graphId: mockGraphId,
    type: ContextNodeType.DOCUMENT,
    layer: ContextLayer.WORKSPACE,
    name: 'Test Node',
    content: 'Test content',
    metadata: {},
    freshness: Freshness.CURRENT,
    tokenCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockContextService = {
      getGraph: jest.fn(),
      listGraphs: jest.fn(),
      createGraph: jest.fn(),
      getNode: jest.fn(),
      listNodes: jest.fn(),
      createNode: jest.fn(),
      updateNode: jest.fn(),
      deleteNode: jest.fn(),
      searchNodes: jest.fn(),
      compile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextController],
      providers: [
        {
          provide: ContextService,
          useValue: mockContextService,
        },
      ],
    }).compile();

    controller = module.get<ContextController>(ContextController);
    contextService = module.get(ContextService);
  });

  describe('Graph Operations', () => {
    describe('listGraphs', () => {
      it('should return paginated list of graphs', async () => {
        const mockResult = {
          data: [mockGraph],
          total: 1,
          limit: 20,
          offset: 0,
        };
        contextService.listGraphs.mockResolvedValue(mockResult);

        const result = await controller.listGraphs(
          mockTenantId,
          { workspaceId: mockWorkspaceId, limit: 20, offset: 0 },
        );

        expect(result).toEqual(mockResult);
        expect(contextService.listGraphs).toHaveBeenCalledWith(
          mockWorkspaceId,
          mockTenantId,
          { workspaceId: mockWorkspaceId, limit: 20, offset: 0 },
        );
      });
    });

    describe('getGraph', () => {
      it('should return a graph by ID', async () => {
        contextService.getGraph.mockResolvedValue(mockGraph);

        const result = await controller.getGraph(mockTenantId, mockGraphId);

        expect(result).toEqual(mockGraph);
        expect(contextService.getGraph).toHaveBeenCalledWith(
          mockGraphId,
          mockTenantId,
        );
      });

      it('should throw NotFoundException when graph not found', async () => {
        contextService.getGraph.mockRejectedValue(
          new GraphNotFoundError(mockGraphId),
        );

        await expect(
          controller.getGraph(mockTenantId, mockGraphId),
        ).rejects.toThrow(GraphNotFoundError);
      });
    });

    describe('createGraph', () => {
      it('should create a new graph', async () => {
        const createDto = {
          workspaceId: mockWorkspaceId,
          name: 'New Graph',
          description: 'A new graph',
          isDefault: false,
        };
        contextService.createGraph.mockResolvedValue({
          ...mockGraph,
          ...createDto,
        });

        const result = await controller.createGraph(
          mockTenantId,
          createDto,
        );

        expect(result.name).toBe(createDto.name);
        expect(contextService.createGraph).toHaveBeenCalledWith(
          mockWorkspaceId,
          mockTenantId,
          createDto,
        );
      });
    });
  });

  describe('Node Operations', () => {
    describe('listNodes', () => {
      it('should return paginated list of nodes', async () => {
        const mockResult = {
          data: [mockNode],
          total: 1,
          limit: 20,
          offset: 0,
        };
        contextService.listNodes.mockResolvedValue(mockResult);

        const result = await controller.listNodes(mockTenantId, mockGraphId, {
          limit: 20,
          offset: 0,
        });

        expect(result).toEqual(mockResult);
        expect(contextService.listNodes).toHaveBeenCalledWith(
          mockGraphId,
          mockTenantId,
          { limit: 20, offset: 0 },
        );
      });

      it('should filter nodes by type and layer', async () => {
        const mockResult = {
          data: [mockNode],
          total: 1,
          limit: 20,
          offset: 0,
        };
        contextService.listNodes.mockResolvedValue(mockResult);

        await controller.listNodes(mockTenantId, mockGraphId, {
          limit: 20,
          offset: 0,
          type: ContextNodeType.DOCUMENT,
          layer: ContextLayer.WORKSPACE,
        });

        expect(contextService.listNodes).toHaveBeenCalledWith(
          mockGraphId,
          mockTenantId,
          {
            limit: 20,
            offset: 0,
            type: ContextNodeType.DOCUMENT,
            layer: ContextLayer.WORKSPACE,
          },
        );
      });
    });

    describe('getNode', () => {
      it('should return a node by ID', async () => {
        contextService.getNode.mockResolvedValue(mockNode);

        const result = await controller.getNode(mockTenantId, mockNodeId);

        expect(result).toEqual(mockNode);
        expect(contextService.getNode).toHaveBeenCalledWith(
          mockNodeId,
          mockTenantId,
        );
      });

      it('should throw when node not found', async () => {
        contextService.getNode.mockRejectedValue(
          new NodeNotFoundError(mockNodeId),
        );

        await expect(
          controller.getNode(mockTenantId, mockNodeId),
        ).rejects.toThrow(NodeNotFoundError);
      });
    });

    describe('createNode', () => {
      it('should create a new node', async () => {
        const createDto = {
          graphId: mockGraphId,
          type: ContextNodeType.DOCUMENT,
          layer: ContextLayer.WORKSPACE,
          name: 'New Node',
          content: 'Node content',
        };
        contextService.createNode.mockResolvedValue({
          ...mockNode,
          ...createDto,
        });

        const result = await controller.createNode(mockTenantId, createDto);

        expect(result.name).toBe(createDto.name);
        expect(contextService.createNode).toHaveBeenCalledWith(mockTenantId, {
          graphId: mockGraphId,
          type: createDto.type,
          layer: createDto.layer,
          name: createDto.name,
          content: createDto.content,
          metadata: undefined,
          externalUrl: undefined,
        });
      });
    });

    describe('updateNode', () => {
      it('should update an existing node', async () => {
        const updateDto = {
          name: 'Updated Node',
          content: 'Updated content',
        };
        contextService.updateNode.mockResolvedValue({
          ...mockNode,
          ...updateDto,
        });

        const result = await controller.updateNode(
          mockTenantId,
          mockNodeId,
          updateDto,
        );

        expect(result.name).toBe(updateDto.name);
        expect(contextService.updateNode).toHaveBeenCalledWith(
          mockNodeId,
          mockTenantId,
          updateDto,
        );
      });
    });

    describe('deleteNode', () => {
      it('should delete a node', async () => {
        contextService.deleteNode.mockResolvedValue(undefined);

        await controller.deleteNode(mockTenantId, mockNodeId);

        expect(contextService.deleteNode).toHaveBeenCalledWith(
          mockNodeId,
          mockTenantId,
        );
      });
    });
  });

  describe('Search Operations', () => {
    describe('searchNodes', () => {
      it('should search nodes semantically', async () => {
        const searchResults = [
          { node: mockNode, similarity: 0.95 },
        ];
        contextService.searchNodes.mockResolvedValue(searchResults);

        const searchDto = {
          graphId: mockGraphId,
          query: 'test query',
          limit: 10,
        };
        const result = await controller.searchNodes(mockTenantId, searchDto);

        expect(result).toHaveLength(1);
        expect(result[0].similarity).toBe(0.95);
        expect(contextService.searchNodes).toHaveBeenCalledWith(mockTenantId, {
          graphId: mockGraphId,
          query: 'test query',
          limit: 10,
          filters: undefined,
        });
      });

      it('should search with filters', async () => {
        const searchResults = [{ node: mockNode, similarity: 0.85 }];
        contextService.searchNodes.mockResolvedValue(searchResults);

        const searchDto = {
          graphId: mockGraphId,
          query: 'test query',
          limit: 10,
          filters: {
            types: [ContextNodeType.DOCUMENT],
            layers: [ContextLayer.WORKSPACE],
          },
        };
        await controller.searchNodes(mockTenantId, searchDto);

        expect(contextService.searchNodes).toHaveBeenCalledWith(mockTenantId, {
          graphId: mockGraphId,
          query: 'test query',
          limit: 10,
          filters: searchDto.filters,
        });
      });
    });
  });

  describe('Compilation Operations', () => {
    describe('compile', () => {
      it('should compile context with token budget', async () => {
        const compiledResult = {
          compiledText: 'Compiled context text',
          sections: [
            {
              layer: ContextLayer.ORGANIZATIONAL,
              content: 'Org content',
              tokenCount: 500,
              documentIds: [mockNodeId],
            },
          ],
          totalTokens: 500,
          budgetUtilization: 0.0625,
        };
        contextService.compile.mockResolvedValue(compiledResult);

        const compileDto = {
          workspaceId: mockWorkspaceId,
          tokenBudget: 8000,
        };
        const result = await controller.compile(mockTenantId, compileDto);

        expect(result.compiledText).toBe('Compiled context text');
        expect(result.totalTokens).toBe(500);
        expect(contextService.compile).toHaveBeenCalledWith(mockTenantId, {
          workspaceId: mockWorkspaceId,
          sliceId: undefined,
          query: undefined,
          tokenBudget: 8000,
        });
      });

      it('should compile context with slice and query', async () => {
        const compiledResult = {
          compiledText: 'Slice-specific context',
          sections: [],
          totalTokens: 1000,
          budgetUtilization: 0.125,
        };
        contextService.compile.mockResolvedValue(compiledResult);

        const compileDto = {
          workspaceId: mockWorkspaceId,
          sliceId: 'slice-123',
          query: 'feature implementation',
          tokenBudget: 8000,
        };
        await controller.compile(mockTenantId, compileDto);

        expect(contextService.compile).toHaveBeenCalledWith(mockTenantId, {
          workspaceId: mockWorkspaceId,
          sliceId: 'slice-123',
          query: 'feature implementation',
          tokenBudget: 8000,
        });
      });
    });
  });
});
