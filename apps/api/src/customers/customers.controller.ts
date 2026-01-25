/**
 * Customers Controller - REST API for customer management
 * @prompt-id forge-v4.1:api:controller:customers:001
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
  CustomerService,
  type TenantId,
  type UserId,
  type CustomerId,
  type CustomerType,
  type CustomerTier,
  type ContactRole,
  type SubscriptionStatus,
  type BillingCycle,
  type EngagementType,
  type CustomerHealthInput,
} from '@forge/context';
import { TenantContext } from '../common/decorators/tenant.decorator';

interface TenantContextData {
  tenantId: TenantId;
  userId: UserId;
}

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'tier', required: false })
  @ApiResponse({ status: 200, description: 'Customers list' })
  async listCustomers(
    @TenantContext() ctx: TenantContextData,
    @Query('type') type?: CustomerType,
    @Query('tier') tier?: CustomerTier,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.customerService.listCustomers(ctx.tenantId, {
      type,
      tier,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search customers' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchCustomers(
    @TenantContext() ctx: TenantContextData,
    @Query('q') query: string,
    @Query('limit') limit?: string
  ) {
    // Search by listing with name filter - basic search implementation
    const result = await this.customerService.listCustomers(ctx.tenantId, {
      limit: limit ? parseInt(limit, 10) : 20,
    });
    // Filter results by query (case-insensitive name match)
    const filtered = result.data.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    return { ...result, data: filtered, total: filtered.length };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get customer metrics' })
  @ApiResponse({ status: 200, description: 'Customer metrics' })
  async getCustomerMetrics(@TenantContext() ctx: TenantContextData) {
    return this.customerService.getCustomerMetrics(ctx.tenantId);
  }

  @Get('at-risk')
  @ApiOperation({ summary: 'Get at-risk customers' })
  @ApiResponse({ status: 200, description: 'At-risk customers' })
  async getAtRiskCustomers(
    @TenantContext() ctx: TenantContextData,
    @Query('threshold') threshold?: string
  ) {
    return this.customerService.getAtRiskCustomers(
      ctx.tenantId,
      threshold ? parseFloat(threshold) : undefined
    );
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 200, description: 'Customer details' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomer(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string
  ) {
    const customer = await this.customerService.getCustomer(ctx.tenantId, customerId as CustomerId);
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  @ApiResponse({ status: 201, description: 'Customer created' })
  async createCustomer(
    @TenantContext() ctx: TenantContextData,
    @Body()
    body: {
      name: string;
      externalId?: string;
      type: CustomerType;
      tier?: CustomerTier;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.customerService.createCustomer(ctx.tenantId, body);
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  async updateCustomer(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      name?: string;
      type?: CustomerType;
      tier?: CustomerTier;
      healthScore?: number;
      churnRisk?: number;
      metadata?: Record<string, unknown>;
    }
  ) {
    const customer = await this.customerService.updateCustomer(
      ctx.tenantId,
      customerId as CustomerId,
      body
    );
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  @Post(':customerId/calculate-health')
  @ApiOperation({ summary: 'Calculate health score' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 200, description: 'Health score calculated' })
  async calculateHealthScore(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      productUsageScore: number;
      supportTicketScore: number;
      engagementScore: number;
      paymentScore: number;
      npsScore?: number;
    }
  ) {
    const customer = await this.customerService.getCustomer(ctx.tenantId, customerId as CustomerId);
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }
    const healthScore = await this.customerService.calculateHealthScore(
      ctx.tenantId,
      customerId as CustomerId,
      body
    );
    return { healthScore };
  }

  @Delete(':customerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 204, description: 'Customer deleted' })
  async deleteCustomer(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string
  ) {
    await this.customerService.deleteCustomer(ctx.tenantId, customerId as CustomerId);
  }

  @Get(':customerId/contacts')
  @ApiOperation({ summary: 'List contacts' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 200, description: 'Contacts list' })
  async listContacts(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string
  ) {
    const customer = await this.customerService.getCustomer(ctx.tenantId, customerId as CustomerId);
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }
    return customer.contacts || [];
  }

  @Post(':customerId/contacts')
  @ApiOperation({ summary: 'Add contact' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 201, description: 'Contact added' })
  async addContact(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      email: string;
      name: string;
      title?: string;
      role: ContactRole;
      phone?: string;
      isPrimary?: boolean;
    }
  ) {
    return this.customerService.addContact(ctx.tenantId, customerId as CustomerId, body);
  }

  @Delete(':customerId/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove contact' })
  async removeContact(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Param('contactId') contactId: string
  ) {
    await this.customerService.deleteContact(ctx.tenantId, customerId as CustomerId, contactId);
  }

  @Post(':customerId/subscriptions')
  @ApiOperation({ summary: 'Add subscription' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 201, description: 'Subscription added' })
  async addSubscription(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      planId: string;
      planName: string;
      status?: SubscriptionStatus;
      mrr: number;
      arr: number;
      seats?: number;
      billingCycle?: BillingCycle;
      startDate: string;
      endDate?: string;
      renewalDate?: string;
    }
  ) {
    return this.customerService.addSubscription(ctx.tenantId, customerId as CustomerId, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
    });
  }

  @Post(':customerId/engagements')
  @ApiOperation({ summary: 'Record engagement' })
  @ApiParam({ name: 'customerId' })
  @ApiResponse({ status: 201, description: 'Engagement recorded' })
  async recordEngagement(
    @TenantContext() ctx: TenantContextData,
    @Param('customerId') customerId: string,
    @Body()
    body: {
      type: EngagementType;
      description?: string;
      occurredAt?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.customerService.recordEngagement(ctx.tenantId, customerId as CustomerId, {
      ...body,
      actorId: ctx.userId,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
  }
}
