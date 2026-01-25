/**
 * Workflow Templates Controller - Pre-built automation patterns
 * @prompt-id forge-v4.1:api:controller:workflow-templates:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  WorkflowService,
  WorkflowTemplatesService,
  type TenantId,
  type UserId,
  type WorkflowTemplate,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';
import { ApplyTemplateDto, WorkflowTemplateResponseDto } from './dto/templates.dto';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Workflow Templates')
@Controller('workflows/templates')
export class WorkflowTemplatesController {
  private readonly templatesService = new WorkflowTemplatesService();

  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'List all available workflow templates' })
  @ApiQuery({ name: 'category', required: false, enum: ['escalation', 'notification', 'assignment', 'status', 'integration'] })
  @ApiResponse({ status: 200, description: 'Templates list', type: [WorkflowTemplateResponseDto] })
  listTemplates(
    @Query('category') category?: WorkflowTemplate['category']
  ): WorkflowTemplate[] {
    if (category) {
      return this.templatesService.getTemplatesByCategory(category);
    }
    return this.templatesService.getAllTemplates();
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get a specific workflow template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details', type: WorkflowTemplateResponseDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getTemplate(@Param('templateId') templateId: string): WorkflowTemplate {
    const template = this.templatesService.getTemplate(templateId);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }
    return template;
  }

  @Post(':templateId/apply')
  @ApiOperation({ summary: 'Create a workflow from a template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Workflow created from template' })
  @ApiResponse({ status: 400, description: 'Invalid variables or template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async applyTemplate(
    @TenantContext() ctx: TenantContextData,
    @Param('templateId') templateId: string,
    @Body() body: ApplyTemplateDto
  ) {
    const template = this.templatesService.getTemplate(templateId);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    // Validate required variables
    const validation = this.templatesService.validateVariables(
      templateId,
      body.variables || {}
    );
    if (!validation.valid) {
      throw new BadRequestException(
        `Missing required variables: ${validation.missing.join(', ')}`
      );
    }

    // Apply template with variable substitution
    const workflowData = this.templatesService.applyTemplate(
      templateId,
      body.variables || {}
    );
    if (!workflowData) {
      throw new BadRequestException('Failed to apply template');
    }

    // Create the workflow
    return this.workflowService.createWorkflow(ctx.tenantId, {
      name: body.name || workflowData.name,
      description: workflowData.description,
      triggerType: workflowData.triggerType,
      triggerConfig: workflowData.triggerConfig,
      conditions: workflowData.conditions,
      actions: workflowData.actions,
      createdById: ctx.userId,
    });
  }

  @Get(':templateId/preview')
  @ApiOperation({ summary: 'Preview a template with variables applied' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Preview of workflow configuration' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  previewTemplate(
    @Param('templateId') templateId: string,
    @Query() variables: Record<string, string>
  ) {
    const template = this.templatesService.getTemplate(templateId);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    // Convert string query params to appropriate types
    const convertedVariables: Record<string, unknown> = {};
    for (const variable of template.variables || []) {
      const value = variables[variable.key];
      if (value !== undefined) {
        if (variable.type === 'number') {
          convertedVariables[variable.key] = parseFloat(value);
        } else if (variable.type === 'boolean') {
          convertedVariables[variable.key] = value === 'true';
        } else {
          convertedVariables[variable.key] = value;
        }
      } else if (variable.defaultValue !== undefined) {
        convertedVariables[variable.key] = variable.defaultValue;
      }
    }

    const preview = this.templatesService.applyTemplate(templateId, convertedVariables);
    return {
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
      },
      variablesApplied: convertedVariables,
      workflow: preview,
    };
  }
}
