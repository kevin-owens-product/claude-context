/**
 * Release Service - Manages releases, release items, and announcements
 * @prompt-id forge-v4.1:service:release:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, UserId, PaginationOptions, PaginatedResult } from '../types';
import type { ArtifactId } from '../types/living-software.types';

// ============================================================================
// TYPES
// ============================================================================

export type ReleaseId = string & { __brand: 'ReleaseId' };

export type ReleaseType = 'MAJOR' | 'MINOR' | 'PATCH' | 'HOTFIX';
export type ReleaseStatus = 'PLANNED' | 'IN_PROGRESS' | 'STAGED' | 'RELEASED' | 'ROLLED_BACK';
export type ReleaseItemType = 'SLICE' | 'ARTIFACT' | 'FEATURE_REQUEST';
export type AnnouncementChannel = 'EMAIL' | 'IN_APP' | 'BLOG' | 'SOCIAL' | 'SLACK' | 'CHANGELOG';
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export interface Release {
  id: ReleaseId;
  tenantId: TenantId;
  version: string;
  name?: string;
  description?: string;
  type: ReleaseType;
  status: ReleaseStatus;
  plannedDate?: Date;
  releasedAt?: Date;
  releaseNotes?: string;
  changelogMd?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdById?: UserId;
  items?: ReleaseItem[];
  announcements?: ReleaseAnnouncement[];
}

export interface ReleaseItem {
  id: string;
  releaseId: ReleaseId;
  itemType: ReleaseItemType;
  itemId: string;
  title: string;
  description?: string;
  category?: string;
  isHighlight: boolean;
  orderIndex: number;
  createdAt: Date;
}

export interface ReleaseAnnouncement {
  id: string;
  releaseId: ReleaseId;
  channel: AnnouncementChannel;
  status: AnnouncementStatus;
  title: string;
  content: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  publishedById?: UserId;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReleaseRequest {
  version: string;
  name?: string;
  description?: string;
  type?: ReleaseType;
  plannedDate?: Date;
  createdById?: UserId;
  metadata?: Record<string, unknown>;
}

export interface UpdateReleaseRequest {
  name?: string;
  description?: string;
  status?: ReleaseStatus;
  plannedDate?: Date;
  releaseNotes?: string;
  changelogMd?: string;
  metadata?: Record<string, unknown>;
}

export interface AddReleaseItemRequest {
  itemType: ReleaseItemType;
  itemId: string;
  title: string;
  description?: string;
  category?: string;
  isHighlight?: boolean;
  orderIndex?: number;
}

export interface CreateAnnouncementRequest {
  channel: AnnouncementChannel;
  title: string;
  content: string;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

export interface ReleaseMetrics {
  totalReleases: number;
  byType: Record<ReleaseType, number>;
  byStatus: Record<ReleaseStatus, number>;
  avgItemsPerRelease: number;
  avgDaysToRelease: number;
  releasesThisMonth: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ReleaseService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // RELEASE CRUD
  // ============================================================================

  async listReleases(
    tenantId: TenantId,
    options: PaginationOptions & {
      status?: ReleaseStatus;
      type?: ReleaseType;
    } = {}
  ): Promise<PaginatedResult<Release>> {
    const { limit = 20, offset = 0, status, type } = options;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.release.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { plannedDate: 'desc' },
        include: {
          items: {
            orderBy: { orderIndex: 'asc' },
          },
          announcements: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.release.count({ where }),
    ]);

    return {
      data: data.map(this.mapToRelease),
      total,
      limit,
      offset,
    };
  }

  async getRelease(
    tenantId: TenantId,
    releaseId: ReleaseId
  ): Promise<Release | null> {
    const release = await this.prisma.release.findFirst({
      where: { id: releaseId, tenantId },
      include: {
        items: {
          orderBy: [{ isHighlight: 'desc' }, { orderIndex: 'asc' }],
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return release ? this.mapToRelease(release) : null;
  }

  async getReleaseByVersion(
    tenantId: TenantId,
    version: string
  ): Promise<Release | null> {
    const release = await this.prisma.release.findFirst({
      where: { tenantId, version },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
        announcements: true,
      },
    });

    return release ? this.mapToRelease(release) : null;
  }

  async createRelease(
    tenantId: TenantId,
    request: CreateReleaseRequest
  ): Promise<Release> {
    // Determine release type from version if not specified
    const type = request.type || this.inferReleaseType(request.version);

    const release = await this.prisma.release.create({
      data: {
        tenantId,
        version: request.version,
        name: request.name,
        description: request.description,
        type,
        status: 'PLANNED',
        plannedDate: request.plannedDate,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
        createdById: request.createdById,
      },
      include: {
        items: true,
        announcements: true,
      },
    });

    return this.mapToRelease(release);
  }

  async updateRelease(
    tenantId: TenantId,
    releaseId: ReleaseId,
    request: UpdateReleaseRequest
  ): Promise<Release | null> {
    const existing = await this.getRelease(tenantId, releaseId);
    if (!existing) return null;

    const release = await this.prisma.release.update({
      where: { id: releaseId },
      data: {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.description !== undefined && { description: request.description }),
        ...(request.status && { status: request.status }),
        ...(request.plannedDate !== undefined && { plannedDate: request.plannedDate }),
        ...(request.releaseNotes !== undefined && { releaseNotes: request.releaseNotes }),
        ...(request.changelogMd !== undefined && { changelogMd: request.changelogMd }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
      include: {
        items: true,
        announcements: true,
      },
    });

    return this.mapToRelease(release);
  }

  async publishRelease(
    tenantId: TenantId,
    releaseId: ReleaseId
  ): Promise<Release | null> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return null;

    const updated = await this.prisma.release.update({
      where: { id: releaseId },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
      include: {
        items: true,
        announcements: true,
      },
    });

    // Mark all linked feature requests as released
    await this.markFeatureRequestsReleased(releaseId);

    return this.mapToRelease(updated);
  }

  async rollbackRelease(
    tenantId: TenantId,
    releaseId: ReleaseId
  ): Promise<Release | null> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release || release.status !== 'RELEASED') return null;

    const updated = await this.prisma.release.update({
      where: { id: releaseId },
      data: { status: 'ROLLED_BACK' },
      include: {
        items: true,
        announcements: true,
      },
    });

    return this.mapToRelease(updated);
  }

  async deleteRelease(
    tenantId: TenantId,
    releaseId: ReleaseId
  ): Promise<boolean> {
    const existing = await this.getRelease(tenantId, releaseId);
    if (!existing) return false;

    if (existing.status === 'RELEASED') {
      throw new Error('Cannot delete a released release');
    }

    await this.prisma.release.delete({
      where: { id: releaseId },
    });

    return true;
  }

  // ============================================================================
  // RELEASE ITEMS
  // ============================================================================

  async addItem(
    tenantId: TenantId,
    releaseId: ReleaseId,
    request: AddReleaseItemRequest
  ): Promise<ReleaseItem> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    // Get max order index
    const maxOrder = release.items?.length
      ? Math.max(...release.items.map(i => i.orderIndex))
      : -1;

    const item = await this.prisma.releaseItem.create({
      data: {
        releaseId,
        itemType: request.itemType,
        itemId: request.itemId,
        title: request.title,
        description: request.description,
        category: request.category,
        isHighlight: request.isHighlight || false,
        orderIndex: request.orderIndex ?? maxOrder + 1,
      },
    });

    // If this is a feature request, update its target release
    if (request.itemType === 'FEATURE_REQUEST') {
      await this.prisma.featureRequest.update({
        where: { id: request.itemId },
        data: { targetReleaseId: releaseId },
      });
    }

    return this.mapToReleaseItem(item);
  }

  async removeItem(
    tenantId: TenantId,
    releaseId: ReleaseId,
    itemId: string
  ): Promise<boolean> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return false;

    const item = release.items?.find(i => i.id === itemId);
    if (!item) return false;

    await this.prisma.releaseItem.delete({
      where: { id: itemId },
    });

    // Clear target release from feature request if applicable
    if (item.itemType === 'FEATURE_REQUEST') {
      await this.prisma.featureRequest.update({
        where: { id: item.itemId },
        data: { targetReleaseId: null },
      });
    }

    return true;
  }

  async updateItem(
    tenantId: TenantId,
    releaseId: ReleaseId,
    itemId: string,
    updates: Partial<AddReleaseItemRequest>
  ): Promise<ReleaseItem | null> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return null;

    const existing = release.items?.find(i => i.id === itemId);
    if (!existing) return null;

    const item = await this.prisma.releaseItem.update({
      where: { id: itemId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.isHighlight !== undefined && { isHighlight: updates.isHighlight }),
        ...(updates.orderIndex !== undefined && { orderIndex: updates.orderIndex }),
      },
    });

    return this.mapToReleaseItem(item);
  }

  async reorderItems(
    tenantId: TenantId,
    releaseId: ReleaseId,
    itemOrder: { itemId: string; orderIndex: number }[]
  ): Promise<void> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    await Promise.all(
      itemOrder.map(({ itemId, orderIndex }) =>
        this.prisma.releaseItem.update({
          where: { id: itemId },
          data: { orderIndex },
        })
      )
    );
  }

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  async createAnnouncement(
    tenantId: TenantId,
    releaseId: ReleaseId,
    request: CreateAnnouncementRequest
  ): Promise<ReleaseAnnouncement> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    const status = request.scheduledFor ? 'SCHEDULED' : 'DRAFT';

    const announcement = await this.prisma.releaseAnnouncement.create({
      data: {
        releaseId,
        channel: request.channel,
        status,
        title: request.title,
        content: request.content,
        scheduledFor: request.scheduledFor,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToAnnouncement(announcement);
  }

  async updateAnnouncement(
    tenantId: TenantId,
    releaseId: ReleaseId,
    announcementId: string,
    updates: Partial<CreateAnnouncementRequest> & { status?: AnnouncementStatus }
  ): Promise<ReleaseAnnouncement | null> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return null;

    const existing = release.announcements?.find(a => a.id === announcementId);
    if (!existing) return null;

    const announcement = await this.prisma.releaseAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.content && { content: updates.content }),
        ...(updates.channel && { channel: updates.channel }),
        ...(updates.status && { status: updates.status }),
        ...(updates.scheduledFor !== undefined && { scheduledFor: updates.scheduledFor }),
        ...(updates.metadata && { metadata: updates.metadata as Prisma.InputJsonValue }),
      },
    });

    return this.mapToAnnouncement(announcement);
  }

  async publishAnnouncement(
    tenantId: TenantId,
    releaseId: ReleaseId,
    announcementId: string,
    publishedById: UserId
  ): Promise<ReleaseAnnouncement | null> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return null;

    const existing = release.announcements?.find(a => a.id === announcementId);
    if (!existing) return null;

    const announcement = await this.prisma.releaseAnnouncement.update({
      where: { id: announcementId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById,
      },
    });

    return this.mapToAnnouncement(announcement);
  }

  async deleteAnnouncement(
    tenantId: TenantId,
    releaseId: ReleaseId,
    announcementId: string
  ): Promise<boolean> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) return false;

    try {
      await this.prisma.releaseAnnouncement.delete({
        where: { id: announcementId },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CHANGELOG GENERATION
  // ============================================================================

  async generateChangelog(
    tenantId: TenantId,
    releaseId: ReleaseId
  ): Promise<string> {
    const release = await this.getRelease(tenantId, releaseId);
    if (!release) {
      throw new Error(`Release not found: ${releaseId}`);
    }

    const items = release.items || [];

    // Group items by category
    const grouped: Record<string, ReleaseItem[]> = {};
    items.forEach(item => {
      const category = item.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    // Generate markdown
    let md = `# ${release.name || release.version}\n\n`;
    if (release.description) {
      md += `${release.description}\n\n`;
    }

    // Highlights first
    const highlights = items.filter(i => i.isHighlight);
    if (highlights.length > 0) {
      md += `## Highlights\n\n`;
      highlights.forEach(item => {
        md += `- **${item.title}**`;
        if (item.description) md += `: ${item.description}`;
        md += '\n';
      });
      md += '\n';
    }

    // Then by category
    const categoryOrder = ['Features', 'Improvements', 'Bug Fixes', 'Other'];
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    for (const category of sortedCategories) {
      const categoryItems = grouped[category].filter(i => !i.isHighlight);
      if (categoryItems.length === 0) continue;

      md += `## ${category}\n\n`;
      categoryItems.forEach(item => {
        md += `- ${item.title}`;
        if (item.description) md += `: ${item.description}`;
        md += '\n';
      });
      md += '\n';
    }

    // Update release with generated changelog
    await this.prisma.release.update({
      where: { id: releaseId },
      data: { changelogMd: md },
    });

    return md;
  }

  async getPublicChangelog(
    tenantId: TenantId,
    options: { limit?: number; beforeVersion?: string } = {}
  ): Promise<Release[]> {
    const { limit = 10, beforeVersion } = options;

    const where: any = {
      tenantId,
      status: 'RELEASED',
    };

    if (beforeVersion) {
      const beforeRelease = await this.getReleaseByVersion(tenantId, beforeVersion);
      if (beforeRelease) {
        where.releasedAt = { lt: beforeRelease.releasedAt };
      }
    }

    const releases = await this.prisma.release.findMany({
      where,
      orderBy: { releasedAt: 'desc' },
      take: limit,
      include: {
        items: {
          orderBy: [{ isHighlight: 'desc' }, { orderIndex: 'asc' }],
        },
      },
    });

    return releases.map(this.mapToRelease);
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  async getReleaseMetrics(tenantId: TenantId): Promise<ReleaseMetrics> {
    const releases = await this.prisma.release.findMany({
      where: { tenantId },
      include: {
        _count: { select: { items: true } },
      },
    });

    const byType: Record<ReleaseType, number> = {
      MAJOR: 0,
      MINOR: 0,
      PATCH: 0,
      HOTFIX: 0,
    };

    const byStatus: Record<ReleaseStatus, number> = {
      PLANNED: 0,
      IN_PROGRESS: 0,
      STAGED: 0,
      RELEASED: 0,
      ROLLED_BACK: 0,
    };

    let totalItems = 0;
    let totalDays = 0;
    let releasedCount = 0;

    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    let releasesThisMonth = 0;

    releases.forEach(r => {
      byType[r.type as ReleaseType]++;
      byStatus[r.status as ReleaseStatus]++;
      totalItems += r._count.items;

      if (r.status === 'RELEASED' && r.releasedAt && r.createdAt) {
        releasedCount++;
        const days = Math.ceil(
          (r.releasedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDays += days;

        if (r.releasedAt >= monthAgo) {
          releasesThisMonth++;
        }
      }
    });

    return {
      totalReleases: releases.length,
      byType,
      byStatus,
      avgItemsPerRelease: releases.length > 0 ? totalItems / releases.length : 0,
      avgDaysToRelease: releasedCount > 0 ? totalDays / releasedCount : 0,
      releasesThisMonth,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private inferReleaseType(version: string): ReleaseType {
    const parts = version.replace(/^v/, '').split('.');
    if (parts.length >= 3) {
      if (parts[0] !== '0' && parts[1] === '0' && parts[2] === '0') return 'MAJOR';
      if (parts[2] === '0') return 'MINOR';
    }
    return 'PATCH';
  }

  private async markFeatureRequestsReleased(releaseId: ReleaseId): Promise<void> {
    const items = await this.prisma.releaseItem.findMany({
      where: { releaseId, itemType: 'FEATURE_REQUEST' },
      select: { itemId: true },
    });

    if (items.length > 0) {
      await this.prisma.featureRequest.updateMany({
        where: { id: { in: items.map(i => i.itemId) } },
        data: { status: 'RELEASED', releasedInId: releaseId },
      });
    }
  }

  private mapToRelease = (record: any): Release => {
    return {
      id: record.id as ReleaseId,
      tenantId: record.tenantId as TenantId,
      version: record.version,
      name: record.name,
      description: record.description,
      type: record.type as ReleaseType,
      status: record.status as ReleaseStatus,
      plannedDate: record.plannedDate,
      releasedAt: record.releasedAt,
      releaseNotes: record.releaseNotes,
      changelogMd: record.changelogMd,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdById: record.createdById as UserId | undefined,
      items: record.items?.map(this.mapToReleaseItem),
      announcements: record.announcements?.map(this.mapToAnnouncement),
    };
  };

  private mapToReleaseItem = (record: any): ReleaseItem => {
    return {
      id: record.id,
      releaseId: record.releaseId as ReleaseId,
      itemType: record.itemType as ReleaseItemType,
      itemId: record.itemId,
      title: record.title,
      description: record.description,
      category: record.category,
      isHighlight: record.isHighlight,
      orderIndex: record.orderIndex,
      createdAt: record.createdAt,
    };
  };

  private mapToAnnouncement = (record: any): ReleaseAnnouncement => {
    return {
      id: record.id,
      releaseId: record.releaseId as ReleaseId,
      channel: record.channel as AnnouncementChannel,
      status: record.status as AnnouncementStatus,
      title: record.title,
      content: record.content,
      scheduledFor: record.scheduledFor,
      publishedAt: record.publishedAt,
      publishedById: record.publishedById as UserId | undefined,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };
}
