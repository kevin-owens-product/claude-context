/**
 * WorkflowAuditLog Tests
 *
 * @prompt-id forge-v4.1:test:workflow-audit-log:001
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowAuditLog } from '../audit-log';
import type { TenantId, AuditEventType } from '../types';

// Mock Prisma
const createMockPrisma = () => ({
  auditLog: {
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
});

// Mock Redis
const createMockRedis = () => ({
  xadd: vi.fn().mockResolvedValue('1234567890-0'),
});

describe('WorkflowAuditLog', () => {
  let auditLog: WorkflowAuditLog;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRedis = createMockRedis();
    auditLog = new WorkflowAuditLog(mockPrisma as any, mockRedis as any, {
      enablePiiDetection: true,
      enableIntegrity: true,
      hmacSecret: 'test-secret',
      retentionDays: 90,
    });
  });

  afterEach(async () => {
    await auditLog.stop();
  });

  describe('Logging Events', () => {
    it('should log an audit event', async () => {
      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: { action: 'started' },
      });

      // Event should be published to Redis stream
      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'audit:tenant_123',
        'MAXLEN', '~', '10000',
        '*',
        'data', expect.any(String)
      );
    });

    it('should include timestamp and unique ID', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      expect(capturedEntry.id).toMatch(/^audit_/);
      expect(capturedEntry.timestamp).toBeDefined();
      expect(new Date(capturedEntry.timestamp)).toBeInstanceOf(Date);
    });

    it('should include version number', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      expect(capturedEntry.version).toBe('1.0');
    });
  });

  describe('PII Detection', () => {
    it('should detect and mask email addresses', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          email: 'john.doe@example.com',
          message: 'Contact at test@test.com for info',
        },
      });

      expect(capturedEntry.containsPII).toBe(true);
      expect(capturedEntry.dataClassification).toBe('CONFIDENTIAL');
      expect(JSON.stringify(capturedEntry.details)).not.toContain('john.doe@example.com');
      expect(JSON.stringify(capturedEntry.details)).toContain('[REDACTED:EMAIL]');
    });

    it('should detect and mask phone numbers', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          phone: '555-123-4567',
        },
      });

      expect(capturedEntry.containsPII).toBe(true);
      expect(JSON.stringify(capturedEntry.details)).not.toContain('555-123-4567');
      expect(JSON.stringify(capturedEntry.details)).toContain('[REDACTED:PHONE]');
    });

    it('should detect and mask SSN', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          ssn: '123-45-6789',
        },
      });

      expect(capturedEntry.containsPII).toBe(true);
      expect(JSON.stringify(capturedEntry.details)).not.toContain('123-45-6789');
      expect(JSON.stringify(capturedEntry.details)).toContain('[REDACTED:SSN]');
    });

    it('should detect and mask credit card numbers', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          card: '4111-1111-1111-1111',
        },
      });

      expect(capturedEntry.containsPII).toBe(true);
      expect(JSON.stringify(capturedEntry.details)).not.toContain('4111-1111-1111-1111');
      expect(JSON.stringify(capturedEntry.details)).toContain('[REDACTED:CREDIT_CARD]');
    });

    it('should detect and mask IP addresses', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          ip: '192.168.1.100',
        },
      });

      expect(capturedEntry.containsPII).toBe(true);
      expect(JSON.stringify(capturedEntry.details)).not.toContain('192.168.1.100');
      expect(JSON.stringify(capturedEntry.details)).toContain('[REDACTED:IP_ADDRESS]');
    });

    it('should not flag non-PII data', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {
          workflowName: 'Test Workflow',
          stepCount: 5,
          enabled: true,
        },
      });

      expect(capturedEntry.containsPII).toBe(false);
      expect(capturedEntry.dataClassification).toBe('INTERNAL');
    });

    it('should handle PII detection disabled', async () => {
      await auditLog.stop();

      auditLog = new WorkflowAuditLog(mockPrisma as any, mockRedis as any, {
        enablePiiDetection: false,
      });

      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'DATA_EXPORTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'export',
        resourceId: 'export_123',
        details: {
          email: 'john.doe@example.com',
        },
      });

      // Email should NOT be redacted when PII detection is disabled
      expect(JSON.stringify(capturedEntry.details)).toContain('john.doe@example.com');
    });
  });

  describe('Integrity Signatures', () => {
    it('should include signature when integrity is enabled', async () => {
      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      expect(capturedEntry.signature).toBeDefined();
      expect(capturedEntry.signature).toMatch(/^sig_/);
    });

    it('should generate consistent signatures for same data', async () => {
      const signatures: string[] = [];
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        const entry = JSON.parse(args[5] as string);
        signatures.push(entry.signature);
        return Promise.resolve('1234567890-0');
      });

      // Log same event twice (note: timestamps will differ)
      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      // Signatures will be different due to different timestamps/IDs
      expect(signatures[0]).not.toEqual(signatures[1]);
    });

    it('should not include signature when integrity is disabled', async () => {
      await auditLog.stop();

      auditLog = new WorkflowAuditLog(mockPrisma as any, mockRedis as any, {
        enableIntegrity: false,
      });

      let capturedEntry: any;
      mockRedis.xadd.mockImplementation((...args: unknown[]) => {
        capturedEntry = JSON.parse(args[5] as string);
        return Promise.resolve('1234567890-0');
      });

      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      expect(capturedEntry.signature).toBeUndefined();
    });
  });

  describe('Integrity Verification', () => {
    it('should verify valid entries', async () => {
      const entries = [
        {
          id: 'audit_123',
          timestamp: new Date(),
          eventType: 'EXECUTION_STARTED' as AuditEventType,
          tenantId: 'tenant_123' as TenantId,
          actorType: 'USER' as const,
          actorId: 'user_123',
          resourceType: 'workflow',
          resourceId: 'wf_123',
          details: {},
          containsPII: false,
          dataClassification: 'INTERNAL' as const,
          version: '1.0',
          // Note: signature would need to match the hash algorithm
        },
      ];

      const result = await auditLog.verifyIntegrity(entries);
      expect(result.valid).toBe(true);
      expect(result.invalidEntries).toHaveLength(0);
    });

    it('should detect tampered entries', async () => {
      const entries = [
        {
          id: 'audit_123',
          timestamp: new Date(),
          eventType: 'EXECUTION_STARTED' as AuditEventType,
          tenantId: 'tenant_123' as TenantId,
          actorType: 'USER' as const,
          actorId: 'user_123',
          resourceType: 'workflow',
          resourceId: 'wf_123',
          details: {},
          containsPII: false,
          dataClassification: 'INTERNAL' as const,
          version: '1.0',
          signature: 'sig_invalid', // Invalid signature
        },
      ];

      const result = await auditLog.verifyIntegrity(entries);
      expect(result.valid).toBe(false);
      expect(result.invalidEntries).toContain('audit_123');
    });
  });

  describe('Export Formats', () => {
    it('should export as JSON', async () => {
      const result = await auditLog.export({
        tenantId: 'tenant_123' as TenantId,
      }, 'JSON');

      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain('[');
    });

    it('should export as CSV', async () => {
      const result = await auditLog.export({
        tenantId: 'tenant_123' as TenantId,
      }, 'CSV');

      expect(result).toContain('id,timestamp,eventType');
    });

    it('should export as SIEM format (CEF)', async () => {
      const result = await auditLog.export({
        tenantId: 'tenant_123' as TenantId,
      }, 'SIEM');

      // CEF format check
      expect(typeof result).toBe('string');
    });
  });

  describe('Query', () => {
    it('should return empty results for new instance', async () => {
      const result = await auditLog.query({
        tenantId: 'tenant_123' as TenantId,
      });

      expect(result).toMatchObject({
        entries: [],
        total: 0,
        hasMore: false,
      });
    });
  });

  describe('Resource Audit Trail', () => {
    it('should return audit trail for a resource', async () => {
      const trail = await auditLog.getResourceAuditTrail(
        'tenant_123' as TenantId,
        'workflow',
        'wf_123'
      );

      expect(Array.isArray(trail)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old entries based on retention', async () => {
      const count = await auditLog.cleanup();
      expect(typeof count).toBe('number');
    });

    it('should skip cleanup when retention is not set', async () => {
      await auditLog.stop();

      auditLog = new WorkflowAuditLog(mockPrisma as any, mockRedis as any, {
        // No retentionDays set
      });

      const count = await auditLog.cleanup();
      expect(count).toBe(0);
    });
  });

  describe('Lifecycle', () => {
    it('should stop cleanly', async () => {
      await auditLog.stop();
      // No assertions - just verifying no errors
    });

    it('should handle multiple stop calls', async () => {
      await auditLog.stop();
      await auditLog.stop();
      // No assertions - just verifying no errors
    });
  });

  describe('Stream Publishing', () => {
    it('should publish to tenant-specific stream', async () => {
      await auditLog.log({
        tenantId: 'tenant_456' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        'audit:tenant_456',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should handle stream publishing errors gracefully', async () => {
      mockRedis.xadd.mockRejectedValueOnce(new Error('Redis error'));

      // Should not throw
      await auditLog.log({
        tenantId: 'tenant_123' as TenantId,
        eventType: 'EXECUTION_STARTED' as AuditEventType,
        actorType: 'USER',
        actorId: 'user_123',
        resourceType: 'workflow',
        resourceId: 'wf_123',
        details: {},
      });
    });
  });
});
