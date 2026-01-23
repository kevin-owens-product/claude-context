# SPEC-003: Artifact Lifecycle Technical Specification

## Document Information
| Field | Value |
|-------|-------|
| **Component** | Artifact Lifecycle Manager |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Related PRD** | PRD-003: Living Artifacts |

---

## Overview

This specification defines the technical implementation of Living Artifacts—how they are created, stored, versioned, evolved, and synchronized across the platform.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ARTIFACT LIFECYCLE MANAGER                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         API LAYER                                 │  │
│  │   /artifacts  /versions  /feedback  /sync  /export               │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
│                                │                                        │
│  ┌─────────────────────────────▼────────────────────────────────────┐  │
│  │                      SERVICE LAYER                                │  │
│  │                                                                   │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │  │
│  │  │  Artifact   │ │  Version    │ │  Feedback   │ │    Sync    │ │  │
│  │  │  Service    │ │  Service    │ │  Service    │ │  Service   │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │  │
│  └─────────────────────────────┬────────────────────────────────────┘  │
│                                │                                        │
│  ┌─────────────────────────────▼────────────────────────────────────┐  │
│  │                     STORAGE LAYER                                 │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  PostgreSQL  │  │      S3      │  │    Redis     │           │  │
│  │  │  (Metadata)  │  │  (Content)   │  │   (Cache)    │           │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Database Schema

```sql
-- Artifacts table
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_id VARCHAR(12) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    project_id UUID,
    intent_graph_id UUID,
    
    -- Basic info
    name VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Content reference
    content_type VARCHAR(100) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_size INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    intent_version INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Origin
    origin_surface VARCHAR(50) NOT NULL,
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_artifacts_user ON artifacts(user_id);
CREATE INDEX idx_artifacts_project ON artifacts(project_id);
CREATE INDEX idx_artifacts_short_id ON artifacts(short_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_artifacts_status ON artifacts(status);
CREATE INDEX idx_artifacts_updated ON artifacts(updated_at DESC);
CREATE INDEX idx_artifacts_name_search ON artifacts USING gin(to_tsvector('english', name));

-- Artifact versions
CREATE TABLE artifact_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    version INTEGER NOT NULL,
    
    -- Content
    content_hash VARCHAR(64) NOT NULL,
    content_size INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    
    -- Change tracking
    intent_version INTEGER,
    change_reason TEXT,
    change_type VARCHAR(50), -- create, update, evolve, revert
    
    -- Diff info
    parent_version INTEGER,
    diff_storage_key VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(50), -- user, system, inference
    
    CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(artifact_id, version)
);

CREATE INDEX idx_versions_artifact ON artifact_versions(artifact_id);
CREATE INDEX idx_versions_created ON artifact_versions(created_at DESC);

-- Intent node links
CREATE TABLE artifact_intent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    intent_node_id UUID NOT NULL,
    intent_node_type VARCHAR(50) NOT NULL, -- goal, constraint, behavior, entity
    link_type VARCHAR(50) NOT NULL, -- implements, constrained_by, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(artifact_id, intent_node_id)
);

CREATE INDEX idx_intent_links_artifact ON artifact_intent_links(artifact_id);
CREATE INDEX idx_intent_links_node ON artifact_intent_links(intent_node_id);

-- Feedback signals
CREATE TABLE artifact_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    version INTEGER,
    
    -- Signal
    signal_type VARCHAR(50) NOT NULL, -- rating, comment, implicit
    signal_value JSONB NOT NULL,
    
    -- Context
    source VARCHAR(50) NOT NULL, -- user, system, integration
    surface VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_feedback_artifact ON artifact_feedback(artifact_id);
CREATE INDEX idx_feedback_type ON artifact_feedback(signal_type);

-- External links
CREATE TABLE artifact_external_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    
    -- External system
    system VARCHAR(50) NOT NULL, -- github, gitlab, gdocs, notion
    external_id VARCHAR(500) NOT NULL,
    external_url TEXT,
    
    -- Sync state
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- to_external, from_external, bidirectional
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'synced', -- synced, pending, conflict, error
    conflict_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(artifact_id, system, external_id)
);

CREATE INDEX idx_external_artifact ON artifact_external_links(artifact_id);
CREATE INDEX idx_external_system ON artifact_external_links(system);

-- Export tracking
CREATE TABLE artifact_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    version INTEGER NOT NULL,
    
    export_format VARCHAR(50) NOT NULL,
    export_path TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_exports_artifact ON artifact_exports(artifact_id);
```

### TypeScript Interfaces

```typescript
interface Artifact {
  id: string;
  shortId: string;
  userId: string;
  projectId?: string;
  intentGraphId?: string;
  
  name: string;
  type: ArtifactType;
  status: ArtifactStatus;
  
  contentType: string;
  contentHash: string;
  contentSize: number;
  storageKey: string;
  
  version: number;
  intentVersion?: number;
  
  metadata: Record<string, any>;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  
  originSurface: Surface;
  
  // Loaded relations
  versions?: ArtifactVersion[];
  intentLinks?: ArtifactIntentLink[];
  feedback?: ArtifactFeedback[];
  externalLinks?: ArtifactExternalLink[];
}

type ArtifactType = 
  | 'code'
  | 'component'
  | 'document'
  | 'diagram'
  | 'schema'
  | 'config'
  | 'test'
  | 'composite';

type ArtifactStatus = 
  | 'draft'
  | 'active'
  | 'deprecated'
  | 'archived';

interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: number;
  
  contentHash: string;
  contentSize: number;
  storageKey: string;
  
  intentVersion?: number;
  changeReason?: string;
  changeType: 'create' | 'update' | 'evolve' | 'revert';
  
  parentVersion?: number;
  diffStorageKey?: string;
  
  createdAt: Date;
  createdBy: 'user' | 'system' | 'inference';
}

interface ArtifactIntentLink {
  id: string;
  artifactId: string;
  intentNodeId: string;
  intentNodeType: 'goal' | 'constraint' | 'behavior' | 'entity';
  linkType: 'implements' | 'constrained_by' | 'uses' | 'produces';
  createdAt: Date;
}

interface ArtifactFeedback {
  id: string;
  artifactId: string;
  version?: number;
  
  signalType: 'rating' | 'comment' | 'implicit';
  signalValue: any;
  
  source: 'user' | 'system' | 'integration';
  surface?: Surface;
  
  createdAt: Date;
}

interface ArtifactExternalLink {
  id: string;
  artifactId: string;
  
  system: 'github' | 'gitlab' | 'gdocs' | 'notion' | 'local';
  externalId: string;
  externalUrl?: string;
  
  syncDirection: 'to_external' | 'from_external' | 'bidirectional';
  lastSyncedAt?: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  conflictData?: any;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Content Storage

### Storage Strategy

| Content Size | Storage | Rationale |
|--------------|---------|-----------|
| < 64KB | PostgreSQL JSONB | Fast access, atomic with metadata |
| 64KB - 50MB | S3 | Scalable, cost-effective |
| > 50MB | Rejected | Size limit enforced |

### S3 Structure

```
s3://living-artifacts-{env}/
├── {user_id}/
│   ├── {artifact_id}/
│   │   ├── v1/
│   │   │   ├── content.{ext}
│   │   │   └── metadata.json
│   │   ├── v2/
│   │   │   ├── content.{ext}
│   │   │   ├── diff.patch
│   │   │   └── metadata.json
│   │   └── ...
│   └── ...
└── ...
```

### Content Operations

```typescript
class ContentStorage {
  async store(
    userId: string,
    artifactId: string,
    version: number,
    content: Buffer,
    contentType: string
  ): Promise<StorageResult> {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const size = content.length;
    
    if (size > MAX_SIZE) {
      throw new ArtifactTooLargeError(size, MAX_SIZE);
    }
    
    if (size < INLINE_THRESHOLD) {
      // Store inline in Postgres
      return this.storeInline(artifactId, version, content, hash);
    } else {
      // Store in S3
      const key = `${userId}/${artifactId}/v${version}/content`;
      await this.s3.putObject({
        Bucket: BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType,
        Metadata: { hash, artifactId, version: String(version) }
      });
      return { storageKey: key, hash, size };
    }
  }
  
  async retrieve(storageKey: string): Promise<Buffer> {
    if (storageKey.startsWith('inline:')) {
      return this.retrieveInline(storageKey);
    }
    const response = await this.s3.getObject({
      Bucket: BUCKET,
      Key: storageKey
    });
    return response.Body as Buffer;
  }
  
  async generateDiff(
    oldContent: Buffer,
    newContent: Buffer
  ): Promise<Buffer> {
    // Use diff-match-patch for text, binary diff for others
    const diff = diffMatchPatch.diff_main(
      oldContent.toString('utf-8'),
      newContent.toString('utf-8')
    );
    return Buffer.from(JSON.stringify(diff));
  }
}
```

---

## Artifact Lifecycle Operations

### Create Artifact

```typescript
async function createArtifact(
  input: CreateArtifactInput,
  context: RequestContext
): Promise<Artifact> {
  // 1. Generate IDs
  const id = uuid();
  const shortId = generateShortId(); // 8-char alphanumeric
  
  // 2. Store content
  const { storageKey, hash, size } = await contentStorage.store(
    context.userId,
    id,
    1, // version 1
    input.content,
    input.contentType
  );
  
  // 3. Create artifact record
  const artifact = await db.artifacts.create({
    id,
    shortId,
    userId: context.userId,
    projectId: input.projectId,
    intentGraphId: input.intentGraphId,
    name: input.name,
    type: input.type,
    status: 'active',
    contentType: input.contentType,
    contentHash: hash,
    contentSize: size,
    storageKey,
    version: 1,
    intentVersion: input.intentVersion,
    metadata: input.metadata || {},
    tags: input.tags || [],
    originSurface: context.surface
  });
  
  // 4. Create initial version record
  await db.artifactVersions.create({
    artifactId: id,
    version: 1,
    contentHash: hash,
    contentSize: size,
    storageKey,
    intentVersion: input.intentVersion,
    changeReason: 'Initial creation',
    changeType: 'create',
    createdBy: 'user'
  });
  
  // 5. Create intent links
  if (input.intentNodeIds) {
    for (const { nodeId, nodeType, linkType } of input.intentNodeIds) {
      await db.artifactIntentLinks.create({
        artifactId: id,
        intentNodeId: nodeId,
        intentNodeType: nodeType,
        linkType
      });
    }
  }
  
  // 6. Emit event
  await events.emit('artifact.created', { artifact, context });
  
  return artifact;
}
```

### Update Artifact (New Version)

```typescript
async function updateArtifact(
  artifactId: string,
  input: UpdateArtifactInput,
  context: RequestContext
): Promise<Artifact> {
  // 1. Load current artifact
  const artifact = await db.artifacts.findById(artifactId);
  if (!artifact) throw new NotFoundError('Artifact not found');
  if (artifact.userId !== context.userId) throw new ForbiddenError();
  
  // 2. Store new content
  const newVersion = artifact.version + 1;
  const { storageKey, hash, size } = await contentStorage.store(
    context.userId,
    artifactId,
    newVersion,
    input.content,
    artifact.contentType
  );
  
  // 3. Generate and store diff
  const oldContent = await contentStorage.retrieve(artifact.storageKey);
  const diff = await contentStorage.generateDiff(oldContent, input.content);
  const diffKey = await contentStorage.storeDiff(
    context.userId,
    artifactId,
    newVersion,
    diff
  );
  
  // 4. Update artifact
  const updated = await db.artifacts.update(artifactId, {
    contentHash: hash,
    contentSize: size,
    storageKey,
    version: newVersion,
    intentVersion: input.intentVersion,
    updatedAt: new Date()
  });
  
  // 5. Create version record
  await db.artifactVersions.create({
    artifactId,
    version: newVersion,
    contentHash: hash,
    contentSize: size,
    storageKey,
    intentVersion: input.intentVersion,
    changeReason: input.changeReason,
    changeType: input.changeType || 'update',
    parentVersion: artifact.version,
    diffStorageKey: diffKey,
    createdBy: context.actor
  });
  
  // 6. Emit event
  await events.emit('artifact.updated', {
    artifact: updated,
    previousVersion: artifact.version,
    context
  });
  
  return updated;
}
```

### Evolve Artifact (Intent-Driven)

```typescript
async function evolveArtifact(
  artifactId: string,
  intentChanges: IntentChange[],
  context: RequestContext
): Promise<EvolutionResult> {
  // 1. Load artifact with intent links
  const artifact = await db.artifacts.findById(artifactId, {
    include: ['intentLinks']
  });
  
  // 2. Determine affected intent nodes
  const affectedLinks = artifact.intentLinks.filter(link =>
    intentChanges.some(change => change.nodeId === link.intentNodeId)
  );
  
  if (affectedLinks.length === 0) {
    return { changed: false, artifact };
  }
  
  // 3. Load current content
  const currentContent = await contentStorage.retrieve(artifact.storageKey);
  
  // 4. Request synthesis of changes from Claude
  const synthesisResult = await synthesisEngine.evolveArtifact({
    artifact,
    currentContent: currentContent.toString('utf-8'),
    intentChanges,
    affectedLinks
  });
  
  // 5. If changes proposed, create preview
  if (synthesisResult.hasChanges) {
    const preview = await createEvolutionPreview({
      artifactId,
      currentContent,
      proposedContent: synthesisResult.newContent,
      changes: synthesisResult.changes,
      intentChanges
    });
    
    return {
      changed: true,
      preview,
      artifact
    };
  }
  
  return { changed: false, artifact };
}

async function applyEvolution(
  previewId: string,
  context: RequestContext
): Promise<Artifact> {
  const preview = await db.evolutionPreviews.findById(previewId);
  
  return updateArtifact(
    preview.artifactId,
    {
      content: Buffer.from(preview.proposedContent),
      changeReason: `Evolution from intent changes: ${preview.intentChanges.map(c => c.description).join(', ')}`,
      changeType: 'evolve',
      intentVersion: preview.newIntentVersion
    },
    context
  );
}
```

### Retrieve with Access Tracking

```typescript
async function getArtifact(
  artifactId: string,
  context: RequestContext
): Promise<ArtifactWithContent> {
  // 1. Load artifact
  const artifact = await db.artifacts.findById(artifactId);
  if (!artifact) throw new NotFoundError();
  if (artifact.userId !== context.userId) throw new ForbiddenError();
  
  // 2. Update access tracking (async, don't wait)
  db.artifacts.update(artifactId, {
    lastAccessedAt: new Date(),
    accessCount: artifact.accessCount + 1
  }).catch(err => logger.error('Failed to update access tracking', err));
  
  // 3. Load content
  const content = await contentStorage.retrieve(artifact.storageKey);
  
  // 4. Record access for feedback
  await recordImplicitSignal({
    artifactId,
    signal: 'access',
    surface: context.surface
  });
  
  return {
    ...artifact,
    content
  };
}
```

---

## Version Management

### Get Version History

```typescript
async function getVersionHistory(
  artifactId: string,
  options: { limit?: number; before?: number } = {}
): Promise<ArtifactVersion[]> {
  return db.artifactVersions.findMany({
    where: { artifactId },
    orderBy: { version: 'desc' },
    take: options.limit || 50,
    ...(options.before && { where: { version: { lt: options.before } } })
  });
}
```

### Compare Versions

```typescript
async function compareVersions(
  artifactId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionDiff> {
  const [from, to] = await Promise.all([
    db.artifactVersions.findOne({ artifactId, version: fromVersion }),
    db.artifactVersions.findOne({ artifactId, version: toVersion })
  ]);
  
  if (!from || !to) throw new NotFoundError('Version not found');
  
  const [fromContent, toContent] = await Promise.all([
    contentStorage.retrieve(from.storageKey),
    contentStorage.retrieve(to.storageKey)
  ]);
  
  const diff = await contentStorage.generateDiff(fromContent, toContent);
  
  return {
    fromVersion,
    toVersion,
    diff: diff.toString('utf-8'),
    fromMeta: from,
    toMeta: to
  };
}
```

### Restore Version

```typescript
async function restoreVersion(
  artifactId: string,
  targetVersion: number,
  context: RequestContext
): Promise<Artifact> {
  const version = await db.artifactVersions.findOne({
    artifactId,
    version: targetVersion
  });
  
  if (!version) throw new NotFoundError('Version not found');
  
  const content = await contentStorage.retrieve(version.storageKey);
  
  return updateArtifact(
    artifactId,
    {
      content,
      changeReason: `Restored from version ${targetVersion}`,
      changeType: 'revert'
    },
    context
  );
}
```

---

## External Sync

### GitHub Sync

```typescript
class GitHubSync implements ExternalSync {
  async link(
    artifact: Artifact,
    repoOwner: string,
    repoName: string,
    filePath: string,
    branch: string = 'main'
  ): Promise<ArtifactExternalLink> {
    // Verify repo access
    const repo = await this.github.repos.get({ owner: repoOwner, repo: repoName });
    
    // Check if file exists
    let existingContent: string | null = null;
    try {
      const file = await this.github.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        ref: branch
      });
      existingContent = Buffer.from(file.data.content, 'base64').toString();
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    
    // Create link
    const link = await db.artifactExternalLinks.create({
      artifactId: artifact.id,
      system: 'github',
      externalId: `${repoOwner}/${repoName}/${filePath}@${branch}`,
      externalUrl: `https://github.com/${repoOwner}/${repoName}/blob/${branch}/${filePath}`,
      syncDirection: 'bidirectional',
      syncStatus: existingContent ? 'pending' : 'synced'
    });
    
    // If file exists, trigger conflict check
    if (existingContent) {
      const artifactContent = await contentStorage.retrieve(artifact.storageKey);
      if (existingContent !== artifactContent.toString()) {
        await this.createConflict(link, existingContent, artifactContent.toString());
      }
    } else {
      // Push initial content
      await this.pushToGitHub(artifact, link);
    }
    
    // Setup webhook for changes
    await this.setupWebhook(repoOwner, repoName, artifact.id);
    
    return link;
  }
  
  async sync(link: ArtifactExternalLink): Promise<SyncResult> {
    const [owner, repo, ...pathParts] = link.externalId.split('/');
    const [path, branch] = pathParts.join('/').split('@');
    
    // Get remote content
    const remote = await this.github.repos.getContent({
      owner, repo, path, ref: branch
    });
    const remoteContent = Buffer.from(remote.data.content, 'base64').toString();
    const remoteSha = remote.data.sha;
    
    // Get local content
    const artifact = await db.artifacts.findById(link.artifactId);
    const localContent = (await contentStorage.retrieve(artifact.storageKey)).toString();
    
    // Compare
    if (remoteContent === localContent) {
      return { status: 'synced', direction: 'none' };
    }
    
    // Determine direction based on timestamps and link direction
    if (link.syncDirection === 'to_external') {
      await this.pushToGitHub(artifact, link);
      return { status: 'synced', direction: 'to_external' };
    } else if (link.syncDirection === 'from_external') {
      await this.pullFromGitHub(artifact, link, remoteContent);
      return { status: 'synced', direction: 'from_external' };
    } else {
      // Bidirectional - check for conflicts
      const lastSync = link.lastSyncedAt;
      // ... conflict resolution logic
    }
  }
}
```

---

## Identity Embedding

### Embed ID in Artifact

```typescript
function embedArtifactId(
  content: string,
  artifact: Artifact
): string {
  const marker = generateMarker(artifact);
  
  switch (artifact.type) {
    case 'code':
      return embedInCode(content, marker, artifact.contentType);
    case 'document':
      return embedInDocument(content, marker, artifact.contentType);
    default:
      return content; // No embedding for some types
  }
}

function generateMarker(artifact: Artifact): string {
  return `@artifact-id ${artifact.shortId} @version ${artifact.version}`;
}

function embedInCode(content: string, marker: string, contentType: string): string {
  const comment = getCommentStyle(contentType);
  const header = `${comment.start} ${marker} ${comment.end}\n`;
  
  // Check if already has header
  if (content.startsWith(comment.start + ' @artifact-id')) {
    // Replace existing
    const lines = content.split('\n');
    lines[0] = header.trim();
    return lines.join('\n');
  }
  
  return header + content;
}

function getCommentStyle(contentType: string): { start: string; end: string } {
  const styles: Record<string, { start: string; end: string }> = {
    'text/javascript': { start: '//', end: '' },
    'text/typescript': { start: '//', end: '' },
    'text/x-python': { start: '#', end: '' },
    'text/html': { start: '<!--', end: '-->' },
    'text/css': { start: '/*', end: '*/' }
  };
  return styles[contentType] || { start: '//', end: '' };
}
```

### Extract ID from Content

```typescript
function extractArtifactId(content: string): { shortId: string; version: number } | null {
  const patterns = [
    /@artifact-id\s+(\w+)\s+@version\s+(\d+)/,
    /artifact:\s*(\w+):v(\d+)/,
    /"\$artifact":\s*{\s*"id":\s*"(\w+)",\s*"version":\s*(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return { shortId: match[1], version: parseInt(match[2]) };
    }
  }
  
  return null;
}
```

---

## API Endpoints

```yaml
openapi: 3.0.0
paths:
  /api/v1/artifacts:
    get:
      summary: List artifacts
      parameters:
        - name: projectId
          in: query
          schema: { type: string }
        - name: type
          in: query
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string }
        - name: search
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  artifacts: { type: array, items: { $ref: '#/components/schemas/Artifact' } }
                  total: { type: integer }
    
    post:
      summary: Create artifact
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, type, content, contentType]
              properties:
                name: { type: string }
                type: { type: string }
                content: { type: string, format: base64 }
                contentType: { type: string }
                projectId: { type: string }
                intentGraphId: { type: string }
                intentNodeIds: { type: array }
                metadata: { type: object }
                tags: { type: array, items: { type: string } }
      responses:
        201:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Artifact' }

  /api/v1/artifacts/{artifactId}:
    get:
      summary: Get artifact with content
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ArtifactWithContent' }
    
    patch:
      summary: Update artifact
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                content: { type: string, format: base64 }
                name: { type: string }
                status: { type: string }
                changeReason: { type: string }
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Artifact' }
    
    delete:
      summary: Delete artifact
      responses:
        204: {}

  /api/v1/artifacts/{artifactId}/versions:
    get:
      summary: Get version history
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ArtifactVersion' }

  /api/v1/artifacts/{artifactId}/versions/{version}:
    get:
      summary: Get specific version
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ArtifactVersionWithContent' }

  /api/v1/artifacts/{artifactId}/diff:
    get:
      summary: Compare versions
      parameters:
        - name: from
          in: query
          required: true
          schema: { type: integer }
        - name: to
          in: query
          required: true
          schema: { type: integer }
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/VersionDiff' }

  /api/v1/artifacts/{artifactId}/restore/{version}:
    post:
      summary: Restore version
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Artifact' }

  /api/v1/artifacts/{artifactId}/feedback:
    post:
      summary: Add feedback
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [signalType, signalValue]
              properties:
                signalType: { type: string, enum: [rating, comment, implicit] }
                signalValue: {}
      responses:
        201:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ArtifactFeedback' }

  /api/v1/artifacts/{artifactId}/links:
    post:
      summary: Create external link
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [system, externalId]
              properties:
                system: { type: string }
                externalId: { type: string }
                syncDirection: { type: string }
      responses:
        201:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ArtifactExternalLink' }

  /api/v1/artifacts/{artifactId}/sync:
    post:
      summary: Trigger sync
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SyncResult' }
```

---

## Related Documents

- PRD-003: Living Artifacts
- ADR-003: Living Artifacts
- SPEC-001: Context Store
