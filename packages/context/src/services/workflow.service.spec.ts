/**
 * WorkflowService Unit Tests
 * @prompt-id forge-v4.1:test:workflow-service:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowService } from './workflow.service';
import type { TenantId, UserId } from '../types';

// Mock PrismaClient
type MockPrisma = {
  workflow: Record<string, ReturnType<typeof vi.fn>>;
  workflowExecution: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

const mockPrisma: MockPrisma = {
  workflow: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  workflowExecution: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((callback: (prisma: MockPrisma) => unknown) => callback(mockPrisma)),
};

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  publish: vi.fn(),
};

describe('WorkflowService', () => {
  let service: WorkflowService;
  const tenantId = 'tenant-123' as TenantId;
  const userId = 'user-456' as UserId;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkflowService(mockPrisma as any, mockRedis as any);
  });

  describe('createWorkflow', () => {
    it('should create a workflow with valid data', async () => {
      const request = {
        name: 'Test Workflow',
        description: 'A test workflow',
        triggerType: 'EVENT' as const,
        triggerConfig: {
          eventTypes: ['created'],
          entityTypes: ['slice'],
        },
        actions: [
          {
            type: 'NOTIFY' as const,
            config: { channel: 'slack', message: 'Test' },
            order: 1,
          },
        ],
        createdById: userId,
      };

      const mockWorkflow = {
        id: 'wf-123',
        tenantId,
        ...request,
        isEnabled: true,
        runCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow(tenantId, request);

      expect(result).toBeDefined();
      expect(result.name).toBe(request.name);
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: request.name,
          triggerType: request.triggerType,
        }),
      });
    });

    it('should require at least one action', async () => {
      const request = {
        name: 'Test Workflow',
        triggerType: 'EVENT' as const,
        triggerConfig: { eventTypes: ['created'], entityTypes: ['slice'] },
        actions: [],
        createdById: userId,
      };

      await expect(service.createWorkflow(tenantId, request)).rejects.toThrow(
        'At least one action is required'
      );
    });

    it('should validate trigger config for EVENT type', async () => {
      const request = {
        name: 'Test Workflow',
        triggerType: 'EVENT' as const,
        triggerConfig: {}, // Missing required fields
        actions: [{ type: 'NOTIFY' as const, config: {}, order: 1 }],
        createdById: userId,
      };

      await expect(service.createWorkflow(tenantId, request)).rejects.toThrow(
        'eventTypes and entityTypes are required'
      );
    });

    it('should validate trigger config for SCHEDULE type', async () => {
      const request = {
        name: 'Test Workflow',
        triggerType: 'SCHEDULE' as const,
        triggerConfig: { cron: 'invalid', timezone: 'UTC' }, // Invalid cron
        actions: [{ type: 'NOTIFY' as const, config: {}, order: 1 }],
        createdById: userId,
      };

      await expect(service.createWorkflow(tenantId, request)).rejects.toThrow(
        'Invalid cron expression'
      );
    });
  });

  describe('evaluateTrigger', () => {
    it('should find matching workflows for an event', async () => {
      const event = {
        eventType: 'created',
        entityType: 'slice',
        payload: { status: 'active' },
      };

      const mockWorkflows = [
        {
          id: 'wf-1',
          tenantId,
          triggerType: 'EVENT',
          triggerConfig: {
            eventTypes: ['created'],
            entityTypes: ['slice'],
          },
          isEnabled: true,
        },
        {
          id: 'wf-2',
          tenantId,
          triggerType: 'EVENT',
          triggerConfig: {
            eventTypes: ['updated'],
            entityTypes: ['slice'],
          },
          isEnabled: true,
        },
      ];

      mockPrisma.workflow.findMany.mockResolvedValue(mockWorkflows);

      const result = await service.evaluateTrigger(tenantId, event as any);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wf-1');
    });

    it('should match event type filters', async () => {
      const event = {
        eventType: 'updated',
        entityType: 'slice',
        payload: { status: 'blocked' },
      };

      const mockWorkflows = [
        {
          id: 'wf-1',
          tenantId,
          triggerType: 'EVENT',
          triggerConfig: {
            eventTypes: ['updated'],
            entityTypes: ['slice'],
            filters: { 'payload.status': 'blocked' },
          },
          isEnabled: true,
        },
      ];

      mockPrisma.workflow.findMany.mockResolvedValue(mockWorkflows);

      const result = await service.evaluateTrigger(tenantId, event as any);

      expect(result).toHaveLength(1);
    });

    it('should not match workflows with non-matching filters', async () => {
      const event = {
        eventType: 'updated',
        entityType: 'slice',
        payload: { status: 'active' },
      };

      const mockWorkflows = [
        {
          id: 'wf-1',
          tenantId,
          triggerType: 'EVENT',
          triggerConfig: {
            eventTypes: ['updated'],
            entityTypes: ['slice'],
            filters: { 'payload.status': 'blocked' },
          },
          isEnabled: true,
        },
      ];

      mockPrisma.workflow.findMany.mockResolvedValue(mockWorkflows);

      const result = await service.evaluateTrigger(tenantId, event as any);

      expect(result).toHaveLength(0);
    });
  });

  describe('evaluateConditions', () => {
    it('should return true when no conditions are defined', async () => {
      const workflow = { conditions: null } as any;
      const context = { entity: { status: 'active' } };

      const result = await service.evaluateConditions(workflow, context);

      expect(result).toBe(true);
    });

    it('should evaluate AND conditions correctly', async () => {
      const workflow = {
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'entity.status', operator: 'equals', value: 'blocked' },
            { field: 'entity.priority', operator: 'equals', value: 'HIGH' },
          ],
        },
      } as any;

      const contextMatch = {
        entity: { status: 'blocked', priority: 'HIGH' },
      };
      const contextNoMatch = {
        entity: { status: 'blocked', priority: 'LOW' },
      };

      expect(await service.evaluateConditions(workflow, contextMatch)).toBe(true);
      expect(await service.evaluateConditions(workflow, contextNoMatch)).toBe(false);
    });

    it('should evaluate OR conditions correctly', async () => {
      const workflow = {
        conditions: {
          operator: 'OR',
          rules: [
            { field: 'entity.status', operator: 'equals', value: 'blocked' },
            { field: 'entity.priority', operator: 'equals', value: 'CRITICAL' },
          ],
        },
      } as any;

      const context1 = { entity: { status: 'blocked', priority: 'LOW' } };
      const context2 = { entity: { status: 'active', priority: 'CRITICAL' } };
      const context3 = { entity: { status: 'active', priority: 'LOW' } };

      expect(await service.evaluateConditions(workflow, context1)).toBe(true);
      expect(await service.evaluateConditions(workflow, context2)).toBe(true);
      expect(await service.evaluateConditions(workflow, context3)).toBe(false);
    });

    it('should evaluate IN operator', async () => {
      const workflow = {
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'entity.priority', operator: 'in', value: ['HIGH', 'CRITICAL'] },
          ],
        },
      } as any;

      expect(await service.evaluateConditions(workflow, { entity: { priority: 'HIGH' } })).toBe(true);
      expect(await service.evaluateConditions(workflow, { entity: { priority: 'CRITICAL' } })).toBe(true);
      expect(await service.evaluateConditions(workflow, { entity: { priority: 'LOW' } })).toBe(false);
    });

    it('should evaluate CONTAINS operator', async () => {
      const workflow = {
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'entity.tags', operator: 'contains', value: 'urgent' },
          ],
        },
      } as any;

      expect(await service.evaluateConditions(workflow, { entity: { tags: ['urgent', 'bug'] } })).toBe(true);
      expect(await service.evaluateConditions(workflow, { entity: { tags: ['feature'] } })).toBe(false);
    });

    it('should evaluate numeric comparisons', async () => {
      const workflow = {
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'entity.value', operator: 'greater_than', value: 100000 },
          ],
        },
      } as any;

      expect(await service.evaluateConditions(workflow, { entity: { value: 150000 } })).toBe(true);
      expect(await service.evaluateConditions(workflow, { entity: { value: 50000 } })).toBe(false);
    });

    it('should evaluate null checks', async () => {
      const workflow = {
        conditions: {
          operator: 'AND',
          rules: [
            { field: 'entity.assignee', operator: 'is_not_null', value: null },
          ],
        },
      } as any;

      expect(await service.evaluateConditions(workflow, { entity: { assignee: 'user-1' } })).toBe(true);
      expect(await service.evaluateConditions(workflow, { entity: { assignee: null } })).toBe(false);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute all actions in order', async () => {
      const workflow = {
        id: 'wf-123',
        tenantId,
        name: 'Test Workflow',
        triggerType: 'EVENT',
        isEnabled: true,
        actions: [
          { type: 'UPDATE_FIELD', config: { field: 'priority', value: 'HIGH' }, order: 1 },
          { type: 'NOTIFY', config: { channel: 'slack', message: 'Test' }, order: 2 },
        ],
        runCount: 0,
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(workflow);
      mockPrisma.workflowExecution.create.mockResolvedValue({
        id: 'exec-123',
        workflowId: workflow.id,
        tenantId,
        status: 'PENDING',
        triggerData: {},
      });
      mockPrisma.workflowExecution.update.mockResolvedValue({
        id: 'exec-123',
        status: 'COMPLETED',
      });
      mockPrisma.workflow.update.mockResolvedValue({ ...workflow, runCount: 1 });

      const result = await service.executeWorkflow(tenantId, 'wf-123' as any, {});

      expect(mockPrisma.workflowExecution.create).toHaveBeenCalled();
      expect(mockPrisma.workflowExecution.update).toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });

    it('should handle execution failures gracefully', async () => {
      const workflow = {
        id: 'wf-123',
        tenantId,
        name: 'Test Workflow',
        triggerType: 'EVENT',
        isEnabled: true,
        actions: [
          { type: 'WEBHOOK', config: { url: 'invalid-url', method: 'POST' }, order: 1 },
        ],
        runCount: 0,
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(workflow);
      mockPrisma.workflowExecution.create.mockResolvedValue({
        id: 'exec-123',
        workflowId: workflow.id,
        tenantId,
        status: 'PENDING',
        triggerData: {},
      });
      mockPrisma.workflowExecution.update.mockResolvedValue({
        id: 'exec-123',
        status: 'FAILED',
        error: 'Webhook failed',
      });

      const result = await service.executeWorkflow(tenantId, 'wf-123' as any, {});

      expect(result.status).toBe('FAILED');
      expect(result.error).toBeDefined();
    });

    it('should not execute disabled workflows', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        id: 'wf-123',
        tenantId,
        isEnabled: false,
      });

      await expect(
        service.executeWorkflow(tenantId, 'wf-123' as any, {})
      ).rejects.toThrow('Workflow is not enabled');
    });
  });

  describe('testWorkflow', () => {
    it('should preview action results without executing', async () => {
      const workflow = {
        id: 'wf-123',
        tenantId,
        name: 'Test Workflow',
        triggerType: 'EVENT',
        conditions: {
          operator: 'AND',
          rules: [{ field: 'entity.status', operator: 'equals', value: 'blocked' }],
        },
        actions: [
          { type: 'NOTIFY', config: { channel: 'slack', message: 'Entity {{entity.name}} is blocked' }, order: 1 },
        ],
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(workflow);

      const mockData = {
        eventType: 'updated',
        entity: { id: 'e-1', name: 'Test Entity', status: 'blocked' },
      };

      const result = await service.testWorkflow(tenantId, 'wf-123' as any, mockData);

      expect(result.wouldTrigger).toBe(true);
      expect(result.conditionsMet).toBe(true);
      expect(result.preview).toHaveLength(1);
      expect(result.preview[0].actionType).toBe('NOTIFY');
    });

    it('should indicate when conditions are not met', async () => {
      const workflow = {
        id: 'wf-123',
        tenantId,
        name: 'Test Workflow',
        triggerType: 'EVENT',
        conditions: {
          operator: 'AND',
          rules: [{ field: 'entity.status', operator: 'equals', value: 'blocked' }],
        },
        actions: [{ type: 'NOTIFY', config: {}, order: 1 }],
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(workflow);

      const mockData = {
        entity: { status: 'active' },
      };

      const result = await service.testWorkflow(tenantId, 'wf-123' as any, mockData);

      expect(result.conditionsMet).toBe(false);
    });
  });

  describe('retryExecution', () => {
    it('should create a new execution for retry', async () => {
      const failedExecution = {
        id: 'exec-123',
        workflowId: 'wf-123',
        tenantId,
        status: 'FAILED',
        triggerData: { entity: { id: 'e-1' } },
      };

      const workflow = {
        id: 'wf-123',
        tenantId,
        isEnabled: true,
        actions: [{ type: 'NOTIFY', config: {}, order: 1 }],
      };

      mockPrisma.workflowExecution.findUnique.mockResolvedValue(failedExecution);
      mockPrisma.workflow.findUnique.mockResolvedValue(workflow);
      mockPrisma.workflowExecution.create.mockResolvedValue({
        id: 'exec-456',
        workflowId: 'wf-123',
        tenantId,
        status: 'PENDING',
        triggerData: failedExecution.triggerData,
      });
      mockPrisma.workflowExecution.update.mockResolvedValue({
        id: 'exec-456',
        status: 'COMPLETED',
      });

      const result = await service.retryExecution(tenantId, 'exec-123' as any);

      expect(result).toBeDefined();
      expect(result?.id).toBe('exec-456');
    });

    it('should only retry failed or cancelled executions', async () => {
      mockPrisma.workflowExecution.findUnique.mockResolvedValue({
        id: 'exec-123',
        tenantId,
        status: 'COMPLETED',
      });

      const result = await service.retryExecution(tenantId, 'exec-123' as any);

      expect(result).toBeNull();
    });
  });

  describe('cancelExecution', () => {
    it('should cancel running executions', async () => {
      mockPrisma.workflowExecution.findUnique.mockResolvedValue({
        id: 'exec-123',
        tenantId,
        status: 'RUNNING',
      });
      mockPrisma.workflowExecution.update.mockResolvedValue({
        id: 'exec-123',
        status: 'CANCELLED',
      });

      const result = await service.cancelExecution(tenantId, 'exec-123' as any);

      expect(result?.status).toBe('CANCELLED');
    });

    it('should not cancel completed executions', async () => {
      mockPrisma.workflowExecution.findUnique.mockResolvedValue({
        id: 'exec-123',
        tenantId,
        status: 'COMPLETED',
      });

      const result = await service.cancelExecution(tenantId, 'exec-123' as any);

      expect(result).toBeNull();
    });
  });

  describe('interpolate', () => {
    it('should interpolate template strings', () => {
      const template = 'Hello {{entity.name}}, status is {{entity.status}}';
      const context = {
        entity: { name: 'Test', status: 'active' },
      };

      // Access private method through any cast for testing
      const result = (service as any).interpolate(template, context);

      expect(result).toBe('Hello Test, status is active');
    });

    it('should handle missing values gracefully', () => {
      const template = 'Value: {{entity.missing}}';
      const context = { entity: {} };

      const result = (service as any).interpolate(template, context);

      expect(result).toBe('Value: ');
    });

    it('should handle nested paths', () => {
      const template = '{{entity.details.nested.value}}';
      const context = {
        entity: { details: { nested: { value: 'deep' } } },
      };

      const result = (service as any).interpolate(template, context);

      expect(result).toBe('deep');
    });
  });
});
