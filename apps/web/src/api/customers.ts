/**
 * Customers API - Customer management and health tracking
 * @prompt-id forge-v4.1:web:api:customers:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface Customer {
  id: string;
  name: string;
  type: 'B2B_ENTERPRISE' | 'B2B_MID_MARKET' | 'B2B_SMB' | 'PLG_SELF_SERVE';
  tier: 'STRATEGIC' | 'ENTERPRISE' | 'GROWTH' | 'STANDARD' | 'FREE';
  healthScore: number;
  churnRisk: number;
  mrr: number;
  arr: number;
  createdAt: string;
  lastEngagement?: string;
  primaryContact?: CustomerContact;
  subscriptions: CustomerSubscription[];
  recentActivity: CustomerActivity[];
}

export interface CustomerContact {
  id: string;
  name: string;
  email: string;
  title: string;
  role: 'EXECUTIVE_SPONSOR' | 'CHAMPION' | 'DECISION_MAKER' | 'USER' | 'TECHNICAL';
}

export interface CustomerSubscription {
  id: string;
  plan: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  seats: number;
  renewalDate: string;
}

export interface CustomerActivity {
  id: string;
  type: string;
  description: string;
  date: string;
}

export interface CustomerFilters {
  tier?: string;
  type?: string;
  healthMin?: number;
  healthMax?: number;
  search?: string;
}

export interface CustomersResponse {
  data: Customer[];
  total: number;
}

export interface CreateCustomerInput {
  name: string;
  type: Customer['type'];
  tier: Customer['tier'];
  primaryContact?: Omit<CustomerContact, 'id'>;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  healthScore?: number;
  churnRisk?: number;
}

// API functions
export const customersApi = {
  list: (filters?: CustomerFilters) =>
    api.get<CustomersResponse>('/customers', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Customer>(`/customers/${id}`),

  create: (data: CreateCustomerInput) =>
    api.post<Customer>('/customers', data),

  update: (id: string, data: UpdateCustomerInput) =>
    api.put<Customer>(`/customers/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/customers/${id}`),

  // Engagement endpoints
  getEngagements: (id: string) =>
    api.get<CustomerActivity[]>(`/customers/${id}/engagements`),

  addEngagement: (id: string, data: Omit<CustomerActivity, 'id'>) =>
    api.post<CustomerActivity>(`/customers/${id}/engagements`, data),

  // Health metrics
  getHealthHistory: (id: string, days?: number) =>
    api.get<Array<{ date: string; score: number }>>(`/customers/${id}/health-history`, { days }),
};
