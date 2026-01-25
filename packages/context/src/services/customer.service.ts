/**
 * Customer Service - Manages customers, contacts, subscriptions, and health scoring
 * @prompt-id forge-v4.1:service:customer:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { TenantId, PaginationOptions, PaginatedResult } from '../types';

const CACHE_TTL = 300; // 5 minutes

// ============================================================================
// TYPES
// ============================================================================

export type CustomerId = string & { __brand: 'CustomerId' };

export type CustomerType = 'B2B_ENTERPRISE' | 'B2B_MID_MARKET' | 'B2B_SMB' | 'PLG_FREE' | 'PLG_PAID';
export type CustomerTier = 'STRATEGIC' | 'ENTERPRISE' | 'GROWTH' | 'STANDARD' | 'FREE';
export type ContactRole = 'EXECUTIVE_SPONSOR' | 'CHAMPION' | 'TECHNICAL_LEAD' | 'END_USER' | 'PROCUREMENT' | 'ADMIN';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type EngagementType = 'PRODUCT_USAGE' | 'SUPPORT_TICKET' | 'SALES_CALL' | 'DEMO' | 'ONBOARDING' | 'TRAINING' | 'QBR' | 'EXECUTIVE_MEETING' | 'FEATURE_REQUEST' | 'NPS_RESPONSE';

export interface Customer {
  id: CustomerId;
  tenantId: TenantId;
  name: string;
  externalId?: string;
  type: CustomerType;
  tier: CustomerTier;
  healthScore?: number;
  churnRisk?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  contacts?: CustomerContact[];
  subscriptions?: CustomerSubscription[];
}

export interface CustomerContact {
  id: string;
  customerId: CustomerId;
  email: string;
  name: string;
  title?: string;
  role: ContactRole;
  phone?: string;
  isPrimary: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSubscription {
  id: string;
  customerId: CustomerId;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  mrr: number;
  arr: number;
  seats?: number;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerEngagement {
  id: string;
  customerId: CustomerId;
  type: EngagementType;
  description?: string;
  occurredAt: Date;
  actorId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateCustomerRequest {
  name: string;
  externalId?: string;
  type: CustomerType;
  tier?: CustomerTier;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerRequest {
  name?: string;
  type?: CustomerType;
  tier?: CustomerTier;
  healthScore?: number;
  churnRisk?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateContactRequest {
  email: string;
  name: string;
  title?: string;
  role: ContactRole;
  phone?: string;
  isPrimary?: boolean;
}

export interface CreateSubscriptionRequest {
  planId: string;
  planName: string;
  status?: SubscriptionStatus;
  mrr: number;
  arr: number;
  seats?: number;
  billingCycle?: BillingCycle;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
}

export interface CreateEngagementRequest {
  type: EngagementType;
  description?: string;
  occurredAt?: Date;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomerHealthInput {
  productUsageScore: number; // 0-100
  supportTicketScore: number; // 0-100 (inverse: fewer tickets = higher)
  engagementScore: number; // 0-100
  paymentScore: number; // 0-100
  npsScore?: number; // 0-10 → normalized to 0-100
}

// ============================================================================
// SERVICE
// ============================================================================

export class CustomerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis
  ) {}

  // ============================================================================
  // CUSTOMER CRUD
  // ============================================================================

  async listCustomers(
    tenantId: TenantId,
    options: PaginationOptions & {
      type?: CustomerType;
      tier?: CustomerTier;
      minHealthScore?: number;
      maxChurnRisk?: number;
    } = {}
  ): Promise<PaginatedResult<Customer>> {
    const { limit = 20, offset = 0, type, tier, minHealthScore, maxChurnRisk } = options;

    const where: any = { tenantId };
    if (type) where.type = type;
    if (tier) where.tier = tier;
    if (minHealthScore !== undefined) where.healthScore = { gte: minHealthScore };
    if (maxChurnRisk !== undefined) where.churnRisk = { lte: maxChurnRisk };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: data.map(this.mapToCustomer),
      total,
      limit,
      offset,
    };
  }

  async getCustomer(
    tenantId: TenantId,
    customerId: CustomerId
  ): Promise<Customer | null> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        subscriptions: { orderBy: { startDate: 'desc' } },
      },
    });

    return customer ? this.mapToCustomer(customer) : null;
  }

  async createCustomer(
    tenantId: TenantId,
    request: CreateCustomerRequest
  ): Promise<Customer> {
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: request.name,
        externalId: request.externalId,
        type: request.type,
        tier: request.tier || 'STANDARD',
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        contacts: true,
        subscriptions: true,
      },
    });

    await this.invalidateCustomerCache(tenantId);
    return this.mapToCustomer(customer);
  }

  async updateCustomer(
    tenantId: TenantId,
    customerId: CustomerId,
    request: UpdateCustomerRequest
  ): Promise<Customer | null> {
    const existing = await this.getCustomer(tenantId, customerId);
    if (!existing) return null;

    const customer = await this.prisma.customer.update({
      where: { id: customerId as string },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.type && { type: request.type }),
        ...(request.tier && { tier: request.tier }),
        ...(request.healthScore !== undefined && { healthScore: request.healthScore }),
        ...(request.churnRisk !== undefined && { churnRisk: request.churnRisk }),
        ...(request.metadata && { metadata: request.metadata as Prisma.InputJsonValue }),
      },
      include: {
        contacts: true,
        subscriptions: true,
      },
    });

    await this.invalidateCustomerCache(tenantId);
    return this.mapToCustomer(customer);
  }

  async deleteCustomer(
    tenantId: TenantId,
    customerId: CustomerId
  ): Promise<boolean> {
    const existing = await this.getCustomer(tenantId, customerId);
    if (!existing) return false;

    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    await this.invalidateCustomerCache(tenantId);
    return true;
  }

  // ============================================================================
  // CONTACT OPERATIONS
  // ============================================================================

  async addContact(
    tenantId: TenantId,
    customerId: CustomerId,
    request: CreateContactRequest
  ): Promise<CustomerContact> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // If this is primary, unset other primaries
    if (request.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.create({
      data: {
        customerId,
        email: request.email,
        name: request.name,
        title: request.title,
        role: request.role,
        phone: request.phone,
        isPrimary: request.isPrimary || false,
        metadata: {},
      },
    });

    return this.mapToContact(contact);
  }

  async updateContact(
    tenantId: TenantId,
    customerId: CustomerId,
    contactId: string,
    updates: Partial<CreateContactRequest>
  ): Promise<CustomerContact | null> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) return null;

    const existing = customer.contacts?.find(c => c.id === contactId);
    if (!existing) return null;

    if (updates.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        ...(updates.email && { email: updates.email }),
        ...(updates.name && { name: updates.name }),
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.role && { role: updates.role }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.isPrimary !== undefined && { isPrimary: updates.isPrimary }),
      },
    });

    return this.mapToContact(contact);
  }

  async deleteContact(
    tenantId: TenantId,
    customerId: CustomerId,
    contactId: string
  ): Promise<boolean> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) return false;

    try {
      await this.prisma.customerContact.delete({
        where: { id: contactId },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // SUBSCRIPTION OPERATIONS
  // ============================================================================

  async addSubscription(
    tenantId: TenantId,
    customerId: CustomerId,
    request: CreateSubscriptionRequest
  ): Promise<CustomerSubscription> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const subscription = await this.prisma.customerSubscription.create({
      data: {
        customerId,
        planId: request.planId,
        planName: request.planName,
        status: request.status || 'ACTIVE',
        mrr: request.mrr,
        arr: request.arr,
        seats: request.seats,
        billingCycle: request.billingCycle || 'MONTHLY',
        startDate: request.startDate,
        endDate: request.endDate,
        renewalDate: request.renewalDate,
        metadata: {},
      },
    });

    return this.mapToSubscription(subscription);
  }

  async updateSubscription(
    tenantId: TenantId,
    customerId: CustomerId,
    subscriptionId: string,
    updates: Partial<CreateSubscriptionRequest>
  ): Promise<CustomerSubscription | null> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) return null;

    const existing = customer.subscriptions?.find(s => s.id === subscriptionId);
    if (!existing) return null;

    const subscription = await this.prisma.customerSubscription.update({
      where: { id: subscriptionId },
      data: {
        ...(updates.planId && { planId: updates.planId }),
        ...(updates.planName && { planName: updates.planName }),
        ...(updates.status && { status: updates.status }),
        ...(updates.mrr !== undefined && { mrr: updates.mrr }),
        ...(updates.arr !== undefined && { arr: updates.arr }),
        ...(updates.seats !== undefined && { seats: updates.seats }),
        ...(updates.billingCycle && { billingCycle: updates.billingCycle }),
        ...(updates.endDate !== undefined && { endDate: updates.endDate }),
        ...(updates.renewalDate !== undefined && { renewalDate: updates.renewalDate }),
      },
    });

    return this.mapToSubscription(subscription);
  }

  // ============================================================================
  // ENGAGEMENT OPERATIONS
  // ============================================================================

  async recordEngagement(
    tenantId: TenantId,
    customerId: CustomerId,
    request: CreateEngagementRequest
  ): Promise<CustomerEngagement> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const engagement = await this.prisma.customerEngagement.create({
      data: {
        customerId: customerId as string,
        type: request.type,
        description: request.description,
        occurredAt: request.occurredAt || new Date(),
        actorId: request.actorId as string | undefined,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToEngagement(engagement);
  }

  async listEngagements(
    tenantId: TenantId,
    customerId: CustomerId,
    options: PaginationOptions & { type?: EngagementType } = {}
  ): Promise<PaginatedResult<CustomerEngagement>> {
    const { limit = 20, offset = 0, type } = options;

    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) {
      return { data: [], total: 0, limit, offset };
    }

    const where: any = { customerId };
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      this.prisma.customerEngagement.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.customerEngagement.count({ where }),
    ]);

    return {
      data: data.map(this.mapToEngagement),
      total,
      limit,
      offset,
    };
  }

  // ============================================================================
  // HEALTH SCORING
  // ============================================================================

  async calculateHealthScore(
    tenantId: TenantId,
    customerId: CustomerId,
    input: CustomerHealthInput
  ): Promise<number> {
    // Weighted average of health indicators
    const weights = {
      productUsage: 0.35,
      supportTickets: 0.15,
      engagement: 0.25,
      payment: 0.15,
      nps: 0.10,
    };

    let score = 0;
    let totalWeight = 0;

    score += input.productUsageScore * weights.productUsage;
    totalWeight += weights.productUsage;

    score += input.supportTicketScore * weights.supportTickets;
    totalWeight += weights.supportTickets;

    score += input.engagementScore * weights.engagement;
    totalWeight += weights.engagement;

    score += input.paymentScore * weights.payment;
    totalWeight += weights.payment;

    if (input.npsScore !== undefined) {
      const normalizedNps = input.npsScore * 10; // 0-10 → 0-100
      score += normalizedNps * weights.nps;
      totalWeight += weights.nps;
    }

    const healthScore = Math.round(score / totalWeight);

    // Update customer with new health score
    await this.updateCustomer(tenantId, customerId, { healthScore });

    return healthScore;
  }

  async calculateChurnRisk(
    tenantId: TenantId,
    customerId: CustomerId
  ): Promise<number> {
    const customer = await this.getCustomer(tenantId, customerId);
    if (!customer) return 1.0;

    // Simple churn risk calculation based on health score
    // In production, this would use ML models
    const healthScore = customer.healthScore || 50;
    const churnRisk = Math.max(0, Math.min(1, (100 - healthScore) / 100));

    await this.updateCustomer(tenantId, customerId, { churnRisk });

    return churnRisk;
  }

  async getAtRiskCustomers(
    tenantId: TenantId,
    churnRiskThreshold: number = 0.6
  ): Promise<Customer[]> {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        churnRisk: { gte: churnRiskThreshold },
      },
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      },
      orderBy: { churnRisk: 'desc' },
    });

    return customers.map(this.mapToCustomer);
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getCustomerMetrics(tenantId: TenantId): Promise<{
    totalCustomers: number;
    byType: Record<CustomerType, number>;
    byTier: Record<CustomerTier, number>;
    totalMRR: number;
    totalARR: number;
    avgHealthScore: number;
    atRiskCount: number;
  }> {
    const [
      totalCustomers,
      typeBreakdown,
      tierBreakdown,
      revenueMetrics,
      healthMetrics,
      atRiskCount,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['tier'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.customerSubscription.aggregate({
        where: {
          customer: { tenantId },
          status: 'ACTIVE',
        },
        _sum: { mrr: true, arr: true },
      }),
      this.prisma.customer.aggregate({
        where: { tenantId, healthScore: { not: null } },
        _avg: { healthScore: true },
      }),
      this.prisma.customer.count({
        where: { tenantId, churnRisk: { gte: 0.6 } },
      }),
    ]);

    const byType: Record<CustomerType, number> = {
      B2B_ENTERPRISE: 0,
      B2B_MID_MARKET: 0,
      B2B_SMB: 0,
      PLG_FREE: 0,
      PLG_PAID: 0,
    };
    typeBreakdown.forEach(t => {
      byType[t.type as CustomerType] = t._count;
    });

    const byTier: Record<CustomerTier, number> = {
      STRATEGIC: 0,
      ENTERPRISE: 0,
      GROWTH: 0,
      STANDARD: 0,
      FREE: 0,
    };
    tierBreakdown.forEach(t => {
      byTier[t.tier as CustomerTier] = t._count;
    });

    return {
      totalCustomers,
      byType,
      byTier,
      totalMRR: Number(revenueMetrics._sum.mrr || 0),
      totalARR: Number(revenueMetrics._sum.arr || 0),
      avgHealthScore: healthMetrics._avg.healthScore || 0,
      atRiskCount,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToCustomer = (record: any): Customer => {
    return {
      id: record.id as CustomerId,
      tenantId: record.tenantId as TenantId,
      name: record.name,
      externalId: record.externalId,
      type: record.type as CustomerType,
      tier: record.tier as CustomerTier,
      healthScore: record.healthScore,
      churnRisk: record.churnRisk ? Number(record.churnRisk) : undefined,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      contacts: record.contacts?.map(this.mapToContact),
      subscriptions: record.subscriptions?.map(this.mapToSubscription),
    };
  };

  private mapToContact = (record: any): CustomerContact => {
    return {
      id: record.id,
      customerId: record.customerId as CustomerId,
      email: record.email,
      name: record.name,
      title: record.title,
      role: record.role as ContactRole,
      phone: record.phone,
      isPrimary: record.isPrimary,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };

  private mapToSubscription = (record: any): CustomerSubscription => {
    return {
      id: record.id,
      customerId: record.customerId as CustomerId,
      planId: record.planId,
      planName: record.planName,
      status: record.status as SubscriptionStatus,
      mrr: Number(record.mrr),
      arr: Number(record.arr),
      seats: record.seats,
      billingCycle: record.billingCycle as BillingCycle,
      startDate: record.startDate,
      endDate: record.endDate,
      renewalDate: record.renewalDate,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  };

  private mapToEngagement = (record: any): CustomerEngagement => {
    return {
      id: record.id,
      customerId: record.customerId as CustomerId,
      type: record.type as EngagementType,
      description: record.description,
      occurredAt: record.occurredAt,
      actorId: record.actorId,
      metadata: record.metadata || {},
      createdAt: record.createdAt,
    };
  };

  private async invalidateCustomerCache(tenantId: TenantId): Promise<void> {
    const pattern = `customer:*:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
