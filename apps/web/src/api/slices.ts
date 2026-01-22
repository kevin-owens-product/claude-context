/**
 * @prompt-id forge-v4.1:web:api:slices:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';
import type { Slice, SliceTransition, SliceStatus, SliceEvent, PaginatedResponse } from '../types';

// ============================================================================
// SLICE CRUD API
// ============================================================================

export function listSlices(
  workspaceId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: SliceStatus;
    ownerId?: string;
  },
): Promise<PaginatedResponse<Slice>> {
  return api.get('/slices', { workspaceId, ...options });
}

export function getSlice(sliceId: string): Promise<Slice> {
  return api.get(`/slices/${sliceId}`);
}

export function createSlice(data: {
  workspaceId: string;
  name: string;
  outcome: string;
  antiScope?: string[];
  constraints?: string[];
  acceptanceCriteria?: string[];
}): Promise<Slice> {
  return api.post('/slices', data);
}

export function updateSlice(
  sliceId: string,
  data: {
    name?: string;
    outcome?: string;
    antiScope?: string[];
  },
): Promise<Slice> {
  return api.put(`/slices/${sliceId}`, data);
}

export function deleteSlice(sliceId: string): Promise<void> {
  return api.delete(`/slices/${sliceId}`);
}

// ============================================================================
// STATE MACHINE API
// ============================================================================

export function transitionSlice(
  sliceId: string,
  event: SliceEvent,
  comment?: string,
): Promise<{ slice: Slice; transition: SliceTransition }> {
  return api.post(`/slices/${sliceId}/transition`, { event, comment });
}

// ============================================================================
// CONSTRAINTS API
// ============================================================================

export function addConstraint(sliceId: string, content: string): Promise<void> {
  return api.post(`/slices/${sliceId}/constraints`, { content });
}

// ============================================================================
// ACCEPTANCE CRITERIA API
// ============================================================================

export function addAcceptanceCriterion(sliceId: string, content: string): Promise<void> {
  return api.post(`/slices/${sliceId}/acceptance-criteria`, { content });
}

export function toggleCriterion(sliceId: string, criterionId: string): Promise<void> {
  return api.post(`/slices/${sliceId}/acceptance-criteria/${criterionId}/toggle`);
}
