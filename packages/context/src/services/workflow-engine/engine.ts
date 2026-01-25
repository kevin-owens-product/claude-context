/**
 * WorkflowEngine - Core orchestration engine
 *
 * Responsibilities:
 * - Workflow lifecycle management
 * - Execution orchestration
 * - Step routing and branching
 * - Error handling and compensation
 * - Metrics and observability
 *
 * @prompt-id forge-v4.1:service:workflow-engine-core:001
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId } from '../../types';
import type {
  WorkflowDefinition,
  WorkflowId,
  WorkflowVersionId,
  WorkflowExecution,
  ExecutionId,
  ExecutionContext,
  ExecutionStatus,
  StepExecution,
  WorkflowStep,
  StepId,
  IdempotencyKey,
  WorkflowTrigger,
  TenantQuotas,
  QuotaUsage,
  AuditEventType,
} from './types';
import { WorkflowExecutor } from './executor';
import { ActionRegistry } from './action-registry';
import { WorkflowAuditLog } from './audit-log';
import { WorkflowMetrics } from './metrics';
import { CircuitBreaker } from './circuit-breaker';

interface EngineConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  enableMetrics: boolean;
  enableAuditLog: boolean;
}

const DEFAULT_CONFIG: EngineConfig = {
  maxConcurrentExecutions: 100,
  defaultTimeout: 300000, // 5 minutes
  enableMetrics: true,
  enableAuditLog: true,
};

export class WorkflowEngine {
  private readonly executor: WorkflowExecutor;
  private readonly actionRegistry: ActionRegistry;
  private readonly auditLog: WorkflowAuditLog;
  private readonly metrics: WorkflowMetrics;
  private readonly config: EngineConfig;

  // Execution tracking
  private readonly activeExecutions = new Map<ExecutionId, WorkflowExecution>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    config: Partial<EngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.actionRegistry = new ActionRegistry();
    this.auditLog = new WorkflowAuditLog(prisma, redis);
    this.metrics = new WorkflowMetrics(redis);
    this.executor = new WorkflowExecutor(
      prisma,
      redis,
      this.actionRegistry,
      this.auditLog,
      this.metrics
    );
  }

  // ============================================================================
  // WORKFLOW LIFECYCLE
  // ============================================================================

  /**
   * Create a new workflow definition (as draft)
   */
  async createWorkflow(
    tenantId: TenantId,
    userId: UserId,
    definition: Omit<WorkflowDefinition, 'id' | 'tenantId' | 'version' | 'versionId' | 'status' | 'createdBy' | 'createdAt' | 'executionCount' | 'successCount' | 'failureCount' | 'avgDurationMs'>
  ): Promise<WorkflowDefinition> {
    // Validate workflow structure
    this.validateWorkflowDefinition(definition);

    // Check quotas
    await this.checkQuota(tenantId, 'maxWorkflows');

    const workflow: WorkflowDefinition = {
      ...definition,
      id: this.generateId('wf') as WorkflowId,
      tenantId,
      version: 1,
      versionId: this.generateId('wfv') as WorkflowVersionId,
      status: 'DRAFT',
      createdBy: userId,
      createdAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
    };

    // Store in database
    await this.saveWorkflow(workflow);

    // Audit log
    await this.auditLog.log({
      tenantId,
      eventType: 'WORKFLOW_CREATED',
      actorType: 'USER',
      actorId: userId,
      resourceType: 'WORKFLOW',
      resourceId: workflow.id,
      details: { name: workflow.name, version: workflow.version },
    });

    return workflow;
  }

  /**
   * Update a draft workflow
   */
  async updateWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    userId: UserId,
    updates: Partial<Pick<WorkflowDefinition, 'name' | 'description' | 'trigger' | 'steps' | 'onError' | 'tags' | 'category'>>
  ): Promise<WorkflowDefinition> {
    const workflow = await this.getWorkflow(tenantId, workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'DRAFT') {
      throw new Error('Can only update draft workflows. Create a new version instead.');
    }

    const updated = {
      ...workflow,
      ...updates,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (updates.trigger || updates.steps) {
      this.validateWorkflowDefinition(updated);
    }

    await this.saveWorkflow(updated);

    await this.auditLog.log({
      tenantId,
      eventType: 'WORKFLOW_UPDATED',
      actorType: 'USER',
      actorId: userId,
      resourceType: 'WORKFLOW',
      resourceId: workflowId,
      details: { changes: Object.keys(updates) },
    });

    return updated;
  }

  /**
   * Publish a workflow (make it executable)
   */
  async publishWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    userId: UserId
  ): Promise<WorkflowDefinition> {
    const workflow = await this.getWorkflow(tenantId, workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'DRAFT') {
      throw new Error('Can only publish draft workflows');
    }

    // Validate before publishing
    this.validateWorkflowDefinition(workflow);
    this.validateWorkflowCompleteness(workflow);

    const published: WorkflowDefinition = {
      ...workflow,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      publishedBy: userId,
    };

    await this.saveWorkflow(published);

    // Register trigger handlers
    await this.registerTrigger(published);

    await this.auditLog.log({
      tenantId,
      eventType: 'WORKFLOW_PUBLISHED',
      actorType: 'USER',
      actorId: userId,
      resourceType: 'WORKFLOW',
      resourceId: workflowId,
      details: { version: workflow.version },
    });

    return published;
  }

  /**
   * Create a new version of a published workflow
   */
  async createVersion(
    tenantId: TenantId,
    workflowId: WorkflowId,
    userId: UserId
  ): Promise<WorkflowDefinition> {
    const workflow = await this.getWorkflow(tenantId, workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    await this.checkQuota(tenantId, 'maxVersionsPerWorkflow', workflowId);

    const newVersion: WorkflowDefinition = {
      ...workflow,
      versionId: this.generateId('wfv') as WorkflowVersionId,
      version: workflow.version + 1,
      status: 'DRAFT',
      createdBy: userId,
      createdAt: new Date(),
      updatedBy: undefined,
      updatedAt: undefined,
      publishedAt: undefined,
      publishedBy: undefined,
    };

    await this.saveWorkflow(newVersion);

    return newVersion;
  }

  /**
   * Deprecate a workflow (stop accepting new executions)
   */
  async deprecateWorkflow(
    tenantId: TenantId,
    workflowId: WorkflowId,
    userId: UserId
  ): Promise<WorkflowDefinition> {
    const workflow = await this.getWorkflow(tenantId, workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'PUBLISHED') {
      throw new Error('Can only deprecate published workflows');
    }

    const deprecated: WorkflowDefinition = {
      ...workflow,
      status: 'DEPRECATED',
      updatedBy: userId,
      updatedAt: new Date(),
    };

    await this.saveWorkflow(deprecated);

    // Unregister trigger handlers
    await this.unregisterTrigger(deprecated);

    await this.auditLog.log({
      tenantId,
      eventType: 'WORKFLOW_DEPRECATED',
      actorType: 'USER',
      actorId: userId,
      resourceType: 'WORKFLOW',
      resourceId: workflowId,
      details: {},
    });

    return deprecated;
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Start a new workflow execution
   */
  async startExecution(
    tenantId: TenantId,
    workflowId: WorkflowId,
    options: {
      input?: Record<string, unknown>;
      triggeredBy?: UserId;
      triggerData?: Record<string, unknown>;
      idempotencyKey?: IdempotencyKey;
      correlationId?: string;
    } = {}
  ): Promise<WorkflowExecution> {
    // Check idempotency
    if (options.idempotencyKey) {
      const existing = await this.getExecutionByIdempotencyKey(
        tenantId,
        options.idempotencyKey
      );
      if (existing) {
        return existing;
      }
    }

    // Get workflow
    const workflow = await this.getWorkflow(tenantId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'PUBLISHED') {
      throw new Error('Can only execute published workflows');
    }

    // Check quotas
    await this.checkQuota(tenantId, 'maxConcurrentExecutions');
    await this.checkQuota(tenantId, 'maxExecutionsPerHour');

    // Create execution context
    const context: ExecutionContext = {
      input: options.input || {},
      outputs: {} as Record<StepId, unknown>,
      variables: {},
      system: {
        tenantId,
        executionId: this.generateId('exec') as ExecutionId,
        workflowId,
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
      },
      trigger: options.triggerData || {},
    };

    // Create execution record
    const execution: WorkflowExecution = {
      id: context.system.executionId,
      workflowId,
      workflowVersionId: workflow.versionId,
      tenantId,
      idempotencyKey: options.idempotencyKey,
      status: 'PENDING',
      triggerType: workflow.trigger.type,
      triggerData: options.triggerData || {},
      triggeredBy: options.triggeredBy,
      context,
      stepExecutions: [],
      createdAt: new Date(),
      correlationId: options.correlationId || this.generateId('corr'),
    };

    // Save execution
    await this.saveExecution(execution);

    // Track active execution
    this.activeExecutions.set(execution.id, execution);

    // Start execution asynchronously
    this.executeWorkflow(workflow, execution).catch(error => {
      console.error(`Execution ${execution.id} failed:`, error);
    });

    await this.auditLog.log({
      tenantId,
      eventType: 'EXECUTION_STARTED',
      actorType: options.triggeredBy ? 'USER' : 'SYSTEM',
      actorId: options.triggeredBy || 'system',
      resourceType: 'EXECUTION',
      resourceId: execution.id,
      details: {
        workflowId,
        triggerType: workflow.trigger.type,
      },
    });

    return execution;
  }

  /**
   * Execute the workflow (called internally)
   */
  private async executeWorkflow(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      execution.status = 'RUNNING';
      execution.startedAt = new Date();
      await this.saveExecution(execution);

      // Find entry step
      const entryStep = this.findEntryStep(workflow.steps);
      if (!entryStep) {
        throw new Error('No entry step found in workflow');
      }

      // Execute from entry step
      await this.executor.executeStep(workflow, execution, entryStep);

      // Mark as completed
      execution.status = 'COMPLETED';
      execution.completedAt = new Date();

      await this.auditLog.log({
        tenantId: execution.tenantId,
        eventType: 'EXECUTION_COMPLETED',
        actorType: 'SYSTEM',
        actorId: 'workflow-engine',
        resourceType: 'EXECUTION',
        resourceId: execution.id,
        details: {
          durationMs: Date.now() - startTime,
          stepsExecuted: execution.stepExecutions.length,
        },
      });

    } catch (error) {
      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.error = {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
        timestamp: new Date(),
      };

      // Run compensation if configured
      if (workflow.onError?.type === 'COMPENSATE') {
        await this.runCompensation(workflow, execution);
      }

      await this.auditLog.log({
        tenantId: execution.tenantId,
        eventType: 'EXECUTION_FAILED',
        actorType: 'SYSTEM',
        actorId: 'workflow-engine',
        resourceType: 'EXECUTION',
        resourceId: execution.id,
        details: {
          error: execution.error,
          durationMs: Date.now() - startTime,
        },
      });
    } finally {
      await this.saveExecution(execution);
      this.activeExecutions.delete(execution.id);

      // Update metrics
      if (this.config.enableMetrics) {
        await this.metrics.recordExecution(execution, Date.now() - startTime);
      }
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(
    tenantId: TenantId,
    executionId: ExecutionId,
    userId: UserId,
    reason?: string
  ): Promise<WorkflowExecution> {
    const execution = await this.getExecution(tenantId, executionId);

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (!['PENDING', 'RUNNING', 'WAITING'].includes(execution.status)) {
      throw new Error(`Cannot cancel execution in status: ${execution.status}`);
    }

    execution.status = 'CANCELLED';
    execution.completedAt = new Date();
    execution.error = {
      code: 'CANCELLED',
      message: reason || 'Cancelled by user',
      retryable: false,
      timestamp: new Date(),
    };

    await this.saveExecution(execution);
    this.activeExecutions.delete(executionId);

    await this.auditLog.log({
      tenantId,
      eventType: 'EXECUTION_CANCELLED',
      actorType: 'USER',
      actorId: userId,
      resourceType: 'EXECUTION',
      resourceId: executionId,
      details: { reason },
    });

    return execution;
  }

  /**
   * Run compensation for a failed execution
   */
  private async runCompensation(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution
  ): Promise<void> {
    execution.status = 'COMPENSATING';
    await this.saveExecution(execution);

    await this.auditLog.log({
      tenantId: execution.tenantId,
      eventType: 'COMPENSATION_STARTED',
      actorType: 'SYSTEM',
      actorId: 'workflow-engine',
      resourceType: 'EXECUTION',
      resourceId: execution.id,
      details: {},
    });

    // Get completed steps in reverse order
    const completedSteps = execution.stepExecutions
      .filter(s => s.status === 'COMPLETED')
      .reverse();

    for (const stepExecution of completedSteps) {
      const step = workflow.steps.find(s => s.id === stepExecution.stepId);
      if (step?.compensation) {
        try {
          await this.executor.runCompensation(workflow, execution, step);
        } catch (error) {
          console.error(`Compensation failed for step ${step.id}:`, error);
          // Continue with other compensations
        }
      }
    }

    await this.auditLog.log({
      tenantId: execution.tenantId,
      eventType: 'COMPENSATION_COMPLETED',
      actorType: 'SYSTEM',
      actorId: 'workflow-engine',
      resourceType: 'EXECUTION',
      resourceId: execution.id,
      details: {},
    });
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateWorkflowDefinition(workflow: Partial<WorkflowDefinition>): void {
    if (!workflow.name?.trim()) {
      throw new Error('Workflow name is required');
    }

    if (!workflow.trigger) {
      throw new Error('Workflow trigger is required');
    }

    if (!workflow.steps?.length) {
      throw new Error('At least one step is required');
    }

    // Validate trigger
    this.validateTrigger(workflow.trigger);

    // Validate steps
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
      this.validateStep(step, stepIds);
    }

    // Validate DAG structure (no cycles)
    this.validateNoCycles(workflow.steps);
  }

  private validateWorkflowCompleteness(workflow: WorkflowDefinition): void {
    // Ensure all referenced steps exist
    for (const step of workflow.steps) {
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        for (const nextId of nextSteps) {
          if (!workflow.steps.find(s => s.id === nextId)) {
            throw new Error(`Step ${step.id} references non-existent step: ${nextId}`);
          }
        }
      }
    }
  }

  private validateTrigger(trigger: WorkflowTrigger): void {
    switch (trigger.type) {
      case 'EVENT':
        if (!trigger.eventTypes?.length) {
          throw new Error('Event trigger requires eventTypes');
        }
        if (!trigger.entityTypes?.length) {
          throw new Error('Event trigger requires entityTypes');
        }
        break;
      case 'SCHEDULE':
        if (!trigger.cron) {
          throw new Error('Schedule trigger requires cron expression');
        }
        if (!this.isValidCron(trigger.cron)) {
          throw new Error('Invalid cron expression');
        }
        break;
      case 'SIGNAL':
        if (!trigger.signalType) {
          throw new Error('Signal trigger requires signalType');
        }
        break;
    }
  }

  private validateStep(step: WorkflowStep, allStepIds: Set<string>): void {
    if (!step.id?.trim()) {
      throw new Error('Step ID is required');
    }

    if (!step.name?.trim()) {
      throw new Error('Step name is required');
    }

    // Validate next references
    if (step.next) {
      const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
      for (const nextId of nextSteps) {
        if (!allStepIds.has(nextId)) {
          throw new Error(`Step ${step.id} references unknown step: ${nextId}`);
        }
      }
    }
  }

  private validateNoCycles(steps: WorkflowStep[]): void {
    const stepMap = new Map<StepId, WorkflowStep>(steps.map(s => [s.id, s]));
    const visited = new Set<StepId>();
    const recursionStack = new Set<StepId>();

    const hasCycle = (stepId: StepId): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step?.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        for (const nextId of nextSteps) {
          if (hasCycle(nextId)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.id)) {
        throw new Error('Workflow contains cycles');
      }
    }
  }

  private isValidCron(expression: string): boolean {
    const parts = expression.split(' ');
    if (parts.length !== 5) return false;
    // Basic validation - in production use a proper cron parser
    return true;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private findEntryStep(steps: WorkflowStep[]): WorkflowStep | undefined {
    // Find steps that are not referenced by any other step's next
    const referencedSteps = new Set<string>();
    for (const step of steps) {
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        nextSteps.forEach(id => referencedSteps.add(id));
      }
    }

    return steps.find(s => !referencedSteps.has(s.id));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // QUOTA MANAGEMENT
  // ============================================================================

  private async checkQuota(
    tenantId: TenantId,
    quotaType: keyof TenantQuotas,
    resourceId?: string
  ): Promise<void> {
    const quotas = await this.getQuotas(tenantId);
    const usage = await this.getUsage(tenantId);

    switch (quotaType) {
      case 'maxConcurrentExecutions':
        if (usage.concurrentExecutions >= quotas.maxConcurrentExecutions) {
          throw new Error('Concurrent execution limit reached');
        }
        break;
      case 'maxExecutionsPerHour':
        if (usage.executionsThisHour >= quotas.maxExecutionsPerHour) {
          throw new Error('Hourly execution limit reached');
        }
        break;
      case 'maxWorkflows':
        if (usage.workflowCount >= quotas.maxWorkflows) {
          throw new Error('Workflow limit reached');
        }
        break;
    }
  }

  // ============================================================================
  // PERSISTENCE (to be implemented with actual database)
  // ============================================================================

  private async getWorkflow(tenantId: TenantId, workflowId: WorkflowId): Promise<WorkflowDefinition | null> {
    // Implementation with Prisma
    return null;
  }

  private async saveWorkflow(workflow: WorkflowDefinition): Promise<void> {
    // Implementation with Prisma
  }

  private async getExecution(tenantId: TenantId, executionId: ExecutionId): Promise<WorkflowExecution | null> {
    // Implementation with Prisma
    return null;
  }

  private async getExecutionByIdempotencyKey(tenantId: TenantId, key: IdempotencyKey): Promise<WorkflowExecution | null> {
    // Implementation with Prisma
    return null;
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    // Implementation with Prisma
  }

  private async getQuotas(tenantId: TenantId): Promise<TenantQuotas> {
    // Implementation with default quotas
    return {
      tenantId,
      maxConcurrentExecutions: 100,
      maxExecutionsPerHour: 1000,
      maxExecutionsPerDay: 10000,
      maxWorkflows: 100,
      maxStepsPerWorkflow: 50,
      maxVersionsPerWorkflow: 10,
      maxExecutionDuration: 300000,
      maxPayloadSize: 1048576,
      maxWebhookTimeout: 30000,
      features: {
        approvals: true,
        subworkflows: true,
        customActions: false,
        webhookTriggers: true,
        scheduledTriggers: true,
      },
    };
  }

  private async getUsage(tenantId: TenantId): Promise<QuotaUsage> {
    // Implementation with Redis counters
    return {
      tenantId,
      period: new Date(),
      concurrentExecutions: this.activeExecutions.size,
      executionsThisHour: 0,
      executionsToday: 0,
      workflowCount: 0,
      activeExecutions: this.activeExecutions.size,
    };
  }

  private async registerTrigger(workflow: WorkflowDefinition): Promise<void> {
    // Register trigger handlers based on type
  }

  private async unregisterTrigger(workflow: WorkflowDefinition): Promise<void> {
    // Unregister trigger handlers
  }
}
