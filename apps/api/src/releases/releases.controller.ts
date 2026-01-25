/**
 * Releases Controller - REST API for release management
 * @prompt-id forge-v4.1:api:controller:releases:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  ReleaseService,
  type TenantId,
  type UserId,
  type ReleaseId,
  type ReleaseType,
  type ReleaseStatus,
  type ReleaseItemType,
  type AnnouncementChannel,
  type AnnouncementStatus,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Releases')
@Controller('releases')
export class ReleasesController {
  constructor(private readonly releaseService: ReleaseService) {}

  // ============================================================================
  // RELEASES
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List releases' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Releases list' })
  async listReleases(
    @TenantContext() ctx: TenantContextData,
    @Query('status') status?: ReleaseStatus,
    @Query('type') type?: ReleaseType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.releaseService.listReleases(ctx.tenantId, {
      status,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get release metrics' })
  @ApiResponse({ status: 200, description: 'Release metrics' })
  async getReleaseMetrics(@TenantContext() ctx: TenantContextData) {
    return this.releaseService.getReleaseMetrics(ctx.tenantId);
  }

  @Get('changelog')
  @ApiOperation({ summary: 'Get public changelog' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'beforeVersion', required: false })
  @ApiResponse({ status: 200, description: 'Public changelog' })
  async getPublicChangelog(
    @TenantContext() ctx: TenantContextData,
    @Query('limit') limit?: string,
    @Query('beforeVersion') beforeVersion?: string
  ) {
    return this.releaseService.getPublicChangelog(ctx.tenantId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      beforeVersion,
    });
  }

  @Get(':releaseId')
  @ApiOperation({ summary: 'Get release by ID' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Release details' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async getRelease(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string
  ) {
    const release = await this.releaseService.getRelease(ctx.tenantId, releaseId as ReleaseId);
    if (!release) {
      throw new NotFoundException(`Release not found: ${releaseId}`);
    }
    return release;
  }

  @Get('version/:version')
  @ApiOperation({ summary: 'Get release by version' })
  @ApiParam({ name: 'version', description: 'Version string' })
  @ApiResponse({ status: 200, description: 'Release details' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async getReleaseByVersion(
    @TenantContext() ctx: TenantContextData,
    @Param('version') version: string
  ) {
    const release = await this.releaseService.getReleaseByVersion(ctx.tenantId, version);
    if (!release) {
      throw new NotFoundException(`Release not found: ${version}`);
    }
    return release;
  }

  @Post()
  @ApiOperation({ summary: 'Create release' })
  @ApiResponse({ status: 201, description: 'Release created' })
  async createRelease(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      version: string;
      name?: string;
      description?: string;
      type?: ReleaseType;
      plannedDate?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.releaseService.createRelease(ctx.tenantId, {
      ...body,
      createdById: ctx.userId,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
    });
  }

  @Patch(':releaseId')
  @ApiOperation({ summary: 'Update release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Release updated' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async updateRelease(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: ReleaseStatus;
      plannedDate?: string;
      releaseNotes?: string;
      changelogMd?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const release = await this.releaseService.updateRelease(
      ctx.tenantId,
      releaseId as ReleaseId,
      {
        ...body,
        plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
      }
    );
    if (!release) {
      throw new NotFoundException(`Release not found: ${releaseId}`);
    }
    return release;
  }

  @Post(':releaseId/publish')
  @ApiOperation({ summary: 'Publish release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Release published' })
  @ApiResponse({ status: 404, description: 'Release not found' })
  async publishRelease(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string
  ) {
    const release = await this.releaseService.publishRelease(
      ctx.tenantId,
      releaseId as ReleaseId
    );
    if (!release) {
      throw new NotFoundException(`Release not found: ${releaseId}`);
    }
    return release;
  }

  @Post(':releaseId/rollback')
  @ApiOperation({ summary: 'Rollback release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Release rolled back' })
  @ApiResponse({ status: 404, description: 'Release not found or not released' })
  async rollbackRelease(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string
  ) {
    const release = await this.releaseService.rollbackRelease(
      ctx.tenantId,
      releaseId as ReleaseId
    );
    if (!release) {
      throw new NotFoundException(`Release not found or not in released status: ${releaseId}`);
    }
    return release;
  }

  @Delete(':releaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 204, description: 'Release deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete released release' })
  async deleteRelease(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string
  ) {
    try {
      await this.releaseService.deleteRelease(ctx.tenantId, releaseId as ReleaseId);
    } catch (error: any) {
      if (error.message?.includes('Cannot delete')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  // ============================================================================
  // RELEASE ITEMS
  // ============================================================================

  @Post(':releaseId/items')
  @ApiOperation({ summary: 'Add item to release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 201, description: 'Item added' })
  async addItem(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Body()
    body: {
      itemType: ReleaseItemType;
      itemId: string;
      title: string;
      description?: string;
      category?: string;
      isHighlight?: boolean;
      orderIndex?: number;
    }
  ) {
    return this.releaseService.addItem(ctx.tenantId, releaseId as ReleaseId, body);
  }

  @Patch(':releaseId/items/:itemId')
  @ApiOperation({ summary: 'Update release item' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateItem(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Param('itemId') itemId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      category?: string;
      isHighlight?: boolean;
      orderIndex?: number;
    }
  ) {
    const item = await this.releaseService.updateItem(
      ctx.tenantId,
      releaseId as ReleaseId,
      itemId,
      body
    );
    if (!item) {
      throw new NotFoundException(`Item not found: ${itemId}`);
    }
    return item;
  }

  @Delete(':releaseId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({ status: 204, description: 'Item removed' })
  async removeItem(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Param('itemId') itemId: string
  ) {
    await this.releaseService.removeItem(ctx.tenantId, releaseId as ReleaseId, itemId);
  }

  @Patch(':releaseId/items/reorder')
  @ApiOperation({ summary: 'Reorder release items' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Items reordered' })
  async reorderItems(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Body()
    body: {
      order: Array<{ itemId: string; orderIndex: number }>;
    }
  ) {
    await this.releaseService.reorderItems(ctx.tenantId, releaseId as ReleaseId, body.order);
    return { success: true };
  }

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  @Post(':releaseId/announcements')
  @ApiOperation({ summary: 'Create announcement' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async createAnnouncement(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Body()
    body: {
      channel: AnnouncementChannel;
      title: string;
      content: string;
      scheduledFor?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.releaseService.createAnnouncement(ctx.tenantId, releaseId as ReleaseId, {
      ...body,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    });
  }

  @Patch(':releaseId/announcements/:announcementId')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiParam({ name: 'announcementId', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async updateAnnouncement(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Param('announcementId') announcementId: string,
    @Body()
    body: {
      channel?: AnnouncementChannel;
      title?: string;
      content?: string;
      status?: AnnouncementStatus;
      scheduledFor?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const announcement = await this.releaseService.updateAnnouncement(
      ctx.tenantId,
      releaseId as ReleaseId,
      announcementId,
      {
        ...body,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      }
    );
    if (!announcement) {
      throw new NotFoundException(`Announcement not found: ${announcementId}`);
    }
    return announcement;
  }

  @Post(':releaseId/announcements/:announcementId/publish')
  @ApiOperation({ summary: 'Publish announcement' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiParam({ name: 'announcementId', description: 'Announcement ID' })
  @ApiResponse({ status: 200, description: 'Announcement published' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async publishAnnouncement(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Param('announcementId') announcementId: string
  ) {
    const announcement = await this.releaseService.publishAnnouncement(
      ctx.tenantId,
      releaseId as ReleaseId,
      announcementId,
      ctx.userId
    );
    if (!announcement) {
      throw new NotFoundException(`Announcement not found: ${announcementId}`);
    }
    return announcement;
  }

  @Delete(':releaseId/announcements/:announcementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiParam({ name: 'announcementId', description: 'Announcement ID' })
  @ApiResponse({ status: 204, description: 'Announcement deleted' })
  async deleteAnnouncement(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string,
    @Param('announcementId') announcementId: string
  ) {
    await this.releaseService.deleteAnnouncement(
      ctx.tenantId,
      releaseId as ReleaseId,
      announcementId
    );
  }

  // ============================================================================
  // CHANGELOG GENERATION
  // ============================================================================

  @Post(':releaseId/generate-changelog')
  @ApiOperation({ summary: 'Generate changelog for release' })
  @ApiParam({ name: 'releaseId', description: 'Release ID' })
  @ApiResponse({ status: 200, description: 'Changelog generated' })
  async generateChangelog(
    @TenantContext() ctx: TenantContextData,
    @Param('releaseId') releaseId: string
  ) {
    const changelog = await this.releaseService.generateChangelog(
      ctx.tenantId,
      releaseId as ReleaseId
    );
    return { changelog };
  }
}
