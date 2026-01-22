# Claude Context: C4 Architecture Diagrams

## Level 1: System Context Diagram

Shows Claude Context and its relationships with users and external systems.

```mermaid
C4Context
    title System Context Diagram - Claude Context

    Person(user, "User", "Professional using Claude for work tasks")
    Person(admin, "Workspace Admin", "Manages context and team settings")
    Person(enterprise_admin, "Enterprise Admin", "IT administrator managing organization")

    System(claude_context, "Claude Context", "Organizational knowledge platform that makes Claude contextually intelligent")

    System_Ext(claude_chat, "Claude Chat", "Anthropic's chat interface")
    System_Ext(claude_code, "Claude Code", "Anthropic's CLI tool")
    System_Ext(cowork, "Cowork", "Anthropic's desktop app")

    System_Ext(github, "GitHub", "Source code and issues")
    System_Ext(notion, "Notion", "Documentation and wikis")
    System_Ext(figma, "Figma", "Design files")
    System_Ext(slack, "Slack", "Team communication")

    System_Ext(auth0, "Auth0", "Identity provider")
    System_Ext(stripe, "Stripe", "Billing and subscriptions")

    Rel(user, claude_context, "Manages context, creates slices, provides feedback")
    Rel(admin, claude_context, "Configures workspace, reviews analytics")
    Rel(enterprise_admin, claude_context, "Manages SSO, compliance, audit logs")

    Rel(claude_context, claude_chat, "Provides compiled context via MCP")
    Rel(claude_context, claude_code, "Provides context via CLI")
    Rel(claude_context, cowork, "Provides context graph visualization")

    Rel(claude_context, github, "Syncs repos, PRs, issues")
    Rel(claude_context, notion, "Syncs pages, databases")
    Rel(claude_context, figma, "Syncs design files")
    Rel(claude_context, slack, "Syncs channels, captures decisions")

    Rel(claude_context, auth0, "Authenticates users, SSO")
    Rel(claude_context, stripe, "Manages subscriptions")
```

## Level 2: Container Diagram

Shows the major containers (applications, services, data stores) within Claude Context.

```mermaid
C4Container
    title Container Diagram - Claude Context

    Person(user, "User", "Professional using Claude")

    System_Boundary(claude_context, "Claude Context") {
        Container(web_app, "Web Application", "React", "Context management UI, slice editor, analytics dashboard")
        Container(api, "API Server", "NestJS", "REST + tRPC API for all operations")
        Container(mcp_server, "MCP Server", "Node.js", "Model Context Protocol server for Claude integration")
        Container(worker, "Background Worker", "Node.js + BullMQ", "Processes sync jobs, feedback aggregation, exports")

        ContainerDb(postgres, "PostgreSQL", "PostgreSQL 16 + pgvector", "Context graphs, slices, feedback, users")
        ContainerDb(redis, "Redis", "Redis 7", "Sessions, cache, real-time counters, job queue")
        ContainerDb(s3, "Object Storage", "S3", "Document uploads, exports, backups")
    }

    System_Ext(claude_products, "Claude Products", "Chat, Code, Cowork")
    System_Ext(integrations, "External Integrations", "GitHub, Notion, Figma, Slack")
    System_Ext(auth0, "Auth0", "Identity provider")

    Rel(user, web_app, "Uses", "HTTPS")
    Rel(web_app, api, "API calls", "HTTPS/tRPC")
    Rel(claude_products, mcp_server, "Requests context", "MCP Protocol")
    Rel(mcp_server, api, "Internal API", "gRPC")

    Rel(api, postgres, "Reads/writes", "Prisma")
    Rel(api, redis, "Caches, sessions", "ioredis")
    Rel(worker, postgres, "Processes jobs", "Prisma")
    Rel(worker, redis, "Job queue", "BullMQ")
    Rel(worker, s3, "Stores exports", "AWS SDK")

    Rel(worker, integrations, "Syncs data", "REST APIs")
    Rel(api, auth0, "Authenticates", "OIDC")
```

## Level 3: Component Diagram - API Server

Shows the internal components of the API Server container.

```mermaid
C4Component
    title Component Diagram - API Server

    Container_Boundary(api, "API Server") {
        Component(auth_module, "Auth Module", "NestJS Module", "JWT validation, API key auth, permissions")
        Component(context_module, "Context Module", "NestJS Module", "Context graphs, nodes, edges, compilation")
        Component(slice_module, "Slice Module", "NestJS Module", "Slice CRUD, state machine, workflow")
        Component(feedback_module, "Feedback Module", "NestJS Module", "Session tracking, feedback capture, analytics")
        Component(integration_module, "Integration Module", "NestJS Module", "GitHub, Notion, Figma, Slack connectors")
        Component(workspace_module, "Workspace Module", "NestJS Module", "Workspace settings, members, billing")

        Component(context_service, "ContextService", "Service", "Context compilation, semantic search")
        Component(slice_service, "SliceService", "Service", "Slice lifecycle, state transitions")
        Component(feedback_service, "FeedbackService", "Service", "Feedback processing, metrics aggregation")
        Component(sync_service, "SyncService", "Service", "External integration synchronization")

        Component(context_repo, "ContextRepository", "Repository", "Context graph data access")
        Component(slice_repo, "SliceRepository", "Repository", "Slice data access")
        Component(feedback_repo, "FeedbackRepository", "Repository", "Feedback data access")

        Component(trpc_router, "tRPC Router", "Router", "Type-safe internal API")
        Component(rest_controller, "REST Controllers", "Controllers", "Public REST API")
    }

    ContainerDb(postgres, "PostgreSQL", "Database")
    ContainerDb(redis, "Redis", "Cache")
    Container(worker, "Background Worker", "Job processor")

    Rel(rest_controller, auth_module, "Authenticates requests")
    Rel(trpc_router, auth_module, "Authenticates requests")

    Rel(rest_controller, context_module, "Routes to")
    Rel(rest_controller, slice_module, "Routes to")
    Rel(rest_controller, feedback_module, "Routes to")
    Rel(trpc_router, context_module, "Routes to")
    Rel(trpc_router, slice_module, "Routes to")

    Rel(context_module, context_service, "Uses")
    Rel(slice_module, slice_service, "Uses")
    Rel(feedback_module, feedback_service, "Uses")
    Rel(integration_module, sync_service, "Uses")

    Rel(context_service, context_repo, "Uses")
    Rel(slice_service, slice_repo, "Uses")
    Rel(feedback_service, feedback_repo, "Uses")

    Rel(context_repo, postgres, "Queries")
    Rel(slice_repo, postgres, "Queries")
    Rel(feedback_repo, postgres, "Queries")

    Rel(context_service, redis, "Caches")
    Rel(feedback_service, redis, "Real-time counters")
    Rel(feedback_service, worker, "Queues jobs")
```

## Level 3: Component Diagram - Context Service

Detailed view of the Context Service and its subcomponents.

```mermaid
C4Component
    title Component Diagram - Context Service

    Container_Boundary(context_service, "Context Service") {
        Component(graph_manager, "GraphManager", "Class", "CRUD operations for context graphs")
        Component(node_manager, "NodeManager", "Class", "CRUD operations for context nodes")
        Component(edge_manager, "EdgeManager", "Class", "Relationship management between nodes")

        Component(compiler, "ContextCompiler", "Class", "Assembles context for AI sessions")
        Component(token_optimizer, "TokenOptimizer", "Class", "Optimizes context within token budget")
        Component(relevance_scorer, "RelevanceScorer", "Class", "Scores document relevance to query")

        Component(semantic_search, "SemanticSearch", "Class", "Vector similarity search via pgvector")
        Component(embedding_service, "EmbeddingService", "Class", "Generates embeddings for documents")

        Component(freshness_tracker, "FreshnessTracker", "Class", "Tracks document staleness")
        Component(sync_manager, "SyncManager", "Class", "Coordinates external integrations")
    }

    ContainerDb(postgres, "PostgreSQL + pgvector", "Database")
    ContainerDb(redis, "Redis", "Cache")
    System_Ext(openai, "OpenAI API", "Embeddings")

    Rel(graph_manager, postgres, "CRUD")
    Rel(node_manager, postgres, "CRUD")
    Rel(edge_manager, postgres, "CRUD")

    Rel(compiler, graph_manager, "Gets graph")
    Rel(compiler, node_manager, "Gets nodes")
    Rel(compiler, relevance_scorer, "Scores relevance")
    Rel(compiler, token_optimizer, "Optimizes tokens")

    Rel(relevance_scorer, semantic_search, "Searches")
    Rel(semantic_search, postgres, "Vector queries")
    Rel(semantic_search, redis, "Caches results")

    Rel(embedding_service, openai, "Generates embeddings")
    Rel(node_manager, embedding_service, "Embeds new docs")

    Rel(freshness_tracker, node_manager, "Updates freshness")
    Rel(sync_manager, freshness_tracker, "Triggers refresh")
```

## Data Flow: Context Compilation

Shows how context is compiled for an AI session.

```mermaid
sequenceDiagram
    participant User
    participant ClaudeChat as Claude Chat
    participant MCP as MCP Server
    participant API as API Server
    participant Compiler as ContextCompiler
    participant Search as SemanticSearch
    participant DB as PostgreSQL

    User->>ClaudeChat: Start session with query
    ClaudeChat->>MCP: get_active_context(slice_id, token_budget)
    MCP->>API: Compile context request

    API->>Compiler: compile(workspace, slice, query, budget)

    Compiler->>DB: Get organizational context (always included)
    DB-->>Compiler: Org documents

    Compiler->>DB: Get slice context package
    DB-->>Compiler: Slice documents + constraints

    Compiler->>Search: Find relevant workspace docs
    Search->>DB: Vector similarity search
    DB-->>Search: Ranked documents
    Search-->>Compiler: Relevant documents

    Compiler->>Compiler: Score and rank all documents
    Compiler->>Compiler: Optimize for token budget
    Compiler->>Compiler: Format compiled context

    Compiler-->>API: Compiled context
    API-->>MCP: Context response
    MCP-->>ClaudeChat: Inject into prompt

    ClaudeChat->>User: AI response with context
```

## Data Flow: Feedback Collection

Shows how feedback flows through the system.

```mermaid
sequenceDiagram
    participant User
    participant UI as Web App
    participant API as API Server
    participant Queue as BullMQ
    participant Worker as Worker
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>UI: Rate session (thumbs up/down)
    UI->>API: POST /feedback

    API->>DB: Store feedback
    API->>Queue: Queue processing job
    API-->>UI: 200 OK

    Queue->>Worker: Process feedback job

    Worker->>Redis: Update real-time counters
    Worker->>DB: Update context effectiveness scores

    Note over Worker: If negative feedback with error categories

    Worker->>DB: Log error pattern
    Worker->>DB: Update document relevance weights

    Note over Worker: Daily aggregation job

    Worker->>DB: Calculate daily metrics
    Worker->>DB: Store in feedback_metrics_daily
```

## Deployment Architecture

```mermaid
C4Deployment
    title Deployment Diagram - Claude Context (AWS)

    Deployment_Node(aws, "AWS", "Cloud Provider") {
        Deployment_Node(region_us, "us-east-1", "Primary Region") {
            Deployment_Node(vpc, "VPC", "Network Isolation") {
                Deployment_Node(public_subnet, "Public Subnet") {
                    Deployment_Node(alb, "Application Load Balancer") {
                        Container(lb, "ALB", "Load Balancer", "Routes traffic, SSL termination")
                    }
                }

                Deployment_Node(private_subnet, "Private Subnet") {
                    Deployment_Node(ecs, "ECS Cluster") {
                        Container(api_service, "API Service", "Fargate", "3 tasks, auto-scaling")
                        Container(worker_service, "Worker Service", "Fargate", "2 tasks")
                        Container(mcp_service, "MCP Service", "Fargate", "2 tasks")
                    }
                }

                Deployment_Node(data_subnet, "Data Subnet") {
                    Deployment_Node(rds, "RDS") {
                        ContainerDb(postgres_primary, "PostgreSQL Primary", "db.r6g.xlarge", "Primary database")
                        ContainerDb(postgres_replica, "PostgreSQL Replica", "db.r6g.large", "Read replica")
                    }
                    Deployment_Node(elasticache, "ElastiCache") {
                        ContainerDb(redis_cluster, "Redis Cluster", "cache.r6g.large", "3-node cluster")
                    }
                }
            }
        }

        Deployment_Node(global, "Global Services") {
            Deployment_Node(cloudfront, "CloudFront") {
                Container(cdn, "CDN", "CloudFront", "Static assets, caching")
            }
            Deployment_Node(s3_node, "S3") {
                ContainerDb(s3_bucket, "S3 Bucket", "S3", "Documents, exports")
            }
        }
    }

    Rel(cdn, lb, "Routes API requests")
    Rel(lb, api_service, "Load balances")
    Rel(api_service, postgres_primary, "Writes")
    Rel(api_service, postgres_replica, "Reads")
    Rel(api_service, redis_cluster, "Sessions, cache")
    Rel(worker_service, postgres_primary, "Processes jobs")
    Rel(worker_service, s3_bucket, "Stores exports")
```

## References

- [C4 Model](https://c4model.com/)
- [Mermaid C4 Diagrams](https://mermaid.js.org/syntax/c4.html)
- [ADR-014: Context Graph Storage](../adrs/ADR-014-context-graph-storage.md)
- [ADR-015: Slice State Machine](../adrs/ADR-015-slice-state-machine.md)
- [ADR-016: Feedback Pipeline](../adrs/ADR-016-feedback-collection-pipeline.md)
