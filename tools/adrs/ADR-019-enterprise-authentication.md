# ADR-019: Enterprise Authentication Architecture

**Status:** Accepted
**Date:** January 2026
**Deciders:** Security & Architecture Team
**Categories:** Security, Authentication, Enterprise

## Context

Claude Context is targeting enterprise customers who require robust authentication and authorization. The authentication system must support:

1. **Multiple authentication methods** - Email/password, SSO/SAML, OIDC, API keys
2. **Multi-factor authentication** - TOTP for additional security
3. **Role-based access control** - Granular permissions per resource type
4. **API key management** - Programmatic access for CI/CD and MCP clients
5. **Session management** - Secure tokens with refresh capability
6. **Audit trail** - All auth events logged for compliance

### Options Considered

#### Option A: Build Custom Authentication

Implement authentication from scratch using bcrypt, JWT, and custom session management.

**Pros:**
- Complete control over implementation
- No external dependencies
- Can optimize for our specific needs

**Cons:**
- Security-critical code requires expertise
- Must implement and maintain SSO/SAML ourselves
- Higher risk of security vulnerabilities
- Significant development effort

#### Option B: Auth0 / Okta Integration

Use a third-party identity provider for all authentication.

**Pros:**
- Battle-tested security
- Built-in SSO/SAML/OIDC support
- Compliance certifications (SOC 2, HIPAA)
- Managed infrastructure

**Cons:**
- Vendor lock-in
- Per-user pricing adds cost
- Less control over UX
- External dependency for critical path

#### Option C: Hybrid Approach with Passport.js

Use Passport.js for authentication strategies with custom authorization layer.

**Pros:**
- Proven authentication middleware
- Flexible strategy system
- Large ecosystem of strategies
- Control over authorization logic
- Can add SSO later via strategies

**Cons:**
- Must implement JWT handling
- SSO/SAML strategies need configuration
- Session management is our responsibility

## Decision

**We will implement Option C: Hybrid Approach with Passport.js.**

Rationale:
1. **Flexibility** - Passport strategies for any auth method
2. **Control** - Custom RBAC for our specific permission model
3. **Evolution** - Can add SSO strategies incrementally
4. **Cost** - No per-user licensing fees
5. **Stack fit** - NestJS has excellent Passport integration

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Clients                                 │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Web App    │   MCP Server │   CLI Tool   │    CI/CD      │
│  (Session)   │  (API Key)   │   (JWT)      │  (API Key)    │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │               │
       └──────────────┴──────┬───────┴───────────────┘
                             │
                    ┌────────▼────────┐
                    │   Auth Guard    │
                    │  (Multi-strategy)│
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌───────▼───────┐  ┌──────▼──────┐
   │   Local     │   │     JWT       │  │  API Key    │
   │  Strategy   │   │   Strategy    │  │  Strategy   │
   │ (email/pwd) │   │  (Bearer)     │  │  (cc_xxx)   │
   └──────┬──────┘   └───────┬───────┘  └──────┬──────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │   AuthService   │
                    │  - validateUser │
                    │  - generateTokens│
                    │  - validateApiKey│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Prisma DB    │
                    │  - Users        │
                    │  - ApiKeys      │
                    └─────────────────┘
```

### Permission Model (RBAC)

```typescript
// Permission definitions
export const Permissions = {
  // Context
  CONTEXT_READ: 'context:read',
  CONTEXT_WRITE: 'context:write',
  CONTEXT_DELETE: 'context:delete',
  CONTEXT_ADMIN: 'context:admin',

  // Slices
  SLICE_READ: 'slice:read',
  SLICE_CREATE: 'slice:create',
  SLICE_TRANSITION: 'slice:transition',
  SLICE_DELETE: 'slice:delete',

  // Team
  TEAM_MANAGE: 'team:manage',
  TEAM_INVITE: 'team:invite',

  // Admin
  ADMIN_BILLING: 'admin:billing',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT: 'admin:audit',
};

// Role to permissions mapping
export const RolePermissions = {
  VIEWER: [
    Permissions.CONTEXT_READ,
    Permissions.SLICE_READ,
  ],
  MEMBER: [
    Permissions.CONTEXT_READ,
    Permissions.CONTEXT_WRITE,
    Permissions.SLICE_READ,
    Permissions.SLICE_CREATE,
    Permissions.SLICE_TRANSITION,
  ],
  ADMIN: [
    // All MEMBER permissions plus:
    Permissions.CONTEXT_DELETE,
    Permissions.SLICE_DELETE,
    Permissions.TEAM_MANAGE,
    Permissions.TEAM_INVITE,
  ],
  OWNER: Object.values(Permissions), // All permissions
};
```

### Token Strategy

```typescript
// Access Token (short-lived)
{
  sub: 'user-uuid',
  tenantId: 'tenant-uuid',
  email: 'user@example.com',
  role: 'ADMIN',
  permissions: ['context:read', 'context:write', ...],
  type: 'access',
  iat: 1234567890,
  exp: 1234571490, // 1 hour
  iss: 'claude-context',
  aud: 'claude-context-api',
}

// Refresh Token (long-lived)
{
  sub: 'user-uuid',
  tenantId: 'tenant-uuid',
  type: 'refresh',
  exp: 1235172690, // 7 days
}
```

### API Key Format

```
cc_<32-byte-hex-random>

Example: cc_a1b2c3d4e5f6...

Storage: SHA-256 hash of key (key itself never stored)
Display: Prefix shown for identification (cc_a1b2c3...)
```

### Database Schema

```prisma
model User {
  id           String    @id @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  email        String    @db.VarChar(255)
  passwordHash String?   @map("password_hash") @db.VarChar(255)
  mfaEnabled   Boolean   @default(false) @map("mfa_enabled")
  mfaSecret    String?   @map("mfa_secret") @db.VarChar(255)
  role         UserRole  @default(MEMBER)
  // ...
  apiKeys      ApiKey[]
}

model ApiKey {
  id          String    @id @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  name        String    @db.VarChar(255)
  keyHash     String    @unique @map("key_hash") @db.VarChar(64)
  keyPrefix   String    @map("key_prefix") @db.VarChar(10)
  permissions String[]  // Subset of user's permissions
  isActive    Boolean   @default(true) @map("is_active")
  expiresAt   DateTime? @map("expires_at")
  lastUsedAt  DateTime? @map("last_used_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
}
```

### API Endpoints

```
POST /auth/login           - Email/password login
POST /auth/refresh         - Refresh access token
GET  /auth/me              - Get current user info
POST /auth/api-keys        - Create API key
GET  /auth/api-keys        - List API keys
DELETE /auth/api-keys/:id  - Revoke API key
```

### Future: SSO/SAML Integration

```typescript
// passport-saml strategy (future)
{
  entryPoint: 'https://idp.example.com/sso/saml',
  issuer: 'claude-context',
  cert: 'IDP_CERTIFICATE',
  callbackUrl: 'https://app.claude-context.com/auth/saml/callback',
}
```

## Consequences

### Positive

- **Flexible authentication** - Support for email, JWT, and API keys
- **Granular authorization** - 15+ permissions across resource types
- **API-first** - MCP and CLI access via API keys
- **Secure tokens** - Short-lived access, long-lived refresh
- **Audit ready** - All auth events logged
- **Extensible** - Can add SSO strategies later

### Negative

- **Implementation effort** - Must build and test auth flows
- **Security responsibility** - Must ensure proper implementation
- **Token management** - Must handle rotation and revocation

### Mitigations

1. **Security review** - External audit of auth implementation
2. **Penetration testing** - Regular security assessments
3. **Dependency updates** - Keep Passport strategies current
4. **Rate limiting** - Prevent brute force attacks

## References

- [Passport.js Documentation](http://www.passportjs.org/)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)
- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
