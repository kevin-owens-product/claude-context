/**
 * @prompt-id forge-v4.1:api:audit:002
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  API_KEY_CREATED = 'auth.api_key.created',
  API_KEY_REVOKED = 'auth.api_key.revoked',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  PASSWORD_CHANGED = 'auth.password.changed',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset_requested',

  // Context
  CONTEXT_GRAPH_CREATED = 'context.graph.created',
  CONTEXT_GRAPH_DELETED = 'context.graph.deleted',
  CONTEXT_NODE_CREATED = 'context.node.created',
  CONTEXT_NODE_UPDATED = 'context.node.updated',
  CONTEXT_NODE_DELETED = 'context.node.deleted',
  CONTEXT_COMPILED = 'context.compiled',
  CONTEXT_SEARCHED = 'context.searched',

  // Slices
  SLICE_CREATED = 'slice.created',
  SLICE_UPDATED = 'slice.updated',
  SLICE_DELETED = 'slice.deleted',
  SLICE_TRANSITIONED = 'slice.transitioned',

  // Team
  USER_INVITED = 'team.user.invited',
  USER_REMOVED = 'team.user.removed',
  USER_ROLE_CHANGED = 'team.user.role_changed',
  WORKSPACE_CREATED = 'team.workspace.created',
  WORKSPACE_DELETED = 'team.workspace.deleted',

  // Admin
  SETTINGS_UPDATED = 'admin.settings.updated',
  BILLING_UPDATED = 'admin.billing.updated',
  DATA_EXPORTED = 'admin.data.exported',
  DATA_DELETED = 'admin.data.deleted',

  // Integrations
  INTEGRATION_CONNECTED = 'integration.connected',
  INTEGRATION_DISCONNECTED = 'integration.disconnected',
  INTEGRATION_SYNCED = 'integration.synced',

  // AI Sessions
  SESSION_STARTED = 'ai.session.started',
  SESSION_ENDED = 'ai.session.ended',
  FEEDBACK_SUBMITTED = 'ai.feedback.submitted',
}

export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

export interface AuditEventData {
  action: AuditAction;
  actorId?: string;
  actorType?: 'user' | 'api_key' | 'system';
  tenantId: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  outcome?: AuditOutcome;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(data: AuditEventData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.actorId || 'system',
          actorType: data.actorType || 'system',
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          metadata: data.metadata || {},
          outcome: data.outcome || AuditOutcome.SUCCESS,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Log to stdout as fallback - audit logs should never fail silently
      this.logger.error('Failed to write audit log', {
        error,
        data,
      });

      // Write to fallback storage (e.g., file, external service)
      this.writeFallbackLog(data);
    }
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions) {
    const where: any = {
      tenantId: options.tenantId,
    };

    if (options.startDate) {
      where.timestamp = { ...where.timestamp, gte: options.startDate };
    }
    if (options.endDate) {
      where.timestamp = { ...where.timestamp, lte: options.endDate };
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.actorId) {
      where.actorId = options.actorId;
    }
    if (options.resourceType) {
      where.resourceType = options.resourceType;
    }
    if (options.resourceId) {
      where.resourceId = options.resourceId;
    }
    if (options.outcome) {
      where.outcome = options.outcome;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit log by ID
   */
  async getById(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });
  }

  /**
   * Get summary of audit actions for a time period
   */
  async getSummary(tenantId: string, startDate: Date, endDate: Date) {
    const logs = await this.prisma.auditLog.groupBy({
      by: ['action', 'outcome'],
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    // Group by action category
    const summary: Record<string, { total: number; success: number; failure: number }> = {};

    for (const log of logs) {
      const category = log.action.split('.')[0];
      if (!summary[category]) {
        summary[category] = { total: 0, success: 0, failure: 0 };
      }
      summary[category].total += log._count;
      if (log.outcome === AuditOutcome.SUCCESS) {
        summary[category].success += log._count;
      } else {
        summary[category].failure += log._count;
      }
    }

    return summary;
  }

  /**
   * Export audit logs for compliance
   */
  async export(options: AuditQueryOptions): Promise<string> {
    const { logs } = await this.query({
      ...options,
      limit: 10000, // Max export size
    });

    // Return as JSON Lines format for compliance tools
    return logs.map((log) => JSON.stringify(log)).join('\n');
  }

  /**
   * Write to fallback storage when primary fails
   */
  private writeFallbackLog(data: AuditEventData): void {
    // In production, this would write to a file, S3, or external service
    console.error('[AUDIT_FALLBACK]', JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * Convenience method: Log a successful action
   */
  success(
    action: AuditAction,
    tenantId: string,
    actorId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.log({
      action,
      tenantId,
      actorId,
      actorType: 'user',
      outcome: AuditOutcome.SUCCESS,
      metadata,
    });
  }

  /**
   * Convenience method: Log a failed action
   */
  failure(
    action: AuditAction,
    tenantId: string,
    actorId: string,
    errorCode: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.log({
      action,
      tenantId,
      actorId,
      actorType: 'user',
      outcome: AuditOutcome.FAILURE,
      errorCode,
      errorMessage,
      metadata,
    });
  }

  /**
   * Convenience method: Log an access denied action
   */
  denied(
    action: AuditAction,
    tenantId: string,
    actorId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.log({
      action,
      tenantId,
      actorId,
      actorType: 'user',
      outcome: AuditOutcome.DENIED,
      errorCode: 'ACCESS_DENIED',
      metadata,
    });
  }
}
