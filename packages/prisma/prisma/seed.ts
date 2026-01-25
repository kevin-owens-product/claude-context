/**
 * @prompt-id forge-v4.1:prisma:seed:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 *
 * Seed script for Claude Context - Creates realistic demo data
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Use deterministic UUIDs for demo data (matches API default demo IDs)
const IDS = {
  tenant: '00000000-0000-0000-0000-000000000001', // Demo tenant ID
  users: {
    sarah: '00000000-0000-0000-0000-000000000001', // Demo user ID
    marcus: '00000000-0000-0000-0000-000000000002',
    emily: '00000000-0000-0000-0000-000000000003',
    alex: '00000000-0000-0000-0000-000000000004',
  },
  workspaces: {
    platform: '00000000-0000-0000-0000-000000000001',
    product: '00000000-0000-0000-0000-000000000002',
  },
  graphs: {
    platform: '00000000-0000-0000-0000-000000000001',
    product: '00000000-0000-0000-0000-000000000002',
  },
  nodes: {
    apiDesign: '00000000-0000-0000-0001-000000000001',
    errorHandling: '00000000-0000-0000-0001-000000000002',
    dbDecision: '00000000-0000-0000-0001-000000000003',
    authDecision: '00000000-0000-0000-0001-000000000004',
    githubRepo: '00000000-0000-0000-0001-000000000005',
    uiComponents: '00000000-0000-0000-0001-000000000006',
    formPatterns: '00000000-0000-0000-0001-000000000007',
  },
  slices: {
    auth: '00000000-0000-0000-0002-000000000001',
    rateLimit: '00000000-0000-0000-0002-000000000002',
    search: '00000000-0000-0000-0002-000000000003',
    dashboard: '00000000-0000-0000-0002-000000000004',
  },
  sessions: {
    s1: '00000000-0000-0000-0003-000000000001',
    s2: '00000000-0000-0000-0003-000000000002',
    s3: '00000000-0000-0000-0003-000000000003',
    s4: '00000000-0000-0000-0003-000000000004',
  },
  // Living Software Platform IDs
  userContext: '00000000-0000-0000-0004-000000000001',
  project: '00000000-0000-0000-0005-000000000001',
  intentGraphs: {
    dashboard: '00000000-0000-0000-0006-000000000001',
    api: '00000000-0000-0000-0006-000000000002',
    checkout: '00000000-0000-0000-0006-000000000003',
  },
  artifacts: {
    dashboardComponent: '00000000-0000-0000-0007-000000000001',
    metricCardComponent: '00000000-0000-0000-0007-000000000002',
    datePickerComponent: '00000000-0000-0000-0007-000000000003',
    metricsApiSchema: '00000000-0000-0000-0007-000000000004',
    dashboardTests: '00000000-0000-0000-0007-000000000005',
    apiClientCode: '00000000-0000-0000-0007-000000000006',
    checkoutFlow: '00000000-0000-0000-0007-000000000007',
    paymentIntegration: '00000000-0000-0000-0007-000000000008',
  },
  // Living Software Core IDs
  intents: {
    reduceChurn: '00000000-0000-0000-0010-000000000001',
    improveOnboarding: '00000000-0000-0000-0010-000000000002',
    increaseConversion: '00000000-0000-0000-0010-000000000003',
    enhancePerformance: '00000000-0000-0000-0010-000000000004',
    improveAccessibility: '00000000-0000-0000-0010-000000000005',
  },
  capabilities: {
    userAuth: '00000000-0000-0000-0011-000000000001',
    dashboardAnalytics: '00000000-0000-0000-0011-000000000002',
    searchIndexing: '00000000-0000-0000-0011-000000000003',
    paymentProcessing: '00000000-0000-0000-0011-000000000004',
    emailNotifications: '00000000-0000-0000-0011-000000000005',
    fileStorage: '00000000-0000-0000-0011-000000000006',
  },
  signals: {
    churnRate: '00000000-0000-0000-0012-000000000001',
    onboardingCompletion: '00000000-0000-0000-0012-000000000002',
    conversionRate: '00000000-0000-0000-0012-000000000003',
    pageLoadTime: '00000000-0000-0000-0012-000000000004',
    errorRate: '00000000-0000-0000-0012-000000000005',
    userSatisfaction: '00000000-0000-0000-0012-000000000006',
    apiLatency: '00000000-0000-0000-0012-000000000007',
    searchAccuracy: '00000000-0000-0000-0012-000000000008',
  },
  experiments: {
    onboardingFlow: '00000000-0000-0000-0013-000000000001',
    checkoutSimplify: '00000000-0000-0000-0013-000000000002',
    dashboardRedesign: '00000000-0000-0000-0013-000000000003',
  },
};

async function main() {
  console.log('🌱 Seeding database with realistic demo data...\n');

  // Clean existing data
  console.log('  Cleaning existing data...');
  // Living Software Core
  await prisma.signalMeasurement.deleteMany();
  await prisma.experiment.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.capability.deleteMany();
  await prisma.intentLearning.deleteMany();
  await prisma.intent.deleteMany();
  // Original entities
  await prisma.sessionFeedback.deleteMany();
  await prisma.aISession.deleteMany();
  await prisma.feedbackMetrics.deleteMany();
  await prisma.sliceReview.deleteMany();
  await prisma.sliceTransition.deleteMany();
  await prisma.sliceContext.deleteMany();
  await prisma.acceptanceCriterion.deleteMany();
  await prisma.sliceConstraint.deleteMany();
  await prisma.slice.deleteMany();
  await prisma.contextEdge.deleteMany();
  await prisma.contextNode.deleteMany();
  await prisma.contextGraph.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.tenant.deleteMany();

  // ============================================================================
  // TENANT
  // ============================================================================
  console.log('  Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      id: IDS.tenant,
      name: 'Acme Technologies',
      slug: 'acme-tech',
      plan: 'TEAM',
      settings: {
        features: ['context-graphs', 'ai-sessions', 'analytics'],
        tokenBudget: 100000,
        maxWorkspaces: 10,
      },
    },
  });

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('  Creating users...');
  const passwordHash = await bcrypt.hash('demo-password-123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: IDS.users.sarah,
        tenantId: tenant.id,
        email: 'sarah.chen@acme.tech',
        name: 'Sarah Chen',
        role: 'OWNER',
        passwordHash,
        settings: { theme: 'light', notifications: true },
      },
    }),
    prisma.user.create({
      data: {
        id: IDS.users.marcus,
        tenantId: tenant.id,
        email: 'marcus.rodriguez@acme.tech',
        name: 'Marcus Rodriguez',
        role: 'ADMIN',
        passwordHash,
        settings: { theme: 'dark', notifications: true },
      },
    }),
    prisma.user.create({
      data: {
        id: IDS.users.emily,
        tenantId: tenant.id,
        email: 'emily.nakamura@acme.tech',
        name: 'Emily Nakamura',
        role: 'MEMBER',
        passwordHash,
        settings: { theme: 'light', notifications: false },
      },
    }),
    prisma.user.create({
      data: {
        id: IDS.users.alex,
        tenantId: tenant.id,
        email: 'alex.thompson@acme.tech',
        name: 'Alex Thompson',
        role: 'MEMBER',
        passwordHash,
        settings: { theme: 'auto', notifications: true },
      },
    }),
  ]);

  const [sarah, marcus, emily, alex] = users;

  // ============================================================================
  // WORKSPACES
  // ============================================================================
  console.log('  Creating workspaces...');
  const workspaces = await Promise.all([
    prisma.workspace.create({
      data: {
        id: IDS.workspaces.platform,
        tenantId: tenant.id,
        name: 'Platform Engineering',
        slug: 'platform',
        description: 'Core platform services and infrastructure',
        settings: { defaultTokenBudget: 32000 },
      },
    }),
    prisma.workspace.create({
      data: {
        id: IDS.workspaces.product,
        tenantId: tenant.id,
        name: 'Product Development',
        slug: 'product',
        description: 'Customer-facing product features',
        settings: { defaultTokenBudget: 24000 },
      },
    }),
  ]);

  const [platformWs, productWs] = workspaces;

  // Add workspace members
  await Promise.all([
    prisma.workspaceMember.create({
      data: { workspaceId: platformWs.id, userId: sarah.id, role: 'ADMIN' },
    }),
    prisma.workspaceMember.create({
      data: { workspaceId: platformWs.id, userId: marcus.id, role: 'ADMIN' },
    }),
    prisma.workspaceMember.create({
      data: { workspaceId: platformWs.id, userId: emily.id, role: 'MEMBER' },
    }),
    prisma.workspaceMember.create({
      data: { workspaceId: productWs.id, userId: sarah.id, role: 'ADMIN' },
    }),
    prisma.workspaceMember.create({
      data: { workspaceId: productWs.id, userId: alex.id, role: 'MEMBER' },
    }),
  ]);

  // ============================================================================
  // CONTEXT GRAPHS
  // ============================================================================
  console.log('  Creating context graphs...');
  const graphs = await Promise.all([
    prisma.contextGraph.create({
      data: {
        id: IDS.graphs.platform,
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        name: 'Platform Architecture',
        description: 'Core platform architecture decisions and patterns',
        isDefault: true,
        version: 3,
        globalVersion: BigInt(47),
      },
    }),
    prisma.contextGraph.create({
      data: {
        id: IDS.graphs.product,
        tenantId: tenant.id,
        workspaceId: productWs.id,
        name: 'Product Guidelines',
        description: 'Product design patterns and conventions',
        isDefault: true,
        version: 2,
        globalVersion: BigInt(23),
      },
    }),
  ]);

  const [platformGraph, productGraph] = graphs;

  // ============================================================================
  // CONTEXT NODES
  // ============================================================================
  console.log('  Creating context nodes...');

  const platformNodes = await Promise.all([
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.apiDesign,
        tenantId: tenant.id,
        graphId: platformGraph.id,
        type: 'DOCUMENT',
        layer: 'ORGANIZATIONAL',
        name: 'API Design Guidelines',
        content: `# API Design Guidelines

## RESTful Conventions
- Use nouns for resource names (e.g., /users, /orders)
- Use HTTP verbs appropriately (GET, POST, PUT, DELETE)
- Return appropriate status codes (200, 201, 400, 404, 500)
- Use pagination for list endpoints (limit, offset)

## Request/Response Format
- Always use JSON
- Use camelCase for property names
- Include timestamps in ISO 8601 format
- Wrap collections in a data property

## Versioning
- Use URL versioning: /api/v1/resource
- Support at least 2 versions concurrently
- Deprecation notices 6 months before removal

## Authentication
- Use Bearer tokens in Authorization header
- Support API keys for service-to-service
- Implement rate limiting per client`,
        freshness: 'CURRENT',
        tokenCount: 245,
        version: 2,
        createdById: sarah.id,
      },
    }),
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.errorHandling,
        tenantId: tenant.id,
        graphId: platformGraph.id,
        type: 'PATTERN',
        layer: 'ORGANIZATIONAL',
        name: 'Error Handling Pattern',
        content: `# Error Handling Pattern

## Error Response Structure
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      { "field": "email", "issue": "Invalid format" }
    ],
    "requestId": "req-123-abc"
  }
}

## Error Codes
- VALIDATION_ERROR - Input validation failed
- NOT_FOUND - Resource doesn't exist
- UNAUTHORIZED - Missing or invalid auth
- FORBIDDEN - Insufficient permissions
- CONFLICT - State conflict (e.g., duplicate)
- INTERNAL_ERROR - Unexpected server error

## Logging
- Log all errors with request context
- Include stack traces for 500 errors
- Never expose internal details to clients`,
        freshness: 'CURRENT',
        tokenCount: 198,
        version: 1,
        createdById: marcus.id,
      },
    }),
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.dbDecision,
        tenantId: tenant.id,
        graphId: platformGraph.id,
        type: 'DECISION',
        layer: 'ORGANIZATIONAL',
        name: 'PostgreSQL as Primary Database',
        content: `# Decision: PostgreSQL as Primary Database

## Context
We need a primary database for the platform that supports:
- Complex queries with joins
- ACID transactions
- JSON data types
- Full-text search
- Horizontal read scaling

## Decision
Use PostgreSQL 15+ with the following extensions:
- pgvector for embeddings
- pg_trgm for fuzzy search
- uuid-ossp for UUID generation

## Rationale
- Mature, battle-tested RDBMS
- Excellent Prisma ORM support
- Native JSON/JSONB support
- Strong community and tooling
- Cost-effective scaling options`,
        freshness: 'CURRENT',
        tokenCount: 176,
        version: 1,
        createdById: sarah.id,
      },
    }),
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.authDecision,
        tenantId: tenant.id,
        graphId: platformGraph.id,
        type: 'DECISION',
        layer: 'ORGANIZATIONAL',
        name: 'JWT-based Authentication',
        content: `# Decision: JWT-based Authentication

## Context
Need stateless authentication for microservices that supports:
- Single sign-on across services
- Service-to-service auth
- Mobile and web clients
- Token refresh without re-login

## Decision
Implement JWT authentication with:
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (7 days)
- RS256 signing algorithm
- Standard claims (sub, iat, exp, iss)

## Implementation
- Access tokens stored in memory only
- Refresh tokens in httpOnly cookies
- Token rotation on refresh
- Blacklist for logout/revocation`,
        freshness: 'CURRENT',
        tokenCount: 156,
        version: 1,
        createdById: marcus.id,
      },
    }),
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.githubRepo,
        tenantId: tenant.id,
        graphId: platformGraph.id,
        type: 'EXTERNAL_LINK',
        layer: 'WORKSPACE',
        name: 'Platform Monorepo',
        content: 'Main platform repository with all services and packages.',
        externalUrl: 'https://github.com/acme-tech/platform',
        externalId: 'acme-tech/platform',
        freshness: 'CURRENT',
        tokenCount: 12,
        version: 1,
        createdById: emily.id,
      },
    }),
  ]);

  const productNodes = await Promise.all([
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.uiComponents,
        tenantId: tenant.id,
        graphId: productGraph.id,
        type: 'DOCUMENT',
        layer: 'WORKSPACE',
        name: 'UI Component Library',
        content: `# UI Component Library

## Design Tokens
- Colors: Use Claude brand palette (terracotta, cream)
- Typography: Inter for UI, serif for headings
- Spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48)
- Border radius: 8px default, 12px for cards

## Core Components
- Button: primary, secondary, ghost, danger variants
- Input: text, email, password, textarea
- Select: single, multi, searchable
- Card: default, interactive, elevated
- Modal: dialog, drawer, popover
- Toast: success, error, warning, info

## Accessibility
- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Focus visible outlines
- Color contrast ratio >= 4.5:1`,
        freshness: 'CURRENT',
        tokenCount: 187,
        version: 3,
        createdById: alex.id,
      },
    }),
    prisma.contextNode.create({
      data: {
        id: IDS.nodes.formPatterns,
        tenantId: tenant.id,
        graphId: productGraph.id,
        type: 'PATTERN',
        layer: 'WORKSPACE',
        name: 'Form Validation Patterns',
        content: `# Form Validation Patterns

## Client-side Validation
- Validate on blur for individual fields
- Validate on submit for the entire form
- Show inline errors below fields
- Highlight invalid fields with red border

## Error Messages
- Be specific: "Email must include @" not "Invalid"
- Be helpful: Suggest corrections when possible
- Be consistent: Same error format everywhere

## Field Requirements
- Mark required fields with asterisk (*)
- Show character counts for limited fields
- Disable submit until form is valid
- Preserve input on validation failure`,
        freshness: 'CURRENT',
        tokenCount: 143,
        version: 1,
        createdById: alex.id,
      },
    }),
  ]);

  // Create edges between nodes
  console.log('  Creating context edges...');
  await Promise.all([
    prisma.contextEdge.create({
      data: {
        tenantId: tenant.id,
        graphId: platformGraph.id,
        sourceNodeId: platformNodes[0].id,
        targetNodeId: platformNodes[1].id,
        relationshipType: 'REFERENCES',
        metadata: { reason: 'API design includes error handling standards' },
      },
    }),
    prisma.contextEdge.create({
      data: {
        tenantId: tenant.id,
        graphId: platformGraph.id,
        sourceNodeId: platformNodes[3].id,
        targetNodeId: platformNodes[0].id,
        relationshipType: 'CONSTRAINS',
        metadata: { reason: 'Auth requirements affect API design' },
      },
    }),
    prisma.contextEdge.create({
      data: {
        tenantId: tenant.id,
        graphId: productGraph.id,
        sourceNodeId: productNodes[1].id,
        targetNodeId: productNodes[0].id,
        relationshipType: 'IMPLEMENTS',
        metadata: { reason: 'Form patterns use UI components' },
      },
    }),
  ]);

  // ============================================================================
  // SLICES
  // ============================================================================
  console.log('  Creating slices...');
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const slices = await Promise.all([
    prisma.slice.create({
      data: {
        id: IDS.slices.auth,
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        shortId: 'PL-001',
        name: 'Implement User Authentication Flow',
        outcome:
          'Users can securely sign up, log in, and manage their sessions with JWT tokens and refresh token rotation.',
        antiScope: ['Social login (OAuth)', 'Multi-factor authentication', 'Password recovery'],
        status: 'COMPLETED',
        ownerId: marcus.id,
        createdById: sarah.id,
        startedAt: oneWeekAgo,
        submittedAt: threeDaysAgo,
        completedAt: yesterday,
        version: 4,
      },
    }),
    prisma.slice.create({
      data: {
        id: IDS.slices.rateLimit,
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        shortId: 'PL-002',
        name: 'API Rate Limiting',
        outcome:
          'All API endpoints enforce per-client rate limits with configurable thresholds and graceful degradation.',
        antiScope: ['DDoS protection', 'Geographic rate rules'],
        status: 'ACTIVE',
        ownerId: emily.id,
        createdById: marcus.id,
        startedAt: threeDaysAgo,
        version: 2,
      },
    }),
    prisma.slice.create({
      data: {
        id: IDS.slices.search,
        tenantId: tenant.id,
        workspaceId: productWs.id,
        shortId: 'PR-001',
        name: 'Global Search Feature',
        outcome:
          'Users can search across all content types with instant results, filters, and keyboard navigation.',
        antiScope: ['Voice search', 'Search analytics dashboard'],
        status: 'IN_REVIEW',
        ownerId: alex.id,
        createdById: sarah.id,
        startedAt: oneWeekAgo,
        submittedAt: yesterday,
        version: 3,
      },
    }),
    prisma.slice.create({
      data: {
        id: IDS.slices.dashboard,
        tenantId: tenant.id,
        workspaceId: productWs.id,
        shortId: 'PR-002',
        name: 'Analytics Dashboard Redesign',
        outcome:
          'The analytics dashboard displays key metrics with interactive charts, date filtering, and export capabilities.',
        antiScope: ['Real-time streaming updates', 'Custom report builder'],
        status: 'PENDING',
        ownerId: alex.id,
        createdById: sarah.id,
        version: 1,
      },
    }),
  ]);

  const [authSlice, rateSlice, searchSlice, dashboardSlice] = slices;

  // Add constraints
  console.log('  Creating slice constraints...');
  await Promise.all([
    prisma.sliceConstraint.create({
      data: {
        sliceId: authSlice.id,
        content: 'Must use bcrypt for password hashing with cost factor 12',
        orderIndex: 0,
      },
    }),
    prisma.sliceConstraint.create({
      data: { sliceId: authSlice.id, content: 'Access tokens expire after 1 hour', orderIndex: 1 },
    }),
    prisma.sliceConstraint.create({
      data: { sliceId: rateSlice.id, content: 'Use Redis for rate limit counters', orderIndex: 0 },
    }),
    prisma.sliceConstraint.create({
      data: {
        sliceId: rateSlice.id,
        content: 'Default limit: 100 requests per minute',
        orderIndex: 1,
      },
    }),
    prisma.sliceConstraint.create({
      data: {
        sliceId: searchSlice.id,
        content: 'Search results must appear within 200ms',
        orderIndex: 0,
      },
    }),
  ]);

  // Add acceptance criteria
  console.log('  Creating acceptance criteria...');
  await Promise.all([
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: authSlice.id,
        content: 'Users can register with email and password',
        isCompleted: true,
        completedAt: threeDaysAgo,
        orderIndex: 0,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: authSlice.id,
        content: 'Users can log in and receive JWT tokens',
        isCompleted: true,
        completedAt: threeDaysAgo,
        orderIndex: 1,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: authSlice.id,
        content: 'Tokens refresh automatically before expiry',
        isCompleted: true,
        completedAt: threeDaysAgo,
        orderIndex: 2,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: rateSlice.id,
        content: 'Rate limits are enforced per API key',
        isCompleted: true,
        completedAt: yesterday,
        orderIndex: 0,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: rateSlice.id,
        content: 'Exceeded limits return 429 with retry-after header',
        isCompleted: false,
        orderIndex: 1,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: rateSlice.id,
        content: 'Rate limit headers included in all responses',
        isCompleted: false,
        orderIndex: 2,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: searchSlice.id,
        content: 'Search indexes all content types',
        isCompleted: true,
        completedAt: yesterday,
        orderIndex: 0,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: searchSlice.id,
        content: 'Results show with highlighted matches',
        isCompleted: true,
        completedAt: yesterday,
        orderIndex: 1,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: searchSlice.id,
        content: 'Keyboard navigation works (up/down/enter)',
        isCompleted: true,
        completedAt: yesterday,
        orderIndex: 2,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: dashboardSlice.id,
        content: 'Dashboard shows session count chart',
        isCompleted: false,
        orderIndex: 0,
      },
    }),
    prisma.acceptanceCriterion.create({
      data: {
        sliceId: dashboardSlice.id,
        content: 'Date range picker filters all metrics',
        isCompleted: false,
        orderIndex: 1,
      },
    }),
  ]);

  // Add slice context
  await Promise.all([
    prisma.sliceContext.create({
      data: { sliceId: authSlice.id, nodeId: platformNodes[3].id, isPinned: true },
    }),
    prisma.sliceContext.create({
      data: { sliceId: authSlice.id, nodeId: platformNodes[0].id, isPinned: false },
    }),
    prisma.sliceContext.create({
      data: { sliceId: rateSlice.id, nodeId: platformNodes[0].id, isPinned: true },
    }),
    prisma.sliceContext.create({
      data: { sliceId: searchSlice.id, nodeId: productNodes[0].id, isPinned: true },
    }),
  ]);

  // Add transitions
  console.log('  Creating slice transitions...');
  await Promise.all([
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: authSlice.id,
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        event: 'start',
        actorId: marcus.id,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: authSlice.id,
        fromStatus: 'ACTIVE',
        toStatus: 'IN_REVIEW',
        event: 'submit',
        actorId: marcus.id,
        createdAt: threeDaysAgo,
      },
    }),
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: authSlice.id,
        fromStatus: 'IN_REVIEW',
        toStatus: 'COMPLETED',
        event: 'approve',
        actorId: sarah.id,
        comment: 'Great implementation!',
        createdAt: yesterday,
      },
    }),
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: rateSlice.id,
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        event: 'start',
        actorId: emily.id,
        createdAt: threeDaysAgo,
      },
    }),
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: searchSlice.id,
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        event: 'start',
        actorId: alex.id,
        createdAt: oneWeekAgo,
      },
    }),
    prisma.sliceTransition.create({
      data: {
        tenantId: tenant.id,
        sliceId: searchSlice.id,
        fromStatus: 'ACTIVE',
        toStatus: 'IN_REVIEW',
        event: 'submit',
        actorId: alex.id,
        createdAt: yesterday,
      },
    }),
  ]);

  // Add review
  await prisma.sliceReview.create({
    data: {
      sliceId: authSlice.id,
      reviewerId: sarah.id,
      verdict: 'APPROVED',
      comment: 'Solid implementation following our auth patterns.',
      createdAt: yesterday,
    },
  });

  // ============================================================================
  // AI SESSIONS & FEEDBACK
  // ============================================================================
  console.log('  Creating AI sessions and feedback...');
  const sessions = await Promise.all([
    prisma.aISession.create({
      data: {
        id: IDS.sessions.s1,
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        sliceId: authSlice.id,
        userId: marcus.id,
        contextNodeIds: [platformNodes[0].id, platformNodes[3].id],
        contextTokenCount: 421,
        contextCompiledAt: oneWeekAgo,
        startedAt: oneWeekAgo,
        endedAt: new Date(oneWeekAgo.getTime() + 45 * 60 * 1000),
        queryHash: 'hash-auth-impl-001',
      },
    }),
    prisma.aISession.create({
      data: {
        id: IDS.sessions.s2,
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        sliceId: rateSlice.id,
        userId: emily.id,
        contextNodeIds: [platformNodes[0].id],
        contextTokenCount: 245,
        contextCompiledAt: threeDaysAgo,
        startedAt: threeDaysAgo,
        endedAt: new Date(threeDaysAgo.getTime() + 30 * 60 * 1000),
        queryHash: 'hash-rate-limit-001',
      },
    }),
    prisma.aISession.create({
      data: {
        id: IDS.sessions.s3,
        tenantId: tenant.id,
        workspaceId: productWs.id,
        sliceId: searchSlice.id,
        userId: alex.id,
        contextNodeIds: [productNodes[0].id, productNodes[1].id],
        contextTokenCount: 330,
        contextCompiledAt: yesterday,
        startedAt: yesterday,
        endedAt: new Date(yesterday.getTime() + 60 * 60 * 1000),
        queryHash: 'hash-search-001',
      },
    }),
    prisma.aISession.create({
      data: {
        id: IDS.sessions.s4,
        tenantId: tenant.id,
        workspaceId: productWs.id,
        userId: alex.id,
        contextNodeIds: [productNodes[0].id],
        contextTokenCount: 187,
        contextCompiledAt: now,
        startedAt: now,
        queryHash: 'hash-dashboard-001',
      },
    }),
  ]);

  // Add feedback
  await Promise.all([
    prisma.sessionFeedback.create({
      data: {
        tenantId: tenant.id,
        sessionId: sessions[0].id,
        rating: 'POSITIVE',
        errorCategories: [],
        accuracyScore: 92,
        completenessScore: 88,
        styleMatchScore: 95,
        reviewVerdict: 'APPROVED',
        editDistance: 8,
        outputIssues: [],
        submittedById: marcus.id,
        submittedAt: oneWeekAgo,
      },
    }),
    prisma.sessionFeedback.create({
      data: {
        tenantId: tenant.id,
        sessionId: sessions[1].id,
        rating: 'NEGATIVE',
        errorCategories: ['missing_context', 'incorrect_pattern'],
        missingContext: 'Missing Redis configuration patterns',
        comment: 'The generated code did not follow our caching patterns.',
        accuracyScore: 45,
        completenessScore: 60,
        styleMatchScore: 70,
        reviewVerdict: 'CHANGES_REQUESTED',
        editDistance: 45,
        outputIssues: ['incorrect_imports', 'missing_error_handling'],
        submittedById: emily.id,
        submittedAt: threeDaysAgo,
      },
    }),
    prisma.sessionFeedback.create({
      data: {
        tenantId: tenant.id,
        sessionId: sessions[2].id,
        rating: 'POSITIVE',
        errorCategories: [],
        accuracyScore: 85,
        completenessScore: 90,
        styleMatchScore: 88,
        reviewVerdict: 'APPROVED',
        editDistance: 12,
        outputIssues: [],
        submittedById: alex.id,
        submittedAt: yesterday,
      },
    }),
  ]);

  // ============================================================================
  // FEEDBACK METRICS
  // ============================================================================
  console.log('  Creating feedback metrics...');
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  await Promise.all([
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(7),
        totalSessions: 12,
        positiveRatings: 9,
        negativeRatings: 2,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.75,
        averageEditDistance: 18.5,
        errorCategoryCounts: { missing_context: 2, outdated_info: 1 },
        avgAccuracyScore: 82,
        avgCompletenessScore: 78,
        avgStyleMatchScore: 85,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(6),
        totalSessions: 8,
        positiveRatings: 6,
        negativeRatings: 1,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.8,
        averageEditDistance: 15.2,
        errorCategoryCounts: { missing_context: 1 },
        avgAccuracyScore: 85,
        avgCompletenessScore: 82,
        avgStyleMatchScore: 88,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(5),
        totalSessions: 15,
        positiveRatings: 12,
        negativeRatings: 2,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.82,
        averageEditDistance: 12.8,
        errorCategoryCounts: { incorrect_pattern: 1, missing_context: 1 },
        avgAccuracyScore: 87,
        avgCompletenessScore: 84,
        avgStyleMatchScore: 90,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(4),
        totalSessions: 10,
        positiveRatings: 8,
        negativeRatings: 1,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.85,
        averageEditDistance: 10.5,
        errorCategoryCounts: {},
        avgAccuracyScore: 89,
        avgCompletenessScore: 86,
        avgStyleMatchScore: 91,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(3),
        totalSessions: 14,
        positiveRatings: 11,
        negativeRatings: 2,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.78,
        averageEditDistance: 14.2,
        errorCategoryCounts: { missing_context: 2 },
        avgAccuracyScore: 84,
        avgCompletenessScore: 80,
        avgStyleMatchScore: 87,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(2),
        totalSessions: 11,
        positiveRatings: 9,
        negativeRatings: 1,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.88,
        averageEditDistance: 9.8,
        errorCategoryCounts: { outdated_info: 1 },
        avgAccuracyScore: 90,
        avgCompletenessScore: 88,
        avgStyleMatchScore: 92,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: platformWs.id,
        date: daysAgo(1),
        totalSessions: 9,
        positiveRatings: 7,
        negativeRatings: 1,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.85,
        averageEditDistance: 11.2,
        errorCategoryCounts: {},
        avgAccuracyScore: 88,
        avgCompletenessScore: 85,
        avgStyleMatchScore: 90,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: productWs.id,
        date: daysAgo(3),
        totalSessions: 6,
        positiveRatings: 5,
        negativeRatings: 0,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.92,
        averageEditDistance: 8.5,
        errorCategoryCounts: {},
        avgAccuracyScore: 91,
        avgCompletenessScore: 89,
        avgStyleMatchScore: 93,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: productWs.id,
        date: daysAgo(2),
        totalSessions: 8,
        positiveRatings: 6,
        negativeRatings: 1,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.85,
        averageEditDistance: 10.2,
        errorCategoryCounts: { missing_context: 1 },
        avgAccuracyScore: 87,
        avgCompletenessScore: 85,
        avgStyleMatchScore: 90,
      },
    }),
    prisma.feedbackMetrics.create({
      data: {
        tenantId: tenant.id,
        workspaceId: productWs.id,
        date: daysAgo(1),
        totalSessions: 5,
        positiveRatings: 4,
        negativeRatings: 0,
        skippedRatings: 1,
        firstPassAcceptanceRate: 0.9,
        averageEditDistance: 7.8,
        errorCategoryCounts: {},
        avgAccuracyScore: 92,
        avgCompletenessScore: 90,
        avgStyleMatchScore: 94,
      },
    }),
  ]);

  // ============================================================================
  // LIVING SOFTWARE PLATFORM DATA
  // ============================================================================
  console.log('  Creating Living Software Platform data...');

  // Clean existing Living Software Platform data
  await prisma.artifactOutcome.deleteMany().catch(() => {});
  await prisma.artifactLink.deleteMany().catch(() => {});
  await prisma.artifactVersion.deleteMany().catch(() => {});
  await prisma.artifact.deleteMany().catch(() => {});
  await prisma.intentContext.deleteMany().catch(() => {});
  await prisma.intentBehavior.deleteMany().catch(() => {});
  await prisma.intentEntity.deleteMany().catch(() => {});
  await prisma.intentConstraint.deleteMany().catch(() => {});
  await prisma.intentGoal.deleteMany().catch(() => {});
  await prisma.intentGraph.deleteMany().catch(() => {});
  await prisma.assemblyCache.deleteMany().catch(() => {});
  await prisma.projectDecision.deleteMany().catch(() => {});
  await prisma.projectConstraint.deleteMany().catch(() => {});
  await prisma.projectGoal.deleteMany().catch(() => {});
  await prisma.project.deleteMany().catch(() => {});
  await prisma.identityAttribute.deleteMany().catch(() => {});
  await prisma.userContext.deleteMany().catch(() => {});

  // Create UserContext for demo user
  const userContext = await prisma.userContext.create({
    data: {
      id: IDS.userContext,
      tenantId: tenant.id,
      userId: sarah.id,
      settings: {
        memoryEnabled: true,
        observationLevel: 2,
        retentionDays: 90,
        excludedTopics: [],
      },
    },
  });

  // Create comprehensive Identity Attributes
  await Promise.all([
    // Expertise attributes
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'expertise.primary_language',
        value: 'TypeScript',
        valueType: 'string',
        confidence: 0.95,
        source: 'explicit',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'expertise.secondary_languages',
        value: ['Python', 'Go', 'Rust'],
        valueType: 'array',
        confidence: 0.8,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'expertise.frameworks',
        value: ['React', 'NestJS', 'Prisma', 'Next.js', 'TailwindCSS'],
        valueType: 'array',
        confidence: 0.9,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'expertise.domains',
        value: ['Full-stack web development', 'API design', 'Database modeling'],
        valueType: 'array',
        confidence: 0.85,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'expertise.years_experience',
        value: 8,
        valueType: 'number',
        confidence: 0.7,
        source: 'inferred',
      },
    }),
    // Preferences
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'pref.code_style',
        value: 'functional',
        valueType: 'string',
        confidence: 0.85,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'pref.test_framework',
        value: 'vitest',
        valueType: 'string',
        confidence: 0.8,
        source: 'explicit',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'pref.error_handling',
        value: 'Result types over exceptions',
        valueType: 'string',
        confidence: 0.75,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'pref.naming_convention',
        value: { variables: 'camelCase', components: 'PascalCase', constants: 'SCREAMING_SNAKE_CASE' },
        valueType: 'object',
        confidence: 0.9,
        source: 'explicit',
      },
    }),
    // Communication preferences
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'comm.response_style',
        value: 'concise',
        valueType: 'string',
        confidence: 0.75,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'comm.code_comments',
        value: 'minimal - only for complex logic',
        valueType: 'string',
        confidence: 0.8,
        source: 'inferred',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'comm.explanation_depth',
        value: 'expert',
        valueType: 'string',
        confidence: 0.85,
        source: 'inferred',
      },
    }),
    // Work context
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'work.current_project',
        value: 'Living Software Platform',
        valueType: 'string',
        confidence: 1.0,
        source: 'explicit',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'work.team_size',
        value: 4,
        valueType: 'number',
        confidence: 0.9,
        source: 'explicit',
      },
    }),
    prisma.identityAttribute.create({
      data: {
        contextId: userContext.id,
        key: 'work.role',
        value: 'Tech Lead',
        valueType: 'string',
        confidence: 0.95,
        source: 'explicit',
      },
    }),
  ]);

  // Create Project
  const project = await prisma.project.create({
    data: {
      id: IDS.project,
      tenantId: tenant.id,
      name: 'Living Software Platform Demo',
      description: 'A demonstration of the Living Software Platform paradigm - intent-driven development with persistent context',
      status: 'ACTIVE',
      context: {
        connect: { id: userContext.id },
      },
    },
  });

  // Create hierarchical Project Goals
  const mainGoal = await prisma.projectGoal.create({
    data: {
      projectId: project.id,
      description: 'Build a working demo of intent-driven development',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      successCriteria: ['Intent capture working', 'Artifact generation functional', 'Session continuity demonstrated'],
    },
  });

  const identityGoal = await prisma.projectGoal.create({
    data: {
      projectId: project.id,
      parentGoalId: mainGoal.id,
      description: 'Implement identity graph with confidence scoring',
      priority: 'HIGH',
      status: 'ACHIEVED',
      successCriteria: ['Attributes stored', 'Confidence tracked', 'Context assembly uses identity'],
    },
  });

  const intentGoal = await prisma.projectGoal.create({
    data: {
      projectId: project.id,
      parentGoalId: mainGoal.id,
      description: 'Create intent graph visualization',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      successCriteria: ['Goals visible', 'Constraints displayed', 'Entities browsable'],
    },
  });

  await Promise.all([
    prisma.projectGoal.create({
      data: {
        projectId: project.id,
        parentGoalId: identityGoal.id,
        description: 'Support multiple identity attribute types',
        priority: 'MEDIUM',
        status: 'ACHIEVED',
        successCriteria: ['String values', 'Array values', 'Object values', 'Number values'],
      },
    }),
    prisma.projectGoal.create({
      data: {
        projectId: project.id,
        parentGoalId: intentGoal.id,
        description: 'Render intent graph as interactive diagram',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        successCriteria: ['Nodes draggable', 'Edges visible', 'Zoom and pan'],
      },
    }),
    prisma.projectGoal.create({
      data: {
        projectId: project.id,
        parentGoalId: mainGoal.id,
        description: 'Implement artifact synthesis from intent',
        priority: 'HIGH',
        status: 'PROPOSED',
        successCriteria: ['Generate code from intent', 'Track provenance', 'Support regeneration'],
      },
    }),
  ]);

  // Create comprehensive Project Constraints
  await Promise.all([
    prisma.projectConstraint.create({
      data: {
        projectId: project.id,
        category: 'TECHNICAL',
        description: 'Must work without Docker for easy development setup',
        severity: 'SHOULD',
      },
    }),
    prisma.projectConstraint.create({
      data: {
        projectId: project.id,
        category: 'TECHNICAL',
        description: 'All API endpoints must respond within 500ms',
        severity: 'MUST',
      },
    }),
    prisma.projectConstraint.create({
      data: {
        projectId: project.id,
        category: 'BUSINESS',
        description: 'Demo must be visually impressive for stakeholder presentations',
        severity: 'MUST',
      },
    }),
    prisma.projectConstraint.create({
      data: {
        projectId: project.id,
        category: 'COMPLIANCE',
        description: 'No personally identifiable information in demo data',
        severity: 'MUST',
      },
    }),
    prisma.projectConstraint.create({
      data: {
        projectId: project.id,
        category: 'USABILITY',
        description: 'Code should be self-documenting, minimize comments',
        severity: 'SHOULD',
      },
    }),
  ]);

  // Create multiple Project Decisions
  await Promise.all([
    prisma.projectDecision.create({
      data: {
        projectId: project.id,
        description: 'Use in-memory cache as Redis fallback for development',
        rationale: 'Simplifies local development setup without requiring Docker. Implemented InMemoryRedis class with Map-based storage.',
        alternativesConsidered: ['Require Docker', 'Use file-based cache', 'Skip caching entirely'],
      },
    }),
    prisma.projectDecision.create({
      data: {
        projectId: project.id,
        description: 'Use pgvector for semantic search embeddings',
        rationale: 'Native PostgreSQL extension means no additional infrastructure. Good performance for our scale. Easy to query with SQL.',
        alternativesConsidered: ['Pinecone', 'Weaviate', 'Elasticsearch with dense vectors'],
      },
    }),
    prisma.projectDecision.create({
      data: {
        projectId: project.id,
        description: 'Monorepo with pnpm workspaces',
        rationale: 'Enables code sharing between packages. Better TypeScript experience with project references. Efficient disk usage.',
        alternativesConsidered: ['Separate repositories', 'npm workspaces', 'Turborepo'],
      },
    }),
  ]);

  // ============================================================================
  // INTENT GRAPH 1: SaaS Dashboard Feature (Expanded)
  // ============================================================================
  console.log('  Creating Intent Graph 1: SaaS Dashboard...');

  const dashboardGraph = await prisma.intentGraph.create({
    data: {
      id: IDS.intentGraphs.dashboard,
      tenantId: tenant.id,
      createdById: sarah.id,
      projectId: project.id,
      name: 'SaaS Dashboard Feature',
      description: 'Intent graph for building a SaaS analytics dashboard with real-time metrics, date filtering, and export capabilities',
      status: 'ACTIVE',
      version: 3,
      metadata: {
        estimatedComplexity: 'medium',
        targetDelivery: '2026-02-15',
        tags: ['frontend', 'analytics', 'dashboard'],
      },
    },
  });

  // Dashboard Intent Goals (hierarchical)
  const dashboardMainGoal = await prisma.intentGoal.create({
    data: {
      intentGraphId: dashboardGraph.id,
      description: 'Provide comprehensive analytics dashboard for SaaS metrics',
      priority: 'CRITICAL',
      successCriteria: ['All key metrics visible', 'Interactive filtering', 'Export functionality', 'Mobile responsive'],
    },
  });

  const metricsGoal = await prisma.intentGoal.create({
    data: {
      intentGraphId: dashboardGraph.id,
      parentGoalId: dashboardMainGoal.id,
      description: 'Display key business metrics at a glance',
      priority: 'CRITICAL',
      successCriteria: ['Shows MRR/ARR', 'Shows active users', 'Shows churn rate', 'Shows customer lifetime value'],
    },
  });

  const filteringGoal = await prisma.intentGoal.create({
    data: {
      intentGraphId: dashboardGraph.id,
      parentGoalId: dashboardMainGoal.id,
      description: 'Enable date range filtering',
      priority: 'HIGH',
      successCriteria: ['Preset ranges available', 'Custom range picker', 'Filters apply to all charts'],
    },
  });

  await Promise.all([
    prisma.intentGoal.create({
      data: {
        intentGraphId: dashboardGraph.id,
        parentGoalId: metricsGoal.id,
        description: 'Show trend indicators for each metric',
        priority: 'HIGH',
        successCriteria: ['Percentage change shown', 'Color-coded (green/red)', 'Comparison period configurable'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: dashboardGraph.id,
        parentGoalId: filteringGoal.id,
        description: 'Support comparison mode between periods',
        priority: 'MEDIUM',
        successCriteria: ['Compare to previous period', 'Compare to same period last year', 'Overlay on charts'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: dashboardGraph.id,
        parentGoalId: dashboardMainGoal.id,
        description: 'Enable data export to CSV and PDF',
        priority: 'MEDIUM',
        successCriteria: ['Export visible metrics', 'Include charts in PDF', 'Scheduled exports'],
      },
    }),
  ]);

  // Dashboard Intent Constraints
  await Promise.all([
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'PERFORMANCE',
        description: 'Dashboard must load within 2 seconds on 3G connection',
        severity: 'MUST',
        verificationMethod: 'Performance testing with Lighthouse - target: LCP < 2s, FID < 100ms',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'PERFORMANCE',
        description: 'Charts must update within 500ms when filters change',
        severity: 'SHOULD',
        verificationMethod: 'User timing API measurements in production',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'USABILITY',
        description: 'All charts must have text alternatives for WCAG 2.1 AA compliance',
        severity: 'MUST',
        verificationMethod: 'Accessibility audit with axe-core',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'USABILITY',
        description: 'Dashboard must be usable on screens 768px and wider',
        severity: 'MUST',
        verificationMethod: 'Responsive testing on tablet and desktop viewports',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'SECURITY',
        description: 'Metrics data must be filtered by tenant and user permissions',
        severity: 'MUST',
        verificationMethod: 'Integration tests verifying data isolation',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'FUNCTIONAL',
        description: 'Displayed numbers must match source data with 100% accuracy',
        severity: 'MUST',
        verificationMethod: 'Automated reconciliation tests against database',
      },
    }),
  ]);

  // Dashboard Intent Entities
  const metricCardEntity = await prisma.intentEntity.create({
    data: {
      intentGraphId: dashboardGraph.id,
      name: 'MetricCard',
      description: 'A card component displaying a single metric with trend indicator, sparkline, and comparison',
      attributes: [
        { name: 'title', type: 'string', required: true, description: 'Display label for the metric' },
        { name: 'value', type: 'number', required: true, description: 'Current value of the metric' },
        { name: 'previousValue', type: 'number', required: false, description: 'Value from comparison period' },
        { name: 'trend', type: 'number', required: false, description: 'Percentage change from previous period' },
        { name: 'format', type: 'enum', required: true, values: ['currency', 'percentage', 'number', 'compact'], description: 'How to format the displayed value' },
        { name: 'sparklineData', type: 'array', required: false, description: 'Data points for mini trend chart' },
        { name: 'isLoading', type: 'boolean', required: false, defaultValue: false },
      ],
      relationships: [],
      stateMachine: {
        states: ['idle', 'loading', 'error', 'success'],
        transitions: [
          { from: 'idle', to: 'loading', event: 'FETCH_START' },
          { from: 'loading', to: 'success', event: 'FETCH_SUCCESS' },
          { from: 'loading', to: 'error', event: 'FETCH_ERROR' },
          { from: 'error', to: 'loading', event: 'RETRY' },
          { from: 'success', to: 'loading', event: 'REFRESH' },
        ],
      },
    },
  });

  const datePickerEntity = await prisma.intentEntity.create({
    data: {
      intentGraphId: dashboardGraph.id,
      name: 'DateRangePicker',
      description: 'A component for selecting date ranges with presets and custom selection',
      attributes: [
        { name: 'startDate', type: 'Date', required: true },
        { name: 'endDate', type: 'Date', required: true },
        { name: 'presets', type: 'array', required: false, defaultValue: ['Today', 'Last 7 days', 'Last 30 days', 'This month', 'Last month', 'This year'] },
        { name: 'maxRange', type: 'number', required: false, description: 'Maximum days allowed in selection' },
        { name: 'minDate', type: 'Date', required: false },
        { name: 'maxDate', type: 'Date', required: false },
        { name: 'comparisonEnabled', type: 'boolean', required: false, defaultValue: false },
        { name: 'comparisonType', type: 'enum', values: ['previous_period', 'previous_year', 'custom'], required: false },
      ],
      relationships: [],
    },
  });

  await Promise.all([
    prisma.intentEntity.create({
      data: {
        intentGraphId: dashboardGraph.id,
        name: 'MetricsChart',
        description: 'A chart component for visualizing metric trends over time',
        attributes: [
          { name: 'type', type: 'enum', values: ['line', 'bar', 'area', 'combo'], required: true },
          { name: 'data', type: 'array', required: true, description: 'Array of data points with date and value' },
          { name: 'comparisonData', type: 'array', required: false, description: 'Data for comparison period overlay' },
          { name: 'xAxis', type: 'object', required: true, description: 'X-axis configuration' },
          { name: 'yAxis', type: 'object', required: true, description: 'Y-axis configuration' },
          { name: 'legend', type: 'boolean', required: false, defaultValue: true },
          { name: 'tooltip', type: 'boolean', required: false, defaultValue: true },
        ],
        relationships: [
          { targetEntity: 'DateRangePicker', type: 'uses', description: 'Controlled by date range selection' },
        ],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: dashboardGraph.id,
        name: 'DashboardLayout',
        description: 'The main layout container for the analytics dashboard',
        attributes: [
          { name: 'title', type: 'string', required: true },
          { name: 'sections', type: 'array', required: true, description: 'Array of dashboard sections' },
          { name: 'isCollapsible', type: 'boolean', required: false, defaultValue: true },
        ],
        relationships: [
          { targetEntity: 'MetricCard', type: 'contains', cardinality: 'many' },
          { targetEntity: 'MetricsChart', type: 'contains', cardinality: 'many' },
          { targetEntity: 'DateRangePicker', type: 'contains', cardinality: 'one' },
        ],
      },
    }),
  ]);

  // Dashboard Intent Behaviors
  await Promise.all([
    prisma.intentBehavior.create({
      data: {
        intentGraphId: dashboardGraph.id,
        name: 'Load Dashboard Data',
        description: 'Fetches all metrics data when dashboard loads or date range changes',
        trigger: { type: 'lifecycle', event: 'mount', condition: 'dateRange changes' },
        steps: [
          { order: 1, description: 'Validate date range is within allowed bounds', action: 'validate' },
          { order: 2, description: 'Show loading state on all metric cards', action: 'setLoading', target: 'MetricCard' },
          { order: 3, description: 'Fetch metrics from API in parallel', action: 'fetchParallel', endpoints: ['/api/metrics/mrr', '/api/metrics/users', '/api/metrics/churn'] },
          { order: 4, description: 'Transform API response to chart format', action: 'transform' },
          { order: 5, description: 'Update chart state with new data', action: 'setState' },
          { order: 6, description: 'Hide loading state', action: 'clearLoading' },
        ],
        errorHandlers: {
          action: 'showError',
          retryable: true,
          maxRetries: 3,
          retryDelay: 1000,
        },
      },
    }),
    prisma.intentBehavior.create({
      data: {
        intentGraphId: dashboardGraph.id,
        name: 'Export Dashboard Data',
        description: 'Exports current dashboard view to CSV or PDF',
        trigger: { type: 'user_action', event: 'click', target: 'export_button' },
        steps: [
          { order: 1, description: 'Determine export format from selection', action: 'getExportFormat' },
          { order: 2, description: 'Gather all visible metrics data', action: 'collectData' },
          { order: 3, description: 'Format data according to export type', action: 'formatExport' },
          { order: 4, description: 'Generate file and trigger download', action: 'download' },
          { order: 5, description: 'Show success toast', action: 'notify', message: 'Export complete' },
        ],
      },
    }),
    prisma.intentBehavior.create({
      data: {
        intentGraphId: dashboardGraph.id,
        name: 'Toggle Comparison Mode',
        description: 'Enables or disables comparison overlay on charts',
        trigger: { type: 'user_action', event: 'toggle', target: 'comparison_switch' },
        steps: [
          { order: 1, description: 'Update comparison state', action: 'setState', key: 'comparisonEnabled' },
          { order: 2, description: 'Fetch comparison period data if enabling', action: 'conditionalFetch' },
          { order: 3, description: 'Update chart overlays', action: 'updateCharts' },
        ],
      },
    }),
  ]);

  // Dashboard Intent Contexts
  await Promise.all([
    prisma.intentContext.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'TECHNICAL',
        description: 'Using React with TanStack Query for data fetching. Charts rendered with Recharts library. State managed with Zustand.',
      },
    }),
    prisma.intentContext.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'BUSINESS',
        description: 'Dashboard serves SaaS companies tracking subscription metrics. Primary users are executives and product managers reviewing KPIs.',
      },
    }),
    prisma.intentContext.create({
      data: {
        intentGraphId: dashboardGraph.id,
        category: 'HISTORICAL',
        description: 'Previous dashboard implementation used Chart.js but was replaced due to accessibility issues. Team prefers Recharts for better React integration.',
      },
    }),
  ]);

  // ============================================================================
  // INTENT GRAPH 2: API Integration Service
  // ============================================================================
  console.log('  Creating Intent Graph 2: API Integration Service...');

  const apiGraph = await prisma.intentGraph.create({
    data: {
      id: IDS.intentGraphs.api,
      tenantId: tenant.id,
      createdById: marcus.id,
      projectId: project.id,
      name: 'API Integration Service',
      description: 'Intent graph for building a third-party API integration layer with retry logic, rate limiting, and circuit breaker patterns',
      status: 'ACTIVE',
      version: 2,
      metadata: {
        estimatedComplexity: 'high',
        tags: ['backend', 'api', 'integration', 'resilience'],
      },
    },
  });

  // API Intent Goals
  const apiMainGoal = await prisma.intentGoal.create({
    data: {
      intentGraphId: apiGraph.id,
      description: 'Create robust API integration layer for third-party services',
      priority: 'CRITICAL',
      successCriteria: ['Supports multiple providers', 'Handles failures gracefully', 'Provides unified interface'],
    },
  });

  await Promise.all([
    prisma.intentGoal.create({
      data: {
        intentGraphId: apiGraph.id,
        parentGoalId: apiMainGoal.id,
        description: 'Implement automatic retry with exponential backoff',
        priority: 'HIGH',
        successCriteria: ['Configurable retry count', 'Exponential delay', 'Jitter to prevent thundering herd'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: apiGraph.id,
        parentGoalId: apiMainGoal.id,
        description: 'Add circuit breaker to prevent cascade failures',
        priority: 'HIGH',
        successCriteria: ['Opens after threshold failures', 'Half-open state for testing', 'Configurable reset timeout'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: apiGraph.id,
        parentGoalId: apiMainGoal.id,
        description: 'Respect third-party rate limits',
        priority: 'CRITICAL',
        successCriteria: ['Parse rate limit headers', 'Queue requests when limited', 'Fair distribution across clients'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: apiGraph.id,
        parentGoalId: apiMainGoal.id,
        description: 'Provide request/response logging',
        priority: 'MEDIUM',
        successCriteria: ['Log request metadata', 'Redact sensitive data', 'Structured log format'],
      },
    }),
  ]);

  // API Intent Constraints
  await Promise.all([
    prisma.intentConstraint.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'PERFORMANCE',
        description: 'P99 latency overhead must be under 50ms',
        severity: 'MUST',
        verificationMethod: 'Load testing with k6, measure proxy overhead vs direct calls',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'SCALABILITY',
        description: 'Must handle 10,000 concurrent connections',
        severity: 'MUST',
        verificationMethod: 'Load test with 10k concurrent users, monitor memory and CPU',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'SECURITY',
        description: 'API keys must never appear in logs',
        severity: 'MUST',
        verificationMethod: 'Automated log scanning in CI, manual audit quarterly',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'TECHNICAL',
        description: 'New provider integration should take less than 4 hours',
        severity: 'SHOULD',
        verificationMethod: 'Time tracking on provider additions',
      },
    }),
  ]);

  // API Intent Entities
  await Promise.all([
    prisma.intentEntity.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'ApiClient',
        description: 'Base class for API integrations with retry, circuit breaker, and rate limiting',
        attributes: [
          { name: 'baseUrl', type: 'string', required: true },
          { name: 'apiKey', type: 'string', required: true, sensitive: true },
          { name: 'timeout', type: 'number', required: false, defaultValue: 30000 },
          { name: 'retryConfig', type: 'RetryConfig', required: false },
          { name: 'circuitBreakerConfig', type: 'CircuitBreakerConfig', required: false },
        ],
        relationships: [
          { targetEntity: 'RetryPolicy', type: 'uses' },
          { targetEntity: 'CircuitBreaker', type: 'uses' },
          { targetEntity: 'RateLimiter', type: 'uses' },
        ],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'RetryPolicy',
        description: 'Configuration for automatic request retry behavior',
        attributes: [
          { name: 'maxAttempts', type: 'number', required: true, defaultValue: 3 },
          { name: 'baseDelay', type: 'number', required: true, defaultValue: 1000, description: 'Initial delay in ms' },
          { name: 'maxDelay', type: 'number', required: false, defaultValue: 30000 },
          { name: 'jitter', type: 'boolean', required: false, defaultValue: true },
          { name: 'retryableStatuses', type: 'array', required: false, defaultValue: [429, 500, 502, 503, 504] },
        ],
        relationships: [],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'CircuitBreaker',
        description: 'Circuit breaker for preventing cascade failures',
        attributes: [
          { name: 'failureThreshold', type: 'number', required: true, defaultValue: 5 },
          { name: 'successThreshold', type: 'number', required: true, defaultValue: 2 },
          { name: 'timeout', type: 'number', required: true, defaultValue: 60000, description: 'Time before trying half-open' },
          { name: 'state', type: 'enum', values: ['closed', 'open', 'half-open'], required: true },
        ],
        relationships: [],
        stateMachine: {
          states: ['closed', 'open', 'half-open'],
          transitions: [
            { from: 'closed', to: 'open', event: 'FAILURE_THRESHOLD_REACHED' },
            { from: 'open', to: 'half-open', event: 'TIMEOUT_ELAPSED' },
            { from: 'half-open', to: 'closed', event: 'SUCCESS_THRESHOLD_REACHED' },
            { from: 'half-open', to: 'open', event: 'FAILURE' },
          ],
        },
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'RateLimiter',
        description: 'Token bucket rate limiter for respecting API quotas',
        attributes: [
          { name: 'tokensPerSecond', type: 'number', required: true },
          { name: 'bucketSize', type: 'number', required: true },
          { name: 'currentTokens', type: 'number', required: true },
          { name: 'lastRefillTime', type: 'Date', required: true },
        ],
        relationships: [],
      },
    }),
  ]);

  // API Intent Behaviors
  await Promise.all([
    prisma.intentBehavior.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'Execute Request with Resilience',
        description: 'Executes an API request with full resilience patterns applied',
        trigger: { type: 'method_call', method: 'request' },
        steps: [
          { order: 1, description: 'Check circuit breaker state', action: 'checkCircuit' },
          { order: 2, description: 'Acquire rate limit token', action: 'acquireToken' },
          { order: 3, description: 'Execute HTTP request', action: 'httpRequest' },
          { order: 4, description: 'Record success/failure for circuit breaker', action: 'recordResult' },
          { order: 5, description: 'Parse and return response', action: 'parseResponse' },
        ],
        errorHandlers: {
          action: 'retryWithBackoff',
          retryable: true,
          maxRetries: 3,
        },
      },
    }),
    prisma.intentBehavior.create({
      data: {
        intentGraphId: apiGraph.id,
        name: 'Handle Rate Limit Response',
        description: 'Handles 429 response by parsing retry-after and queueing request',
        trigger: { type: 'http_response', statusCode: 429 },
        steps: [
          { order: 1, description: 'Parse retry-after header', action: 'parseHeader', header: 'retry-after' },
          { order: 2, description: 'Update rate limiter tokens', action: 'drainTokens' },
          { order: 3, description: 'Schedule retry after delay', action: 'scheduleRetry' },
          { order: 4, description: 'Log rate limit event', action: 'log', level: 'warn' },
        ],
      },
    }),
  ]);

  // API Intent Contexts
  await Promise.all([
    prisma.intentContext.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'TECHNICAL',
        description: 'Built with NestJS HttpModule. Uses ioredis for distributed rate limiting. OpenTelemetry for tracing.',
      },
    }),
    prisma.intentContext.create({
      data: {
        intentGraphId: apiGraph.id,
        category: 'HISTORICAL',
        description: 'Previous implementation lacked circuit breaker which caused full system outage when Stripe was down for 2 hours. Added after post-mortem.',
      },
    }),
  ]);

  // ============================================================================
  // INTENT GRAPH 3: E-commerce Checkout Flow
  // ============================================================================
  console.log('  Creating Intent Graph 3: E-commerce Checkout...');

  const checkoutGraph = await prisma.intentGraph.create({
    data: {
      id: IDS.intentGraphs.checkout,
      tenantId: tenant.id,
      createdById: emily.id,
      projectId: project.id,
      name: 'E-commerce Checkout Flow',
      description: 'Intent graph for multi-step checkout with cart, shipping, payment, and confirmation',
      status: 'DRAFT',
      version: 1,
      metadata: {
        estimatedComplexity: 'high',
        tags: ['frontend', 'e-commerce', 'payment', 'user-flow'],
      },
    },
  });

  // Checkout Intent Goals
  const checkoutMainGoal = await prisma.intentGoal.create({
    data: {
      intentGraphId: checkoutGraph.id,
      description: 'Create seamless checkout experience with minimal friction',
      priority: 'CRITICAL',
      successCriteria: ['Cart abandonment under 30%', 'Checkout completion under 3 minutes', 'Support guest checkout'],
    },
  });

  await Promise.all([
    prisma.intentGoal.create({
      data: {
        intentGraphId: checkoutGraph.id,
        parentGoalId: checkoutMainGoal.id,
        description: 'Support multiple payment methods',
        priority: 'CRITICAL',
        successCriteria: ['Credit/debit cards via Stripe', 'PayPal integration', 'Apple Pay and Google Pay'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: checkoutGraph.id,
        parentGoalId: checkoutMainGoal.id,
        description: 'Calculate shipping options dynamically',
        priority: 'HIGH',
        successCriteria: ['Real-time carrier rates', 'Estimated delivery dates', 'Free shipping threshold'],
      },
    }),
    prisma.intentGoal.create({
      data: {
        intentGraphId: checkoutGraph.id,
        parentGoalId: checkoutMainGoal.id,
        description: 'Apply discount codes and promotions',
        priority: 'MEDIUM',
        successCriteria: ['Percentage discounts', 'Fixed amount off', 'Free shipping codes', 'Stacking rules'],
      },
    }),
  ]);

  // Checkout Intent Constraints
  await Promise.all([
    prisma.intentConstraint.create({
      data: {
        intentGraphId: checkoutGraph.id,
        category: 'SECURITY',
        description: 'Must be PCI DSS compliant - never handle raw card numbers',
        severity: 'MUST',
        verificationMethod: 'Annual PCI compliance audit, use Stripe Elements only',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: checkoutGraph.id,
        category: 'USABILITY',
        description: 'Checkout must complete in 5 clicks or fewer',
        severity: 'SHOULD',
        verificationMethod: 'UX testing with click tracking',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: checkoutGraph.id,
        category: 'PERFORMANCE',
        description: 'Payment processing must show feedback within 1 second',
        severity: 'MUST',
        verificationMethod: 'Real user monitoring (RUM) metrics',
      },
    }),
    prisma.intentConstraint.create({
      data: {
        intentGraphId: checkoutGraph.id,
        category: 'COMPLIANCE',
        description: 'Must display terms and privacy policy before payment',
        severity: 'MUST',
        verificationMethod: 'Legal review checklist',
      },
    }),
  ]);

  // Checkout Intent Entities
  await Promise.all([
    prisma.intentEntity.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'Cart',
        description: 'Shopping cart containing items and totals',
        attributes: [
          { name: 'items', type: 'CartItem[]', required: true },
          { name: 'subtotal', type: 'number', required: true, computed: true },
          { name: 'discount', type: 'number', required: false },
          { name: 'discountCode', type: 'string', required: false },
          { name: 'shipping', type: 'number', required: false },
          { name: 'tax', type: 'number', required: false },
          { name: 'total', type: 'number', required: true, computed: true },
        ],
        relationships: [
          { targetEntity: 'CartItem', type: 'contains', cardinality: 'many' },
        ],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'ShippingAddress',
        description: 'Customer shipping address with validation',
        attributes: [
          { name: 'firstName', type: 'string', required: true },
          { name: 'lastName', type: 'string', required: true },
          { name: 'line1', type: 'string', required: true },
          { name: 'line2', type: 'string', required: false },
          { name: 'city', type: 'string', required: true },
          { name: 'state', type: 'string', required: true },
          { name: 'postalCode', type: 'string', required: true },
          { name: 'country', type: 'string', required: true },
          { name: 'phone', type: 'string', required: false },
        ],
        relationships: [],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'PaymentMethod',
        description: 'Customer payment method (tokenized)',
        attributes: [
          { name: 'type', type: 'enum', values: ['card', 'paypal', 'apple_pay', 'google_pay'], required: true },
          { name: 'stripePaymentMethodId', type: 'string', required: false },
          { name: 'last4', type: 'string', required: false },
          { name: 'brand', type: 'string', required: false },
          { name: 'expiryMonth', type: 'number', required: false },
          { name: 'expiryYear', type: 'number', required: false },
        ],
        relationships: [],
      },
    }),
    prisma.intentEntity.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'Order',
        description: 'Completed order with all details',
        attributes: [
          { name: 'id', type: 'string', required: true },
          { name: 'status', type: 'enum', values: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'], required: true },
          { name: 'cart', type: 'Cart', required: true },
          { name: 'shippingAddress', type: 'ShippingAddress', required: true },
          { name: 'paymentMethod', type: 'PaymentMethod', required: true },
          { name: 'stripePaymentIntentId', type: 'string', required: true },
          { name: 'createdAt', type: 'Date', required: true },
        ],
        relationships: [
          { targetEntity: 'Cart', type: 'contains', cardinality: 'one' },
          { targetEntity: 'ShippingAddress', type: 'contains', cardinality: 'one' },
          { targetEntity: 'PaymentMethod', type: 'contains', cardinality: 'one' },
        ],
        stateMachine: {
          states: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
          transitions: [
            { from: 'pending', to: 'paid', event: 'PAYMENT_CONFIRMED' },
            { from: 'pending', to: 'cancelled', event: 'PAYMENT_FAILED' },
            { from: 'paid', to: 'processing', event: 'FULFILLMENT_STARTED' },
            { from: 'processing', to: 'shipped', event: 'SHIPMENT_CREATED' },
            { from: 'shipped', to: 'delivered', event: 'DELIVERY_CONFIRMED' },
            { from: 'paid', to: 'cancelled', event: 'REFUND_ISSUED' },
          ],
        },
      },
    }),
  ]);

  // Checkout Intent Behaviors
  await Promise.all([
    prisma.intentBehavior.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'Process Payment',
        description: 'Handles payment submission through Stripe',
        trigger: { type: 'user_action', event: 'submit', target: 'payment_form' },
        steps: [
          { order: 1, description: 'Validate all checkout data', action: 'validate' },
          { order: 2, description: 'Create Stripe PaymentIntent', action: 'createPaymentIntent' },
          { order: 3, description: 'Confirm payment with Stripe Elements', action: 'confirmPayment' },
          { order: 4, description: 'Create order record in database', action: 'createOrder' },
          { order: 5, description: 'Send confirmation email', action: 'sendEmail' },
          { order: 6, description: 'Clear cart and redirect to confirmation', action: 'complete' },
        ],
        errorHandlers: {
          action: 'showPaymentError',
          retryable: true,
          maxRetries: 2,
        },
      },
    }),
    prisma.intentBehavior.create({
      data: {
        intentGraphId: checkoutGraph.id,
        name: 'Apply Discount Code',
        description: 'Validates and applies a discount code to the cart',
        trigger: { type: 'user_action', event: 'submit', target: 'discount_form' },
        steps: [
          { order: 1, description: 'Validate code format', action: 'validateFormat' },
          { order: 2, description: 'Check code exists and is active', action: 'lookupCode' },
          { order: 3, description: 'Verify cart meets minimum requirements', action: 'checkMinimum' },
          { order: 4, description: 'Calculate discount amount', action: 'calculateDiscount' },
          { order: 5, description: 'Update cart with discount', action: 'applyDiscount' },
          { order: 6, description: 'Show success message', action: 'notify' },
        ],
        errorHandlers: {
          action: 'showInvalidCode',
          retryable: false,
        },
      },
    }),
  ]);

  // Checkout Intent Context
  await prisma.intentContext.create({
    data: {
      intentGraphId: checkoutGraph.id,
      category: 'TECHNICAL',
      description: 'Checkout built with Next.js App Router. Stripe for payments (never handles raw card data). React Hook Form for validation.',
    },
  });

  // ============================================================================
  // ARTIFACTS
  // ============================================================================
  console.log('  Creating Artifacts...');

  // Create hash helper
  const createHash = (content: string) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 64);
  };

  // Dashboard Artifacts
  const dashboardComponent = await prisma.artifact.create({
    data: {
      id: IDS.artifacts.dashboardComponent,
      tenantId: tenant.id,
      projectId: project.id,
      intentGraphId: dashboardGraph.id,
      name: 'AnalyticsDashboard',
      description: 'Main analytics dashboard component with metric cards, charts, and filters',
      type: 'COMPONENT',
      status: 'ACTIVE',
      createdById: sarah.id,
      metadata: {
        filePath: 'src/components/dashboard/AnalyticsDashboard.tsx',
        language: 'typescript',
        framework: 'react',
      },
    },
  });

  const dashboardCode = `import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateRangePicker } from './DateRangePicker';
import { MetricCard } from './MetricCard';
import { MetricsChart } from './MetricsChart';
import { fetchMetrics, MetricsResponse } from '@/api/metrics';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['metrics', dateRange],
    queryFn: () => fetchMetrics(dateRange),
  });

  if (error) {
    return <div className="error">Failed to load dashboard data</div>;
  }

  return (
    <div className="analytics-dashboard">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          comparisonEnabled={comparisonEnabled}
          onComparisonToggle={setComparisonEnabled}
        />
      </header>

      <section className="metrics-grid">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={data?.mrr ?? 0}
          previousValue={data?.previousMrr}
          format="currency"
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Users"
          value={data?.activeUsers ?? 0}
          previousValue={data?.previousActiveUsers}
          format="compact"
          isLoading={isLoading}
        />
        <MetricCard
          title="Churn Rate"
          value={data?.churnRate ?? 0}
          previousValue={data?.previousChurnRate}
          format="percentage"
          isLoading={isLoading}
        />
        <MetricCard
          title="Customer Lifetime Value"
          value={data?.ltv ?? 0}
          previousValue={data?.previousLtv}
          format="currency"
          isLoading={isLoading}
        />
      </section>

      <section className="charts-section">
        <MetricsChart
          type="area"
          data={data?.revenueHistory ?? []}
          comparisonData={comparisonEnabled ? data?.previousRevenueHistory : undefined}
          title="Revenue Over Time"
        />
        <MetricsChart
          type="bar"
          data={data?.userGrowth ?? []}
          title="User Growth"
        />
      </section>
    </div>
  );
}`;

  await prisma.artifactVersion.create({
    data: {
      artifactId: dashboardComponent.id,
      version: 1,
      content: dashboardCode,
      contentHash: createHash(dashboardCode),
      synthesizedFrom: [metricsGoal.id, filteringGoal.id],
      changelog: 'Initial implementation with metric cards, charts, and date filtering',
      createdById: sarah.id,
    },
  });

  // Metric Card Component
  const metricCardArtifact = await prisma.artifact.create({
    data: {
      id: IDS.artifacts.metricCardComponent,
      tenantId: tenant.id,
      projectId: project.id,
      intentGraphId: dashboardGraph.id,
      name: 'MetricCard',
      description: 'Reusable metric display card with trend indicator',
      type: 'COMPONENT',
      status: 'ACTIVE',
      createdById: sarah.id,
      metadata: {
        filePath: 'src/components/dashboard/MetricCard.tsx',
        language: 'typescript',
        framework: 'react',
      },
    },
  });

  const metricCardCode = `import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'percentage' | 'number' | 'compact';
  isLoading?: boolean;
}

function formatValue(value: number, format: MetricCardProps['format']): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return \`\${(value * 100).toFixed(1)}%\`;
    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(value);
    default:
      return value.toLocaleString();
  }
}

export function MetricCard({ title, value, previousValue, format, isLoading }: MetricCardProps) {
  const trend = useMemo(() => {
    if (previousValue === undefined || previousValue === 0) return null;
    return ((value - previousValue) / previousValue) * 100;
  }, [value, previousValue]);

  const TrendIcon = trend === null ? Minus : trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === null ? 'text-gray-400' : trend >= 0 ? 'text-green-500' : 'text-red-500';

  if (isLoading) {
    return (
      <div className="metric-card animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
        <div className="h-8 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value">{formatValue(value, format)}</div>
      {trend !== null && (
        <div className={cn('metric-trend', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}`;

  await prisma.artifactVersion.create({
    data: {
      artifactId: metricCardArtifact.id,
      version: 1,
      content: metricCardCode,
      contentHash: createHash(metricCardCode),
      synthesizedFrom: [metricCardEntity.id],
      changelog: 'Initial implementation with formatting and trend indicators',
      createdById: sarah.id,
    },
  });

  // Link artifacts to intent nodes
  await Promise.all([
    prisma.artifactLink.create({
      data: {
        artifactId: dashboardComponent.id,
        intentNodeId: metricsGoal.id,
        intentNodeType: 'goal',
        linkType: 'IMPLEMENTS',
        metadata: { primary: true },
      },
    }),
    prisma.artifactLink.create({
      data: {
        artifactId: dashboardComponent.id,
        intentNodeId: filteringGoal.id,
        intentNodeType: 'goal',
        linkType: 'IMPLEMENTS',
      },
    }),
    prisma.artifactLink.create({
      data: {
        artifactId: metricCardArtifact.id,
        intentNodeId: metricCardEntity.id,
        intentNodeType: 'entity',
        linkType: 'IMPLEMENTS',
        metadata: { primary: true },
      },
    }),
  ]);

  // API Schema Artifact
  const apiSchemaArtifact = await prisma.artifact.create({
    data: {
      id: IDS.artifacts.metricsApiSchema,
      tenantId: tenant.id,
      projectId: project.id,
      intentGraphId: dashboardGraph.id,
      name: 'MetricsAPI',
      description: 'OpenAPI schema for metrics endpoints',
      type: 'API_SCHEMA',
      status: 'ACTIVE',
      createdById: marcus.id,
      metadata: {
        filePath: 'src/api/schemas/metrics.yaml',
        format: 'openapi-3.0',
      },
    },
  });

  const apiSchemaContent = `openapi: 3.0.3
info:
  title: Metrics API
  version: 1.0.0
  description: API for fetching analytics metrics

paths:
  /api/metrics:
    get:
      summary: Get dashboard metrics
      parameters:
        - name: startDate
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: endDate
          in: query
          required: true
          schema:
            type: string
            format: date
        - name: comparison
          in: query
          required: false
          schema:
            type: boolean
      responses:
        '200':
          description: Metrics data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MetricsResponse'

components:
  schemas:
    MetricsResponse:
      type: object
      required:
        - mrr
        - activeUsers
        - churnRate
        - ltv
        - revenueHistory
        - userGrowth
      properties:
        mrr:
          type: number
          description: Monthly Recurring Revenue
        previousMrr:
          type: number
        activeUsers:
          type: integer
        previousActiveUsers:
          type: integer
        churnRate:
          type: number
          minimum: 0
          maximum: 1
        previousChurnRate:
          type: number
        ltv:
          type: number
          description: Customer Lifetime Value
        previousLtv:
          type: number
        revenueHistory:
          type: array
          items:
            $ref: '#/components/schemas/DataPoint'
        userGrowth:
          type: array
          items:
            $ref: '#/components/schemas/DataPoint'

    DataPoint:
      type: object
      required:
        - date
        - value
      properties:
        date:
          type: string
          format: date
        value:
          type: number`;

  await prisma.artifactVersion.create({
    data: {
      artifactId: apiSchemaArtifact.id,
      version: 1,
      content: apiSchemaContent,
      contentHash: createHash(apiSchemaContent),
      synthesizedFrom: [],
      changelog: 'Initial API schema for metrics endpoints',
      createdById: marcus.id,
    },
  });

  // Dashboard Tests Artifact
  const dashboardTestsArtifact = await prisma.artifact.create({
    data: {
      id: IDS.artifacts.dashboardTests,
      tenantId: tenant.id,
      projectId: project.id,
      intentGraphId: dashboardGraph.id,
      name: 'DashboardTests',
      description: 'Test suite for analytics dashboard',
      type: 'TEST',
      status: 'ACTIVE',
      createdById: sarah.id,
      metadata: {
        filePath: 'src/components/dashboard/__tests__/AnalyticsDashboard.test.tsx',
        testFramework: 'vitest',
        testType: 'integration',
      },
    },
  });

  const dashboardTestsCode = `import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import * as metricsApi from '@/api/metrics';

vi.mock('@/api/metrics');

const mockMetrics = {
  mrr: 50000,
  previousMrr: 45000,
  activeUsers: 1234,
  previousActiveUsers: 1100,
  churnRate: 0.05,
  previousChurnRate: 0.06,
  ltv: 2500,
  previousLtv: 2200,
  revenueHistory: [],
  userGrowth: [],
};

function renderWithQuery(component: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('AnalyticsDashboard', () => {
  it('renders loading state initially', () => {
    vi.mocked(metricsApi.fetchMetrics).mockReturnValue(new Promise(() => {}));
    renderWithQuery(<AnalyticsDashboard />);

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getAllByClassName('animate-pulse')).toHaveLength(4);
  });

  it('displays metrics after loading', async () => {
    vi.mocked(metricsApi.fetchMetrics).mockResolvedValue(mockMetrics);
    renderWithQuery(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument();
      expect(screen.getByText('5.0%')).toBeInTheDocument();
    });
  });

  it('shows trend indicators', async () => {
    vi.mocked(metricsApi.fetchMetrics).mockResolvedValue(mockMetrics);
    renderWithQuery(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('11.1%')).toBeInTheDocument(); // MRR increase
    });
  });

  it('updates when date range changes', async () => {
    const user = userEvent.setup();
    vi.mocked(metricsApi.fetchMetrics).mockResolvedValue(mockMetrics);
    renderWithQuery(<AnalyticsDashboard />);

    await user.click(screen.getByText('Last 7 days'));

    await waitFor(() => {
      expect(metricsApi.fetchMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('shows error state on API failure', async () => {
    vi.mocked(metricsApi.fetchMetrics).mockRejectedValue(new Error('API Error'));
    renderWithQuery(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });
});`;

  await prisma.artifactVersion.create({
    data: {
      artifactId: dashboardTestsArtifact.id,
      version: 1,
      content: dashboardTestsCode,
      contentHash: createHash(dashboardTestsCode),
      synthesizedFrom: [dashboardMainGoal.id],
      changelog: 'Initial test suite covering loading, display, and error states',
      createdById: sarah.id,
    },
  });

  // Link test artifact
  await prisma.artifactLink.create({
    data: {
      artifactId: dashboardTestsArtifact.id,
      intentNodeId: dashboardMainGoal.id,
      intentNodeType: 'goal',
      linkType: 'TESTS',
    },
  });

  // API Client Code Artifact
  const apiClientArtifact = await prisma.artifact.create({
    data: {
      id: IDS.artifacts.apiClientCode,
      tenantId: tenant.id,
      projectId: project.id,
      intentGraphId: apiGraph.id,
      name: 'ResilientApiClient',
      description: 'Base API client with retry, circuit breaker, and rate limiting',
      type: 'CODE',
      status: 'ACTIVE',
      createdById: marcus.id,
      metadata: {
        filePath: 'src/lib/api/ResilientApiClient.ts',
        language: 'typescript',
      },
    },
  });

  const apiClientCode = `import { CircuitBreaker, CircuitState } from './CircuitBreaker';
import { RateLimiter } from './RateLimiter';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  circuitBreaker?: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
  };
  rateLimit?: {
    tokensPerSecond: number;
    bucketSize: number;
  };
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true,
};

export class ResilientApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retryConfig: RetryConfig;
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout ?? 30000;
    this.retryConfig = { ...DEFAULT_RETRY, ...config.retry };

    if (config.circuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    }

    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    // Check circuit breaker
    if (this.circuitBreaker?.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    // Acquire rate limit token
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        const response = await this.executeRequest<T>(path, options);
        this.circuitBreaker?.recordSuccess();
        return response;
      } catch (error) {
        lastError = error as Error;
        this.circuitBreaker?.recordFailure();

        if (!this.isRetryable(error)) {
          throw error;
        }

        attempt++;
        if (attempt < this.retryConfig.maxAttempts) {
          await this.delay(attempt);
        }
      }
    }

    throw lastError;
  }

  private async executeRequest<T>(path: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(\`\${this.baseUrl}\${path}\`, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ApiError) {
      return [429, 500, 502, 503, 504].includes(error.status);
    }
    return error instanceof Error && error.name === 'AbortError';
  }

  private async delay(attempt: number): Promise<void> {
    let delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
      this.retryConfig.maxDelay
    );

    if (this.retryConfig.jitter) {
      delay *= 0.5 + Math.random();
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}`;

  await prisma.artifactVersion.create({
    data: {
      artifactId: apiClientArtifact.id,
      version: 1,
      content: apiClientCode,
      contentHash: createHash(apiClientCode),
      synthesizedFrom: [apiMainGoal.id],
      changelog: 'Initial implementation with retry, circuit breaker, and rate limiting',
      createdById: marcus.id,
    },
  });

  // ============================================================================
  // ASSEMBLY CACHE
  // ============================================================================
  console.log('  Creating Assembly Cache entries...');

  const assemblyXml1 = `<claude_context version="1.0">
  <identity confidence="high">
    <expertise>
      <primary_language confidence="0.95">TypeScript</primary_language>
      <frameworks confidence="0.9">React, NestJS, Prisma</frameworks>
      <domains confidence="0.85">Full-stack web development, API design</domains>
    </expertise>
    <preferences>
      <code_style confidence="0.85">functional</code_style>
      <test_framework confidence="0.8">vitest</test_framework>
    </preferences>
  </identity>

  <active_project name="Living Software Platform Demo">
    <goal priority="high" status="in_progress">Build a working demo of intent-driven development</goal>
    <constraint category="technical">Must work without Docker for easy development setup</constraint>
    <constraint category="business">Demo must be visually impressive for stakeholder presentations</constraint>
  </active_project>

  <relevant_context>
    <decision recency="recent" confidence="0.9">
      Use in-memory cache as Redis fallback for development.
      Rationale: Simplifies local development setup without requiring Docker.
    </decision>
    <pattern name="API Design Guidelines" relevance="0.85">
      RESTful conventions, JSON responses, Bearer token authentication.
    </pattern>
  </relevant_context>
</claude_context>`;

  const assemblyXml2 = `<claude_context version="1.0">
  <identity confidence="high">
    <expertise>
      <primary_language confidence="0.95">TypeScript</primary_language>
      <secondary_languages>Python, Go, Rust</secondary_languages>
    </expertise>
    <work>
      <current_project>Living Software Platform</current_project>
      <role>Tech Lead</role>
    </work>
  </identity>

  <active_intent_graph name="SaaS Dashboard Feature">
    <goals>
      <goal priority="critical">Display key business metrics at a glance</goal>
      <goal priority="high">Enable date range filtering</goal>
    </goals>
    <constraints>
      <constraint category="performance" severity="must">Dashboard must load within 2 seconds</constraint>
      <constraint category="usability" severity="must">WCAG 2.1 AA compliance</constraint>
    </constraints>
    <entities>
      <entity name="MetricCard">Card component displaying single metric with trend</entity>
      <entity name="DateRangePicker">Component for selecting date ranges with presets</entity>
    </entities>
  </active_intent_graph>

  <related_artifacts>
    <artifact name="AnalyticsDashboard" type="component" status="active" />
    <artifact name="MetricCard" type="component" status="active" />
  </related_artifacts>
</claude_context>`;

  await Promise.all([
    prisma.assemblyCache.create({
      data: {
        tenantId: tenant.id,
        userId: sarah.id,
        queryHash: createHash('help me with the platform demo'),
        projectId: project.id,
        contextXml: assemblyXml1,
        tokenCount: 450,
        sources: [
          { type: 'identity', id: userContext.id, relevance: 0.95 },
          { type: 'project', id: project.id, relevance: 0.9 },
          { type: 'context_node', id: platformNodes[0].id, relevance: 0.85 },
        ],
        relevanceScores: {
          [userContext.id]: 0.95,
          [project.id]: 0.9,
          [platformNodes[0].id]: 0.85,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.assemblyCache.create({
      data: {
        tenantId: tenant.id,
        userId: sarah.id,
        queryHash: createHash('build the analytics dashboard'),
        projectId: project.id,
        contextXml: assemblyXml2,
        tokenCount: 620,
        sources: [
          { type: 'identity', id: userContext.id, relevance: 0.9 },
          { type: 'intent_graph', id: dashboardGraph.id, relevance: 0.95 },
          { type: 'artifact', id: dashboardComponent.id, relevance: 0.85 },
        ],
        relevanceScores: {
          [userContext.id]: 0.9,
          [dashboardGraph.id]: 0.95,
          [dashboardComponent.id]: 0.85,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // ============================================================================
  // ARTIFACT OUTCOMES
  // ============================================================================
  console.log('  Creating Artifact Outcomes...');

  await Promise.all([
    prisma.artifactOutcome.create({
      data: {
        contextId: userContext.id,
        artifactId: dashboardComponent.id,
        feedbackSignals: [
          { type: 'accepted', timestamp: yesterday.toISOString(), confidence: 1.0 },
          { type: 'modified', timestamp: now.toISOString(), editDistance: 15 },
        ],
        usageMetrics: {
          timesGenerated: 3,
          timesAccepted: 2,
          averageEditDistance: 12,
          lastUsed: now.toISOString(),
        },
        finalStatus: 'active',
      },
    }),
    prisma.artifactOutcome.create({
      data: {
        contextId: userContext.id,
        artifactId: metricCardArtifact.id,
        feedbackSignals: [
          { type: 'accepted', timestamp: threeDaysAgo.toISOString(), confidence: 1.0 },
        ],
        usageMetrics: {
          timesGenerated: 2,
          timesAccepted: 2,
          averageEditDistance: 5,
          lastUsed: yesterday.toISOString(),
        },
        finalStatus: 'active',
      },
    }),
  ]);

  // ============================================================================
  // LIVING SOFTWARE CORE: INTENTS
  // ============================================================================
  console.log('  Creating Intents (Living Software - WHY)...');

  const intents = await Promise.all([
    prisma.intent.create({
      data: {
        id: IDS.intents.reduceChurn,
        tenantId: tenant.id,
        shortId: 'INT-001',
        title: 'Reduce customer churn rate by 25%',
        description: 'Customers are churning due to poor onboarding experience and lack of feature discovery. We need to proactively help customers find value faster.',
        desiredState: 'Customer churn rate drops from 8% to 6% monthly, with clear engagement patterns showing increased feature adoption in first 30 days.',
        successCriteria: [
          { description: 'Monthly churn rate < 6%', metric: 'churn_rate', targetValue: 6, unit: '%', isMet: false },
          { description: 'First-week engagement > 50%', metric: 'engagement_rate', targetValue: 50, unit: '%', isMet: true },
          { description: 'Feature discovery rate > 40%', metric: 'feature_discovery', targetValue: 40, unit: '%', isMet: false },
        ],
        antiPatterns: ['Aggressive upselling', 'Spam notifications', 'Hiding cancellation options'],
        evidence: [
          { type: 'analytics', description: 'Exit surveys show confusion about features', confidence: 0.9, source: 'Hotjar' },
          { type: 'user_research', description: '12 customer interviews identified onboarding as primary pain point', confidence: 0.85 },
        ],
        priority: 'CRITICAL',
        status: 'ACTIVE',
        confidenceScore: 0.75,
        fulfillmentScore: 0.34,
        primaryStakeholder: 'VP of Customer Success',
        affectedPersonas: ['New Users', 'Trial Users', 'SMB Customers'],
        businessValue: { revenueAtRisk: 450000, strategicImportance: 'critical' },
      },
    }),
    prisma.intent.create({
      data: {
        id: IDS.intents.improveOnboarding,
        tenantId: tenant.id,
        shortId: 'INT-002',
        title: 'Reduce time-to-value for new users to under 5 minutes',
        description: 'New users should experience their first success within 5 minutes of signing up, creating a "magic moment" that drives retention.',
        desiredState: 'New users complete a meaningful action (create first project, invite team, run first report) within 5 minutes of signup.',
        successCriteria: [
          { description: 'Median time-to-first-value < 5 min', metric: 'time_to_value', targetValue: 5, unit: 'minutes', isMet: false },
          { description: 'Onboarding completion > 80%', metric: 'onboarding_completion', targetValue: 80, unit: '%', isMet: false },
        ],
        antiPatterns: ['Lengthy forms', 'Too many setup steps', 'Requiring credit card upfront'],
        evidence: [
          { type: 'analytics', description: 'Current median time-to-value is 23 minutes', confidence: 0.95, source: 'Mixpanel' },
        ],
        priority: 'HIGH',
        status: 'VALIDATED',
        confidenceScore: 0.88,
        fulfillmentScore: 0.22,
        parentIntentId: IDS.intents.reduceChurn,
        primaryStakeholder: 'Product Manager',
        affectedPersonas: ['New Users', 'Trial Users'],
        businessValue: { strategicImportance: 'high', customerImpact: 85 },
      },
    }),
    prisma.intent.create({
      data: {
        id: IDS.intents.increaseConversion,
        tenantId: tenant.id,
        shortId: 'INT-003',
        title: 'Increase trial-to-paid conversion by 15%',
        description: 'Convert more trial users to paying customers by demonstrating clear value and reducing friction in the upgrade process.',
        desiredState: 'Trial-to-paid conversion increases from 12% to 14%, with clear attribution to specific product improvements.',
        successCriteria: [
          { description: 'Trial conversion > 14%', metric: 'trial_conversion', targetValue: 14, unit: '%', isMet: false },
          { description: 'Upgrade friction score < 3', metric: 'friction_score', targetValue: 3, unit: 'score', isMet: true },
        ],
        antiPatterns: ['Dark patterns', 'Hidden pricing', 'Forced annual commitments'],
        evidence: [
          { type: 'business_case', description: 'Each 1% conversion increase = $120K ARR', confidence: 0.9 },
        ],
        priority: 'HIGH',
        status: 'ACTIVE',
        confidenceScore: 0.72,
        fulfillmentScore: 0.58,
        primaryStakeholder: 'Head of Growth',
        affectedPersonas: ['Trial Users', 'Decision Makers'],
        businessValue: { estimatedRevenue: 180000, strategicImportance: 'high' },
      },
    }),
    prisma.intent.create({
      data: {
        id: IDS.intents.enhancePerformance,
        tenantId: tenant.id,
        shortId: 'INT-004',
        title: 'Achieve sub-200ms page load times',
        description: 'Users expect instant responsiveness. Slow pages cause frustration and abandonment.',
        desiredState: 'P95 page load times under 200ms for all critical user journeys.',
        successCriteria: [
          { description: 'P95 page load < 200ms', metric: 'page_load_p95', targetValue: 200, unit: 'ms', isMet: false },
          { description: 'Core Web Vitals passing', metric: 'cwv_score', targetValue: 90, unit: 'score', isMet: true },
        ],
        antiPatterns: ['Blocking JavaScript', 'Unoptimized images', 'Synchronous API calls'],
        evidence: [
          { type: 'analytics', description: 'Current P95 is 450ms', confidence: 0.98, source: 'Datadog' },
        ],
        priority: 'MEDIUM',
        status: 'ACTIVE',
        confidenceScore: 0.91,
        fulfillmentScore: 0.45,
        primaryStakeholder: 'Engineering Lead',
        affectedPersonas: ['All Users'],
        businessValue: { strategicImportance: 'medium' },
      },
    }),
    prisma.intent.create({
      data: {
        id: IDS.intents.improveAccessibility,
        tenantId: tenant.id,
        shortId: 'INT-005',
        title: 'Achieve WCAG 2.1 AA compliance',
        description: 'Ensure our product is usable by everyone, including users with disabilities.',
        desiredState: 'Full WCAG 2.1 AA compliance across all user-facing features.',
        successCriteria: [
          { description: 'Zero critical a11y violations', metric: 'a11y_violations', targetValue: 0, unit: 'count', isMet: false },
          { description: 'Screen reader compatibility', metric: 'sr_score', targetValue: 95, unit: '%', isMet: false },
        ],
        antiPatterns: ['Images without alt text', 'Poor color contrast', 'Keyboard traps'],
        evidence: [
          { type: 'feedback', description: 'Customer complaints about screen reader issues', confidence: 0.8 },
        ],
        priority: 'MEDIUM',
        status: 'HYPOTHESIZED',
        confidenceScore: 0.65,
        fulfillmentScore: 0.30,
        primaryStakeholder: 'Design Lead',
        affectedPersonas: ['Users with Disabilities', 'Enterprise Customers'],
        businessValue: { strategicImportance: 'medium', customerImpact: 60 },
      },
    }),
  ]);

  // ============================================================================
  // LIVING SOFTWARE CORE: CAPABILITIES
  // ============================================================================
  console.log('  Creating Capabilities (Living Software - WHAT)...');

  const capabilities = await Promise.all([
    prisma.capability.create({
      data: {
        id: IDS.capabilities.userAuth,
        tenantId: tenant.id,
        name: 'User Authentication',
        description: 'Secure user authentication with multiple providers and MFA support.',
        provides: 'Users can securely sign in using email/password, OAuth (Google, GitHub), or SSO, with optional MFA.',
        limitations: ['No biometric auth yet', 'SSO requires enterprise plan'],
        assumptions: ['Users have valid email addresses', 'OAuth providers are available'],
        intentId: IDS.intents.reduceChurn,
        status: 'ACTIVE',
        maturityLevel: 'MATURE',
        effectivenessScore: 0.92,
        usageCount: 15420,
        successRate: 0.98,
        lastUsedAt: yesterday,
        gaps: [],
        valueDelivered: { errorsPrevented: 1200, timeSaved: 4500 },
      },
    }),
    prisma.capability.create({
      data: {
        id: IDS.capabilities.dashboardAnalytics,
        tenantId: tenant.id,
        name: 'Dashboard Analytics',
        description: 'Real-time analytics dashboard with customizable metrics and charts.',
        provides: 'Users can view, filter, and export analytics data with real-time updates.',
        limitations: ['Max 30 day history on free plan', 'Custom metrics require setup'],
        assumptions: ['Events are properly instrumented', 'Data pipeline is healthy'],
        intentId: IDS.intents.improveOnboarding,
        status: 'ACTIVE',
        maturityLevel: 'BETA',
        effectivenessScore: 0.78,
        usageCount: 8920,
        successRate: 0.95,
        lastUsedAt: yesterday,
        gaps: [
          { description: 'No real-time streaming for large datasets', severity: 'medium', detectedAt: threeDaysAgo.toISOString(), affectedUseCases: ['Enterprise customers', 'High-volume events'], suggestedFix: 'Implement WebSocket streaming' },
        ],
        valueDelivered: { timeSaved: 12000 },
      },
    }),
    prisma.capability.create({
      data: {
        id: IDS.capabilities.searchIndexing,
        tenantId: tenant.id,
        name: 'Full-Text Search',
        description: 'Instant search across all content with typo tolerance and filters.',
        provides: 'Users can find any content instantly with faceted filters and highlighting.',
        limitations: ['Index delay up to 30s', 'Complex queries may timeout'],
        assumptions: ['Content is properly indexed', 'Search infrastructure is scaled'],
        status: 'ACTIVE',
        maturityLevel: 'ALPHA',
        effectivenessScore: 0.68,
        usageCount: 45230,
        gaps: [
          { description: 'Search accuracy drops for misspellings', severity: 'high', detectedAt: oneWeekAgo.toISOString(), affectedUseCases: ['Mobile users', 'International users'], suggestedFix: 'Improve fuzzy matching algorithm' },
          { description: 'No semantic search capability', severity: 'medium', detectedAt: threeDaysAgo.toISOString(), affectedUseCases: ['Research workflows'], suggestedFix: 'Add vector embeddings' },
        ],
      },
    }),
    prisma.capability.create({
      data: {
        id: IDS.capabilities.paymentProcessing,
        tenantId: tenant.id,
        name: 'Payment Processing',
        description: 'Secure payment handling with multiple providers and currencies.',
        provides: 'Process payments via Stripe with support for cards, bank transfers, and invoicing.',
        limitations: ['Bank transfers limited to certain countries', 'Crypto not supported'],
        assumptions: ['Stripe account is configured', 'Tax rates are correct'],
        intentId: IDS.intents.increaseConversion,
        status: 'ACTIVE',
        maturityLevel: 'STABLE',
        effectivenessScore: 0.95,
        usageCount: 3240,
        successRate: 0.99,
        gaps: [
          { description: 'No Apple Pay/Google Pay support', severity: 'high', detectedAt: yesterday.toISOString(), affectedUseCases: ['Mobile checkout', 'Quick purchases'], suggestedFix: 'Integrate Payment Request API' },
        ],
        valueDelivered: { revenueGenerated: 890000 },
      },
    }),
    prisma.capability.create({
      data: {
        id: IDS.capabilities.emailNotifications,
        tenantId: tenant.id,
        name: 'Email Notifications',
        description: 'Transactional and marketing email delivery with templates.',
        provides: 'Send personalized emails with delivery tracking and unsubscribe management.',
        limitations: ['Rate limited to 10k/hour', 'No A/B testing built-in'],
        assumptions: ['Email domain is verified', 'Templates are approved'],
        status: 'ACTIVE',
        maturityLevel: 'BETA',
        effectivenessScore: 0.82,
        usageCount: 128500,
        gaps: [],
      },
    }),
    prisma.capability.create({
      data: {
        id: IDS.capabilities.fileStorage,
        tenantId: tenant.id,
        name: 'File Storage',
        description: 'Secure file upload, storage, and delivery with CDN.',
        provides: 'Upload, store, and serve files with automatic optimization and CDN delivery.',
        limitations: ['Max 100MB per file', 'Video processing limited'],
        assumptions: ['S3 bucket is configured', 'CDN is healthy'],
        status: 'DEVELOPING',
        maturityLevel: 'EXPERIMENTAL',
        effectivenessScore: 0.45,
        usageCount: 890,
        gaps: [
          { description: 'No resumable uploads for large files', severity: 'critical', detectedAt: yesterday.toISOString(), affectedUseCases: ['Large file uploads', 'Poor network conditions'], suggestedFix: 'Implement TUS protocol' },
        ],
      },
    }),
  ]);

  // ============================================================================
  // LIVING SOFTWARE CORE: SIGNALS
  // ============================================================================
  console.log('  Creating Signals (Living Software - HOW)...');

  const signals = await Promise.all([
    prisma.signal.create({
      data: {
        id: IDS.signals.churnRate,
        tenantId: tenant.id,
        name: 'Monthly Churn Rate',
        description: 'Percentage of customers who cancel their subscription each month.',
        signalType: 'RETENTION',
        intentId: IDS.intents.reduceChurn,
        currentValue: 7.8,
        previousValue: 8.2,
        targetValue: 6.0,
        warningThreshold: 7.0,
        criticalThreshold: 9.0,
        direction: 'DECREASE',
        unit: '%',
        aggregation: 'AVG',
        windowMinutes: 43200,
        sources: [{ type: 'database', config: { query: 'churned_customers_last_30d' } }],
        health: 'WARNING',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.onboardingCompletion,
        tenantId: tenant.id,
        name: 'Onboarding Completion Rate',
        description: 'Percentage of new users who complete the onboarding flow.',
        signalType: 'CONVERSION',
        intentId: IDS.intents.improveOnboarding,
        currentValue: 67,
        previousValue: 62,
        targetValue: 80,
        warningThreshold: 60,
        criticalThreshold: 50,
        direction: 'INCREASE',
        unit: '%',
        aggregation: 'AVG',
        windowMinutes: 10080,
        sources: [{ type: 'analytics', config: { event: 'onboarding_completed' } }],
        health: 'WARNING',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.conversionRate,
        tenantId: tenant.id,
        name: 'Trial-to-Paid Conversion',
        description: 'Percentage of trial users who convert to paying customers.',
        signalType: 'CONVERSION',
        intentId: IDS.intents.increaseConversion,
        currentValue: 12.4,
        previousValue: 11.8,
        targetValue: 14.0,
        warningThreshold: 10.0,
        criticalThreshold: 8.0,
        direction: 'INCREASE',
        unit: '%',
        aggregation: 'AVG',
        windowMinutes: 20160,
        sources: [{ type: 'database', config: { query: 'trial_conversions' } }],
        health: 'GOOD',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.pageLoadTime,
        tenantId: tenant.id,
        name: 'P95 Page Load Time',
        description: '95th percentile of page load times across all pages.',
        signalType: 'PERFORMANCE',
        intentId: IDS.intents.enhancePerformance,
        currentValue: 445,
        previousValue: 520,
        targetValue: 200,
        warningThreshold: 400,
        criticalThreshold: 800,
        direction: 'DECREASE',
        unit: 'ms',
        aggregation: 'P95',
        windowMinutes: 60,
        sources: [{ type: 'analytics', config: { metric: 'page_load_time' } }],
        health: 'CRITICAL',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.errorRate,
        tenantId: tenant.id,
        name: 'API Error Rate',
        description: 'Percentage of API requests returning 5xx errors.',
        signalType: 'ERROR_RATE',
        currentValue: 0.3,
        previousValue: 0.5,
        targetValue: 0.1,
        warningThreshold: 0.5,
        criticalThreshold: 1.0,
        direction: 'DECREASE',
        unit: '%',
        aggregation: 'AVG',
        windowMinutes: 60,
        sources: [{ type: 'api', config: { endpoint: '/metrics/errors' } }],
        health: 'GOOD',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.userSatisfaction,
        tenantId: tenant.id,
        name: 'NPS Score',
        description: 'Net Promoter Score from customer surveys.',
        signalType: 'SATISFACTION',
        currentValue: 42,
        previousValue: 38,
        targetValue: 50,
        warningThreshold: 30,
        criticalThreshold: 20,
        direction: 'INCREASE',
        unit: 'score',
        aggregation: 'AVG',
        windowMinutes: 43200,
        sources: [{ type: 'external', config: { provider: 'delighted' } }],
        health: 'GOOD',
        trend: 'IMPROVING',
        lastMeasuredAt: threeDaysAgo,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.apiLatency,
        tenantId: tenant.id,
        name: 'API Latency P99',
        description: '99th percentile API response time.',
        signalType: 'PERFORMANCE',
        capabilityId: IDS.capabilities.dashboardAnalytics,
        currentValue: 890,
        previousValue: 780,
        targetValue: 500,
        warningThreshold: 800,
        criticalThreshold: 1500,
        direction: 'DECREASE',
        unit: 'ms',
        aggregation: 'P99',
        windowMinutes: 60,
        sources: [{ type: 'api', config: { endpoint: '/metrics/latency' } }],
        health: 'CRITICAL',
        trend: 'DECLINING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
    prisma.signal.create({
      data: {
        id: IDS.signals.searchAccuracy,
        tenantId: tenant.id,
        name: 'Search Accuracy',
        description: 'Percentage of searches returning relevant results.',
        signalType: 'ENGAGEMENT',
        capabilityId: IDS.capabilities.searchIndexing,
        currentValue: 78,
        previousValue: 75,
        targetValue: 90,
        warningThreshold: 70,
        criticalThreshold: 60,
        direction: 'INCREASE',
        unit: '%',
        aggregation: 'AVG',
        windowMinutes: 1440,
        sources: [{ type: 'analytics', config: { event: 'search_click_rate' } }],
        health: 'WARNING',
        trend: 'IMPROVING',
        lastMeasuredAt: yesterday,
        isActive: true,
      },
    }),
  ]);

  // ============================================================================
  // LIVING SOFTWARE CORE: EXPERIMENTS
  // ============================================================================
  console.log('  Creating Experiments (Living Software - LEARN)...');

  const experiments = await Promise.all([
    prisma.experiment.create({
      data: {
        id: IDS.experiments.onboardingFlow,
        tenantId: tenant.id,
        name: 'Simplified Onboarding Flow',
        description: 'Test a shorter onboarding with fewer steps and progressive disclosure.',
        hypothesis: 'If we reduce onboarding steps from 7 to 3 with progressive disclosure, then completion rate will increase by 20% without impacting feature discovery.',
        rationale: 'User research shows 40% of users abandon at step 4. Competitive analysis shows simpler flows have higher completion.',
        intentId: IDS.intents.improveOnboarding,
        experimentType: 'A_B_TEST',
        status: 'RUNNING',
        targetMetrics: [
          { signalId: IDS.signals.onboardingCompletion, name: 'Onboarding Completion', weight: 0.6, expectedImprovement: 20 },
          { signalId: IDS.signals.churnRate, name: 'Churn Rate', weight: 0.4, expectedImprovement: -5 },
        ],
        successCriteria: [
          { metricId: IDS.signals.onboardingCompletion, operator: 'gte', threshold: 80, minSampleSize: 1000 },
        ],
        guardrails: [
          { metricId: IDS.signals.churnRate, name: 'Churn Guard', operator: 'lte', threshold: 10, action: 'pause' },
        ],
        targetAudience: { percentage: 50, segments: ['new_users'] },
        trafficPercent: 50,
        startedAt: oneWeekAgo,
        plannedDuration: 14,
        minSampleSize: 2000,
        controlMetrics: { onboardingCompletion: 62, churnRate: 8.2 },
        treatmentMetrics: { onboardingCompletion: 74, churnRate: 7.5 },
        statisticalSignificance: 0.97,
      },
    }),
    prisma.experiment.create({
      data: {
        id: IDS.experiments.checkoutSimplify,
        tenantId: tenant.id,
        name: 'One-Click Checkout',
        description: 'Test one-click checkout for returning customers with saved payment methods.',
        hypothesis: 'If we enable one-click checkout for returning customers, conversion will increase by 15% and cart abandonment will decrease by 25%.',
        rationale: 'Analysis shows 30% of cart abandonment happens at payment step. Competitors with one-click see 20%+ higher conversion.',
        intentId: IDS.intents.increaseConversion,
        capabilityId: IDS.capabilities.paymentProcessing,
        experimentType: 'FEATURE_FLAG',
        status: 'SCHEDULED',
        targetMetrics: [
          { signalId: IDS.signals.conversionRate, name: 'Conversion Rate', weight: 0.7, expectedImprovement: 15 },
        ],
        successCriteria: [
          { metricId: IDS.signals.conversionRate, operator: 'gte', threshold: 14, minSampleSize: 500 },
        ],
        guardrails: [
          { metricId: IDS.signals.errorRate, name: 'Error Rate Guard', operator: 'lte', threshold: 1, action: 'stop' },
        ],
        targetAudience: { percentage: 20, segments: ['returning_customers'] },
        trafficPercent: 20,
        plannedDuration: 7,
        minSampleSize: 500,
      },
    }),
    prisma.experiment.create({
      data: {
        id: IDS.experiments.dashboardRedesign,
        tenantId: tenant.id,
        name: 'Dashboard Performance Optimization',
        description: 'Test lazy loading and virtualization for dashboard charts.',
        hypothesis: 'If we implement lazy loading and virtualization, P95 load time will drop below 300ms without impacting user engagement.',
        rationale: 'Dashboard is the most-visited page. Current load times are causing user frustration per support tickets.',
        intentId: IDS.intents.enhancePerformance,
        capabilityId: IDS.capabilities.dashboardAnalytics,
        experimentType: 'CANARY',
        status: 'COMPLETED',
        targetMetrics: [
          { signalId: IDS.signals.pageLoadTime, name: 'Page Load Time', weight: 0.8, expectedImprovement: -50 },
          { signalId: IDS.signals.apiLatency, name: 'API Latency', weight: 0.2, expectedImprovement: -30 },
        ],
        successCriteria: [
          { metricId: IDS.signals.pageLoadTime, operator: 'lte', threshold: 300, minSampleSize: 10000 },
        ],
        guardrails: [],
        targetAudience: { percentage: 100 },
        trafficPercent: 100,
        startedAt: oneWeekAgo,
        endedAt: yesterday,
        plannedDuration: 5,
        minSampleSize: 10000,
        controlMetrics: { pageLoadTime: 520, apiLatency: 780 },
        treatmentMetrics: { pageLoadTime: 280, apiLatency: 590 },
        statisticalSignificance: 0.999,
        verdict: 'SUCCESS',
        verdictReason: 'Achieved 46% reduction in page load time, exceeding 50% target expectation. No negative impact on engagement metrics.',
        learnings: 'Lazy loading charts was the biggest win. Virtualization helped but was complex to implement. Consider applying same pattern to other data-heavy pages.',
      },
    }),
  ]);

  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('   • 1 Tenant: ' + tenant.name);
  console.log('   • ' + users.length + ' Users: ' + users.map((u) => u.name).join(', '));
  console.log('   • ' + workspaces.length + ' Workspaces: ' + workspaces.map((w) => w.name).join(', '));
  console.log(
    '   • ' +
      graphs.length +
      ' Context Graphs with ' +
      (platformNodes.length + productNodes.length) +
      ' nodes',
  );
  console.log('   • ' + slices.length + ' Slices in various states');
  console.log('   • ' + sessions.length + ' AI Sessions with feedback');
  console.log('   • 10 days of analytics metrics');
  console.log('\n🧠 Living Software Platform:');
  console.log('   • 1 User Context with 15 identity attributes');
  console.log('   • 1 Project with hierarchical goals, constraints, and decisions');
  console.log('   • 3 Intent Graphs:');
  console.log('     - SaaS Dashboard Feature (goals, constraints, entities, behaviors, contexts)');
  console.log('     - API Integration Service (resilience patterns)');
  console.log('     - E-commerce Checkout Flow (payment, shipping, orders)');
  console.log('   • 6 Artifacts with versions and links:');
  console.log('     - Dashboard components (React)');
  console.log('     - API schemas (OpenAPI)');
  console.log('     - Test suites (Vitest)');
  console.log('     - Resilient API client (TypeScript)');
  console.log('   • 2 Assembly Cache entries with example XML');
  console.log('   • Artifact outcomes with feedback signals');
  console.log('\n⚡ Living Software Core (WHY → WHAT → HOW → LEARN):');
  console.log('   • ' + intents.length + ' Intents (Business outcomes we\'re pursuing)');
  console.log('     - Reduce churn, Improve onboarding, Increase conversion, Performance, Accessibility');
  console.log('   • ' + capabilities.length + ' Capabilities (What the system can do)');
  console.log('     - Auth, Analytics, Search, Payments, Notifications, Storage');
  console.log('   • ' + signals.length + ' Signals (Continuous evidence streams)');
  console.log('     - Churn rate, Onboarding completion, Conversion, Load time, Error rate, NPS');
  console.log('   • ' + experiments.length + ' Experiments (Hypotheses we\'re testing)');
  console.log('     - Onboarding flow (running), One-click checkout (ready), Dashboard perf (completed)');
  console.log('\n🔐 Demo credentials:');
  console.log('   Email: sarah.chen@acme.tech');
  console.log('   Password: demo-password-123');
  console.log('\n📝 Demo IDs for API testing:');
  console.log('   Tenant: ' + IDS.tenant);
  console.log('   User: ' + IDS.users.sarah);
  console.log('   Workspace: ' + IDS.workspaces.platform);
  console.log('   Intent Graphs: dashboard=' + IDS.intentGraphs.dashboard + ', api=' + IDS.intentGraphs.api);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
