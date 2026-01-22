/**
 * @prompt-id forge-v4.1:controller:subscription:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { EventPublisher } from './event-publisher.service';
import { SubscriptionGateway } from './subscription.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreateSubscriptionDto {
  clientId: string;
  product: 'chat' | 'code' | 'cowork';
  productVersion: string;
  scopes: any[];
  filters?: any;
  options: any;
}

interface GetUpdatesQuery {
  sinceVersion?: string;
  sinceTimestamp?: string;
  graphId?: string;
  entityTypes?: string;
  limit?: string;
}

@Controller('context')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private eventPublisher: EventPublisher,
    private subscriptionGateway: SubscriptionGateway,
  ) {}

  /**
   * Create a new subscription (for polling-based clients)
   */
  @Post('subscribe')
  async createSubscription(
    @Request() req: any,
    @Body() dto: CreateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionService.create({
      tenantId: req.user.tenantId,
      clientId: dto.clientId,
      product: dto.product,
      productVersion: dto.productVersion,
      scopes: dto.scopes,
      filters: dto.filters,
      options: dto.options,
    });

    const currentVersion = await this.eventPublisher.getCurrentVersion(
      req.user.tenantId,
    );

    return {
      subscriptionId: subscription.id,
      websocketUrl: '/context/ws',
      currentVersion: currentVersion.toString(),
    };
  }

  /**
   * List active subscriptions
   */
  @Get('subscriptions')
  async listSubscriptions(@Request() req: any) {
    const subscriptions = await this.subscriptionService.findActiveByTenant(
      req.user.tenantId,
    );

    return {
      subscriptions: subscriptions.map((s: any) => ({
        id: s.id,
        clientId: s.clientId,
        product: s.product,
        productVersion: s.productVersion,
        isActive: s.isActive,
        lastVersion: s.lastVersion?.toString(),
        lastAckAt: s.lastAckAt?.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      })),
    };
  }

  /**
   * Get subscription by ID
   */
  @Get('subscriptions/:id')
  async getSubscription(@Request() req: any, @Param('id') id: string) {
    const subscription = await this.subscriptionService.findById(id);

    if (!subscription || subscription.tenantId !== req.user.tenantId) {
      return { error: 'Subscription not found' };
    }

    return {
      id: subscription.id,
      clientId: subscription.clientId,
      product: subscription.product,
      scopes: subscription.scopes,
      filters: subscription.filters,
      options: subscription.options,
      isActive: subscription.isActive,
      lastVersion: subscription.lastVersion?.toString(),
      expiresAt: subscription.expiresAt.toISOString(),
    };
  }

  /**
   * Deactivate subscription
   */
  @Delete('subscriptions/:id')
  async deleteSubscription(@Request() req: any, @Param('id') id: string) {
    const subscription = await this.subscriptionService.findById(id);

    if (!subscription || subscription.tenantId !== req.user.tenantId) {
      return { error: 'Subscription not found' };
    }

    await this.subscriptionService.deactivate(id);

    return { success: true };
  }

  /**
   * Get updates since a version (polling endpoint)
   */
  @Get('updates')
  async getUpdates(@Request() req: any, @Query() query: GetUpdatesQuery) {
    const sinceVersion = query.sinceVersion
      ? BigInt(query.sinceVersion)
      : BigInt(0);

    const events = await this.eventPublisher.getEventsSince(
      req.user.tenantId,
      sinceVersion,
      {
        graphId: query.graphId,
        entityTypes: query.entityTypes?.split(','),
        limit: query.limit ? parseInt(query.limit, 10) : 100,
      },
    );

    const currentVersion = await this.eventPublisher.getCurrentVersion(
      req.user.tenantId,
    );

    return {
      events: events.map((e: any) => ({
        id: e.id,
        eventType: e.eventType,
        entityType: e.entityType,
        entityId: e.entityId,
        version: e.version,
        globalVersion: e.globalVersion.toString(),
        payload: e.payload,
        timestamp: e.timestamp.toISOString(),
      })),
      currentVersion: currentVersion.toString(),
      hasMore: events.length === (query.limit ? parseInt(query.limit, 10) : 100),
    };
  }

  /**
   * Get current version
   */
  @Get('version')
  async getVersion(@Request() req: any) {
    const version = await this.eventPublisher.getCurrentVersion(
      req.user.tenantId,
    );

    return {
      globalVersion: version.toString(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get subscription statistics
   */
  @Get('subscriptions/stats')
  async getStats(@Request() req: any) {
    const serviceStats = await this.subscriptionService.getStats(
      req.user.tenantId,
    );
    const gatewayStats = this.subscriptionGateway.getStats();

    return {
      ...serviceStats,
      websocket: gatewayStats,
    };
  }

  /**
   * Health check for subscription system
   */
  @Get('health')
  async getHealth(@Request() req: any) {
    const stats = this.subscriptionGateway.getStats();

    return {
      status: 'healthy',
      connectedClients: stats.connectedClients,
      totalSubscriptions: stats.totalSubscriptions,
      pendingBatches: stats.pendingBatches,
    };
  }
}
