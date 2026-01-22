/**
 * @prompt-id forge-v4.1:web:hooks:slices:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as slicesApi from '../api/slices';
import type { SliceStatus, SliceEvent } from '../types';

export function useSlices(
  workspaceId: string,
  options?: { status?: SliceStatus; ownerId?: string },
) {
  return useQuery({
    queryKey: ['slices', workspaceId, options],
    queryFn: () => slicesApi.listSlices(workspaceId, options),
    enabled: !!workspaceId,
  });
}

export function useSlice(sliceId: string) {
  return useQuery({
    queryKey: ['slice', sliceId],
    queryFn: () => slicesApi.getSlice(sliceId),
    enabled: !!sliceId,
  });
}

export function useCreateSlice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: slicesApi.createSlice,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['slices', variables.workspaceId] });
    },
  });
}

export function useUpdateSlice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sliceId, ...data }: { sliceId: string } & Parameters<typeof slicesApi.updateSlice>[1]) =>
      slicesApi.updateSlice(sliceId, data),
    onSuccess: (slice) => {
      queryClient.setQueryData(['slice', slice.id], slice);
      queryClient.invalidateQueries({ queryKey: ['slices'] });
    },
  });
}

export function useDeleteSlice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: slicesApi.deleteSlice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slices'] });
    },
  });
}

export function useTransitionSlice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sliceId,
      event,
      comment,
    }: {
      sliceId: string;
      event: SliceEvent;
      comment?: string;
    }) => slicesApi.transitionSlice(sliceId, event, comment),
    onSuccess: (result) => {
      queryClient.setQueryData(['slice', result.slice.id], result.slice);
      queryClient.invalidateQueries({ queryKey: ['slices'] });
    },
  });
}

export function useToggleCriterion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sliceId, criterionId }: { sliceId: string; criterionId: string }) =>
      slicesApi.toggleCriterion(sliceId, criterionId),
    onSuccess: (_, { sliceId }) => {
      queryClient.invalidateQueries({ queryKey: ['slice', sliceId] });
    },
  });
}
