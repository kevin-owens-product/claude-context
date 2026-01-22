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

// Generate consistent UUIDs for demo data
const IDS = {
  tenant: randomUUID(),
  users: {
    sarah: randomUUID(),
    marcus: randomUUID(),
    emily: randomUUID(),
    alex: randomUUID(),
  },
  workspaces: {
    platform: randomUUID(),
    product: randomUUID(),
  },
  graphs: {
    platform: randomUUID(),
    product: randomUUID(),
  },
  nodes: {
    apiDesign: randomUUID(),
    errorHandling: randomUUID(),
    dbDecision: randomUUID(),
    authDecision: randomUUID(),
    githubRepo: randomUUID(),
    uiComponents: randomUUID(),
    formPatterns: randomUUID(),
  },
  slices: {
    auth: randomUUID(),
    rateLimit: randomUUID(),
    search: randomUUID(),
    dashboard: randomUUID(),
  },
  sessions: {
    s1: randomUUID(),
    s2: randomUUID(),
    s3: randomUUID(),
    s4: randomUUID(),
  },
};

async function main() {
  console.log('🌱 Seeding database with realistic demo data...\n');

  // Clean existing data
  console.log('  Cleaning existing data...');
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
  console.log('\n🔐 Demo credentials:');
  console.log('   Email: sarah.chen@acme.tech');
  console.log('   Password: demo-password-123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
