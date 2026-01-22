/**
 * @prompt-id forge-v4.1:service:event-publisher:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ContextEventData {
  tenantId: string;
  graphId: string;
  eventType: string;
  entityType: 'node' | 'edge' | 'graph' | 'slice';
  entityId: string;
  version: number;
  actorId: string;
  actorType: 'user' | 'api_key' | 'system';
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Publish a context event
   */
  async publish(data: ContextEventData): Promise<string> {
    // Get next global version
    const globalVersion = await this.getNextGlobalVersion(data.tenantId);

    // Store event
    const event = await this.prisma.contextEvent.create({
      data: {
        id: uuidv4(),
        tenantId: data.tenantId,
        graphId: data.graphId,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        version: data.version,
        globalVersion,
        vectorClock: {},
        actorId: data.actorId,
        actorType: data.actorType,
        payload: data.payload,
        metadata: data.metadata ?? {},
      },
    });

    this.logger.log(
      `Published event ${event.id}: ${data.eventType} for ${data.entityType}/${data.entityId}`,
    );

    // Emit for WebSocket distribution
    this.eventEmitter.emit('context.event', event);

    return event.id;
  }

  /**
   * Get events since a specific version
   */
  async getEventsSince(
    tenantId: string,
    sinceVersion: bigint,
    options?: {
      graphId?: string;
      entityTypes?: string[];
      limit?: number;
    },
  ): Promise<any[]> {
    return this.prisma.contextEvent.findMany({
      where: {
        tenantId,
        globalVersion: { gt: sinceVersion },
        ...(options?.graphId && { graphId: options.graphId }),
        ...(options?.entityTypes && {
          entityType: { in: options.entityTypes },
        }),
      },
      orderBy: { globalVersion: 'asc' },
      take: options?.limit ?? 1000,
    });
  }

  /**
   * Get latest events for a graph
   */
  async getLatestEvents(
    tenantId: string,
    graphId: string,
    limit: number = 100,
  ): Promise<any[]> {
    return this.prisma.contextEvent.findMany({
      where: {
        tenantId,
        graphId,
      },
      orderBy: { globalVersion: 'desc' },
      take: limit,
    });
  }

  /**
   * Get current global version
   */
  async getCurrentVersion(tenantId: string): Promise<bigint> {
    const version = await this.prisma.tenantVersion.findUnique({
      where: { tenantId },
    });

    return version?.globalVersion ?? BigInt(0);
  }

  private async getNextGlobalVersion(tenantId: string): Promise<bigint> {
    const result = await this.prisma.tenantVersion.upsert({
      where: { tenantId },
      create: {
        id: uuidv4(),
        tenantId,
        globalVersion: BigInt(1),
      },
      update: {
        globalVersion: {
          increment: 1,
        },
      },
    });

    return result.globalVersion;
  }
}
