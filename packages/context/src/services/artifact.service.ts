/**
 * Artifact Service - Manages living artifacts with versioning and provenance
 * @prompt-id forge-v4.1:service:artifact:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { createHash } from 'crypto';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type {
  ProjectId,
  IntentGraphId,
  ArtifactId,
  Artifact,
  ArtifactVersion,
  ArtifactLink,
  ArtifactType,
  ArtifactStatus,
  ArtifactLinkType,
  CreateArtifactRequest,
} from '../types/living-software.types';

const CACHE_TTL = 300;

export interface ArtifactEvolutionProposal {
  artifactId: ArtifactId;
  currentVersion: number;
  proposedChanges: string;
  affectedIntentNodes: string[];
  changeReason: string;
}

export class ArtifactService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // ARTIFACT CRUD
  // ============================================================================

  async listArtifacts(
    tenantId: TenantId,
    projectId: ProjectId,
    options: PaginationOptions & {
      type?: ArtifactType;
      status?: ArtifactStatus;
      intentGraphId?: IntentGraphId;
    } = {}
  ): Promise<PaginatedResult<Artifact>> {
    const { limit = 20, offset = 0, type, status, intentGraphId } = options;

    const where = {
      tenantId,
      projectId,
      ...(type && { type }),
      ...(status && { status }),
      ...(intentGraphId && { intentGraphId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.artifact.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          links: true,
        },
      }),
      this.prisma.artifact.count({ where }),
    ]);

    return {
      data: data.map(this.mapToArtifact.bind(this)),
      total,
      limit,
      offset,
    };
  }

  async getArtifact(
    tenantId: TenantId,
    artifactId: ArtifactId
  ): Promise<Artifact | null> {
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        links: true,
      },
    });

    return artifact ? this.mapToArtifact(artifact) : null;
  }

  async createArtifact(
    tenantId: TenantId,
    userId: UserId,
    request: CreateArtifactRequest
  ): Promise<Artifact> {
    const contentHash = this.hashContent(request.content);

    const artifact = await this.prisma.artifact.create({
      data: {
        tenantId,
        projectId: request.projectId,
        intentGraphId: request.intentGraphId,
        name: request.name,
        description: request.description,
        type: request.type,
        status: 'DRAFT',
        metadata: {},
        createdById: userId,
        versions: {
          create: {
            version: 1,
            content: request.content,
            contentHash,
            synthesizedFrom: [],
            createdById: userId,
          },
        },
      },
      include: {
        versions: true,
        links: true,
      },
    });

    return this.mapToArtifact(artifact);
  }

  async updateArtifact(
    tenantId: TenantId,
    artifactId: ArtifactId,
    updates: Partial<{
      name: string;
      description: string;
      status: ArtifactStatus;
    }>
  ): Promise<Artifact | null> {
    const existing = await this.getArtifact(tenantId, artifactId);
    if (!existing) return null;

    const artifact = await this.prisma.artifact.update({
      where: { id: artifactId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status && { status: updates.status }),
      },
      include: {
        versions: { orderBy: { version: 'desc' } },
        links: true,
      },
    });

    await this.invalidateCache(artifactId);
    return this.mapToArtifact(artifact);
  }

  async deleteArtifact(
    tenantId: TenantId,
    artifactId: ArtifactId
  ): Promise<boolean> {
    const existing = await this.getArtifact(tenantId, artifactId);
    if (!existing) return false;

    await this.prisma.artifact.delete({
      where: { id: artifactId },
    });

    await this.invalidateCache(artifactId);
    return true;
  }

  // ============================================================================
  // VERSION MANAGEMENT
  // ============================================================================

  async createVersion(
    tenantId: TenantId,
    userId: UserId,
    artifactId: ArtifactId,
    content: string,
    options: {
      synthesizedFrom?: string[];
      changelog?: string;
    } = {}
  ): Promise<ArtifactVersion> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const currentVersion = artifact.versions?.[0]?.version || 0;
    const contentHash = this.hashContent(content);

    const version = await this.prisma.artifactVersion.create({
      data: {
        artifactId,
        version: currentVersion + 1,
        content,
        contentHash,
        synthesizedFrom: options.synthesizedFrom || [],
        changelog: options.changelog,
        createdById: userId,
      },
    });

    // Update artifact's updatedAt
    await this.prisma.artifact.update({
      where: { id: artifactId },
      data: { updatedAt: new Date() },
    });

    await this.invalidateCache(artifactId);
    return this.mapToArtifactVersion(version);
  }

  async getVersion(
    tenantId: TenantId,
    artifactId: ArtifactId,
    version: number
  ): Promise<ArtifactVersion | null> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) return null;

    const versionRecord = await this.prisma.artifactVersion.findUnique({
      where: {
        artifactId_version: {
          artifactId,
          version,
        },
      },
    });

    return versionRecord ? this.mapToArtifactVersion(versionRecord) : null;
  }

  async listVersions(
    tenantId: TenantId,
    artifactId: ArtifactId
  ): Promise<ArtifactVersion[]> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) return [];

    const versions = await this.prisma.artifactVersion.findMany({
      where: { artifactId },
      orderBy: { version: 'desc' },
    });

    return versions.map(this.mapToArtifactVersion.bind(this));
  }

  // ============================================================================
  // PROVENANCE LINKS
  // ============================================================================

  async addLink(
    tenantId: TenantId,
    artifactId: ArtifactId,
    link: {
      intentNodeId: string;
      intentNodeType: 'goal' | 'constraint' | 'entity' | 'behavior';
      linkType: ArtifactLinkType;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ArtifactLink> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const result = await this.prisma.artifactLink.create({
      data: {
        artifactId,
        intentNodeId: link.intentNodeId,
        intentNodeType: link.intentNodeType,
        linkType: link.linkType,
        metadata: link.metadata ? JSON.parse(JSON.stringify(link.metadata)) : undefined,
      },
    });

    await this.invalidateCache(artifactId);
    return this.mapToArtifactLink(result);
  }

  async removeLink(
    tenantId: TenantId,
    artifactId: ArtifactId,
    linkId: string
  ): Promise<boolean> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) return false;

    try {
      await this.prisma.artifactLink.delete({
        where: { id: linkId },
      });
      await this.invalidateCache(artifactId);
      return true;
    } catch {
      return false;
    }
  }

  async getArtifactsByIntentNode(
    tenantId: TenantId,
    intentNodeId: string,
    intentNodeType: string
  ): Promise<Artifact[]> {
    const links = await this.prisma.artifactLink.findMany({
      where: {
        intentNodeId,
        intentNodeType,
      },
      include: {
        artifact: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
            links: true,
          },
        },
      },
    });

    return links
      .map((link) => link.artifact)
      .filter((a) => a.tenantId === tenantId)
      .map(this.mapToArtifact.bind(this));
  }

  // ============================================================================
  // ARTIFACT EVOLUTION
  // ============================================================================

  async proposeEvolution(
    tenantId: TenantId,
    artifactId: ArtifactId,
    changedIntentNodeIds: string[]
  ): Promise<ArtifactEvolutionProposal | null> {
    const artifact = await this.getArtifact(tenantId, artifactId);
    if (!artifact) return null;

    const currentVersion = artifact.versions?.[0];
    if (!currentVersion) return null;

    // Find which links are affected
    const affectedLinks = artifact.links?.filter((link) =>
      changedIntentNodeIds.includes(link.intentNodeId)
    ) || [];

    if (affectedLinks.length === 0) {
      return null; // No affected links
    }

    const affectedIntentNodes = affectedLinks.map((l) => l.intentNodeId);
    const changeReason = `Intent nodes changed: ${affectedLinks
      .map((l) => `${l.intentNodeType}:${l.linkType}`)
      .join(', ')}`;

    return {
      artifactId,
      currentVersion: currentVersion.version,
      proposedChanges: `Artifact "${artifact.name}" may need updates due to changes in linked intent nodes.`,
      affectedIntentNodes,
      changeReason,
    };
  }

  async findAffectedArtifacts(
    tenantId: TenantId,
    projectId: ProjectId,
    changedIntentNodeIds: string[]
  ): Promise<ArtifactEvolutionProposal[]> {
    const artifacts = await this.prisma.artifact.findMany({
      where: {
        tenantId,
        projectId,
        status: { in: ['DRAFT', 'ACTIVE'] },
        links: {
          some: {
            intentNodeId: { in: changedIntentNodeIds },
          },
        },
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        links: true,
      },
    });

    const proposals: ArtifactEvolutionProposal[] = [];

    for (const artifact of artifacts) {
      const proposal = await this.proposeEvolution(
        tenantId,
        artifact.id as ArtifactId,
        changedIntentNodeIds
      );
      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  // ============================================================================
  // CONTENT COMPARISON
  // ============================================================================

  async diffVersions(
    tenantId: TenantId,
    artifactId: ArtifactId,
    fromVersion: number,
    toVersion: number
  ): Promise<{
    from: ArtifactVersion;
    to: ArtifactVersion;
    addedLines: number;
    removedLines: number;
  } | null> {
    const from = await this.getVersion(tenantId, artifactId, fromVersion);
    const to = await this.getVersion(tenantId, artifactId, toVersion);

    if (!from || !to) return null;

    const fromLines = from.content.split('\n');
    const toLines = to.content.split('\n');

    // Simple line-based diff
    const fromSet = new Set(fromLines);
    const toSet = new Set(toLines);

    let addedLines = 0;
    let removedLines = 0;

    for (const line of toLines) {
      if (!fromSet.has(line)) addedLines++;
    }

    for (const line of fromLines) {
      if (!toSet.has(line)) removedLines++;
    }

    return { from, to, addedLines, removedLines };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToArtifact(record: any): Artifact {
    return {
      id: record.id as ArtifactId,
      tenantId: record.tenantId as TenantId,
      projectId: record.projectId as ProjectId,
      intentGraphId: record.intentGraphId as IntentGraphId | undefined,
      name: record.name,
      description: record.description,
      type: record.type as ArtifactType,
      status: record.status as ArtifactStatus,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdById: record.createdById as UserId,
      versions: record.versions?.map(this.mapToArtifactVersion.bind(this)),
      links: record.links?.map(this.mapToArtifactLink.bind(this)),
    };
  }

  private mapToArtifactVersion(record: any): ArtifactVersion {
    return {
      id: record.id,
      artifactId: record.artifactId as ArtifactId,
      version: record.version,
      content: record.content,
      contentHash: record.contentHash,
      synthesizedFrom: record.synthesizedFrom || [],
      changelog: record.changelog,
      createdAt: record.createdAt,
      createdById: record.createdById as UserId,
    };
  }

  private mapToArtifactLink(record: any): ArtifactLink {
    return {
      id: record.id,
      artifactId: record.artifactId as ArtifactId,
      intentNodeId: record.intentNodeId,
      intentNodeType: record.intentNodeType,
      linkType: record.linkType as ArtifactLinkType,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
    };
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async invalidateCache(artifactId: ArtifactId): Promise<void> {
    const pattern = `artifact:${artifactId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
