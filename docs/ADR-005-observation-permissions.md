# ADR-005: Observation Permissions Model

## Status
Proposed

## Context

For Claude to become proactively helpful—noticing issues, suggesting improvements, learning from outcomes—it needs to observe more than just direct conversations. This includes file systems, repositories, applications, and external metrics.

However, observation capabilities raise significant privacy, security, and trust concerns. We need a permission model that enables powerful capabilities while maintaining user control and trust.

## Options Considered

### Option A: All-or-Nothing
- User enables "Claude Observation" or doesn't
- If enabled, Claude can observe everything
- Simple to understand

**Pros:**
- Simple mental model
- Easy to implement
- No complex permission dialogs

**Cons:**
- Too coarse—users may want partial observation
- Privacy concerns may prevent any adoption
- No gradual trust building
- Violates principle of least privilege

### Option B: Per-Integration Permissions
- Each integration (file system, GitHub, etc.) has own permission
- User enables each separately
- All-or-nothing per integration

**Pros:**
- More granular than Option A
- Users understand what they're enabling
- Familiar model from mobile apps

**Cons:**
- Doesn't handle within-integration granularity
- "Allow GitHub" but only some repos?
- Permission fatigue with many integrations

### Option C: Capability-Based Graduated Permissions (Proposed)
- Permissions organized by capability, not just integration
- Graduated levels from passive to active
- Contextual permissions (per project, per timeframe)
- Progressive trust building

**Pros:**
- Fine-grained control
- Supports gradual adoption
- Users can start conservative and expand
- Aligns with how trust actually builds
- Respects principle of least privilege

**Cons:**
- More complex mental model
- Risk of permission fatigue
- Implementation complexity
- UI/UX design challenges

## Decision

We will adopt **Option C: Capability-Based Graduated Permissions**.

### Permission Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERMISSION LAYERS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Layer 0: BASELINE (Always On)                                          │
│  ├─ Conversation observation within session                             │
│  ├─ Basic interaction memory                                            │
│  └─ Explicit feedback collection                                        │
│                                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                         │
│  Layer 1: MEMORY (Opt-In, Default Off)                                  │
│  ├─ Cross-session memory persistence                                    │
│  ├─ Project context storage                                             │
│  ├─ Identity graph building                                             │
│  └─ Implicit feedback collection                                        │
│                                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                         │
│  Layer 2: OBSERVATION (Explicit Consent)                                │
│  ├─ File system observation (specified paths)                           │
│  ├─ Repository observation (specified repos)                            │
│  ├─ Browser observation (specified sites)                               │
│  └─ Artifact usage tracking                                             │
│                                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                         │
│  Layer 3: INTEGRATION (Per-Service Auth)                                │
│  ├─ GitHub: repo access, CI/CD observation                              │
│  ├─ Analytics: usage metrics, conversion data                           │
│  ├─ Monitoring: errors, performance, logs                               │
│  └─ Business tools: CRM, project management                             │
│                                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                         │
│  Layer 4: DEEP ACCESS (Custom Agreements)                               │
│  ├─ Production system observation                                       │
│  ├─ Customer data access (anonymized)                                   │
│  ├─ Financial/sensitive metrics                                         │
│  └─ Proactive action capabilities                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Permission Scoping

Permissions can be scoped by:

| Scope | Description | Example |
|-------|-------------|---------|
| **Global** | Applies everywhere | "Claude can remember across all sessions" |
| **Project** | Applies to specific project | "Claude can observe ~/projects/myapp" |
| **Time-bounded** | Expires after period | "Allow observation for next 30 days" |
| **Task-bounded** | Applies to specific task | "Observe this deployment, then stop" |
| **Conditional** | Requires context match | "Only observe when I'm debugging" |

### Permission Properties

Each permission has:

```typescript
interface Permission {
  id: UUID;
  layer: 0 | 1 | 2 | 3 | 4;
  capability: string;
  
  // Scoping
  scope: 'global' | 'project' | 'task';
  scopeTarget?: UUID | string;
  
  // Time bounds
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
  
  // Conditions
  conditions?: PermissionCondition[];
  
  // Audit
  lastUsedAt?: Timestamp;
  usageCount: number;
  
  // Revocation
  revokedAt?: Timestamp;
  revocationReason?: string;
}
```

## Consequences

### Positive
1. Users maintain fine-grained control
2. Trust can build gradually
3. Respects principle of least privilege
4. Enables powerful capabilities for those who want them
5. Audit trail provides transparency
6. Time/task bounding limits exposure

### Negative
1. Complex permission model may confuse users
2. UI design for permission management is challenging
3. Implementation complexity is significant
4. May slow adoption of observation features
5. Permission checking adds overhead

### Neutral
1. Requires thoughtful UX to explain layers
2. Changes how we think about feature enablement
3. May need per-feature permission flows

## Implementation Notes

### Permission Request Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    PERMISSION REQUEST FLOW                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐                                                   │
│  │   Claude    │                                                   │
│  │  Identifies │  "I could help more if I could observe           │
│  │  Capability │   your repository..."                            │
│  │    Need     │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────┐                                                   │
│  │   Explain   │  • What capability is needed                      │
│  │   Context   │  • Why it would help                              │
│  │             │  • What Claude would observe                      │
│  │             │  • What Claude wouldn't see                       │
│  └──────┬──────┘                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              USER DECISION INTERFACE                     │       │
│  │                                                          │       │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │       │
│  │  │    Allow     │ │  Allow with  │ │    Deny      │    │       │
│  │  │   (Scoped)   │ │  Conditions  │ │              │    │       │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │       │
│  │                                                          │       │
│  │  Scope options:                                          │       │
│  │  [ ] Just this session                                   │       │
│  │  [ ] This project only                                   │       │
│  │  [ ] Always (revocable)                                  │       │
│  │                                                          │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Permission Dashboard

Users should have access to:

1. **Current Permissions** - What Claude can currently observe
2. **Permission History** - What was granted and when
3. **Usage Log** - When permissions were actually used
4. **Quick Revoke** - One-click disable for any permission
5. **Bulk Controls** - "Disable all observation" panic button

### Privacy Commitments

For each layer:

| Layer | Data Handling | Retention | Deletion |
|-------|---------------|-----------|----------|
| 0 | Session only | None | Automatic |
| 1 | User-specific storage | Configurable | On request |
| 2 | User-specific storage | Configurable | On request |
| 3 | User-specific + integration | Per integration policy | On request |
| 4 | Custom agreement | Negotiated | Negotiated |

### Graceful Degradation

When permissions are not granted:
1. Claude explains what it cannot do
2. Claude offers alternatives that work within permissions
3. Claude remembers to ask again later (but not annoyingly)
4. Features degrade gracefully, never fail hard

## Related Decisions
- ADR-002: Context Layer Architecture
- ADR-004: Feedback Loop Design

## Open Questions
1. How to handle team/organization permissions vs. individual?
2. What's the right frequency for re-prompting about permissions?
3. How to communicate permission usage without being creepy?
4. Should permissions auto-expire after periods of non-use?
