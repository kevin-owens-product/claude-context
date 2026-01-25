/**
 * Releases API - Release management and tracking
 * @prompt-id forge-v4.1:web:api:releases:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export interface Release {
  id: string;
  version: string;
  name: string;
  description?: string;
  type: 'MAJOR' | 'MINOR' | 'PATCH' | 'HOTFIX';
  status: 'PLANNED' | 'IN_PROGRESS' | 'STAGED' | 'RELEASED' | 'ROLLED_BACK';
  releaseDate?: string;
  targetDate: string;
  owner: string;
  items: ReleaseItem[];
  announcements: ReleaseAnnouncement[];
  metrics: {
    featuresCount: number;
    bugsCount: number;
    enhancementsCount: number;
    breakingChangesCount: number;
    customersImpacted: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseItem {
  id: string;
  type: 'FEATURE' | 'ENHANCEMENT' | 'BUG_FIX' | 'BREAKING_CHANGE' | 'DEPRECATION';
  title: string;
  description?: string;
  sliceId?: string;
  prNumber?: string;
  status: 'PENDING' | 'INCLUDED' | 'EXCLUDED';
}

export interface ReleaseAnnouncement {
  id: string;
  type: 'EMAIL' | 'IN_APP' | 'CHANGELOG' | 'SOCIAL';
  title: string;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledAt?: string;
  sentAt?: string;
}

export interface ReleaseFilters {
  type?: Release['type'];
  status?: Release['status'];
  owner?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface ReleasesResponse {
  data: Release[];
  total: number;
  metrics: {
    totalReleases: number;
    upcoming: number;
    released: number;
    featuresShipped: number;
    bugsFixed: number;
  };
}

export interface CreateReleaseInput {
  version: string;
  name: string;
  description?: string;
  type: Release['type'];
  targetDate: string;
  owner: string;
}

export interface UpdateReleaseInput extends Partial<CreateReleaseInput> {
  status?: Release['status'];
  releaseDate?: string;
}

// API functions
export const releasesApi = {
  list: (filters?: ReleaseFilters) =>
    api.get<ReleasesResponse>('/releases', filters as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<Release>(`/releases/${id}`),

  create: (data: CreateReleaseInput) =>
    api.post<Release>('/releases', data),

  update: (id: string, data: UpdateReleaseInput) =>
    api.put<Release>(`/releases/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/releases/${id}`),

  // Release items
  addItem: (releaseId: string, item: Omit<ReleaseItem, 'id'>) =>
    api.post<ReleaseItem>(`/releases/${releaseId}/items`, item),

  updateItem: (releaseId: string, itemId: string, data: Partial<ReleaseItem>) =>
    api.put<ReleaseItem>(`/releases/${releaseId}/items/${itemId}`, data),

  removeItem: (releaseId: string, itemId: string) =>
    api.delete<void>(`/releases/${releaseId}/items/${itemId}`),

  // Announcements
  addAnnouncement: (releaseId: string, data: Omit<ReleaseAnnouncement, 'id' | 'sentAt'>) =>
    api.post<ReleaseAnnouncement>(`/releases/${releaseId}/announcements`, data),

  updateAnnouncement: (releaseId: string, announcementId: string, data: Partial<ReleaseAnnouncement>) =>
    api.put<ReleaseAnnouncement>(`/releases/${releaseId}/announcements/${announcementId}`, data),

  sendAnnouncement: (releaseId: string, announcementId: string) =>
    api.post<ReleaseAnnouncement>(`/releases/${releaseId}/announcements/${announcementId}/send`),

  // Actions
  publish: (id: string) =>
    api.post<Release>(`/releases/${id}/publish`),

  rollback: (id: string, reason: string) =>
    api.post<Release>(`/releases/${id}/rollback`, { reason }),

  // Timeline view
  getTimeline: (startDate: string, endDate: string) =>
    api.get<Release[]>('/releases/timeline', { startDate, endDate }),
};
