/**
 * Artifacts Controller - REST API for living artifacts
 * @prompt-id forge-v4.1:api:controller:artifacts:001
 * @generated-at 2026-01-23T00:00:00Z
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  ArtifactService,
  type TenantId,
  type UserId,
  type ProjectId,
  type IntentGraphId,
  type ArtifactId,
  type ArtifactType,
  type ArtifactStatus,
  type ArtifactLinkType,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Artifacts')
@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Get()
  @ApiOperation({ summary: 'List artifacts for a project' })
  @ApiQuery({ name: 'projectId', required: true })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'intentGraphId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Artifacts list' })
  async listArtifacts(
    @TenantContext() ctx: TenantContextData,
    @Query('projectId') projectId: string,
    @Query('type') type?: ArtifactType,
    @Query('status') status?: ArtifactStatus,
    @Query('intentGraphId') intentGraphId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.artifactService.listArtifacts(ctx.tenantId, projectId as ProjectId, {
      type,
      status,
      intentGraphId: intentGraphId as IntentGraphId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':artifactId')
  @ApiOperation({ summary: 'Get artifact by ID' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 200, description: 'Artifact details' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async getArtifact(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string
  ) {
    const artifact = await this.artifactService.getArtifact(
      ctx.tenantId,
      artifactId as ArtifactId
    );
    if (!artifact) {
      throw new NotFoundException(`Artifact not found: ${artifactId}`);
    }
    return artifact;
  }

  @Post()
  @ApiOperation({ summary: 'Create new artifact' })
  @ApiResponse({ status: 201, description: 'Artifact created' })
  async createArtifact(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      projectId: string;
      intentGraphId?: string;
      name: string;
      description?: string;
      type: ArtifactType;
      content: string;
    }
  ) {
    return this.artifactService.createArtifact(ctx.tenantId, ctx.userId, {
      projectId: body.projectId as ProjectId,
      intentGraphId: body.intentGraphId as IntentGraphId,
      name: body.name,
      description: body.description,
      type: body.type,
      content: body.content,
    });
  }

  @Patch(':artifactId')
  @ApiOperation({ summary: 'Update artifact' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 200, description: 'Artifact updated' })
  async updateArtifact(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: ArtifactStatus;
    }
  ) {
    const artifact = await this.artifactService.updateArtifact(
      ctx.tenantId,
      artifactId as ArtifactId,
      body
    );
    if (!artifact) {
      throw new NotFoundException(`Artifact not found: ${artifactId}`);
    }
    return artifact;
  }

  @Delete(':artifactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete artifact' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 204, description: 'Artifact deleted' })
  async deleteArtifact(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string
  ) {
    await this.artifactService.deleteArtifact(ctx.tenantId, artifactId as ArtifactId);
  }

  // ============================================================================
  // VERSIONS
  // ============================================================================

  @Get(':artifactId/versions')
  @ApiOperation({ summary: 'List artifact versions' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 200, description: 'Versions list' })
  async listVersions(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string
  ) {
    return this.artifactService.listVersions(ctx.tenantId, artifactId as ArtifactId);
  }

  @Get(':artifactId/versions/:version')
  @ApiOperation({ summary: 'Get specific artifact version' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiParam({ name: 'version', description: 'Version number' })
  @ApiResponse({ status: 200, description: 'Version details' })
  async getVersion(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Param('version') version: string
  ) {
    const v = await this.artifactService.getVersion(
      ctx.tenantId,
      artifactId as ArtifactId,
      parseInt(version, 10)
    );
    if (!v) {
      throw new NotFoundException(`Version ${version} not found`);
    }
    return v;
  }

  @Post(':artifactId/versions')
  @ApiOperation({ summary: 'Create new artifact version' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async createVersion(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Body()
    body: {
      content: string;
      synthesizedFrom?: string[];
      changelog?: string;
    }
  ) {
    return this.artifactService.createVersion(
      ctx.tenantId,
      ctx.userId,
      artifactId as ArtifactId,
      body.content,
      {
        synthesizedFrom: body.synthesizedFrom,
        changelog: body.changelog,
      }
    );
  }

  @Get(':artifactId/diff')
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiQuery({ name: 'from', required: true, description: 'From version' })
  @ApiQuery({ name: 'to', required: true, description: 'To version' })
  @ApiResponse({ status: 200, description: 'Diff result' })
  async diffVersions(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Query('from') from: string,
    @Query('to') to: string
  ) {
    const diff = await this.artifactService.diffVersions(
      ctx.tenantId,
      artifactId as ArtifactId,
      parseInt(from, 10),
      parseInt(to, 10)
    );
    if (!diff) {
      throw new NotFoundException('Versions not found');
    }
    return diff;
  }

  // ============================================================================
  // LINKS (PROVENANCE)
  // ============================================================================

  @Post(':artifactId/links')
  @ApiOperation({ summary: 'Add provenance link' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 201, description: 'Link created' })
  async addLink(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Body()
    body: {
      intentNodeId: string;
      intentNodeType: 'goal' | 'constraint' | 'entity' | 'behavior';
      linkType: ArtifactLinkType;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.artifactService.addLink(ctx.tenantId, artifactId as ArtifactId, body);
  }

  @Delete(':artifactId/links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove provenance link' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 204, description: 'Link removed' })
  async removeLink(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Param('linkId') linkId: string
  ) {
    await this.artifactService.removeLink(
      ctx.tenantId,
      artifactId as ArtifactId,
      linkId
    );
  }

  // ============================================================================
  // EVOLUTION
  // ============================================================================

  @Post(':artifactId/propose-evolution')
  @ApiOperation({ summary: 'Propose artifact evolution based on intent changes' })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID' })
  @ApiResponse({ status: 200, description: 'Evolution proposal' })
  async proposeEvolution(
    @TenantContext() ctx: TenantContextData,
    @Param('artifactId') artifactId: string,
    @Body()
    body: {
      changedIntentNodeIds: string[];
    }
  ) {
    const proposal = await this.artifactService.proposeEvolution(
      ctx.tenantId,
      artifactId as ArtifactId,
      body.changedIntentNodeIds
    );
    if (!proposal) {
      return { message: 'No evolution needed' };
    }
    return proposal;
  }
}
