/**
 * Context Assembly Service - Assembles context for Claude injection
 * @prompt-id forge-v4.1:service:assembly:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { createHash } from 'crypto';
import type { TenantId, UserId } from '../types';
import type {
  ProjectId,
  AssembleContextOptions,
  AssembledContext,
  ContextSource,
} from '../types/living-software.types';
import { IdentityService } from './identity.service';
import { ProjectService } from './project.service';
import { EmbeddingService } from './embedding.service';
import { countTokens } from '../utils/tokens';

const CACHE_TTL = 300; // 5 minutes
const DEFAULT_MAX_TOKENS = 4000;

// Token budget allocation
const BUDGET_IDENTITY = 0.2; // 20% for identity
const BUDGET_PROJECT = 0.5; // 50% for active project
const BUDGET_OTHER = 0.3; // 30% for other relevant context

export class AssemblyService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly identityService: IdentityService,
    private readonly projectService: ProjectService,
    private readonly embeddingService: EmbeddingService
  ) {}

  // ============================================================================
  // MAIN ASSEMBLY METHOD
  // ============================================================================

  async assembleContext(
    tenantId: TenantId,
    options: AssembleContextOptions
  ): Promise<AssembledContext> {
    const { userId, query, projectId, maxTokens = DEFAULT_MAX_TOKENS } = options;

    // Check cache
    const cacheKey = this.getCacheKey(tenantId, userId, query, projectId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const sources: ContextSource[] = [];
    const relevanceScores: Record<string, number> = {};
    let currentTokens = 0;

    // 1. Assemble identity context (20% budget)
    const identityBudget = Math.floor(maxTokens * BUDGET_IDENTITY);
    const identityXml = await this.assembleIdentityContext(
      tenantId,
      userId,
      identityBudget,
      sources,
      relevanceScores
    );
    currentTokens += countTokens(identityXml);

    // 2. Determine and assemble project context (50% budget)
    const projectBudget = Math.floor(maxTokens * BUDGET_PROJECT);
    let projectXml = '';
    let activeProject;

    if (projectId) {
      activeProject = await this.projectService.getProject(tenantId, userId, projectId);
    } else {
      activeProject = await this.projectService.inferActiveProject(tenantId, userId, query);
    }

    if (activeProject) {
      projectXml = await this.assembleProjectContext(
        activeProject,
        projectBudget,
        sources,
        relevanceScores
      );
      currentTokens += countTokens(projectXml);
    }

    // 3. Semantic search for relevant context (30% budget)
    const otherBudget = maxTokens - currentTokens;
    const otherXml = await this.assembleRelevantContext(
      tenantId,
      userId,
      query,
      otherBudget,
      activeProject?.id,
      sources,
      relevanceScores
    );
    currentTokens += countTokens(otherXml);

    // 4. Combine into final XML
    const contextXml = this.formatContextXml(identityXml, projectXml, otherXml);

    const result: AssembledContext = {
      contextXml,
      sources,
      relevanceScores,
      tokenCount: currentTokens,
    };

    // Cache result
    await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  }

  // ============================================================================
  // IDENTITY CONTEXT ASSEMBLY
  // ============================================================================

  private async assembleIdentityContext(
    tenantId: TenantId,
    userId: UserId,
    budget: number,
    sources: ContextSource[],
    relevanceScores: Record<string, number>
  ): Promise<string> {
    const attributes = await this.identityService.getHighConfidenceAttributes(
      tenantId,
      userId,
      0.7
    );

    if (attributes.length === 0) {
      return '';
    }

    // Add sources
    for (const attr of attributes) {
      sources.push({
        id: attr.id,
        type: 'identity',
        name: attr.key,
        confidence: attr.confidence,
        relevance: attr.confidence, // Identity relevance = confidence
      });
      relevanceScores[attr.id] = attr.confidence;
    }

    return this.identityService.formatIdentityForContext(tenantId, userId);
  }

  // ============================================================================
  // PROJECT CONTEXT ASSEMBLY
  // ============================================================================

  private async assembleProjectContext(
    project: any,
    budget: number,
    sources: ContextSource[],
    relevanceScores: Record<string, number>
  ): Promise<string> {
    // Add project as source
    sources.push({
      id: project.id,
      type: 'project',
      name: project.name,
      confidence: project.confidence,
      relevance: 1.0, // Active project is always highly relevant
    });
    relevanceScores[project.id] = 1.0;

    // Add goals as sources
    for (const goal of project.goals || []) {
      sources.push({
        id: goal.id,
        type: 'goal',
        name: goal.description.slice(0, 50),
        confidence: goal.confidence,
        relevance: 0.9,
      });
      relevanceScores[goal.id] = 0.9;
    }

    // Add constraints as sources
    for (const constraint of project.constraints || []) {
      sources.push({
        id: constraint.id,
        type: 'constraint',
        name: constraint.description.slice(0, 50),
        confidence: constraint.confidence,
        relevance: 0.85,
      });
      relevanceScores[constraint.id] = 0.85;
    }

    // Add decisions as sources
    for (const decision of project.decisions || []) {
      sources.push({
        id: decision.id,
        type: 'decision',
        name: decision.description.slice(0, 50),
        confidence: 1.0,
        relevance: decision.reversedAt ? 0.3 : 0.8,
      });
      relevanceScores[decision.id] = decision.reversedAt ? 0.3 : 0.8;
    }

    return this.projectService.formatProjectForContext(project, budget);
  }

  // ============================================================================
  // RELEVANT CONTEXT ASSEMBLY (SEMANTIC SEARCH)
  // ============================================================================

  private async assembleRelevantContext(
    tenantId: TenantId,
    userId: UserId,
    query: string,
    budget: number,
    activeProjectId: string | undefined,
    sources: ContextSource[],
    relevanceScores: Record<string, number>
  ): Promise<string> {
    if (!query || budget <= 0) {
      return '';
    }

    // Get user's context
    const context = await this.identityService.getOrCreateUserContext(tenantId, userId);

    // Get interaction patterns
    const patterns = await this.prisma.interactionPattern.findMany({
      where: {
        contextId: context.id,
        confidence: { gte: 0.6 },
      },
      orderBy: { frequency: 'desc' },
      take: 5,
    });

    if (patterns.length === 0) {
      return '';
    }

    let xml = '<interaction_memory>\n';

    for (const pattern of patterns) {
      const relevance = this.embeddingService.calculateRelevanceScore({
        semanticSimilarity: 0.7, // Placeholder - would compute actual similarity
        recencyDays: this.daysSince(pattern.lastOccurred),
        confidence: pattern.confidence,
        isFromActiveProject: false,
      });

      if (relevance >= 0.5) {
        sources.push({
          id: pattern.id,
          type: 'pattern',
          name: pattern.description.slice(0, 50),
          confidence: pattern.confidence,
          relevance,
        });
        relevanceScores[pattern.id] = relevance;

        xml += `  <pattern type="${pattern.patternType.toLowerCase()}" frequency="${pattern.frequency}">\n`;
        xml += `    ${this.escapeXml(pattern.description)}\n`;
        xml += '  </pattern>\n';
      }
    }

    // Get recent corrections
    const corrections = await this.prisma.interactionCorrection.findMany({
      where: { contextId: context.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    if (corrections.length > 0) {
      for (const correction of corrections) {
        xml += '  <correction>\n';
        xml += `    <original>${this.escapeXml(correction.originalOutput.slice(0, 100))}</original>\n`;
        xml += `    <corrected>${this.escapeXml(correction.correctedTo.slice(0, 100))}</corrected>\n`;
        xml += '  </correction>\n';
      }
    }

    xml += '</interaction_memory>';

    return xml;
  }

  // ============================================================================
  // XML FORMATTING
  // ============================================================================

  private formatContextXml(
    identityXml: string,
    projectXml: string,
    otherXml: string
  ): string {
    let xml = '<claude_context>\n';

    if (identityXml) {
      xml += identityXml + '\n\n';
    }

    if (projectXml) {
      xml += projectXml + '\n\n';
    }

    if (otherXml) {
      xml += otherXml + '\n';
    }

    xml += '</claude_context>';

    return xml;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getCacheKey(
    tenantId: TenantId,
    userId: UserId,
    query: string,
    projectId?: ProjectId
  ): string {
    const queryHash = createHash('sha256')
      .update(query || '')
      .digest('hex')
      .slice(0, 16);
    return `assembly:${tenantId}:${userId}:${queryHash}:${projectId || 'none'}`;
  }

  private daysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
