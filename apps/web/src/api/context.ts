/**
 * @prompt-id forge-v4.1:web:api:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';
import type {
  ContextGraph,
  ContextNode,
  CompiledContext,
  SearchResult,
  PaginatedResponse,
  ContextNodeType,
  ContextLayer,
  Freshness,
} from '../types';

// ============================================================================
// GRAPH API
// ============================================================================

export function listGraphs(
  workspaceId: string,
  options?: { limit?: number; offset?: number },
): Promise<PaginatedResponse<ContextGraph>> {
  return api.get('/context/graphs', { workspaceId, ...options });
}

export function getGraph(graphId: string): Promise<ContextGraph> {
  return api.get(`/context/graphs/${graphId}`);
}

export function createGraph(
  workspaceId: string,
  data: { name: string; description?: string; isDefault?: boolean },
): Promise<ContextGraph> {
  return api.post('/context/graphs', data);
}

// ============================================================================
// NODE API
// ============================================================================

export function listNodes(
  graphId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: ContextNodeType;
    layer?: ContextLayer;
    freshness?: Freshness;
  },
): Promise<PaginatedResponse<ContextNode>> {
  return api.get(`/context/graphs/${graphId}/nodes`, options);
}

export function getNode(nodeId: string): Promise<ContextNode> {
  return api.get(`/context/nodes/${nodeId}`);
}

export function createNode(data: {
  graphId: string;
  type: ContextNodeType;
  layer: ContextLayer;
  name: string;
  content?: string;
  metadata?: Record<string, unknown>;
  externalUrl?: string;
}): Promise<ContextNode> {
  return api.post('/context/nodes', data);
}

export function updateNode(
  nodeId: string,
  data: {
    name?: string;
    content?: string;
    metadata?: Record<string, unknown>;
    freshness?: Freshness;
  },
): Promise<ContextNode> {
  return api.put(`/context/nodes/${nodeId}`, data);
}

export function deleteNode(nodeId: string): Promise<void> {
  return api.delete(`/context/nodes/${nodeId}`);
}

// ============================================================================
// SEARCH API
// ============================================================================

export function searchNodes(data: {
  graphId: string;
  query: string;
  limit?: number;
  filters?: {
    types?: ContextNodeType[];
    layers?: ContextLayer[];
    freshness?: Freshness[];
  };
}): Promise<SearchResult[]> {
  return api.post('/context/search', data);
}

// ============================================================================
// COMPILE API
// ============================================================================

export function compileContext(data: {
  workspaceId: string;
  sliceId?: string;
  query?: string;
  tokenBudget: number;
}): Promise<CompiledContext> {
  return api.post('/context/compile', data);
}
