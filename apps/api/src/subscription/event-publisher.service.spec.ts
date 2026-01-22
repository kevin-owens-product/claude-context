/**
 * @prompt-id forge-v4.1:test:event-publisher:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher, ContextEventData } from './event-publisher.service';
import { PrismaService } from '../database/prisma.service';

// Mock EventEmitter2 since it may not be installed
const mockEventEmitter = {
  emit: jest.fn(),
};

describe('EventPublisher', () => {
  let service: EventPublisher;
  let prisma: any;

  const mockEvent = {
    id: 'event-123',
    tenantId: 'tenant-123',
    graphId: 'graph-123',
    eventType: 'node.created',
    entityType: 'node',
    entityId: 'node-123',
    version: 1,
    globalVersion: BigInt(42),
    payload: { name: 'Test Node' },
    metadata: {},
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      contextEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      tenantVersion: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    // Import the actual class for proper provider token
    const { EventEmitter2 } = await import('@nestjs/event-emitter');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPublisher,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<EventPublisher>(EventPublisher);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish event and emit to subscribers', async () => {
      prisma.tenantVersion.upsert.mockResolvedValue({
        globalVersion: BigInt(43),
      });
      prisma.contextEvent.create.mockResolvedValue(mockEvent);

      const eventData: ContextEventData = {
        tenantId: 'tenant-123',
        graphId: 'graph-123',
        eventType: 'node.created',
        entityType: 'node',
        entityId: 'node-123',
        version: 1,
        actorId: 'user-123',
        actorType: 'user',
        payload: { name: 'Test Node' },
      };

      const result = await service.publish(eventData);

      expect(prisma.contextEvent.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should increment global version atomically', async () => {
      prisma.tenantVersion.upsert.mockResolvedValue({
        globalVersion: BigInt(100),
      });
      prisma.contextEvent.create.mockResolvedValue(mockEvent);

      const eventData: ContextEventData = {
        tenantId: 'tenant-123',
        graphId: 'graph-123',
        eventType: 'node.created',
        entityType: 'node',
        entityId: 'node-123',
        version: 1,
        actorId: 'user-123',
        actorType: 'user',
        payload: {},
      };

      await service.publish(eventData);

      expect(prisma.tenantVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123' },
          update: expect.objectContaining({
            globalVersion: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('getEventsSince', () => {
    it('should return events since a version', async () => {
      const events = [
        { ...mockEvent, globalVersion: BigInt(43) },
        { ...mockEvent, globalVersion: BigInt(44) },
      ];
      prisma.contextEvent.findMany.mockResolvedValue(events);

      const result = await service.getEventsSince('tenant-123', BigInt(42));

      expect(prisma.contextEvent.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          globalVersion: { gt: BigInt(42) },
        },
        orderBy: { globalVersion: 'asc' },
        take: 1000,
      });
      expect(result).toHaveLength(2);
    });

    it('should apply filters', async () => {
      prisma.contextEvent.findMany.mockResolvedValue([]);

      await service.getEventsSince('tenant-123', BigInt(0), {
        graphId: 'graph-123',
        entityTypes: ['node', 'slice'],
        limit: 50,
      });

      expect(prisma.contextEvent.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          globalVersion: { gt: BigInt(0) },
          graphId: 'graph-123',
          entityType: { in: ['node', 'slice'] },
        },
        orderBy: { globalVersion: 'asc' },
        take: 50,
      });
    });
  });

  describe('getLatestEvents', () => {
    it('should return latest events with limit', async () => {
      const events = [mockEvent];
      prisma.contextEvent.findMany.mockResolvedValue(events);

      const result = await service.getLatestEvents('tenant-123', 'graph-123', 10);

      expect(prisma.contextEvent.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123', graphId: 'graph-123' },
        orderBy: { globalVersion: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current global version', async () => {
      prisma.tenantVersion.findUnique.mockResolvedValue({
        globalVersion: BigInt(100),
      });

      const result = await service.getCurrentVersion('tenant-123');

      expect(result).toBe(BigInt(100));
    });

    it('should return 0 if no version exists', async () => {
      prisma.tenantVersion.findUnique.mockResolvedValue(null);

      const result = await service.getCurrentVersion('tenant-123');

      expect(result).toBe(BigInt(0));
    });
  });
});
