/**
 * @prompt-id forge-v4.1:api:audit:interceptor:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { AuditService, AuditAction, AuditOutcome } from './audit.service';

/**
 * Decorator to mark a handler for audit logging
 */
export function AuditLog(action: AuditAction, resourceType?: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('auditAction', action, descriptor.value);
    if (resourceType) {
      Reflect.defineMetadata('auditResourceType', resourceType, descriptor.value);
    }
    return descriptor;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const auditAction = Reflect.getMetadata('auditAction', handler) as AuditAction;

    // If no audit action is defined, skip logging
    if (!auditAction) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const resourceType = Reflect.getMetadata('auditResourceType', handler);
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        const resourceId = response?.id || request.params?.id;

        await this.auditService.log({
          action: auditAction,
          tenantId: request.user?.tenantId || 'anonymous',
          actorId: request.user?.sub,
          actorType: request.user?.type === 'api_key' ? 'api_key' : 'user',
          resourceType,
          resourceId,
          outcome: AuditOutcome.SUCCESS,
          metadata: {
            duration: Date.now() - startTime,
            method: request.method,
            path: request.path,
          },
          ipAddress: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
        });
      }),
      catchError(async (error) => {
        await this.auditService.log({
          action: auditAction,
          tenantId: request.user?.tenantId || 'anonymous',
          actorId: request.user?.sub,
          actorType: request.user?.type === 'api_key' ? 'api_key' : 'user',
          resourceType,
          resourceId: request.params?.id,
          outcome: AuditOutcome.FAILURE,
          errorCode: error.name || 'UNKNOWN_ERROR',
          errorMessage: error.message,
          metadata: {
            duration: Date.now() - startTime,
            method: request.method,
            path: request.path,
          },
          ipAddress: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        throw error;
      })
    );
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
