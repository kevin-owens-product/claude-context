/**
 * @prompt-id forge-v4.1:test:version-service:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VersionService, Actor, VersionedEntity } from './version.service';
import { PrismaService } from '../database/prisma.service';
import { ChangeType } from '@prisma/client';

describe('VersionService', () => {
  let service: VersionService;
  let prisma: jest.Mocked<PrismaService>;

  const mockActor: Actor = {
    id: 'user-123',
    type: 'user',
  };

  const mockEntity: VersionedEntity = {
    id: 'entity-123',
    tenantId: 'tenant-123',
    version: 1,
  };

  const mockEntityChange = {
    id: 'change-123',
    tenantId: 'tenant-123',
    entityType: 'context_node',
    entityId: 'entity-123',
    version: 1,
    previousVersion: null,
    changeType: ChangeType.CREATE,
    changedFields: ['name', 'content'],
    previousValues: null,
    newValues: { name: 'Test', content: 'Content' },
    actorId: 'user-123',
    actorType: 'user',
    metadata: {},
    timestamp: new Date(),
    eventId: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      entityChange: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      entitySnapshot: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      tenantVersion: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VersionService>(VersionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackChange', () => {
    it('should create a change record for new entity', async () => {
      (prisma.entityChange.create as jest.Mock).mockResolvedValue(mockEntityChange);

      const result = await service.trackChange(
        'context_node',
        { ...mockEntity, name: 'Test', content: 'Content' },
        null,
        mockActor,
      );

      expect(prisma.entityChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          entityType: 'context_node',
          entityId: 'entity-123',
          version: 1,
          changeType: ChangeType.CREATE,
        }),
      });
      expect(result).toEqual(mockEntityChange);
    });

    it('should track changed fields for updates', async () => {
      const previousEntity = { ...mockEntity, name: 'Old Name' };
      const newEntity = { ...mockEntity, version: 2, name: 'New Name' };

      (prisma.entityChange.create as jest.Mock).mockResolvedValue({
        ...mockEntityChange,
        version: 2,
        previousVersion: 1,
        changeType: ChangeType.UPDATE,
        changedFields: ['name'],
      });

      const result = await service.trackChange(
        'context_node',
        newEntity,
        previousEntity,
        mockActor,
      );

      expect(prisma.entityChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changeType: ChangeType.UPDATE,
          previousVersion: 1,
        }),
      });
    });
  });

  describe('getHistory', () => {
    it('should return change history for an entity', async () => {
      const mockHistory = [
        { ...mockEntityChange, version: 2 },
        { ...mockEntityChange, version: 1 },
      ];

      (prisma.entityChange.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.getHistory(
        'tenant-123',
        'context_node',
        'entity-123',
      );

      expect(prisma.entityChange.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          entityType: 'context_node',
          entityId: 'entity-123',
        },
        orderBy: { version: 'desc' },
        take: 50,
        skip: undefined,
      });
      expect(result).toEqual(mockHistory);
    });

    it('should support pagination and version filtering', async () => {
      (prisma.entityChange.findMany as jest.Mock).mockResolvedValue([]);

      await service.getHistory('tenant-123', 'context_node', 'entity-123', {
        limit: 10,
        offset: 5,
        fromVersion: 2,
        toVersion: 5,
      });

      expect(prisma.entityChange.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          entityType: 'context_node',
          entityId: 'entity-123',
          version: { gte: 2, lte: 5 },
        },
        orderBy: { version: 'desc' },
        take: 10,
        skip: 5,
      });
    });
  });

  describe('getAtVersion', () => {
    it('should return snapshot if available', async () => {
      const mockSnapshot = {
        snapshot: { id: 'entity-123', name: 'Test', version: 1 },
      };

      (prisma.entitySnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.getAtVersion(
        'tenant-123',
        'context_node',
        'entity-123',
        1,
      );

      expect(result).toEqual(mockSnapshot.snapshot);
    });

    it('should reconstruct from changes if no snapshot', async () => {
      (prisma.entitySnapshot.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.entitySnapshot.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.entityChange.findFirst as jest.Mock).mockResolvedValue({
        ...mockEntityChange,
        changeType: ChangeType.CREATE,
        newValues: { name: 'Test', content: 'Initial' },
      });
      (prisma.entityChange.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockEntityChange,
          version: 2,
          changeType: ChangeType.UPDATE,
          newValues: { content: 'Updated' },
        },
      ]);

      const result = await service.getAtVersion(
        'tenant-123',
        'context_node',
        'entity-123',
        2,
      );

      expect(result).toMatchObject({
        name: 'Test',
        content: 'Updated',
        version: 2,
      });
    });
  });

  describe('diff', () => {
    it('should return diff between two versions', async () => {
      const fromEntity = { id: 'entity-123', name: 'Old', version: 1 };
      const toEntity = { id: 'entity-123', name: 'New', version: 2 };

      // Mock getAtVersion
      jest.spyOn(service, 'getAtVersion')
        .mockResolvedValueOnce(fromEntity)
        .mockResolvedValueOnce(toEntity);

      (prisma.entityChange.findMany as jest.Mock).mockResolvedValue([
        { ...mockEntityChange, version: 2, changedFields: ['name'] },
      ]);

      const result = await service.diff(
        'tenant-123',
        'context_node',
        'entity-123',
        1,
        2,
      );

      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.fieldDiffs).toContainEqual({
        field: 'name',
        from: 'Old',
        to: 'New',
        type: 'changed',
      });
    });
  });

  describe('createSnapshot', () => {
    it('should create or update snapshot', async () => {
      (prisma.entitySnapshot.upsert as jest.Mock).mockResolvedValue({});

      await service.createSnapshot('tenant-123', 'context_node', {
        id: 'entity-123',
        version: 5,
        name: 'Test',
      });

      expect(prisma.entitySnapshot.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_entityType_entityId_version: {
            tenantId: 'tenant-123',
            entityType: 'context_node',
            entityId: 'entity-123',
            version: 5,
          },
        },
        create: expect.objectContaining({
          tenantId: 'tenant-123',
          entityType: 'context_node',
          entityId: 'entity-123',
          version: 5,
        }),
        update: expect.any(Object),
      });
    });
  });

  describe('getGlobalVersion', () => {
    it('should return current global version', async () => {
      (prisma.tenantVersion.findUnique as jest.Mock).mockResolvedValue({
        globalVersion: BigInt(42),
      });

      const result = await service.getGlobalVersion('tenant-123');

      expect(result).toBe(BigInt(42));
    });

    it('should return 0 if no version exists', async () => {
      (prisma.tenantVersion.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getGlobalVersion('tenant-123');

      expect(result).toBe(BigInt(0));
    });
  });

  describe('incrementGlobalVersion', () => {
    it('should increment and return new version', async () => {
      (prisma.tenantVersion.upsert as jest.Mock).mockResolvedValue({
        globalVersion: BigInt(43),
      });

      const result = await service.incrementGlobalVersion('tenant-123');

      expect(result).toBe(BigInt(43));
    });
  });
});
