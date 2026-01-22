# ADR-025: Context Versioning and Change Tracking

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture & Platform Team
**Categories:** Data Model, Versioning, History

## Context

As Claude Context becomes the single source of truth across the Claude ecosystem, we need robust versioning and change tracking to:

1. **Track history** - Know what changed, when, and by whom
2. **Enable rollback** - Revert problematic changes
3. **Support diffing** - Compare versions to understand evolution
4. **Enable audit** - Meet compliance requirements for data lineage
5. **Power sync** - Clients need to know what's changed since last sync
6. **Support branching** - Preview changes before applying

### Current State

The existing schema lacks:
- Version numbers on entities
- Change history
- Point-in-time queries
- Diff capabilities
- Rollback mechanisms

### Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Version numbers | P0 | Monotonic per entity |
| Change log | P0 | Every modification tracked |
| Point-in-time queries | P1 | "What was this node on date X?" |
| Diff between versions | P1 | Semantic diff for content |
| Rollback | P1 | Revert to previous version |
| Branching/draft mode | P2 | Preview before publish |
| Retention policies | P2 | Configurable history retention |

## Decision

**We will implement a hybrid versioning model with inline version metadata and a separate change log table.**

### Versioning Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERSIONING ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                           LIVE ENTITIES                                     │
│                                                                            │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │      ContextNode            │  │      WorkSlice              │         │
│  │  ─────────────────────────  │  │  ─────────────────────────  │         │
│  │  id: uuid                   │  │  id: uuid                   │         │
│  │  version: 5                 │  │  version: 3                 │         │
│  │  content: "Current..."      │  │  outcome: "Current..."      │         │
│  │  updatedAt: 2026-01-22      │  │  status: ACTIVE             │         │
│  │  updatedBy: user-123        │  │  updatedAt: 2026-01-21      │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    │ Foreign Keys                 │
                    ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           CHANGE LOG                                        │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  EntityChange                                                         │ │
│  │  ──────────────────────────────────────────────────────────────────── │ │
│  │  id: change-uuid                                                      │ │
│  │  entityType: 'context_node'                                           │ │
│  │  entityId: node-uuid                                                  │ │
│  │  version: 5                                                           │ │
│  │  previousVersion: 4                                                   │ │
│  │  changeType: 'UPDATE'                                                 │ │
│  │  changedFields: ['content', 'metadata']                               │ │
│  │  previousValues: { content: "Old...", metadata: {...} }               │ │
│  │  newValues: { content: "Current...", metadata: {...} }                │ │
│  │  actorId: user-123                                                    │ │
│  │  timestamp: 2026-01-22T10:30:00Z                                      │ │
│  │  metadata: { source: 'api', correlationId: '...' }                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ Periodic Snapshots
                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         SNAPSHOTS (Optional)                                │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  EntitySnapshot                                                       │ │
│  │  ──────────────────────────────────────────────────────────────────── │ │
│  │  entityType: 'context_node'                                           │ │
│  │  entityId: node-uuid                                                  │ │
│  │  version: 5                                                           │ │
│  │  snapshot: { full entity data }                                       │ │
│  │  createdAt: 2026-01-22T10:30:00Z                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```prisma
// Add version fields to existing entities
model ContextNode {
  // ... existing fields ...

  // Version tracking
  version       Int      @default(1)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  createdBy     String?  @map("created_by") @db.Uuid
  updatedBy     String?  @map("updated_by") @db.Uuid

  // Soft delete support
  deletedAt     DateTime? @map("deleted_at")
  deletedBy     String?   @map("deleted_by") @db.Uuid

  @@index([tenantId, version])
}

model WorkSlice {
  // ... existing fields ...

  // Version tracking
  version       Int      @default(1)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  createdBy     String?  @map("created_by") @db.Uuid
  updatedBy     String?  @map("updated_by") @db.Uuid

  // Soft delete support
  deletedAt     DateTime? @map("deleted_at")
  deletedBy     String?   @map("deleted_by") @db.Uuid

  @@index([tenantId, version])
}

model ContextGraph {
  // ... existing fields ...

  // Version tracking
  version       Int      @default(1)
  globalVersion BigInt   @default(0) @map("global_version") // Aggregate of all changes
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  createdBy     String?  @map("created_by") @db.Uuid
  updatedBy     String?  @map("updated_by") @db.Uuid
}

// Change log for all versioned entities
model EntityChange {
  id              String   @id @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid

  // Entity reference
  entityType      String   @map("entity_type") @db.VarChar(100)
  entityId        String   @map("entity_id") @db.Uuid

  // Version info
  version         Int
  previousVersion Int?     @map("previous_version")

  // Change details
  changeType      ChangeType @map("change_type")
  changedFields   String[]   @map("changed_fields")
  previousValues  Json?      @map("previous_values")
  newValues       Json       @map("new_values")

  // Actor
  actorId         String   @map("actor_id") @db.VarChar(255)
  actorType       String   @map("actor_type") @db.VarChar(50)

  // Metadata
  metadata        Json     @default("{}")
  timestamp       DateTime @default(now())

  // For event correlation
  eventId         String?  @map("event_id") @db.Uuid

  @@index([tenantId, entityType, entityId])
  @@index([tenantId, timestamp])
  @@index([tenantId, version])
  @@index([eventId])
  @@map("entity_changes")
}

enum ChangeType {
  CREATE
  UPDATE
  DELETE
  RESTORE
  ROLLBACK
}

// Periodic snapshots for efficient point-in-time queries
model EntitySnapshot {
  id            String   @id @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid

  entityType    String   @map("entity_type") @db.VarChar(100)
  entityId      String   @map("entity_id") @db.Uuid
  version       Int

  snapshot      Json     // Full entity state
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([tenantId, entityType, entityId, version])
  @@index([tenantId, entityType, entityId])
  @@map("entity_snapshots")
}

// Draft/branch support
model EntityDraft {
  id            String   @id @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid

  // Source entity
  entityType    String   @map("entity_type") @db.VarChar(100)
  entityId      String   @map("entity_id") @db.Uuid
  baseVersion   Int      @map("base_version")

  // Draft content
  draftContent  Json     @map("draft_content")
  changedFields String[] @map("changed_fields")

  // Metadata
  name          String?  @db.VarChar(255) // Optional draft name
  createdBy     String   @map("created_by") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  expiresAt     DateTime? @map("expires_at")

  @@unique([tenantId, entityType, entityId, createdBy]) // One draft per user per entity
  @@index([tenantId, createdBy])
  @@map("entity_drafts")
}
```

### Version Service

```typescript
@Injectable()
export class VersionService {
  constructor(
    private prisma: PrismaService,
    private eventPublisher: EventPublisher,
  ) {}

  /**
   * Track a change to an entity
   */
  async trackChange<T extends VersionedEntity>(
    entityType: string,
    entity: T,
    previousEntity: T | null,
    actor: Actor,
    metadata?: Record<string, any>,
  ): Promise<EntityChange> {
    const changedFields = previousEntity
      ? this.computeChangedFields(previousEntity, entity)
      : Object.keys(entity);

    const previousValues = previousEntity
      ? this.extractValues(previousEntity, changedFields)
      : null;

    const newValues = this.extractValues(entity, changedFields);

    const change = await this.prisma.entityChange.create({
      data: {
        id: uuidv4(),
        tenantId: entity.tenantId,
        entityType,
        entityId: entity.id,
        version: entity.version,
        previousVersion: previousEntity?.version,
        changeType: previousEntity ? ChangeType.UPDATE : ChangeType.CREATE,
        changedFields,
        previousValues,
        newValues,
        actorId: actor.id,
        actorType: actor.type,
        metadata: metadata ?? {},
      },
    });

    // Publish event for reactive layer
    await this.eventPublisher.publish({
      type: `${entityType}.${previousEntity ? 'updated' : 'created'}`,
      entityType,
      entityId: entity.id,
      version: entity.version,
      payload: { changedFields, newValues },
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
    options?: {
      limit?: number;
      offset?: number;
      fromVersion?: number;
      toVersion?: number;
    },
  ): Promise<EntityChange[]> {
    return this.prisma.entityChange.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
        version: {
          gte: options?.fromVersion,
          lte: options?.toVersion,
        },
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
    // Find the version active at that time
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
      tenantId, entityType, entityId, fromVersion
    );
    const toEntity = await this.getAtVersion(
      tenantId, entityType, entityId, toVersion
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
  ): Promise<T> {
    const targetState = await this.getAtVersion<T>(
      tenantId, entityType, entityId, toVersion
    );

    if (!targetState) {
      throw new NotFoundException(
        `Version ${toVersion} not found for ${entityType}/${entityId}`
      );
    }

    // Get current entity for version increment
    const current = await this.getCurrentEntity<T>(tenantId, entityType, entityId);

    // Apply rollback as a new version
    const rolledBack = await this.updateEntity<T>(
      entityType,
      entityId,
      {
        ...targetState,
        version: current.version + 1,
      },
    );

    // Track rollback change
    await this.prisma.entityChange.create({
      data: {
        id: uuidv4(),
        tenantId,
        entityType,
        entityId,
        version: rolledBack.version,
        previousVersion: current.version,
        changeType: ChangeType.ROLLBACK,
        changedFields: Object.keys(targetState),
        previousValues: current,
        newValues: targetState,
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

  private applyChange(state: any, change: EntityChange): any {
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
    return fields.reduce((acc, field) => {
      acc[field] = entity[field];
      return acc;
    }, {} as Record<string, any>);
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

interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: EntityChange[];
  fromEntity: any;
  toEntity: any;
  fieldDiffs: FieldDiff[];
}

interface FieldDiff {
  field: string;
  from: any;
  to: any;
  type: 'added' | 'removed' | 'changed';
}
```

### Draft Support

```typescript
@Injectable()
export class DraftService {
  /**
   * Create or update a draft
   */
  async saveDraft<T>(
    tenantId: string,
    entityType: string,
    entityId: string,
    draftContent: Partial<T>,
    userId: string,
  ): Promise<EntityDraft> {
    const current = await this.getCurrentEntity(tenantId, entityType, entityId);
    const changedFields = this.computeChangedFields(current, draftContent);

    return this.prisma.entityDraft.upsert({
      where: {
        tenantId_entityType_entityId_createdBy: {
          tenantId,
          entityType,
          entityId,
          createdBy: userId,
        },
      },
      create: {
        id: uuidv4(),
        tenantId,
        entityType,
        entityId,
        baseVersion: current.version,
        draftContent,
        changedFields,
        createdBy: userId,
        expiresAt: addDays(new Date(), 30), // 30 day expiry
      },
      update: {
        draftContent,
        changedFields,
        baseVersion: current.version,
      },
    });
  }

  /**
   * Preview what entity would look like with draft applied
   */
  async previewDraft<T>(
    tenantId: string,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<T> {
    const [current, draft] = await Promise.all([
      this.getCurrentEntity<T>(tenantId, entityType, entityId),
      this.prisma.entityDraft.findUnique({
        where: {
          tenantId_entityType_entityId_createdBy: {
            tenantId,
            entityType,
            entityId,
            createdBy: userId,
          },
        },
      }),
    ]);

    if (!draft) {
      return current;
    }

    return {
      ...current,
      ...draft.draftContent,
      _isDraft: true,
      _baseVersion: draft.baseVersion,
    } as T;
  }

  /**
   * Publish draft as new version
   */
  async publishDraft<T extends VersionedEntity>(
    tenantId: string,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<T> {
    const draft = await this.prisma.entityDraft.findUnique({
      where: {
        tenantId_entityType_entityId_createdBy: {
          tenantId,
          entityType,
          entityId,
          createdBy: userId,
        },
      },
    });

    if (!draft) {
      throw new NotFoundException('No draft found');
    }

    const current = await this.getCurrentEntity<T>(tenantId, entityType, entityId);

    // Check for conflicts
    if (current.version !== draft.baseVersion) {
      throw new ConflictException({
        message: 'Entity has changed since draft was created',
        currentVersion: current.version,
        draftBaseVersion: draft.baseVersion,
      });
    }

    // Apply draft
    const updated = await this.updateEntity<T>(
      entityType,
      entityId,
      {
        ...draft.draftContent,
        version: current.version + 1,
      },
    );

    // Delete draft
    await this.prisma.entityDraft.delete({
      where: { id: draft.id },
    });

    return updated;
  }

  /**
   * Discard draft
   */
  async discardDraft(
    tenantId: string,
    entityType: string,
    entityId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.entityDraft.delete({
      where: {
        tenantId_entityType_entityId_createdBy: {
          tenantId,
          entityType,
          entityId,
          createdBy: userId,
        },
      },
    });
  }
}
```

### API Endpoints

```
# Version history
GET    /entities/:type/:id/history          - Get change history
GET    /entities/:type/:id/versions/:version - Get entity at version
GET    /entities/:type/:id/diff             - Diff between versions

# Rollback
POST   /entities/:type/:id/rollback         - Rollback to version

# Drafts
GET    /entities/:type/:id/draft            - Get user's draft
PUT    /entities/:type/:id/draft            - Save draft
POST   /entities/:type/:id/draft/publish    - Publish draft
DELETE /entities/:type/:id/draft            - Discard draft

# Bulk operations
GET    /changes                             - Query all changes (admin)
POST   /snapshots/create                    - Trigger snapshot creation
```

### Retention Policy

```typescript
@Injectable()
export class RetentionService {
  /**
   * Clean up old changes based on retention policy
   */
  @Cron('0 2 * * *') // Daily at 2 AM
  async enforceRetention(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, retentionDays: true },
    });

    for (const tenant of tenants) {
      const cutoff = subDays(new Date(), tenant.retentionDays ?? 365);

      // Don't delete the latest version of any entity
      await this.prisma.$executeRaw`
        DELETE FROM entity_changes
        WHERE tenant_id = ${tenant.id}
          AND timestamp < ${cutoff}
          AND (entity_type, entity_id, version) NOT IN (
            SELECT entity_type, entity_id, MAX(version)
            FROM entity_changes
            WHERE tenant_id = ${tenant.id}
            GROUP BY entity_type, entity_id
          )
      `;

      // Clean up expired snapshots
      await this.prisma.entitySnapshot.deleteMany({
        where: {
          tenantId: tenant.id,
          createdAt: { lt: cutoff },
        },
      });

      // Clean up expired drafts
      await this.prisma.entityDraft.deleteMany({
        where: {
          tenantId: tenant.id,
          expiresAt: { lt: new Date() },
        },
      });
    }
  }
}
```

## Consequences

### Positive

- **Complete history** - Every change tracked with full detail
- **Point-in-time queries** - Reconstruct state at any moment
- **Efficient rollback** - Easy reversion to any version
- **Draft support** - Preview changes before publishing
- **Audit compliance** - Full data lineage for compliance
- **Sync support** - Version numbers enable efficient sync

### Negative

- **Storage growth** - Change log grows with every modification
- **Query complexity** - Point-in-time reconstruction can be slow
- **Schema changes** - Must update tracked fields when schema changes

### Mitigations

1. **Periodic snapshots** - Create snapshots every N versions for fast reconstruction
2. **Retention policies** - Automatic cleanup of old changes
3. **Index optimization** - Proper indexes on change log table
4. **Lazy loading** - Only fetch history when explicitly requested

## References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Temporal Tables in PostgreSQL](https://www.postgresql.org/docs/current/ddl-system-columns.html)
- [Git Data Model](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [ADR-024: Reactive Context Layer](./ADR-024-reactive-context-layer.md)
