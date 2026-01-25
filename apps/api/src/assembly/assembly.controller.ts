/**
 * Assembly Controller - REST API for context assembly
 * @prompt-id forge-v4.1:api:controller:assembly:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AssemblyService,
  type TenantId,
  type UserId,
  type ProjectId,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Context Assembly')
@Controller('context/assembly')
export class AssemblyController {
  constructor(private readonly assemblyService: AssemblyService) {}

  @Post()
  @ApiOperation({ summary: 'Assemble context for Claude injection' })
  @ApiResponse({ status: 200, description: 'Assembled context' })
  async assembleContext(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      query: string;
      projectId?: string;
      maxTokens?: number;
    }
  ) {
    return this.assemblyService.assembleContext(ctx.tenantId, {
      userId: ctx.userId,
      query: body.query,
      projectId: body.projectId as ProjectId,
      maxTokens: body.maxTokens,
    });
  }
}
