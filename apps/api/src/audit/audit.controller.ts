/**
 * @prompt-id forge-v4.1:api:audit:003
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditService, AuditAction, AuditOutcome } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/auth.service';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'resourceType', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'outcome', required: false, enum: AuditOutcome })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async queryLogs(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: AuditAction,
    @Query('actorId') actorId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('outcome') outcome?: AuditOutcome,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    // Check permission
    if (!req.user.permissions.includes(Permissions.ADMIN_AUDIT)) {
      throw new ForbiddenException('Insufficient permissions to view audit logs');
    }

    return this.auditService.query({
      tenantId: req.user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
      actorId,
      resourceType,
      resourceId,
      outcome,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log returned' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getLog(@Request() req: any, @Param('id') id: string) {
    if (!req.user.permissions.includes(Permissions.ADMIN_AUDIT)) {
      throw new ForbiddenException('Insufficient permissions to view audit logs');
    }

    return this.auditService.getById(req.user.tenantId, id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit summary for time period' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Audit summary returned' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getSummary(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    if (!req.user.permissions.includes(Permissions.ADMIN_AUDIT)) {
      throw new ForbiddenException('Insufficient permissions to view audit logs');
    }

    return this.auditService.getSummary(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs (JSON Lines format)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Audit logs exported' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async exportLogs(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    if (!req.user.permissions.includes(Permissions.ADMIN_AUDIT)) {
      throw new ForbiddenException('Insufficient permissions to export audit logs');
    }

    // Log the export action
    await this.auditService.success(
      AuditAction.DATA_EXPORTED,
      req.user.tenantId,
      req.user.sub,
      { resourceType: 'audit_logs', startDate, endDate }
    );

    return this.auditService.export({
      tenantId: req.user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
