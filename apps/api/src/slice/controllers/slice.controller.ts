/**
 * @prompt-id forge-v4.1:api:controller:slice:001
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
  BadRequestException,
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
  SliceService,
  type TenantId as TenantIdType,
  type UserId as UserIdType,
  type SliceId,
  type WorkspaceId,
} from '@forge/context';
import {
  CreateSliceDto,
  UpdateSliceDto,
  SliceResponseDto,
  TransitionSliceDto,
  TransitionResultDto,
  AddConstraintDto,
  AddAcceptanceCriterionDto,
  ListSlicesQueryDto,
} from '../dto';
import { PaginatedResponseDto } from '../../context/dto';

@ApiTags('Slices')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('slices')
export class SliceController {
  constructor(private readonly sliceService: SliceService) {}

  // ============================================================================
  // CRUD ENDPOINTS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List slices in a workspace' })
  @ApiResponse({ status: 200, type: [SliceResponseDto] })
  async list(
    @TenantId() tenantId: TenantIdType,
    @Query('workspaceId') workspaceId: string,
    @Query() query: ListSlicesQueryDto,
  ): Promise<PaginatedResponseDto<SliceResponseDto>> {
    return this.sliceService.list(
      workspaceId as WorkspaceId,
      tenantId,
      {
        limit: query.limit,
        offset: query.offset,
        status: query.status,
        ownerId: query.ownerId as UserIdType,
      },
    );
  }

  @Get(':sliceId')
  @ApiOperation({ summary: 'Get a slice by ID' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, type: SliceResponseDto })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async get(
    @TenantId() tenantId: TenantIdType,
    @Param('sliceId') sliceId: string,
  ): Promise<SliceResponseDto> {
    return this.sliceService.get(sliceId as SliceId, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new slice' })
  @ApiResponse({ status: 201, type: SliceResponseDto })
  async create(
    @TenantId() tenantId: TenantIdType,
    @UserId() userId: UserIdType,
    @Body() dto: CreateSliceDto,
  ): Promise<SliceResponseDto> {
    return this.sliceService.create(tenantId, userId, {
      workspaceId: dto.workspaceId as WorkspaceId,
      name: dto.name,
      outcome: dto.outcome,
      antiScope: dto.antiScope,
      constraints: dto.constraints,
      acceptanceCriteria: dto.acceptanceCriteria,
    });
  }

  @Put(':sliceId')
  @ApiOperation({ summary: 'Update a slice' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, type: SliceResponseDto })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async update(
    @TenantId() tenantId: TenantIdType,
    @Param('sliceId') sliceId: string,
    @Body() dto: UpdateSliceDto,
  ): Promise<SliceResponseDto> {
    return this.sliceService.update(sliceId as SliceId, tenantId, dto);
  }

  @Delete(':sliceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a slice' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 204, description: 'Slice deleted' })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async delete(
    @TenantId() tenantId: TenantIdType,
    @Param('sliceId') sliceId: string,
  ): Promise<void> {
    await this.sliceService.delete(sliceId as SliceId, tenantId);
  }

  // ============================================================================
  // STATE MACHINE ENDPOINTS
  // ============================================================================

  @Post(':sliceId/transition')
  @ApiOperation({ summary: 'Transition slice to a new state' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 200, type: TransitionResultDto })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 403, description: 'Transition not allowed' })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async transition(
    @TenantId() tenantId: TenantIdType,
    @UserId() userId: UserIdType,
    @Param('sliceId') sliceId: string,
    @Body() dto: TransitionSliceDto,
  ): Promise<TransitionResultDto> {
    // Validate comment required for request_changes
    if (dto.event === 'request_changes' && !dto.comment) {
      throw new BadRequestException('Comment is required for request_changes');
    }

    return this.sliceService.transition(
      sliceId as SliceId,
      tenantId,
      userId,
      dto.event,
      dto.comment,
    );
  }

  // ============================================================================
  // CONSTRAINT ENDPOINTS
  // ============================================================================

  @Post(':sliceId/constraints')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a constraint to a slice' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 201, description: 'Constraint added' })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async addConstraint(
    @TenantId() tenantId: TenantIdType,
    @Param('sliceId') sliceId: string,
    @Body() dto: AddConstraintDto,
  ): Promise<void> {
    await this.sliceService.addConstraint(
      sliceId as SliceId,
      tenantId,
      dto.content,
    );
  }

  // ============================================================================
  // ACCEPTANCE CRITERIA ENDPOINTS
  // ============================================================================

  @Post(':sliceId/acceptance-criteria')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an acceptance criterion to a slice' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiResponse({ status: 201, description: 'Acceptance criterion added' })
  @ApiResponse({ status: 404, description: 'Slice not found' })
  async addAcceptanceCriterion(
    @TenantId() tenantId: TenantIdType,
    @Param('sliceId') sliceId: string,
    @Body() dto: AddAcceptanceCriterionDto,
  ): Promise<void> {
    await this.sliceService.addAcceptanceCriterion(
      sliceId as SliceId,
      tenantId,
      dto.content,
    );
  }

  @Post(':sliceId/acceptance-criteria/:criterionId/toggle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Toggle an acceptance criterion completion status' })
  @ApiParam({ name: 'sliceId', description: 'Slice ID' })
  @ApiParam({ name: 'criterionId', description: 'Criterion ID' })
  @ApiResponse({ status: 204, description: 'Criterion toggled' })
  @ApiResponse({ status: 404, description: 'Criterion not found' })
  async toggleCriterion(
    @TenantId() tenantId: TenantIdType,
    @Param('criterionId') criterionId: string,
  ): Promise<void> {
    await this.sliceService.toggleCriterion(criterionId, tenantId);
  }
}
