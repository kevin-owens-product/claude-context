/**
 * Business Domain Hooks - React Query hooks for all business APIs
 * @prompt-id forge-v4.1:web:hooks:business:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { customersApi, CustomerFilters, CreateCustomerInput, UpdateCustomerInput } from '../api/customers';
import { dealsApi, DealFilters, CreateDealInput, UpdateDealInput, DealStage } from '../api/deals';
import { objectivesApi, Objective, ObjectiveFilters, CreateObjectiveInput, UpdateObjectiveInput } from '../api/objectives';
import { releasesApi, ReleaseFilters, CreateReleaseInput, UpdateReleaseInput } from '../api/releases';
import { solutionsApi, SolutionFilters, CreateSolutionInput, UpdateSolutionInput } from '../api/solutions';

// Query Keys
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    list: (filters?: CustomerFilters) => [...queryKeys.customers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.customers.all, 'detail', id] as const,
  },
  deals: {
    all: ['deals'] as const,
    list: (filters?: DealFilters) => [...queryKeys.deals.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.deals.all, 'detail', id] as const,
    pipeline: () => [...queryKeys.deals.all, 'pipeline'] as const,
  },
  objectives: {
    all: ['objectives'] as const,
    list: (filters?: ObjectiveFilters) => [...queryKeys.objectives.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.objectives.all, 'detail', id] as const,
    tree: (level?: Objective['level']) => [...queryKeys.objectives.all, 'tree', level] as const,
  },
  releases: {
    all: ['releases'] as const,
    list: (filters?: ReleaseFilters) => [...queryKeys.releases.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.releases.all, 'detail', id] as const,
    timeline: (start: string, end: string) => [...queryKeys.releases.all, 'timeline', start, end] as const,
  },
  solutions: {
    all: ['solutions'] as const,
    list: (filters?: SolutionFilters) => [...queryKeys.solutions.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.solutions.all, 'detail', id] as const,
    categories: () => [...queryKeys.solutions.all, 'categories'] as const,
  },
};

// ============= CUSTOMERS HOOKS =============

export function useCustomers(filters?: CustomerFilters, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customersApi.list(filters),
    staleTime: 30000,
    ...options,
  });
}

export function useCustomer(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerInput) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInput }) =>
      customersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.list() });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

// ============= DEALS HOOKS =============

export function useDeals(filters?: DealFilters, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters),
    queryFn: () => dealsApi.list(filters),
    staleTime: 30000,
    ...options,
  });
}

export function useDeal(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: () => dealsApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealInput) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealInput }) =>
      dealsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.list() });
    },
  });
}

export function useMoveDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      dealsApi.moveStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: queryKeys.deals.pipeline(),
    queryFn: () => dealsApi.getPipelineStats(),
    staleTime: 60000,
  });
}

// ============= OBJECTIVES HOOKS =============

export function useObjectives(filters?: ObjectiveFilters, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.objectives.list(filters),
    queryFn: () => objectivesApi.list(filters),
    staleTime: 30000,
    ...options,
  });
}

export function useObjective(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.objectives.detail(id),
    queryFn: () => objectivesApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useObjectivesTree(level?: Objective['level']) {
  return useQuery({
    queryKey: queryKeys.objectives.tree(level),
    queryFn: () => objectivesApi.getTree(level),
    staleTime: 60000,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateObjectiveInput) => objectivesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.all });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateObjectiveInput }) =>
      objectivesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.list() });
    },
  });
}

export function useAddKeyResultMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      objectiveId,
      krId,
      value,
      note,
    }: {
      objectiveId: string;
      krId: string;
      value: number;
      note?: string;
    }) => objectivesApi.addMeasurement(objectiveId, krId, { value, note }),
    onSuccess: (_, { objectiveId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.objectives.detail(objectiveId) });
    },
  });
}

// ============= RELEASES HOOKS =============

export function useReleases(filters?: ReleaseFilters, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.releases.list(filters),
    queryFn: () => releasesApi.list(filters),
    staleTime: 30000,
    ...options,
  });
}

export function useRelease(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.releases.detail(id),
    queryFn: () => releasesApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useReleasesTimeline(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.releases.timeline(startDate, endDate),
    queryFn: () => releasesApi.getTimeline(startDate, endDate),
    staleTime: 60000,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReleaseInput) => releasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
    },
  });
}

export function useUpdateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReleaseInput }) =>
      releasesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.list() });
    },
  });
}

export function usePublishRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releasesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
    },
  });
}

// ============= SOLUTIONS HOOKS =============

export function useSolutions(filters?: SolutionFilters, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.solutions.list(filters),
    queryFn: () => solutionsApi.list(filters),
    staleTime: 30000,
    ...options,
  });
}

export function useSolution(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: queryKeys.solutions.detail(id),
    queryFn: () => solutionsApi.get(id),
    enabled: !!id,
    ...options,
  });
}

export function useSolutionCategories() {
  return useQuery({
    queryKey: queryKeys.solutions.categories(),
    queryFn: () => solutionsApi.getCategories(),
    staleTime: 300000, // 5 minutes
  });
}

export function useCreateSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSolutionInput) => solutionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solutions.all });
    },
  });
}

export function useUpdateSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSolutionInput }) =>
      solutionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solutions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.solutions.list() });
    },
  });
}

export function usePublishSolution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => solutionsApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solutions.all });
    },
  });
}

export function useStartImplementation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ solutionId, customerId }: { solutionId: string; customerId: string }) =>
      solutionsApi.startImplementation(solutionId, customerId),
    onSuccess: (_, { solutionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.solutions.detail(solutionId) });
    },
  });
}
