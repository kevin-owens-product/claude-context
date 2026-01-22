/**
 * @prompt-id forge-v4.1:service:version:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ChangeType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as _ from 'lodash';
const isEqual = _.isEqual;

export interface Actor {
  id: string;
  type: 'user' | 'api_key' | 'system';
}

export interface VersionedEntity {
  id: string;
  tenantId: string;
  version: number;
}

export interface FieldDiff {
  field: string;
  from: any;
  to: any;
  type: 'added' | 'removed' | 'changed';
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: any[];
  fromEntity: any;
  toEntity: any;
  fieldDiffs: FieldDiff[];
}

export interface HistoryOptions {
  limit?: number;
  offset?: number;
  fromVersion?: number;
  toVersion?: number;
}

@Injectable()
export class VersionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Track a change to an entity
   */
  async trackChange<T extends VersionedEntity>(
    entityType: string,
    entity: T,
    previousEntity: T | null,
    actor: Actor,
    metadata?: Record<string, any>,
  ): Promise<any> {
    const changedFields = previousEntity
      ? this.computeChangedFields(previousEntity, entity)
      : Object.keys(entity).filter((k) => k !== 'id' && k !== 'tenantId');

    const previousValues = previousEntity
      ? this.extractValues(previousEntity, changedFields)
      : undefined;

    const newValues = this.extractValues(entity, changedFields);

    const change = await this.prisma.entityChange.create({
      data: {
        id: uuidv4(),
        tenantId: entity.tenantId,
        entityType,
        entityId: entity.id,
        version: entity.version,
        previousVersion: previousEntity?.version ?? null,
        changeType: previousEntity ? ChangeType.UPDATE : ChangeType.CREATE,
        changedFields,
        previousValues,
        newValues,
        actorId: actor.id,
        actorType: actor.type,
        metadata: metadata ?? {},
      },
    });

    return change;
  }

  /**
   * Get change history for an entity
   */
  async getHistory(
    tenantId: string,
    entityType: string,
    entityId: string,
    options?: HistoryOptions,
  ): Promise<any[]> {
    const versionFilter: { gte?: number; lte?: number } = {};
    if (options?.fromVersion !== undefined) {
      versionFilter.gte = options.fromVersion;
    }
    if (options?.toVersion !== undefined) {
      versionFilter.lte = options.toVersion;
    }

    return this.prisma.entityChange.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
        ...(Object.keys(versionFilter).length > 0 && { version: versionFilter }),
      },
      orderBy: { version: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset,
    });
  }

  /**
   * Get entity at a specific version
   */
  async getAtVersion<T>(
    tenantId: string,
    entityType: string,
    entityId: string,
    version: number,
  ): Promise<T | null> {
    // Try snapshot first
    const snapshot = await this.prisma.entitySnapshot.findUnique({
      where: {
        tenantId_entityType_entityId_version: {
          tenantId,
          entityType,
          entityId,
          version,
        },
      },
    });

    if (snapshot) {
      return snapshot.snapshot as T;
    }

    // Reconstruct from changes
    return this.reconstructAtVersion(tenantId, entityType, entityId, version);
  }

  /**
   * Get entity at a specific point in time
   */
  async getAtTime<T>(
    tenantId: string,
    entityType: string,
    entityId: string,
    timestamp: Date,
  ): Promise<T | null> {
    const change = await this.prisma.entityChange.findFirst({
      where: {
        tenantId,
        entityType,
        entityId,
        timestamp: { lte: timestamp },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!change) {
      return null;
    }

    return this.getAtVersion(tenantId, entityType, entityId, change.version);
  }

  /**
   * Compute diff between two versions
   */
  async diff(
    tenantId: string,
    entityType: string,
    entityId: string,
    fromVersion: number,
    toVersion: number,
  ): Promise<VersionDiff> {
    const changes = await this.prisma.entityChange.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
        version: {
          gt: fromVersion,
          lte: toVersion,
        },
      },
      orderBy: { version: 'asc' },
    });

    const fromEntity = await this.getAtVersion(
      tenantId,
      entityType,
      entityId,
      fromVersion,
    );
    const toEntity = await this.getAtVersion(
      tenantId,
      entityType,
      entityId,
      toVersion,
    );

    return {
      fromVersion,
      toVersion,
      changes,
      fromEntity,
      toEntity,
      fieldDiffs: this.computeFieldDiffs(fromEntity, toEntity),
    };
  }

  /**
   * Rollback entity to a previous version
   */
  async rollback<T extends VersionedEntity>(
    tenantId: string,
    entityType: string,
    entityId: string,
    toVersion: number,
    actor: Actor,
    updateEntity: (id: string, data: Partial<T>) => Promise<T>,
  ): Promise<T> {
    const targetState = await this.getAtVersion<T>(
      tenantId,
      entityType,
      entityId,
      toVersion,
    );

    if (!targetState) {
      throw new NotFoundException(
        `Version ${toVersion} not found for ${entityType}/${entityId}`,
      );
    }

    // Get current entity for version increment
    const currentChange = await this.prisma.entityChange.findFirst({
      where: { tenantId, entityType, entityId },
      orderBy: { version: 'desc' },
    });

    const currentVersion = currentChange?.version ?? 0;
    const newVersion = currentVersion + 1;

    // Apply rollback as a new version
    const { id, tenantId: _, version: __, ...updateData } = targetState as any;
    const rolledBack = await updateEntity(entityId, {
      ...updateData,
      version: newVersion,
    } as Partial<T>);

    // Track rollback change
    await this.prisma.entityChange.create({
      data: {
        id: uuidv4(),
        tenantId,
        entityType,
        entityId,
        version: newVersion,
        previousVersion: currentVersion,
        changeType: ChangeType.ROLLBACK,
        changedFields: Object.keys(updateData),
        previousValues: currentChange?.newValues ?? {},
        newValues: updateData,
        actorId: actor.id,
        actorType: actor.type,
        metadata: { rolledBackToVersion: toVersion },
      },
    });

    return rolledBack;
  }

  /**
   * Create a snapshot for efficient future retrieval
   */
  async createSnapshot<T>(
    tenantId: string,
    entityType: string,
    entity: T & { id: string; version: number },
  ): Promise<void> {
    await this.prisma.entitySnapshot.upsert({
      where: {
        tenantId_entityType_entityId_version: {
          tenantId,
          entityType,
          entityId: entity.id,
          version: entity.version,
        },
      },
      create: {
        id: uuidv4(),
        tenantId,
        entityType,
        entityId: entity.id,
        version: entity.version,
        snapshot: entity as any,
      },
      update: {
        snapshot: entity as any,
      },
    });
  }

  /**
   * Increment global version for tenant
   */
  async incrementGlobalVersion(tenantId: string): Promise<bigint> {
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

  /**
   * Get current global version for tenant
   */
  async getGlobalVersion(tenantId: string): Promise<bigint> {
    const version = await this.prisma.tenantVersion.findUnique({
      where: { tenantId },
    });

    return version?.globalVersion ?? BigInt(0);
  }

  /**
   * Reconstruct entity state at a version from changes
   */
  private async reconstructAtVersion<T>(
    tenantId: string,
    entityType: string,
    entityId: string,
    targetVersion: number,
  ): Promise<T | null> {
    // Find nearest snapshot before target version
    const nearestSnapshot = await this.prisma.entitySnapshot.findFirst({
      where: {
        tenantId,
        entityType,
        entityId,
        version: { lte: targetVersion },
      },
      orderBy: { version: 'desc' },
    });

    let baseState: any;
    let startVersion: number;

    if (nearestSnapshot) {
      baseState = nearestSnapshot.snapshot;
      startVersion = nearestSnapshot.version;
    } else {
      // Start from creation
      const createChange = await this.prisma.entityChange.findFirst({
        where: {
          tenantId,
          entityType,
          entityId,
          changeType: ChangeType.CREATE,
        },
      });

      if (!createChange) {
        return null;
      }

      baseState = createChange.newValues;
      startVersion = 1;
    }

    // Apply changes from start to target
    const changes = await this.prisma.entityChange.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
        version: {
          gt: startVersion,
          lte: targetVersion,
        },
      },
      orderBy: { version: 'asc' },
    });

    let state = baseState;
    for (const change of changes) {
      state = this.applyChange(state, change);
    }

    return state as T;
  }

  private applyChange(state: any, change: any): any {
    if (change.changeType === ChangeType.DELETE) {
      return { ...state, deletedAt: change.timestamp };
    }

    return {
      ...state,
      ...change.newValues,
      version: change.version,
    };
  }

  private computeChangedFields(prev: any, curr: any): string[] {
    const fields = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    const changed: string[] = [];

    for (const field of fields) {
      if (!isEqual(prev[field], curr[field])) {
        changed.push(field);
      }
    }

    return changed;
  }

  private extractValues(entity: any, fields: string[]): Record<string, any> {
    return fields.reduce(
      (acc, field) => {
        acc[field] = entity[field];
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private computeFieldDiffs(from: any, to: any): FieldDiff[] {
    if (!from || !to) return [];

    const fields = new Set([...Object.keys(from), ...Object.keys(to)]);
    const diffs: FieldDiff[] = [];

    for (const field of fields) {
      if (!isEqual(from[field], to[field])) {
        diffs.push({
          field,
          from: from[field],
          to: to[field],
          type: this.getDiffType(from[field], to[field]),
        });
      }
    }

    return diffs;
  }

  private getDiffType(from: any, to: any): 'added' | 'removed' | 'changed' {
    if (from === undefined) return 'added';
    if (to === undefined) return 'removed';
    return 'changed';
  }
}
