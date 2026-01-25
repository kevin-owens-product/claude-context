/**
 * Workflow Templates - Pre-built automation patterns
 * @prompt-id forge-v4.1:service:workflow-templates:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type {
  WorkflowTriggerType,
  TriggerConfig,
  WorkflowConditions,
  WorkflowAction,
  EventTriggerConfig,
  SignalTriggerConfig,
  ScheduleTriggerConfig,
} from './workflow.service';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'escalation' | 'notification' | 'assignment' | 'status' | 'integration';
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  required: boolean;
  description: string;
}

// Pre-built workflow templates
export const workflowTemplates: WorkflowTemplate[] = [
  // 1. Escalate Blocked Items
  {
    id: 'template-escalate-blocked',
    name: 'Escalate Blocked Items',
    description: 'Notify team lead when a slice has been blocked for more than 3 days',
    category: 'escalation',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['updated'],
      entityTypes: ['slice'],
      filters: { 'payload.status': 'blocked' },
    } as EventTriggerConfig,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'entity.status', operator: 'equals', value: 'blocked' },
        { field: 'entity.updatedAt', operator: 'older_than', value: '3d' },
      ],
    },
    actions: [
      {
        type: 'NOTIFY',
        config: {
          channel: 'slack',
          recipients: ['team_lead'],
          message: 'Escalation: {{entity.name}} has been blocked for over 3 days. Please review.',
        },
        order: 1,
      },
      {
        type: 'UPDATE_FIELD',
        config: {
          field: 'priority',
          value: 'HIGH',
        },
        order: 2,
      },
    ],
    variables: [
      {
        key: 'blockedDays',
        label: 'Days Before Escalation',
        type: 'number',
        defaultValue: 3,
        required: true,
        description: 'Number of days before escalation triggers',
      },
      {
        key: 'notifyChannel',
        label: 'Notification Channel',
        type: 'select',
        defaultValue: 'slack',
        options: [
          { value: 'slack', label: 'Slack' },
          { value: 'email', label: 'Email' },
          { value: 'in_app', label: 'In-App' },
        ],
        required: true,
        description: 'Where to send the notification',
      },
    ],
  },

  // 2. Deal Stage Notifications
  {
    id: 'template-deal-stage-notify',
    name: 'Deal Stage Notifications',
    description: 'Notify Slack channel when a deal moves to a new stage',
    category: 'notification',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['updated'],
      entityTypes: ['deal'],
    } as EventTriggerConfig,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'previousState.stage', operator: 'not_equals', value: null },
        { field: 'entity.stage', operator: 'not_equals', value: null },
      ],
    },
    actions: [
      {
        type: 'NOTIFY',
        config: {
          channel: 'slack',
          recipients: ['all_team'],
          message: 'Deal Update: {{entity.name}} moved from {{previousState.stage}} to {{entity.stage}}. Value: ${{entity.value}}',
        },
        order: 1,
      },
    ],
    variables: [
      {
        key: 'slackChannel',
        label: 'Slack Channel',
        type: 'string',
        defaultValue: '#sales',
        required: true,
        description: 'Slack channel for notifications',
      },
    ],
  },

  // 3. Health Score Alert
  {
    id: 'template-health-alert',
    name: 'Customer Health Score Alert',
    description: 'Create a task for CSM when customer health drops below threshold',
    category: 'escalation',
    triggerType: 'SIGNAL',
    triggerConfig: {
      signalType: 'HEALTH_SCORE',
      condition: 'health_becomes',
      value: 'CRITICAL',
    } as SignalTriggerConfig,
    actions: [
      {
        type: 'NOTIFY',
        config: {
          channel: 'email',
          recipients: ['owner'],
          message: 'Urgent: Customer health score has dropped to CRITICAL. Immediate attention required.',
        },
        order: 1,
      },
      {
        type: 'CREATE_ENTITY',
        config: {
          entityType: 'task',
          data: {
            content: 'Follow up on customer health decline - {{signal.customerId}}',
            priority: 'HIGH',
          },
        },
        order: 2,
      },
    ],
    variables: [
      {
        key: 'healthThreshold',
        label: 'Health Threshold',
        type: 'select',
        defaultValue: 'CRITICAL',
        options: [
          { value: 'WARNING', label: 'Warning' },
          { value: 'CRITICAL', label: 'Critical' },
        ],
        required: true,
        description: 'Health level that triggers the alert',
      },
    ],
  },

  // 4. Release Announcement
  {
    id: 'template-release-announce',
    name: 'Release Announcement',
    description: 'Send announcement when a release is published',
    category: 'notification',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['updated'],
      entityTypes: ['release'],
      filters: { 'payload.status': 'published' },
    } as EventTriggerConfig,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'entity.status', operator: 'equals', value: 'published' },
        { field: 'previousState.status', operator: 'not_equals', value: 'published' },
      ],
    },
    actions: [
      {
        type: 'NOTIFY',
        config: {
          channel: 'email',
          recipients: ['all_team'],
          message: 'New Release: {{entity.name}} ({{entity.version}}) is now live!',
        },
        order: 1,
      },
      {
        type: 'WEBHOOK',
        config: {
          url: '{{secrets.ANNOUNCEMENT_WEBHOOK}}',
          method: 'POST',
          body: {
            release: '{{entity.name}}',
            version: '{{entity.version}}',
            notes: '{{entity.notes}}',
          },
        },
        order: 2,
      },
    ],
    variables: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'string',
        required: false,
        description: 'External webhook for announcements',
      },
    ],
  },

  // 5. Feature Request Triage
  {
    id: 'template-feature-triage',
    name: 'Feature Request Auto-Triage',
    description: 'Automatically assign feature requests based on category',
    category: 'assignment',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['created'],
      entityTypes: ['featureRequest'],
    } as EventTriggerConfig,
    actions: [
      {
        type: 'ASSIGN',
        config: {
          assignee: 'round_robin',
          fallback: 'team_lead',
        },
        order: 1,
      },
      {
        type: 'NOTIFY',
        config: {
          channel: 'in_app',
          recipients: ['owner'],
          message: 'New feature request assigned: {{entity.title}}',
        },
        order: 2,
      },
    ],
    variables: [
      {
        key: 'assignmentStrategy',
        label: 'Assignment Strategy',
        type: 'select',
        defaultValue: 'round_robin',
        options: [
          { value: 'round_robin', label: 'Round Robin' },
          { value: 'team_lead', label: 'Team Lead' },
          { value: 'least_loaded', label: 'Least Loaded' },
        ],
        required: true,
        description: 'How to assign new requests',
      },
    ],
  },

  // 6. Auto-Complete on PR Merge
  {
    id: 'template-pr-autocomplete',
    name: 'Auto-Complete on PR Merge',
    description: 'Automatically mark slice as completed when PR is merged',
    category: 'status',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['pr_merged'],
      entityTypes: ['slice'],
    } as EventTriggerConfig,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'entity.status', operator: 'equals', value: 'in_progress' },
      ],
    },
    actions: [
      {
        type: 'CHANGE_STATUS',
        config: {
          status: 'completed',
        },
        order: 1,
      },
      {
        type: 'CREATE_ENTITY',
        config: {
          entityType: 'comment',
          data: {
            content: 'Automatically completed - PR merged',
          },
        },
        order: 2,
      },
    ],
  },

  // 7. Weekly Summary Report
  {
    id: 'template-weekly-summary',
    name: 'Weekly Summary Report',
    description: 'Send a weekly summary of activity every Monday morning',
    category: 'notification',
    triggerType: 'SCHEDULE',
    triggerConfig: {
      cron: '0 9 * * 1',
      timezone: 'America/New_York',
    } as ScheduleTriggerConfig,
    actions: [
      {
        type: 'WEBHOOK',
        config: {
          url: '{{secrets.REPORT_WEBHOOK}}',
          method: 'POST',
          body: {
            type: 'weekly_summary',
            generatedAt: '{{metadata.timestamp}}',
          },
        },
        order: 1,
      },
      {
        type: 'NOTIFY',
        config: {
          channel: 'email',
          recipients: ['all_team'],
          message: 'Your weekly summary report is ready. Check your dashboard for details.',
        },
        order: 2,
      },
    ],
    variables: [
      {
        key: 'cronSchedule',
        label: 'Schedule',
        type: 'string',
        defaultValue: '0 9 * * 1',
        required: true,
        description: 'Cron expression for schedule',
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'string',
        defaultValue: 'America/New_York',
        required: true,
        description: 'Timezone for the schedule',
      },
    ],
  },

  // 8. High-Value Deal Alert
  {
    id: 'template-high-value-deal',
    name: 'High-Value Deal Alert',
    description: 'Alert leadership when a high-value deal is created or updated',
    category: 'notification',
    triggerType: 'EVENT',
    triggerConfig: {
      eventTypes: ['created', 'updated'],
      entityTypes: ['deal'],
    } as EventTriggerConfig,
    conditions: {
      operator: 'AND',
      rules: [
        { field: 'entity.value', operator: 'greater_than', value: 100000 },
      ],
    },
    actions: [
      {
        type: 'NOTIFY',
        config: {
          channel: 'slack',
          recipients: ['team_lead'],
          message: 'High-Value Deal Alert: {{entity.name}} - ${{entity.value}} | Stage: {{entity.stage}}',
        },
        order: 1,
      },
    ],
    variables: [
      {
        key: 'valueThreshold',
        label: 'Value Threshold ($)',
        type: 'number',
        defaultValue: 100000,
        required: true,
        description: 'Minimum deal value to trigger alert',
      },
    ],
  },
];

// Service class for template operations
export class WorkflowTemplatesService {
  /**
   * Get all available templates
   */
  getAllTemplates(): WorkflowTemplate[] {
    return workflowTemplates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
    return workflowTemplates.filter(t => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return workflowTemplates.find(t => t.id === templateId);
  }

  /**
   * Apply variable values to a template and return workflow data
   */
  applyTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): Omit<WorkflowTemplate, 'id' | 'category' | 'variables'> | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    // Deep clone the template
    const workflow = JSON.parse(JSON.stringify({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      conditions: template.conditions,
      actions: template.actions,
    }));

    // Apply variable substitutions
    const workflowStr = JSON.stringify(workflow);
    let result = workflowStr;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{variables\\.${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle special cases like blockedDays → older_than value
    if (variables.blockedDays && template.conditions) {
      const parsed = JSON.parse(result);
      if (parsed.conditions?.rules) {
        parsed.conditions.rules = parsed.conditions.rules.map((rule: any) => {
          if (rule.operator === 'older_than') {
            return { ...rule, value: `${variables.blockedDays}d` };
          }
          return rule;
        });
      }
      result = JSON.stringify(parsed);
    }

    return JSON.parse(result);
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(
    templateId: string,
    variables: Record<string, unknown>
  ): { valid: boolean; missing: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) return { valid: false, missing: [] };

    const missing: string[] = [];
    for (const variable of template.variables || []) {
      if (variable.required && !(variable.key in variables)) {
        missing.push(variable.key);
      }
    }

    return { valid: missing.length === 0, missing };
  }
}
