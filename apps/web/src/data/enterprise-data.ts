/**
 * Enterprise Data Model - Salesforce-Scale Organization
 * Full-featured data for managing software across a large enterprise
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  intents: Intent[];
  context: ContextDoc[];
  integrations: Integration[];
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  intents: Intent[];
  context: ContextDoc[];
  repositories: Repository[];
  slackChannels: string[];
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  intents: Intent[];
  context: ContextDoc[];
  artifacts: Artifact[];
  repositories: Repository[];
  jiraProject?: string;
  confluenceSpace?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Intent {
  id: string;
  name: string;
  description?: string;
  type: 'goal' | 'constraint' | 'behavior' | 'principle' | 'okr' | 'adr';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'achieved' | 'blocked' | 'deprecated';
  source: 'org' | 'team' | 'project';
  createdBy: string;
  createdAt: string;
  // Rich intent data
  successMetrics?: SuccessMetric[];
  dependencies?: string[];
  relatedIntents?: string[];
  dueDate?: string;
  progress?: number;
  keyResults?: KeyResult[];
  decisionDetails?: ADRDetails;
}

export interface SuccessMetric {
  id: string;
  name: string;
  target: string;
  current: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface KeyResult {
  id: string;
  description: string;
  target: number;
  current: number;
  unit: string;
}

export interface ADRDetails {
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  decisionDate?: string;
  context: string;
  decision: string;
  consequences: string[];
  alternatives: { option: string; pros: string[]; cons: string[] }[];
}

export interface ContextDoc {
  id: string;
  name: string;
  type: 'document' | 'pattern' | 'api-spec' | 'guideline' | 'template' | 'example' | 'runbook' | 'architecture' | 'onboarding';
  source: 'manual' | 'confluence' | 'notion' | 'github' | 'google-docs';
  freshness: 'current' | 'stale' | 'outdated';
  lastVerified: string;
  usageCount: number;
  effectivenessScore: number;
  inherited?: boolean;
  inheritedFrom?: 'org' | 'team';
  // Rich document data
  content?: string;
  summary?: string;
  author?: string;
  lastUpdatedBy?: string;
  version?: string;
  tags?: string[];
  relatedDocs?: string[];
  externalUrl?: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  name: string;
  type: 'code' | 'diagram' | 'document' | 'test-results' | 'api-spec' | 'design' | 'prototype' | 'config';
  status: 'draft' | 'review' | 'approved' | 'published';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: string;
  // Rich artifact data
  content?: string;
  preview?: string;
  language?: string;
  fileSize?: string;
  downloadUrl?: string;
  lineage?: ArtifactLineage[];
  reviews?: ArtifactReview[];
  tags?: string[];
}

export interface ArtifactLineage {
  id: string;
  action: 'created' | 'modified' | 'reviewed' | 'approved' | 'published';
  user: string;
  timestamp: string;
  details?: string;
}

export interface ArtifactReview {
  id: string;
  reviewer: string;
  status: 'pending' | 'approved' | 'changes-requested';
  comments: string;
  timestamp: string;
}

export interface Slice {
  id: string;
  projectId: string;
  shortId: string;
  name: string;
  description: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: User;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  // Rich slice data
  acceptanceCriteria?: string[];
  linkedIntent?: string;
  pullRequests?: PullRequest[];
  jiraKey?: string;
  storyPoints?: number;
  labels?: string[];
  blockedBy?: string;
  blockedReason?: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  status: 'open' | 'merged' | 'closed';
  url: string;
  author: string;
  reviewers: string[];
  checksStatus: 'pending' | 'passing' | 'failing';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member' | 'viewer';
  teamIds: string[];
  title?: string;
  department?: string;
}

export interface Identity {
  userId: string;
  orgId: string;
  name: string;
  role: string;
  attributes: IdentityAttribute[];
}

export interface IdentityAttribute {
  key: string;
  value: string;
  source: 'okta' | 'manual' | 'github' | 'jira' | 'pagerduty';
}

export interface Integration {
  id: string;
  type: 'github' | 'jira' | 'confluence' | 'slack' | 'okta' | 'datadog' | 'pagerduty';
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, string>;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  language: string;
  lastCommit?: string;
  openPRs?: number;
}

// =============================================================================
// USERS
// =============================================================================

export const users: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@salesforce.com',
    avatar: 'SC',
    role: 'admin',
    teamIds: ['team-platform', 'team-sales-cloud'],
    title: 'VP of Engineering',
    department: 'Platform Engineering',
  },
  {
    id: 'user-2',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@salesforce.com',
    avatar: 'MJ',
    role: 'member',
    teamIds: ['team-platform'],
    title: 'Principal Engineer',
    department: 'Platform Engineering',
  },
  {
    id: 'user-3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@salesforce.com',
    avatar: 'ER',
    role: 'member',
    teamIds: ['team-sales-cloud'],
    title: 'Senior Software Engineer',
    department: 'Sales Cloud',
  },
  {
    id: 'user-4',
    name: 'David Kim',
    email: 'david.kim@salesforce.com',
    avatar: 'DK',
    role: 'member',
    teamIds: ['team-service-cloud'],
    title: 'Staff Engineer',
    department: 'Service Cloud',
  },
  {
    id: 'user-5',
    name: 'Priya Patel',
    email: 'priya.patel@salesforce.com',
    avatar: 'PP',
    role: 'member',
    teamIds: ['team-data-cloud'],
    title: 'Tech Lead',
    department: 'Data Cloud',
  },
  {
    id: 'user-6',
    name: 'James Wilson',
    email: 'james.wilson@salesforce.com',
    avatar: 'JW',
    role: 'member',
    teamIds: ['team-platform'],
    title: 'Senior Software Engineer',
    department: 'Platform Engineering',
  },
  {
    id: 'user-7',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@salesforce.com',
    avatar: 'LT',
    role: 'viewer',
    teamIds: ['team-sales-cloud', 'team-service-cloud'],
    title: 'Product Manager',
    department: 'Product',
  },
  {
    id: 'user-8',
    name: 'Alex Rivera',
    email: 'alex.rivera@salesforce.com',
    avatar: 'AR',
    role: 'member',
    teamIds: ['team-einstein'],
    title: 'ML Engineer',
    department: 'Einstein AI',
  },
];

export const currentUser = users[0];

// =============================================================================
// ORGANIZATION
// =============================================================================

export const organization: Organization = {
  id: 'org-salesforce',
  name: 'Salesforce',
  domain: 'salesforce.com',
  plan: 'enterprise',
  integrations: [
    { id: 'int-1', type: 'github', name: 'GitHub Enterprise', status: 'connected', lastSync: '2026-01-24T10:30:00Z' },
    { id: 'int-2', type: 'jira', name: 'Jira Cloud', status: 'connected', lastSync: '2026-01-24T10:25:00Z' },
    { id: 'int-3', type: 'confluence', name: 'Confluence', status: 'connected', lastSync: '2026-01-24T09:00:00Z' },
    { id: 'int-4', type: 'slack', name: 'Slack', status: 'connected', lastSync: '2026-01-24T10:35:00Z' },
    { id: 'int-5', type: 'okta', name: 'Okta SSO', status: 'connected', lastSync: '2026-01-24T10:00:00Z' },
    { id: 'int-6', type: 'datadog', name: 'Datadog', status: 'connected', lastSync: '2026-01-24T10:35:00Z' },
    { id: 'int-7', type: 'pagerduty', name: 'PagerDuty', status: 'connected', lastSync: '2026-01-24T10:30:00Z' },
  ],
  intents: [
    {
      id: 'org-intent-1',
      name: 'Trust is our #1 value',
      description: 'Security and data protection must be built into every feature from day one. No exceptions.',
      type: 'principle',
      priority: 'critical',
      status: 'active',
      source: 'org',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      successMetrics: [
        { id: 'sm-1', name: 'Security incidents', target: '0', current: '0', unit: 'incidents/quarter', trend: 'stable' },
        { id: 'sm-2', name: 'SOC 2 compliance', target: '100%', current: '100%', unit: 'compliance', trend: 'stable' },
      ],
    },
    {
      id: 'org-intent-2',
      name: 'Customer Success drives everything',
      description: 'Every technical decision should be evaluated through the lens of customer impact and value delivery.',
      type: 'principle',
      priority: 'critical',
      status: 'active',
      source: 'org',
      createdBy: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      successMetrics: [
        { id: 'sm-3', name: 'Customer NPS', target: '70', current: '72', unit: 'score', trend: 'up' },
        { id: 'sm-4', name: 'Time to value', target: '< 30 days', current: '28 days', unit: 'days', trend: 'down' },
      ],
    },
    {
      id: 'org-intent-3',
      name: 'FY26 Q1: 99.99% Platform Availability',
      description: 'Achieve and maintain four nines availability across all core platform services.',
      type: 'okr',
      priority: 'critical',
      status: 'active',
      source: 'org',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
      dueDate: '2026-03-31T00:00:00Z',
      progress: 67,
      keyResults: [
        { id: 'kr-1', description: 'Reduce P1 incidents to < 2 per month', target: 2, current: 1, unit: 'incidents' },
        { id: 'kr-2', description: 'Deploy automated failover for all critical services', target: 100, current: 75, unit: '%' },
        { id: 'kr-3', description: 'Achieve < 50ms p99 latency for core APIs', target: 50, current: 47, unit: 'ms' },
      ],
    },
    {
      id: 'org-intent-4',
      name: 'API-first architecture',
      description: 'All new features must expose a public API. Internal tools consume the same APIs as customers.',
      type: 'constraint',
      priority: 'high',
      status: 'active',
      source: 'org',
      createdBy: 'user-2',
      createdAt: '2024-06-01T00:00:00Z',
    },
    {
      id: 'org-intent-5',
      name: 'Multi-tenant by default',
      description: 'All services must support multi-tenancy with proper data isolation from initial design.',
      type: 'constraint',
      priority: 'critical',
      status: 'active',
      source: 'org',
      createdBy: 'user-2',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  context: [
    {
      id: 'org-ctx-1',
      name: 'Salesforce Engineering Principles',
      type: 'guideline',
      source: 'confluence',
      freshness: 'current',
      lastVerified: '2026-01-20T00:00:00Z',
      usageCount: 15420,
      effectivenessScore: 0.94,
      version: '4.2',
      author: 'Engineering Leadership',
      tags: ['principles', 'culture', 'engineering'],
      summary: 'Core engineering principles that guide all technical decisions at Salesforce.',
      content: `# Salesforce Engineering Principles

## 1. Trust
Trust is our #1 value. We earn and maintain trust through:
- Security by design
- Data protection and privacy
- Transparency in our practices
- Reliability and availability

## 2. Customer Success
Every line of code should contribute to customer success:
- Understand the customer problem first
- Measure impact, not just output
- Ship incrementally and learn
- Support what we ship

## 3. Innovation
We innovate responsibly:
- Experiment with purpose
- Fail fast, learn faster
- Share knowledge across teams
- Build on what works

## 4. Equality
Technology should be accessible to all:
- Design for accessibility from day one
- Consider diverse use cases
- Build inclusive experiences
- Remove barriers to adoption

## 5. Sustainability
Build for the long term:
- Write maintainable code
- Document decisions (ADRs)
- Automate repetitive tasks
- Reduce technical debt continuously`,
      externalUrl: 'https://confluence.salesforce.com/display/ENG/Engineering+Principles',
    },
    {
      id: 'org-ctx-2',
      name: 'Security Standards v3.1',
      type: 'guideline',
      source: 'confluence',
      freshness: 'current',
      lastVerified: '2026-01-22T00:00:00Z',
      usageCount: 8932,
      effectivenessScore: 0.97,
      version: '3.1',
      author: 'Security Team',
      tags: ['security', 'compliance', 'standards'],
      summary: 'Mandatory security standards for all Salesforce applications and services.',
      content: `# Security Standards v3.1

## Authentication & Authorization
- All services MUST use Salesforce Identity for authentication
- OAuth 2.0 with PKCE for public clients
- Service-to-service: mTLS with short-lived certificates
- No API keys in code, use Vault for secrets

## Data Protection
- All PII must be encrypted at rest (AES-256)
- TLS 1.3 required for data in transit
- Data classification required for all new tables
- Retention policies must be defined and enforced

## Input Validation
- Validate all input at service boundaries
- Use parameterized queries (no string concatenation)
- Sanitize output for appropriate context
- Implement rate limiting on all public endpoints

## Logging & Monitoring
- Log all authentication events
- Log all data access (who, what, when)
- No PII in logs (use tokenization)
- Alert on anomalous patterns

## Incident Response
- P1: 15 minute response, 4 hour resolution
- P2: 1 hour response, 24 hour resolution
- Post-mortem required for all P1/P2
- Security team must be notified immediately`,
      externalUrl: 'https://confluence.salesforce.com/display/SEC/Security+Standards',
    },
    {
      id: 'org-ctx-3',
      name: 'API Design Guidelines',
      type: 'api-spec',
      source: 'github',
      freshness: 'current',
      lastVerified: '2026-01-18T00:00:00Z',
      usageCount: 12450,
      effectivenessScore: 0.91,
      version: '2.4',
      author: 'Platform Team',
      tags: ['api', 'rest', 'design', 'standards'],
      summary: 'Standards for designing consistent, reliable, and developer-friendly APIs.',
      content: `# Salesforce API Design Guidelines

## URL Structure
\`\`\`
https://api.salesforce.com/{version}/{resource}
https://api.salesforce.com/v59.0/sobjects/Account
\`\`\`

## HTTP Methods
- GET: Retrieve resources (idempotent)
- POST: Create new resources
- PATCH: Partial update (preferred over PUT)
- DELETE: Remove resources

## Response Format
\`\`\`json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-24T10:30:00Z"
  },
  "pagination": {
    "cursor": "eyJpZCI6MTIzfQ==",
    "hasMore": true
  }
}
\`\`\`

## Error Format
\`\`\`json
{
  "error": {
    "code": "INVALID_FIELD",
    "message": "Field 'email' is required",
    "details": [...],
    "requestId": "req_abc123"
  }
}
\`\`\`

## Versioning
- URL versioning: /v59.0/
- Support N-2 versions minimum
- 18-month deprecation notice
- Migration guides required

## Rate Limiting
- Include X-RateLimit-* headers
- 429 response with Retry-After
- Tiered limits by customer segment`,
      externalUrl: 'https://github.com/salesforce/api-guidelines',
    },
    {
      id: 'org-ctx-4',
      name: 'Code Review Checklist',
      type: 'template',
      source: 'confluence',
      freshness: 'current',
      lastVerified: '2026-01-15T00:00:00Z',
      usageCount: 28340,
      effectivenessScore: 0.89,
      version: '1.8',
      tags: ['code-review', 'quality', 'process'],
      summary: 'Standard checklist for code reviews across all Salesforce repositories.',
      content: `# Code Review Checklist

## Functionality
- [ ] Code accomplishes the stated purpose
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logic errors

## Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation present
- [ ] SQL/NoSQL injection prevented
- [ ] XSS prevention for web code
- [ ] Authorization checks in place

## Performance
- [ ] No N+1 queries
- [ ] Appropriate indexing considered
- [ ] Caching strategy appropriate
- [ ] No unnecessary computation in loops

## Testing
- [ ] Unit tests for new code
- [ ] Integration tests for APIs
- [ ] Test coverage >= 80%
- [ ] Edge cases tested

## Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] README updated if needed
- [ ] ADR created for decisions

## Observability
- [ ] Appropriate logging
- [ ] Metrics emitted
- [ ] Tracing instrumented
- [ ] Alerts defined`,
    },
  ],
};

// =============================================================================
// TEAMS
// =============================================================================

export const teams: Team[] = [
  {
    id: 'team-platform',
    orgId: 'org-salesforce',
    name: 'Platform Engineering',
    slug: 'platform',
    description: 'Core platform infrastructure, APIs, and developer tools that power all Salesforce products.',
    memberCount: 156,
    repositories: [
      { id: 'repo-1', name: 'platform-core', url: 'https://github.com/salesforce/platform-core', defaultBranch: 'main', language: 'Java', openPRs: 12 },
      { id: 'repo-2', name: 'api-gateway', url: 'https://github.com/salesforce/api-gateway', defaultBranch: 'main', language: 'Go', openPRs: 5 },
      { id: 'repo-3', name: 'developer-tools', url: 'https://github.com/salesforce/developer-tools', defaultBranch: 'main', language: 'TypeScript', openPRs: 8 },
    ],
    slackChannels: ['#platform-eng', '#platform-incidents', '#platform-releases'],
    intents: [
      {
        id: 'team-platform-intent-1',
        name: 'Sub-100ms API latency for p99',
        description: 'All core platform APIs must respond within 100ms at the 99th percentile.',
        type: 'goal',
        priority: 'high',
        status: 'active',
        source: 'team',
        createdBy: 'user-2',
        createdAt: '2025-10-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-5', name: 'p99 latency', target: '< 100ms', current: '87ms', unit: 'ms', trend: 'down' },
          { id: 'sm-6', name: 'p50 latency', target: '< 30ms', current: '24ms', unit: 'ms', trend: 'stable' },
        ],
      },
      {
        id: 'team-platform-intent-2',
        name: 'Zero-downtime deployments',
        description: 'All platform services must support blue-green deployments with instant rollback capability.',
        type: 'constraint',
        priority: 'critical',
        status: 'active',
        source: 'team',
        createdBy: 'user-2',
        createdAt: '2025-06-01T00:00:00Z',
      },
      {
        id: 'team-platform-intent-3',
        name: 'ADR-047: Adopt gRPC for internal services',
        description: 'Decision to migrate internal service communication from REST to gRPC for performance.',
        type: 'adr',
        priority: 'high',
        status: 'active',
        source: 'team',
        createdBy: 'user-2',
        createdAt: '2025-11-15T00:00:00Z',
        decisionDetails: {
          status: 'accepted',
          decisionDate: '2025-11-20T00:00:00Z',
          context: 'Internal service communication is causing latency issues. REST+JSON serialization overhead is significant at our scale.',
          decision: 'Adopt gRPC with Protocol Buffers for all new internal service communication. Existing REST endpoints will be maintained for external APIs.',
          consequences: [
            'Reduced latency for internal calls (estimated 40% improvement)',
            'Need to train teams on Protocol Buffers',
            'Additional tooling required for debugging',
            'Type safety improvements across services',
          ],
          alternatives: [
            {
              option: 'Continue with REST',
              pros: ['No migration effort', 'Familiar to all teams', 'Good tooling'],
              cons: ['Performance limitations', 'No streaming support', 'Schema drift'],
            },
            {
              option: 'GraphQL Federation',
              pros: ['Flexible queries', 'Good for client apps'],
              cons: ['Complexity', 'Not suited for service-to-service', 'Performance overhead'],
            },
          ],
        },
      },
    ],
    context: [
      {
        id: 'team-platform-ctx-1',
        name: 'Platform Architecture Overview',
        type: 'architecture',
        source: 'confluence',
        freshness: 'current',
        lastVerified: '2026-01-10T00:00:00Z',
        usageCount: 4520,
        effectivenessScore: 0.92,
        tags: ['architecture', 'platform', 'overview'],
        summary: 'High-level architecture of the Salesforce platform and how components interact.',
        content: `# Platform Architecture Overview

## System Components

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        CDN / Edge                            │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway (Kong)                       │
│            Rate Limiting │ Auth │ Routing                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Sales Cloud │ Service Cloud│  Data Cloud  │  Einstein AI   │
│   Services   │   Services   │   Services   │   Services     │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                    Platform Core Services                    │
│     Identity │ Permissions │ Metadata │ Events │ Storage    │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (Hyperforce)                   │
│        PostgreSQL │ Redis │ Elasticsearch │ S3              │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Key Services

### API Gateway
- Kong-based gateway handling 50B+ requests/day
- OAuth 2.0 authentication
- Rate limiting per org and user
- Request routing and load balancing

### Platform Core
- **Identity Service**: Authentication, SSO, MFA
- **Permissions Service**: Row-level security, field-level security
- **Metadata Service**: Custom objects, fields, relationships
- **Events Service**: Platform events, CDC, webhooks
- **Storage Service**: File storage, attachments

### Data Layer
- Multi-tenant PostgreSQL clusters
- Redis for caching and sessions
- Elasticsearch for search
- S3-compatible object storage`,
      },
      {
        id: 'team-platform-ctx-2',
        name: 'Platform Runbook',
        type: 'runbook',
        source: 'github',
        freshness: 'current',
        lastVerified: '2026-01-22T00:00:00Z',
        usageCount: 2340,
        effectivenessScore: 0.95,
        tags: ['runbook', 'operations', 'incidents'],
        summary: 'Operational procedures for platform services including incident response.',
        content: `# Platform Runbook

## Incident Response

### P1 - Critical (Complete Outage)
1. Page on-call immediately via PagerDuty
2. Open bridge call: +1-415-555-0100
3. Notify: #platform-incidents, VP Engineering
4. Status page update within 5 minutes
5. Customer communication within 15 minutes

### P2 - High (Degraded Service)
1. Alert on-call via Slack
2. Assess impact and affected customers
3. Status page update within 15 minutes
4. Begin investigation and mitigation

## Common Issues

### High API Latency
1. Check Datadog dashboard: Platform > API Latency
2. Identify affected endpoints
3. Check downstream dependencies
4. Review recent deployments
5. Scale if load-related: \`kubectl scale deployment api-gateway --replicas=N\`

### Database Connection Pool Exhaustion
1. Check connection count: \`SELECT count(*) FROM pg_stat_activity;\`
2. Identify long-running queries
3. Kill problematic connections if needed
4. Scale connection pool: Update HikariCP config
5. Review application connection management

### Memory Pressure
1. Check heap usage in Datadog
2. Take heap dump if needed: \`jcmd <pid> GC.heap_dump /tmp/heap.hprof\`
3. Analyze with MAT or VisualVM
4. Restart pod if immediate relief needed
5. File ticket for memory leak investigation`,
      },
    ],
  },
  {
    id: 'team-sales-cloud',
    orgId: 'org-salesforce',
    name: 'Sales Cloud',
    slug: 'sales-cloud',
    description: 'CRM solutions for sales teams including leads, opportunities, forecasting, and pipeline management.',
    memberCount: 234,
    repositories: [
      { id: 'repo-4', name: 'sales-cloud-core', url: 'https://github.com/salesforce/sales-cloud-core', defaultBranch: 'main', language: 'Java', openPRs: 18 },
      { id: 'repo-5', name: 'opportunity-service', url: 'https://github.com/salesforce/opportunity-service', defaultBranch: 'main', language: 'Java', openPRs: 7 },
    ],
    slackChannels: ['#sales-cloud-eng', '#sales-cloud-releases'],
    intents: [
      {
        id: 'team-sales-intent-1',
        name: 'FY26 Q1: Launch AI-powered forecasting',
        description: 'Deploy Einstein-powered sales forecasting to all Enterprise customers.',
        type: 'okr',
        priority: 'high',
        status: 'active',
        source: 'team',
        createdBy: 'user-3',
        createdAt: '2026-01-01T00:00:00Z',
        dueDate: '2026-03-31T00:00:00Z',
        progress: 45,
        keyResults: [
          { id: 'kr-4', description: 'Complete ML model training on historical data', target: 100, current: 80, unit: '%' },
          { id: 'kr-5', description: 'Achieve 85% forecast accuracy', target: 85, current: 78, unit: '%' },
          { id: 'kr-6', description: 'Beta testing with 50 customers', target: 50, current: 23, unit: 'customers' },
        ],
      },
    ],
    context: [
      {
        id: 'team-sales-ctx-1',
        name: 'Sales Cloud Data Model',
        type: 'architecture',
        source: 'confluence',
        freshness: 'current',
        lastVerified: '2026-01-15T00:00:00Z',
        usageCount: 3200,
        effectivenessScore: 0.88,
        tags: ['data-model', 'sales', 'objects'],
        summary: 'Core data model for Sales Cloud including standard and custom objects.',
      },
    ],
  },
  {
    id: 'team-service-cloud',
    orgId: 'org-salesforce',
    name: 'Service Cloud',
    slug: 'service-cloud',
    description: 'Customer service solutions including cases, knowledge base, omni-channel routing, and agent workspace.',
    memberCount: 189,
    repositories: [
      { id: 'repo-6', name: 'service-cloud-core', url: 'https://github.com/salesforce/service-cloud-core', defaultBranch: 'main', language: 'Java', openPRs: 14 },
      { id: 'repo-7', name: 'case-management', url: 'https://github.com/salesforce/case-management', defaultBranch: 'main', language: 'Java', openPRs: 9 },
    ],
    slackChannels: ['#service-cloud-eng', '#service-cloud-support'],
    intents: [
      {
        id: 'team-service-intent-1',
        name: 'Reduce case resolution time by 30%',
        description: 'Through AI-assisted routing and suggested solutions.',
        type: 'goal',
        priority: 'high',
        status: 'active',
        source: 'team',
        createdBy: 'user-4',
        createdAt: '2025-10-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-7', name: 'Avg resolution time', target: '< 4 hours', current: '4.8 hours', unit: 'hours', trend: 'down' },
        ],
      },
    ],
    context: [],
  },
  {
    id: 'team-data-cloud',
    orgId: 'org-salesforce',
    name: 'Data Cloud',
    slug: 'data-cloud',
    description: 'Unified customer data platform for identity resolution, segmentation, and real-time activation.',
    memberCount: 145,
    repositories: [
      { id: 'repo-8', name: 'data-cloud-core', url: 'https://github.com/salesforce/data-cloud-core', defaultBranch: 'main', language: 'Scala', openPRs: 11 },
      { id: 'repo-9', name: 'identity-resolution', url: 'https://github.com/salesforce/identity-resolution', defaultBranch: 'main', language: 'Python', openPRs: 6 },
    ],
    slackChannels: ['#data-cloud-eng'],
    intents: [
      {
        id: 'team-data-intent-1',
        name: 'Process 1B events/day with <1s latency',
        description: 'Scale real-time event processing to handle enterprise customer volumes.',
        type: 'goal',
        priority: 'critical',
        status: 'active',
        source: 'team',
        createdBy: 'user-5',
        createdAt: '2025-09-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-8', name: 'Events processed/day', target: '1B', current: '850M', unit: 'events', trend: 'up' },
          { id: 'sm-9', name: 'p99 processing latency', target: '< 1s', current: '1.2s', unit: 'seconds', trend: 'down' },
        ],
      },
    ],
    context: [],
  },
  {
    id: 'team-einstein',
    orgId: 'org-salesforce',
    name: 'Einstein AI',
    slug: 'einstein',
    description: 'AI and machine learning platform powering intelligent features across all Salesforce clouds.',
    memberCount: 178,
    repositories: [
      { id: 'repo-10', name: 'einstein-platform', url: 'https://github.com/salesforce/einstein-platform', defaultBranch: 'main', language: 'Python', openPRs: 15 },
      { id: 'repo-11', name: 'einstein-copilot', url: 'https://github.com/salesforce/einstein-copilot', defaultBranch: 'main', language: 'Python', openPRs: 22 },
    ],
    slackChannels: ['#einstein-eng', '#einstein-ml-ops'],
    intents: [
      {
        id: 'team-einstein-intent-1',
        name: 'Einstein Copilot GA for all clouds',
        description: 'Launch Einstein Copilot as generally available across Sales, Service, and Marketing clouds.',
        type: 'okr',
        priority: 'critical',
        status: 'active',
        source: 'team',
        createdBy: 'user-8',
        createdAt: '2026-01-01T00:00:00Z',
        dueDate: '2026-06-30T00:00:00Z',
        progress: 35,
        keyResults: [
          { id: 'kr-7', description: 'Complete safety evaluation and red-teaming', target: 100, current: 60, unit: '%' },
          { id: 'kr-8', description: 'Achieve <500ms response time for 95% of queries', target: 95, current: 82, unit: '%' },
          { id: 'kr-9', description: 'Reach 80% user satisfaction in beta', target: 80, current: 74, unit: '%' },
        ],
      },
    ],
    context: [
      {
        id: 'team-einstein-ctx-1',
        name: 'Einstein AI Responsible Use Guidelines',
        type: 'guideline',
        source: 'confluence',
        freshness: 'current',
        lastVerified: '2026-01-20T00:00:00Z',
        usageCount: 5600,
        effectivenessScore: 0.96,
        tags: ['ai', 'ethics', 'guidelines', 'responsible-ai'],
        summary: 'Guidelines for responsible development and deployment of AI features.',
        content: `# Einstein AI Responsible Use Guidelines

## Core Principles

### 1. Transparency
- Users must know when they're interacting with AI
- AI-generated content must be clearly labeled
- Explain AI decisions when possible (explainable AI)

### 2. Fairness
- Test for bias across demographic groups
- Regular fairness audits required
- Document known limitations

### 3. Privacy
- Minimize data collection
- Customer data never used to train models without consent
- Support data deletion requests

### 4. Safety
- Red-team all customer-facing AI features
- Content filtering for harmful outputs
- Human escalation paths required

## Implementation Requirements

### Before Launch
- [ ] Bias testing completed
- [ ] Red-team evaluation passed
- [ ] Privacy review approved
- [ ] Safety filters implemented
- [ ] User controls documented

### Ongoing
- Monthly fairness metrics review
- Quarterly safety evaluation
- Annual third-party audit`,
      },
    ],
  },
];

// =============================================================================
// PROJECTS
// =============================================================================

export const projects: Project[] = [
  {
    id: 'proj-api-gateway',
    teamId: 'team-platform',
    name: 'API Gateway v3',
    description: 'Next-generation API gateway with improved rate limiting, better observability, and support for gRPC.',
    status: 'active',
    jiraProject: 'APIGW',
    confluenceSpace: 'PLATFORM',
    repositories: [
      { id: 'repo-2', name: 'api-gateway', url: 'https://github.com/salesforce/api-gateway', defaultBranch: 'main', language: 'Go', openPRs: 5 },
    ],
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    intents: [
      {
        id: 'proj-apigw-intent-1',
        name: 'Support 100K requests/second per instance',
        description: 'Each gateway instance must handle 100K RPS with <10ms overhead.',
        type: 'goal',
        priority: 'critical',
        status: 'active',
        source: 'project',
        createdBy: 'user-2',
        createdAt: '2025-06-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-10', name: 'Max RPS per instance', target: '100K', current: '85K', unit: 'RPS', trend: 'up' },
          { id: 'sm-11', name: 'Gateway overhead', target: '<10ms', current: '8ms', unit: 'ms', trend: 'stable' },
        ],
      },
      {
        id: 'proj-apigw-intent-2',
        name: 'Backwards compatible with v2 clients',
        description: 'All v2 API clients must continue working without changes.',
        type: 'constraint',
        priority: 'critical',
        status: 'active',
        source: 'project',
        createdBy: 'user-2',
        createdAt: '2025-06-01T00:00:00Z',
      },
    ],
    context: [
      {
        id: 'proj-apigw-ctx-1',
        name: 'API Gateway v3 Design Doc',
        type: 'architecture',
        source: 'google-docs',
        freshness: 'current',
        lastVerified: '2026-01-18T00:00:00Z',
        usageCount: 892,
        effectivenessScore: 0.91,
        tags: ['design', 'architecture', 'api-gateway'],
        summary: 'Technical design for API Gateway v3 including architecture decisions and migration plan.',
        content: `# API Gateway v3 Design Document

## Overview
API Gateway v3 is a ground-up rewrite of our API gateway in Go, designed for:
- 10x throughput improvement
- Native gRPC support
- Enhanced observability
- Simplified configuration

## Architecture

\`\`\`
                    ┌─────────────────┐
                    │   Load Balancer │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
        │  Gateway  │  │  Gateway  │  │  Gateway  │
        │ Instance  │  │ Instance  │  │ Instance  │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────┴────────┐
                    │  Control Plane  │
                    │   (etcd + API)  │
                    └─────────────────┘
\`\`\`

## Key Components

### Request Pipeline
1. TLS termination (with cert rotation)
2. Protocol detection (HTTP/1.1, HTTP/2, gRPC)
3. Authentication (JWT validation, OAuth introspection)
4. Rate limiting (token bucket with Redis backend)
5. Request routing (path-based, header-based)
6. Load balancing (round-robin, least-connections)
7. Response transformation

### Configuration Management
- etcd for distributed config storage
- Hot reload without restarts
- Canary deployments for config changes
- Audit log for all changes

## Migration Plan
1. Phase 1: Deploy v3 alongside v2 (shadow mode)
2. Phase 2: Route 1% traffic to v3
3. Phase 3: Gradual rollout to 100%
4. Phase 4: Decommission v2`,
        externalUrl: 'https://docs.google.com/document/d/1234567890',
      },
      {
        id: 'proj-apigw-ctx-2',
        name: 'Rate Limiting Algorithm',
        type: 'pattern',
        source: 'github',
        freshness: 'current',
        lastVerified: '2026-01-20T00:00:00Z',
        usageCount: 456,
        effectivenessScore: 0.88,
        tags: ['rate-limiting', 'algorithm', 'pattern'],
        summary: 'Token bucket implementation with sliding window for accurate rate limiting.',
        content: `# Sliding Window Rate Limiting

## Algorithm
We use a sliding window log algorithm combined with token bucket for accurate and efficient rate limiting.

\`\`\`go
type RateLimiter struct {
    redis     *redis.Client
    keyPrefix string
    rate      int           // requests per window
    window    time.Duration // window size
}

func (rl *RateLimiter) Allow(ctx context.Context, key string) (bool, error) {
    now := time.Now().UnixNano()
    windowStart := now - rl.window.Nanoseconds()

    pipe := rl.redis.Pipeline()

    // Remove old entries
    pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))

    // Count current window
    pipe.ZCard(ctx, key)

    // Add current request
    pipe.ZAdd(ctx, key, &redis.Z{Score: float64(now), Member: now})

    // Set TTL
    pipe.Expire(ctx, key, rl.window)

    results, err := pipe.Exec(ctx)
    if err != nil {
        return false, err
    }

    count := results[1].(*redis.IntCmd).Val()
    return count < int64(rl.rate), nil
}
\`\`\`

## Configuration
\`\`\`yaml
rate_limiting:
  default:
    rate: 1000
    window: 1m
  by_tier:
    enterprise:
      rate: 10000
      window: 1m
    professional:
      rate: 5000
      window: 1m
\`\`\``,
      },
    ],
    artifacts: [
      {
        id: 'artifact-1',
        projectId: 'proj-api-gateway',
        name: 'API Gateway Architecture Diagram',
        type: 'diagram',
        status: 'approved',
        createdAt: '2025-06-15T00:00:00Z',
        updatedAt: '2026-01-10T00:00:00Z',
        createdBy: 'user-2',
        version: '2.1',
        tags: ['architecture', 'diagram', 'infrastructure'],
        preview: 'Architecture diagram showing gateway components, control plane, and data flow.',
        lineage: [
          { id: 'lin-1', action: 'created', user: 'Marcus Johnson', timestamp: '2025-06-15T10:00:00Z' },
          { id: 'lin-2', action: 'modified', user: 'Marcus Johnson', timestamp: '2025-09-20T14:30:00Z', details: 'Added gRPC support components' },
          { id: 'lin-3', action: 'reviewed', user: 'Sarah Chen', timestamp: '2025-09-25T11:00:00Z' },
          { id: 'lin-4', action: 'approved', user: 'Sarah Chen', timestamp: '2026-01-10T09:00:00Z' },
        ],
        reviews: [
          { id: 'rev-1', reviewer: 'Sarah Chen', status: 'approved', comments: 'LGTM. Clear representation of the new architecture.', timestamp: '2026-01-10T09:00:00Z' },
        ],
      },
      {
        id: 'artifact-2',
        projectId: 'proj-api-gateway',
        name: 'Gateway Configuration Schema',
        type: 'api-spec',
        status: 'published',
        createdAt: '2025-07-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        createdBy: 'user-6',
        version: '1.4',
        language: 'yaml',
        tags: ['config', 'schema', 'api-spec'],
        content: `openapi: 3.0.3
info:
  title: API Gateway Configuration API
  version: 1.4.0
  description: API for managing gateway configuration

paths:
  /routes:
    get:
      summary: List all routes
      responses:
        '200':
          description: List of routes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Route'
    post:
      summary: Create a new route
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Route'
      responses:
        '201':
          description: Route created

components:
  schemas:
    Route:
      type: object
      required:
        - name
        - path
        - upstream
      properties:
        name:
          type: string
          example: "user-service"
        path:
          type: string
          example: "/api/v1/users/*"
        upstream:
          type: string
          example: "http://user-service:8080"
        methods:
          type: array
          items:
            type: string
          example: ["GET", "POST"]
        rateLimit:
          $ref: '#/components/schemas/RateLimit'

    RateLimit:
      type: object
      properties:
        rate:
          type: integer
          example: 1000
        window:
          type: string
          example: "1m"`,
        lineage: [
          { id: 'lin-5', action: 'created', user: 'James Wilson', timestamp: '2025-07-01T10:00:00Z' },
          { id: 'lin-6', action: 'published', user: 'Marcus Johnson', timestamp: '2025-07-15T14:00:00Z' },
        ],
      },
      {
        id: 'artifact-3',
        projectId: 'proj-api-gateway',
        name: 'Load Test Results - January 2026',
        type: 'test-results',
        status: 'published',
        createdAt: '2026-01-20T00:00:00Z',
        updatedAt: '2026-01-20T00:00:00Z',
        createdBy: 'user-6',
        version: '1.0',
        tags: ['testing', 'performance', 'load-test'],
        content: `# Load Test Results - API Gateway v3

## Test Configuration
- **Tool**: k6
- **Duration**: 30 minutes
- **Virtual Users**: 1000
- **Target**: 100K RPS

## Results Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Max RPS | 100,000 | 98,450 | ⚠️ |
| p50 Latency | <5ms | 3.2ms | ✅ |
| p99 Latency | <50ms | 42ms | ✅ |
| Error Rate | <0.01% | 0.003% | ✅ |
| CPU Usage | <70% | 65% | ✅ |
| Memory | <4GB | 3.2GB | ✅ |

## Observations
1. Slightly below 100K RPS target - investigating bottleneck
2. Excellent latency profile across all percentiles
3. Very low error rate even under heavy load
4. Resource utilization within acceptable bounds

## Recommendations
1. Profile connection pooling - suspected bottleneck
2. Consider increasing worker thread count
3. Implement connection keep-alive optimization

## Next Steps
- Address RPS gap before GA
- Run extended 24-hour stability test
- Test failure scenarios (upstream timeouts)`,
        lineage: [
          { id: 'lin-7', action: 'created', user: 'James Wilson', timestamp: '2026-01-20T15:00:00Z' },
          { id: 'lin-8', action: 'published', user: 'James Wilson', timestamp: '2026-01-20T16:00:00Z' },
        ],
      },
    ],
  },
  {
    id: 'proj-einstein-copilot',
    teamId: 'team-einstein',
    name: 'Einstein Copilot',
    description: 'AI-powered assistant integrated across Salesforce products for natural language interactions.',
    status: 'active',
    jiraProject: 'COPILOT',
    confluenceSpace: 'EINSTEIN',
    repositories: [
      { id: 'repo-11', name: 'einstein-copilot', url: 'https://github.com/salesforce/einstein-copilot', defaultBranch: 'main', language: 'Python', openPRs: 22 },
    ],
    createdAt: '2025-03-01T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    intents: [
      {
        id: 'proj-copilot-intent-1',
        name: 'Response latency <500ms for 95% of queries',
        description: 'User-perceived latency must be under 500ms for conversational feel.',
        type: 'goal',
        priority: 'critical',
        status: 'active',
        source: 'project',
        createdBy: 'user-8',
        createdAt: '2025-03-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-12', name: 'p95 response time', target: '<500ms', current: '520ms', unit: 'ms', trend: 'down' },
        ],
      },
      {
        id: 'proj-copilot-intent-2',
        name: 'No hallucination of customer data',
        description: 'Copilot must never generate fake customer data or records that don\'t exist.',
        type: 'constraint',
        priority: 'critical',
        status: 'active',
        source: 'project',
        createdBy: 'user-8',
        createdAt: '2025-03-01T00:00:00Z',
      },
      {
        id: 'proj-copilot-intent-3',
        name: 'ADR-012: Use RAG over fine-tuning for org data',
        description: 'Decision to use retrieval-augmented generation instead of per-org fine-tuning.',
        type: 'adr',
        priority: 'high',
        status: 'active',
        source: 'project',
        createdBy: 'user-8',
        createdAt: '2025-04-15T00:00:00Z',
        decisionDetails: {
          status: 'accepted',
          decisionDate: '2025-04-20T00:00:00Z',
          context: 'Need to give Copilot access to customer org data without training on it.',
          decision: 'Use RAG (Retrieval Augmented Generation) with a vector database to provide org context to the LLM at query time.',
          consequences: [
            'No customer data in model weights',
            'Real-time access to current data',
            'Higher latency than fine-tuned model',
            'Need robust retrieval pipeline',
          ],
          alternatives: [
            {
              option: 'Fine-tune per org',
              pros: ['Lower latency', 'Better task performance'],
              cons: ['Data in weights (compliance risk)', 'Stale data', 'Cost prohibitive at scale'],
            },
            {
              option: 'Prompt stuffing',
              pros: ['Simple implementation', 'No infrastructure'],
              cons: ['Context window limits', 'High token costs', 'Unreliable retrieval'],
            },
          ],
        },
      },
    ],
    context: [
      {
        id: 'proj-copilot-ctx-1',
        name: 'Copilot Prompt Engineering Guide',
        type: 'guideline',
        source: 'confluence',
        freshness: 'current',
        lastVerified: '2026-01-22T00:00:00Z',
        usageCount: 2340,
        effectivenessScore: 0.87,
        tags: ['prompt-engineering', 'llm', 'guidelines'],
        summary: 'Best practices for crafting prompts for Einstein Copilot.',
        content: `# Copilot Prompt Engineering Guide

## System Prompt Structure

\`\`\`
You are Einstein Copilot, a helpful AI assistant for Salesforce users.

## Your Capabilities
- Answer questions about customer data
- Create and update records
- Generate reports and summaries
- Explain Salesforce features

## Rules
1. Only reference data that exists in the provided context
2. Never make up customer names, accounts, or opportunities
3. If unsure, ask for clarification
4. Respect user permissions - don't show data they can't access

## Context
{retrieved_context}

## Conversation
{conversation_history}

User: {user_query}
\`\`\`

## Retrieval Strategy

1. **Query Understanding**
   - Extract entities (Account, Contact, Opportunity names)
   - Identify intent (query, create, update, explain)
   - Determine required object types

2. **Vector Search**
   - Search org's vector index
   - Retrieve top-k relevant records
   - Apply permission filtering

3. **Context Assembly**
   - Format retrieved records
   - Include field metadata
   - Add relationship context

## Response Guidelines

- Be concise but complete
- Format data in tables when appropriate
- Include record IDs for reference
- Suggest follow-up actions`,
      },
    ],
    artifacts: [
      {
        id: 'artifact-4',
        projectId: 'proj-einstein-copilot',
        name: 'Copilot Safety Evaluation Report',
        type: 'document',
        status: 'review',
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-22T00:00:00Z',
        createdBy: 'user-8',
        version: '0.9',
        tags: ['safety', 'evaluation', 'ai'],
        content: `# Einstein Copilot Safety Evaluation

## Executive Summary
This report summarizes the safety evaluation of Einstein Copilot conducted in January 2026. Overall, the system meets most safety criteria with some areas requiring attention before GA.

## Evaluation Methodology
- Automated red-teaming with 10,000 adversarial prompts
- Manual evaluation by security team
- Beta user feedback analysis
- Third-party audit by AI safety consultancy

## Results

### Hallucination Prevention
| Category | Pass Rate | Target |
|----------|-----------|--------|
| Customer data | 99.7% | 99.9% |
| Record IDs | 99.9% | 99.9% |
| Dates/Numbers | 98.5% | 99% |

### Content Safety
| Category | Pass Rate | Target |
|----------|-----------|--------|
| Harmful content | 99.99% | 99.99% |
| PII exposure | 99.95% | 99.99% |
| Prompt injection | 99.8% | 99.9% |

### Recommendations
1. **Critical**: Improve customer data hallucination rate
2. **High**: Enhance PII filtering for edge cases
3. **Medium**: Add additional prompt injection defenses

## Action Items
- [ ] Fine-tune retrieval pipeline for better grounding
- [ ] Add secondary validation for generated records
- [ ] Implement PII detection in responses
- [ ] Deploy prompt injection guardrails v2`,
        reviews: [
          { id: 'rev-2', reviewer: 'Sarah Chen', status: 'changes-requested', comments: 'Need to address critical items before sign-off.', timestamp: '2026-01-22T14:00:00Z' },
        ],
      },
    ],
  },
  {
    id: 'proj-identity-resolution',
    teamId: 'team-data-cloud',
    name: 'Identity Resolution v2',
    description: 'ML-powered identity resolution to unify customer profiles across data sources.',
    status: 'active',
    jiraProject: 'IDRES',
    confluenceSpace: 'DATACLOUD',
    repositories: [
      { id: 'repo-9', name: 'identity-resolution', url: 'https://github.com/salesforce/identity-resolution', defaultBranch: 'main', language: 'Python', openPRs: 6 },
    ],
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    intents: [
      {
        id: 'proj-idres-intent-1',
        name: '95% precision in identity matching',
        description: 'Match accuracy must exceed 95% to avoid incorrect profile merges.',
        type: 'goal',
        priority: 'critical',
        status: 'active',
        source: 'project',
        createdBy: 'user-5',
        createdAt: '2025-08-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-13', name: 'Match precision', target: '95%', current: '93.5%', unit: '%', trend: 'up' },
          { id: 'sm-14', name: 'Match recall', target: '90%', current: '88%', unit: '%', trend: 'up' },
        ],
      },
    ],
    context: [],
    artifacts: [],
  },
  {
    id: 'proj-case-routing',
    teamId: 'team-service-cloud',
    name: 'AI Case Routing',
    description: 'Intelligent case routing using NLP to match cases to the best available agent.',
    status: 'active',
    jiraProject: 'AIROUTE',
    confluenceSpace: 'SERVICECLOUD',
    repositories: [
      { id: 'repo-12', name: 'ai-case-routing', url: 'https://github.com/salesforce/ai-case-routing', defaultBranch: 'main', language: 'Python', openPRs: 4 },
    ],
    createdAt: '2025-09-01T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    intents: [
      {
        id: 'proj-routing-intent-1',
        name: 'Route 80% of cases without human intervention',
        description: 'Reduce manual case triage by accurately auto-routing most cases.',
        type: 'goal',
        priority: 'high',
        status: 'active',
        source: 'project',
        createdBy: 'user-4',
        createdAt: '2025-09-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-15', name: 'Auto-route rate', target: '80%', current: '72%', unit: '%', trend: 'up' },
          { id: 'sm-16', name: 'Routing accuracy', target: '90%', current: '87%', unit: '%', trend: 'up' },
        ],
      },
    ],
    context: [],
    artifacts: [],
  },
  {
    id: 'proj-forecast-ai',
    teamId: 'team-sales-cloud',
    name: 'Einstein Forecasting',
    description: 'AI-powered sales forecasting using historical data and pipeline analysis.',
    status: 'active',
    jiraProject: 'FORECAST',
    confluenceSpace: 'SALESCLOUD',
    repositories: [
      { id: 'repo-13', name: 'einstein-forecasting', url: 'https://github.com/salesforce/einstein-forecasting', defaultBranch: 'main', language: 'Python', openPRs: 8 },
    ],
    createdAt: '2025-07-01T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    intents: [
      {
        id: 'proj-forecast-intent-1',
        name: 'Forecast accuracy within 10% of actual',
        description: 'Quarterly forecasts must be within 10% of actual closed revenue.',
        type: 'goal',
        priority: 'high',
        status: 'active',
        source: 'project',
        createdBy: 'user-3',
        createdAt: '2025-07-01T00:00:00Z',
        successMetrics: [
          { id: 'sm-17', name: 'Forecast accuracy', target: '±10%', current: '±12%', unit: '%', trend: 'down' },
        ],
      },
    ],
    context: [],
    artifacts: [],
  },
];

// =============================================================================
// SLICES (Work Items)
// =============================================================================

export const slices: Slice[] = [
  // API Gateway slices
  {
    id: 'slice-1',
    projectId: 'proj-api-gateway',
    shortId: 'APIGW-234',
    name: 'Implement gRPC protocol support',
    description: 'Add native gRPC support to the gateway including health checks, load balancing, and circuit breaking.',
    status: 'in_progress',
    priority: 'high',
    assignee: users[1],
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    dueDate: '2026-02-01T00:00:00Z',
    storyPoints: 13,
    jiraKey: 'APIGW-234',
    linkedIntent: 'team-platform-intent-3',
    labels: ['grpc', 'protocol', 'p0'],
    acceptanceCriteria: [
      'Gateway can proxy gRPC requests to upstream services',
      'Health checks work for gRPC services',
      'Load balancing respects gRPC streaming',
      'Circuit breaker handles gRPC error codes',
      'Metrics emitted for gRPC traffic',
    ],
    pullRequests: [
      {
        id: 'pr-1',
        number: 1247,
        title: 'feat: Add gRPC protocol detection and routing',
        status: 'open',
        url: 'https://github.com/salesforce/api-gateway/pull/1247',
        author: 'marcus.johnson',
        reviewers: ['sarah.chen', 'james.wilson'],
        checksStatus: 'passing',
      },
    ],
  },
  {
    id: 'slice-2',
    projectId: 'proj-api-gateway',
    shortId: 'APIGW-235',
    name: 'Add distributed tracing with OpenTelemetry',
    description: 'Integrate OpenTelemetry for end-to-end distributed tracing across the gateway.',
    status: 'in_review',
    priority: 'high',
    assignee: users[5],
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-23T00:00:00Z',
    dueDate: '2026-01-28T00:00:00Z',
    storyPoints: 8,
    jiraKey: 'APIGW-235',
    labels: ['observability', 'tracing'],
    acceptanceCriteria: [
      'Traces propagated through gateway',
      'Span attributes include route, upstream, latency',
      'Sampling configurable per route',
      'Export to Datadog working',
    ],
    pullRequests: [
      {
        id: 'pr-2',
        number: 1245,
        title: 'feat: OpenTelemetry integration',
        status: 'open',
        url: 'https://github.com/salesforce/api-gateway/pull/1245',
        author: 'james.wilson',
        reviewers: ['marcus.johnson'],
        checksStatus: 'passing',
      },
    ],
  },
  {
    id: 'slice-3',
    projectId: 'proj-api-gateway',
    shortId: 'APIGW-236',
    name: 'Performance optimization for 100K RPS',
    description: 'Optimize connection pooling and memory allocation to reach 100K RPS target.',
    status: 'ready',
    priority: 'critical',
    assignee: users[1],
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    dueDate: '2026-02-15T00:00:00Z',
    storyPoints: 13,
    jiraKey: 'APIGW-236',
    linkedIntent: 'proj-apigw-intent-1',
    labels: ['performance', 'p0'],
    acceptanceCriteria: [
      'Achieve 100K RPS in load test',
      'Memory usage <4GB under load',
      'No GC pauses >10ms',
      'Connection pool tuning documented',
    ],
  },
  // Einstein Copilot slices
  {
    id: 'slice-4',
    projectId: 'proj-einstein-copilot',
    shortId: 'COPILOT-567',
    name: 'Improve retrieval pipeline latency',
    description: 'Optimize vector search and context assembly to reduce p95 latency below 500ms.',
    status: 'in_progress',
    priority: 'critical',
    assignee: users[7],
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    dueDate: '2026-02-05T00:00:00Z',
    storyPoints: 8,
    jiraKey: 'COPILOT-567',
    linkedIntent: 'proj-copilot-intent-1',
    labels: ['performance', 'retrieval', 'p0'],
    acceptanceCriteria: [
      'p95 latency < 500ms',
      'Retrieval quality maintained (MRR > 0.85)',
      'Support 1000 QPS per region',
    ],
    pullRequests: [
      {
        id: 'pr-3',
        number: 892,
        title: 'perf: Parallel retrieval and caching',
        status: 'open',
        url: 'https://github.com/salesforce/einstein-copilot/pull/892',
        author: 'alex.rivera',
        reviewers: ['priya.patel'],
        checksStatus: 'pending',
      },
    ],
  },
  {
    id: 'slice-5',
    projectId: 'proj-einstein-copilot',
    shortId: 'COPILOT-568',
    name: 'Add hallucination detection guardrails',
    description: 'Implement secondary validation to detect and prevent customer data hallucination.',
    status: 'in_progress',
    priority: 'critical',
    assignee: users[7],
    createdAt: '2026-01-22T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    dueDate: '2026-02-10T00:00:00Z',
    storyPoints: 13,
    jiraKey: 'COPILOT-568',
    linkedIntent: 'proj-copilot-intent-2',
    labels: ['safety', 'guardrails', 'p0'],
    acceptanceCriteria: [
      'Detect fabricated record IDs with 99.9% accuracy',
      'Validate all customer names against retrieved context',
      'Latency impact < 50ms',
      'False positive rate < 1%',
    ],
  },
  {
    id: 'slice-6',
    projectId: 'proj-einstein-copilot',
    shortId: 'COPILOT-569',
    name: 'Implement prompt injection defenses v2',
    description: 'Deploy enhanced prompt injection detection and mitigation.',
    status: 'blocked',
    priority: 'high',
    assignee: users[7],
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    storyPoints: 8,
    jiraKey: 'COPILOT-569',
    labels: ['security', 'guardrails'],
    blockedBy: 'slice-5',
    blockedReason: 'Depends on guardrails infrastructure from COPILOT-568',
    acceptanceCriteria: [
      'Block 99.9% of known injection patterns',
      'Graceful handling of edge cases',
      'Audit logging for blocked attempts',
    ],
  },
  // Identity Resolution slices
  {
    id: 'slice-7',
    projectId: 'proj-identity-resolution',
    shortId: 'IDRES-123',
    name: 'Improve email matching algorithm',
    description: 'Enhance email similarity scoring to handle typos and domain variations.',
    status: 'in_review',
    priority: 'high',
    assignee: users[4],
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-01-23T00:00:00Z',
    storyPoints: 5,
    jiraKey: 'IDRES-123',
    labels: ['ml', 'matching'],
    pullRequests: [
      {
        id: 'pr-4',
        number: 234,
        title: 'feat: Fuzzy email matching with Levenshtein distance',
        status: 'open',
        url: 'https://github.com/salesforce/identity-resolution/pull/234',
        author: 'priya.patel',
        reviewers: ['sarah.chen'],
        checksStatus: 'passing',
      },
    ],
  },
  // Case Routing slices
  {
    id: 'slice-8',
    projectId: 'proj-case-routing',
    shortId: 'AIROUTE-89',
    name: 'Train model on Q4 case data',
    description: 'Retrain routing model with Q4 2025 case data for improved accuracy.',
    status: 'completed',
    priority: 'medium',
    assignee: users[3],
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
    storyPoints: 5,
    jiraKey: 'AIROUTE-89',
    labels: ['ml', 'training'],
  },
  {
    id: 'slice-9',
    projectId: 'proj-case-routing',
    shortId: 'AIROUTE-90',
    name: 'Add skill-based routing support',
    description: 'Route cases based on agent skills and certifications.',
    status: 'in_progress',
    priority: 'high',
    assignee: users[3],
    createdAt: '2026-01-18T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    storyPoints: 8,
    jiraKey: 'AIROUTE-90',
    labels: ['feature', 'routing'],
    acceptanceCriteria: [
      'Consider agent skills in routing decision',
      'Support skill weights and priorities',
      'Fall back to queue if no skilled agent available',
    ],
  },
  // Forecasting slices
  {
    id: 'slice-10',
    projectId: 'proj-forecast-ai',
    shortId: 'FORECAST-45',
    name: 'Incorporate deal velocity signals',
    description: 'Add deal progression speed as a feature for forecast model.',
    status: 'ready',
    priority: 'medium',
    assignee: users[2],
    createdAt: '2026-01-22T00:00:00Z',
    updatedAt: '2026-01-24T00:00:00Z',
    storyPoints: 5,
    jiraKey: 'FORECAST-45',
    labels: ['ml', 'feature-engineering'],
    acceptanceCriteria: [
      'Extract velocity features from opportunity history',
      'Validate feature importance',
      'Update model training pipeline',
    ],
  },
];

// =============================================================================
// IDENTITY
// =============================================================================

export const identity: Identity = {
  userId: currentUser.id,
  orgId: organization.id,
  name: currentUser.name,
  role: currentUser.title || currentUser.role,
  attributes: [
    { key: 'department', value: currentUser.department || 'Engineering', source: 'okta' },
    { key: 'github_username', value: 'sarah-chen-sf', source: 'github' },
    { key: 'jira_account', value: 'sarah.chen', source: 'jira' },
    { key: 'security_clearance', value: 'L3', source: 'okta' },
    { key: 'on_call_eligible', value: 'true', source: 'pagerduty' },
    { key: 'cost_center', value: 'ENG-PLATFORM-001', source: 'okta' },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTeamById(teamId: string): Team | undefined {
  return teams.find(t => t.id === teamId);
}

export function getProjectById(projectId: string): Project | undefined {
  return projects.find(p => p.id === projectId);
}

export function getSlicesByProject(projectId: string): Slice[] {
  return slices.filter(s => s.projectId === projectId);
}

export function getUserById(userId: string): User | undefined {
  return users.find(u => u.id === userId);
}

export function getAllIntentsForProject(projectId: string): Intent[] {
  const project = getProjectById(projectId);
  if (!project) return [];

  const team = getTeamById(project.teamId);

  return [
    ...organization.intents,
    ...(team?.intents || []),
    ...project.intents,
  ];
}

export function getAllContextForProject(projectId: string): ContextDoc[] {
  const project = getProjectById(projectId);
  if (!project) return [];

  const team = getTeamById(project.teamId);

  return [
    ...organization.context.map(c => ({ ...c, inheritedFrom: 'org' as const })),
    ...(team?.context || []).map(c => ({ ...c, inheritedFrom: 'team' as const })),
    ...project.context,
  ];
}

export function getArtifactsByProject(projectId: string): Artifact[] {
  const project = getProjectById(projectId);
  return project?.artifacts || [];
}
