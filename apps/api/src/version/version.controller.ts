/**
 * @prompt-id forge-v4.1:controller:version:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VersionService } from './version.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface GetHistoryQuery {
  limit?: string;
  offset?: string;
  fromVersion?: string;
  toVersion?: string;
}

interface DiffQuery {
  fromVersion: string;
  toVersion: string;
}

interface RollbackBody {
  toVersion: number;
}

@Controller('entities')
@UseGuards(JwtAuthGuard)
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  /**
   * Get change history for an entity
   */
  @Get(':type/:id/history')
  async getHistory(
    @Request() req: any,
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query() query: GetHistoryQuery,
  ) {
    const tenantId = req.user.tenantId;

    return this.versionService.getHistory(tenantId, entityType, entityId, {
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
      fromVersion: query.fromVersion
        ? parseInt(query.fromVersion, 10)
        : undefined,
      toVersion: query.toVersion ? parseInt(query.toVersion, 10) : undefined,
    });
  }

  /**
   * Get entity at a specific version
   */
  @Get(':type/:id/versions/:version')
  async getAtVersion(
    @Request() req: any,
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Param('version') version: string,
  ) {
    const tenantId = req.user.tenantId;

    return this.versionService.getAtVersion(
      tenantId,
      entityType,
      entityId,
      parseInt(version, 10),
    );
  }

  /**
   * Get diff between two versions
   */
  @Get(':type/:id/diff')
  async diff(
    @Request() req: any,
    @Param('type') entityType: string,
    @Param('id') entityId: string,
    @Query() query: DiffQuery,
  ) {
    const tenantId = req.user.tenantId;

    return this.versionService.diff(
      tenantId,
      entityType,
      entityId,
      parseInt(query.fromVersion, 10),
      parseInt(query.toVersion, 10),
    );
  }

  /**
   * Get current global version for tenant
   */
  @Get('version')
  async getGlobalVersion(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const version = await this.versionService.getGlobalVersion(tenantId);

    return {
      tenantId,
      globalVersion: version.toString(),
    };
  }
}
