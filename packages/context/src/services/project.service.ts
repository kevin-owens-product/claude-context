/**
 * Project Service - Manages projects with goals, constraints, and decisions
 * @prompt-id forge-v4.1:service:project:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, WorkspaceId, PaginationOptions, PaginatedResult } from '../types';
import type {
  ContextId,
  ProjectId,
  Project,
  ProjectGoal,
  ProjectConstraint,
  ProjectDecision,
  ProjectStatus,
  GoalPriority,
  GoalStatus,
  ConstraintCategory,
  ConstraintSeverity,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateGoalRequest,
  CreateConstraintRequest,
  CreateDecisionRequest,
} from '../types/living-software.types';
import { IdentityService } from './identity.service';

const CACHE_TTL = 300; // 5 minutes

export class ProjectService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly identityService: IdentityService
  ) {}

  // ============================================================================
  // PROJECT CRUD OPERATIONS
  // ============================================================================

  async listProjects(
    tenantId: TenantId,
    userId: UserId,
    options: PaginationOptions & { status?: ProjectStatus } = {}
  ): Promise<PaginatedResult<Project>> {
    const { limit = 20, offset = 0, status } = options;
    const context = await this.identityService.getOrCreateUserContext(tenantId, userId);

    // Convert status to uppercase to match database enum values
    const normalizedStatus = status?.toUpperCase() as ProjectStatus | undefined;

    const where = {
      contextId: context.id,
      ...(normalizedStatus && { status: normalizedStatus }),
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { lastActiveAt: 'desc' },
        include: {
          goals: { orderBy: { createdAt: 'asc' } },
          constraints: { orderBy: { createdAt: 'asc' } },
          decisions: { orderBy: { madeAt: 'desc' } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: data.map(this.mapToProject),
      total,
      limit,
      offset,
    };
  }

  async getProject(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId
  ): Promise<Project | null> {
    const context = await this.identityService.getOrCreateUserContext(tenantId, userId);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, contextId: context.id },
      include: {
        goals: {
          orderBy: { createdAt: 'asc' },
          include: { subGoals: true },
        },
        constraints: { orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { madeAt: 'desc' } },
      },
    });

    return project ? this.mapToProject(project) : null;
  }

  async createProject(
    tenantId: TenantId,
    userId: UserId,
    request: CreateProjectRequest
  ): Promise<Project> {
    const context = await this.identityService.getOrCreateUserContext(tenantId, userId);

    const project = await this.prisma.project.create({
      data: {
        tenantId,
        contextId: context.id,
        workspaceId: request.workspaceId,
        name: request.name,
        description: request.description,
        status: 'ACTIVE',
        confidence: 0.8,
        userConfirmed: true,
        metadata: {},
        lastActiveAt: new Date(),
      },
      include: {
        goals: true,
        constraints: true,
        decisions: true,
      },
    });

    // Create initial goals if provided
    if (request.goals?.length) {
      for (const goal of request.goals) {
        await this.addGoal(tenantId, userId, project.id as ProjectId, goal);
      }
    }

    // Create initial constraints if provided
    if (request.constraints?.length) {
      for (const constraint of request.constraints) {
        await this.addConstraint(tenantId, userId, project.id as ProjectId, constraint);
      }
    }

    await this.invalidateProjectCache(tenantId, userId);

    // Fetch fresh with relations
    return (await this.getProject(tenantId, userId, project.id as ProjectId))!;
  }

  async updateProject(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    request: UpdateProjectRequest
  ): Promise<Project | null> {
    const existing = await this.getProject(tenantId, userId, projectId);
    if (!existing) return null;

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.status && { status: request.status }),
        lastActiveAt: new Date(),
      },
    });

    await this.invalidateProjectCache(tenantId, userId);
    return this.getProject(tenantId, userId, projectId);
  }

  async deleteProject(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId
  ): Promise<boolean> {
    const existing = await this.getProject(tenantId, userId, projectId);
    if (!existing) return false;

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    await this.invalidateProjectCache(tenantId, userId);
    return true;
  }

  // ============================================================================
  // GOAL OPERATIONS
  // ============================================================================

  async addGoal(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    request: CreateGoalRequest
  ): Promise<ProjectGoal> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const goal = await this.prisma.projectGoal.create({
      data: {
        projectId,
        description: request.description,
        successCriteria: request.successCriteria || [],
        priority: request.priority || 'MEDIUM',
        status: 'PROPOSED',
        parentGoalId: request.parentGoalId,
        confidence: 0.8,
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectGoal(goal);
  }

  async updateGoal(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    goalId: string,
    updates: Partial<{
      description: string;
      successCriteria: string[];
      priority: GoalPriority;
      status: GoalStatus;
    }>
  ): Promise<ProjectGoal | null> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) return null;

    const existing = project.goals?.find(g => g.id === goalId);
    if (!existing) return null;

    const goal = await this.prisma.projectGoal.update({
      where: { id: goalId },
      data: {
        ...(updates.description && { description: updates.description }),
        ...(updates.successCriteria && { successCriteria: updates.successCriteria }),
        ...(updates.priority && { priority: updates.priority }),
        ...(updates.status && { status: updates.status }),
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectGoal(goal);
  }

  async deleteGoal(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    goalId: string
  ): Promise<boolean> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) return false;

    try {
      await this.prisma.projectGoal.delete({
        where: { id: goalId },
      });
      await this.touchProject(projectId);
      await this.invalidateProjectCache(tenantId, userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CONSTRAINT OPERATIONS
  // ============================================================================

  async addConstraint(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    request: CreateConstraintRequest
  ): Promise<ProjectConstraint> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const constraint = await this.prisma.projectConstraint.create({
      data: {
        projectId,
        description: request.description,
        category: request.category,
        severity: request.severity || 'SHOULD',
        verificationMethod: request.verificationMethod,
        confidence: 0.8,
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectConstraint(constraint);
  }

  async updateConstraint(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    constraintId: string,
    updates: Partial<{
      description: string;
      category: ConstraintCategory;
      severity: ConstraintSeverity;
      verificationMethod: string;
    }>
  ): Promise<ProjectConstraint | null> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) return null;

    const existing = project.constraints?.find(c => c.id === constraintId);
    if (!existing) return null;

    const constraint = await this.prisma.projectConstraint.update({
      where: { id: constraintId },
      data: {
        ...(updates.description && { description: updates.description }),
        ...(updates.category && { category: updates.category }),
        ...(updates.severity && { severity: updates.severity }),
        ...(updates.verificationMethod !== undefined && { verificationMethod: updates.verificationMethod }),
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectConstraint(constraint);
  }

  async deleteConstraint(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    constraintId: string
  ): Promise<boolean> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) return false;

    try {
      await this.prisma.projectConstraint.delete({
        where: { id: constraintId },
      });
      await this.touchProject(projectId);
      await this.invalidateProjectCache(tenantId, userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // DECISION OPERATIONS
  // ============================================================================

  async addDecision(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    request: CreateDecisionRequest
  ): Promise<ProjectDecision> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const decision = await this.prisma.projectDecision.create({
      data: {
        projectId,
        description: request.description,
        rationale: request.rationale,
        alternativesConsidered: request.alternativesConsidered || [],
        madeAt: new Date(),
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectDecision(decision);
  }

  async reverseDecision(
    tenantId: TenantId,
    userId: UserId,
    projectId: ProjectId,
    decisionId: string
  ): Promise<ProjectDecision | null> {
    const project = await this.getProject(tenantId, userId, projectId);
    if (!project) return null;

    const existing = project.decisions?.find(d => d.id === decisionId);
    if (!existing) return null;

    const decision = await this.prisma.projectDecision.update({
      where: { id: decisionId },
      data: {
        reversedAt: new Date(),
      },
    });

    await this.touchProject(projectId);
    await this.invalidateProjectCache(tenantId, userId);

    return this.mapToProjectDecision(decision);
  }

  // ============================================================================
  // ACTIVE PROJECT INFERENCE
  // ============================================================================

  async inferActiveProject(
    tenantId: TenantId,
    userId: UserId,
    query?: string
  ): Promise<Project | null> {
    const context = await this.identityService.getOrCreateUserContext(tenantId, userId);

    // Get most recently active project
    const recentProject = await this.prisma.project.findFirst({
      where: {
        contextId: context.id,
        status: 'ACTIVE',
      },
      orderBy: { lastActiveAt: 'desc' },
      include: {
        goals: true,
        constraints: true,
        decisions: true,
      },
    });

    if (!recentProject) return null;

    // If query provided, could do semantic matching here
    // For now, just return most recent
    return this.mapToProject(recentProject);
  }

  async formatProjectForContext(
    project: Project,
    maxTokens: number = 2000
  ): Promise<string> {
    let xml = `<active_project name="${this.escapeXml(project.name)}" id="${project.id}" confidence="${project.confidence.toFixed(2)}">\n`;
    xml += `  <status>${project.status.toLowerCase()}</status>\n`;
    xml += `  <last_active>${project.lastActiveAt.toISOString()}</last_active>\n`;

    if (project.description) {
      xml += `  <description>${this.escapeXml(project.description)}</description>\n`;
    }

    // Goals
    if (project.goals?.length) {
      xml += '  <goals>\n';
      for (const goal of project.goals) {
        xml += `    <goal id="${goal.id}" status="${goal.status.toLowerCase()}" priority="${goal.priority.toLowerCase()}">\n`;
        xml += `      ${this.escapeXml(goal.description)}\n`;
        if (goal.successCriteria.length) {
          xml += '      <success_criteria>\n';
          for (const criterion of goal.successCriteria) {
            xml += `        <criterion>${this.escapeXml(criterion)}</criterion>\n`;
          }
          xml += '      </success_criteria>\n';
        }
        xml += '    </goal>\n';
      }
      xml += '  </goals>\n';
    }

    // Constraints
    if (project.constraints?.length) {
      xml += '  <constraints>\n';
      for (const constraint of project.constraints) {
        xml += `    <constraint category="${constraint.category.toLowerCase()}" severity="${constraint.severity.toLowerCase()}">\n`;
        xml += `      ${this.escapeXml(constraint.description)}\n`;
        xml += '    </constraint>\n';
      }
      xml += '  </constraints>\n';
    }

    // Recent decisions
    if (project.decisions?.length) {
      xml += '  <decisions>\n';
      const recentDecisions = project.decisions.slice(0, 5);
      for (const decision of recentDecisions) {
        const reversedAttr = decision.reversedAt ? ' reversed="true"' : '';
        xml += `    <decision made="${decision.madeAt.toISOString().split('T')[0]}"${reversedAttr}>\n`;
        xml += `      ${this.escapeXml(decision.description)}\n`;
        if (decision.rationale) {
          xml += `      <rationale>${this.escapeXml(decision.rationale)}</rationale>\n`;
        }
        xml += '    </decision>\n';
      }
      xml += '  </decisions>\n';
    }

    xml += '</active_project>';
    return xml;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToProject = (record: any): Project => {
    return {
      id: record.id as ProjectId,
      tenantId: record.tenantId as TenantId,
      contextId: record.contextId as ContextId,
      workspaceId: record.workspaceId as WorkspaceId | undefined,
      name: record.name,
      description: record.description,
      status: record.status as ProjectStatus,
      confidence: record.confidence,
      userConfirmed: record.userConfirmed,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastActiveAt: record.lastActiveAt,
      goals: record.goals?.map((g: any) => this.mapToProjectGoal(g)),
      constraints: record.constraints?.map((c: any) => this.mapToProjectConstraint(c)),
      decisions: record.decisions?.map((d: any) => this.mapToProjectDecision(d)),
    };
  };

  private mapToProjectGoal = (record: any): ProjectGoal => {
    return {
      id: record.id,
      projectId: record.projectId as ProjectId,
      description: record.description,
      successCriteria: record.successCriteria || [],
      priority: record.priority as GoalPriority,
      status: record.status as GoalStatus,
      parentGoalId: record.parentGoalId,
      confidence: record.confidence,
      sourceRef: record.sourceRef,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      subGoals: record.subGoals?.map((g: any) => this.mapToProjectGoal(g)),
    };
  };

  private mapToProjectConstraint = (record: any): ProjectConstraint => {
    return {
      id: record.id,
      projectId: record.projectId as ProjectId,
      description: record.description,
      category: record.category as ConstraintCategory,
      severity: record.severity as ConstraintSeverity,
      verificationMethod: record.verificationMethod,
      confidence: record.confidence,
      sourceRef: record.sourceRef,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };

  private mapToProjectDecision = (record: any): ProjectDecision => {
    return {
      id: record.id,
      projectId: record.projectId as ProjectId,
      description: record.description,
      rationale: record.rationale,
      alternativesConsidered: record.alternativesConsidered || [],
      madeAt: record.madeAt,
      reversedAt: record.reversedAt,
      sourceRef: record.sourceRef,
      createdAt: record.createdAt,
    };
  };

  private async touchProject(projectId: ProjectId): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastActiveAt: new Date() },
    });
  }

  private async invalidateProjectCache(
    tenantId: TenantId,
    userId: UserId
  ): Promise<void> {
    const pattern = `project:*:${tenantId}:${userId}`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    // Also invalidate assembly cache
    const assemblyPattern = `assembly:${tenantId}:${userId}:*`;
    const assemblyKeys = await this.redis.keys(assemblyPattern);
    if (assemblyKeys.length > 0) {
      await this.redis.del(...assemblyKeys);
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
