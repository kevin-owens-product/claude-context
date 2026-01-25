/**
 * Customer Feedback Controller - REST API for feedback, NPS, CSAT
 * @prompt-id forge-v4.1:api:controller:customer-feedback:001
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  CustomerFeedbackService,
  type TenantId,
  type CustomerId,
  type FeedbackId,
  type FeedbackType,
  type FeedbackStatus,
  type FeedbackChannel,
  type SentimentLabel,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: string;
}

@ApiTags('Customer Feedback')
@Controller('customer-feedback')
export class CustomerFeedbackController {
  constructor(private readonly feedbackService: CustomerFeedbackService) {}

  @Get()
  @ApiOperation({ summary: 'List customer feedback' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'sentimentLabel', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Feedback list' })
  async listFeedback(
    @TenantContext() ctx: TenantContextData,
    @Query('customerId') customerId?: string,
    @Query('type') type?: FeedbackType,
    @Query('status') status?: FeedbackStatus,
    @Query('channel') channel?: FeedbackChannel,
    @Query('sentimentLabel') sentimentLabel?: SentimentLabel,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.feedbackService.listFeedback(ctx.tenantId, {
      customerId: customerId as CustomerId | undefined,
      type,
      status,
      channel,
      sentimentLabel,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('nps')
  @ApiOperation({ summary: 'Get NPS metrics' })
  @ApiQuery({ name: 'periodStart', required: true })
  @ApiQuery({ name: 'periodEnd', required: true })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiResponse({ status: 200, description: 'NPS metrics' })
  async getNPSMetrics(
    @TenantContext() ctx: TenantContextData,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('customerId') customerId?: string
  ) {
    return this.feedbackService.getNPSMetrics(
      ctx.tenantId,
      new Date(periodStart),
      new Date(periodEnd),
      customerId as CustomerId | undefined
    );
  }

  @Get('csat')
  @ApiOperation({ summary: 'Get CSAT metrics' })
  @ApiQuery({ name: 'periodStart', required: true })
  @ApiQuery({ name: 'periodEnd', required: true })
  @ApiResponse({ status: 200, description: 'CSAT metrics' })
  async getCSATMetrics(
    @TenantContext() ctx: TenantContextData,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string
  ) {
    return this.feedbackService.getCSATMetrics(
      ctx.tenantId,
      new Date(periodStart),
      new Date(periodEnd)
    );
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Get sentiment metrics' })
  @ApiQuery({ name: 'periodStart', required: true })
  @ApiQuery({ name: 'periodEnd', required: true })
  @ApiResponse({ status: 200, description: 'Sentiment metrics' })
  async getSentimentMetrics(
    @TenantContext() ctx: TenantContextData,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string
  ) {
    return this.feedbackService.getSentimentMetrics(
      ctx.tenantId,
      new Date(periodStart),
      new Date(periodEnd)
    );
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get feedback trends' })
  @ApiQuery({ name: 'periodStart', required: true })
  @ApiQuery({ name: 'periodEnd', required: true })
  @ApiQuery({ name: 'granularity', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Feedback trends' })
  async getFeedbackTrends(
    @TenantContext() ctx: TenantContextData,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Query('granularity') granularity?: 'day' | 'week' | 'month'
  ) {
    return this.feedbackService.getFeedbackTrends(
      ctx.tenantId,
      new Date(periodStart),
      new Date(periodEnd),
      granularity
    );
  }

  @Get(':feedbackId')
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback ID' })
  @ApiResponse({ status: 200, description: 'Feedback details' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async getFeedback(
    @TenantContext() ctx: TenantContextData,
    @Param('feedbackId') feedbackId: string
  ) {
    const feedback = await this.feedbackService.getFeedback(
      ctx.tenantId,
      feedbackId as FeedbackId
    );
    if (!feedback) {
      throw new NotFoundException(`Feedback not found: ${feedbackId}`);
    }
    return feedback;
  }

  @Post()
  @ApiOperation({ summary: 'Submit customer feedback' })
  @ApiResponse({ status: 201, description: 'Feedback created' })
  async createFeedback(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      customerId?: string;
      contactEmail?: string;
      type: FeedbackType;
      channel?: FeedbackChannel;
      subject?: string;
      content: string;
      npsScore?: number;
      csatScore?: number;
      priority?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.feedbackService.createFeedback(ctx.tenantId, {
      ...body,
      customerId: body.customerId as CustomerId | undefined,
    } as any);
  }

  @Post('nps')
  @ApiOperation({ summary: 'Record NPS response' })
  @ApiResponse({ status: 201, description: 'NPS recorded' })
  async recordNPS(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      customerId: string;
      score: number;
      comment?: string;
    }
  ) {
    return this.feedbackService.recordNPS(
      ctx.tenantId,
      body.customerId as CustomerId,
      body.score,
      body.comment
    );
  }

  @Post('csat')
  @ApiOperation({ summary: 'Record CSAT response' })
  @ApiResponse({ status: 201, description: 'CSAT recorded' })
  async recordCSAT(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      customerId: string;
      score: number;
      comment?: string;
      sessionId?: string;
    }
  ) {
    return this.feedbackService.recordCSAT(
      ctx.tenantId,
      body.customerId as CustomerId,
      body.score,
      body.comment,
      body.sessionId
    );
  }

  @Patch(':feedbackId')
  @ApiOperation({ summary: 'Update feedback status' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback ID' })
  @ApiResponse({ status: 200, description: 'Feedback updated' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async updateFeedback(
    @TenantContext() ctx: TenantContextData,
    @Param('feedbackId') feedbackId: string,
    @Body()
    body: {
      status?: FeedbackStatus;
      priority?: string;
      featureRequestId?: string;
      respondedById?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const feedback = await this.feedbackService.updateFeedback(
      ctx.tenantId,
      feedbackId as FeedbackId,
      body as any
    );
    if (!feedback) {
      throw new NotFoundException(`Feedback not found: ${feedbackId}`);
    }
    return feedback;
  }

  @Delete(':feedbackId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete feedback' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback ID' })
  @ApiResponse({ status: 204, description: 'Feedback deleted' })
  async deleteFeedback(
    @TenantContext() ctx: TenantContextData,
    @Param('feedbackId') feedbackId: string
  ) {
    await this.feedbackService.deleteFeedback(ctx.tenantId, feedbackId as FeedbackId);
  }

  @Post('analyze-sentiment')
  @ApiOperation({ summary: 'Analyze text sentiment' })
  @ApiResponse({ status: 200, description: 'Sentiment analysis result' })
  async analyzeSentiment(@Body() body: { text: string }) {
    return this.feedbackService.analyzeSentiment(body.text);
  }
}
