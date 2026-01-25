/**
 * Identity API - Client for identity graph operations
 * @prompt-id forge-v4.1:web:api:identity:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface IdentityAttribute {
  key: string;
  value: unknown;
  valueType?: 'string' | 'number' | 'array' | 'object' | 'boolean';
  category: 'demographic' | 'preference' | 'skill' | 'goal' | 'constraint' | 'context';
  confidence: number;
  source: 'explicit' | 'inferred' | 'imported' | 'corrected';
  createdAt: string;
  updatedAt: string;
}

export interface IdentityGraph {
  contextId: string;
  userId: string;
  tenantId: string;
  attributes: IdentityAttribute[];
  createdAt: string;
  updatedAt: string;
}

export const identityApi = {
  getIdentity: () => api.get<IdentityGraph>('/context/identity'),

  setAttribute: (key: string, data: {
    value: string;
    category: IdentityAttribute['category'];
    confidence?: number;
    source?: IdentityAttribute['source'];
  }) => api.put<IdentityAttribute>(`/context/identity/attributes/${key}`, data),

  deleteAttribute: (key: string) => api.delete<void>(`/context/identity/attributes/${key}`),
};
