/**
 * Intent Graph Service - Manages intent graphs as source of truth
 * @prompt-id forge-v4.1:service:intent-graph:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type {
  ProjectId,
  IntentGraphId,
  IntentGraph,
  IntentGoal,
  IntentConstraint,
  IntentEntity,
  IntentBehavior,
  IntentContext,
  IntentGraphStatus,
  GoalPriority,
  GoalStatus,
  ConstraintCategory,
  ConstraintSeverity,
  ContextCategory,
  CreateIntentGraphRequest,
  EntityAttribute,
  EntityRelationship,
  StateMachine,
  ValidationRule,
  BehaviorTrigger,
  BehaviorStep,
  ErrorHandler,
} from '../types/living-software.types';

const CACHE_TTL = 300;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export class IntentGraphService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // INTENT GRAPH CRUD
  // ============================================================================

  async listIntentGraphs(
    tenantId: TenantId,
    projectId: ProjectId,
    options: PaginationOptions & { status?: IntentGraphStatus } = {}
  ): Promise<PaginatedResult<IntentGraph>> {
    const { limit = 20, offset = 0, status } = options;

    const where = {
      tenantId,
      projectId,
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.intentGraph.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          goals: true,
          constraints: true,
          entities: true,
          behaviors: true,
          contexts: true,
        },
      }),
      this.prisma.intentGraph.count({ where }),
    ]);

    return {
      data: data.map(this.mapToIntentGraph.bind(this)),
      total,
      limit,
      offset,
    };
  }

  async getIntentGraph(
    tenantId: TenantId,
    intentGraphId: IntentGraphId
  ): Promise<IntentGraph | null> {
    const graph = await this.prisma.intentGraph.findFirst({
      where: { id: intentGraphId, tenantId },
      include: {
        goals: {
          include: { subGoals: true },
          orderBy: { createdAt: 'asc' },
        },
        constraints: { orderBy: { createdAt: 'asc' } },
        entities: { orderBy: { createdAt: 'asc' } },
        behaviors: { orderBy: { createdAt: 'asc' } },
        contexts: { orderBy: { createdAt: 'asc' } },
      },
    });

    return graph ? this.mapToIntentGraph(graph) : null;
  }

  async createIntentGraph(
    tenantId: TenantId,
    userId: UserId,
    request: CreateIntentGraphRequest
  ): Promise<IntentGraph> {
    const graph = await this.prisma.intentGraph.create({
      data: {
        tenantId,
        projectId: request.projectId,
        name: request.name,
        description: request.description,
        status: 'DRAFT',
        version: 1,
        metadata: {},
        createdById: userId,
      },
      include: {
        goals: true,
        constraints: true,
        entities: true,
        behaviors: true,
        contexts: true,
      },
    });

    return this.mapToIntentGraph(graph);
  }

  async updateIntentGraph(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    updates: Partial<{
      name: string;
      description: string;
      status: IntentGraphStatus;
    }>
  ): Promise<IntentGraph | null> {
    const existing = await this.getIntentGraph(tenantId, intentGraphId);
    if (!existing) return null;

    const graph = await this.prisma.intentGraph.update({
      where: { id: intentGraphId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status && { status: updates.status }),
        version: { increment: 1 },
      },
      include: {
        goals: true,
        constraints: true,
        entities: true,
        behaviors: true,
        contexts: true,
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentGraph(graph);
  }

  async deleteIntentGraph(
    tenantId: TenantId,
    intentGraphId: IntentGraphId
  ): Promise<boolean> {
    const existing = await this.getIntentGraph(tenantId, intentGraphId);
    if (!existing) return false;

    await this.prisma.intentGraph.delete({
      where: { id: intentGraphId },
    });

    await this.invalidateCache(intentGraphId);
    return true;
  }

  // ============================================================================
  // GOAL OPERATIONS
  // ============================================================================

  async addGoal(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    goal: {
      description: string;
      successCriteria?: string[];
      priority?: GoalPriority;
      parentGoalId?: string;
      linkedConstraintIds?: string[];
      linkedBehaviorIds?: string[];
      rationale?: string;
    }
  ): Promise<IntentGoal> {
    const result = await this.prisma.intentGoal.create({
      data: {
        intentGraphId,
        description: goal.description,
        successCriteria: goal.successCriteria || [],
        priority: goal.priority || 'MEDIUM',
        status: 'PROPOSED',
        parentGoalId: goal.parentGoalId,
        linkedConstraintIds: goal.linkedConstraintIds || [],
        linkedBehaviorIds: goal.linkedBehaviorIds || [],
        rationale: goal.rationale,
        confidence: 0.8,
        userConfirmed: false,
        sourceOrigin: 'manual',
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentGoal(result);
  }

  async updateGoal(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    goalId: string,
    updates: Partial<{
      description: string;
      successCriteria: string[];
      priority: GoalPriority;
      status: GoalStatus;
      userConfirmed: boolean;
    }>
  ): Promise<IntentGoal | null> {
    try {
      const result = await this.prisma.intentGoal.update({
        where: { id: goalId },
        data: updates,
      });
      await this.invalidateCache(intentGraphId);
      return this.mapToIntentGoal(result);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // CONSTRAINT OPERATIONS
  // ============================================================================

  async addConstraint(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    constraint: {
      description: string;
      category: ConstraintCategory;
      severity?: ConstraintSeverity;
      verificationMethod?: string;
      linkedGoalIds?: string[];
      linkedEntityIds?: string[];
      linkedBehaviorIds?: string[];
    }
  ): Promise<IntentConstraint> {
    const result = await this.prisma.intentConstraint.create({
      data: {
        intentGraphId,
        description: constraint.description,
        category: constraint.category,
        severity: constraint.severity || 'SHOULD',
        verificationMethod: constraint.verificationMethod,
        linkedGoalIds: constraint.linkedGoalIds || [],
        linkedEntityIds: constraint.linkedEntityIds || [],
        linkedBehaviorIds: constraint.linkedBehaviorIds || [],
        conflictsWith: [],
        confidence: 0.8,
        userConfirmed: false,
        sourceOrigin: 'manual',
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentConstraint(result);
  }

  // ============================================================================
  // ENTITY OPERATIONS
  // ============================================================================

  async addEntity(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    entity: {
      name: string;
      description?: string;
      attributes?: EntityAttribute[];
      relationships?: EntityRelationship[];
      stateMachine?: StateMachine;
      validationRules?: ValidationRule[];
    }
  ): Promise<IntentEntity> {
    const result = await this.prisma.intentEntity.create({
      data: {
        intentGraphId,
        name: entity.name,
        description: entity.description,
        attributes: JSON.parse(JSON.stringify(entity.attributes || [])),
        relationships: JSON.parse(JSON.stringify(entity.relationships || [])),
        stateMachine: entity.stateMachine ? JSON.parse(JSON.stringify(entity.stateMachine)) : undefined,
        validationRules: JSON.parse(JSON.stringify(entity.validationRules || [])),
        linkedBehaviorIds: [],
        confidence: 0.8,
        userConfirmed: false,
        sourceOrigin: 'manual',
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentEntity(result);
  }

  // ============================================================================
  // BEHAVIOR OPERATIONS
  // ============================================================================

  async addBehavior(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    behavior: {
      name: string;
      description?: string;
      trigger: BehaviorTrigger;
      preconditions?: string[];
      steps?: BehaviorStep[];
      postconditions?: string[];
      errorHandlers?: ErrorHandler[];
      linkedGoalIds?: string[];
      linkedEntityIds?: string[];
      linkedConstraintIds?: string[];
    }
  ): Promise<IntentBehavior> {
    const result = await this.prisma.intentBehavior.create({
      data: {
        intentGraphId,
        name: behavior.name,
        description: behavior.description,
        trigger: JSON.parse(JSON.stringify(behavior.trigger)),
        preconditions: behavior.preconditions || [],
        steps: JSON.parse(JSON.stringify(behavior.steps || [])),
        postconditions: behavior.postconditions || [],
        errorHandlers: JSON.parse(JSON.stringify(behavior.errorHandlers || [])),
        linkedGoalIds: behavior.linkedGoalIds || [],
        linkedEntityIds: behavior.linkedEntityIds || [],
        linkedConstraintIds: behavior.linkedConstraintIds || [],
        confidence: 0.8,
        userConfirmed: false,
        sourceOrigin: 'manual',
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentBehavior(result);
  }

  // ============================================================================
  // CONTEXT OPERATIONS
  // ============================================================================

  async addContext(
    tenantId: TenantId,
    intentGraphId: IntentGraphId,
    context: {
      category: ContextCategory;
      description: string;
      implications?: string[];
      linkedNodeIds?: string[];
    }
  ): Promise<IntentContext> {
    const result = await this.prisma.intentContext.create({
      data: {
        intentGraphId,
        category: context.category,
        description: context.description,
        implications: context.implications || [],
        linkedNodeIds: context.linkedNodeIds || [],
        confidence: 0.8,
        userConfirmed: false,
        sourceOrigin: 'manual',
      },
    });

    await this.invalidateCache(intentGraphId);
    return this.mapToIntentContext(result);
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  async validateIntentGraph(
    tenantId: TenantId,
    intentGraphId: IntentGraphId
  ): Promise<ValidationResult> {
    const graph = await this.getIntentGraph(tenantId, intentGraphId);
    if (!graph) {
      return {
        valid: false,
        errors: [{ path: 'root', message: 'Intent graph not found', severity: 'error' }],
      };
    }

    const errors: ValidationError[] = [];

    // Collect all IDs
    const goalIds = new Set(graph.goals?.map((g) => g.id) || []);
    const constraintIds = new Set(graph.constraints?.map((c) => c.id) || []);
    const entityIds = new Set(graph.entities?.map((e) => e.id) || []);
    const behaviorIds = new Set(graph.behaviors?.map((b) => b.id) || []);

    // Validate goal references
    for (const goal of graph.goals || []) {
      // Check parent goal exists
      if (goal.parentGoalId && !goalIds.has(goal.parentGoalId)) {
        errors.push({
          path: `goals.${goal.id}.parentGoalId`,
          message: `Parent goal ${goal.parentGoalId} not found`,
          severity: 'error',
        });
      }

      // Check linked constraints exist
      for (const constraintId of goal.linkedConstraintIds) {
        if (!constraintIds.has(constraintId)) {
          errors.push({
            path: `goals.${goal.id}.linkedConstraintIds`,
            message: `Linked constraint ${constraintId} not found`,
            severity: 'warning',
          });
        }
      }

      // Check linked behaviors exist
      for (const behaviorId of goal.linkedBehaviorIds) {
        if (!behaviorIds.has(behaviorId)) {
          errors.push({
            path: `goals.${goal.id}.linkedBehaviorIds`,
            message: `Linked behavior ${behaviorId} not found`,
            severity: 'warning',
          });
        }
      }
    }

    // Check for goal hierarchy cycles
    const cycleErrors = this.detectGoalCycles(graph.goals || []);
    errors.push(...cycleErrors);

    // Validate constraint references
    for (const constraint of graph.constraints || []) {
      for (const goalId of constraint.linkedGoalIds) {
        if (!goalIds.has(goalId)) {
          errors.push({
            path: `constraints.${constraint.id}.linkedGoalIds`,
            message: `Linked goal ${goalId} not found`,
            severity: 'warning',
          });
        }
      }

      for (const entityId of constraint.linkedEntityIds) {
        if (!entityIds.has(entityId)) {
          errors.push({
            path: `constraints.${constraint.id}.linkedEntityIds`,
            message: `Linked entity ${entityId} not found`,
            severity: 'warning',
          });
        }
      }
    }

    // Validate entity relationships
    for (const entity of graph.entities || []) {
      for (const rel of entity.relationships) {
        if (!entityIds.has(rel.targetEntityId)) {
          errors.push({
            path: `entities.${entity.id}.relationships.${rel.name}`,
            message: `Target entity ${rel.targetEntityId} not found`,
            severity: 'error',
          });
        }
      }

      // Validate state machine
      if (entity.stateMachine) {
        const stateNames = new Set(entity.stateMachine.states.map((s) => s.name));

        if (!stateNames.has(entity.stateMachine.initialState)) {
          errors.push({
            path: `entities.${entity.id}.stateMachine.initialState`,
            message: `Initial state ${entity.stateMachine.initialState} not found`,
            severity: 'error',
          });
        }

        for (const transition of entity.stateMachine.transitions) {
          if (!stateNames.has(transition.from)) {
            errors.push({
              path: `entities.${entity.id}.stateMachine.transitions`,
              message: `Transition from state ${transition.from} not found`,
              severity: 'error',
            });
          }
          if (!stateNames.has(transition.to)) {
            errors.push({
              path: `entities.${entity.id}.stateMachine.transitions`,
              message: `Transition to state ${transition.to} not found`,
              severity: 'error',
            });
          }
        }
      }
    }

    // Validate behavior steps ordering
    for (const behavior of graph.behaviors || []) {
      const stepOrders = behavior.steps.map((s) => s.order);
      const sortedOrders = [...stepOrders].sort((a, b) => a - b);

      if (JSON.stringify(stepOrders) !== JSON.stringify(sortedOrders)) {
        errors.push({
          path: `behaviors.${behavior.id}.steps`,
          message: 'Behavior steps are not in sequential order',
          severity: 'warning',
        });
      }
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  private detectGoalCycles(goals: IntentGoal[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const goalMap = new Map(goals.map((g) => [g.id, g]));

    function detectCycle(goalId: string, visited: Set<string>, path: string[]): boolean {
      if (visited.has(goalId)) {
        return true;
      }

      const goal = goalMap.get(goalId);
      if (!goal || !goal.parentGoalId) {
        return false;
      }

      visited.add(goalId);
      path.push(goalId);

      if (detectCycle(goal.parentGoalId, visited, path)) {
        return true;
      }

      visited.delete(goalId);
      path.pop();
      return false;
    }

    for (const goal of goals) {
      const visited = new Set<string>();
      const path: string[] = [];

      if (detectCycle(goal.id, visited, path)) {
        errors.push({
          path: `goals.${goal.id}`,
          message: `Circular goal hierarchy detected: ${path.join(' -> ')}`,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToIntentGraph(record: any): IntentGraph {
    return {
      id: record.id as IntentGraphId,
      tenantId: record.tenantId as TenantId,
      projectId: record.projectId as ProjectId,
      name: record.name,
      description: record.description,
      version: record.version,
      status: record.status as IntentGraphStatus,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdById: record.createdById as UserId,
      goals: record.goals?.map(this.mapToIntentGoal.bind(this)),
      constraints: record.constraints?.map(this.mapToIntentConstraint.bind(this)),
      entities: record.entities?.map(this.mapToIntentEntity.bind(this)),
      behaviors: record.behaviors?.map(this.mapToIntentBehavior.bind(this)),
      contexts: record.contexts?.map(this.mapToIntentContext.bind(this)),
    };
  }

  private mapToIntentGoal(record: any): IntentGoal {
    return {
      id: record.id,
      intentGraphId: record.intentGraphId as IntentGraphId,
      description: record.description,
      successCriteria: record.successCriteria || [],
      priority: record.priority as GoalPriority,
      status: record.status as GoalStatus,
      parentGoalId: record.parentGoalId,
      linkedConstraintIds: record.linkedConstraintIds || [],
      linkedBehaviorIds: record.linkedBehaviorIds || [],
      rationale: record.rationale,
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      sourceOrigin: record.sourceOrigin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      subGoals: record.subGoals?.map(this.mapToIntentGoal.bind(this)),
    };
  }

  private mapToIntentConstraint(record: any): IntentConstraint {
    return {
      id: record.id,
      intentGraphId: record.intentGraphId as IntentGraphId,
      description: record.description,
      category: record.category as ConstraintCategory,
      severity: record.severity as ConstraintSeverity,
      verificationMethod: record.verificationMethod,
      linkedGoalIds: record.linkedGoalIds || [],
      linkedEntityIds: record.linkedEntityIds || [],
      linkedBehaviorIds: record.linkedBehaviorIds || [],
      conflictsWith: record.conflictsWith || [],
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      sourceOrigin: record.sourceOrigin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapToIntentEntity(record: any): IntentEntity {
    return {
      id: record.id,
      intentGraphId: record.intentGraphId as IntentGraphId,
      name: record.name,
      description: record.description,
      attributes: record.attributes || [],
      relationships: record.relationships || [],
      stateMachine: record.stateMachine,
      validationRules: record.validationRules || [],
      linkedBehaviorIds: record.linkedBehaviorIds || [],
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      sourceOrigin: record.sourceOrigin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapToIntentBehavior(record: any): IntentBehavior {
    return {
      id: record.id,
      intentGraphId: record.intentGraphId as IntentGraphId,
      name: record.name,
      description: record.description,
      trigger: record.trigger,
      preconditions: record.preconditions || [],
      steps: record.steps || [],
      postconditions: record.postconditions || [],
      errorHandlers: record.errorHandlers || [],
      linkedGoalIds: record.linkedGoalIds || [],
      linkedEntityIds: record.linkedEntityIds || [],
      linkedConstraintIds: record.linkedConstraintIds || [],
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      sourceOrigin: record.sourceOrigin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapToIntentContext(record: any): IntentContext {
    return {
      id: record.id,
      intentGraphId: record.intentGraphId as IntentGraphId,
      category: record.category as ContextCategory,
      description: record.description,
      implications: record.implications || [],
      linkedNodeIds: record.linkedNodeIds || [],
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      sourceOrigin: record.sourceOrigin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async invalidateCache(intentGraphId: IntentGraphId): Promise<void> {
    const pattern = `intent-graph:${intentGraphId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
