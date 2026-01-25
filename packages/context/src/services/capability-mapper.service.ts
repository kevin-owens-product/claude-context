/**
 * Capability Mapper Service
 * Links code symbols to business capabilities, calculates health, and detects evolution.
 *
 * @prompt-id forge-v4.1:service:capability-mapper:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  PrismaClient,
  Prisma,
  HealthTrend as PrismaHealthTrend,
  CapabilityHealthStatus as PrismaCapabilityHealthStatus,
  ChangeSignificance as PrismaChangeSignificance,
} from '@prisma/client';
import type { TenantId } from '../types';
import type {
  RepositoryId,
  CodeSymbolId,
  CapabilityId,
  CapabilityHealthId,
  CapabilityEvolutionId,
  CapabilityHealth,
  CapabilityEvolution,
  CapabilityHealthStatus,
  HealthTrend,
  CapabilityEventType,
  ChangeCategory,
  ChangeSignificance,
  CapabilityLinkType,
  SymbolCapabilityLink,
  LinkSymbolToCapabilityRequest,
  InferCapabilityLinksRequest,
  CapabilityCodeRequest,
  CapabilityHealthRequest,
  CapabilityEvolutionFilter,
  CapabilityCodeSummary,
  CapabilityHealthTrend,
  CapabilityEvolutionSummary,
  HealthScoreConfig,
  InferredCapabilityLink,
  CapabilityInferenceResult,
  CodeSymbol,
} from '../types/codebase.types';

// Default health score configuration
const DEFAULT_HEALTH_CONFIG: HealthScoreConfig = {
  weights: {
    complexity: 0.25,
    quality: 0.30,
    stability: 0.25,
    maintainability: 0.20,
  },
  thresholds: {
    healthy: 70,
    warning: 40,
  },
  complexityTargets: {
    maxAvgComplexity: 10,
    maxSingleComplexity: 25,
  },
  qualityTargets: {
    minTestCoverage: 80,
    maxLintIssues: 0,
    minDocumentationRatio: 0.5,
  },
  stabilityTargets: {
    maxChurnRate: 20,
    maxFilesChangedPerDay: 5,
  },
};

export class CapabilityMapperService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: HealthScoreConfig = DEFAULT_HEALTH_CONFIG
  ) {}

  // ============================================================================
  // SYMBOL-CAPABILITY LINKING
  // ============================================================================

  /**
   * Link a symbol to a capability manually
   */
  async linkSymbolToCapability(
    tenantId: TenantId,
    request: LinkSymbolToCapabilityRequest,
    linkedBy?: string
  ): Promise<SymbolCapabilityLink> {
    const link = await this.prisma.symbolCapabilityLink.upsert({
      where: {
        symbolId_capabilityId: {
          symbolId: request.symbolId,
          capabilityId: request.capabilityId,
        },
      },
      create: {
        symbolId: request.symbolId,
        capabilityId: request.capabilityId,
        linkType: request.linkType,
        confidence: request.confidence ?? 1.0,
        evidence: (request.evidence ?? []) as Prisma.InputJsonValue,
        isAutoLinked: false,
        linkedBy: linkedBy,
        linkedAt: new Date(),
      },
      update: {
        linkType: request.linkType,
        confidence: request.confidence ?? 1.0,
        evidence: (request.evidence ?? []) as Prisma.InputJsonValue,
        isAutoLinked: false,
        linkedBy: linkedBy,
        linkedAt: new Date(),
      },
    });

    return this.mapToSymbolCapabilityLink(link);
  }

  /**
   * Remove a symbol-capability link
   */
  async unlinkSymbolFromCapability(
    tenantId: TenantId,
    symbolId: CodeSymbolId,
    capabilityId: CapabilityId
  ): Promise<boolean> {
    const result = await this.prisma.symbolCapabilityLink.deleteMany({
      where: {
        symbolId,
        capabilityId,
      },
    });
    return result.count > 0;
  }

  /**
   * Get all symbols linked to a capability
   */
  async getCapabilitySymbols(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    options?: { minConfidence?: number; linkTypes?: CapabilityLinkType[] }
  ): Promise<Array<{ symbol: CodeSymbol; link: SymbolCapabilityLink }>> {
    const links = await this.prisma.symbolCapabilityLink.findMany({
      where: {
        capabilityId,
        confidence: options?.minConfidence
          ? { gte: options.minConfidence }
          : undefined,
        linkType: options?.linkTypes
          ? { in: options.linkTypes }
          : undefined,
      },
      include: {
        symbol: {
          include: {
            file: true,
          },
        },
      },
    });

    return links.map((link) => ({
      symbol: this.mapToCodeSymbol(link.symbol),
      link: this.mapToSymbolCapabilityLink(link),
    }));
  }

  /**
   * Get all capabilities linked to a symbol
   */
  async getSymbolCapabilities(
    tenantId: TenantId,
    symbolId: CodeSymbolId
  ): Promise<SymbolCapabilityLink[]> {
    const links = await this.prisma.symbolCapabilityLink.findMany({
      where: { symbolId },
    });
    return links.map(this.mapToSymbolCapabilityLink);
  }

  // ============================================================================
  // CAPABILITY CODE SUMMARY
  // ============================================================================

  /**
   * Get all code associated with a capability
   */
  async getCapabilityCode(
    tenantId: TenantId,
    request: CapabilityCodeRequest
  ): Promise<CapabilityCodeSummary> {
    const capability = await this.prisma.capability.findUnique({
      where: { id: request.capabilityId },
    });

    if (!capability) {
      throw new Error(`Capability ${request.capabilityId} not found`);
    }

    const links = await this.prisma.symbolCapabilityLink.findMany({
      where: {
        capabilityId: request.capabilityId,
        confidence: request.minConfidence
          ? { gte: request.minConfidence }
          : undefined,
        ...(request.includeTests === false
          ? { linkType: { not: 'TESTS' } }
          : {}),
      },
      include: {
        symbol: {
          include: {
            file: true,
          },
        },
      },
    });

    // Group by file
    const fileMap = new Map<string, { path: string; symbols: typeof links }>();
    for (const link of links) {
      const fileId = link.symbol.fileId;
      if (!fileMap.has(fileId)) {
        fileMap.set(fileId, {
          path: link.symbol.file.path,
          symbols: [],
        });
      }
      fileMap.get(fileId)!.symbols.push(link);
    }

    // Calculate totals
    const totalLines = links.reduce(
      (sum, l) => sum + l.symbol.lineCount,
      0
    );
    const totalComplexity = links.reduce(
      (sum, l) => sum + l.symbol.cyclomaticComplexity,
      0
    );

    return {
      capabilityId: request.capabilityId as CapabilityId,
      capabilityName: capability.name,
      totalSymbols: links.length,
      totalFiles: fileMap.size,
      totalLines,
      avgComplexity: links.length > 0 ? totalComplexity / links.length : 0,
      symbols: links.map((link) => ({
        symbol: this.mapToCodeSymbol(link.symbol),
        linkType: link.linkType as CapabilityLinkType,
        confidence: link.confidence,
        filePath: link.symbol.file.path,
      })),
      files: Array.from(fileMap.entries()).map(([fileId, data]) => ({
        fileId: fileId as any,
        path: data.path,
        symbolCount: data.symbols.length,
      })),
    };
  }

  // ============================================================================
  // HEALTH SCORE CALCULATION
  // ============================================================================

  /**
   * Calculate and store health snapshot for a capability
   */
  async calculateCapabilityHealth(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    repositoryId: RepositoryId
  ): Promise<CapabilityHealth> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all linked symbols for this capability in this repository
    const links = await this.prisma.symbolCapabilityLink.findMany({
      where: {
        capabilityId,
        symbol: {
          repositoryId,
          deletedAt: null,
        },
      },
      include: {
        symbol: {
          include: {
            file: true,
          },
        },
      },
    });

    // Calculate metrics
    const symbolCount = links.length;
    const testLinks = links.filter((l) => l.linkType === 'TESTS');

    // Complexity metrics
    const complexities = links.map((l) => l.symbol.cyclomaticComplexity);
    const totalComplexity = complexities.reduce((a, b) => a + b, 0);
    const avgComplexity = symbolCount > 0 ? totalComplexity / symbolCount : 0;
    const maxComplexity = Math.max(0, ...complexities);

    // Line counts
    const totalLineCount = links.reduce((sum, l) => sum + l.symbol.lineCount, 0);

    // Documentation
    const documentedSymbols = links.filter(
      (l) => l.symbol.documentation && l.symbol.documentation.length > 0
    ).length;
    const documentationRatio =
      symbolCount > 0 ? documentedSymbols / symbolCount : 0;

    // Test coverage (simplified - ratio of test symbols to implementation)
    const implLinks = links.filter((l) => l.linkType !== 'TESTS');
    const testCoverage =
      implLinks.length > 0
        ? Math.min(100, (testLinks.length / implLinks.length) * 100)
        : 0;

    // Get previous health for trend calculation
    const previousHealth = await this.prisma.capabilityHealth.findFirst({
      where: {
        capabilityId,
        repositoryId,
        date: {
          lt: today,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate component scores
    const complexityScore = this.calculateComplexityScore(
      avgComplexity,
      maxComplexity
    );
    const qualityScore = this.calculateQualityScore(
      testCoverage,
      0, // lint issues - would need integration
      documentationRatio
    );
    const stabilityScore = 75; // Would need churn data
    const maintainabilityScore = this.calculateMaintainabilityScore(
      avgComplexity,
      documentationRatio,
      symbolCount
    );

    // Calculate overall health score
    const overallHealthScore =
      complexityScore * this.config.weights.complexity +
      qualityScore * this.config.weights.quality +
      stabilityScore * this.config.weights.stability +
      maintainabilityScore * this.config.weights.maintainability;

    // Determine status
    const healthStatus = this.determineHealthStatus(overallHealthScore);

    // Calculate trend
    const trendDelta = previousHealth
      ? overallHealthScore - previousHealth.overallHealthScore
      : 0;
    const healthTrend = this.determineHealthTrend(trendDelta);

    // Upsert health record
    const health = await this.prisma.capabilityHealth.upsert({
      where: {
        capabilityId_repositoryId_date: {
          capabilityId,
          repositoryId,
          date: today,
        },
      },
      create: {
        capabilityId,
        repositoryId,
        date: today,
        symbolCount,
        totalComplexity,
        avgComplexity,
        maxComplexity,
        totalLineCount,
        documentedSymbols,
        documentationRatio,
        testCoverage,
        testSymbolCount: testLinks.length,
        lintIssueCount: 0,
        typeErrorCount: 0,
        deprecatedUsageCount: 0,
        filesChanged: 0,
        symbolsAdded: 0,
        symbolsModified: 0,
        symbolsRemoved: 0,
        totalChurn: 0,
        incomingDependencies: 0,
        outgoingDependencies: 0,
        couplingScore: 0,
        cohesionScore: 0,
        complexityScore,
        qualityScore,
        stabilityScore,
        maintainabilityScore,
        overallHealthScore,
        healthStatus,
        healthTrend,
        trendDelta,
      },
      update: {
        symbolCount,
        totalComplexity,
        avgComplexity,
        maxComplexity,
        totalLineCount,
        documentedSymbols,
        documentationRatio,
        testCoverage,
        testSymbolCount: testLinks.length,
        complexityScore,
        qualityScore,
        stabilityScore,
        maintainabilityScore,
        overallHealthScore,
        healthStatus,
        healthTrend,
        trendDelta,
      },
    });

    return this.mapToCapabilityHealth(health);
  }

  /**
   * Get health history for a capability
   */
  async getCapabilityHealth(
    tenantId: TenantId,
    request: CapabilityHealthRequest
  ): Promise<CapabilityHealthTrend> {
    const capability = await this.prisma.capability.findUnique({
      where: { id: request.capabilityId },
    });

    if (!capability) {
      throw new Error(`Capability ${request.capabilityId} not found`);
    }

    const healthRecords = await this.prisma.capabilityHealth.findMany({
      where: {
        capabilityId: request.capabilityId,
        repositoryId: request.repositoryId,
        date: {
          gte: request.startDate,
          lte: request.endDate,
        },
      },
      orderBy: { date: 'desc' },
      take: request.limit ?? 30,
    });

    const currentHealth = healthRecords[0] ?? null;
    const history = healthRecords.map(this.mapToCapabilityHealth);

    // Calculate trend metrics
    const delta7d = this.calculateDeltaForDays(history, 7);
    const delta30d = this.calculateDeltaForDays(history, 30);
    const volatility = this.calculateVolatility(history);

    // Generate alerts
    const alerts = this.generateHealthAlerts(currentHealth);

    return {
      capabilityId: request.capabilityId as CapabilityId,
      capabilityName: capability.name,
      currentHealth: currentHealth
        ? this.mapToCapabilityHealth(currentHealth)
        : null,
      history,
      trend: {
        direction: (currentHealth?.healthTrend as HealthTrend) ?? ('STABLE' as HealthTrend),
        delta7d,
        delta30d,
        volatility,
      },
      alerts,
    };
  }

  // ============================================================================
  // EVOLUTION DETECTION
  // ============================================================================

  /**
   * Record an evolution event for a capability
   */
  async recordEvolutionEvent(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    repositoryId: RepositoryId,
    event: {
      eventType: CapabilityEventType;
      commitSha: string;
      commitMessage?: string;
      commitAuthor?: string;
      symbolsAffected: string[];
      filesAffected: string[];
      complexityDelta: number;
      lineCountDelta: number;
      healthScoreDelta: number;
      breakingChange?: boolean;
      changeCategory?: ChangeCategory;
      summary?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<CapabilityEvolution> {
    // Determine significance based on changes
    const significance = this.determineSignificance(
      event.symbolsAffected.length,
      event.complexityDelta,
      event.healthScoreDelta,
      event.breakingChange
    );

    const evolution = await this.prisma.capabilityEvolution.create({
      data: {
        capabilityId,
        repositoryId,
        eventType: event.eventType,
        eventDate: new Date(),
        commitSha: event.commitSha,
        commitMessage: event.commitMessage,
        commitAuthor: event.commitAuthor,
        symbolsAffected: event.symbolsAffected as Prisma.InputJsonValue,
        symbolsAdded: event.eventType === 'SYMBOLS_ADDED'
          ? event.symbolsAffected.length
          : 0,
        symbolsModified: event.eventType === 'SYMBOLS_MODIFIED'
          ? event.symbolsAffected.length
          : 0,
        symbolsRemoved: event.eventType === 'SYMBOLS_REMOVED'
          ? event.symbolsAffected.length
          : 0,
        filesAffected: event.filesAffected as Prisma.InputJsonValue,
        filesChanged: event.filesAffected.length,
        complexityDelta: event.complexityDelta,
        lineCountDelta: event.lineCountDelta,
        healthScoreDelta: event.healthScoreDelta,
        breakingChange: event.breakingChange ?? false,
        requiresReview: significance === 'MAJOR' || significance === 'CRITICAL',
        changeCategory: event.changeCategory ?? 'MAINTENANCE',
        significance,
        summary: event.summary,
        description: event.description,
        tags: (event.tags ?? []) as Prisma.InputJsonValue,
      },
    });

    return this.mapToCapabilityEvolution(evolution);
  }

  /**
   * Get evolution history for a capability
   */
  async getCapabilityEvolution(
    tenantId: TenantId,
    filter: CapabilityEvolutionFilter
  ): Promise<CapabilityEvolutionSummary> {
    const capability = filter.capabilityId
      ? await this.prisma.capability.findUnique({
          where: { id: filter.capabilityId },
        })
      : null;

    const events = await this.prisma.capabilityEvolution.findMany({
      where: {
        capabilityId: filter.capabilityId,
        repositoryId: filter.repositoryId,
        eventType: filter.eventTypes
          ? { in: filter.eventTypes }
          : undefined,
        changeCategory: filter.changeCategories
          ? { in: filter.changeCategories }
          : undefined,
        significance: filter.minSignificance
          ? {
              in: this.getSignificancesAtOrAbove(filter.minSignificance),
            }
          : undefined,
        eventDate: {
          gte: filter.since,
          lte: filter.until,
        },
      },
      orderBy: { eventDate: 'desc' },
      take: filter.limit ?? 100,
      skip: filter.offset ?? 0,
    });

    // Aggregate by type and category
    const eventsByType: Record<string, number> = {};
    const eventsByCategory: Record<string, number> = {};
    const timelineMap = new Map<string, {
      eventCount: number;
      netComplexityChange: number;
      netLineChange: number;
    }>();

    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
      eventsByCategory[event.changeCategory] =
        (eventsByCategory[event.changeCategory] ?? 0) + 1;

      const dateKey = event.eventDate.toISOString().split('T')[0];
      const existing = timelineMap.get(dateKey) ?? {
        eventCount: 0,
        netComplexityChange: 0,
        netLineChange: 0,
      };
      existing.eventCount++;
      existing.netComplexityChange += event.complexityDelta;
      existing.netLineChange += event.lineCountDelta;
      timelineMap.set(dateKey, existing);
    }

    return {
      capabilityId: filter.capabilityId as CapabilityId,
      capabilityName: capability?.name ?? 'All Capabilities',
      totalEvents: events.length,
      eventsByType: eventsByType as any,
      eventsByCategory: eventsByCategory as any,
      events: events.map(this.mapToCapabilityEvolution),
      timeline: Array.from(timelineMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Detect changes since last sync and record evolution events
   */
  async detectEvolution(
    tenantId: TenantId,
    capabilityId: CapabilityId,
    repositoryId: RepositoryId,
    commitSha: string,
    previousCommitSha?: string
  ): Promise<CapabilityEvolution[]> {
    // Get current and previous symbol states
    const currentSymbols = await this.prisma.symbolCapabilityLink.findMany({
      where: {
        capabilityId,
        symbol: {
          repositoryId,
          deletedAt: null,
        },
      },
      include: {
        symbol: true,
      },
    });

    // Get previous health for comparison
    const previousHealth = await this.prisma.capabilityHealth.findFirst({
      where: {
        capabilityId,
        repositoryId,
      },
      orderBy: { date: 'desc' },
    });

    const events: CapabilityEvolution[] = [];

    // Check for complexity spike
    if (previousHealth) {
      const currentComplexity = currentSymbols.reduce(
        (sum, l) => sum + l.symbol.cyclomaticComplexity,
        0
      );
      const complexityDelta = currentComplexity - previousHealth.totalComplexity;

      if (complexityDelta > 50) {
        events.push(
          await this.recordEvolutionEvent(tenantId, capabilityId, repositoryId, {
            eventType: 'COMPLEXITY_SPIKE' as CapabilityEventType,
            commitSha,
            symbolsAffected: currentSymbols.map((l) => l.symbolId),
            filesAffected: [...new Set(currentSymbols.map((l) => l.symbol.fileId))],
            complexityDelta,
            lineCountDelta: 0,
            healthScoreDelta: 0,
            changeCategory: 'MAINTENANCE' as ChangeCategory,
            summary: `Complexity increased by ${complexityDelta}`,
          })
        );
      }
    }

    return events;
  }

  // ============================================================================
  // AUTO-INFERENCE (Placeholder for embedding-based inference)
  // ============================================================================

  /**
   * Infer capability links using embeddings
   * Note: This is a placeholder that would integrate with an embedding service
   */
  async inferCapabilityLinks(
    tenantId: TenantId,
    request: InferCapabilityLinksRequest
  ): Promise<CapabilityInferenceResult[]> {
    // Get capabilities to match against
    const capabilities = request.capabilityId
      ? [await this.prisma.capability.findUnique({
          where: { id: request.capabilityId },
        })]
      : await this.prisma.capability.findMany({
          where: { tenantId },
        });

    const results: CapabilityInferenceResult[] = [];

    for (const capability of capabilities) {
      if (!capability) continue;

      // Get unlinked symbols in the repository
      const linkedSymbolIds = await this.prisma.symbolCapabilityLink.findMany({
        where: { capabilityId: capability.id },
        select: { symbolId: true },
      });

      const linkedIds = new Set(linkedSymbolIds.map((l) => l.symbolId));

      // Find symbols that might match based on name/signature similarity
      // In a real implementation, this would use embeddings
      const potentialMatches = await this.prisma.codeSymbol.findMany({
        where: {
          repositoryId: request.repositoryId,
          deletedAt: null,
          id: { notIn: Array.from(linkedIds) },
          OR: [
            { name: { contains: capability.name, mode: 'insensitive' } },
            { documentation: { contains: capability.name, mode: 'insensitive' } },
          ],
        },
        take: request.maxLinks ?? 20,
      });

      const inferredLinks: InferredCapabilityLink[] = potentialMatches.map(
        (symbol) => ({
          symbolId: symbol.id as CodeSymbolId,
          capabilityId: capability.id as CapabilityId,
          confidence: 0.7, // Would be calculated from embedding similarity
          linkType: 'IMPLEMENTS' as CapabilityLinkType,
          evidence: [
            `Name contains "${capability.name}"`,
          ],
          reasoning: 'Inferred from name/documentation similarity',
        })
      );

      // Filter by threshold
      const filteredLinks = inferredLinks.filter(
        (l) => l.confidence >= (request.threshold ?? 0.5)
      );

      results.push({
        capabilityId: capability.id as CapabilityId,
        capabilityName: capability.name,
        inferredLinks: filteredLinks,
        existingLinks: linkedIds.size,
        newLinksCount: filteredLinks.length,
        processingTime: 0,
      });
    }

    return results;
  }

  /**
   * Apply inferred links (create the actual symbol-capability links)
   */
  async applyInferredLinks(
    tenantId: TenantId,
    links: InferredCapabilityLink[],
    linkedBy?: string
  ): Promise<number> {
    let created = 0;

    for (const link of links) {
      try {
        await this.prisma.symbolCapabilityLink.create({
          data: {
            symbolId: link.symbolId,
            capabilityId: link.capabilityId,
            linkType: link.linkType,
            confidence: link.confidence,
            evidence: link.evidence as Prisma.InputJsonValue,
            isAutoLinked: true,
            linkedBy,
            linkedAt: new Date(),
          },
        });
        created++;
      } catch {
        // Ignore duplicates
      }
    }

    return created;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private calculateComplexityScore(
    avgComplexity: number,
    maxComplexity: number
  ): number {
    // Score decreases as complexity increases
    const avgPenalty = Math.min(
      50,
      (avgComplexity / this.config.complexityTargets.maxAvgComplexity) * 50
    );
    const maxPenalty = Math.min(
      50,
      (maxComplexity / this.config.complexityTargets.maxSingleComplexity) * 50
    );
    return Math.max(0, 100 - avgPenalty - maxPenalty);
  }

  private calculateQualityScore(
    testCoverage: number,
    lintIssues: number,
    documentationRatio: number
  ): number {
    const coverageScore =
      (testCoverage / this.config.qualityTargets.minTestCoverage) * 40;
    const lintScore = lintIssues === 0 ? 30 : Math.max(0, 30 - lintIssues * 5);
    const docScore =
      (documentationRatio / this.config.qualityTargets.minDocumentationRatio) *
      30;
    return Math.min(100, coverageScore + lintScore + docScore);
  }

  private calculateMaintainabilityScore(
    avgComplexity: number,
    documentationRatio: number,
    symbolCount: number
  ): number {
    const complexityFactor = Math.max(0, 1 - avgComplexity / 30);
    const docFactor = documentationRatio;
    const sizeFactor = symbolCount > 100 ? 0.7 : symbolCount > 50 ? 0.85 : 1.0;
    return (complexityFactor * 0.4 + docFactor * 0.4 + sizeFactor * 0.2) * 100;
  }

  private determineHealthStatus(score: number): CapabilityHealthStatus {
    if (score >= this.config.thresholds.healthy) return 'HEALTHY' as any;
    if (score >= this.config.thresholds.warning) return 'WARNING' as any;
    return 'CRITICAL' as any;
  }

  private determineHealthTrend(delta: number): HealthTrend {
    if (delta > 5) return 'IMPROVING' as any;
    if (delta < -5) return 'DECLINING' as any;
    return 'STABLE' as any;
  }

  private determineSignificance(
    symbolsAffected: number,
    complexityDelta: number,
    healthScoreDelta: number,
    breakingChange?: boolean
  ): ChangeSignificance {
    if (breakingChange) return 'CRITICAL' as any;
    if (symbolsAffected > 10 || Math.abs(healthScoreDelta) > 20)
      return 'MAJOR' as any;
    if (symbolsAffected > 5 || Math.abs(complexityDelta) > 20)
      return 'MODERATE' as any;
    if (symbolsAffected > 1) return 'MINOR' as any;
    return 'TRIVIAL' as any;
  }

  private getSignificancesAtOrAbove(min: ChangeSignificance): PrismaChangeSignificance[] {
    const order: PrismaChangeSignificance[] = [
      PrismaChangeSignificance.TRIVIAL,
      PrismaChangeSignificance.MINOR,
      PrismaChangeSignificance.MODERATE,
      PrismaChangeSignificance.MAJOR,
      PrismaChangeSignificance.CRITICAL,
    ];
    const idx = order.indexOf(min as PrismaChangeSignificance);
    return order.slice(idx >= 0 ? idx : 0);
  }

  private calculateDeltaForDays(
    history: CapabilityHealth[],
    days: number
  ): number {
    if (history.length < 2) return 0;
    const now = history[0];
    const past = history.find((h) => {
      const diff =
        (now.date.getTime() - h.date.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= days;
    });
    return past ? now.overallHealthScore - past.overallHealthScore : 0;
  }

  private calculateVolatility(history: CapabilityHealth[]): number {
    if (history.length < 3) return 0;
    const deltas = history
      .slice(0, -1)
      .map((h, i) => Math.abs(h.overallHealthScore - history[i + 1].overallHealthScore));
    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }

  private generateHealthAlerts(
    health: any
  ): Array<{
    type: 'warning' | 'critical';
    metric: string;
    message: string;
    value: number;
    threshold: number;
  }> {
    if (!health) return [];
    const alerts: any[] = [];

    if (health.avgComplexity > this.config.complexityTargets.maxAvgComplexity) {
      alerts.push({
        type: 'warning',
        metric: 'avgComplexity',
        message: 'Average complexity exceeds target',
        value: health.avgComplexity,
        threshold: this.config.complexityTargets.maxAvgComplexity,
      });
    }

    if (health.testCoverage < this.config.qualityTargets.minTestCoverage) {
      alerts.push({
        type:
          health.testCoverage < this.config.qualityTargets.minTestCoverage / 2
            ? 'critical'
            : 'warning',
        metric: 'testCoverage',
        message: 'Test coverage below target',
        value: health.testCoverage,
        threshold: this.config.qualityTargets.minTestCoverage,
      });
    }

    if (
      health.documentationRatio <
      this.config.qualityTargets.minDocumentationRatio
    ) {
      alerts.push({
        type: 'warning',
        metric: 'documentationRatio',
        message: 'Documentation coverage below target',
        value: health.documentationRatio,
        threshold: this.config.qualityTargets.minDocumentationRatio,
      });
    }

    return alerts;
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapToSymbolCapabilityLink(link: any): SymbolCapabilityLink {
    return {
      id: link.id as any,
      symbolId: link.symbolId as CodeSymbolId,
      capabilityId: link.capabilityId,
      confidence: link.confidence,
      linkType: link.linkType as CapabilityLinkType,
      isAutoLinked: link.isAutoLinked,
      evidence: (link.evidence as string[]) ?? [],
      linkedBy: link.linkedBy ?? undefined,
      linkedAt: link.linkedAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  private mapToCodeSymbol(symbol: any): CodeSymbol {
    return {
      id: symbol.id as CodeSymbolId,
      repositoryId: symbol.repositoryId as RepositoryId,
      fileId: symbol.fileId as any,
      name: symbol.name,
      kind: symbol.kind as any,
      signature: symbol.signature ?? undefined,
      documentation: symbol.documentation ?? undefined,
      startLine: symbol.startLine,
      startColumn: symbol.startColumn,
      endLine: symbol.endLine,
      endColumn: symbol.endColumn,
      parentSymbolId: symbol.parentSymbolId as CodeSymbolId | undefined,
      containerName: symbol.containerName ?? undefined,
      visibility: symbol.visibility as any,
      isExported: symbol.isExported,
      isAsync: symbol.isAsync,
      isStatic: symbol.isStatic,
      isAbstract: symbol.isAbstract,
      cyclomaticComplexity: symbol.cyclomaticComplexity,
      cognitiveComplexity: symbol.cognitiveComplexity,
      lineCount: symbol.lineCount,
      parameterCount: symbol.parameterCount,
      returnType: symbol.returnType ?? undefined,
      parameters: (symbol.parameters as any[]) ?? [],
      typeParameters: (symbol.typeParameters as string[]) ?? [],
      metadata: (symbol.metadata as any) ?? {},
      createdAt: symbol.createdAt,
      updatedAt: symbol.updatedAt,
      deletedAt: symbol.deletedAt ?? undefined,
      deletedInCommit: symbol.deletedInCommit ?? undefined,
    };
  }

  private mapToCapabilityHealth(health: any): CapabilityHealth {
    return {
      id: health.id as CapabilityHealthId,
      capabilityId: health.capabilityId as CapabilityId,
      repositoryId: health.repositoryId as RepositoryId,
      date: health.date,
      symbolCount: health.symbolCount,
      totalComplexity: health.totalComplexity,
      avgComplexity: health.avgComplexity,
      maxComplexity: health.maxComplexity,
      totalLineCount: health.totalLineCount,
      documentedSymbols: health.documentedSymbols,
      documentationRatio: health.documentationRatio,
      testCoverage: health.testCoverage,
      testSymbolCount: health.testSymbolCount,
      lintIssueCount: health.lintIssueCount,
      typeErrorCount: health.typeErrorCount,
      deprecatedUsageCount: health.deprecatedUsageCount,
      filesChanged: health.filesChanged,
      symbolsAdded: health.symbolsAdded,
      symbolsModified: health.symbolsModified,
      symbolsRemoved: health.symbolsRemoved,
      totalChurn: health.totalChurn,
      incomingDependencies: health.incomingDependencies,
      outgoingDependencies: health.outgoingDependencies,
      couplingScore: health.couplingScore,
      cohesionScore: health.cohesionScore,
      complexityScore: health.complexityScore,
      qualityScore: health.qualityScore,
      stabilityScore: health.stabilityScore,
      maintainabilityScore: health.maintainabilityScore,
      overallHealthScore: health.overallHealthScore,
      healthStatus: health.healthStatus as CapabilityHealthStatus,
      healthTrend: health.healthTrend as HealthTrend,
      trendDelta: health.trendDelta,
      createdAt: health.createdAt,
    };
  }

  private mapToCapabilityEvolution(evolution: any): CapabilityEvolution {
    return {
      id: evolution.id as CapabilityEvolutionId,
      capabilityId: evolution.capabilityId as CapabilityId,
      repositoryId: evolution.repositoryId as RepositoryId,
      eventType: evolution.eventType as CapabilityEventType,
      eventDate: evolution.eventDate,
      commitSha: evolution.commitSha,
      commitMessage: evolution.commitMessage ?? undefined,
      commitAuthor: evolution.commitAuthor ?? undefined,
      symbolsAffected: (evolution.symbolsAffected as string[]) ?? [],
      symbolsAdded: evolution.symbolsAdded,
      symbolsModified: evolution.symbolsModified,
      symbolsRemoved: evolution.symbolsRemoved,
      filesAffected: (evolution.filesAffected as string[]) ?? [],
      filesChanged: evolution.filesChanged,
      complexityDelta: evolution.complexityDelta,
      lineCountDelta: evolution.lineCountDelta,
      healthScoreDelta: evolution.healthScoreDelta,
      breakingChange: evolution.breakingChange,
      requiresReview: evolution.requiresReview,
      changeCategory: evolution.changeCategory as ChangeCategory,
      significance: evolution.significance as ChangeSignificance,
      summary: evolution.summary ?? undefined,
      description: evolution.description ?? undefined,
      tags: (evolution.tags as string[]) ?? [],
      createdAt: evolution.createdAt,
    };
  }
}
