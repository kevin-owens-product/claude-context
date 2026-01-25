/**
 * ConditionEvaluator Tests
 *
 * @prompt-id forge-v4.1:test:condition-evaluator:001
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConditionEvaluator } from '../condition-evaluator';
import type { ConditionExpression, ExecutionContext } from '../types';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
  });

  const createContext = (data: Record<string, unknown>): ExecutionContext => ({
    execution: {
      id: 'exec_123' as any,
      workflowId: 'wf_123' as any,
      tenantId: 'tenant_123' as any,
      version: 1,
      status: 'RUNNING',
      startedAt: new Date(),
    },
    trigger: {
      type: 'MANUAL',
      data: {},
      timestamp: new Date(),
    },
    variables: data,
    secrets: {},
    tenant: { id: 'tenant_123' as any, name: 'Test Tenant', plan: 'enterprise' },
    stepResults: {},
    metadata: {},
    ...data,
  });

  describe('Simple conditions', () => {
    describe('equality operators', () => {
      it('should evaluate eq operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'status',
          operator: 'eq',
          value: 'active',
        };
        const context = createContext({ status: 'active' });

        expect(await evaluator.evaluate(condition, context)).toBe(true);
      });

      it('should evaluate eq operator with false result', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'status',
          operator: 'eq',
          value: 'active',
        };
        const context = createContext({ status: 'inactive' });

        expect(await evaluator.evaluate(condition, context)).toBe(false);
      });

      it('should evaluate ne operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'status',
          operator: 'ne',
          value: 'blocked',
        };
        const context = createContext({ status: 'active' });

        expect(await evaluator.evaluate(condition, context)).toBe(true);
      });
    });

    describe('comparison operators', () => {
      it('should evaluate gt operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'count',
          operator: 'gt',
          value: 10,
        };

        expect(await evaluator.evaluate(condition, createContext({ count: 15 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 10 }))).toBe(false);
        expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(false);
      });

      it('should evaluate gte operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'count',
          operator: 'gte',
          value: 10,
        };

        expect(await evaluator.evaluate(condition, createContext({ count: 15 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 10 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(false);
      });

      it('should evaluate lt operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'count',
          operator: 'lt',
          value: 10,
        };

        expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 10 }))).toBe(false);
      });

      it('should evaluate lte operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'count',
          operator: 'lte',
          value: 10,
        };

        expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 10 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 15 }))).toBe(false);
      });

      it('should evaluate between operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'count',
          operator: 'between',
          value: [5, 15],
        };

        expect(await evaluator.evaluate(condition, createContext({ count: 10 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 15 }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ count: 20 }))).toBe(false);
        expect(await evaluator.evaluate(condition, createContext({ count: 3 }))).toBe(false);
      });
    });

    describe('collection operators', () => {
      it('should evaluate in operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'status',
          operator: 'in',
          value: ['active', 'pending', 'processing'],
        };

        expect(await evaluator.evaluate(condition, createContext({ status: 'active' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ status: 'blocked' }))).toBe(false);
      });

      it('should evaluate nin operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'status',
          operator: 'nin',
          value: ['blocked', 'cancelled'],
        };

        expect(await evaluator.evaluate(condition, createContext({ status: 'active' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ status: 'blocked' }))).toBe(false);
      });

      it('should evaluate contains operator for strings', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'message',
          operator: 'contains',
          value: 'error',
        };

        expect(await evaluator.evaluate(condition, createContext({ message: 'An error occurred' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ message: 'Success!' }))).toBe(false);
      });

      it('should evaluate contains operator for arrays', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'tags',
          operator: 'contains',
          value: 'urgent',
        };

        expect(await evaluator.evaluate(condition, createContext({ tags: ['urgent', 'important'] }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ tags: ['normal'] }))).toBe(false);
      });
    });

    describe('string operators', () => {
      it('should evaluate startsWith operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'email',
          operator: 'startsWith',
          value: 'admin@',
        };

        expect(await evaluator.evaluate(condition, createContext({ email: 'admin@example.com' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ email: 'user@example.com' }))).toBe(false);
      });

      it('should evaluate endsWith operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'email',
          operator: 'endsWith',
          value: '@example.com',
        };

        expect(await evaluator.evaluate(condition, createContext({ email: 'admin@example.com' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ email: 'admin@other.com' }))).toBe(false);
      });

      it('should evaluate matches operator with regex', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'code',
          operator: 'matches',
          value: '^[A-Z]{3}-\\d{4}$',
        };

        expect(await evaluator.evaluate(condition, createContext({ code: 'ABC-1234' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ code: 'abc-1234' }))).toBe(false);
        expect(await evaluator.evaluate(condition, createContext({ code: 'ABCD-1234' }))).toBe(false);
      });
    });

    describe('null/empty operators', () => {
      it('should evaluate isNull operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'value',
          operator: 'isNull',
          value: true,
        };

        expect(await evaluator.evaluate(condition, createContext({ value: null }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ value: undefined }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ value: 'something' }))).toBe(false);
      });

      it('should evaluate isNotNull operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'value',
          operator: 'isNotNull',
          value: true,
        };

        expect(await evaluator.evaluate(condition, createContext({ value: 'something' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ value: null }))).toBe(false);
      });

      it('should evaluate isEmpty operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'items',
          operator: 'isEmpty',
          value: true,
        };

        expect(await evaluator.evaluate(condition, createContext({ items: [] }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ items: '' }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ items: {} }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ items: ['item'] }))).toBe(false);
      });

      it('should evaluate isNotEmpty operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'items',
          operator: 'isNotEmpty',
          value: true,
        };

        expect(await evaluator.evaluate(condition, createContext({ items: ['item'] }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ items: [] }))).toBe(false);
      });
    });

    describe('date operators', () => {
      it('should evaluate olderThan operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'createdAt',
          operator: 'olderThan',
          value: '1d',
        };

        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        expect(await evaluator.evaluate(condition, createContext({ createdAt: twoDaysAgo }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ createdAt: oneHourAgo }))).toBe(false);
      });

      it('should evaluate newerThan operator', async () => {
        const condition: ConditionExpression = {
          type: 'SIMPLE',
          field: 'updatedAt',
          operator: 'newerThan',
          value: '1h',
        };

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

        expect(await evaluator.evaluate(condition, createContext({ updatedAt: tenMinutesAgo }))).toBe(true);
        expect(await evaluator.evaluate(condition, createContext({ updatedAt: twoDaysAgo }))).toBe(false);
      });
    });
  });

  describe('Compound conditions', () => {
    it('should evaluate AND logic', async () => {
      const condition: ConditionExpression = {
        type: 'COMPOUND',
        logic: 'AND',
        conditions: [
          { type: 'SIMPLE', field: 'status', operator: 'eq', value: 'active' },
          { type: 'SIMPLE', field: 'priority', operator: 'eq', value: 'high' },
        ],
      };

      expect(await evaluator.evaluate(condition, createContext({ status: 'active', priority: 'high' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ status: 'active', priority: 'low' }))).toBe(false);
      expect(await evaluator.evaluate(condition, createContext({ status: 'inactive', priority: 'high' }))).toBe(false);
    });

    it('should evaluate OR logic', async () => {
      const condition: ConditionExpression = {
        type: 'COMPOUND',
        logic: 'OR',
        conditions: [
          { type: 'SIMPLE', field: 'status', operator: 'eq', value: 'critical' },
          { type: 'SIMPLE', field: 'priority', operator: 'eq', value: 'high' },
        ],
      };

      expect(await evaluator.evaluate(condition, createContext({ status: 'critical', priority: 'low' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ status: 'normal', priority: 'high' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ status: 'normal', priority: 'low' }))).toBe(false);
    });

    it('should evaluate NOT logic', async () => {
      const condition: ConditionExpression = {
        type: 'COMPOUND',
        logic: 'NOT',
        conditions: [
          { type: 'SIMPLE', field: 'status', operator: 'eq', value: 'blocked' },
        ],
      };

      expect(await evaluator.evaluate(condition, createContext({ status: 'active' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ status: 'blocked' }))).toBe(false);
    });

    it('should evaluate nested compound conditions', async () => {
      const condition: ConditionExpression = {
        type: 'COMPOUND',
        logic: 'AND',
        conditions: [
          { type: 'SIMPLE', field: 'isActive', operator: 'eq', value: true },
          {
            type: 'COMPOUND',
            logic: 'OR',
            conditions: [
              { type: 'SIMPLE', field: 'priority', operator: 'eq', value: 'high' },
              { type: 'SIMPLE', field: 'priority', operator: 'eq', value: 'critical' },
            ],
          },
        ],
      };

      expect(await evaluator.evaluate(condition, createContext({ isActive: true, priority: 'high' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ isActive: true, priority: 'critical' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ isActive: true, priority: 'low' }))).toBe(false);
      expect(await evaluator.evaluate(condition, createContext({ isActive: false, priority: 'high' }))).toBe(false);
    });
  });

  describe('Expression conditions', () => {
    it('should evaluate simple expression', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: 'count > 10',
      };

      expect(await evaluator.evaluate(condition, createContext({ count: 15 }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ count: 5 }))).toBe(false);
    });

    it('should evaluate expression with equality', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: 'status == "active"',
      };

      expect(await evaluator.evaluate(condition, createContext({ status: 'active' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ status: 'inactive' }))).toBe(false);
    });

    it('should evaluate expression with AND', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: 'count > 5 && status == "active"',
      };

      expect(await evaluator.evaluate(condition, createContext({ count: 10, status: 'active' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ count: 3, status: 'active' }))).toBe(false);
      expect(await evaluator.evaluate(condition, createContext({ count: 10, status: 'inactive' }))).toBe(false);
    });

    it('should evaluate expression with OR', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: 'priority == "high" || priority == "critical"',
      };

      expect(await evaluator.evaluate(condition, createContext({ priority: 'high' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ priority: 'critical' }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ priority: 'low' }))).toBe(false);
    });

    it('should evaluate expression with NOT', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: '!isBlocked == true',
      };

      expect(await evaluator.evaluate(condition, createContext({ isBlocked: false }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ isBlocked: true }))).toBe(false);
    });

    it('should evaluate expression with parentheses', async () => {
      const condition: ConditionExpression = {
        type: 'EXPRESSION',
        expression: '(count > 5 || priority == "high") && isActive == true',
      };

      expect(await evaluator.evaluate(condition, createContext({ count: 10, priority: 'low', isActive: true }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ count: 3, priority: 'high', isActive: true }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ count: 3, priority: 'low', isActive: true }))).toBe(false);
      expect(await evaluator.evaluate(condition, createContext({ count: 10, priority: 'high', isActive: false }))).toBe(false);
    });
  });

  describe('Field resolution', () => {
    it('should resolve nested fields', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'user.profile.name',
        operator: 'eq',
        value: 'John',
      };

      const context = createContext({
        user: {
          profile: {
            name: 'John',
          },
        },
      });

      expect(await evaluator.evaluate(condition, context)).toBe(true);
    });

    it('should resolve array indexing', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'items[0].name',
        operator: 'eq',
        value: 'First',
      };

      const context = createContext({
        items: [
          { name: 'First' },
          { name: 'Second' },
        ],
      });

      expect(await evaluator.evaluate(condition, context)).toBe(true);
    });

    it('should return undefined for missing fields', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'nonexistent.field',
        operator: 'isNull',
        value: true,
      };

      expect(await evaluator.evaluate(condition, createContext({}))).toBe(true);
    });
  });

  describe('Deep equality', () => {
    it('should compare arrays deeply', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'tags',
        operator: 'eq',
        value: ['a', 'b', 'c'],
      };

      expect(await evaluator.evaluate(condition, createContext({ tags: ['a', 'b', 'c'] }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ tags: ['a', 'b'] }))).toBe(false);
      expect(await evaluator.evaluate(condition, createContext({ tags: ['c', 'b', 'a'] }))).toBe(false);
    });

    it('should compare objects deeply', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'config',
        operator: 'eq',
        value: { enabled: true, count: 5 },
      };

      expect(await evaluator.evaluate(condition, createContext({ config: { enabled: true, count: 5 } }))).toBe(true);
      expect(await evaluator.evaluate(condition, createContext({ config: { enabled: true, count: 10 } }))).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should throw on unknown condition type', async () => {
      const condition = { type: 'UNKNOWN' } as any;

      await expect(evaluator.evaluate(condition, createContext({}))).rejects.toThrow('Unknown condition type');
    });

    it('should throw on unknown operator', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'value',
        operator: 'unknown' as any,
        value: true,
      };

      await expect(evaluator.evaluate(condition, createContext({ value: true }))).rejects.toThrow('Unknown operator');
    });

    it('should throw on invalid between value', async () => {
      const condition: ConditionExpression = {
        type: 'SIMPLE',
        field: 'count',
        operator: 'between',
        value: [5], // Should be [min, max]
      };

      await expect(evaluator.evaluate(condition, createContext({ count: 10 }))).rejects.toThrow('between operator requires [min, max] array');
    });
  });
});
