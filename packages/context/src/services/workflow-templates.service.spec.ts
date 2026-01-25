/**
 * WorkflowTemplatesService Unit Tests
 * @prompt-id forge-v4.1:test:workflow-templates-service:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect } from 'vitest';
import { WorkflowTemplatesService, workflowTemplates } from './workflow-templates.service';

describe('WorkflowTemplatesService', () => {
  const service = new WorkflowTemplatesService();

  describe('getAllTemplates', () => {
    it('should return all pre-built templates', () => {
      const templates = service.getAllTemplates();

      expect(templates).toHaveLength(workflowTemplates.length);
      expect(templates).toEqual(workflowTemplates);
    });

    it('should include required template properties', () => {
      const templates = service.getAllTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('triggerType');
        expect(template).toHaveProperty('triggerConfig');
        expect(template).toHaveProperty('actions');
        expect(template.actions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return escalation templates', () => {
      const templates = service.getTemplatesByCategory('escalation');

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('escalation'));
    });

    it('should return notification templates', () => {
      const templates = service.getTemplatesByCategory('notification');

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('notification'));
    });

    it('should return assignment templates', () => {
      const templates = service.getTemplatesByCategory('assignment');

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('assignment'));
    });

    it('should return status templates', () => {
      const templates = service.getTemplatesByCategory('status');

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('status'));
    });

    it('should return empty array for unknown category', () => {
      const templates = service.getTemplatesByCategory('unknown' as any);

      expect(templates).toHaveLength(0);
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template by ID', () => {
      const template = service.getTemplate('template-escalate-blocked');

      expect(template).toBeDefined();
      expect(template?.id).toBe('template-escalate-blocked');
      expect(template?.name).toBe('Escalate Blocked Items');
    });

    it('should return undefined for non-existent template', () => {
      const template = service.getTemplate('non-existent-id');

      expect(template).toBeUndefined();
    });
  });

  describe('validateVariables', () => {
    it('should pass validation when all required variables are provided', () => {
      const result = service.validateVariables('template-escalate-blocked', {
        blockedDays: 5,
        notifyChannel: 'email',
      });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail validation when required variables are missing', () => {
      const result = service.validateVariables('template-escalate-blocked', {});

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('blockedDays');
      expect(result.missing).toContain('notifyChannel');
    });

    it('should pass validation with partial required variables', () => {
      const result = service.validateVariables('template-escalate-blocked', {
        blockedDays: 3,
      });

      // Still missing notifyChannel
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('notifyChannel');
      expect(result.missing).not.toContain('blockedDays');
    });

    it('should return invalid for non-existent template', () => {
      const result = service.validateVariables('non-existent', {});

      expect(result.valid).toBe(false);
    });
  });

  describe('applyTemplate', () => {
    it('should return workflow data with applied variables', () => {
      const result = service.applyTemplate('template-escalate-blocked', {
        blockedDays: 7,
        notifyChannel: 'email',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Escalate Blocked Items');
      expect(result?.triggerType).toBe('EVENT');
      expect(result?.actions).toHaveLength(2);
    });

    it('should update older_than value based on blockedDays variable', () => {
      const result = service.applyTemplate('template-escalate-blocked', {
        blockedDays: 5,
        notifyChannel: 'slack',
      });

      expect(result?.conditions?.rules).toBeDefined();
      const olderThanRule = result?.conditions?.rules.find(
        (r: any) => r.operator === 'older_than'
      );
      expect(olderThanRule?.value).toBe('5d');
    });

    it('should return null for non-existent template', () => {
      const result = service.applyTemplate('non-existent', {});

      expect(result).toBeNull();
    });

    it('should preserve action order', () => {
      const result = service.applyTemplate('template-escalate-blocked', {
        blockedDays: 3,
        notifyChannel: 'slack',
      });

      expect(result?.actions[0].order).toBe(1);
      expect(result?.actions[1].order).toBe(2);
    });
  });

  describe('template content validation', () => {
    it('should have valid trigger configs for EVENT templates', () => {
      const eventTemplates = workflowTemplates.filter(t => t.triggerType === 'EVENT');

      eventTemplates.forEach(template => {
        const config = template.triggerConfig as any;
        expect(config.eventTypes).toBeDefined();
        expect(Array.isArray(config.eventTypes)).toBe(true);
        expect(config.entityTypes).toBeDefined();
        expect(Array.isArray(config.entityTypes)).toBe(true);
      });
    });

    it('should have valid trigger configs for SIGNAL templates', () => {
      const signalTemplates = workflowTemplates.filter(t => t.triggerType === 'SIGNAL');

      signalTemplates.forEach(template => {
        const config = template.triggerConfig as any;
        expect(config.signalType).toBeDefined();
        expect(config.condition).toBeDefined();
      });
    });

    it('should have valid trigger configs for SCHEDULE templates', () => {
      const scheduleTemplates = workflowTemplates.filter(t => t.triggerType === 'SCHEDULE');

      scheduleTemplates.forEach(template => {
        const config = template.triggerConfig as any;
        expect(config.cron).toBeDefined();
        expect(config.timezone).toBeDefined();
      });
    });

    it('should have valid action types', () => {
      const validActionTypes = ['CHANGE_STATUS', 'NOTIFY', 'WEBHOOK', 'CREATE_ENTITY', 'ASSIGN', 'UPDATE_FIELD'];

      workflowTemplates.forEach(template => {
        template.actions.forEach(action => {
          expect(validActionTypes).toContain(action.type);
          expect(action.order).toBeGreaterThan(0);
          expect(action.config).toBeDefined();
        });
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['escalation', 'notification', 'assignment', 'status', 'integration'];

      workflowTemplates.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });
  });

  describe('specific template tests', () => {
    it('Escalate Blocked Items template should have correct structure', () => {
      const template = service.getTemplate('template-escalate-blocked');

      expect(template?.category).toBe('escalation');
      expect(template?.triggerType).toBe('EVENT');
      expect(template?.conditions?.operator).toBe('AND');
      expect(template?.conditions?.rules).toHaveLength(2);
      expect(template?.actions).toHaveLength(2);
      expect(template?.variables).toHaveLength(2);
    });

    it('Deal Stage Notifications template should have correct structure', () => {
      const template = service.getTemplate('template-deal-stage-notify');

      expect(template?.category).toBe('notification');
      expect(template?.actions[0].type).toBe('NOTIFY');
      expect(template?.actions[0].config.channel).toBe('slack');
    });

    it('Weekly Summary Report template should have valid cron', () => {
      const template = service.getTemplate('template-weekly-summary');

      expect(template?.triggerType).toBe('SCHEDULE');
      const config = template?.triggerConfig as any;
      expect(config.cron).toBe('0 9 * * 1');
      expect(config.timezone).toBe('America/New_York');
    });

    it('High-Value Deal Alert should have numeric threshold', () => {
      const template = service.getTemplate('template-high-value-deal');

      expect(template?.conditions?.rules).toBeDefined();
      const rule = template?.conditions?.rules[0];
      expect(rule?.field).toBe('entity.value');
      expect(rule?.operator).toBe('greater_than');
      expect(typeof rule?.value).toBe('number');
    });
  });
});
