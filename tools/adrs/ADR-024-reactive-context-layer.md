# ADR-024: Reactive Context Layer Architecture

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture & Product Team
**Categories:** Architecture, Real-time, Integration

## Context

Claude Context aspires to be the **single source of truth** for organizational knowledge across the entire Claude ecosystem. Currently, context is pulled on-demand by each product (Chat, Code, CoWork). This creates several problems:

1. **Stale context** - Products may use outdated information
2. **Inconsistent state** - Different products may have different views
3. **No awareness of changes** - Products don't know when to refresh
4. **Manual sync burden** - Users must manually trigger updates

### The Vision

When a team updates an architectural decision in Claude Context:
- **Claude Chat** immediately incorporates the new decision in responses
- **Claude Code** updates CLAUDE.md files and adjusts recommendations
- **Claude CoWork** regenerates affected documents and reports

This requires a **reactive architecture** where context changes propagate automatically to all connected clients.

### Requirements

1. **Real-time propagation** - Changes visible within seconds
2. **Selective updates** - Products only receive relevant changes
3. **Offline resilience** - Graceful handling of disconnections
4. **Scale** - Support thousands of concurrent connections per tenant
5. **Auditability** - Track all changes with version history
6. **Conflict resolution** - Handle concurrent modifications

## Decision

**We will implement a reactive context layer using event sourcing, WebSocket subscriptions, and version vectors.**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REACTIVE CONTEXT LAYER                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Claude Chat   │  │   Claude Code   │  │  Claude CoWork  │
│                 │  │                 │  │                 │
│  Subscription:  │  │  Subscription:  │  │  Subscription:  │
│  - workspace/*  │  │  - workspace/*  │  │  - workspace/*  │
│  - slice/SL-*   │  │  - slice/SL-*   │  │  - reports/*    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │    WebSocket       │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   WebSocket Hub   │
                    │                   │
                    │  • Connection mgmt│
                    │  • Subscription   │
                    │    routing        │
                    │  • Heartbeats     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Event Publisher  │
                    │                   │
                    │  • Fan-out        │
                    │  • Filtering      │
                    │  • Batching       │
                    └─────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Context API    │  │  Event Store    │  │  Version Store │
│                 │  │                 │  │                │
│  • CRUD ops     │  │  • Append-only  │  │  • Vectors     │
│  • Validation   │  │  • Replay       │  │  • Timestamps  │
│  • Triggers     │  │  • Snapshots    │  │  • Causality   │
└─────────────────┘  └─────────────────┘  └────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    PostgreSQL     │
                    │   + pgvector      │
                    └───────────────────┘
```

### Event Sourcing Model

Every context change is captured as an immutable event:

```typescript
interface ContextEvent {
  id: string;                    // UUID
  tenantId: string;              // Tenant isolation
  graphId: string;               // Context graph
  eventType: ContextEventType;   // Type of change
  entityType: 'node' | 'edge' | 'graph' | 'slice';
  entityId: string;              // Affected entity
  version: number;               // Monotonic version
  vectorClock: VectorClock;      // Causality tracking
  timestamp: Date;
  actorId: string;               // Who made the change
  actorType: 'user' | 'api_key' | 'system';
  payload: Record<string, any>;  // Change data
  metadata: {
    source: 'api' | 'mcp' | 'sync' | 'import';
    correlationId?: string;
    causationId?: string;
  };
}

enum ContextEventType {
  // Graph events
  GRAPH_CREATED = 'graph.created',
  GRAPH_UPDATED = 'graph.updated',
  GRAPH_DELETED = 'graph.deleted',

  // Node events
  NODE_CREATED = 'node.created',
  NODE_UPDATED = 'node.updated',
  NODE_DELETED = 'node.deleted',
  NODE_CONTENT_CHANGED = 'node.content_changed',
  NODE_METADATA_CHANGED = 'node.metadata_changed',
  NODE_FRESHNESS_CHANGED = 'node.freshness_changed',

  // Edge events
  EDGE_CREATED = 'edge.created',
  EDGE_DELETED = 'edge.deleted',
  EDGE_WEIGHT_CHANGED = 'edge.weight_changed',

  // Slice events
  SLICE_CREATED = 'slice.created',
  SLICE_UPDATED = 'slice.updated',
  SLICE_DELETED = 'slice.deleted',
  SLICE_TRANSITIONED = 'slice.transitioned',
  SLICE_CONTEXT_LINKED = 'slice.context_linked',
  SLICE_CONTEXT_UNLINKED = 'slice.context_unlinked',

  // Bulk events
  BULK_IMPORT = 'bulk.import',
  BULK_UPDATE = 'bulk.update',
}
```

### Subscription Model

Products subscribe to specific context scopes:

```typescript
interface Subscription {
  id: string;
  clientId: string;
  tenantId: string;

  // What to subscribe to
  scopes: SubscriptionScope[];

  // Filtering
  filters?: {
    eventTypes?: ContextEventType[];
    entityTypes?: ('node' | 'edge' | 'slice')[];
    nodeTypes?: NodeType[];
    layers?: ContextLayer[];
  };

  // Delivery preferences
  options: {
    batchWindow?: number;     // Batch events within window (ms)
    includePayload?: boolean; // Include full payload or just IDs
    fromVersion?: number;     // Resume from version (catch-up)
  };
}

type SubscriptionScope =
  | { type: 'tenant' }                           // All tenant events
  | { type: 'workspace'; workspaceId: string }   // Workspace events
  | { type: 'graph'; graphId: string }           // Graph events
  | { type: 'slice'; sliceId: string }           // Slice events
  | { type: 'node'; nodeId: string }             // Single node
  | { type: 'pattern'; pattern: string };        // Glob pattern
```

### WebSocket Protocol

```typescript
// Client → Server
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ack' | 'ping';
  id: string;        // Message ID for correlation
  payload: any;
}

// Server → Client
interface ServerMessage {
  type: 'subscribed' | 'unsubscribed' | 'event' | 'batch' | 'error' | 'pong';
  id?: string;       // Correlation ID
  payload: any;
}

// Event delivery
interface EventDelivery {
  type: 'event';
  payload: {
    subscriptionId: string;
    event: ContextEvent;
    position: {
      version: number;
      timestamp: Date;
    };
  };
}

// Batch delivery (for high-frequency updates)
interface BatchDelivery {
  type: 'batch';
  payload: {
    subscriptionId: string;
    events: ContextEvent[];
    position: {
      fromVersion: number;
      toVersion: number;
    };
  };
}
```

### Version Tracking

Each entity maintains version information:

```typescript
interface VersionedEntity {
  id: string;
  version: number;           // Local version counter
  globalVersion: number;     // Tenant-wide ordering
  vectorClock: VectorClock;  // Causality tracking
  updatedAt: Date;
  lastEventId: string;       // Last event that modified this
}

// Vector clock for causality
interface VectorClock {
  [actorId: string]: number;
}

// Compare vector clocks
function compareVectorClocks(a: VectorClock, b: VectorClock):
  'before' | 'after' | 'concurrent' | 'equal';
```

### Product-Specific Adaptations

#### Claude Chat Integration

```typescript
// Chat subscribes to workspace context
const chatSubscription: Subscription = {
  scopes: [
    { type: 'workspace', workspaceId: 'ws-123' },
  ],
  filters: {
    nodeTypes: ['DECISION', 'GUIDELINE', 'PATTERN'],
    layers: ['ORGANIZATIONAL', 'WORKSPACE'],
  },
  options: {
    batchWindow: 5000,        // 5 second batches
    includePayload: true,
  },
};

// On context change, Chat refreshes system prompt
websocket.on('batch', async (batch) => {
  // Invalidate cached context
  await contextCache.invalidate(batch.events.map(e => e.entityId));

  // Next user message will pull fresh context
  // Or proactively refresh if in active conversation
  if (activeConversation) {
    const newContext = await compileContext({
      graphId: batch.events[0].graphId,
      relevantTo: activeConversation.topic,
    });
    updateSystemPrompt(newContext);
  }
});
```

#### Claude Code Integration

```typescript
// Code subscribes to current project context
const codeSubscription: Subscription = {
  scopes: [
    { type: 'workspace', workspaceId: projectWorkspaceId },
    { type: 'slice', sliceId: currentSliceId },
  ],
  filters: {
    nodeTypes: ['PATTERN', 'DECISION', 'DOCUMENT'],
  },
  options: {
    batchWindow: 1000,        // 1 second batches
    includePayload: true,
  },
};

// On context change, Code updates local files
websocket.on('event', async (event) => {
  if (event.eventType === 'node.content_changed') {
    // Update CLAUDE.md with new context
    const compiledContext = await compileContext({
      graphId: event.graphId,
      format: 'markdown',
    });

    await fs.writeFile('.claude/context.md', compiledContext);

    // Notify user
    console.log(`[Claude Context] Updated: ${event.payload.title}`);
  }
});
```

#### Claude CoWork Integration

```typescript
// CoWork subscribes to document-related context
const coworkSubscription: Subscription = {
  scopes: [
    { type: 'workspace', workspaceId: workspaceId },
    { type: 'pattern', pattern: 'slice/*' },
  ],
  options: {
    batchWindow: 10000,       // 10 second batches (file ops are slower)
    includePayload: true,
  },
};

// On context change, CoWork updates local files
websocket.on('batch', async (batch) => {
  for (const event of batch.events) {
    if (event.eventType === 'slice.updated') {
      // Re-export slice package
      await exportSlicePackage({
        sliceId: event.entityId,
        outputPath: path.join(exportRoot, `SL-${event.entityId}`),
      });
    }

    if (event.entityType === 'node') {
      // Update corresponding markdown file
      await syncNodeToFile(event.entityId, exportRoot);
    }
  }
});
```

### Conflict Resolution

When concurrent modifications occur:

```typescript
interface ConflictResolution {
  strategy: 'last_write_wins' | 'merge' | 'manual';

  // For merge strategy
  mergeFunction?: (base: any, local: any, remote: any) => any;

  // For manual resolution
  onConflict?: (conflict: Conflict) => Promise<Resolution>;
}

// Default: Last Write Wins with causality awareness
function resolveConflict(local: ContextEvent, remote: ContextEvent): ContextEvent {
  const comparison = compareVectorClocks(local.vectorClock, remote.vectorClock);

  switch (comparison) {
    case 'before':
      return remote;  // Remote is newer
    case 'after':
      return local;   // Local is newer
    case 'concurrent':
      // True conflict - use timestamp as tiebreaker
      return local.timestamp > remote.timestamp ? local : remote;
    case 'equal':
      return local;   // Same event
  }
}
```

### Catch-up and Replay

When a client reconnects:

```typescript
// Client sends last known version
const reconnect: ClientMessage = {
  type: 'subscribe',
  id: 'msg-123',
  payload: {
    scopes: [{ type: 'workspace', workspaceId: 'ws-123' }],
    options: {
      fromVersion: 12345,  // Last known version
    },
  },
};

// Server streams missed events
async function handleCatchUp(subscription: Subscription) {
  const missedEvents = await eventStore.getEventsAfter(
    subscription.tenantId,
    subscription.options.fromVersion,
    subscription.scopes,
  );

  // Stream in batches
  for (const batch of chunk(missedEvents, 100)) {
    await sendBatch(subscription.clientId, batch);
  }

  // Then switch to live mode
  await subscribeLive(subscription);
}
```

### Database Schema Changes

```prisma
// Event store
model ContextEvent {
  id            String   @id @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  graphId       String   @map("graph_id") @db.Uuid

  eventType     String   @map("event_type") @db.VarChar(100)
  entityType    String   @map("entity_type") @db.VarChar(50)
  entityId      String   @map("entity_id") @db.Uuid

  version       Int      // Entity-level version
  globalVersion BigInt   @map("global_version") // Tenant-wide ordering
  vectorClock   Json     @map("vector_clock") @default("{}")

  actorId       String   @map("actor_id") @db.VarChar(255)
  actorType     String   @map("actor_type") @db.VarChar(50)

  payload       Json
  metadata      Json     @default("{}")

  timestamp     DateTime @default(now())

  @@index([tenantId, globalVersion])
  @@index([tenantId, graphId, entityType, entityId])
  @@index([tenantId, timestamp])
  @@map("context_events")
}

// Subscription registry
model Subscription {
  id          String   @id @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  clientId    String   @map("client_id") @db.VarChar(255)

  scopes      Json     // SubscriptionScope[]
  filters     Json?    // Optional filters
  options     Json     // Delivery options

  lastVersion BigInt?  @map("last_version")
  lastAckAt   DateTime? @map("last_ack_at")

  createdAt   DateTime @default(now()) @map("created_at")
  expiresAt   DateTime @map("expires_at")

  @@index([tenantId, clientId])
  @@index([expiresAt])
  @@map("subscriptions")
}

// Version tracking for entities
model EntityVersion {
  id            String   @id @db.Uuid
  tenantId      String   @map("tenant_id") @db.Uuid
  entityType    String   @map("entity_type") @db.VarChar(50)
  entityId      String   @map("entity_id") @db.Uuid

  version       Int      @default(1)
  vectorClock   Json     @map("vector_clock") @default("{}")

  lastEventId   String?  @map("last_event_id") @db.Uuid
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([tenantId, entityType, entityId])
  @@map("entity_versions")
}
```

### API Endpoints

```
# Subscriptions
POST   /context/subscribe          - Create subscription
DELETE /context/subscribe/:id      - Remove subscription
GET    /context/subscriptions      - List active subscriptions

# Events
GET    /context/events             - Query events (with filters)
GET    /context/events/:id         - Get specific event
GET    /context/events/stream      - SSE stream for events

# Versions
GET    /context/version            - Get current global version
GET    /context/entities/:id/version - Get entity version
POST   /context/sync               - Sync check (what's changed since?)

# WebSocket
WS     /context/ws                 - WebSocket endpoint
```

## Consequences

### Positive

- **Real-time sync** - All products stay current automatically
- **Consistency** - Single source of truth with version tracking
- **Auditability** - Complete history via event store
- **Flexibility** - Products subscribe only to relevant context
- **Resilience** - Catch-up mechanism handles disconnections
- **Scalability** - Event-driven architecture scales well

### Negative

- **Complexity** - Significant infrastructure addition
- **Storage** - Event store grows continuously
- **Latency** - WebSocket connections require management
- **Debugging** - Distributed system debugging challenges

### Mitigations

1. **Event compaction** - Periodically snapshot and compact old events
2. **Connection pooling** - Efficient WebSocket connection management
3. **Distributed tracing** - Correlation IDs for debugging
4. **Graceful degradation** - Fall back to polling if WebSocket fails

## References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [WebSocket RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [Vector Clocks](https://en.wikipedia.org/wiki/Vector_clock)
- [ADR-023: Claude Ecosystem Interplay](./ADR-023-claude-ecosystem-interplay.md)
