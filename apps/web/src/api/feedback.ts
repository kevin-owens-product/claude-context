/**
 * @prompt-id forge-v4.1:web:api:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';
import type {
  AISession,
  SessionFeedback,
  WorkspaceAnalytics,
  FeedbackRating,
  FeedbackErrorCategory,
} from '../types';

// ============================================================================
// SESSION API
// ============================================================================

export function createSession(data: {
  workspaceId: string;
  sliceId?: string;
  contextNodeIds: string[];
  contextTokenCount: number;
}): Promise<AISession> {
  return api.post('/sessions', data);
}

export function getSession(sessionId: string): Promise<AISession> {
  return api.get(`/sessions/${sessionId}`);
}

export function endSession(sessionId: string): Promise<AISession> {
  return api.post(`/sessions/${sessionId}/end`);
}

// ============================================================================
// FEEDBACK API
// ============================================================================

export function submitFeedback(data: {
  sessionId: string;
  rating: FeedbackRating;
  errorCategories?: FeedbackErrorCategory[];
  missingContext?: string;
  comment?: string;
  qualityScores?: {
    accuracy?: number;
    completeness?: number;
    styleMatch?: number;
  };
}): Promise<SessionFeedback> {
  return api.post('/feedback', data);
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export function getAnalytics(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
): Promise<WorkspaceAnalytics> {
  return api.get(`/workspaces/${workspaceId}/analytics`, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}

export function getRealTimeMetrics(
  workspaceId: string,
): Promise<{ sessions: number; positive: number; negative: number }> {
  return api.get(`/workspaces/${workspaceId}/metrics/realtime`);
}
