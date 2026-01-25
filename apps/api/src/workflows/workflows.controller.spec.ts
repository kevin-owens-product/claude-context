/**
 * WorkflowsController Unit Tests
 * @prompt-id forge-v4.1:test:workflows-controller:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowService } from '@forge/context';

describe('WorkflowsController', () => {
  let controller: WorkflowsController;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockTenantContext = {
    tenantId: 'tenant-123',
    userId: 'user-456',
  };

  const mockWorkflow = {
    id: 'wf-123',
    tenantId: 'tenant-123',
    name: 'Test Workflow',
    description: 'A test workflow',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['created'],
      entityTypes: ['slice'],
    },
    conditions: null,
    actions: [
      { type: 'NOTIFY', config: { channel: 'slack' }, order: 1 },
    ],
    isEnabled: true,
    runCount: 0,
    lastRunAt: null,
    createdById: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockWorkflowService = {
      listWorkflows: jest.fn(),
      getWorkflow: jest.fn(),
      createWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      deleteWorkflow: jest.fn(),
      enableWorkflow: jest.fn(),
      disableWorkflow: jest.fn(),
      testWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      listExecutions: jest.fn(),
      getExecution: jest.fn(),
      cancelExecution: jest.fn(),
      retryExecution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    controller = module.get<WorkflowsController>(WorkflowsController);
    workflowService = module.get(WorkflowService);
  });

  describe('listWorkflows', () => {
    it('should return paginated workflows', async () => {
      const mockResult = {
        data: [mockWorkflow],
        total: 1,
        limit: 20,
        offset: 0,
      };
      workflowService.listWorkflows.mockResolvedValue(mockResult);

      const result = await controller.listWorkflows(
        mockTenantContext as any,
        undefined,
        undefined,
        undefined,
        '20',
        '0'
      );

      expect(result).toEqual(mockResult);
      expect(workflowService.listWorkflows).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );
    });

    it('should filter by triggerType', async () => {
      workflowService.listWorkflows.mockResolvedValue({ data: [], total: 0, limit: 20, offset: 0 });

      await controller.listWorkflows(
        mockTenantContext as any,
        'EVENT' as any,
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(workflowService.listWorkflows).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        expect.objectContaining({ triggerType: 'EVENT' })
      );
    });

    it('should filter by isEnabled', async () => {
      workflowService.listWorkflows.mockResolvedValue({ data: [], total: 0, limit: 20, offset: 0 });

      await controller.listWorkflows(
        mockTenantContext as any,
        undefined,
        'true',
        undefined,
        undefined,
        undefined
      );

      expect(workflowService.listWorkflows).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        expect.objectContaining({ isEnabled: true })
      );
    });
  });

  describe('getWorkflow', () => {
    it('should return a workflow by ID', async () => {
      workflowService.getWorkflow.mockResolvedValue(mockWorkflow);

      const result = await controller.getWorkflow(
        mockTenantContext as any,
        'wf-123'
      );

      expect(result).toEqual(mockWorkflow);
      expect(workflowService.getWorkflow).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        'wf-123'
      );
    });

    it('should throw NotFoundException when workflow not found', async () => {
      workflowService.getWorkflow.mockResolvedValue(null);

      await expect(
        controller.getWorkflow(mockTenantContext as any, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      const createDto = {
        name: 'New Workflow',
        triggerType: 'EVENT' as const,
        triggerConfig: {
          eventTypes: ['created'],
          entityTypes: ['slice'],
        },
        actions: [{ type: 'NOTIFY' as const, config: {}, order: 1 }],
      };

      workflowService.createWorkflow.mockResolvedValue({
        ...mockWorkflow,
        ...createDto,
      });

      const result = await controller.createWorkflow(
        mockTenantContext as any,
        createDto
      );

      expect(result.name).toBe(createDto.name);
      expect(workflowService.createWorkflow).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        expect.objectContaining({
          ...createDto,
          createdById: mockTenantContext.userId,
        })
      );
    });

    it('should throw BadRequestException on validation error', async () => {
      workflowService.createWorkflow.mockRejectedValue(
        new Error('At least one action is required')
      );

      await expect(
        controller.createWorkflow(mockTenantContext as any, {
          name: 'Invalid',
          triggerType: 'EVENT' as const,
          triggerConfig: {},
          actions: [],
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateWorkflow', () => {
    it('should update an existing workflow', async () => {
      const updateDto = { name: 'Updated Name' };
      workflowService.updateWorkflow.mockResolvedValue({
        ...mockWorkflow,
        name: 'Updated Name',
      });

      const result = await controller.updateWorkflow(
        mockTenantContext as any,
        'wf-123',
        updateDto
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when workflow not found', async () => {
      workflowService.updateWorkflow.mockResolvedValue(null);

      await expect(
        controller.updateWorkflow(
          mockTenantContext as any,
          'non-existent',
          { name: 'Test' }
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete a workflow', async () => {
      workflowService.deleteWorkflow.mockResolvedValue(true);

      await expect(
        controller.deleteWorkflow(mockTenantContext as any, 'wf-123')
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when workflow not found', async () => {
      workflowService.deleteWorkflow.mockResolvedValue(false);

      await expect(
        controller.deleteWorkflow(mockTenantContext as any, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('enableWorkflow', () => {
    it('should enable a workflow', async () => {
      workflowService.enableWorkflow.mockResolvedValue({
        ...mockWorkflow,
        isEnabled: true,
      });

      const result = await controller.enableWorkflow(
        mockTenantContext as any,
        'wf-123'
      );

      expect(result.isEnabled).toBe(true);
    });
  });

  describe('disableWorkflow', () => {
    it('should disable a workflow', async () => {
      workflowService.disableWorkflow.mockResolvedValue({
        ...mockWorkflow,
        isEnabled: false,
      });

      const result = await controller.disableWorkflow(
        mockTenantContext as any,
        'wf-123'
      );

      expect(result.isEnabled).toBe(false);
    });
  });

  describe('testWorkflow', () => {
    it('should test workflow with mock data', async () => {
      const mockData = {
        eventType: 'created',
        entity: { id: 'e-1', status: 'active' },
      };
      const testResult = {
        wouldTrigger: true,
        conditionsMet: true,
        preview: [{ actionType: 'NOTIFY', success: true }],
      };

      workflowService.testWorkflow.mockResolvedValue(testResult);

      const result = await controller.testWorkflow(
        mockTenantContext as any,
        'wf-123',
        mockData
      );

      expect(result).toEqual(testResult);
    });
  });

  describe('executeWorkflow', () => {
    it('should manually execute a workflow', async () => {
      const triggerData = { entity: { id: 'e-1' } };
      const execution = {
        id: 'exec-123',
        workflowId: 'wf-123',
        status: 'COMPLETED',
      };

      workflowService.executeWorkflow.mockResolvedValue(execution);

      const result = await controller.executeWorkflow(
        mockTenantContext as any,
        'wf-123',
        triggerData
      );

      expect(result).toEqual(execution);
    });
  });

  describe('listExecutions', () => {
    it('should list executions for a workflow', async () => {
      const mockExecutions = {
        data: [
          { id: 'exec-1', workflowId: 'wf-123', status: 'COMPLETED' },
          { id: 'exec-2', workflowId: 'wf-123', status: 'FAILED' },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      };

      workflowService.listExecutions.mockResolvedValue(mockExecutions);

      const result = await controller.listExecutions(
        mockTenantContext as any,
        'wf-123',
        undefined,
        '20',
        '0'
      );

      expect(result).toEqual(mockExecutions);
    });

    it('should filter executions by status', async () => {
      workflowService.listExecutions.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.listExecutions(
        mockTenantContext as any,
        'wf-123',
        'FAILED' as any,
        undefined,
        undefined
      );

      expect(workflowService.listExecutions).toHaveBeenCalledWith(
        mockTenantContext.tenantId,
        expect.objectContaining({ status: 'FAILED' })
      );
    });
  });

  describe('cancelExecution', () => {
    it('should cancel a running execution', async () => {
      workflowService.cancelExecution.mockResolvedValue({
        id: 'exec-123',
        status: 'CANCELLED',
      });

      const result = await controller.cancelExecution(
        mockTenantContext as any,
        'exec-123'
      );

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException if execution cannot be cancelled', async () => {
      workflowService.cancelExecution.mockResolvedValue(null);

      await expect(
        controller.cancelExecution(mockTenantContext as any, 'exec-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retryExecution', () => {
    it('should retry a failed execution', async () => {
      workflowService.retryExecution.mockResolvedValue({
        id: 'exec-456',
        status: 'PENDING',
      });

      const result = await controller.retryExecution(
        mockTenantContext as any,
        'exec-123'
      );

      expect(result.id).toBe('exec-456');
    });

    it('should throw NotFoundException if execution cannot be retried', async () => {
      workflowService.retryExecution.mockResolvedValue(null);

      await expect(
        controller.retryExecution(mockTenantContext as any, 'exec-123')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
