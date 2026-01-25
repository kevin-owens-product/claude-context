/**
 * Symbols API Client
 *
 * API client for the Codebase Observation Engine - Symbol analysis,
 * call graph exploration, and code navigation.
 *
 * @prompt-id forge-v4.1:web:api:symbols:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export type SymbolKind =
  | 'FUNCTION'
  | 'METHOD'
  | 'CLASS'
  | 'INTERFACE'
  | 'TYPE'
  | 'ENUM'
  | 'VARIABLE'
  | 'CONSTANT'
  | 'PROPERTY'
  | 'NAMESPACE'
  | 'MODULE';

export type ReferenceKind = 'CALL' | 'IMPORT' | 'EXTEND' | 'IMPLEMENT' | 'TYPE_REFERENCE' | 'INSTANTIATE';

export interface CodeSymbol {
  id: string;
  repositoryId: string;
  fileId: string;
  filePath: string;
  name: string;
  kind: SymbolKind;
  signature: string;
  description?: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
  isAsync: boolean;
  complexity?: number;
  parameterCount?: number;
  returnType?: string;
  modifiers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SymbolReference {
  id: string;
  sourceSymbolId: string;
  targetSymbolId: string;
  referenceKind: ReferenceKind;
  sourceFile: string;
  sourceLine: number;
  targetFile: string;
  targetLine: number;
}

export interface CallGraphNode {
  symbol: CodeSymbol;
  callers: CallGraphEdge[];
  callees: CallGraphEdge[];
  depth: number;
}

export interface CallGraphEdge {
  symbolId: string;
  symbolName: string;
  filePath: string;
  referenceKind: ReferenceKind;
  line: number;
  callCount: number;
}

export interface CallGraph {
  root: CallGraphNode;
  nodes: Map<string, CallGraphNode> | Record<string, CallGraphNode>;
  edges: CallGraphEdge[];
  totalNodes: number;
  maxDepth: number;
}

export interface SymbolSearchResult {
  symbol: CodeSymbol;
  matchScore: number;
  matchedFields: string[];
  context?: string;
}

export interface SymbolStats {
  totalSymbols: number;
  byKind: Record<SymbolKind, number>;
  exportedCount: number;
  avgComplexity: number;
  highComplexitySymbols: CodeSymbol[];
}

export interface SymbolCapabilityLink {
  id: string;
  symbolId: string;
  capabilityId: string;
  capabilityName: string;
  confidence: number;
  inferenceMethod: 'MANUAL' | 'EMBEDDING' | 'PATH_PATTERN' | 'NAMING_CONVENTION';
  linkedAt: string;
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
// Symbol Search Operations
// =============================================================================

export async function searchSymbols(params: {
  repositoryId?: string;
  query: string;
  kind?: SymbolKind;
  isExported?: boolean;
  filePath?: string;
  minComplexity?: number;
  maxComplexity?: number;
  limit?: number;
  offset?: number;
}): Promise<{ data: SymbolSearchResult[]; total: number }> {
  const queryParams: Record<string, string | number | undefined> = {
    repositoryId: params.repositoryId,
    query: params.query,
    kind: params.kind,
    isExported: params.isExported !== undefined ? String(params.isExported) : undefined,
    filePath: params.filePath,
    minComplexity: params.minComplexity,
    maxComplexity: params.maxComplexity,
    limit: params.limit,
    offset: params.offset,
  };
  return api.get<ListResponse<SymbolSearchResult>>('/symbols/search', queryParams);
}

export async function listSymbols(repositoryId: string, params?: {
  fileId?: string;
  kind?: SymbolKind;
  isExported?: boolean;
  search?: string;
  sortBy?: 'name' | 'complexity' | 'line';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ data: CodeSymbol[]; total: number }> {
  return api.get<ListResponse<CodeSymbol>>(`/repositories/${repositoryId}/symbols`, params as Record<string, string | number | undefined>);
}

export async function getSymbol(symbolId: string): Promise<CodeSymbol> {
  const response = await api.get<ApiResponse<CodeSymbol>>(`/symbols/${symbolId}`);
  return response.data;
}

export async function getSymbolByPath(repositoryId: string, filePath: string, symbolName: string): Promise<CodeSymbol> {
  const response = await api.get<ApiResponse<CodeSymbol>>(`/repositories/${repositoryId}/symbols/by-path`, {
    filePath,
    symbolName,
  });
  return response.data;
}

// =============================================================================
// Symbol Reference Operations
// =============================================================================

export async function getSymbolReferences(symbolId: string, params?: {
  direction?: 'incoming' | 'outgoing' | 'both';
  referenceKind?: ReferenceKind;
  limit?: number;
  offset?: number;
}): Promise<{ data: SymbolReference[]; total: number }> {
  return api.get<ListResponse<SymbolReference>>(`/symbols/${symbolId}/references`, params as Record<string, string | number | undefined>);
}

export async function findReferencesInFile(repositoryId: string, fileId: string): Promise<{ data: SymbolReference[]; total: number }> {
  return api.get<ListResponse<SymbolReference>>(`/repositories/${repositoryId}/files/${fileId}/references`);
}

// =============================================================================
// Call Graph Operations
// =============================================================================

export async function getCallGraph(symbolId: string, params?: {
  depth?: number;
  direction?: 'callers' | 'callees' | 'both';
  includeExternal?: boolean;
}): Promise<CallGraph> {
  const response = await api.get<ApiResponse<CallGraph>>(`/symbols/${symbolId}/call-graph`, params as Record<string, string | number | undefined>);
  return response.data;
}

export async function getFileCallGraph(repositoryId: string, fileId: string, params?: {
  depth?: number;
  includeImports?: boolean;
}): Promise<CallGraph> {
  const response = await api.get<ApiResponse<CallGraph>>(
    `/repositories/${repositoryId}/files/${fileId}/call-graph`,
    params as Record<string, string | number | undefined>
  );
  return response.data;
}

export async function getModuleCallGraph(repositoryId: string, modulePath: string, params?: {
  depth?: number;
}): Promise<CallGraph> {
  const response = await api.get<ApiResponse<CallGraph>>(
    `/repositories/${repositoryId}/modules/call-graph`,
    { modulePath, ...params } as Record<string, string | number | undefined>
  );
  return response.data;
}

// =============================================================================
// Symbol Statistics
// =============================================================================

export async function getSymbolStats(repositoryId: string): Promise<SymbolStats> {
  const response = await api.get<ApiResponse<SymbolStats>>(`/repositories/${repositoryId}/symbols/stats`);
  return response.data;
}

export async function getComplexityDistribution(repositoryId: string): Promise<{ buckets: { min: number; max: number; count: number }[] }> {
  const response = await api.get<ApiResponse<{ buckets: { min: number; max: number; count: number }[] }>>(
    `/repositories/${repositoryId}/symbols/complexity-distribution`
  );
  return response.data;
}

export async function getMostComplexSymbols(repositoryId: string, params?: {
  limit?: number;
  kind?: SymbolKind;
}): Promise<{ data: CodeSymbol[]; total: number }> {
  return api.get<ListResponse<CodeSymbol>>(
    `/repositories/${repositoryId}/symbols/most-complex`,
    params as Record<string, string | number | undefined>
  );
}

export async function getMostReferencedSymbols(repositoryId: string, params?: {
  limit?: number;
  kind?: SymbolKind;
}): Promise<{ data: (CodeSymbol & { referenceCount: number })[]; total: number }> {
  return api.get<ListResponse<CodeSymbol & { referenceCount: number }>>(
    `/repositories/${repositoryId}/symbols/most-referenced`,
    params as Record<string, string | number | undefined>
  );
}

// =============================================================================
// Capability Linking Operations
// =============================================================================

export async function getSymbolCapabilityLinks(symbolId: string): Promise<{ data: SymbolCapabilityLink[]; total: number }> {
  return api.get<ListResponse<SymbolCapabilityLink>>(`/symbols/${symbolId}/capabilities`);
}

export async function linkSymbolToCapability(symbolId: string, data: {
  capabilityId: string;
  confidence?: number;
}): Promise<SymbolCapabilityLink> {
  const response = await api.post<ApiResponse<SymbolCapabilityLink>>(`/symbols/${symbolId}/capabilities`, data);
  return response.data;
}

export async function unlinkSymbolFromCapability(symbolId: string, capabilityId: string): Promise<void> {
  await api.delete(`/symbols/${symbolId}/capabilities/${capabilityId}`);
}

export async function getCapabilitySymbols(capabilityId: string, params?: {
  repositoryId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: (CodeSymbol & { linkConfidence: number })[]; total: number }> {
  return api.get<ListResponse<CodeSymbol & { linkConfidence: number }>>(
    `/capabilities/${capabilityId}/symbols`,
    params as Record<string, string | number | undefined>
  );
}

export async function inferCapabilityLinks(repositoryId: string, params?: {
  method?: 'EMBEDDING' | 'PATH_PATTERN' | 'NAMING_CONVENTION';
  minConfidence?: number;
}): Promise<{ created: number; updated: number }> {
  return api.post<{ created: number; updated: number }>(
    `/repositories/${repositoryId}/symbols/infer-capabilities`,
    params
  );
}
