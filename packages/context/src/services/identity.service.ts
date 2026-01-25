/**
 * Identity Service - Manages user identity graph
 * @prompt-id forge-v4.1:service:identity:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId } from '../types';
import type {
  ContextId,
  UserContext,
  IdentityAttribute,
  IdentityGraph,
  ContextSettings,
  CreateIdentityAttributeRequest,
  UpdateIdentityAttributeRequest,
} from '../types/living-software.types';

const CACHE_TTL = 300; // 5 minutes
const DEFAULT_SETTINGS: ContextSettings = {
  memoryEnabled: true,
  observationLevel: 2,
  retentionDays: 90,
  excludedTopics: [],
};

export class IdentityService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // USER CONTEXT OPERATIONS
  // ============================================================================

  async getOrCreateUserContext(
    tenantId: TenantId,
    userId: UserId
  ): Promise<UserContext> {
    // Try cache first
    const cacheKey = `identity:context:${tenantId}:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Find or create
    let context = await this.prisma.userContext.findUnique({
      where: { userId },
    });

    if (!context) {
      context = await this.prisma.userContext.create({
        data: {
          tenantId,
          userId,
          settings: DEFAULT_SETTINGS as any,
        },
      });
    }

    const result = this.mapToUserContext(context);
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  }

  async updateContextSettings(
    tenantId: TenantId,
    userId: UserId,
    settings: Partial<ContextSettings>
  ): Promise<UserContext> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const updated = await this.prisma.userContext.update({
      where: { id: context.id },
      data: {
        settings: {
          ...context.settings,
          ...settings,
        } as any,
      },
    });

    await this.invalidateContextCache(tenantId, userId);
    return this.mapToUserContext(updated);
  }

  // ============================================================================
  // IDENTITY ATTRIBUTE OPERATIONS
  // ============================================================================

  async getIdentityGraph(
    tenantId: TenantId,
    userId: UserId
  ): Promise<IdentityGraph> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const attributes = await this.prisma.identityAttribute.findMany({
      where: { contextId: context.id },
      orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      contextId: context.id,
      userId: context.userId,
      tenantId: context.tenantId,
      attributes: attributes.map((attr) => this.mapToIdentityAttributeWithCategory(attr)),
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
    };
  }

  async getAttribute(
    tenantId: TenantId,
    userId: UserId,
    key: string
  ): Promise<IdentityAttribute | null> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const attribute = await this.prisma.identityAttribute.findUnique({
      where: {
        contextId_key: {
          contextId: context.id,
          key,
        },
      },
    });

    return attribute ? this.mapToIdentityAttribute(attribute) : null;
  }

  async setAttribute(
    tenantId: TenantId,
    userId: UserId,
    request: CreateIdentityAttributeRequest
  ): Promise<IdentityAttribute> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const valueType = request.valueType || this.inferValueType(request.value);

    const attribute = await this.prisma.identityAttribute.upsert({
      where: {
        contextId_key: {
          contextId: context.id,
          key: request.key,
        },
      },
      create: {
        contextId: context.id,
        key: request.key,
        value: request.value as any,
        valueType,
        source: request.source || 'explicit',
        confidence: request.confidence ?? 0.8,
      },
      update: {
        value: request.value as any,
        valueType,
        source: request.source || 'explicit',
        confidence: request.confidence ?? 0.8,
        updatedAt: new Date(),
      },
    });

    await this.invalidateIdentityCache(tenantId, userId);
    return this.mapToIdentityAttribute(attribute);
  }

  async updateAttribute(
    tenantId: TenantId,
    userId: UserId,
    key: string,
    request: UpdateIdentityAttributeRequest
  ): Promise<IdentityAttribute | null> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const existing = await this.prisma.identityAttribute.findUnique({
      where: {
        contextId_key: {
          contextId: context.id,
          key,
        },
      },
    });

    if (!existing) {
      return null;
    }

    const attribute = await this.prisma.identityAttribute.update({
      where: { id: existing.id },
      data: {
        ...(request.value !== undefined && {
          value: request.value as any,
          valueType: this.inferValueType(request.value),
        }),
        ...(request.confidence !== undefined && {
          confidence: request.confidence,
        }),
        ...(request.source && { source: request.source }),
        updatedAt: new Date(),
      },
    });

    await this.invalidateIdentityCache(tenantId, userId);
    return this.mapToIdentityAttribute(attribute);
  }

  async deleteAttribute(
    tenantId: TenantId,
    userId: UserId,
    key: string
  ): Promise<boolean> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    try {
      await this.prisma.identityAttribute.delete({
        where: {
          contextId_key: {
            contextId: context.id,
            key,
          },
        },
      });
      await this.invalidateIdentityCache(tenantId, userId);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // HIGH-CONFIDENCE IDENTITY FOR CONTEXT ASSEMBLY
  // ============================================================================

  async getHighConfidenceAttributes(
    tenantId: TenantId,
    userId: UserId,
    minConfidence: number = 0.7
  ): Promise<IdentityAttribute[]> {
    const context = await this.getOrCreateUserContext(tenantId, userId);

    const attributes = await this.prisma.identityAttribute.findMany({
      where: {
        contextId: context.id,
        confidence: { gte: minConfidence },
      },
      orderBy: { confidence: 'desc' },
    });

    return attributes.map(this.mapToIdentityAttribute);
  }

  async formatIdentityForContext(
    tenantId: TenantId,
    userId: UserId
  ): Promise<string> {
    const attributes = await this.getHighConfidenceAttributes(tenantId, userId);

    if (attributes.length === 0) {
      return '';
    }

    const grouped = this.groupAttributesByCategory(attributes);

    let xml = '<user_identity>\n';

    for (const [category, attrs] of Object.entries(grouped)) {
      xml += `  <${category}>\n`;
      for (const attr of attrs) {
        const confidenceAttr = attr.confidence >= 0.9 ? '' : ` confidence="${attr.confidence.toFixed(2)}"`;
        xml += `    <${attr.key}${confidenceAttr}>${this.formatValue(attr.value)}</${attr.key}>\n`;
      }
      xml += `  </${category}>\n`;
    }

    xml += '</user_identity>';
    return xml;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToUserContext(record: any): UserContext {
    return {
      id: record.id as ContextId,
      tenantId: record.tenantId as TenantId,
      userId: record.userId as UserId,
      settings: (record.settings || DEFAULT_SETTINGS) as ContextSettings,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapToIdentityAttribute(record: any): IdentityAttribute {
    return {
      id: record.id,
      contextId: record.contextId as ContextId,
      key: record.key,
      value: record.value,
      valueType: record.valueType as any,
      confidence: record.confidence,
      source: record.source as any,
      sourceRef: record.sourceRef,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // Maps attribute with category for frontend compatibility
  private mapToIdentityAttributeWithCategory(record: any): IdentityAttribute & { category: string } {
    const base = this.mapToIdentityAttribute(record);
    return {
      ...base,
      category: this.inferCategory(record.key),
    };
  }

  private inferCategory(key: string): 'demographic' | 'preference' | 'skill' | 'goal' | 'constraint' | 'context' {
    const lowerKey = key.toLowerCase();

    // Check for explicit prefixes
    if (lowerKey.startsWith('pref.') || lowerKey.includes('prefer') || lowerKey.includes('style')) {
      return 'preference';
    }
    if (lowerKey.startsWith('skill.') || lowerKey.includes('expertise') || lowerKey.includes('language')) {
      return 'skill';
    }
    if (lowerKey.startsWith('goal.') || lowerKey.includes('goal') || lowerKey.includes('objective')) {
      return 'goal';
    }
    if (lowerKey.startsWith('constraint.') || lowerKey.includes('constraint') || lowerKey.includes('limit')) {
      return 'constraint';
    }
    if (lowerKey.startsWith('context.') || lowerKey.includes('project') || lowerKey.includes('domain')) {
      return 'context';
    }
    if (lowerKey.includes('role') || lowerKey.includes('name') || lowerKey.includes('location') || lowerKey.includes('timezone')) {
      return 'demographic';
    }

    // Default to preference if unknown
    return 'preference';
  }

  private inferValueType(value: unknown): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private groupAttributesByCategory(
    attributes: IdentityAttribute[]
  ): Record<string, IdentityAttribute[]> {
    const categories: Record<string, IdentityAttribute[]> = {
      expertise: [],
      preferences: [],
      communication: [],
      general: [],
    };

    for (const attr of attributes) {
      if (attr.key.startsWith('expertise.') || attr.key.includes('skill')) {
        categories.expertise.push(attr);
      } else if (attr.key.startsWith('pref.') || attr.key.includes('prefer')) {
        categories.preferences.push(attr);
      } else if (attr.key.startsWith('comm.') || attr.key.includes('style')) {
        categories.communication.push(attr);
      } else {
        categories.general.push(attr);
      }
    }

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([, attrs]) => attrs.length > 0)
    );
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return JSON.stringify(value);
  }

  private async invalidateContextCache(
    tenantId: TenantId,
    userId: UserId
  ): Promise<void> {
    const cacheKey = `identity:context:${tenantId}:${userId}`;
    await this.redis.del(cacheKey);
  }

  private async invalidateIdentityCache(
    tenantId: TenantId,
    userId: UserId
  ): Promise<void> {
    await this.invalidateContextCache(tenantId, userId);
    const pattern = `identity:*:${tenantId}:${userId}`;
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
}
