/**
 * @prompt-id forge-v4.1:web:hooks:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import * as feedbackApi from '../api/feedback';

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => feedbackApi.getSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: feedbackApi.createSession,
  });
}

export function useEndSession() {
  return useMutation({
    mutationFn: feedbackApi.endSession,
  });
}

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: feedbackApi.submitFeedback,
  });
}

export function useAnalytics(workspaceId: string, startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['analytics', workspaceId, startDate.toISOString(), endDate.toISOString()],
    queryFn: () => feedbackApi.getAnalytics(workspaceId, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useRealTimeMetrics(workspaceId: string) {
  return useQuery({
    queryKey: ['realtime-metrics', workspaceId],
    queryFn: () => feedbackApi.getRealTimeMetrics(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
