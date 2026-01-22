/**
 * @prompt-id forge-v4.1:api:audit:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 *
 * Audit Logging Module
 *
 * Enterprise-grade audit logging for compliance (SOC 2, GDPR).
 * Tracks all security-relevant actions with immutable records.
 */

import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService],
})
export class AuditModule {}
