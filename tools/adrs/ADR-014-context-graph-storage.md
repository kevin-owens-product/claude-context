# ADR-014: Context Graph Storage Strategy

**Status:** Accepted
**Date:** January 2026
**Deciders:** Architecture Team
**Categories:** Data, Infrastructure

## Context

Claude Context requires a storage strategy for Context Graphs - living knowledge bases that contain documents, decisions, patterns, and external links with semantic relationships between them. The storage solution must support:

1. **Graph relationships** - Nodes connected by typed edges (references, implements, constrains)
2. **Semantic search** - Vector embeddings for relevance-based retrieval
3. **Multi-tenancy** - Strict tenant isolation at the data layer
4. **Token budget optimization** - Efficient retrieval within context window limits
5. **Real-time sync** - Integration with external tools (GitHub, Notion, Figma)
6. **Freshness tracking** - Validation timestamps and staleness detection

### Options Considered

#### Option A: PostgreSQL with pgvector

Use PostgreSQL as the primary store with pgvector extension for embeddings and adjacency lists for graph relationships.

**Pros:**
- Single database for all data (operational simplicity)
- Strong ACID guarantees
- Mature tooling (Prisma ORM)
- pgvector provides vector similarity search
- Row Level Security (RLS) for tenant isolation
- Already in Forge stack

**Cons:**
- Graph traversals require recursive CTEs (complex queries)
- Vector search performance degrades at scale (>1M vectors)
- Not optimized for graph algorithms

#### Option B: PostgreSQL + Neo4j

Use PostgreSQL for structured data and Neo4j for graph relationships.

**Pros:**
- Native graph queries (Cypher) for complex traversals
- Optimized for relationship-heavy workloads
- Visualization tools included

**Cons:**
- Two databases to maintain
- Data synchronization complexity
- Additional infrastructure cost
- Neo4j licensing for enterprise features

#### Option C: PostgreSQL + Dedicated Vector DB (Pinecone/Weaviate)

Use PostgreSQL for structured data and a dedicated vector database for embeddings.

**Pros:**
- Best-in-class vector search performance
- Scales to billions of vectors
- Managed service options

**Cons:**
- Three systems to coordinate (Postgres, Vector DB, application)
- Higher latency for combined queries
- Additional cost and vendor dependency

## Decision

**We will use Option A: PostgreSQL with pgvector.**

Rationale:
1. **Simplicity** - Single database reduces operational complexity
2. **Forge alignment** - Consistent with existing Forge stack
3. **Sufficient scale** - pgvector handles millions of vectors adequately for our use case
4. **Tenant isolation** - RLS provides proven isolation model
5. **Evolution path** - Can migrate to dedicated vector DB later if needed

### Implementation Details

#### Schema Design

```sql
-- Context Graphs
CREATE TABLE context_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Context Nodes
CREATE TABLE context_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  graph_id UUID NOT NULL REFERENCES context_graphs(id),

  -- Node metadata
  type VARCHAR(50) NOT NULL, -- 'document', 'decision', 'pattern', 'external_link'
  layer VARCHAR(50) NOT NULL, -- 'organizational', 'workspace', 'slice'
  name VARCHAR(255) NOT NULL,
  content TEXT,

  -- Embeddings for semantic search
  embedding vector(1536), -- OpenAI ada-002 dimensions

  -- Freshness tracking
  freshness VARCHAR(20) DEFAULT 'current', -- 'current', 'stale', 'archived'
  validated_at TIMESTAMPTZ,
  external_url TEXT,
  external_sync_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Context Edges (relationships)
CREATE TABLE context_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  graph_id UUID NOT NULL REFERENCES context_graphs(id),
  source_node_id UUID NOT NULL REFERENCES context_nodes(id),
  target_node_id UUID NOT NULL REFERENCES context_nodes(id),
  relationship_type VARCHAR(50) NOT NULL, -- 'references', 'implements', 'constrains'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_context_nodes_graph ON context_nodes(graph_id);
CREATE INDEX idx_context_nodes_tenant ON context_nodes(tenant_id);
CREATE INDEX idx_context_nodes_embedding ON context_nodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_context_edges_source ON context_edges(source_node_id);
CREATE INDEX idx_context_edges_target ON context_edges(target_node_id);

-- Row Level Security
ALTER TABLE context_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_graphs ON context_graphs
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_nodes ON context_nodes
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_edges ON context_edges
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

#### Semantic Search Query

```sql
-- Find relevant context nodes for a query
SELECT
  id, name, content, layer, type,
  1 - (embedding <=> $1) AS similarity
FROM context_nodes
WHERE graph_id = $2
  AND freshness != 'archived'
ORDER BY embedding <=> $1
LIMIT 20;
```

#### Graph Traversal Query

```sql
-- Find all nodes connected to a starting node (2 levels deep)
WITH RECURSIVE connected AS (
  SELECT source_node_id, target_node_id, relationship_type, 1 AS depth
  FROM context_edges
  WHERE source_node_id = $1

  UNION ALL

  SELECT e.source_node_id, e.target_node_id, e.relationship_type, c.depth + 1
  FROM context_edges e
  JOIN connected c ON e.source_node_id = c.target_node_id
  WHERE c.depth < 2
)
SELECT DISTINCT n.*
FROM connected c
JOIN context_nodes n ON n.id = c.target_node_id;
```

## Consequences

### Positive

- **Operational simplicity** - Single database for all Context data
- **Consistent tooling** - Prisma ORM, existing migrations workflow
- **Proven isolation** - RLS for multi-tenancy
- **Cost effective** - No additional database services

### Negative

- **Graph query complexity** - Recursive CTEs less intuitive than Cypher
- **Vector scale limits** - May need to shard or migrate at >10M vectors
- **No native graph visualization** - Must build custom tooling

### Mitigations

1. **Abstract graph queries** - Encapsulate in ContextGraphRepository
2. **Monitor vector performance** - Alert at 70% of capacity threshold
3. **Design for migration** - Repository pattern allows swapping implementations

## References

- [pgvector documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Recursive CTEs](https://www.postgresql.org/docs/current/queries-with.html)
- [Forge Method v4.1 - Database Architecture](../the-forge-method.md)
