/**
 * Repositories API Client
 *
 * API client for the Codebase Observation Engine - Repository management,
 * file tracking, and dependency analysis.
 *
 * @prompt-id forge-v4.1:web:api:repositories:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export type RepoStatus = 'PENDING' | 'CLONING' | 'ACTIVE' | 'SYNCING' | 'ERROR' | 'ARCHIVED';
export type FileType = 'SOURCE' | 'TEST' | 'CONFIG' | 'DOCUMENTATION' | 'GENERATED' | 'OTHER';
export type ImportType = 'ES_IMPORT' | 'ES_DYNAMIC' | 'COMMONJS' | 'TYPESCRIPT_TYPE';
export type FileChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';

export interface Repository {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  defaultBranch: string;
  status: RepoStatus;
  lastSyncAt?: string;
  lastSyncCommit?: string;
  fileCount: number;
  symbolCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CodeBranch {
  id: string;
  repositoryId: string;
  name: string;
  isDefault: boolean;
  lastCommitSha: string;
  lastCommitDate: string;
  aheadOfDefault: number;
  behindDefault: number;
  createdAt: string;
}

export interface CodeFile {
  id: string;
  repositoryId: string;
  branchId: string;
  path: string;
  filename: string;
  extension: string;
  language: string;
  fileType: FileType;
  lineCount: number;
  byteSize: number;
  contentHash: string;
  lastModifiedAt: string;
  createdAt: string;
}

export interface FileImport {
  id: string;
  sourceFileId: string;
  targetFileId?: string;
  importPath: string;
  importType: ImportType;
  isResolved: boolean;
  importedSymbols: string[];
}

export interface CodeCommit {
  id: string;
  repositoryId: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface FileChange {
  id: string;
  commitId: string;
  fileId?: string;
  path: string;
  changeType: FileChangeType;
  oldPath?: string;
  insertions: number;
  deletions: number;
}

export interface Hotspot {
  fileId: string;
  path: string;
  changeCount: number;
  uniqueAuthors: number;
  avgChangesPerCommit: number;
  complexity?: number;
  riskScore: number;
}

export interface DependencyNode {
  fileId: string;
  path: string;
  language: string;
  imports: DependencyEdge[];
  importedBy: DependencyEdge[];
}

export interface DependencyEdge {
  fileId: string;
  path: string;
  importType: ImportType;
  symbols: string[];
}

export interface RepositorySummary {
  totalRepositories: number;
  byStatus: Record<RepoStatus, number>;
  totalFiles: number;
  totalSymbols: number;
  totalCommits: number;
  languageBreakdown: Record<string, number>;
}

export interface SyncProgress {
  phase: 'cloning' | 'analyzing' | 'indexing' | 'complete' | 'error';
  progress: number;
  filesProcessed: number;
  totalFiles: number;
  currentFile?: string;
  errorMessage?: string;
}

// =============================================================================
// Response wrappers
// =============================================================================

interface ApiResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  total: number;
}

// =============================================================================
// Repository Operations
// =============================================================================

export async function createRepository(data: {
  name: string;
  url: string;
  defaultBranch?: string;
  authToken?: string;
}): Promise<Repository> {
  const response = await api.post<ApiResponse<Repository>>('/repositories', data);
  return response.data;
}

export async function listRepositories(params?: {
  status?: RepoStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Repository[]; total: number }> {
  return api.get<ListResponse<Repository>>('/repositories', params as Record<string, string | number | undefined>);
}

export async function getRepository(id: string): Promise<Repository> {
  const response = await api.get<ApiResponse<Repository>>(`/repositories/${id}`);
  return response.data;
}

export async function updateRepository(id: string, data: Partial<{
  name: string;
  defaultBranch: string;
  authToken: string;
}>): Promise<Repository> {
  const response = await api.put<ApiResponse<Repository>>(`/repositories/${id}`, data);
  return response.data;
}

export async function deleteRepository(id: string): Promise<void> {
  await api.delete(`/repositories/${id}`);
}

export async function syncRepository(id: string): Promise<{ jobId: string }> {
  return api.post<{ jobId: string }>(`/repositories/${id}/sync`);
}

export async function getSyncProgress(id: string): Promise<SyncProgress> {
  const response = await api.get<ApiResponse<SyncProgress>>(`/repositories/${id}/sync/progress`);
  return response.data;
}

export async function getRepositorySummary(): Promise<RepositorySummary> {
  const response = await api.get<ApiResponse<RepositorySummary>>('/repositories/summary');
  return response.data;
}

// =============================================================================
// Branch Operations
// =============================================================================

export async function listBranches(repositoryId: string): Promise<{ data: CodeBranch[]; total: number }> {
  return api.get<ListResponse<CodeBranch>>(`/repositories/${repositoryId}/branches`);
}

export async function getBranch(repositoryId: string, branchId: string): Promise<CodeBranch> {
  const response = await api.get<ApiResponse<CodeBranch>>(`/repositories/${repositoryId}/branches/${branchId}`);
  return response.data;
}

// =============================================================================
// File Operations
// =============================================================================

export async function listFiles(repositoryId: string, params?: {
  branchId?: string;
  path?: string;
  language?: string;
  fileType?: FileType;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: CodeFile[]; total: number }> {
  return api.get<ListResponse<CodeFile>>(`/repositories/${repositoryId}/files`, params as Record<string, string | number | undefined>);
}

export async function getFile(repositoryId: string, fileId: string): Promise<CodeFile> {
  const response = await api.get<ApiResponse<CodeFile>>(`/repositories/${repositoryId}/files/${fileId}`);
  return response.data;
}

export async function getFileContent(repositoryId: string, fileId: string): Promise<{ content: string; encoding: string }> {
  return api.get<{ content: string; encoding: string }>(`/repositories/${repositoryId}/files/${fileId}/content`);
}

export async function getFileDependencies(repositoryId: string, fileId: string, params?: {
  depth?: number;
  direction?: 'imports' | 'importedBy' | 'both';
}): Promise<DependencyNode> {
  const response = await api.get<ApiResponse<DependencyNode>>(
    `/repositories/${repositoryId}/files/${fileId}/dependencies`,
    params as Record<string, string | number | undefined>
  );
  return response.data;
}

export async function getFileImports(repositoryId: string, fileId: string): Promise<{ data: FileImport[]; total: number }> {
  return api.get<ListResponse<FileImport>>(`/repositories/${repositoryId}/files/${fileId}/imports`);
}

// =============================================================================
// Commit Operations
// =============================================================================

export async function listCommits(repositoryId: string, params?: {
  branchId?: string;
  path?: string;
  author?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: CodeCommit[]; total: number }> {
  return api.get<ListResponse<CodeCommit>>(`/repositories/${repositoryId}/commits`, params as Record<string, string | number | undefined>);
}

export async function getCommit(repositoryId: string, sha: string): Promise<CodeCommit & { changes: FileChange[] }> {
  const response = await api.get<ApiResponse<CodeCommit & { changes: FileChange[] }>>(`/repositories/${repositoryId}/commits/${sha}`);
  return response.data;
}

// =============================================================================
// Analytics Operations
// =============================================================================

export async function getHotspots(repositoryId: string, params?: {
  days?: number;
  limit?: number;
  minChanges?: number;
}): Promise<{ data: Hotspot[]; total: number }> {
  return api.get<ListResponse<Hotspot>>(`/repositories/${repositoryId}/hotspots`, params as Record<string, string | number | undefined>);
}

export async function getLanguageStats(repositoryId: string): Promise<Record<string, { fileCount: number; lineCount: number; percentage: number }>> {
  const response = await api.get<ApiResponse<Record<string, { fileCount: number; lineCount: number; percentage: number }>>>(`/repositories/${repositoryId}/stats/languages`);
  return response.data;
}

export async function getActivityStats(repositoryId: string, params?: {
  days?: number;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<{ data: { period: string; commits: number; filesChanged: number; insertions: number; deletions: number }[] }> {
  return api.get<{ data: { period: string; commits: number; filesChanged: number; insertions: number; deletions: number }[] }>(
    `/repositories/${repositoryId}/stats/activity`,
    params as Record<string, string | number | undefined>
  );
}

export async function getContributorStats(repositoryId: string, params?: {
  days?: number;
  limit?: number;
}): Promise<{ data: { author: string; commits: number; insertions: number; deletions: number; lastActive: string }[] }> {
  return api.get<{ data: { author: string; commits: number; insertions: number; deletions: number; lastActive: string }[] }>(
    `/repositories/${repositoryId}/stats/contributors`,
    params as Record<string, string | number | undefined>
  );
}
