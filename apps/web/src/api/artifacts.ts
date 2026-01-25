/**
 * Artifacts API - Client for living artifacts operations
 * @prompt-id forge-v4.1:web:api:artifacts:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

export type ArtifactType =
  | 'code'
  | 'test'
  | 'documentation'
  | 'schema'
  | 'config'
  | 'api_spec'
  | 'diagram'
  | 'other';

export type ArtifactStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export type ArtifactLinkType = 'implements' | 'tests' | 'documents' | 'configures' | 'depends_on';

export interface ArtifactLink {
  id: string;
  artifactId: string;
  intentNodeId: string;
  intentNodeType: 'goal' | 'constraint' | 'entity' | 'behavior';
  linkType: ArtifactLinkType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  version: number;
  content: string;
  contentHash: string;
  synthesizedFrom?: string[];
  changelog?: string;
  createdBy: string;
  createdAt: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  intentGraphId?: string;
  name: string;
  description?: string;
  type: ArtifactType;
  status: ArtifactStatus;
  currentVersion: number;
  links?: ArtifactLink[];
  versions?: ArtifactVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactListResponse {
  artifacts: Artifact[];
  total: number;
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  additions: number;
  deletions: number;
  diff: string;
}

export interface EvolutionProposal {
  artifactId: string;
  changedIntentNodes: string[];
  proposedChanges: string;
  impactAnalysis: string;
}

export const artifactsApi = {
  listArtifacts: (projectId: string, params?: {
    type?: ArtifactType;
    status?: ArtifactStatus;
    intentGraphId?: string;
    limit?: number;
    offset?: number;
  }) => api.get<ArtifactListResponse>('/artifacts', { projectId, ...params }),

  getArtifact: (artifactId: string) => api.get<Artifact>(`/artifacts/${artifactId}`),

  createArtifact: (data: {
    projectId: string;
    intentGraphId?: string;
    name: string;
    description?: string;
    type: ArtifactType;
    content: string;
  }) => api.post<Artifact>('/artifacts', data),

  updateArtifact: (artifactId: string, data: Partial<Pick<Artifact, 'name' | 'description' | 'status'>>) =>
    api.put<Artifact>(`/artifacts/${artifactId}`, data),

  deleteArtifact: (artifactId: string) => api.delete<void>(`/artifacts/${artifactId}`),

  // Versions
  listVersions: (artifactId: string) => api.get<ArtifactVersion[]>(`/artifacts/${artifactId}/versions`),

  getVersion: (artifactId: string, version: number) =>
    api.get<ArtifactVersion>(`/artifacts/${artifactId}/versions/${version}`),

  createVersion: (artifactId: string, data: {
    content: string;
    synthesizedFrom?: string[];
    changelog?: string;
  }) => api.post<ArtifactVersion>(`/artifacts/${artifactId}/versions`, data),

  diffVersions: (artifactId: string, from: number, to: number) =>
    api.get<VersionDiff>(`/artifacts/${artifactId}/diff`, { from, to }),

  // Links (Provenance)
  addLink: (artifactId: string, data: {
    intentNodeId: string;
    intentNodeType: 'goal' | 'constraint' | 'entity' | 'behavior';
    linkType: ArtifactLinkType;
    metadata?: Record<string, unknown>;
  }) => api.post<ArtifactLink>(`/artifacts/${artifactId}/links`, data),

  removeLink: (artifactId: string, linkId: string) =>
    api.delete<void>(`/artifacts/${artifactId}/links/${linkId}`),

  // Evolution
  proposeEvolution: (artifactId: string, changedIntentNodeIds: string[]) =>
    api.post<EvolutionProposal | { message: string }>(`/artifacts/${artifactId}/propose-evolution`, {
      changedIntentNodeIds,
    }),
};
