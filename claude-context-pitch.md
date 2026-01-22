# Claude Context: The Missing Layer

**A Product Vision for Anthropic**

*Kevin Schouweiler | January 2026*

---

## The Core Insight

Claude is exceptional at reasoning. But Claude's effectiveness is bounded by context.

Every day, millions of professionals open Claude with the same friction: they must re-explain who they are, what they're building, what decisions have been made, and what constraints apply. The context that makes Claude genuinely useful lives fragmented across Notion, Confluence, Slack, GitHub, Figma, and a dozen other tools—none of which Claude can see.

**Claude Context** is the infrastructure layer that solves this problem. It turns Claude from a brilliant stranger into a knowledgeable colleague who understands your organization, your projects, and your work—persistently, securely, and intelligently.

---

## Strategic Fit

### Anthropic's Current Product Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONSUMER LAYER                               │
│  Claude Chat (claude.ai) │ Claude App (iOS/Android/Desktop)      │
├─────────────────────────────────────────────────────────────────┤
│                     PROFESSIONAL LAYER                           │
│  Claude Code (CLI)  │  Cowork (Desktop)  │  Chrome/Excel (Beta)  │
├─────────────────────────────────────────────────────────────────┤
│                     DEVELOPER LAYER                              │
│  Claude API  │  MCP Servers  │  Prompt Caching  │  Batch API     │
├─────────────────────────────────────────────────────────────────┤
│                     ??? MISSING LAYER ???                        │
│  Persistent organizational context │ Work structure │ Feedback   │
└─────────────────────────────────────────────────────────────────┘
```

Anthropic has built excellent interfaces (Chat, Code, Cowork) and excellent infrastructure (API, MCP, caching). But there's a critical gap: **no product manages the context that makes Claude effective across sessions, across tools, and across teams.**

Memory is a start. MCP connectors are a start. But these are features, not a product. Organizations need a *system* for making Claude contextually intelligent.

### The Competitive Threat

This gap will be filled—by someone. Microsoft is building Copilot Studio. Notion is building Notion AI with workspace context. Linear is adding AI with project context. Salesforce has Einstein with CRM context.

Every vertical SaaS company is racing to add AI with *their* context. If Anthropic doesn't own the context layer, Claude becomes a commodity API behind someone else's product—and someone else's brand.

### The Strategic Opportunity

Claude Context positions Anthropic to:

1. **Capture enterprise value** – Organizations pay for outcomes, not tokens. Context transforms Claude from a tool into a platform.

2. **Create switching costs** – Context graphs are proprietary. Once built, they become organizational assets that make switching costly.

3. **Improve Claude itself** – Structured feedback from Context users becomes training signal. Real-world context patterns inform model development.

4. **Enable the ecosystem** – MCP servers become more valuable when they connect to persistent context. Third-party integrations compound.

---

## Product Definition

### What is Claude Context?

Claude Context is an organizational knowledge platform that makes Claude contextually intelligent. It provides:

1. **Context Graphs** – Living knowledge bases that Claude can consume
2. **Work Slices** – AI-ready work units with rich, structured context
3. **Feedback Loops** – Systems to capture and learn from Claude's effectiveness
4. **Cross-Product Intelligence** – Shared context across Chat, Code, and Cowork

### Design Principles

Claude Context inherits Anthropic's product design language while establishing its own identity:

| Principle | Application |
|-----------|-------------|
| **Context-first** | Every view shows what Claude will see. Users understand Claude's perspective. |
| **Keyboard-native** | Power users never touch the mouse. Command palette for everything. |
| **Progressive disclosure** | Simple by default, powerful when needed. No walls of configuration. |
| **Human-in-the-loop** | Claude suggests, humans approve. Review flows are first-class. |
| **Transparent reasoning** | Show why Claude used specific context. Explain relevance scoring. |

---

## Product Architecture

### Form Factor Mapping

Claude Context manifests differently in each Anthropic product:

#### In Claude Chat (claude.ai)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Claude                                          [Context ▾] [⚙]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  🧠 Context Active: Product Strategy Q1                          │ │
│  │  ├─ Brand Guidelines (org)                                       │ │
│  │  ├─ API v3 Architecture Decision (workspace)                     │ │
│  │  └─ User Auth Redesign Slice (active)                           │ │
│  │                                            [Manage Context →]    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Claude is using 47 context documents (18,432 tokens)            │ │
│  │  View what Claude sees →                                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  You: Help me write the technical spec for the auth service          │
│                                                                       │
│  Claude: Based on your API v3 architecture decision to use           │
│  microservices with gRPC, and the auth redesign requirements in      │
│  your current slice, here's a technical specification that aligns    │
│  with your existing patterns...                                      │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Key UX Patterns:**
- Context panel collapses to a single indicator when not in use
- "View what Claude sees" provides full transparency
- Context automatically selected based on conversation topic
- Users can pin/unpin context documents mid-conversation

#### In Claude Code (CLI)

```bash
$ claude context status
Active Context: giantrobots/payments-service
├── Org Context: 12 documents (brand, security, API standards)
├── Repo Context: 8 documents (architecture, patterns, conventions)
└── Slice Context: "Payment retry logic" (3 documents, 5 constraints)

Token Budget: 18,432 / 100,000 (18%)

$ claude context add ./docs/stripe-integration.md
Added to slice context. Relevance: HIGH (payment terminology match)

$ claude context compile --preview
[Previewing compiled context for active slice...]

$ claude "implement the payment retry logic per the slice spec"
[Using context: 23 documents, 18 constraints, 4 patterns]
```

**Key UX Patterns:**
- Context commands mirror git workflow (`status`, `add`, `diff`)
- Integrates with existing `claude` CLI seamlessly
- Context auto-detected from git repo and branch
- Slice context linked to GitHub issues/PRs

#### In Cowork (Desktop App)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cowork                                                    [─] [□] [×] │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────────────────┐ │
│  │          │  │  Active Slice: User Auth Redesign                   │ │
│  │  Context │  │                                                      │ │
│  │  Graph   │  │  Outcome: Users can authenticate via SSO with <30s  │ │
│  │          │  │  session establishment time                         │ │
│  │  [tree   │  │                                                      │ │
│  │   view]  │  │  Context Package                 Completeness: 87%  │ │
│  │          │  │  ├─ ✓ Auth patterns doc                             │ │
│  │          │  │  ├─ ✓ Security requirements                         │ │
│  │          │  │  ├─ ✓ Figma designs                                 │ │
│  │          │  │  └─ ⚠ Missing: Error state specifications           │ │
│  │          │  │                                                      │ │
│  │          │  │  ┌────────────────────────────────────────────────┐ │ │
│  │          │  │  │  AI Sessions                                    │ │ │
│  │          │  │  │  Today: 3 sessions │ This slice: 12 total      │ │ │
│  │          │  │  │  Feedback avg: 4.2/5 │ First-pass acceptance: 78%│ │
│  │          │  │  └────────────────────────────────────────────────┘ │ │
│  │          │  │                                                      │ │
│  │          │  │  [Open in Claude Chat]  [Continue in Claude Code]   │ │
│  └──────────┘  └─────────────────────────────────────────────────────┘ │
│                                                                        │
│  Quick Actions: ⌘N New Slice │ ⌘K Command │ ⌘⇧C Compile Context       │
└────────────────────────────────────────────────────────────────────────┘
```

**Key UX Patterns:**
- Visual context graph for knowledge exploration
- Slice management as primary workflow
- Quality indicators and completeness scoring
- Seamless handoff to other Claude products

---

## Core Concepts

### The Slice: AI-Ready Work Units

The **Slice** is Claude Context's core innovation—a work unit designed for human-AI collaboration:

```
┌─────────────────────────────────────────────────────────────────┐
│  SLICE: Payment Retry Logic                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Outcome Statement                                               │
│  ─────────────────                                               │
│  Failed payments automatically retry with exponential backoff,   │
│  respecting Stripe's rate limits and card network rules,        │
│  achieving 23% recovery rate on soft declines.                  │
│                                                                  │
│  Context Package                            [Compile] [Preview]  │
│  ───────────────                                                 │
│  ▸ Organizational: Brand, Security policies, API standards       │
│  ▸ Domain: Payment architecture, Stripe patterns, Error codes   │
│  ▸ Slice-specific: Retry requirements doc, Figma error states   │
│                                                                  │
│  Constraints                                                     │
│  ───────────                                                     │
│  • Must use idempotency keys for all Stripe calls               │
│  • Maximum 3 retry attempts per payment                         │
│  • No retries on hard declines (fraud, invalid card)            │
│  • Must log all retry attempts for compliance                   │
│                                                                  │
│  Acceptance Criteria                                             │
│  ───────────────────                                             │
│  □ Soft declines trigger retry within 15 minutes                │
│  □ Hard declines immediately marked terminal                    │
│  □ Retry backoff: 15min, 1hr, 4hr                              │
│  □ Dashboard shows retry status and outcomes                    │
│                                                                  │
│  Anti-Scope (Explicitly Excluded)                                │
│  ────────────────────────────────                                │
│  • Fraud detection (separate initiative)                        │
│  • Subscription billing (different service)                     │
│  • Payment method updates (user-facing flow)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why Slices Matter:**

Traditional work management (Jira tickets, Linear issues) optimizes for human estimation and tracking. Slices optimize for AI collaboration:

| Traditional Ticket | AI-Ready Slice |
|-------------------|----------------|
| "Implement payment retries" | Full outcome statement with success metrics |
| Links to other tickets | Compiled context package ready for Claude |
| Story points (human estimation) | Estimated AI sessions + constraints |
| Comments as discussion | Structured feedback on AI effectiveness |
| Binary done/not done | Quality gates with dimensional scoring |

### The Context Graph

Each workspace maintains a **Context Graph**—a living knowledge base optimized for Claude consumption:

```
                    ┌─────────────────┐
                    │   Brand Voice   │
                    │   Guidelines    │
                    └────────┬────────┘
                             │ references
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  API Standards  │ │  Security       │ │  Design System  │
│  (patterns)     │ │  Requirements   │ │  (patterns)     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │ implements        │ constrains        │ styles
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Auth Service   │ │  PCI Compliance │ │  Error States   │
│  Architecture   │◄┤  Decision       │►│  Figma File     │
│  (document)     │ │  (decision)     │ │  (external)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Node Types:**
- **Documents** – Specifications, guides, runbooks
- **Decisions** – ADRs, design decisions with rationale
- **Patterns** – Reusable approaches (code patterns, design patterns)
- **External Links** – Figma, GitHub, Notion references (auto-synced)

**Key Properties:**
- Semantic embeddings for intelligent retrieval
- Freshness tracking (current/stale/archived)
- Validation timestamps (when did a human last confirm accuracy?)
- Relevance scoring per slice

### Context Compilation

When a user starts an AI session, Claude Context **compiles** relevant knowledge into an optimized prompt:

```
Input:
  - Active Slice: Payment Retry Logic
  - User Query: "Help me implement the retry scheduler"
  - Token Budget: 100,000

Process:
  1. Retrieve slice's explicit context package
  2. Query graph for semantically relevant nodes
  3. Score nodes by relevance to query + slice
  4. Summarize long documents to fit budget
  5. Order by importance (constraints first)
  6. Inject organizational context (always included)

Output:
  [ORGANIZATIONAL CONTEXT]
  Your company uses TypeScript with strict mode...
  API standards require idempotency keys...
  
  [DOMAIN CONTEXT]  
  The payment service uses Stripe's API v2023-10-16...
  Retry patterns should follow exponential backoff...
  
  [SLICE CONTEXT]
  Outcome: Achieve 23% recovery rate on soft declines...
  Constraints: Max 3 retries, no hard decline retries...
  
  [USER QUERY]
  Help me implement the retry scheduler
```

---

## Feedback Loops

Claude Context captures structured feedback to continuously improve AI effectiveness:

### Session Feedback

After each AI session, users provide lightweight feedback:

```
┌─────────────────────────────────────────────────────────────────┐
│  Was this helpful?  [👍 Yes]  [👎 No]  [Skip]                   │
│                                                                  │
│  [Optional] What would have helped?                              │
│  ○ Missing context (which?)                                      │
│  ○ Wrong context included                                        │
│  ○ Misunderstood constraints                                     │
│  ○ Hallucinated information                                      │
│  ○ Style/formatting issue                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Output Feedback

When AI outputs are reviewed, capture quality signals:

```
┌─────────────────────────────────────────────────────────────────┐
│  Review: Technical Spec Draft                                    │
├─────────────────────────────────────────────────────────────────┤
│  Verdict: [Approved] [Changes Requested] [Rejected]              │
│                                                                  │
│  Quality Dimensions:                                             │
│  Accuracy        [━━━━━━━━━░░] 80%                               │
│  Completeness    [━━━━━━━━━━░] 90%                               │
│  Style Match     [━━━━━━━░░░░] 60%                               │
│                                                                  │
│  AI Errors Found:                                                │
│  □ Hallucinated a library that doesn't exist                    │
│  □ Ignored constraint about rate limiting                        │
│  □ Wrong formatting for code blocks                              │
│                                                                  │
│  Edit Distance: 23% (moderate human revision needed)             │
└─────────────────────────────────────────────────────────────────┘
```

### Aggregated Analytics

Feedback aggregates to workspace-level insights:

```
AI Effectiveness Dashboard
─────────────────────────────────────────────────────────────
                                        This Month    Trend
First-Pass Acceptance Rate                  73%        ↑ 8%
Average Feedback Score                     4.2/5       ↑ 0.3
Human Edit Distance                         18%        ↓ 4%
Most Effective Prompts          "Technical Spec from Slice"
Highest-Value Context           "API Standards v2.1"
Common AI Errors                 Constraint violations (34%)

Recommendation: Add more explicit constraint examples to 
API Standards document. Constraint violations dropped 12% 
when examples were added to Security Requirements.
─────────────────────────────────────────────────────────────
```

---

## Integration Architecture

### MCP Server Integration

Claude Context exposes an MCP server for deep integration:

```typescript
// Claude Context MCP Server
const contextServer = new MCPServer({
  name: "claude-context",
  tools: [
    {
      name: "get_active_context",
      description: "Retrieve compiled context for current work",
      parameters: { slice_id: "string", token_budget: "number" }
    },
    {
      name: "search_context",
      description: "Semantic search across context graph",
      parameters: { query: "string", workspace_id: "string" }
    },
    {
      name: "record_feedback",
      description: "Record feedback on AI session quality",
      parameters: { session_id: "string", score: "number", errors: "array" }
    },
    {
      name: "get_slice",
      description: "Retrieve full slice specification",
      parameters: { slice_id: "string" }
    }
  ]
});
```

### External Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CONTEXT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   GitHub     │    │    Figma     │    │    Slack     │       │
│  │   ─────────  │    │   ─────────  │    │   ─────────  │       │
│  │ • Repos      │    │ • Files      │    │ • Channels   │       │
│  │ • PRs        │    │ • Components │    │ • Threads    │       │
│  │ • Issues     │    │ • Comments   │    │ • Decisions  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Notion     │    │  Confluence  │    │    Linear    │       │
│  │   ─────────  │    │   ─────────  │    │   ─────────  │       │
│  │ • Pages      │    │ • Spaces     │    │ • Issues     │       │
│  │ • Databases  │    │ • Pages      │    │ • Projects   │       │
│  │ • Comments   │    │ • Decisions  │    │ • Cycles     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Bi-directional sync:**
- Import context from external tools
- Push AI outputs back to native tools
- Real-time webhook updates
- Conflict resolution with human review

---

## Pricing Model

### Aligned with Anthropic's Existing Model

| Tier | Price | Includes |
|------|-------|----------|
| **Context Free** | $0/month | 1 workspace, 100 context nodes, 1,000 AI sessions/mo, Basic integrations |
| **Context Pro** | $30/user/mo | Unlimited workspaces, Unlimited context, 10,000 AI sessions/mo, All integrations, Analytics |
| **Context Team** | $50/user/mo | Everything in Pro + Advanced analytics, SSO, Priority support, Audit logs |
| **Context Enterprise** | Custom | Everything in Team + Single-tenant, On-premise option, Custom integrations, SLA |

**Token costs pass through** – Claude API usage billed separately or bundled with existing subscriptions.

**Value alignment** – Price scales with context richness, not arbitrary seat counts. More context = more AI value = higher willingness to pay.

---

## Roadmap

### Phase 1: Foundation (Months 1-4)
- Core context graph and slice management
- Claude Chat integration (context panel)
- GitHub + Notion integrations
- Basic feedback capture
- Single-tenant pilot with design partners

### Phase 2: Professional (Months 4-8)
- Claude Code integration
- Cowork integration
- Advanced context compilation
- MCP server for third-party integration
- Prompt library with effectiveness tracking
- Workspace analytics

### Phase 3: Enterprise (Months 8-12)
- SSO and advanced security
- Multi-provider AI support
- Advanced analytics and reporting
- Migration tools (Jira, Confluence)
- On-premise deployment option

### Phase 4: Platform (Months 12-18)
- Third-party integration marketplace
- Custom workflow builder
- AI fine-tuning from organizational feedback
- Industry-specific templates
- API for embedded experiences

---

## Why Now?

### Market Timing

1. **Enterprise AI adoption is accelerating** – Organizations are moving from experimentation to deployment. They need infrastructure, not just chatbots.

2. **Context is the bottleneck** – Model capabilities have outpaced context systems. Claude can do more than users can explain.

3. **Competition is mobilizing** – Microsoft, Google, and vertical SaaS companies are building context systems. Window of opportunity is 12-18 months.

4. **MCP creates momentum** – Anthropic has already signaled the importance of context with MCP. Claude Context is the product realization of that vision.

### Anthropic's Unique Position

Only Anthropic can build Claude Context:

- **Model access** – Deep integration with Claude's capabilities and roadmap
- **Trust** – Enterprises trust Anthropic with sensitive context
- **Design language** – Unified experience across Chat, Code, and Cowork
- **Feedback loop** – Context usage informs model improvement

---

## Why Me?

I've spent the last year building exactly this system—not as a thought experiment, but as working infrastructure at GWI:

**Built the foundations:**
- Developed comprehensive systems for AI-agent-ready codebases
- Created the GWI Engineering Transformation Platform (CodeScan) for repository scanning
- Designed the NEXUS Platform for AI-native development

**Proven the approach:**
- Rolled out AI tools across Product, Design, and Engineering teams
- Developed enterprise adoption methodologies that actually work
- Measured real-world AI effectiveness improvements

**Written the playbook:**
- Created "The Forge Method" for building enterprise SaaS with AI assistance
- Built "The Forge Factory" for operationalizing AI-augmented delivery
- Documented evaluation frameworks for AI agent effectiveness

I don't need to learn that context is the bottleneck—I've lived it, measured it, and built solutions for it.

---

## Next Steps

1. **Conversation** – I'd welcome the opportunity to discuss this vision in depth
2. **Demo** – I can demonstrate working prototypes of context compilation and slice management
3. **Pilot** – I'd propose starting with 3-5 design partner organizations
4. **Build** – With the right team, Phase 1 is achievable in 4 months

---

*Kevin Schouweiler*  
*kevin@[email] | [LinkedIn/Portfolio]*

