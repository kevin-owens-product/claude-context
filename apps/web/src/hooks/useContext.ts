/**
 * @prompt-id forge-v4.1:web:hooks:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contextApi from '../api/context';
import type { ContextNodeType, ContextLayer, Freshness } from '../types';

export function useGraphs(workspaceId: string) {
  return useQuery({
    queryKey: ['graphs', workspaceId],
    queryFn: () => contextApi.listGraphs(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useGraph(graphId: string) {
  return useQuery({
    queryKey: ['graph', graphId],
    queryFn: () => contextApi.getGraph(graphId),
    enabled: !!graphId,
  });
}

export function useNodes(
  graphId: string,
  options?: {
    type?: ContextNodeType;
    layer?: ContextLayer;
    freshness?: Freshness;
  },
) {
  return useQuery({
    queryKey: ['nodes', graphId, options],
    queryFn: () => contextApi.listNodes(graphId, options),
    enabled: !!graphId,
  });
}

export function useNode(nodeId: string) {
  return useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => contextApi.getNode(nodeId),
    enabled: !!nodeId,
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contextApi.createNode,
    onSuccess: (node) => {
      queryClient.invalidateQueries({ queryKey: ['nodes', node.graphId] });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, ...data }: { nodeId: string } & Parameters<typeof contextApi.updateNode>[1]) =>
      contextApi.updateNode(nodeId, data),
    onSuccess: (node) => {
      queryClient.setQueryData(['node', node.id], node);
      queryClient.invalidateQueries({ queryKey: ['nodes', node.graphId] });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contextApi.deleteNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    },
  });
}

export function useSearchNodes() {
  return useMutation({
    mutationFn: contextApi.searchNodes,
  });
}

export function useCompileContext() {
  return useMutation({
    mutationFn: contextApi.compileContext,
  });
}
