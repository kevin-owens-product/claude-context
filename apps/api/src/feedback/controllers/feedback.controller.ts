/**
 * @prompt-id forge-v4.1:api:controller:feedback:001
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
  FeedbackService,
  type TenantId as TenantIdType,
  type UserId as UserIdType,
  type SessionId,
  type WorkspaceId,
  type NodeId,
} from '@forge/context';
import {
  CreateSessionDto,
  SessionResponseDto,
  SubmitFeedbackDto,
  FeedbackResponseDto,
  AnalyticsQueryDto,
  WorkspaceAnalyticsResponseDto,
  RealTimeMetricsResponseDto,
} from '../dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ============================================================================
  // SESSION ENDPOINTS
  // ============================================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new AI session' })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async createSession(
    @TenantId() tenantId: TenantIdType,
    @UserId() userId: UserIdType,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    return this.feedbackService.createSession(
      tenantId,
      dto.workspaceId as WorkspaceId,
      userId,
      {
        sliceId: dto.sliceId,
        contextNodeIds: dto.contextNodeIds as NodeId[],
        contextTokenCount: dto.contextTokenCount,
      },
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @TenantId() tenantId: TenantIdType,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionResponseDto> {
    return this.feedbackService.getSession(sessionId as SessionId, tenantId);
  }

  @Post('sessions/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an AI session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async endSession(
    @TenantId() tenantId: TenantIdType,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionResponseDto> {
    return this.feedbackService.endSession(sessionId as SessionId, tenantId);
  }

  // ============================================================================
  // FEEDBACK ENDPOINTS
  // ============================================================================

  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for a session' })
  @ApiResponse({ status: 201, type: FeedbackResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 409, description: 'Feedback already submitted' })
  async submitFeedback(
    @TenantId() tenantId: TenantIdType,
    @UserId() userId: UserIdType,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.feedbackService.submitFeedback(tenantId, userId, {
      sessionId: dto.sessionId as SessionId,
      rating: dto.rating,
      errorCategories: dto.errorCategories,
      missingContext: dto.missingContext,
      comment: dto.comment,
      qualityScores: dto.qualityScores,
    });
  }

  // ============================================================================
  // ANALYTICS ENDPOINTS
  // ============================================================================

  @Get('workspaces/:workspaceId/analytics')
  @ApiOperation({ summary: 'Get workspace analytics for a date range' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, type: WorkspaceAnalyticsResponseDto })
  async getAnalytics(
    @TenantId() tenantId: TenantIdType,
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<WorkspaceAnalyticsResponseDto> {
    return this.feedbackService.getAnalytics(
      tenantId,
      workspaceId as WorkspaceId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('workspaces/:workspaceId/metrics/realtime')
  @ApiOperation({ summary: 'Get real-time metrics for today' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, type: RealTimeMetricsResponseDto })
  async getRealTimeMetrics(
    @Param('workspaceId') workspaceId: string,
  ): Promise<RealTimeMetricsResponseDto> {
    return this.feedbackService.getRealTimeMetrics(workspaceId as WorkspaceId);
  }
}
