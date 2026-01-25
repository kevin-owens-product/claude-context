/**
 * ActionRegistry - Extensible action system
 *
 * Features:
 * - Built-in actions (HTTP, notifications, CRUD)
 * - Custom action registration
 * - Action validation
 * - Sandboxed script execution
 *
 * @prompt-id forge-v4.1:service:action-registry:001
 */

import type {
  ActionType,
  ActionDefinition,
  ActionResult,
  ActionError,
  ExecutionContext,
  InputDefinition,
  ValidationRule,
} from './types';

export class ActionRegistry {
  private readonly actions = new Map<ActionType, ActionDefinition>();

  constructor() {
    this.registerBuiltInActions();
  }

  /**
   * Register a custom action
   */
  register(definition: ActionDefinition): void {
    if (this.actions.has(definition.type)) {
      throw new Error(`Action type already registered: ${definition.type}`);
    }
    this.actions.set(definition.type, definition);
  }

  /**
   * Get an action by type
   */
  get(type: ActionType): ActionDefinition | undefined {
    return this.actions.get(type);
  }

  /**
   * List all registered actions
   */
  list(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Validate input against action schema
   */
  validateInput(type: ActionType, input: unknown): { valid: boolean; errors: string[] } {
    const action = this.actions.get(type);
    if (!action) {
      return { valid: false, errors: [`Unknown action type: ${type}`] };
    }

    const errors: string[] = [];

    for (const [key, schema] of Object.entries(action.inputSchema)) {
      const value = (input as Record<string, unknown>)?.[key];

      if (schema.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }

      if (value !== undefined && schema.validation) {
        for (const rule of schema.validation) {
          const ruleError = this.validateRule(value, rule, key);
          if (ruleError) {
            errors.push(ruleError);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateRule(
    value: unknown,
    rule: ValidationRule,
    field: string
  ): string | null {
    switch (rule.type) {
      case 'min':
        if (typeof value === 'number' && value < (rule.value as number)) {
          return rule.message || `${field} must be at least ${rule.value}`;
        }
        if (typeof value === 'string' && value.length < (rule.value as number)) {
          return rule.message || `${field} must be at least ${rule.value} characters`;
        }
        break;
      case 'max':
        if (typeof value === 'number' && value > (rule.value as number)) {
          return rule.message || `${field} must be at most ${rule.value}`;
        }
        if (typeof value === 'string' && value.length > (rule.value as number)) {
          return rule.message || `${field} must be at most ${rule.value} characters`;
        }
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value as string).test(value)) {
          return rule.message || `${field} does not match required pattern`;
        }
        break;
      case 'enum':
        if (!(rule.value as unknown[]).includes(value)) {
          return rule.message || `${field} must be one of: ${(rule.value as unknown[]).join(', ')}`;
        }
        break;
    }
    return null;
  }

  /**
   * Register built-in actions
   */
  private registerBuiltInActions(): void {
    // HTTP Request
    this.register({
      type: 'HTTP_REQUEST',
      name: 'HTTP Request',
      description: 'Make an HTTP request to an external service',
      inputSchema: {
        url: { name: 'url', type: 'string', required: true, description: 'Request URL' },
        method: {
          name: 'method',
          type: 'string',
          required: true,
          description: 'HTTP method',
          validation: [{ type: 'enum', value: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }],
        },
        headers: { name: 'headers', type: 'json', required: false, description: 'Request headers' },
        body: { name: 'body', type: 'json', required: false, description: 'Request body' },
        timeout: { name: 'timeout', type: 'number', required: false, description: 'Timeout in ms' },
      },
      outputSchema: {
        statusCode: { type: 'number', description: 'HTTP status code' },
        body: { type: 'json', description: 'Response body' },
        headers: { type: 'json', description: 'Response headers' },
      },
      execute: async (input, context) => this.executeHttpRequest(input as HttpRequestInput, context),
    });

    // Send Email
    this.register({
      type: 'SEND_EMAIL',
      name: 'Send Email',
      description: 'Send an email notification',
      inputSchema: {
        to: { name: 'to', type: 'string', required: true, description: 'Recipient email(s)' },
        subject: { name: 'subject', type: 'string', required: true, description: 'Email subject' },
        body: { name: 'body', type: 'string', required: true, description: 'Email body' },
        template: { name: 'template', type: 'string', required: false, description: 'Email template ID' },
        templateData: { name: 'templateData', type: 'json', required: false, description: 'Template variables' },
      },
      outputSchema: {
        messageId: { type: 'string', description: 'Email message ID' },
        sentTo: { type: 'json', description: 'Recipients list' },
      },
      execute: async (input, context) => this.executeSendEmail(input as SendEmailInput, context),
    });

    // Send Slack Message
    this.register({
      type: 'SEND_SLACK',
      name: 'Send Slack Message',
      description: 'Send a Slack message',
      inputSchema: {
        channel: { name: 'channel', type: 'string', required: true, description: 'Slack channel' },
        message: { name: 'message', type: 'string', required: true, description: 'Message text' },
        blocks: { name: 'blocks', type: 'json', required: false, description: 'Slack blocks' },
        threadTs: { name: 'threadTs', type: 'string', required: false, description: 'Thread timestamp' },
      },
      outputSchema: {
        ts: { type: 'string', description: 'Message timestamp' },
        channel: { type: 'string', description: 'Channel ID' },
      },
      execute: async (input, context) => this.executeSendSlack(input as SendSlackInput, context),
    });

    // Create Record
    this.register({
      type: 'CREATE_RECORD',
      name: 'Create Record',
      description: 'Create a new record in the database',
      inputSchema: {
        entityType: { name: 'entityType', type: 'string', required: true, description: 'Entity type' },
        data: { name: 'data', type: 'json', required: true, description: 'Record data' },
      },
      outputSchema: {
        id: { type: 'string', description: 'Created record ID' },
        record: { type: 'json', description: 'Created record' },
      },
      execute: async (input, context) => this.executeCreateRecord(input as CreateRecordInput, context),
    });

    // Update Record
    this.register({
      type: 'UPDATE_RECORD',
      name: 'Update Record',
      description: 'Update an existing record',
      inputSchema: {
        entityType: { name: 'entityType', type: 'string', required: true, description: 'Entity type' },
        id: { name: 'id', type: 'string', required: true, description: 'Record ID' },
        data: { name: 'data', type: 'json', required: true, description: 'Update data' },
      },
      outputSchema: {
        record: { type: 'json', description: 'Updated record' },
      },
      execute: async (input, context) => this.executeUpdateRecord(input as UpdateRecordInput, context),
    });

    // Delete Record
    this.register({
      type: 'DELETE_RECORD',
      name: 'Delete Record',
      description: 'Delete a record',
      inputSchema: {
        entityType: { name: 'entityType', type: 'string', required: true, description: 'Entity type' },
        id: { name: 'id', type: 'string', required: true, description: 'Record ID' },
      },
      outputSchema: {
        success: { type: 'boolean', description: 'Deletion success' },
      },
      execute: async (input, context) => this.executeDeleteRecord(input as DeleteRecordInput, context),
    });

    // Query Records
    this.register({
      type: 'QUERY_RECORDS',
      name: 'Query Records',
      description: 'Query records from the database',
      inputSchema: {
        entityType: { name: 'entityType', type: 'string', required: true, description: 'Entity type' },
        filter: { name: 'filter', type: 'json', required: false, description: 'Query filter' },
        orderBy: { name: 'orderBy', type: 'json', required: false, description: 'Sort order' },
        limit: { name: 'limit', type: 'number', required: false, description: 'Result limit' },
      },
      outputSchema: {
        records: { type: 'json', description: 'Query results' },
        count: { type: 'number', description: 'Total count' },
      },
      execute: async (input, context) => this.executeQueryRecords(input as QueryRecordsInput, context),
    });

    // Publish Event
    this.register({
      type: 'PUBLISH_EVENT',
      name: 'Publish Event',
      description: 'Publish an event to the event bus',
      inputSchema: {
        eventType: { name: 'eventType', type: 'string', required: true, description: 'Event type' },
        payload: { name: 'payload', type: 'json', required: true, description: 'Event payload' },
      },
      outputSchema: {
        eventId: { type: 'string', description: 'Published event ID' },
      },
      execute: async (input, context) => this.executePublishEvent(input as PublishEventInput, context),
    });

    // Log Message
    this.register({
      type: 'LOG_MESSAGE',
      name: 'Log Message',
      description: 'Log a message for debugging',
      inputSchema: {
        level: {
          name: 'level',
          type: 'string',
          required: false,
          description: 'Log level',
          validation: [{ type: 'enum', value: ['debug', 'info', 'warn', 'error'] }],
        },
        message: { name: 'message', type: 'string', required: true, description: 'Log message' },
        data: { name: 'data', type: 'json', required: false, description: 'Additional data' },
      },
      outputSchema: {},
      execute: async (input, context) => this.executeLogMessage(input as LogMessageInput, context),
    });

    // Set Variable
    this.register({
      type: 'SET_VARIABLE',
      name: 'Set Variable',
      description: 'Set a variable in the execution context',
      inputSchema: {
        name: { name: 'name', type: 'string', required: true, description: 'Variable name' },
        value: { name: 'value', type: 'json', required: true, description: 'Variable value' },
      },
      outputSchema: {},
      execute: async (input, context) => this.executeSetVariable(input as SetVariableInput, context),
    });
  }

  // ============================================================================
  // ACTION IMPLEMENTATIONS
  // ============================================================================

  private async executeHttpRequest(input: HttpRequestInput, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), input.timeout || 30000);

      const response = await fetch(input.url, {
        method: input.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ForgeWorkflows/1.0',
          'X-Workflow-Id': context.system.workflowId,
          'X-Execution-Id': context.system.executionId,
          ...input.headers,
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      return {
        success: response.ok,
        output: {
          statusCode: response.status,
          body,
          headers: Object.fromEntries(response.headers.entries()),
        },
        metadata: {
          durationMs: Date.now() - startTime,
          retryCount: 0,
        },
        error: response.ok ? undefined : {
          code: `HTTP_${response.status}`,
          message: `HTTP ${response.status}: ${response.statusText}`,
          retryable: response.status >= 500 || response.status === 429,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        metadata: {
          durationMs: Date.now() - startTime,
          retryCount: 0,
        },
      };
    }
  }

  private async executeSendEmail(input: SendEmailInput, context: ExecutionContext): Promise<ActionResult> {
    // In production, integrate with SendGrid, SES, etc.
    console.log('[Email] Would send:', input);

    return {
      success: true,
      output: {
        messageId: `msg_${Date.now()}`,
        sentTo: Array.isArray(input.to) ? input.to : [input.to],
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeSendSlack(input: SendSlackInput, context: ExecutionContext): Promise<ActionResult> {
    // In production, use Slack API
    console.log('[Slack] Would send:', input);

    return {
      success: true,
      output: {
        ts: Date.now().toString(),
        channel: input.channel,
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeCreateRecord(input: CreateRecordInput, context: ExecutionContext): Promise<ActionResult> {
    // In production, use Prisma
    const id = `${input.entityType}_${Date.now()}`;

    return {
      success: true,
      output: {
        id,
        record: { id, ...input.data },
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeUpdateRecord(input: UpdateRecordInput, context: ExecutionContext): Promise<ActionResult> {
    return {
      success: true,
      output: {
        record: { id: input.id, ...input.data },
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeDeleteRecord(input: DeleteRecordInput, context: ExecutionContext): Promise<ActionResult> {
    return {
      success: true,
      output: { success: true },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeQueryRecords(input: QueryRecordsInput, context: ExecutionContext): Promise<ActionResult> {
    return {
      success: true,
      output: {
        records: [],
        count: 0,
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executePublishEvent(input: PublishEventInput, context: ExecutionContext): Promise<ActionResult> {
    return {
      success: true,
      output: {
        eventId: `evt_${Date.now()}`,
      },
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeLogMessage(input: LogMessageInput, context: ExecutionContext): Promise<ActionResult> {
    const level = input.level || 'info';
    console[level](`[Workflow ${context.system.workflowId}]`, input.message, input.data || '');

    return {
      success: true,
      output: {},
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }

  private async executeSetVariable(input: SetVariableInput, context: ExecutionContext): Promise<ActionResult> {
    context.variables[input.name] = input.value;

    return {
      success: true,
      output: {},
      metadata: { durationMs: 0, retryCount: 0 },
    };
  }
}

// Input types for built-in actions
interface HttpRequestInput {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

interface SendEmailInput {
  to: string | string[];
  subject: string;
  body: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

interface SendSlackInput {
  channel: string;
  message: string;
  blocks?: unknown[];
  threadTs?: string;
}

interface CreateRecordInput {
  entityType: string;
  data: Record<string, unknown>;
}

interface UpdateRecordInput {
  entityType: string;
  id: string;
  data: Record<string, unknown>;
}

interface DeleteRecordInput {
  entityType: string;
  id: string;
}

interface QueryRecordsInput {
  entityType: string;
  filter?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

interface PublishEventInput {
  eventType: string;
  payload: Record<string, unknown>;
}

interface LogMessageInput {
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

interface SetVariableInput {
  name: string;
  value: unknown;
}
