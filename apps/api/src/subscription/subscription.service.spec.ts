/**
 * @prompt-id forge-v4.1:test:subscription-service:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService, CreateSubscriptionDto } from './subscription.service';
import { PrismaService } from '../database/prisma.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: jest.Mocked<PrismaService>;

  const mockSubscription = {
    id: 'sub-123',
    tenantId: 'tenant-123',
    clientId: 'client-123',
    product: 'code',
    productVersion: '1.0.0',
    scopes: [{ type: 'tenant' }],
    filters: { eventTypes: ['node.created'] },
    options: {
      delivery: { mode: 'realtime' },
      content: { includePayload: true, deltaOnly: false, compress: false },
      reliability: { ackRequired: true, retryOnFailure: true },
    },
    isActive: true,
    lastVersion: null,
    lastAckAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto: CreateSubscriptionDto = {
    tenantId: 'tenant-123',
    clientId: 'client-123',
    product: 'code',
    productVersion: '1.0.0',
    scopes: [{ type: 'tenant' }],
    filters: { eventTypes: ['node.created'] },
    options: {
      delivery: { mode: 'realtime' },
      content: { includePayload: true, deltaOnly: false, compress: false },
      reliability: { ackRequired: true, retryOnFailure: true },
    },
  };

  beforeEach(async () => {
    const mockPrisma = {
      contextSubscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      (prisma.contextSubscription.create as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.create(mockCreateDto);

      expect(prisma.contextSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          clientId: 'client-123',
          product: 'code',
          productVersion: '1.0.0',
          isActive: true,
        }),
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should set default 7-day expiry', async () => {
      (prisma.contextSubscription.create as jest.Mock).mockResolvedValue(mockSubscription);

      await service.create(mockCreateDto);

      const createCall = (prisma.contextSubscription.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = new Date();
      const daysDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeGreaterThan(6.9);
      expect(daysDiff).toBeLessThan(7.1);
    });
  });

  describe('findById', () => {
    it('should return subscription by ID', async () => {
      (prisma.contextSubscription.findUnique as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.findById('sub-123');

      expect(prisma.contextSubscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null if not found', async () => {
      (prisma.contextSubscription.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findActiveByTenant', () => {
    it('should return active subscriptions for tenant', async () => {
      const subscriptions = [mockSubscription, { ...mockSubscription, id: 'sub-456' }];
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue(subscriptions);

      const result = await service.findActiveByTenant('tenant-123');

      expect(prisma.contextSubscription.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findByClient', () => {
    it('should return subscriptions for a specific client', async () => {
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([mockSubscription]);

      const result = await service.findByClient('tenant-123', 'client-123');

      expect(prisma.contextSubscription.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          clientId: 'client-123',
          isActive: true,
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateLastAck', () => {
    it('should update last acknowledged version', async () => {
      (prisma.contextSubscription.update as jest.Mock).mockResolvedValue({});

      await service.updateLastAck('sub-123', BigInt(42));

      expect(prisma.contextSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: {
          lastVersion: BigInt(42),
          lastAckAt: expect.any(Date),
        },
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate subscription', async () => {
      (prisma.contextSubscription.update as jest.Mock).mockResolvedValue({});

      await service.deactivate('sub-123');

      expect(prisma.contextSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: { isActive: false },
      });
    });
  });

  describe('findMatchingSubscriptions', () => {
    it('should find subscriptions matching tenant scope', async () => {
      const tenantScopeSub = {
        ...mockSubscription,
        scopes: [{ type: 'tenant' }],
        filters: null,
      };
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([tenantScopeSub]);

      const event = {
        tenantId: 'tenant-123',
        eventType: 'node.created',
        entityType: 'context_node',
        entityId: 'node-123',
      };

      const result = await service.findMatchingSubscriptions(event);

      expect(result).toHaveLength(1);
    });

    it('should filter by event type', async () => {
      const filteredSub = {
        ...mockSubscription,
        scopes: [{ type: 'tenant' }],
        filters: { eventTypes: ['node.updated'] },
      };
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([filteredSub]);

      const event = {
        tenantId: 'tenant-123',
        eventType: 'node.created',
        entityType: 'context_node',
      };

      const result = await service.findMatchingSubscriptions(event);

      expect(result).toHaveLength(0);
    });

    it('should match graph scope', async () => {
      const graphScopeSub = {
        ...mockSubscription,
        scopes: [{ type: 'graph', id: 'graph-123' }],
        filters: null,
      };
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([graphScopeSub]);

      const event = {
        tenantId: 'tenant-123',
        graphId: 'graph-123',
        eventType: 'node.created',
      };

      const result = await service.findMatchingSubscriptions(event);

      expect(result).toHaveLength(1);
    });

    it('should not match wrong graph scope', async () => {
      const graphScopeSub = {
        ...mockSubscription,
        scopes: [{ type: 'graph', id: 'graph-123' }],
        filters: null,
      };
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([graphScopeSub]);

      const event = {
        tenantId: 'tenant-123',
        graphId: 'graph-456',
        eventType: 'node.created',
      };

      const result = await service.findMatchingSubscriptions(event);

      expect(result).toHaveLength(0);
    });

    it('should match pattern scope', async () => {
      const patternScopeSub = {
        ...mockSubscription,
        scopes: [{ type: 'pattern', pattern: 'context_node/*' }],
        filters: null,
      };
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue([patternScopeSub]);

      const event = {
        tenantId: 'tenant-123',
        entityType: 'context_node',
        entityId: 'node-123',
        eventType: 'node.created',
      };

      const result = await service.findMatchingSubscriptions(event);

      expect(result).toHaveLength(1);
    });
  });

  describe('cleanupExpired', () => {
    it('should delete expired subscriptions', async () => {
      (prisma.contextSubscription.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpired();

      expect(prisma.contextSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              isActive: false,
              lastAckAt: { lt: expect.any(Date) },
            },
          ],
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return subscription statistics', async () => {
      const subscriptions = [
        { product: 'code' },
        { product: 'code' },
        { product: 'chat' },
        { product: 'cowork' },
      ];
      (prisma.contextSubscription.findMany as jest.Mock).mockResolvedValue(subscriptions);

      const result = await service.getStats('tenant-123');

      expect(result).toEqual({
        totalActive: 4,
        byProduct: {
          code: 2,
          chat: 1,
          cowork: 1,
        },
      });
    });
  });
});
