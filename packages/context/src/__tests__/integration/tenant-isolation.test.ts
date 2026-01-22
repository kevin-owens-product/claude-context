/**
 * @prompt-id forge-v4.1:test:integration:tenant-isolation:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { ContextService } from '../../services/context.service';
import { SliceService } from '../../services/slice.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  type TenantId,
  type UserId,
  type WorkspaceId,
  type GraphId,
  type NodeId,
  type SliceId,
  type SessionId,
  ContextLayer,
  SliceStatus,
  FeedbackRating,
} from '../../types';
import {
  GraphNotFoundError,
  NodeNotFoundError,
  SliceNotFoundError,
  SessionNotFoundError,
} from '../../errors';

/**
 * Integration tests for multi-tenant isolation.
 * These tests verify that data from one tenant cannot be accessed by another tenant.
 *
 * In production, these tests would run against a real database with proper
 * Row Level Security (RLS) policies. For this test suite, we mock the Prisma
 * client to simulate RLS behavior.
 */

// Tenant identifiers
const TENANT_A = 'tenant-a' as TenantId;
const TENANT_B = 'tenant-b' as TenantId;

// User identifiers
const USER_A1 = 'user-a1' as UserId;
const USER_B1 = 'user-b1' as UserId;

// Workspace identifiers
const WORKSPACE_A1 = 'workspace-a1' as WorkspaceId;
const WORKSPACE_B1 = 'workspace-b1' as WorkspaceId;

// Storage for simulating database with tenant isolation
const mockDatabase: {
  graphs: Map<string, { id: string; tenantId: string; workspaceId: string; name: string; isDefault: boolean }>;
  nodes: Map<string, { id: string; tenantId: string; graphId: string; name: string; layer: string; tokenCount: number; freshness: string; content?: string }>;
  slices: Map<string, { id: string; tenantId: string; workspaceId: string; name: string; status: string; ownerId: string; shortId: string; outcome: string; antiScope: string[]; constraints: any[]; acceptanceCriteria: any[] }>;
  sessions: Map<string, { id: string; tenantId: string; workspaceId: string; userId: string }>;
} = {
  graphs: new Map(),
  nodes: new Map(),
  slices: new Map(),
  sessions: new Map(),
};

// Helper to create mock Prisma with tenant-aware queries
function createMockPrisma(currentTenantId: TenantId) {
  return {
    contextGraph: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        for (const graph of mockDatabase.graphs.values()) {
          // Match by id and tenantId
          if (where.id && graph.id === where.id && graph.tenantId === where.tenantId) {
            return Promise.resolve(graph);
          }
          // Match by workspaceId, tenantId, and isDefault (for compile)
          if (where.workspaceId && graph.workspaceId === where.workspaceId &&
              graph.tenantId === where.tenantId &&
              (where.isDefault === undefined || graph.isDefault === where.isDefault)) {
            return Promise.resolve(graph);
          }
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const results: any[] = [];
        for (const graph of mockDatabase.graphs.values()) {
          if (graph.workspaceId === where.workspaceId && graph.tenantId === where.tenantId) {
            results.push(graph);
          }
        }
        return Promise.resolve(results);
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const id = `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const graph = { id, ...data };
        mockDatabase.graphs.set(id, graph);
        return Promise.resolve(graph);
      }),
      count: vi.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const graph of mockDatabase.graphs.values()) {
          if (graph.workspaceId === where.workspaceId && graph.tenantId === where.tenantId) {
            count++;
          }
        }
        return Promise.resolve(count);
      }),
    },
    contextNode: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        for (const node of mockDatabase.nodes.values()) {
          if (node.id === where.id && node.tenantId === where.tenantId) {
            return Promise.resolve(node);
          }
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const results: any[] = [];
        for (const node of mockDatabase.nodes.values()) {
          if (node.graphId === where.graphId && node.tenantId === where.tenantId) {
            if (where.freshness?.not && node.freshness === where.freshness.not) continue;
            results.push(node);
          }
        }
        return Promise.resolve(results);
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const node = { id, ...data };
        mockDatabase.nodes.set(id, node);
        return Promise.resolve(node);
      }),
      delete: vi.fn(),
      count: vi.fn(),
    },
    slice: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        for (const slice of mockDatabase.slices.values()) {
          if (slice.id === where.id && slice.tenantId === where.tenantId) {
            return Promise.resolve(slice);
          }
        }
        return Promise.resolve(null);
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const results: any[] = [];
        for (const slice of mockDatabase.slices.values()) {
          if (slice.workspaceId === where.workspaceId && slice.tenantId === where.tenantId) {
            results.push(slice);
          }
        }
        return Promise.resolve(results);
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const id = `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const slice = { id, ...data, constraints: [], acceptanceCriteria: [] };
        mockDatabase.slices.set(id, slice);
        return Promise.resolve(slice);
      }),
      count: vi.fn().mockImplementation(({ where }) => {
        let count = 0;
        for (const slice of mockDatabase.slices.values()) {
          if (slice.tenantId === where.tenantId) {
            count++;
          }
        }
        return Promise.resolve(count);
      }),
    },
    sliceTransition: {
      create: vi.fn().mockResolvedValue({}),
    },
    aISession: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        for (const session of mockDatabase.sessions.values()) {
          if (session.id === where.id && session.tenantId === where.tenantId) {
            return Promise.resolve({ ...session, feedback: null });
          }
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const session = { id, ...data };
        mockDatabase.sessions.set(id, session);
        return Promise.resolve(session);
      }),
    },
    sliceContext: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

const mockRedis = {
  keys: vi.fn().mockResolvedValue([]),
  del: vi.fn(),
  hincrby: vi.fn(),
  hget: vi.fn(),
};

describe('Multi-Tenant Isolation', () => {
  beforeEach(() => {
    // Clear mock database
    mockDatabase.graphs.clear();
    mockDatabase.nodes.clear();
    mockDatabase.slices.clear();
    mockDatabase.sessions.clear();
    vi.clearAllMocks();
  });

  describe('Context Graph Isolation', () => {
    it('should not allow Tenant B to access Tenant A graphs', async () => {
      // Setup: Tenant A creates a graph
      const prismaA = createMockPrisma(TENANT_A);
      const serviceA = new ContextService(prismaA as any, mockRedis as any);

      const graphA = await serviceA.createGraph(WORKSPACE_A1, TENANT_A, {
        name: 'Tenant A Graph',
        isDefault: true,
      });

      // Verify: Tenant A can access the graph
      const fetchedByA = await serviceA.getGraph(graphA.id as GraphId, TENANT_A);
      expect(fetchedByA.name).toBe('Tenant A Graph');

      // Test: Tenant B cannot access Tenant A's graph
      const prismaB = createMockPrisma(TENANT_B);
      const serviceB = new ContextService(prismaB as any, mockRedis as any);

      await expect(
        serviceB.getGraph(graphA.id as GraphId, TENANT_B),
      ).rejects.toThrow(GraphNotFoundError);
    });

    it('should only list graphs belonging to the requesting tenant', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const prismaB = createMockPrisma(TENANT_B);
      const serviceA = new ContextService(prismaA as any, mockRedis as any);
      const serviceB = new ContextService(prismaB as any, mockRedis as any);

      // Create graphs for both tenants
      await serviceA.createGraph(WORKSPACE_A1, TENANT_A, { name: 'Graph A1' });
      await serviceA.createGraph(WORKSPACE_A1, TENANT_A, { name: 'Graph A2' });
      await serviceB.createGraph(WORKSPACE_B1, TENANT_B, { name: 'Graph B1' });

      // List graphs for each tenant
      const graphsA = await serviceA.listGraphs(WORKSPACE_A1, TENANT_A);
      const graphsB = await serviceB.listGraphs(WORKSPACE_B1, TENANT_B);

      expect(graphsA.data).toHaveLength(2);
      expect(graphsA.data.every((g) => g.name.startsWith('Graph A'))).toBe(true);

      expect(graphsB.data).toHaveLength(1);
      expect(graphsB.data[0].name).toBe('Graph B1');
    });
  });

  describe('Context Node Isolation', () => {
    it('should not allow cross-tenant node access', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const serviceA = new ContextService(prismaA as any, mockRedis as any);

      // Create graph and node for Tenant A
      const graphA = await serviceA.createGraph(WORKSPACE_A1, TENANT_A, {
        name: 'Graph A',
        isDefault: true,
      });

      const nodeA = await serviceA.createNode(TENANT_A, {
        graphId: graphA.id as GraphId,
        type: 'DOCUMENT' as any,
        layer: ContextLayer.WORKSPACE,
        name: 'Secret Document',
        content: 'Confidential information for Tenant A',
      });

      // Tenant B tries to access Tenant A's node
      const prismaB = createMockPrisma(TENANT_B);
      const serviceB = new ContextService(prismaB as any, mockRedis as any);

      await expect(
        serviceB.getNode(nodeA.id as NodeId, TENANT_B),
      ).rejects.toThrow(NodeNotFoundError);
    });
  });

  describe('Slice Isolation', () => {
    it('should not allow cross-tenant slice access', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const sliceServiceA = new SliceService(prismaA as any);

      // Create slice for Tenant A
      const sliceA = await sliceServiceA.create(TENANT_A, USER_A1, {
        workspaceId: WORKSPACE_A1,
        name: 'Tenant A Slice',
        outcome: 'Confidential task',
      });

      // Tenant B tries to access
      const prismaB = createMockPrisma(TENANT_B);
      const sliceServiceB = new SliceService(prismaB as any);

      await expect(
        sliceServiceB.get(sliceA.id as SliceId, TENANT_B),
      ).rejects.toThrow(SliceNotFoundError);
    });

    it('should only list slices belonging to the requesting tenant', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const prismaB = createMockPrisma(TENANT_B);
      const sliceServiceA = new SliceService(prismaA as any);
      const sliceServiceB = new SliceService(prismaB as any);

      // Create slices for both tenants
      await sliceServiceA.create(TENANT_A, USER_A1, {
        workspaceId: WORKSPACE_A1,
        name: 'Slice A1',
        outcome: 'Task A1',
      });
      await sliceServiceA.create(TENANT_A, USER_A1, {
        workspaceId: WORKSPACE_A1,
        name: 'Slice A2',
        outcome: 'Task A2',
      });
      await sliceServiceB.create(TENANT_B, USER_B1, {
        workspaceId: WORKSPACE_B1,
        name: 'Slice B1',
        outcome: 'Task B1',
      });

      // List slices for each tenant
      const slicesA = await sliceServiceA.list(WORKSPACE_A1, TENANT_A);
      const slicesB = await sliceServiceB.list(WORKSPACE_B1, TENANT_B);

      expect(slicesA.data).toHaveLength(2);
      expect(slicesA.data.every((s) => s.name.startsWith('Slice A'))).toBe(true);

      expect(slicesB.data).toHaveLength(1);
      expect(slicesB.data[0].name).toBe('Slice B1');
    });
  });

  describe('Session Isolation', () => {
    it('should not allow cross-tenant session access', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const feedbackServiceA = new FeedbackService(prismaA as any, mockRedis as any);

      // Create session for Tenant A
      const sessionA = await feedbackServiceA.createSession(
        TENANT_A,
        WORKSPACE_A1,
        USER_A1,
        {
          contextNodeIds: [],
          contextTokenCount: 0,
        },
      );

      // Tenant B tries to access
      const prismaB = createMockPrisma(TENANT_B);
      const feedbackServiceB = new FeedbackService(prismaB as any, mockRedis as any);

      await expect(
        feedbackServiceB.getSession(sessionA.id as SessionId, TENANT_B),
      ).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe('Context Compilation Isolation', () => {
    it('should only compile context from the requesting tenant', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const prismaB = createMockPrisma(TENANT_B);
      const serviceA = new ContextService(prismaA as any, mockRedis as any);
      const serviceB = new ContextService(prismaB as any, mockRedis as any);

      // Create graph and nodes for Tenant A
      const graphA = await serviceA.createGraph(WORKSPACE_A1, TENANT_A, {
        name: 'Graph A',
        isDefault: true,
      });

      await serviceA.createNode(TENANT_A, {
        graphId: graphA.id as GraphId,
        type: 'DOCUMENT' as any,
        layer: ContextLayer.ORGANIZATIONAL,
        name: 'Org Context A',
        content: 'Organization guidelines for Tenant A',
      });

      // Create graph and nodes for Tenant B
      const graphB = await serviceB.createGraph(WORKSPACE_B1, TENANT_B, {
        name: 'Graph B',
        isDefault: true,
      });

      await serviceB.createNode(TENANT_B, {
        graphId: graphB.id as GraphId,
        type: 'DOCUMENT' as any,
        layer: ContextLayer.ORGANIZATIONAL,
        name: 'Org Context B',
        content: 'Organization guidelines for Tenant B',
      });

      // Compile context for Tenant A
      const compiledA = await serviceA.compile(TENANT_A, {
        workspaceId: WORKSPACE_A1,
        tokenBudget: 8000,
      });

      // Compile context for Tenant B
      const compiledB = await serviceB.compile(TENANT_B, {
        workspaceId: WORKSPACE_B1,
        tokenBudget: 8000,
      });

      // Verify isolation
      expect(compiledA.compiledText).toContain('Tenant A');
      expect(compiledA.compiledText).not.toContain('Tenant B');

      expect(compiledB.compiledText).toContain('Tenant B');
      expect(compiledB.compiledText).not.toContain('Tenant A');
    });
  });

  describe('Cross-Tenant Data Leakage Prevention', () => {
    it('should prevent data leakage through error messages', async () => {
      const prismaA = createMockPrisma(TENANT_A);
      const sliceServiceA = new SliceService(prismaA as any);

      // Create slice for Tenant A
      const sliceA = await sliceServiceA.create(TENANT_A, USER_A1, {
        workspaceId: WORKSPACE_A1,
        name: 'Secret Project Alpha',
        outcome: 'Build secret feature',
      });

      // Tenant B tries to access with known ID
      const prismaB = createMockPrisma(TENANT_B);
      const sliceServiceB = new SliceService(prismaB as any);

      try {
        await sliceServiceB.get(sliceA.id as SliceId, TENANT_B);
        fail('Should have thrown');
      } catch (error: any) {
        // Error should not leak any details about the slice
        expect(error.message).not.toContain('Secret Project');
        expect(error.message).not.toContain('secret feature');
        expect(error.message).toContain('not found');
      }
    });
  });
});
