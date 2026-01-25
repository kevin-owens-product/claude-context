/**
 * Identity Controller - REST API for identity graph
 * @prompt-id forge-v4.1:api:controller:identity:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IdentityService, type TenantId, type UserId } from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Identity')
@Controller('context/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @ApiOperation({ summary: 'Get user identity graph' })
  @ApiResponse({ status: 200, description: 'Identity graph retrieved' })
  async getIdentity(@TenantContext() ctx: TenantContextData) {
    return this.identityService.getIdentityGraph(ctx.tenantId, ctx.userId);
  }

  @Get('attributes/:key')
  @ApiOperation({ summary: 'Get specific identity attribute' })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiResponse({ status: 200, description: 'Attribute retrieved' })
  @ApiResponse({ status: 404, description: 'Attribute not found' })
  async getAttribute(
    @TenantContext() ctx: TenantContextData,
    @Param('key') key: string
  ) {
    const attribute = await this.identityService.getAttribute(
      ctx.tenantId,
      ctx.userId,
      key
    );
    if (!attribute) {
      return { error: 'Attribute not found', key };
    }
    return attribute;
  }

  @Put('attributes/:key')
  @ApiOperation({ summary: 'Set identity attribute' })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiResponse({ status: 200, description: 'Attribute set' })
  async setAttribute(
    @TenantContext() ctx: TenantContextData,
    @Param('key') key: string,
    @Body()
    body: {
      value: unknown;
      valueType?: 'string' | 'number' | 'array' | 'object' | 'boolean';
      source?: 'explicit' | 'inferred' | 'corrected';
      confidence?: number;
    }
  ) {
    return this.identityService.setAttribute(ctx.tenantId, ctx.userId, {
      key,
      value: body.value,
      valueType: body.valueType,
      source: body.source,
      confidence: body.confidence,
    });
  }

  @Delete('attributes/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete identity attribute' })
  @ApiParam({ name: 'key', description: 'Attribute key' })
  @ApiResponse({ status: 204, description: 'Attribute deleted' })
  async deleteAttribute(
    @TenantContext() ctx: TenantContextData,
    @Param('key') key: string
  ) {
    await this.identityService.deleteAttribute(ctx.tenantId, ctx.userId, key);
  }

  @Get('context')
  @ApiOperation({ summary: 'Get formatted identity context for Claude' })
  @ApiResponse({ status: 200, description: 'Formatted identity context' })
  async getFormattedContext(@TenantContext() ctx: TenantContextData) {
    const xml = await this.identityService.formatIdentityForContext(
      ctx.tenantId,
      ctx.userId
    );
    return { contextXml: xml };
  }
}
