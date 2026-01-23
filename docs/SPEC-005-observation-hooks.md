# SPEC-005: Observation Hooks Technical Specification

## Document Information
| Field | Value |
|-------|-------|
| **Component** | Observation Hooks |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Related PRD** | PRD-004: Active Observation |

---

## Overview

Observation Hooks enable Claude to learn from user activity beyond direct conversations. This specification defines the technical implementation of secure, privacy-respecting observation capabilities across file systems, repositories, applications, and external services.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      OBSERVATION SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     PERMISSION LAYER                              │ │
│  │                                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │ │
│  │  │  Consent    │  │   Scope     │  │   Audit     │              │ │
│  │  │  Manager    │  │  Enforcer   │  │   Logger    │              │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │ │
│  └───────────────────────────────────┬───────────────────────────────┘ │
│                                      │                                  │
│  ┌───────────────────────────────────▼───────────────────────────────┐ │
│  │                      HOOK LAYER                                   │ │
│  │                                                                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │  File    │ │   Repo   │ │   App    │ │ External │            │ │
│  │  │  Hooks   │ │  Hooks   │ │  Hooks   │ │  Hooks   │            │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │ │
│  └───────────────────────────────────┬───────────────────────────────┘ │
│                                      │                                  │
│  ┌───────────────────────────────────▼───────────────────────────────┐ │
│  │                    PROCESSING LAYER                               │ │
│  │                                                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │ │
│  │  │   Event     │  │   Signal    │  │   Pattern   │              │ │
│  │  │   Stream    │  │  Extractor  │  │  Detector   │              │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │ │
│  └───────────────────────────────────┬───────────────────────────────┘ │
│                                      │                                  │
│  ┌───────────────────────────────────▼───────────────────────────────┐ │
│  │                     OUTPUT LAYER                                  │ │
│  │                                                                   │ │
│  │  Context Store  │  Feedback System  │  Proactive Insights        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Permission Model

### Permission Schema

```typescript
interface ObservationPermission {
  id: string;
  userId: string;
  
  // What's permitted
  layer: PermissionLayer;
  capability: ObservationCapability;
  
  // Scope limits
  scope: PermissionScope;
  scopeTarget?: string; // Project ID, path pattern, etc.
  
  // Time bounds
  grantedAt: Date;
  expiresAt?: Date;
  
  // Conditions
  conditions?: PermissionCondition[];
  
  // Status
  status: 'active' | 'paused' | 'revoked';
  revokedAt?: Date;
  revocationReason?: string;
  
  // Audit
  lastUsedAt?: Date;
  usageCount: number;
}

enum PermissionLayer {
  BASELINE = 0,    // Always on (in-session only)
  MEMORY = 1,      // Cross-session persistence
  OBSERVATION = 2, // File/repo observation
  INTEGRATION = 3, // External service integration
  DEEP = 4         // Production monitoring
}

type ObservationCapability = 
  | 'session_memory'
  | 'cross_session_memory'
  | 'file_observation'
  | 'repo_observation'
  | 'browser_observation'
  | 'artifact_tracking'
  | 'github_integration'
  | 'analytics_integration'
  | 'production_monitoring';

interface PermissionScope {
  type: 'global' | 'project' | 'path' | 'time' | 'task';
  value?: string | Date | { start: Date; end: Date };
}

interface PermissionCondition {
  type: 'time_of_day' | 'activity_type' | 'content_match' | 'custom';
  expression: string;
}
```

### Permission Checking

```typescript
class PermissionEnforcer {
  async checkPermission(
    userId: string,
    capability: ObservationCapability,
    context: ObservationContext
  ): Promise<PermissionCheckResult> {
    // 1. Get all active permissions for user
    const permissions = await this.getActivePermissions(userId, capability);
    
    if (permissions.length === 0) {
      return { allowed: false, reason: 'No permission granted' };
    }
    
    // 2. Check scope
    for (const perm of permissions) {
      if (!this.checkScope(perm, context)) continue;
      
      // 3. Check conditions
      if (!this.checkConditions(perm, context)) continue;
      
      // 4. Check expiration
      if (perm.expiresAt && perm.expiresAt < new Date()) continue;
      
      // 5. Log usage
      await this.logUsage(perm, context);
      
      return { allowed: true, permission: perm };
    }
    
    return { allowed: false, reason: 'No matching permission for context' };
  }
  
  private checkScope(perm: ObservationPermission, context: ObservationContext): boolean {
    switch (perm.scope.type) {
      case 'global':
        return true;
      case 'project':
        return context.projectId === perm.scopeTarget;
      case 'path':
        return this.matchPath(context.path, perm.scopeTarget);
      case 'time':
        const timeScope = perm.scope.value as { start: Date; end: Date };
        const now = new Date();
        return now >= timeScope.start && now <= timeScope.end;
      case 'task':
        return context.taskId === perm.scopeTarget;
      default:
        return false;
    }
  }
  
  private matchPath(path: string | undefined, pattern: string | undefined): boolean {
    if (!path || !pattern) return false;
    // Support glob patterns
    return minimatch(path, pattern);
  }
}
```

### Permission Request Flow

```typescript
interface PermissionRequest {
  capability: ObservationCapability;
  scope: PermissionScope;
  reason: string;
  benefits: string[];
  dataAccessed: string[];
  expirationSuggestion?: Date;
}

async function requestPermission(
  userId: string,
  request: PermissionRequest
): Promise<PermissionRequestResult> {
  // 1. Check if already granted
  const existing = await checkExistingPermission(userId, request.capability, request.scope);
  if (existing) {
    return { status: 'already_granted', permission: existing };
  }
  
  // 2. Create pending request
  const pendingRequest = await db.permissionRequests.create({
    userId,
    ...request,
    status: 'pending',
    createdAt: new Date()
  });
  
  // 3. Return request for UI display
  return {
    status: 'pending',
    requestId: pendingRequest.id,
    displayInfo: {
      title: getPermissionTitle(request.capability),
      description: request.reason,
      benefits: request.benefits,
      dataAccessed: request.dataAccessed,
      scopeDescription: describescope(request.scope)
    }
  };
}

async function grantPermission(
  requestId: string,
  userDecision: UserPermissionDecision
): Promise<ObservationPermission> {
  const request = await db.permissionRequests.findById(requestId);
  
  const permission = await db.observationPermissions.create({
    userId: request.userId,
    layer: getLayerForCapability(request.capability),
    capability: request.capability,
    scope: userDecision.scope || request.scope,
    grantedAt: new Date(),
    expiresAt: userDecision.expiresAt,
    conditions: userDecision.conditions,
    status: 'active'
  });
  
  await db.permissionRequests.update(requestId, { status: 'granted' });
  
  // Emit event for audit
  await events.emit('permission.granted', { permission, request });
  
  return permission;
}
```

---

## File System Observation

### File Watcher

```typescript
interface FileObservationConfig {
  paths: string[];
  excludePatterns: string[];
  eventTypes: ('create' | 'modify' | 'delete' | 'rename')[];
  debounceMs: number;
}

class FileObserver {
  private watchers: Map<string, FSWatcher> = new Map();
  private eventBuffer: FileEvent[] = [];
  
  async start(
    userId: string,
    config: FileObservationConfig
  ): Promise<void> {
    // Verify permission
    const permission = await this.permissionEnforcer.checkPermission(
      userId,
      'file_observation',
      { paths: config.paths }
    );
    
    if (!permission.allowed) {
      throw new PermissionDeniedError(permission.reason);
    }
    
    // Setup watchers
    for (const path of config.paths) {
      const watcher = chokidar.watch(path, {
        ignored: config.excludePatterns,
        persistent: true,
        ignoreInitial: true
      });
      
      watcher.on('all', (event, filePath) => {
        if (config.eventTypes.includes(event as any)) {
          this.handleEvent({
            userId,
            type: event,
            path: filePath,
            timestamp: new Date()
          });
        }
      });
      
      this.watchers.set(path, watcher);
    }
  }
  
  private async handleEvent(event: FileEvent): Promise<void> {
    // Buffer events for debouncing
    this.eventBuffer.push(event);
    
    // Debounce processing
    await this.processBufferedEvents();
  }
  
  private async processBufferedEvents(): Promise<void> {
    const events = this.eventBuffer;
    this.eventBuffer = [];
    
    // Group by file
    const byFile = groupBy(events, e => e.path);
    
    for (const [filePath, fileEvents] of Object.entries(byFile)) {
      // Extract signals
      const signals = await this.extractSignals(filePath, fileEvents);
      
      // Send to processing
      await this.signalProcessor.process(signals);
    }
  }
  
  private async extractSignals(
    filePath: string,
    events: FileEvent[]
  ): Promise<ObservationSignal[]> {
    const signals: ObservationSignal[] = [];
    
    // Check if this is an artifact we created
    const artifact = await this.findArtifactByPath(filePath);
    
    if (artifact) {
      // This is modification of our artifact
      const content = await fs.readFile(filePath, 'utf-8');
      const diff = await this.computeDiff(artifact, content);
      
      signals.push({
        type: 'artifact_modified_externally',
        artifactId: artifact.id,
        changes: diff,
        timestamp: events[events.length - 1].timestamp
      });
    }
    
    // General file activity signal
    signals.push({
      type: 'file_activity',
      path: filePath,
      eventTypes: [...new Set(events.map(e => e.type))],
      count: events.length,
      timestamp: events[events.length - 1].timestamp
    });
    
    return signals;
  }
}
```

---

## Repository Observation

### Git Repository Watcher

```typescript
interface RepoObservationConfig {
  repoPath: string;
  branch?: string;
  watchRemote: boolean;
  events: ('commit' | 'push' | 'pull' | 'branch' | 'merge')[];
}

class RepoObserver {
  async start(
    userId: string,
    config: RepoObservationConfig
  ): Promise<void> {
    // Verify permission
    const permission = await this.permissionEnforcer.checkPermission(
      userId,
      'repo_observation',
      { path: config.repoPath }
    );
    
    if (!permission.allowed) {
      throw new PermissionDeniedError(permission.reason);
    }
    
    // Setup git hooks
    await this.installGitHooks(config.repoPath);
    
    // Start polling for remote changes if enabled
    if (config.watchRemote) {
      this.startRemotePolling(config);
    }
  }
  
  private async installGitHooks(repoPath: string): Promise<void> {
    const hooksDir = path.join(repoPath, '.git', 'hooks');
    
    // Post-commit hook
    const postCommitHook = `#!/bin/sh
curl -X POST http://localhost:${HOOK_PORT}/git/post-commit \
  -H "Content-Type: application/json" \
  -d '{"repo": "${repoPath}", "commit": "$(git rev-parse HEAD)"}'
`;
    
    await fs.writeFile(
      path.join(hooksDir, 'post-commit'),
      postCommitHook,
      { mode: 0o755 }
    );
    
    // Similar for other hooks...
  }
  
  async handleCommit(repoPath: string, commitHash: string): Promise<void> {
    // Get commit details
    const commit = await this.getCommitDetails(repoPath, commitHash);
    
    // Check for artifact-related changes
    const artifactChanges = await this.findArtifactChanges(commit.files);
    
    // Extract signals
    const signals: ObservationSignal[] = [
      {
        type: 'git_commit',
        repo: repoPath,
        commit: {
          hash: commitHash,
          message: commit.message,
          author: commit.author,
          filesChanged: commit.files.length,
          insertions: commit.insertions,
          deletions: commit.deletions
        },
        artifactChanges,
        timestamp: commit.date
      }
    ];
    
    // Analyze commit for patterns
    const patterns = await this.analyzeCommitPatterns(commit);
    if (patterns.length > 0) {
      signals.push({
        type: 'commit_pattern_detected',
        patterns,
        commit: commitHash
      });
    }
    
    await this.signalProcessor.process(signals);
  }
  
  private async analyzeCommitPatterns(commit: CommitDetails): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Bug fix pattern
    if (/fix|bug|issue|patch/i.test(commit.message)) {
      patterns.push({
        type: 'bug_fix',
        confidence: 0.8,
        details: { message: commit.message }
      });
    }
    
    // Refactoring pattern
    if (/refactor|clean|reorganize/i.test(commit.message)) {
      patterns.push({
        type: 'refactoring',
        confidence: 0.7,
        details: { message: commit.message }
      });
    }
    
    // Large change pattern
    if (commit.filesChanged > 10 || commit.insertions + commit.deletions > 500) {
      patterns.push({
        type: 'large_change',
        confidence: 0.9,
        details: {
          filesChanged: commit.filesChanged,
          linesChanged: commit.insertions + commit.deletions
        }
      });
    }
    
    return patterns;
  }
}
```

### CI/CD Observation

```typescript
interface CIObservationConfig {
  provider: 'github_actions' | 'gitlab_ci' | 'jenkins' | 'circleci';
  repoUrl: string;
  webhookSecret: string;
}

class CIObserver {
  async handleWebhook(
    provider: string,
    payload: any,
    signature: string
  ): Promise<void> {
    // Verify webhook signature
    if (!this.verifySignature(payload, signature)) {
      throw new SecurityError('Invalid webhook signature');
    }
    
    // Parse based on provider
    const event = this.parseWebhook(provider, payload);
    
    // Find associated user/project
    const context = await this.findContext(event.repoUrl);
    if (!context) return;
    
    // Check permission
    const permission = await this.permissionEnforcer.checkPermission(
      context.userId,
      'github_integration',
      { repo: event.repoUrl }
    );
    
    if (!permission.allowed) return;
    
    // Extract signals
    const signals: ObservationSignal[] = [];
    
    if (event.type === 'workflow_run') {
      signals.push({
        type: 'ci_run',
        provider,
        status: event.status,
        conclusion: event.conclusion,
        workflow: event.workflowName,
        duration: event.duration,
        commit: event.commitHash,
        timestamp: event.completedAt
      });
      
      // Check for failures
      if (event.conclusion === 'failure') {
        signals.push({
          type: 'ci_failure',
          provider,
          workflow: event.workflowName,
          logs: await this.fetchFailureLogs(event),
          commit: event.commitHash
        });
      }
    }
    
    await this.signalProcessor.process(signals, context);
  }
}
```

---

## Signal Processing

### Signal Processor

```typescript
interface ObservationSignal {
  type: string;
  timestamp: Date;
  [key: string]: any;
}

class SignalProcessor {
  private handlers: Map<string, SignalHandler[]> = new Map();
  
  async process(
    signals: ObservationSignal[],
    context?: ObservationContext
  ): Promise<void> {
    for (const signal of signals) {
      // Get handlers for signal type
      const handlers = this.handlers.get(signal.type) || [];
      
      for (const handler of handlers) {
        try {
          await handler.handle(signal, context);
        } catch (error) {
          logger.error(`Handler error for ${signal.type}`, error);
        }
      }
      
      // Always log to audit
      await this.auditLog(signal, context);
    }
  }
  
  private async auditLog(
    signal: ObservationSignal,
    context?: ObservationContext
  ): Promise<void> {
    await db.observationAudit.create({
      userId: context?.userId,
      signalType: signal.type,
      signalData: this.sanitizeForAudit(signal),
      timestamp: signal.timestamp,
      processedAt: new Date()
    });
  }
}

// Handler: Update Context Store
class ContextUpdateHandler implements SignalHandler {
  async handle(signal: ObservationSignal, context: ObservationContext): Promise<void> {
    switch (signal.type) {
      case 'artifact_modified_externally':
        await this.handleArtifactModification(signal, context);
        break;
      case 'ci_failure':
        await this.handleCIFailure(signal, context);
        break;
      case 'commit_pattern_detected':
        await this.handleCommitPattern(signal, context);
        break;
    }
  }
  
  private async handleArtifactModification(
    signal: ObservationSignal,
    context: ObservationContext
  ): Promise<void> {
    // Update artifact with external changes
    await artifactService.recordExternalModification(
      signal.artifactId,
      signal.changes
    );
    
    // Update interaction memory
    await contextStore.addInteractionPattern(context.userId, {
      type: 'artifact_external_edit',
      artifactId: signal.artifactId,
      timestamp: signal.timestamp
    });
  }
  
  private async handleCIFailure(
    signal: ObservationSignal,
    context: ObservationContext
  ): Promise<void> {
    // Check if failure relates to our artifacts
    const relatedArtifacts = await this.findRelatedArtifacts(
      context.userId,
      signal.commit
    );
    
    for (const artifact of relatedArtifacts) {
      // Record negative outcome
      await feedbackService.recordImplicitSignal({
        artifactId: artifact.id,
        signal: 'ci_failure',
        details: {
          workflow: signal.workflow,
          logs: signal.logs
        }
      });
    }
  }
}

// Handler: Generate Proactive Insights
class ProactiveInsightHandler implements SignalHandler {
  async handle(signal: ObservationSignal, context: ObservationContext): Promise<void> {
    // Accumulate signals
    await this.accumulator.add(context.userId, signal);
    
    // Check if we should generate insights
    const shouldGenerate = await this.shouldGenerateInsight(context.userId);
    if (!shouldGenerate) return;
    
    // Get recent signals
    const recentSignals = await this.accumulator.getRecent(context.userId, 100);
    
    // Analyze for patterns
    const patterns = await this.patternDetector.analyze(recentSignals);
    
    // Generate insights
    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        await this.generateInsight(context.userId, pattern);
      }
    }
  }
  
  private async generateInsight(userId: string, pattern: DetectedPattern): Promise<void> {
    const insight: ProactiveInsight = {
      id: uuid(),
      userId,
      type: pattern.type,
      title: this.getInsightTitle(pattern),
      description: this.getInsightDescription(pattern),
      suggestedAction: this.getSuggestedAction(pattern),
      confidence: pattern.confidence,
      basedOn: pattern.signalIds,
      createdAt: new Date(),
      status: 'pending'
    };
    
    await db.proactiveInsights.create(insight);
    
    // Notify user if they're active
    if (await this.isUserActive(userId)) {
      await notifications.send(userId, {
        type: 'proactive_insight',
        insight
      });
    }
  }
}
```

---

## Pattern Detection

### Pattern Detector

```typescript
interface DetectedPattern {
  type: string;
  confidence: number;
  signalIds: string[];
  details: any;
}

class PatternDetector {
  private detectors: PatternDetectorPlugin[] = [
    new RepetitiveTaskDetector(),
    new CodeQualityPatternDetector(),
    new WorkflowPatternDetector(),
    new ErrorPatternDetector()
  ];
  
  async analyze(signals: ObservationSignal[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    for (const detector of this.detectors) {
      const detected = await detector.detect(signals);
      patterns.push(...detected);
    }
    
    // Deduplicate and merge similar patterns
    return this.deduplicatePatterns(patterns);
  }
}

class RepetitiveTaskDetector implements PatternDetectorPlugin {
  async detect(signals: ObservationSignal[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Group by signal type and content similarity
    const fileActivities = signals.filter(s => s.type === 'file_activity');
    
    // Find repetitive file modifications
    const pathGroups = groupBy(fileActivities, s => s.path);
    
    for (const [path, activities] of Object.entries(pathGroups)) {
      if (activities.length >= 5) {
        // Check if modifications follow a pattern
        const timeDeltas = this.calculateTimeDeltas(activities);
        const avgDelta = mean(timeDeltas);
        const stdDelta = std(timeDeltas);
        
        if (stdDelta / avgDelta < 0.3) {
          // Regular pattern detected
          patterns.push({
            type: 'repetitive_file_modification',
            confidence: 0.8,
            signalIds: activities.map(a => a.id),
            details: {
              path,
              frequency: avgDelta,
              count: activities.length
            }
          });
        }
      }
    }
    
    return patterns;
  }
}

class ErrorPatternDetector implements PatternDetectorPlugin {
  async detect(signals: ObservationSignal[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    const ciFailures = signals.filter(s => s.type === 'ci_failure');
    
    // Group failures by similar error patterns
    const errorGroups = await this.groupByErrorSimilarity(ciFailures);
    
    for (const group of errorGroups) {
      if (group.length >= 2) {
        patterns.push({
          type: 'recurring_ci_failure',
          confidence: 0.85,
          signalIds: group.map(s => s.id),
          details: {
            errorPattern: group[0].logs.substring(0, 500),
            occurrences: group.length,
            affectedWorkflows: [...new Set(group.map(s => s.workflow))]
          }
        });
      }
    }
    
    return patterns;
  }
}
```

---

## Audit & Transparency

### Observation Dashboard Data

```typescript
interface ObservationDashboard {
  // Active observations
  activePermissions: ObservationPermission[];
  
  // Recent activity
  recentSignals: {
    type: string;
    count: number;
    lastOccurred: Date;
  }[];
  
  // Generated insights
  pendingInsights: ProactiveInsight[];
  
  // Learning summary
  learningSummary: {
    patternsDetected: number;
    feedbackSignals: number;
    contextUpdates: number;
  };
  
  // Privacy stats
  privacyStats: {
    dataPointsCollected: number;
    oldestDataPoint: Date;
    storageUsed: number;
  };
}

async function getObservationDashboard(userId: string): Promise<ObservationDashboard> {
  const [
    permissions,
    signalCounts,
    insights,
    learning,
    privacy
  ] = await Promise.all([
    db.observationPermissions.findMany({ where: { userId, status: 'active' } }),
    getSignalCounts(userId, { days: 30 }),
    db.proactiveInsights.findMany({ where: { userId, status: 'pending' } }),
    getLearningSummary(userId),
    getPrivacyStats(userId)
  ]);
  
  return {
    activePermissions: permissions,
    recentSignals: signalCounts,
    pendingInsights: insights,
    learningSummary: learning,
    privacyStats: privacy
  };
}
```

### Audit Log Access

```typescript
async function getObservationAuditLog(
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    signalTypes?: string[];
    limit?: number;
  }
): Promise<AuditLogEntry[]> {
  return db.observationAudit.findMany({
    where: {
      userId,
      timestamp: {
        gte: options.startDate,
        lte: options.endDate
      },
      signalType: options.signalTypes ? { in: options.signalTypes } : undefined
    },
    orderBy: { timestamp: 'desc' },
    take: options.limit || 100
  });
}
```

---

## API Endpoints

```yaml
paths:
  /api/v1/observation/permissions:
    get:
      summary: List observation permissions
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ObservationPermission' }
    
    post:
      summary: Grant observation permission
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/PermissionGrant' }
      responses:
        201:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ObservationPermission' }

  /api/v1/observation/permissions/{permissionId}:
    delete:
      summary: Revoke permission
      responses:
        204: {}

  /api/v1/observation/dashboard:
    get:
      summary: Get observation dashboard
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ObservationDashboard' }

  /api/v1/observation/audit:
    get:
      summary: Get audit log
      parameters:
        - name: startDate
          in: query
          schema: { type: string, format: date-time }
        - name: endDate
          in: query
          schema: { type: string, format: date-time }
        - name: signalTypes
          in: query
          schema: { type: array, items: { type: string } }
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/AuditLogEntry' }

  /api/v1/observation/insights:
    get:
      summary: Get proactive insights
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ProactiveInsight' }

  /api/v1/observation/insights/{insightId}/dismiss:
    post:
      summary: Dismiss insight
      responses:
        204: {}

  /api/v1/observation/insights/{insightId}/act:
    post:
      summary: Act on insight
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/InsightActionResult' }
```

---

## Related Documents

- PRD-004: Active Observation
- ADR-005: Observation Permissions
- SPEC-001: Context Store
