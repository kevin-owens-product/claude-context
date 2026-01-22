# ADR-026: Cross-Product Context Subscriptions

**Status:** Accepted
**Date:** January 2026
**Deciders:** Platform & Integration Team
**Categories:** Integration, Real-time, Claude Ecosystem

## Context

With the reactive context layer (ADR-024) and versioning system (ADR-025) in place, we need a standardized way for Claude products (Chat, Code, CoWork) to subscribe to context changes and adapt their behavior accordingly.

### The Challenge

Each Claude product has different:
- **Connection patterns** - Chat is browser-based, Code is CLI, CoWork is desktop
- **Update frequencies** - Code needs immediate updates, Chat can batch
- **Context scopes** - Each product cares about different context types
- **Adaptation mechanisms** - How they respond to changes differs

### Requirements

| Requirement | Description |
|-------------|-------------|
| **Unified protocol** | Same subscription mechanism across all products |
| **Product-specific optimizations** | Each product can tune behavior |
| **Graceful degradation** | Works offline, catches up when connected |
| **Bandwidth efficient** | Minimize data transfer, support delta updates |
| **Secure** | Proper authentication and tenant isolation |
| **Observable** | Metrics on subscription health and latency |

## Decision

**We will implement a subscription gateway with product-specific adapters and a unified notification protocol.**

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-PRODUCT SUBSCRIPTION SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                           CLAUDE PRODUCTS                                   │
├───────────────────────┬───────────────────────┬────────────────────────────┤
│     Claude Chat       │     Claude Code       │      Claude CoWork         │
│     (Browser)         │     (CLI/IDE)         │      (Desktop)             │
│                       │                       │                            │
│  ┌─────────────────┐  │  ┌─────────────────┐  │  ┌──────────────────────┐  │
│  │ Chat Adapter    │  │  │ Code Adapter    │  │  │ CoWork Adapter       │  │
│  │                 │  │  │                 │  │  │                      │  │
│  │ • WebSocket     │  │  │ • WebSocket     │  │  │ • WebSocket          │  │
│  │ • Polling       │  │  │ • File watch    │  │  │ • File sync          │  │
│  │   fallback      │  │  │ • CLI commands  │  │  │ • Notifications      │  │
│  └────────┬────────┘  │  └────────┬────────┘  │  └──────────┬───────────┘  │
└───────────┼───────────┴───────────┼───────────┴─────────────┼──────────────┘
            │                       │                         │
            │      MCP Protocol     │                         │
            └───────────────────────┼─────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │     Subscription Gateway       │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │   Connection Manager    │  │
                    │  │   • Auth validation     │  │
                    │  │   • Rate limiting       │  │
                    │  │   • Load balancing      │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │   Subscription Router   │  │
                    │  │   • Topic matching      │  │
                    │  │   • Filter evaluation   │  │
                    │  │   • Batching logic      │  │
                    │  └─────────────────────────┘  │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │   Delivery Engine       │  │
                    │  │   • At-least-once       │  │
                    │  │   • Ordering            │  │
                    │  │   • Acknowledgment      │  │
                    │  └─────────────────────────┘  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      Event Store + API        │
                    └───────────────────────────────┘
```

### Subscription Protocol

```typescript
// Universal subscription request
interface SubscriptionRequest {
  // Authentication
  auth: {
    type: 'jwt' | 'api_key';
    token: string;
  };

  // Client identification
  client: {
    product: 'chat' | 'code' | 'cowork';
    productVersion: string;
    clientId: string;        // Unique client instance
    sessionId?: string;      // For multi-session tracking
  };

  // Subscription details
  subscription: {
    id?: string;             // Resume existing subscription
    scopes: SubscriptionScope[];
    filters?: SubscriptionFilters;
    options: SubscriptionOptions;
  };
}

interface SubscriptionScope {
  type: 'tenant' | 'workspace' | 'graph' | 'slice' | 'node' | 'pattern';
  id?: string;
  pattern?: string;
}

interface SubscriptionFilters {
  eventTypes?: string[];
  entityTypes?: string[];
  nodeTypes?: string[];
  layers?: string[];
  minVersion?: number;
  changedFields?: string[];  // Only notify if specific fields change
}

interface SubscriptionOptions {
  // Delivery mode
  delivery: {
    mode: 'realtime' | 'batched' | 'polling';
    batchWindow?: number;    // ms for batched mode
    pollInterval?: number;   // ms for polling mode
  };

  // Content options
  content: {
    includePayload: boolean;
    deltaOnly: boolean;      // Only send changed fields
    compress: boolean;
  };

  // Reliability
  reliability: {
    ackRequired: boolean;
    retryOnFailure: boolean;
    maxRetries?: number;
  };

  // Catch-up
  catchUp?: {
    fromVersion?: number;
    fromTimestamp?: Date;
    maxEvents?: number;
  };
}
```

### Product-Specific Adapters

#### Claude Chat Adapter

```typescript
class ChatContextAdapter {
  private ws: WebSocket;
  private subscription: Subscription;
  private contextCache: Map<string, CompiledContext>;

  async connect(workspaceId: string): Promise<void> {
    this.subscription = await this.subscribe({
      client: {
        product: 'chat',
        productVersion: '2.0',
        clientId: this.sessionId,
      },
      subscription: {
        scopes: [
          { type: 'workspace', id: workspaceId },
        ],
        filters: {
          nodeTypes: ['DECISION', 'GUIDELINE', 'PATTERN', 'FAQ'],
          layers: ['ORGANIZATIONAL', 'WORKSPACE'],
        },
        options: {
          delivery: {
            mode: 'batched',
            batchWindow: 5000,  // 5 second batches
          },
          content: {
            includePayload: true,
            deltaOnly: false,
            compress: true,
          },
          reliability: {
            ackRequired: false,
            retryOnFailure: true,
          },
        },
      },
    });
  }

  onContextChange(batch: EventBatch): void {
    // Invalidate affected cache entries
    for (const event of batch.events) {
      this.contextCache.delete(event.entityId);
    }

    // Notify conversation engine
    this.emit('context:updated', {
      affectedNodeIds: batch.events.map(e => e.entityId),
      summary: this.summarizeChanges(batch),
    });
  }

  async getContextForPrompt(topic: string): Promise<string> {
    // Check cache first
    const cacheKey = `compiled:${topic}`;
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey).content;
    }

    // Compile fresh context
    const compiled = await this.compileContext({
      relevantTo: topic,
      tokenBudget: 4000,
    });

    this.contextCache.set(cacheKey, compiled);
    return compiled.content;
  }
}
```

#### Claude Code Adapter

```typescript
class CodeContextAdapter {
  private ws: WebSocket;
  private subscription: Subscription;
  private claudeMdPath: string;

  async connect(projectPath: string): Promise<void> {
    // Detect workspace from git or config
    const workspaceId = await this.detectWorkspace(projectPath);

    this.subscription = await this.subscribe({
      client: {
        product: 'code',
        productVersion: '1.5',
        clientId: `code-${hostname()}-${process.pid}`,
      },
      subscription: {
        scopes: [
          { type: 'workspace', id: workspaceId },
          // Subscribe to active slice if any
          ...(this.activeSlice
            ? [{ type: 'slice', id: this.activeSlice }]
            : []
          ),
        ],
        filters: {
          nodeTypes: ['PATTERN', 'DECISION', 'DOCUMENT', 'CODE_STYLE'],
        },
        options: {
          delivery: {
            mode: 'realtime',  // Immediate for code
          },
          content: {
            includePayload: true,
            deltaOnly: true,
            compress: false,
          },
          reliability: {
            ackRequired: true,
            retryOnFailure: true,
            maxRetries: 3,
          },
          catchUp: {
            fromVersion: this.lastKnownVersion,
          },
        },
      },
    });
  }

  async onContextChange(event: ContextEvent): Promise<void> {
    // Update local CLAUDE.md
    const compiled = await this.compileContext({
      format: 'markdown',
      includeMetadata: true,
    });

    await this.updateClaudeMd(compiled);

    // Notify user
    this.showNotification({
      title: 'Context Updated',
      body: `${event.payload.title || 'Context'} was updated`,
      action: () => this.showDiff(event),
    });
  }

  private async updateClaudeMd(compiled: CompiledContext): Promise<void> {
    const content = `# Project Context

> Auto-generated by Claude Context. Last updated: ${new Date().toISOString()}
> Version: ${compiled.version}

${compiled.content}

---
_Subscribed to workspace: ${compiled.workspaceId}_
_Active slice: ${this.activeSlice || 'None'}_
`;

    await fs.writeFile(this.claudeMdPath, content);
  }
}
```

#### Claude CoWork Adapter

```typescript
class CoWorkContextAdapter {
  private ws: WebSocket;
  private subscription: Subscription;
  private exportPath: string;

  async connect(workspaceId: string): Promise<void> {
    this.subscription = await this.subscribe({
      client: {
        product: 'cowork',
        productVersion: '1.0',
        clientId: `cowork-${getMachineId()}`,
      },
      subscription: {
        scopes: [
          { type: 'workspace', id: workspaceId },
          { type: 'pattern', pattern: 'slice/*' },
        ],
        options: {
          delivery: {
            mode: 'batched',
            batchWindow: 10000,  // 10 second batches
          },
          content: {
            includePayload: true,
            deltaOnly: false,
            compress: true,
          },
          reliability: {
            ackRequired: true,
            retryOnFailure: true,
          },
        },
      },
    });
  }

  async onContextChange(batch: EventBatch): Promise<void> {
    const changes = this.categorizeChanges(batch);

    // Update exported files
    if (changes.nodes.length > 0) {
      await this.syncNodesToFiles(changes.nodes);
    }

    if (changes.slices.length > 0) {
      await this.syncSlicesToFolders(changes.slices);
    }

    // Generate updated reports if needed
    if (this.shouldRegenerateReports(changes)) {
      await this.regenerateReports();
    }

    // Show desktop notification
    this.showSystemNotification({
      title: 'Context Synced',
      body: `${batch.events.length} changes synced to local files`,
    });
  }

  private async syncNodesToFiles(nodes: ContextEvent[]): Promise<void> {
    for (const event of nodes) {
      const node = event.payload as ContextNode;
      const filePath = this.getNodeFilePath(node);

      if (event.eventType === 'node.deleted') {
        await fs.unlink(filePath).catch(() => {});
      } else {
        const content = this.renderNodeAsMarkdown(node);
        await fs.writeFile(filePath, content);
      }
    }
  }

  private async syncSlicesToFolders(slices: ContextEvent[]): Promise<void> {
    for (const event of slices) {
      const slice = event.payload as WorkSlice;
      const folderPath = this.getSliceFolderPath(slice);

      if (event.eventType === 'slice.deleted') {
        await fs.rm(folderPath, { recursive: true }).catch(() => {});
      } else {
        await this.exportSlicePackage(slice.id, folderPath);
      }
    }
  }
}
```

### Subscription Gateway Implementation

```typescript
@Injectable()
export class SubscriptionGateway {
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private metrics: MetricsService;

  @WebSocketGateway({
    path: '/context/ws',
    cors: true,
  })
  handleConnection(client: WebSocket, request: Request): void {
    const clientId = this.generateClientId();
    this.connections.set(clientId, client);

    client.on('message', (data) => this.handleMessage(clientId, data));
    client.on('close', () => this.handleDisconnect(clientId));
    client.on('error', (err) => this.handleError(clientId, err));

    // Send welcome message
    this.send(client, {
      type: 'connected',
      payload: { clientId },
    });

    this.metrics.gauge('ws.connections', this.connections.size);
  }

  private async handleMessage(clientId: string, data: Buffer): Promise<void> {
    const message = JSON.parse(data.toString()) as ClientMessage;

    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(clientId, message);
        break;
      case 'unsubscribe':
        await this.handleUnsubscribe(clientId, message);
        break;
      case 'ack':
        await this.handleAck(clientId, message);
        break;
      case 'ping':
        this.handlePing(clientId, message);
        break;
    }
  }

  private async handleSubscribe(
    clientId: string,
    message: SubscribeMessage,
  ): Promise<void> {
    // Validate auth
    const auth = await this.validateAuth(message.payload.auth);
    if (!auth.valid) {
      this.sendError(clientId, message.id, 'UNAUTHORIZED', auth.error);
      return;
    }

    // Check permissions for requested scopes
    const permitted = await this.checkPermissions(
      auth.tenantId,
      auth.userId,
      message.payload.subscription.scopes,
    );
    if (!permitted.allowed) {
      this.sendError(clientId, message.id, 'FORBIDDEN', permitted.reason);
      return;
    }

    // Create or resume subscription
    const subscription = await this.createSubscription({
      clientId,
      tenantId: auth.tenantId,
      product: message.payload.client.product,
      ...message.payload.subscription,
    });

    this.subscriptions.set(subscription.id, subscription);

    // Send confirmation
    this.send(this.connections.get(clientId)!, {
      type: 'subscribed',
      id: message.id,
      payload: {
        subscriptionId: subscription.id,
        currentVersion: await this.getCurrentVersion(auth.tenantId),
      },
    });

    // Handle catch-up if requested
    if (message.payload.subscription.options?.catchUp) {
      await this.processCatchUp(subscription);
    }

    this.metrics.increment('subscriptions.created', {
      product: message.payload.client.product,
    });
  }

  /**
   * Route events to subscriptions
   */
  async routeEvent(event: ContextEvent): Promise<void> {
    const startTime = Date.now();
    let deliveryCount = 0;

    // Find matching subscriptions
    const matchingSubscriptions = await this.findMatchingSubscriptions(event);

    for (const subscription of matchingSubscriptions) {
      try {
        await this.deliverToSubscription(subscription, event);
        deliveryCount++;
      } catch (error) {
        this.handleDeliveryError(subscription, event, error);
      }
    }

    this.metrics.histogram('event.routing.latency', Date.now() - startTime);
    this.metrics.increment('events.delivered', deliveryCount);
  }

  private async findMatchingSubscriptions(
    event: ContextEvent,
  ): Promise<Subscription[]> {
    const matching: Subscription[] = [];

    for (const [id, subscription] of this.subscriptions) {
      if (subscription.tenantId !== event.tenantId) continue;
      if (!this.matchesScopes(event, subscription.scopes)) continue;
      if (!this.matchesFilters(event, subscription.filters)) continue;

      matching.push(subscription);
    }

    return matching;
  }

  private matchesScopes(
    event: ContextEvent,
    scopes: SubscriptionScope[],
  ): boolean {
    for (const scope of scopes) {
      switch (scope.type) {
        case 'tenant':
          return true;
        case 'workspace':
          if (event.metadata?.workspaceId === scope.id) return true;
          break;
        case 'graph':
          if (event.graphId === scope.id) return true;
          break;
        case 'slice':
          if (event.entityType === 'slice' && event.entityId === scope.id) return true;
          break;
        case 'node':
          if (event.entityType === 'node' && event.entityId === scope.id) return true;
          break;
        case 'pattern':
          if (this.matchesPattern(event, scope.pattern!)) return true;
          break;
      }
    }
    return false;
  }

  private async deliverToSubscription(
    subscription: Subscription,
    event: ContextEvent,
  ): Promise<void> {
    const client = this.connections.get(subscription.clientId);
    if (!client) {
      // Client disconnected, queue for later
      await this.queueForReconnect(subscription, event);
      return;
    }

    if (subscription.options.delivery.mode === 'batched') {
      await this.addToBatch(subscription, event);
    } else {
      await this.deliverImmediate(subscription, event);
    }
  }

  private async deliverImmediate(
    subscription: Subscription,
    event: ContextEvent,
  ): Promise<void> {
    const client = this.connections.get(subscription.clientId)!;

    const payload = this.formatEventPayload(event, subscription.options.content);

    this.send(client, {
      type: 'event',
      payload: {
        subscriptionId: subscription.id,
        event: payload,
        position: {
          version: event.globalVersion,
          timestamp: event.timestamp,
        },
      },
    });

    if (subscription.options.reliability.ackRequired) {
      await this.trackPendingAck(subscription.id, event.id);
    }
  }

  private async addToBatch(
    subscription: Subscription,
    event: ContextEvent,
  ): Promise<void> {
    const batchKey = `batch:${subscription.id}`;

    // Add to batch
    const batch = this.batches.get(batchKey) || [];
    batch.push(event);
    this.batches.set(batchKey, batch);

    // Schedule flush if not already scheduled
    if (!this.batchTimers.has(batchKey)) {
      const timer = setTimeout(
        () => this.flushBatch(subscription),
        subscription.options.delivery.batchWindow,
      );
      this.batchTimers.set(batchKey, timer);
    }
  }

  private async flushBatch(subscription: Subscription): Promise<void> {
    const batchKey = `batch:${subscription.id}`;
    const batch = this.batches.get(batchKey) || [];

    if (batch.length === 0) return;

    const client = this.connections.get(subscription.clientId);
    if (!client) {
      await this.queueForReconnect(subscription, batch);
      return;
    }

    const payload = batch.map(e =>
      this.formatEventPayload(e, subscription.options.content)
    );

    this.send(client, {
      type: 'batch',
      payload: {
        subscriptionId: subscription.id,
        events: payload,
        position: {
          fromVersion: batch[0].globalVersion,
          toVersion: batch[batch.length - 1].globalVersion,
        },
      },
    });

    this.batches.delete(batchKey);
    this.batchTimers.delete(batchKey);
  }
}
```

### MCP Integration

```typescript
// Add to MCP server tools
const subscriptionTools = [
  {
    name: 'subscribe_context',
    description: 'Subscribe to context changes for real-time updates',
    inputSchema: {
      type: 'object',
      properties: {
        scopes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { enum: ['workspace', 'graph', 'slice', 'node', 'pattern'] },
              id: { type: 'string' },
              pattern: { type: 'string' },
            },
          },
        },
        filters: {
          type: 'object',
          properties: {
            nodeTypes: { type: 'array', items: { type: 'string' } },
            layers: { type: 'array', items: { type: 'string' } },
          },
        },
        options: {
          type: 'object',
          properties: {
            mode: { enum: ['realtime', 'batched', 'polling'] },
            batchWindow: { type: 'number' },
          },
        },
      },
    },
    handler: async (params) => {
      const subscription = await subscriptionService.create(params);
      return {
        subscriptionId: subscription.id,
        websocketUrl: `wss://api.claude-context.com/context/ws`,
        instructions: 'Connect to websocket and send subscribe message with this ID',
      };
    },
  },
  {
    name: 'get_context_updates',
    description: 'Poll for context updates since last check (for clients without WebSocket)',
    inputSchema: {
      type: 'object',
      properties: {
        sinceVersion: { type: 'number' },
        sinceTimestamp: { type: 'string', format: 'date-time' },
        scopes: { type: 'array' },
        limit: { type: 'number', default: 100 },
      },
    },
    handler: async (params) => {
      const updates = await eventStore.getUpdatesSince(params);
      return {
        events: updates.events,
        currentVersion: updates.currentVersion,
        hasMore: updates.hasMore,
      };
    },
  },
  {
    name: 'unsubscribe_context',
    description: 'Unsubscribe from context updates',
    inputSchema: {
      type: 'object',
      properties: {
        subscriptionId: { type: 'string' },
      },
      required: ['subscriptionId'],
    },
    handler: async (params) => {
      await subscriptionService.remove(params.subscriptionId);
      return { success: true };
    },
  },
];
```

### Monitoring and Observability

```typescript
// Metrics to track
const subscriptionMetrics = {
  // Connection metrics
  'ws.connections': 'gauge',           // Active connections
  'ws.connections.by_product': 'gauge', // By product type
  'ws.connection.duration': 'histogram', // Connection lifetime

  // Subscription metrics
  'subscriptions.active': 'gauge',     // Active subscriptions
  'subscriptions.created': 'counter',  // New subscriptions
  'subscriptions.removed': 'counter',  // Removed subscriptions

  // Delivery metrics
  'events.delivered': 'counter',       // Events delivered
  'events.delivery.latency': 'histogram', // Delivery latency
  'events.delivery.failures': 'counter', // Failed deliveries
  'events.batches.size': 'histogram',  // Batch sizes
  'events.batches.flushed': 'counter', // Batches sent

  // Catch-up metrics
  'catchup.events': 'counter',         // Events sent in catch-up
  'catchup.duration': 'histogram',     // Catch-up duration
};

// Health check endpoint
@Get('/context/subscriptions/health')
async getSubscriptionHealth(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    connections: this.gateway.getConnectionCount(),
    subscriptions: this.gateway.getSubscriptionCount(),
    eventsPerSecond: this.metrics.getRate('events.delivered'),
    avgDeliveryLatency: this.metrics.getAvg('events.delivery.latency'),
    pendingAcks: this.gateway.getPendingAckCount(),
  };
}
```

## Consequences

### Positive

- **Unified protocol** - Single subscription mechanism for all products
- **Product optimization** - Each product can tune its subscription behavior
- **Real-time updates** - Sub-second context propagation
- **Resilience** - Catch-up and retry mechanisms handle failures
- **Observable** - Comprehensive metrics for monitoring

### Negative

- **Complexity** - Significant infrastructure to maintain
- **Resource usage** - WebSocket connections consume server resources
- **Ordering challenges** - Must handle out-of-order delivery

### Mitigations

1. **Connection pooling** - Efficient WebSocket management
2. **Horizontal scaling** - Gateway can scale across instances
3. **Sequence numbers** - Global ordering via version numbers
4. **Graceful fallback** - Polling mode when WebSocket unavailable

## References

- [ADR-024: Reactive Context Layer](./ADR-024-reactive-context-layer.md)
- [ADR-025: Context Versioning](./ADR-025-context-versioning.md)
- [WebSocket Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)
