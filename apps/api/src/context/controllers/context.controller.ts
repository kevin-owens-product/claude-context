/**
 * @prompt-id forge-v4.1:api:controller:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, UserId } from '../../common/decorators/tenant.decorator';
import {
  ContextService,
  type TenantId as TenantIdType,
  type GraphId,
  type NodeId,
  type WorkspaceId,
} from '@forge/context';
import {
  CreateGraphDto,
  GraphResponseDto,
  CreateNodeDto,
  UpdateNodeDto,
  NodeResponseDto,
  SearchNodesDto,
  SearchResultDto,
  CompileContextDto,
  CompiledContextResponseDto,
  PaginationQueryDto,
  ListNodesQueryDto,
  PaginatedResponseDto,
} from '../dto';

@ApiTags('Context')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('context')
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  // ============================================================================
  // GRAPH ENDPOINTS
  // ============================================================================

  @Get('graphs')
  @ApiOperation({ summary: 'List context graphs in a workspace' })
  @ApiResponse({ status: 200, type: [GraphResponseDto] })
  async listGraphs(
    @TenantId() tenantId: TenantIdType,
    @Query('workspaceId') workspaceId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<GraphResponseDto>> {
    return this.contextService.listGraphs(
      workspaceId as WorkspaceId,
      tenantId,
      pagination,
    );
  }

  @Get('graphs/:graphId')
  @ApiOperation({ summary: 'Get a context graph by ID' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, type: GraphResponseDto })
  @ApiResponse({ status: 404, description: 'Graph not found' })
  async getGraph(
    @TenantId() tenantId: TenantIdType,
    @Param('graphId') graphId: string,
  ): Promise<GraphResponseDto> {
    return this.contextService.getGraph(graphId as GraphId, tenantId);
  }

  @Post('graphs')
  @ApiOperation({ summary: 'Create a new context graph' })
  @ApiResponse({ status: 201, type: GraphResponseDto })
  async createGraph(
    @TenantId() tenantId: TenantIdType,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateGraphDto,
  ): Promise<GraphResponseDto> {
    return this.contextService.createGraph(workspaceId as WorkspaceId, tenantId, dto);
  }

  // ============================================================================
  // NODE ENDPOINTS
  // ============================================================================

  @Get('graphs/:graphId/nodes')
  @ApiOperation({ summary: 'List nodes in a context graph' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, type: [NodeResponseDto] })
  async listNodes(
    @TenantId() tenantId: TenantIdType,
    @Param('graphId') graphId: string,
    @Query() query: ListNodesQueryDto,
  ): Promise<PaginatedResponseDto<NodeResponseDto>> {
    return this.contextService.listNodes(graphId as GraphId, tenantId, query);
  }

  @Get('nodes/:nodeId')
  @ApiOperation({ summary: 'Get a context node by ID' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  @ApiResponse({ status: 200, type: NodeResponseDto })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNode(
    @TenantId() tenantId: TenantIdType,
    @Param('nodeId') nodeId: string,
  ): Promise<NodeResponseDto> {
    return this.contextService.getNode(nodeId as NodeId, tenantId);
  }

  @Post('nodes')
  @ApiOperation({ summary: 'Create a new context node' })
  @ApiResponse({ status: 201, type: NodeResponseDto })
  async createNode(
    @TenantId() tenantId: TenantIdType,
    @Body() dto: CreateNodeDto,
  ): Promise<NodeResponseDto> {
    return this.contextService.createNode(tenantId, {
      graphId: dto.graphId as GraphId,
      type: dto.type,
      layer: dto.layer,
      name: dto.name,
      content: dto.content,
      metadata: dto.metadata,
      externalUrl: dto.externalUrl,
    });
  }

  @Put('nodes/:nodeId')
  @ApiOperation({ summary: 'Update a context node' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  @ApiResponse({ status: 200, type: NodeResponseDto })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async updateNode(
    @TenantId() tenantId: TenantIdType,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNodeDto,
  ): Promise<NodeResponseDto> {
    return this.contextService.updateNode(nodeId as NodeId, tenantId, dto);
  }

  @Delete('nodes/:nodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a context node' })
  @ApiParam({ name: 'nodeId', description: 'Node ID' })
  @ApiResponse({ status: 204, description: 'Node deleted' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async deleteNode(
    @TenantId() tenantId: TenantIdType,
    @Param('nodeId') nodeId: string,
  ): Promise<void> {
    await this.contextService.deleteNode(nodeId as NodeId, tenantId);
  }

  // ============================================================================
  // SEARCH ENDPOINTS
  // ============================================================================

  @Post('search')
  @ApiOperation({ summary: 'Search context nodes semantically' })
  @ApiResponse({ status: 200, type: [SearchResultDto] })
  async searchNodes(
    @TenantId() tenantId: TenantIdType,
    @Body() dto: SearchNodesDto,
  ): Promise<SearchResultDto[]> {
    const results = await this.contextService.searchNodes(tenantId, {
      graphId: dto.graphId as GraphId,
      query: dto.query,
      limit: dto.limit,
      filters: dto.filters,
    });

    return results.map((r) => ({
      node: r.node as unknown as NodeResponseDto,
      similarity: r.similarity,
    }));
  }

  // ============================================================================
  // COMPILATION ENDPOINTS
  // ============================================================================

  @Post('compile')
  @ApiOperation({ summary: 'Compile context for AI consumption' })
  @ApiResponse({ status: 200, type: CompiledContextResponseDto })
  async compile(
    @TenantId() tenantId: TenantIdType,
    @Body() dto: CompileContextDto,
  ): Promise<CompiledContextResponseDto> {
    return this.contextService.compile(tenantId, {
      workspaceId: dto.workspaceId as WorkspaceId,
      sliceId: dto.sliceId,
      query: dto.query,
      tokenBudget: dto.tokenBudget,
    });
  }
}
