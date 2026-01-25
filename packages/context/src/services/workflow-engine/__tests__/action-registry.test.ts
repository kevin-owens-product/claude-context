/**
 * ActionRegistry Tests
 *
 * @prompt-id forge-v4.1:test:action-registry:001
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionRegistry } from '../action-registry';
import type { ExecutionContext, ActionInput, ActionOutput, ActionStep, TenantId } from '../types';

describe('ActionRegistry', () => {
  let registry: ActionRegistry;

  beforeEach(() => {
    registry = new ActionRegistry();
  });

  const createMockContext = (overrides: Partial<ExecutionContext> = {}): ExecutionContext => ({
    execution: {
      id: 'exec_123' as any,
      workflowId: 'wf_123' as any,
      tenantId: 'tenant_123' as TenantId,
      version: 1,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    trigger: {
      type: 'MANUAL',
      data: { entityId: 'entity_123' },
      timestamp: new Date(),
    },
    variables: {
      itemName: 'Test Item',
      count: 5,
    },
    secrets: {
      API_KEY: 'secret-api-key',
      SLACK_WEBHOOK: 'https://hooks.slack.com/test',
    },
    tenant: {
      id: 'tenant_123' as TenantId,
      name: 'Test Tenant',
      plan: 'enterprise',
    },
    stepResults: {},
    metadata: {},
    ...overrides,
  });

  describe('Built-in Actions', () => {
    describe('HTTP_REQUEST', () => {
      let originalFetch: typeof global.fetch;

      beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Map([['content-type', 'application/json']]),
          json: () => Promise.resolve({ result: 'success' }),
          text: () => Promise.resolve('{"result":"success"}'),
        });
      });

      afterEach(() => {
        global.fetch = originalFetch;
      });

      it('should execute HTTP GET request', async () => {
        const action = registry.getAction('HTTP_REQUEST');
        expect(action).toBeDefined();

        const result = await registry.execute('HTTP_REQUEST', {
          url: 'https://api.example.com/data',
          method: 'GET',
        }, createMockContext());

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/data',
          expect.objectContaining({
            method: 'GET',
          })
        );
        expect(result.success).toBe(true);
      });

      it('should execute HTTP POST with body', async () => {
        const action = registry.getAction('HTTP_REQUEST');

        const result = await registry.execute('HTTP_REQUEST', {
          url: 'https://api.example.com/data',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: 'test' },
        }, createMockContext());

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.example.com/data',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'test' }),
          })
        );
        expect(result.success).toBe(true);
      });

      it('should handle HTTP errors', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error'),
        });

        const result = await registry.execute('HTTP_REQUEST', {
          url: 'https://api.example.com/data',
          method: 'GET',
        }, createMockContext());

        expect(result.success).toBe(false);
        expect(result.error).toContain('500');
      });

      it('should handle network errors', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

        const result = await registry.execute('HTTP_REQUEST', {
          url: 'https://api.example.com/data',
          method: 'GET',
        }, createMockContext());

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });
    });

    describe('LOG_MESSAGE', () => {
      let consoleSpy: ReturnType<typeof vi.spyOn>;

      beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should log message with context', async () => {
        const result = await registry.execute('LOG_MESSAGE', {
          message: 'Processing item: {{itemName}}',
          level: 'info',
        }, createMockContext());

        expect(result.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('info'),
          expect.stringContaining('Processing item: Test Item')
        );
      });

      it('should handle different log levels', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation();

        await registry.execute('LOG_MESSAGE', {
          message: 'Warning message',
          level: 'warn',
        }, createMockContext());

        expect(warnSpy).toHaveBeenCalled();

        await registry.execute('LOG_MESSAGE', {
          message: 'Error message',
          level: 'error',
        }, createMockContext());

        expect(errorSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });
    });

    describe('SET_VARIABLE', () => {
      it('should set a variable in context', async () => {
        const context = createMockContext();

        const result = await registry.execute('SET_VARIABLE', {
          name: 'newVar',
          value: 'newValue',
        }, context);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: 'newVar', value: 'newValue' });
      });

      it('should set variable with expression value', async () => {
        const context = createMockContext();

        const result = await registry.execute('SET_VARIABLE', {
          name: 'doubleCount',
          value: '{{count * 2}}',
        }, context);

        expect(result.success).toBe(true);
      });
    });

    describe('PUBLISH_EVENT', () => {
      it('should publish an event', async () => {
        const result = await registry.execute('PUBLISH_EVENT', {
          eventType: 'workflow.completed',
          payload: {
            workflowId: '{{execution.workflowId}}',
            status: 'success',
          },
        }, createMockContext());

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          eventType: 'workflow.completed',
        });
      });
    });
  });

  describe('Custom Action Registration', () => {
    it('should register a custom action', () => {
      const customAction = {
        type: 'CUSTOM_ACTION',
        name: 'Custom Action',
        description: 'A custom action for testing',
        inputSchema: {
          type: 'object' as const,
          properties: {
            value: { type: 'string' as const },
          },
          required: ['value'] as const,
        },
        outputSchema: {
          type: 'object' as const,
          properties: {
            result: { type: 'string' as const },
          },
        },
        execute: async (input: ActionInput, context: ExecutionContext): Promise<ActionOutput> => ({
          success: true,
          data: { result: `Processed: ${input.value}` },
        }),
      };

      registry.register(customAction);

      expect(registry.getAction('CUSTOM_ACTION')).toBeDefined();
    });

    it('should execute a custom action', async () => {
      const customAction = {
        type: 'CUSTOM_ACTION',
        name: 'Custom Action',
        description: 'A custom action for testing',
        inputSchema: {
          type: 'object' as const,
          properties: {
            value: { type: 'string' as const },
          },
          required: ['value'] as const,
        },
        outputSchema: {
          type: 'object' as const,
          properties: {
            result: { type: 'string' as const },
          },
        },
        execute: async (input: ActionInput, context: ExecutionContext): Promise<ActionOutput> => ({
          success: true,
          data: { result: `Processed: ${input.value}` },
        }),
      };

      registry.register(customAction);

      const result = await registry.execute('CUSTOM_ACTION', { value: 'test' }, createMockContext());

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'Processed: test' });
    });

    it('should throw error for duplicate action type', () => {
      const customAction = {
        type: 'HTTP_REQUEST', // Already registered
        name: 'Duplicate',
        description: 'This should fail',
        inputSchema: { type: 'object' as const, properties: {} },
        outputSchema: { type: 'object' as const, properties: {} },
        execute: async () => ({ success: true }),
      };

      expect(() => registry.register(customAction)).toThrow('Action type already registered');
    });
  });

  describe('Action Listing', () => {
    it('should list all available actions', () => {
      const actions = registry.listActions();

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.map(a => a.type)).toContain('HTTP_REQUEST');
      expect(actions.map(a => a.type)).toContain('LOG_MESSAGE');
      expect(actions.map(a => a.type)).toContain('SET_VARIABLE');
      expect(actions.map(a => a.type)).toContain('PUBLISH_EVENT');
    });

    it('should return action definitions with schemas', () => {
      const actions = registry.listActions();
      const httpAction = actions.find(a => a.type === 'HTTP_REQUEST');

      expect(httpAction).toBeDefined();
      expect(httpAction?.inputSchema).toBeDefined();
      expect(httpAction?.outputSchema).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate required inputs', async () => {
      const result = await registry.execute('HTTP_REQUEST', {
        // Missing url and method
      }, createMockContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('url');
    });

    it('should validate input types', async () => {
      const result = await registry.execute('HTTP_REQUEST', {
        url: 12345, // Should be string
        method: 'GET',
      }, createMockContext());

      expect(result.success).toBe(false);
    });
  });

  describe('Template Interpolation', () => {
    it('should interpolate variables in string inputs', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await registry.execute('LOG_MESSAGE', {
        message: 'Item: {{itemName}}, Count: {{count}}',
        level: 'info',
      }, createMockContext());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Item: Test Item, Count: 5'
      );

      consoleSpy.mockRestore();
    });

    it('should interpolate secrets', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await registry.execute('HTTP_REQUEST', {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{secrets.API_KEY}}',
        },
      }, createMockContext());

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer secret-api-key',
          }),
        })
      );

      global.fetch = originalFetch;
    });

    it('should handle missing variables gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await registry.execute('LOG_MESSAGE', {
        message: 'Value: {{nonexistent}}',
        level: 'info',
      }, createMockContext());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'Value: '
      );

      consoleSpy.mockRestore();
    });

    it('should interpolate nested object paths', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const context = createMockContext({
        variables: {
          user: {
            profile: {
              name: 'John Doe',
            },
          },
        },
      });

      await registry.execute('LOG_MESSAGE', {
        message: 'User: {{user.profile.name}}',
        level: 'info',
      }, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        'User: John Doe'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle action execution errors', async () => {
      const failingAction = {
        type: 'FAILING_ACTION',
        name: 'Failing Action',
        description: 'An action that always fails',
        inputSchema: { type: 'object' as const, properties: {} },
        outputSchema: { type: 'object' as const, properties: {} },
        execute: async (): Promise<ActionOutput> => {
          throw new Error('Action failed');
        },
      };

      registry.register(failingAction);

      const result = await registry.execute('FAILING_ACTION', {}, createMockContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Action failed');
    });

    it('should throw error for unknown action type', async () => {
      await expect(
        registry.execute('UNKNOWN_ACTION', {}, createMockContext())
      ).rejects.toThrow('Unknown action type');
    });
  });

  describe('Action Categories', () => {
    it('should categorize actions', () => {
      const actions = registry.listActions();

      const communicationActions = actions.filter(a =>
        ['HTTP_REQUEST', 'SEND_EMAIL', 'SEND_SLACK'].includes(a.type)
      );
      const dataActions = actions.filter(a =>
        ['CREATE_RECORD', 'UPDATE_RECORD', 'DELETE_RECORD', 'QUERY_RECORDS'].includes(a.type)
      );
      const utilityActions = actions.filter(a =>
        ['LOG_MESSAGE', 'SET_VARIABLE', 'PUBLISH_EVENT'].includes(a.type)
      );

      expect(communicationActions.length).toBeGreaterThan(0);
      expect(dataActions.length).toBeGreaterThan(0);
      expect(utilityActions.length).toBeGreaterThan(0);
    });
  });
});
