/**
 * @prompt-id forge-v4.1:service:subscription:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

export interface SubscriptionScope {
  type: 'tenant' | 'workspace' | 'graph' | 'slice' | 'node' | 'pattern';
  id?: string;
  pattern?: string;
}

export interface SubscriptionFilters {
  eventTypes?: string[];
  entityTypes?: string[];
  nodeTypes?: string[];
  layers?: string[];
}

export interface SubscriptionOptions {
  delivery: {
    mode: 'realtime' | 'batched' | 'polling';
    batchWindow?: number;
  };
  content: {
    includePayload: boolean;
    deltaOnly: boolean;
    compress: boolean;
  };
  reliability: {
    ackRequired: boolean;
    retryOnFailure: boolean;
    maxRetries?: number;
  };
  catchUp?: {
    fromVersion?: bigint;
    maxEvents?: number;
  };
}

export interface CreateSubscriptionDto {
  tenantId: string;
  clientId: string;
  product: 'chat' | 'code' | 'cowork';
  productVersion: string;
  scopes: SubscriptionScope[];
  filters?: SubscriptionFilters;
  options: SubscriptionOptions;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new subscription
   */
  async create(dto: CreateSubscriptionDto): Promise<any> {
    const subscription = await this.prisma.contextSubscription.create({
      data: {
        id: uuidv4(),
        tenantId: dto.tenantId,
        clientId: dto.clientId,
        product: dto.product,
        productVersion: dto.productVersion,
        scopes: dto.scopes as any,
        filters: dto.filters as any ?? null,
        options: dto.options as any,
        isActive: true,
        expiresAt: addDays(new Date(), 7), // 7 day default expiry
      },
    });

    this.logger.log(
      `Created subscription ${subscription.id} for ${dto.product} client ${dto.clientId}`,
    );

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  async findById(id: string): Promise<any> {
    return this.prisma.contextSubscription.findUnique({
      where: { id },
    });
  }

  /**
   * Get active subscriptions for a tenant
   */
  async findActiveByTenant(tenantId: string): Promise<any[]> {
    return this.prisma.contextSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Get subscriptions for a client
   */
  async findByClient(tenantId: string, clientId: string): Promise<any[]> {
    return this.prisma.contextSubscription.findMany({
      where: {
        tenantId,
        clientId,
        isActive: true,
      },
    });
  }

  /**
   * Update subscription last acknowledged version
   */
  async updateLastAck(id: string, version: bigint): Promise<void> {
    await this.prisma.contextSubscription.update({
      where: { id },
      data: {
        lastVersion: version,
        lastAckAt: new Date(),
      },
    });
  }

  /**
   * Deactivate subscription
   */
  async deactivate(id: string): Promise<void> {
    await this.prisma.contextSubscription.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated subscription ${id}`);
  }

  /**
   * Find subscriptions matching an event
   */
  async findMatchingSubscriptions(event: any): Promise<any[]> {
    const allSubscriptions = await this.prisma.contextSubscription.findMany({
      where: {
        tenantId: event.tenantId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    return allSubscriptions.filter((sub) => this.matchesEvent(sub, event));
  }

  /**
   * Check if subscription matches an event
   */
  private matchesEvent(subscription: any, event: any): boolean {
    // Check scopes
    const scopes = subscription.scopes as SubscriptionScope[];
    const matchesScope = scopes.some((scope) =>
      this.matchesScope(scope, event),
    );

    if (!matchesScope) return false;

    // Check filters
    const filters = subscription.filters as SubscriptionFilters | null;
    if (!filters) return true;

    if (
      filters.eventTypes &&
      !filters.eventTypes.includes(event.eventType)
    ) {
      return false;
    }

    if (
      filters.entityTypes &&
      !filters.entityTypes.includes(event.entityType)
    ) {
      return false;
    }

    return true;
  }

  private matchesScope(scope: SubscriptionScope, event: any): boolean {
    switch (scope.type) {
      case 'tenant':
        return true;
      case 'workspace':
        return event.metadata?.workspaceId === scope.id;
      case 'graph':
        return event.graphId === scope.id;
      case 'slice':
        return event.entityType === 'slice' && event.entityId === scope.id;
      case 'node':
        return event.entityType === 'node' && event.entityId === scope.id;
      case 'pattern':
        return this.matchesPattern(event, scope.pattern!);
      default:
        return false;
    }
  }

  private matchesPattern(event: any, pattern: string): boolean {
    // Simple glob matching
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    const eventPath = `${event.entityType}/${event.entityId}`;
    return regex.test(eventPath);
  }

  /**
   * Cleanup expired subscriptions
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.contextSubscription.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isActive: false,
            lastAckAt: { lt: addDays(new Date(), -1) }, // Inactive for > 1 day
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired subscriptions`);
    }

    return result.count;
  }

  /**
   * Get subscription statistics
   */
  async getStats(tenantId: string): Promise<{
    totalActive: number;
    byProduct: Record<string, number>;
  }> {
    const subscriptions = await this.prisma.contextSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: { product: true },
    });

    const byProduct: Record<string, number> = {};
    for (const sub of subscriptions) {
      byProduct[sub.product] = (byProduct[sub.product] || 0) + 1;
    }

    return {
      totalActive: subscriptions.length,
      byProduct,
    };
  }
}
