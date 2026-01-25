/**
 * Assembly API - Client for context assembly operations
 * @prompt-id forge-v4.1:web:api:assembly:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface RelevanceScore {
  nodeId: string;
  nodeType: string;
  semanticScore: number;
  recencyScore: number;
  confidenceScore: number;
  projectBoost: number;
  totalScore: number;
}

export interface TokenBudget {
  identity: { allocated: number; used: number };
  project: { allocated: number; used: number };
  other: { allocated: number; used: number };
  total: { allocated: number; used: number };
}

export interface AssembledContext {
  contextXml: string;
  sources: Array<{
    id: string;
    type: string;
    name: string;
    confidence: number;
    relevance: number;
  }>;
  relevanceScores: Record<string, number>;
  tokenCount: number;
}

export const assemblyApi = {
  assembleContext: (data: {
    query: string;
    projectId?: string;
    maxTokens?: number;
  }) => api.post<AssembledContext>('/context/assembly', data),
};
