/**
 * @prompt-id forge-v4.1:gateway:subscription:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionService } from './subscription.service';
import { EventPublisher } from './event-publisher.service';
import { AuthService } from '../auth/auth.service';

interface ClientInfo {
  clientId: string;
  tenantId: string;
  userId: string;
  subscriptions: Map<string, any>;
}

interface SubscribePayload {
  auth: {
    type: 'jwt' | 'api_key';
    token: string;
  };
  client: {
    product: 'chat' | 'code' | 'cowork';
    productVersion: string;
    clientId: string;
  };
  subscription: {
    scopes: any[];
    filters?: any;
    options: any;
  };
}

@WebSocketGateway({
  path: '/context/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SubscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SubscriptionGateway.name);
  private clients: Map<string, ClientInfo> = new Map();
  private socketToClient: Map<string, string> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private batches: Map<string, any[]> = new Map();

  constructor(
    private subscriptionService: SubscriptionService,
    private eventPublisher: EventPublisher,
    private authService: AuthService,
  ) {}

  async handleConnection(socket: Socket) {
    this.logger.log(`Client connecting: ${socket.id}`);

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(socket: Socket) {
    const clientId = this.socketToClient.get(socket.id);

    if (clientId) {
      const clientInfo = this.clients.get(clientId);

      if (clientInfo) {
        // Deactivate subscriptions
        for (const [subId] of clientInfo.subscriptions) {
          await this.subscriptionService.deactivate(subId);
        }

        this.clients.delete(clientId);
      }

      this.socketToClient.delete(socket.id);
    }

    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SubscribePayload,
  ) {
    try {
      // Validate auth
      const authResult = await this.validateAuth(payload.auth);

      if (!authResult.valid) {
        return {
          type: 'error',
          error: { code: 'UNAUTHORIZED', message: authResult.error },
        };
      }

      // Create subscription
      const subscription = await this.subscriptionService.create({
        tenantId: authResult.tenantId!,
        clientId: payload.client.clientId,
        product: payload.client.product,
        productVersion: payload.client.productVersion,
        scopes: payload.subscription.scopes,
        filters: payload.subscription.filters,
        options: payload.subscription.options,
      });

      // Track client
      const existingClient = this.clients.get(payload.client.clientId);

      if (existingClient) {
        existingClient.subscriptions.set(subscription.id, subscription);
      } else {
        this.clients.set(payload.client.clientId, {
          clientId: payload.client.clientId,
          tenantId: authResult.tenantId!,
          userId: authResult.userId!,
          subscriptions: new Map([[subscription.id, subscription]]),
        });
      }

      this.socketToClient.set(socket.id, payload.client.clientId);

      // Join tenant room for broadcasts
      socket.join(`tenant:${authResult.tenantId}`);

      // Get current version
      const currentVersion = await this.eventPublisher.getCurrentVersion(
        authResult.tenantId!,
      );

      this.logger.log(
        `Subscription created: ${subscription.id} for ${payload.client.product}`,
      );

      // Handle catch-up if requested
      if (payload.subscription.options?.catchUp?.fromVersion !== undefined) {
        await this.handleCatchUp(
          socket,
          subscription,
          BigInt(payload.subscription.options.catchUp.fromVersion),
        );
      }

      return {
        type: 'subscribed',
        payload: {
          subscriptionId: subscription.id,
          currentVersion: currentVersion.toString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Subscribe error: ${error.message}`);
      return {
        type: 'error',
        error: { code: 'SUBSCRIBE_FAILED', message: error.message },
      };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { subscriptionId: string },
  ) {
    const clientId = this.socketToClient.get(socket.id);

    if (!clientId) {
      return { type: 'error', error: { code: 'NOT_CONNECTED' } };
    }

    const clientInfo = this.clients.get(clientId);

    if (!clientInfo) {
      return { type: 'error', error: { code: 'NOT_FOUND' } };
    }

    await this.subscriptionService.deactivate(payload.subscriptionId);
    clientInfo.subscriptions.delete(payload.subscriptionId);

    this.logger.log(`Subscription removed: ${payload.subscriptionId}`);

    return { type: 'unsubscribed', payload: { subscriptionId: payload.subscriptionId } };
  }

  @SubscribeMessage('ack')
  async handleAck(
    @MessageBody() payload: { subscriptionId: string; version: string },
  ) {
    await this.subscriptionService.updateLastAck(
      payload.subscriptionId,
      BigInt(payload.version),
    );

    return { type: 'acked' };
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { type: 'pong', timestamp: new Date().toISOString() };
  }

  /**
   * Handle context events from event publisher
   */
  @OnEvent('context.event')
  async handleContextEvent(event: any) {
    // Find matching subscriptions
    const matchingSubs =
      await this.subscriptionService.findMatchingSubscriptions(event);

    for (const subscription of matchingSubs) {
      const clientInfo = this.findClientBySubscription(subscription.id);

      if (!clientInfo) continue;

      const socket = this.findSocketByClientId(clientInfo.clientId);

      if (!socket) continue;

      const options = subscription.options as any;

      if (options.delivery?.mode === 'batched') {
        await this.addToBatch(subscription, event);
      } else {
        // Real-time delivery
        this.deliverEvent(socket, subscription.id, event, options);
      }
    }
  }

  private async handleCatchUp(
    socket: Socket,
    subscription: any,
    fromVersion: bigint,
  ) {
    const events = await this.eventPublisher.getEventsSince(
      subscription.tenantId,
      fromVersion,
      {
        limit: subscription.options?.catchUp?.maxEvents ?? 1000,
      },
    );

    if (events.length > 0) {
      socket.emit('batch', {
        subscriptionId: subscription.id,
        events: events.map((e: any) => this.formatEvent(e, subscription.options)),
        position: {
          fromVersion: events[0].globalVersion.toString(),
          toVersion: events[events.length - 1].globalVersion.toString(),
        },
        isCatchUp: true,
      });
    }
  }

  private async addToBatch(subscription: any, event: any) {
    const batchKey = `batch:${subscription.id}`;
    const batch = this.batches.get(batchKey) || [];
    batch.push(event);
    this.batches.set(batchKey, batch);

    // Schedule flush if not already scheduled
    if (!this.batchTimers.has(batchKey)) {
      const batchWindow = subscription.options?.delivery?.batchWindow ?? 5000;
      const timer = setTimeout(() => {
        this.flushBatch(subscription);
      }, batchWindow);
      this.batchTimers.set(batchKey, timer);
    }
  }

  private async flushBatch(subscription: any) {
    const batchKey = `batch:${subscription.id}`;
    const batch = this.batches.get(batchKey) || [];

    if (batch.length === 0) return;

    const clientInfo = this.findClientBySubscription(subscription.id);

    if (!clientInfo) return;

    const socket = this.findSocketByClientId(clientInfo.clientId);

    if (!socket) return;

    socket.emit('batch', {
      subscriptionId: subscription.id,
      events: batch.map((e) => this.formatEvent(e, subscription.options)),
      position: {
        fromVersion: batch[0].globalVersion.toString(),
        toVersion: batch[batch.length - 1].globalVersion.toString(),
      },
    });

    this.batches.delete(batchKey);
    this.batchTimers.delete(batchKey);
  }

  private deliverEvent(
    socket: Socket,
    subscriptionId: string,
    event: any,
    options: any,
  ) {
    socket.emit('event', {
      subscriptionId,
      event: this.formatEvent(event, options),
      position: {
        version: event.globalVersion.toString(),
        timestamp: event.timestamp.toISOString(),
      },
    });
  }

  private formatEvent(event: any, options: any): any {
    const formatted: any = {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      version: event.version,
      globalVersion: event.globalVersion.toString(),
      timestamp: event.timestamp.toISOString(),
    };

    if (options?.content?.includePayload) {
      formatted.payload = event.payload;
    }

    return formatted;
  }

  private async validateAuth(auth: { type: string; token: string }): Promise<{
    valid: boolean;
    tenantId?: string;
    userId?: string;
    error?: string;
  }> {
    try {
      if (auth.type === 'jwt') {
        const payload = await this.authService.verifyToken(auth.token);
        return {
          valid: true,
          tenantId: payload.tenantId,
          userId: payload.sub,
        };
      } else if (auth.type === 'api_key') {
        const result = await this.authService.validateApiKey(auth.token);

        if (result) {
          return {
            valid: true,
            tenantId: result.tenantId,
            userId: result.sub,
          };
        }
      }

      return { valid: false, error: 'Invalid credentials' };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  private findClientBySubscription(subscriptionId: string): ClientInfo | undefined {
    for (const [, clientInfo] of this.clients) {
      if (clientInfo.subscriptions.has(subscriptionId)) {
        return clientInfo;
      }
    }
    return undefined;
  }

  private findSocketByClientId(clientId: string): Socket | undefined {
    for (const [socketId, cId] of this.socketToClient) {
      if (cId === clientId) {
        return this.server.sockets.sockets.get(socketId);
      }
    }
    return undefined;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values()).reduce(
        (sum, c) => sum + c.subscriptions.size,
        0,
      ),
      pendingBatches: this.batches.size,
    };
  }
}
