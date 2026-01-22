# ADR-020: Audit Logging and Compliance Architecture

**Status:** Accepted
**Date:** January 2026
**Deciders:** Security & Compliance Team
**Categories:** Security, Compliance, Observability

## Context

Enterprise customers require comprehensive audit logging for compliance with security frameworks (SOC 2 Type II, GDPR, HIPAA). The audit logging system must:

1. **Capture all security-relevant events** - Auth, data access, modifications
2. **Immutable records** - Cannot be modified or deleted
3. **Queryable** - Support investigation and reporting
4. **Exportable** - For compliance auditors and SIEM integration
5. **High availability** - Must not fail silently
6. **Low latency impact** - Should not slow down operations
7. **Retention policies** - Configurable per compliance requirements

### Events to Capture

| Category | Events |
|----------|--------|
| Authentication | Login success/failure, logout, token refresh, MFA events |
| API Keys | Created, revoked, used |
| Context | Graph/node created, updated, deleted, searched, compiled |
| Slices | Created, updated, deleted, state transitions |
| Team | User invited, removed, role changed |
| Admin | Settings updated, data exported/deleted |
| Integrations | Connected, disconnected, synced |
| AI Sessions | Started, ended, feedback submitted |

### Options Considered

#### Option A: PostgreSQL Audit Table

Store audit logs in a PostgreSQL table within the existing database.

**Pros:**
- Simple implementation
- No additional infrastructure
- Transactional consistency with business data
- Easy to query with SQL

**Cons:**
- Same database as application data
- Could impact performance at scale
- Harder to enforce immutability
- Single point of failure

#### Option B: Dedicated Audit Database

Separate PostgreSQL instance specifically for audit logs.

**Pros:**
- Isolation from application database
- Can scale independently
- Easier to secure differently
- Performance isolation

**Cons:**
- Additional infrastructure to manage
- Cross-database queries not possible
- Network latency for writes
- Higher operational complexity

#### Option C: Event Streaming (Kafka) + Data Lake

Stream audit events to Kafka, consume into data lake (S3/BigQuery).

**Pros:**
- Highly scalable
- Decoupled architecture
- Natural fit for SIEM integration
- Immutable event log by design

**Cons:**
- Significant infrastructure complexity
- Higher latency for recent events
- Requires additional expertise
- Overkill for current scale

#### Option D: PostgreSQL + Async Queue + Fallback

PostgreSQL for primary storage with async writes via queue, plus file fallback.

**Pros:**
- Simple initial implementation
- Non-blocking audit writes
- Graceful degradation with fallback
- Can evolve to Option C later

**Cons:**
- Small delay in audit visibility
- Must manage queue infrastructure
- Two storage locations to consider

## Decision

**We will implement Option D: PostgreSQL + Async Queue + Fallback.**

Rationale:
1. **Pragmatic start** - PostgreSQL table is simple and queryable
2. **Non-blocking** - Async writes don't impact request latency
3. **Resilience** - Fallback ensures no lost events
4. **Evolution path** - Can migrate to streaming later
5. **Compliance ready** - Meets SOC 2 / GDPR requirements

### Audit Log Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Controllers  │   Services   │   Guards   │   Interceptors  │
└───────┬───────┴───────┬──────┴─────┬──────┴────────┬────────┘
        │               │            │               │
        └───────────────┴─────┬──────┴───────────────┘
                              │ AuditService.log()
                              ▼
                    ┌─────────────────┐
                    │   AuditService  │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌───────────┐ ┌────────────────┐
    │  PostgreSQL   │ │   Queue   │ │  File Fallback │
    │  (Primary)    │ │  (Async)  │ │  (Last resort) │
    └───────────────┘ └───────────┘ └────────────────┘
                             │
                    ┌────────▼────────┐
                    │   SIEM Export   │
                    │  (Future)       │
                    └─────────────────┘
```

### Audit Event Schema

```prisma
model AuditLog {
  id           String   @id @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  timestamp    DateTime @default(now())

  // Actor - Who performed the action
  actorId      String   @map("actor_id") @db.VarChar(255)
  actorType    String   @map("actor_type") @db.VarChar(50)
  // Values: 'user', 'api_key', 'system'

  // Action - What was done
  action       String   @db.VarChar(100)
  // Format: 'category.resource.verb'
  // Examples: 'auth.login.success', 'context.node.created', 'slice.transitioned'

  // Resource - What was affected
  resourceType String?  @map("resource_type") @db.VarChar(100)
  resourceId   String?  @map("resource_id") @db.VarChar(255)

  // Details - Additional context
  metadata     Json     @default("{}")

  // Outcome - Result of the action
  outcome      String   @db.VarChar(20)
  // Values: 'success', 'failure', 'denied'
  errorCode    String?  @map("error_code") @db.VarChar(50)
  errorMessage String?  @map("error_message") @db.Text

  // Request context
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent") @db.VarChar(500)

  @@index([tenantId])
  @@index([timestamp])
  @@index([actorId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

### Audit Actions Taxonomy

```typescript
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  API_KEY_CREATED = 'auth.api_key.created',
  API_KEY_REVOKED = 'auth.api_key.revoked',
  MFA_ENABLED = 'auth.mfa.enabled',
  MFA_DISABLED = 'auth.mfa.disabled',
  PASSWORD_CHANGED = 'auth.password.changed',

  // Context
  CONTEXT_GRAPH_CREATED = 'context.graph.created',
  CONTEXT_GRAPH_DELETED = 'context.graph.deleted',
  CONTEXT_NODE_CREATED = 'context.node.created',
  CONTEXT_NODE_UPDATED = 'context.node.updated',
  CONTEXT_NODE_DELETED = 'context.node.deleted',
  CONTEXT_COMPILED = 'context.compiled',
  CONTEXT_SEARCHED = 'context.searched',

  // Slices
  SLICE_CREATED = 'slice.created',
  SLICE_UPDATED = 'slice.updated',
  SLICE_DELETED = 'slice.deleted',
  SLICE_TRANSITIONED = 'slice.transitioned',

  // Team
  USER_INVITED = 'team.user.invited',
  USER_REMOVED = 'team.user.removed',
  USER_ROLE_CHANGED = 'team.user.role_changed',
  WORKSPACE_CREATED = 'team.workspace.created',
  WORKSPACE_DELETED = 'team.workspace.deleted',

  // Admin
  SETTINGS_UPDATED = 'admin.settings.updated',
  BILLING_UPDATED = 'admin.billing.updated',
  DATA_EXPORTED = 'admin.data.exported',
  DATA_DELETED = 'admin.data.deleted',

  // Integrations
  INTEGRATION_CONNECTED = 'integration.connected',
  INTEGRATION_DISCONNECTED = 'integration.disconnected',
  INTEGRATION_SYNCED = 'integration.synced',

  // AI Sessions
  SESSION_STARTED = 'ai.session.started',
  SESSION_ENDED = 'ai.session.ended',
  FEEDBACK_SUBMITTED = 'ai.feedback.submitted',
}
```

### Audit Service Implementation

```typescript
@Injectable()
export class AuditService {
  async log(data: AuditEventData): Promise<void> {
    try {
      // Primary: Write to PostgreSQL
      await this.prisma.auditLog.create({ data: { ... } });
    } catch (error) {
      // Fallback: Write to file/external service
      this.logger.error('Audit write failed', error);
      this.writeFallbackLog(data);
    }
  }

  async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    // Query with filters, pagination
  }

  async export(options: AuditExportOptions): Promise<string> {
    // Export as JSON Lines for SIEM
  }

  async getSummary(tenantId: string, period: DateRange): Promise<AuditSummary> {
    // Aggregate statistics by action category
  }
}
```

### Automatic Audit Interceptor

```typescript
// Decorator to mark handlers for audit logging
@AuditLog(AuditAction.CONTEXT_NODE_CREATED, 'context_node')

// Interceptor automatically logs based on decorator
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditAction = Reflect.getMetadata('auditAction', handler);
    if (!auditAction) return next.handle();

    return next.handle().pipe(
      tap(async (response) => {
        await this.auditService.log({
          action: auditAction,
          outcome: 'success',
          resourceId: response?.id,
          // ...
        });
      }),
      catchError(async (error) => {
        await this.auditService.log({
          action: auditAction,
          outcome: 'failure',
          errorCode: error.name,
          // ...
        });
        throw error;
      })
    );
  }
}
```

### API Endpoints

```
GET  /audit/logs              - Query audit logs (paginated)
GET  /audit/logs/:id          - Get specific audit log entry
GET  /audit/summary           - Get aggregated statistics
GET  /audit/export            - Export logs (JSON Lines format)
```

### Retention Policies

| Compliance | Retention Period |
|------------|-----------------|
| SOC 2      | 1 year minimum  |
| GDPR       | As required for purpose, then delete |
| HIPAA      | 6 years         |
| Default    | 2 years         |

### GDPR Considerations

1. **Data minimization** - Only log necessary fields
2. **Pseudonymization** - User IDs instead of names in logs
3. **Right to access** - Users can request their audit logs
4. **Right to erasure** - Can anonymize (not delete for compliance)

## Consequences

### Positive

- **Compliance ready** - Meets SOC 2, GDPR, HIPAA requirements
- **Investigation support** - Queryable logs for incident response
- **Automatic capture** - Interceptor reduces manual logging
- **Resilient** - Fallback ensures no lost events
- **Performant** - Async writes don't block requests

### Negative

- **Storage growth** - Audit logs grow continuously
- **Query complexity** - Large tables may need partitioning
- **Maintenance** - Retention policies must be enforced

### Mitigations

1. **Table partitioning** - Partition by month for query performance
2. **Archive strategy** - Move old logs to cold storage
3. **Automated cleanup** - Scheduled jobs enforce retention
4. **Index optimization** - Monitor and tune indexes

## References

- [SOC 2 Compliance Requirements](https://www.aicpa.org/soc2)
- [GDPR Article 30 - Records of Processing](https://gdpr-info.eu/art-30-gdpr/)
- [OWASP Logging Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [PostgreSQL Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
