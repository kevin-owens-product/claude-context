/**
 * WorkflowExecutor - Step execution engine with reliability features
 *
 * Features:
 * - Retry with exponential backoff
 * - Circuit breaker for external calls
 * - Timeout handling
 * - Parallel execution
 * - Compensation (saga rollback)
 *
 * @prompt-id forge-v4.1:service:workflow-executor:001
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  StepExecution,
  ExecutionStatus,
  ActionStep,
  ConditionStep,
  ParallelStep,
  LoopStep,
  DelayStep,
  ApprovalStep,
  SubworkflowStep,
  TransformStep,
  ActionResult,
  ExecutionContext,
  RetryPolicy,
  ConditionExpression,
  StepId,
} from './types';
import { ActionRegistry } from './action-registry';
import { WorkflowAuditLog } from './audit-log';
import { WorkflowMetrics } from './metrics';
import { CircuitBreaker } from './circuit-breaker';
import { ConditionEvaluator } from './condition-evaluator';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export class WorkflowExecutor {
  private readonly conditionEvaluator: ConditionEvaluator;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly actionRegistry: ActionRegistry,
    private readonly auditLog: WorkflowAuditLog,
    private readonly metrics: WorkflowMetrics
  ) {
    this.conditionEvaluator = new ConditionEvaluator();
  }

  /**
   * Execute a workflow step
   */
  async executeStep(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<void> {
    const stepExecution = this.createStepExecution(step);
    execution.stepExecutions.push(stepExecution);
    execution.currentStepId = step.id;

    const startTime = Date.now();

    try {
      // Check timeout
      const timeout = step.timeout || 60000;

      // Execute with timeout
      await Promise.race([
        this.executeStepByType(workflow, execution, step, stepExecution),
        this.timeoutPromise(timeout, step.id),
      ]);

      stepExecution.status = 'COMPLETED';
      stepExecution.completedAt = new Date();

      // Record metrics
      await this.metrics.recordStepExecution(
        execution.workflowId,
        step.id,
        Date.now() - startTime,
        true
      );

      // Execute next step(s)
      if (step.next) {
        const nextStepIds = Array.isArray(step.next) ? step.next : [step.next];
        for (const nextId of nextStepIds) {
          const nextStep = workflow.steps.find(s => s.id === nextId);
          if (nextStep) {
            await this.executeStep(workflow, execution, nextStep);
          }
        }
      }

    } catch (error) {
      stepExecution.status = 'FAILED';
      stepExecution.completedAt = new Date();
      stepExecution.error = {
        code: 'STEP_FAILED',
        message: error instanceof Error ? error.message : String(error),
        stepId: step.id,
        retryable: this.isRetryableError(error),
        timestamp: new Date(),
      };

      // Record failure
      await this.metrics.recordStepExecution(
        execution.workflowId,
        step.id,
        Date.now() - startTime,
        false
      );

      // Handle error based on step configuration
      await this.handleStepError(workflow, execution, step, stepExecution, error);
    }
  }

  /**
   * Execute step based on type
   */
  private async executeStepByType(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: WorkflowStep,
    stepExecution: StepExecution
  ): Promise<void> {
    stepExecution.status = 'RUNNING';
    stepExecution.startedAt = new Date();

    switch (step.type) {
      case 'ACTION':
        await this.executeActionStep(execution, step as ActionStep, stepExecution);
        break;
      case 'CONDITION':
        await this.executeConditionStep(workflow, execution, step as ConditionStep);
        break;
      case 'PARALLEL':
        await this.executeParallelStep(workflow, execution, step as ParallelStep, stepExecution);
        break;
      case 'LOOP':
        await this.executeLoopStep(workflow, execution, step as LoopStep, stepExecution);
        break;
      case 'DELAY':
        await this.executeDelayStep(step as DelayStep);
        break;
      case 'APPROVAL':
        await this.executeApprovalStep(execution, step as ApprovalStep, stepExecution);
        break;
      case 'SUBWORKFLOW':
        await this.executeSubworkflowStep(execution, step as SubworkflowStep, stepExecution);
        break;
      case 'TRANSFORM':
        await this.executeTransformStep(execution, step as TransformStep, stepExecution);
        break;
      default:
        throw new Error(`Unknown step type: ${(step as WorkflowStep).type}`);
    }
  }

  /**
   * Execute an action step with retry
   */
  private async executeActionStep(
    execution: WorkflowExecution,
    step: ActionStep,
    stepExecution: StepExecution
  ): Promise<void> {
    const retryPolicy = step.retryPolicy || DEFAULT_RETRY_POLICY;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        // Get circuit breaker for external actions
        const circuitBreaker = this.getCircuitBreaker(step.actionType);

        // Build input from context
        const input = this.buildStepInput(step.config, execution.context);
        stepExecution.input = input;

        // Execute action through circuit breaker
        const result = await circuitBreaker.execute(async () => {
          const action = this.actionRegistry.get(step.actionType);
          if (!action) {
            throw new Error(`Unknown action type: ${step.actionType}`);
          }
          return action.execute(input, execution.context);
        });

        // Store output
        stepExecution.output = result.output;
        if (step.outputMapping) {
          this.mapOutput(execution.context, step.outputMapping, result.output);
        }

        // Store in context outputs
        execution.context.outputs[step.id] = result.output;

        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        stepExecution.retryCount = attempt;

        // Check if we should retry
        if (attempt < retryPolicy.maxAttempts && this.isRetryableError(error)) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy);

          await this.auditLog.log({
            tenantId: execution.tenantId,
            eventType: 'STEP_RETRIED',
            actorType: 'SYSTEM',
            actorId: 'workflow-executor',
            resourceType: 'STEP',
            resourceId: step.id,
            details: { attempt, delay, error: lastError.message },
          });

          await this.sleep(delay);
        } else {
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute a condition step (branching)
   */
  private async executeConditionStep(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: ConditionStep
  ): Promise<void> {
    // Evaluate conditions in order
    for (const branch of step.conditions) {
      const result = await this.conditionEvaluator.evaluate(
        branch.condition,
        execution.context
      );

      if (result) {
        // Found matching branch, execute it
        const nextStep = workflow.steps.find(s => s.id === branch.next);
        if (nextStep) {
          await this.executeStep(workflow, execution, nextStep);
        }
        return;
      }
    }

    // No condition matched, use default branch
    if (step.defaultBranch) {
      const defaultStep = workflow.steps.find(s => s.id === step.defaultBranch);
      if (defaultStep) {
        await this.executeStep(workflow, execution, defaultStep);
      }
    }
  }

  /**
   * Execute parallel branches
   */
  private async executeParallelStep(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: ParallelStep,
    stepExecution: StepExecution
  ): Promise<void> {
    const branchPromises = step.branches.map(async branch => {
      const startStep = workflow.steps.find(s => s.id === branch.startStep);
      if (!startStep) {
        throw new Error(`Branch start step not found: ${branch.startStep}`);
      }

      try {
        await this.executeStep(workflow, execution, startStep);
        return { branch: branch.name, success: true };
      } catch (error) {
        return { branch: branch.name, success: false, error };
      }
    });

    // Wait based on join type
    let results: Array<{ branch: string; success: boolean; error?: unknown }>;

    switch (step.joinType) {
      case 'ALL':
        results = await Promise.all(branchPromises);
        if (results.some(r => !r.success)) {
          throw new Error('Not all parallel branches completed successfully');
        }
        break;

      case 'ANY':
        results = [await Promise.race(branchPromises)];
        break;

      case 'N_OF_M':
        results = await this.waitForN(branchPromises, step.joinCount || 1);
        break;
    }

    stepExecution.branchResults = Object.fromEntries(
      results.map(r => [r.branch, r.success ? 'completed' : r.error])
    );
  }

  /**
   * Execute a loop step
   */
  private async executeLoopStep(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: LoopStep,
    stepExecution: StepExecution
  ): Promise<void> {
    // Get collection from context
    const collection = this.resolveExpression(step.collection, execution.context);

    if (!Array.isArray(collection)) {
      throw new Error(`Loop collection is not an array: ${step.collection}`);
    }

    const maxIterations = step.maxIterations || collection.length;
    const results: unknown[] = [];

    for (let i = 0; i < Math.min(collection.length, maxIterations); i++) {
      // Set loop variables in context
      execution.context.variables[step.itemVariable] = collection[i];
      if (step.indexVariable) {
        execution.context.variables[step.indexVariable] = i;
      }

      try {
        // Execute loop body
        const bodyStep = workflow.steps.find(s => s.id === step.body);
        if (bodyStep) {
          await this.executeStep(workflow, execution, bodyStep);
          results.push(execution.context.outputs[bodyStep.id]);
        }
      } catch (error) {
        if (!step.continueOnError) {
          throw error;
        }
        results.push({ error: String(error) });
      }
    }

    stepExecution.iterationResults = results;

    // Clean up loop variables
    delete execution.context.variables[step.itemVariable];
    if (step.indexVariable) {
      delete execution.context.variables[step.indexVariable];
    }
  }

  /**
   * Execute a delay step
   */
  private async executeDelayStep(step: DelayStep): Promise<void> {
    switch (step.delayType) {
      case 'DURATION':
        await this.sleep(step.duration || 0);
        break;

      case 'UNTIL':
        // In production, this would save state and resume later
        throw new Error('UNTIL delay type requires durable execution');

      case 'SCHEDULE':
        // In production, this would schedule a resume
        throw new Error('SCHEDULE delay type requires durable execution');
    }
  }

  /**
   * Execute an approval step
   */
  private async executeApprovalStep(
    execution: WorkflowExecution,
    step: ApprovalStep,
    stepExecution: StepExecution
  ): Promise<void> {
    // In production, this would:
    // 1. Save execution state
    // 2. Create approval request
    // 3. Send notifications to approvers
    // 4. Resume when approved/rejected

    execution.status = 'WAITING';
    stepExecution.status = 'WAITING';
    stepExecution.approvals = [];

    await this.auditLog.log({
      tenantId: execution.tenantId,
      eventType: 'APPROVAL_REQUESTED',
      actorType: 'SYSTEM',
      actorId: 'workflow-executor',
      resourceType: 'STEP',
      resourceId: step.id,
      details: {
        approvers: step.approvers,
        approvalType: step.approvalType,
      },
    });

    // For now, throw to indicate this requires external continuation
    throw new Error('Approval step requires external continuation');
  }

  /**
   * Execute a sub-workflow step
   */
  private async executeSubworkflowStep(
    execution: WorkflowExecution,
    step: SubworkflowStep,
    stepExecution: StepExecution
  ): Promise<void> {
    // In production, this would start a child execution
    // and optionally wait for it to complete

    const input = this.buildStepInput(step.inputMapping, execution.context);
    stepExecution.input = input;

    throw new Error('Subworkflow step requires engine integration');
  }

  /**
   * Execute a transform step
   */
  private async executeTransformStep(
    execution: WorkflowExecution,
    step: TransformStep,
    stepExecution: StepExecution
  ): Promise<void> {
    for (const transform of step.transformations) {
      const value = this.resolveExpression(transform.expression, execution.context);

      switch (transform.type || 'SET') {
        case 'SET':
          this.setNestedValue(execution.context.variables, transform.target, value);
          break;
        case 'APPEND':
          const existing = this.getNestedValue(execution.context.variables, transform.target);
          if (Array.isArray(existing)) {
            existing.push(value);
          }
          break;
        case 'MERGE':
          const current = this.getNestedValue(execution.context.variables, transform.target);
          if (current && value && typeof current === 'object' && typeof value === 'object') {
            Object.assign(current as object, value);
          }
          break;
        case 'DELETE':
          this.deleteNestedValue(execution.context.variables, transform.target);
          break;
      }
    }
  }

  /**
   * Run compensation for a step
   */
  async runCompensation(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<void> {
    if (!step.compensation) return;

    for (const compStep of step.compensation.steps) {
      try {
        const action = this.actionRegistry.get(compStep.actionType);
        if (action) {
          const input = this.buildStepInput(compStep.config, execution.context);
          await action.execute(input, execution.context);
        }
      } catch (error) {
        if (compStep.required) {
          throw error;
        }
        // Log and continue for non-required compensation
        console.error(`Compensation step failed:`, error);
      }
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private async handleStepError(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    step: WorkflowStep,
    stepExecution: StepExecution,
    error: unknown
  ): Promise<void> {
    const handler = step.onError || workflow.onError;

    if (!handler) {
      throw error;
    }

    switch (handler.type) {
      case 'IGNORE':
        // Continue to next step
        break;

      case 'FALLBACK':
        if (handler.config?.fallbackStep) {
          const fallbackStep = workflow.steps.find(s => s.id === handler.config!.fallbackStep);
          if (fallbackStep) {
            await this.executeStep(workflow, execution, fallbackStep);
          }
        } else if (handler.config?.fallbackValue !== undefined) {
          execution.context.outputs[step.id] = handler.config.fallbackValue;
        }
        break;

      case 'COMPENSATE':
        await this.runCompensation(workflow, execution, step);
        throw error;

      case 'ESCALATE':
        // Send escalation notification
        await this.auditLog.log({
          tenantId: execution.tenantId,
          eventType: 'STEP_FAILED',
          actorType: 'SYSTEM',
          actorId: 'workflow-executor',
          resourceType: 'STEP',
          resourceId: step.id,
          details: {
            error: String(error),
            escalatedTo: handler.config?.escalateTo,
          },
        });
        throw error;

      case 'FAIL':
      default:
        throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors are retryable
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('timeout')) {
        return true;
      }
    }
    return false;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private createStepExecution(step: WorkflowStep): StepExecution {
    return {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: 'PENDING',
      retryCount: 0,
    };
  }

  private getCircuitBreaker(actionType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(actionType)) {
      this.circuitBreakers.set(actionType, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 30000,
      }));
    }
    return this.circuitBreakers.get(actionType)!;
  }

  private buildStepInput(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      result[key] = this.resolveValue(value, context);
    }

    return result;
  }

  private resolveValue(value: unknown, context: ExecutionContext): unknown {
    if (typeof value === 'string') {
      // Check for expression syntax: ${...}
      if (value.startsWith('${') && value.endsWith('}')) {
        const expression = value.slice(2, -1);
        return this.resolveExpression(expression, context);
      }
      // Template interpolation: {{...}}
      return value.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
        const resolved = this.resolveExpression(expr.trim(), context);
        return String(resolved ?? '');
      });
    }

    if (Array.isArray(value)) {
      return value.map(v => this.resolveValue(v, context));
    }

    if (typeof value === 'object' && value !== null) {
      return this.buildStepInput(value as Record<string, unknown>, context);
    }

    return value;
  }

  private resolveExpression(expression: string, context: ExecutionContext): unknown {
    // Simple path resolution
    const parts = expression.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private mapOutput(
    context: ExecutionContext,
    mapping: Record<string, string>,
    output: unknown
  ): void {
    for (const [target, source] of Object.entries(mapping)) {
      const value = this.getNestedValue(output, source);
      this.setNestedValue(context.variables, target, value);
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private deleteNestedValue(obj: Record<string, unknown>, path: string): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) return;
      current = current[parts[i]] as Record<string, unknown>;
    }

    delete current[parts[parts.length - 1]];
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, policy.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeoutPromise(ms: number, stepId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Step ${stepId} timed out after ${ms}ms`)), ms);
    });
  }

  private async waitForN<T>(
    promises: Promise<T>[],
    n: number
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let resolved = 0;
      let rejected = 0;

      promises.forEach(promise => {
        promise.then(result => {
          results.push(result);
          resolved++;
          if (resolved >= n) {
            resolve(results.slice(0, n));
          }
        }).catch(() => {
          rejected++;
          if (rejected > promises.length - n) {
            reject(new Error(`Could not complete ${n} branches`));
          }
        });
      });
    });
  }
}
