/**
 * Workflow Service - Manages workflow automation engine
 * @prompt-id forge-v4.1:service:workflow:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Prisma, type PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export type WorkflowId = string & { __brand: 'WorkflowId' };
export type WorkflowExecutionId = string & { __brand: 'WorkflowExecutionId' };

export type WorkflowTriggerType = 'EVENT' | 'SIGNAL' | 'SCHEDULE' | 'MANUAL';
export type WorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ConditionOperator = 'AND' | 'OR';
export type RuleOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'greater_than' | 'less_than' | 'older_than' | 'newer_than' | 'is_null' | 'is_not_null';

export type ActionType = 'CHANGE_STATUS' | 'NOTIFY' | 'WEBHOOK' | 'CREATE_ENTITY' | 'ASSIGN' | 'UPDATE_FIELD';

export interface ConditionRule {
  field: string;
  operator: RuleOperator;
  value: unknown;
}

export interface WorkflowConditions {
  operator: ConditionOperator;
  rules: ConditionRule[];
}

export interface EventTriggerConfig {
  eventTypes: string[];
  entityTypes: string[];
  filters?: Record<string, unknown>;
}

export interface SignalTriggerConfig {
  signalType: string;
  condition: 'health_becomes' | 'crosses_threshold';
  value: string | number;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone: string;
}

export interface ManualTriggerConfig {
  allowedRoles?: string[];
}

export type TriggerConfig = EventTriggerConfig | SignalTriggerConfig | ScheduleTriggerConfig | ManualTriggerConfig;

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
}

export interface ActionResult {
  actionType: ActionType;
  order: number;
  success: boolean;
  result?: unknown;
  error?: string;
  executedAt: Date;
}

export interface Workflow {
  id: WorkflowId;
  tenantId: TenantId;
  name: string;
  description?: string;
  isEnabled: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  createdById: UserId;
  createdAt: Date;
  updatedAt: Date;
  runCount: number;
  lastRunAt?: Date;
}

export interface WorkflowExecution {
  id: WorkflowExecutionId;
  workflowId: WorkflowId;
  tenantId: TenantId;
  status: WorkflowExecutionStatus;
  triggerEventId?: string;
  triggerData: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  actionsExecuted?: ActionResult[];
  error?: string;
  workflow?: Workflow;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: TriggerConfig;
  conditions?: WorkflowConditions;
  actions: WorkflowAction[];
  createdById: UserId;
  isEnabled?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  triggerType?: WorkflowTriggerType;
  triggerConfig?: TriggerConfig;
  conditions?: WorkflowConditions | null;
  actions?: WorkflowAction[];
  isEnabled?: boolean;
}

export interface WorkflowFilter {
  triggerType?: WorkflowTriggerType;
  isEnabled?: boolean;
  search?: string;
}

export interface TriggerContext {
  eventType?: string;
  entityType?: string;
  entityId?: string;
  entity?: Record<string, unknown>;
  signal?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class WorkflowService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // WORKFLOW CRUD
  // ============================================================================

  async listWorkflows(
    tenantId: TenantId,
    options: PaginationOptions & WorkflowFilter = {}
  ): Promise<PaginatedResult<Workflow>> {
    const { limit = 20, offset = 0, triggerType, isEnabled, search } = options;

    const where: any = { tenantId };
    if (triggerType) where.triggerType = triggerType;
    if (isEnabled !== undefined) where.isEnabled = isEnabled;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      data: data.map(this.mapToWorkflow),
      total,
      limit,
      offset,
    };
  }

  async getWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId
  ): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
    });

    return workflow ? this.mapToWorkflow(workflow) : null;
  }

  async createWorkflow(
    tenantId: TenantId,
    request: CreateWorkflowRequest
  ): Promise<Workflow> {
    // Validate trigger config
    this.validateTriggerConfig(request.triggerType, request.triggerConfig);

    // Validate actions
    this.validateActions(request.actions);

    const workflow = await this.prisma.workflow.create({
      data: {
        tenantId,
        name: request.name,
        description: request.description,
        triggerType: request.triggerType,
        triggerConfig: request.triggerConfig as unknown as Prisma.InputJsonValue,
        conditions: request.conditions ? (request.conditions as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        actions: request.actions as unknown as Prisma.InputJsonValue,
        createdById: request.createdById,
        isEnabled: request.isEnabled ?? true,
      },
    });

    return this.mapToWorkflow(workflow);
  }

  async updateWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    request: UpdateWorkflowRequest
  ): Promise<Workflow | null> {
    const existing = await this.getWorkflow(tenantId, workflowId);
    if (!existing) return null;

    // Validate if trigger config is being updated
    if (request.triggerType || request.triggerConfig) {
      const triggerType = request.triggerType || existing.triggerType;
      const triggerConfig = request.triggerConfig || existing.triggerConfig;
      this.validateTriggerConfig(triggerType, triggerConfig);
    }

    // Validate actions if being updated
    if (request.actions) {
      this.validateActions(request.actions);
    }

    const workflow = await this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.triggerType && { triggerType: request.triggerType }),
        ...(request.triggerConfig && { triggerConfig: request.triggerConfig as unknown as Prisma.InputJsonValue }),
        ...(request.conditions !== undefined && { conditions: request.conditions as unknown as Prisma.InputJsonValue }),
        ...(request.actions && { actions: request.actions as unknown as Prisma.InputJsonValue }),
        ...(request.isEnabled !== undefined && { isEnabled: request.isEnabled }),
      },
    });

    return this.mapToWorkflow(workflow);
  }

  async deleteWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId
  ): Promise<boolean> {
    const existing = await this.getWorkflow(tenantId, workflowId);
    if (!existing) return false;

    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    return true;
  }

  async enableWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId
  ): Promise<Workflow | null> {
    return this.updateWorkflow(tenantId, workflowId, { isEnabled: true });
  }

  async disableWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId
  ): Promise<Workflow | null> {
    return this.updateWorkflow(tenantId, workflowId, { isEnabled: false });
  }

  // ============================================================================
  // TRIGGER EVALUATION
  // ============================================================================

  async evaluateTrigger(
    tenantId: TenantId,
    context: TriggerContext
  ): Promise<Workflow[]> {
    // Get all enabled workflows for this tenant
    const workflows = await this.prisma.workflow.findMany({
      where: {
        tenantId,
        isEnabled: true,
      },
    });

    const matchingWorkflows: Workflow[] = [];

    for (const workflow of workflows) {
      const mapped = this.mapToWorkflow(workflow);
      if (this.triggerMatches(mapped, context)) {
        matchingWorkflows.push(mapped);
      }
    }

    return matchingWorkflows;
  }

  private triggerMatches(workflow: Workflow, context: TriggerContext): boolean {
    switch (workflow.triggerType) {
      case 'EVENT':
        return this.eventTriggerMatches(workflow.triggerConfig as EventTriggerConfig, context);
      case 'SIGNAL':
        return this.signalTriggerMatches(workflow.triggerConfig as SignalTriggerConfig, context);
      case 'SCHEDULE':
        // Schedule triggers are handled by cron, not by event matching
        return false;
      case 'MANUAL':
        // Manual triggers are never auto-matched
        return false;
      default:
        return false;
    }
  }

  private eventTriggerMatches(config: EventTriggerConfig, context: TriggerContext): boolean {
    // Check event type
    if (config.eventTypes.length > 0 && context.eventType) {
      if (!config.eventTypes.includes(context.eventType)) {
        return false;
      }
    }

    // Check entity type
    if (config.entityTypes.length > 0 && context.entityType) {
      if (!config.entityTypes.includes(context.entityType)) {
        return false;
      }
    }

    // Check filters
    if (config.filters && context.entity) {
      for (const [path, expected] of Object.entries(config.filters)) {
        const actual = this.getNestedValue(context.entity, path.replace('payload.', ''));
        if (Array.isArray(expected)) {
          if (!expected.includes(actual)) return false;
        } else if (actual !== expected) {
          return false;
        }
      }
    }

    return true;
  }

  private signalTriggerMatches(config: SignalTriggerConfig, context: TriggerContext): boolean {
    if (!context.signal) return false;

    const signal = context.signal;
    if (signal.type !== config.signalType) return false;

    switch (config.condition) {
      case 'health_becomes':
        return signal.health === config.value;
      case 'crosses_threshold':
        // Assumes signal has a currentValue and threshold
        const currentValue = signal.currentValue as number;
        return currentValue >= Number(config.value) || currentValue <= Number(config.value);
      default:
        return false;
    }
  }

  // ============================================================================
  // CONDITION EVALUATION
  // ============================================================================

  async evaluateConditions(
    workflow: Workflow,
    context: TriggerContext
  ): Promise<boolean> {
    if (!workflow.conditions) return true;

    const { operator, rules } = workflow.conditions;

    if (operator === 'AND') {
      return rules.every(rule => this.evaluateRule(rule, context));
    } else {
      return rules.some(rule => this.evaluateRule(rule, context));
    }
  }

  private evaluateRule(rule: ConditionRule, context: TriggerContext): boolean {
    const contextData: Record<string, unknown> = {
      entity: context.entity || {},
      signal: context.signal || {},
      previousState: context.previousState || {},
      metadata: context.metadata || {},
    };

    const actual = this.getNestedValue(contextData, rule.field);

    switch (rule.operator) {
      case 'equals':
        return actual === rule.value;
      case 'not_equals':
        return actual !== rule.value;
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(actual);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(actual);
      case 'contains':
        return typeof actual === 'string' && actual.includes(String(rule.value));
      case 'greater_than':
        return typeof actual === 'number' && actual > Number(rule.value);
      case 'less_than':
        return typeof actual === 'number' && actual < Number(rule.value);
      case 'older_than':
        return this.isOlderThan(actual, String(rule.value));
      case 'newer_than':
        return !this.isOlderThan(actual, String(rule.value));
      case 'is_null':
        return actual === null || actual === undefined;
      case 'is_not_null':
        return actual !== null && actual !== undefined;
      default:
        return false;
    }
  }

  private isOlderThan(date: unknown, duration: string): boolean {
    if (!(date instanceof Date) && typeof date !== 'string') return false;
    const parsed = new Date(date as string);
    if (isNaN(parsed.getTime())) return false;

    const match = duration.match(/^(\d+)([dhm])$/);
    if (!match) return false;

    const amount = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds = 0;
    switch (unit) {
      case 'd': milliseconds = amount * 24 * 60 * 60 * 1000; break;
      case 'h': milliseconds = amount * 60 * 60 * 1000; break;
      case 'm': milliseconds = amount * 60 * 1000; break;
    }

    return Date.now() - parsed.getTime() > milliseconds;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  // ============================================================================
  // WORKFLOW EXECUTION
  // ============================================================================

  async executeWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    triggerData: TriggerContext
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        tenantId,
        status: 'PENDING',
        triggerEventId: triggerData.entityId,
        triggerData: triggerData as unknown as Prisma.InputJsonValue,
      },
    });

    // Update execution status to running
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const actionsExecuted: ActionResult[] = [];
    let error: string | undefined;

    try {
      // Sort actions by order
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

      for (const action of sortedActions) {
        const result = await this.executeAction(action, triggerData, tenantId);
        actionsExecuted.push(result);

        if (!result.success) {
          error = result.error;
          break;
        }
      }

      // Update workflow stats
      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });

      // Update execution with results
      const finalStatus: WorkflowExecutionStatus = error ? 'FAILED' : 'COMPLETED';
      const updated = await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          actionsExecuted: actionsExecuted as unknown as Prisma.InputJsonValue,
          error,
        },
        include: { workflow: true },
      });

      return this.mapToExecution(updated);
    } catch (err) {
      // Handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      const updated = await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          actionsExecuted: actionsExecuted as unknown as Prisma.InputJsonValue,
          error: errorMessage,
        },
        include: { workflow: true },
      });

      return this.mapToExecution(updated);
    }
  }

  private async executeAction(
    action: WorkflowAction,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<ActionResult> {
    const startTime = new Date();

    try {
      let result: unknown;

      switch (action.type) {
        case 'CHANGE_STATUS':
          result = await this.handleChangeStatus(action.config, context, tenantId);
          break;
        case 'NOTIFY':
          result = await this.handleNotify(action.config, context, tenantId);
          break;
        case 'WEBHOOK':
          result = await this.handleWebhook(action.config, context);
          break;
        case 'CREATE_ENTITY':
          result = await this.handleCreateEntity(action.config, context, tenantId);
          break;
        case 'ASSIGN':
          result = await this.handleAssign(action.config, context, tenantId);
          break;
        case 'UPDATE_FIELD':
          result = await this.handleUpdateField(action.config, context, tenantId);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        actionType: action.type,
        order: action.order,
        success: true,
        result,
        executedAt: startTime,
      };
    } catch (err) {
      return {
        actionType: action.type,
        order: action.order,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        executedAt: startTime,
      };
    }
  }

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  private async handleChangeStatus(
    config: Record<string, unknown>,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<unknown> {
    const { status } = config;
    const entityType = context.entityType;
    const entityId = context.entityId;

    if (!entityType || !entityId) {
      throw new Error('Missing entity type or ID for status change');
    }

    // Map entity type to Prisma model and update
    // This is a simplified implementation - in production you'd need type-safe handling
    const modelMap: Record<string, string> = {
      slice: 'slice',
      deal: 'deal',
      featureRequest: 'featureRequest',
    };

    const model = modelMap[entityType];
    if (!model) {
      throw new Error(`Unsupported entity type for status change: ${entityType}`);
    }

    const result = await (this.prisma as any)[model].update({
      where: { id: entityId },
      data: { status },
    });

    return { updated: true, entityId, newStatus: status };
  }

  private async handleNotify(
    config: Record<string, unknown>,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<unknown> {
    const { channel, template, recipients, message } = config;

    // Interpolate message template
    const interpolatedMessage = this.interpolate(message as string, context);

    // In a real implementation, this would send to Slack, email, etc.
    // For now, we'll store the notification intent

    // Store in Redis for potential pickup by notification service
    const notificationKey = `notifications:${tenantId}:${Date.now()}`;
    await this.redis.setex(
      notificationKey,
      3600, // 1 hour TTL
      JSON.stringify({
        channel,
        template,
        recipients,
        message: interpolatedMessage,
        context: context.entity,
        createdAt: new Date().toISOString(),
      })
    );

    return {
      channel,
      recipients,
      message: interpolatedMessage,
      notificationKey,
    };
  }

  private async handleWebhook(
    config: Record<string, unknown>,
    context: TriggerContext
  ): Promise<unknown> {
    const { url, method = 'POST', headers = {}, body } = config;

    // Interpolate URL and body
    const interpolatedUrl = this.interpolate(url as string, context);
    const interpolatedBody = body ? JSON.parse(this.interpolate(JSON.stringify(body), context)) : undefined;
    const interpolatedHeaders = Object.fromEntries(
      Object.entries(headers as Record<string, string>).map(([k, v]) => [k, this.interpolate(v, context)])
    );

    // Make HTTP request
    const response = await fetch(interpolatedUrl, {
      method: method as string,
      headers: {
        'Content-Type': 'application/json',
        ...interpolatedHeaders,
      },
      body: interpolatedBody ? JSON.stringify(interpolatedBody) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${await response.text()}`);
    }

    const responseBody = await response.text();
    return {
      status: response.status,
      body: responseBody,
    };
  }

  private async handleCreateEntity(
    config: Record<string, unknown>,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<unknown> {
    const { entityType, data } = config;

    // Interpolate data fields
    const interpolatedData = JSON.parse(this.interpolate(JSON.stringify(data), context));

    // Map entity type to Prisma model
    const modelMap: Record<string, string> = {
      comment: 'contextNode', // Comments might be stored as context nodes
      task: 'slice',
    };

    const model = modelMap[entityType as string];
    if (!model) {
      throw new Error(`Unsupported entity type for creation: ${entityType}`);
    }

    const result = await (this.prisma as any)[model].create({
      data: {
        tenantId,
        ...interpolatedData,
      },
    });

    return { created: true, entityId: result.id, entityType };
  }

  private async handleAssign(
    config: Record<string, unknown>,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<unknown> {
    const { assignee, fallback } = config;
    const entityType = context.entityType;
    const entityId = context.entityId;

    if (!entityType || !entityId) {
      throw new Error('Missing entity type or ID for assignment');
    }

    let assigneeId: string | undefined;

    // Resolve assignee based on role or user
    if (assignee === 'team_lead' || assignee === 'owner') {
      // In a real implementation, you'd look up the team lead
      // For now, we'll use fallback logic
      if (fallback === 'round_robin') {
        // Get the next user in rotation from Redis
        const rotationKey = `assignment:${tenantId}:rotation`;
        assigneeId = await this.redis.lpop(rotationKey) || undefined;
        if (assigneeId) {
          await this.redis.rpush(rotationKey, assigneeId);
        }
      }
    } else if (typeof assignee === 'string') {
      assigneeId = assignee;
    }

    if (!assigneeId) {
      throw new Error('Could not resolve assignee');
    }

    // Update the entity's owner/assignee
    const modelMap: Record<string, string> = {
      slice: 'slice',
      deal: 'deal',
      featureRequest: 'featureRequest',
    };

    const model = modelMap[entityType];
    if (!model) {
      throw new Error(`Unsupported entity type for assignment: ${entityType}`);
    }

    await (this.prisma as any)[model].update({
      where: { id: entityId },
      data: { ownerId: assigneeId },
    });

    return { assigned: true, entityId, assigneeId };
  }

  private async handleUpdateField(
    config: Record<string, unknown>,
    context: TriggerContext,
    tenantId: TenantId
  ): Promise<unknown> {
    const { field, value } = config;
    const entityType = context.entityType;
    const entityId = context.entityId;

    if (!entityType || !entityId) {
      throw new Error('Missing entity type or ID for field update');
    }

    const interpolatedValue = typeof value === 'string' ? this.interpolate(value, context) : value;

    const modelMap: Record<string, string> = {
      slice: 'slice',
      deal: 'deal',
      featureRequest: 'featureRequest',
      customer: 'customer',
    };

    const model = modelMap[entityType];
    if (!model) {
      throw new Error(`Unsupported entity type for field update: ${entityType}`);
    }

    await (this.prisma as any)[model].update({
      where: { id: entityId },
      data: { [field as string]: interpolatedValue },
    });

    return { updated: true, entityId, field, value: interpolatedValue };
  }

  // ============================================================================
  // TEMPLATE INTERPOLATION
  // ============================================================================

  private interpolate(template: string, context: TriggerContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();

      // Build context object for interpolation
      const contextData: Record<string, unknown> = {
        trigger: context,
        entity: context.entity || {},
        signal: context.signal || {},
        metadata: context.metadata || {},
      };

      const value = this.getNestedValue(contextData, trimmedPath);
      return value !== undefined ? String(value) : match;
    });
  }

  // ============================================================================
  // EXECUTION HISTORY
  // ============================================================================

  async listExecutions(
    tenantId: TenantId,
    options: PaginationOptions & { workflowId?: WorkflowId; status?: WorkflowExecutionStatus } = {}
  ): Promise<PaginatedResult<WorkflowExecution>> {
    const { limit = 20, offset = 0, workflowId, status } = options;

    const where: any = { tenantId };
    if (workflowId) where.workflowId = workflowId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { startedAt: 'desc' },
        include: { workflow: true },
      }),
      this.prisma.workflowExecution.count({ where }),
    ]);

    return {
      data: data.map(this.mapToExecution),
      total,
      limit,
      offset,
    };
  }

  async getExecution(
    tenantId: TenantId,
    executionId: WorkflowExecutionId
  ): Promise<WorkflowExecution | null> {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, tenantId },
      include: { workflow: true },
    });

    return execution ? this.mapToExecution(execution) : null;
  }

  async cancelExecution(
    tenantId: TenantId,
    executionId: WorkflowExecutionId
  ): Promise<WorkflowExecution | null> {
    const existing = await this.getExecution(tenantId, executionId);
    if (!existing || existing.status !== 'RUNNING') {
      return null;
    }

    const updated = await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
      include: { workflow: true },
    });

    return this.mapToExecution(updated);
  }

  async retryExecution(
    tenantId: TenantId,
    executionId: WorkflowExecutionId
  ): Promise<WorkflowExecution | null> {
    const existing = await this.getExecution(tenantId, executionId);
    if (!existing || existing.status !== 'FAILED') {
      return null;
    }

    // Re-execute the workflow with the original trigger data
    return this.executeWorkflow(
      tenantId,
      existing.workflowId,
      existing.triggerData as TriggerContext
    );
  }

  // ============================================================================
  // TEST WORKFLOW
  // ============================================================================

  async testWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    mockData: TriggerContext
  ): Promise<{ wouldTrigger: boolean; conditionsMet: boolean; preview: ActionResult[] }> {
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Check if trigger would match
    const wouldTrigger = this.triggerMatches(workflow, mockData);

    // Check if conditions would be met
    const conditionsMet = await this.evaluateConditions(workflow, mockData);

    // Preview what actions would be executed (without actually executing)
    const preview: ActionResult[] = workflow.actions.map(action => ({
      actionType: action.type,
      order: action.order,
      success: true,
      result: `Preview: Would execute ${action.type} with config ${JSON.stringify(action.config)}`,
      executedAt: new Date(),
    }));

    return { wouldTrigger, conditionsMet, preview };
  }

  // ============================================================================
  // SCHEDULED WORKFLOWS
  // ============================================================================

  async getScheduledWorkflows(tenantId: TenantId): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        tenantId,
        triggerType: 'SCHEDULE',
        isEnabled: true,
      },
    });

    return workflows.map(this.mapToWorkflow);
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateTriggerConfig(type: WorkflowTriggerType, config: TriggerConfig): void {
    switch (type) {
      case 'EVENT': {
        const eventConfig = config as EventTriggerConfig;
        if (!eventConfig.eventTypes || !Array.isArray(eventConfig.eventTypes)) {
          throw new Error('EVENT trigger requires eventTypes array');
        }
        if (!eventConfig.entityTypes || !Array.isArray(eventConfig.entityTypes)) {
          throw new Error('EVENT trigger requires entityTypes array');
        }
        break;
      }
      case 'SIGNAL': {
        const signalConfig = config as SignalTriggerConfig;
        if (!signalConfig.signalType) {
          throw new Error('SIGNAL trigger requires signalType');
        }
        if (!signalConfig.condition) {
          throw new Error('SIGNAL trigger requires condition');
        }
        break;
      }
      case 'SCHEDULE': {
        const scheduleConfig = config as ScheduleTriggerConfig;
        if (!scheduleConfig.cron) {
          throw new Error('SCHEDULE trigger requires cron expression');
        }
        // Basic cron validation
        const cronParts = scheduleConfig.cron.split(' ');
        if (cronParts.length !== 5) {
          throw new Error('Invalid cron expression - must have 5 parts');
        }
        break;
      }
      case 'MANUAL':
        // No specific validation needed
        break;
      default:
        throw new Error(`Unknown trigger type: ${type}`);
    }
  }

  private validateActions(actions: WorkflowAction[]): void {
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      throw new Error('Workflow must have at least one action');
    }

    const validActionTypes: ActionType[] = ['CHANGE_STATUS', 'NOTIFY', 'WEBHOOK', 'CREATE_ENTITY', 'ASSIGN', 'UPDATE_FIELD'];

    for (const action of actions) {
      if (!validActionTypes.includes(action.type)) {
        throw new Error(`Invalid action type: ${action.type}`);
      }
      if (typeof action.order !== 'number') {
        throw new Error('Each action must have an order number');
      }
    }
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapToWorkflow = (record: any): Workflow => {
    return {
      id: record.id as WorkflowId,
      tenantId: record.tenantId as TenantId,
      name: record.name,
      description: record.description,
      isEnabled: record.isEnabled,
      triggerType: record.triggerType as WorkflowTriggerType,
      triggerConfig: record.triggerConfig as TriggerConfig,
      conditions: record.conditions as WorkflowConditions | undefined,
      actions: record.actions as WorkflowAction[],
      createdById: record.createdById as UserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      runCount: record.runCount,
      lastRunAt: record.lastRunAt,
    };
  };

  private mapToExecution = (record: any): WorkflowExecution => {
    return {
      id: record.id as WorkflowExecutionId,
      workflowId: record.workflowId as WorkflowId,
      tenantId: record.tenantId as TenantId,
      status: record.status as WorkflowExecutionStatus,
      triggerEventId: record.triggerEventId,
      triggerData: record.triggerData as Record<string, unknown>,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      actionsExecuted: record.actionsExecuted as ActionResult[] | undefined,
      error: record.error,
      workflow: record.workflow ? this.mapToWorkflow(record.workflow) : undefined,
    };
  };
}
