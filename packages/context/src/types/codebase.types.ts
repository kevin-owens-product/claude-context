/**
 * Codebase Observation Engine Types
 * @prompt-id forge-v4.1:types:codebase:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import type { TenantId } from '../types';

// ============================================================================
// BRANDED TYPES
// ============================================================================

export type RepositoryId = string & { __brand: 'RepositoryId' };
export type CodeBranchId = string & { __brand: 'CodeBranchId' };
export type CodeFileId = string & { __brand: 'CodeFileId' };
export type FileImportId = string & { __brand: 'FileImportId' };
export type CodeCommitId = string & { __brand: 'CodeCommitId' };
export type FileChangeId = string & { __brand: 'FileChangeId' };
export type RepoSyncJobId = string & { __brand: 'RepoSyncJobId' };

// ============================================================================
// ENUMS
// ============================================================================

export enum RepoProvider {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET',
  AZURE_DEVOPS = 'AZURE_DEVOPS',
  OTHER = 'OTHER',
}

export enum RepoAuthType {
  NONE = 'NONE',
  SSH_KEY = 'SSH_KEY',
  PAT = 'PAT',
  GITHUB_APP = 'GITHUB_APP',
  OAUTH = 'OAUTH',
}

export enum RepoStatus {
  PENDING = 'PENDING',
  CLONING = 'CLONING',
  ACTIVE = 'ACTIVE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
  ARCHIVED = 'ARCHIVED',
}

export enum FileType {
  SOURCE = 'SOURCE',
  TEST = 'TEST',
  CONFIG = 'CONFIG',
  DOCUMENTATION = 'DOCUMENTATION',
  GENERATED = 'GENERATED',
  ASSET = 'ASSET',
  OTHER = 'OTHER',
}

export enum ImportType {
  ES_IMPORT = 'ES_IMPORT',
  ES_DYNAMIC = 'ES_DYNAMIC',
  ES_REEXPORT = 'ES_REEXPORT',
  COMMONJS = 'COMMONJS',
  TYPESCRIPT_TYPE = 'TYPESCRIPT_TYPE',
  CSS_IMPORT = 'CSS_IMPORT',
  SCSS_IMPORT = 'SCSS_IMPORT',
}

export enum FileChangeType {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED',
  RENAMED = 'RENAMED',
  COPIED = 'COPIED',
}

export enum SyncJobType {
  INITIAL_CLONE = 'INITIAL_CLONE',
  INCREMENTAL_SYNC = 'INCREMENTAL_SYNC',
  FULL_RESYNC = 'FULL_RESYNC',
  IMPORT_ANALYSIS = 'IMPORT_ANALYSIS',
  FILE_TRACKING = 'FILE_TRACKING',
  SYMBOL_ANALYSIS = 'SYMBOL_ANALYSIS',
}

// ============================================================================
// SYMBOL ANALYSIS ENUMS
// ============================================================================

export enum SymbolKind {
  FUNCTION = 'FUNCTION',
  METHOD = 'METHOD',
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
  TYPE_ALIAS = 'TYPE_ALIAS',
  ENUM = 'ENUM',
  ENUM_MEMBER = 'ENUM_MEMBER',
  VARIABLE = 'VARIABLE',
  CONSTANT = 'CONSTANT',
  PROPERTY = 'PROPERTY',
  GETTER = 'GETTER',
  SETTER = 'SETTER',
  CONSTRUCTOR = 'CONSTRUCTOR',
  NAMESPACE = 'NAMESPACE',
  MODULE = 'MODULE',
  PARAMETER = 'PARAMETER',
  TYPE_PARAMETER = 'TYPE_PARAMETER',
}

export enum SymbolVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  PROTECTED = 'PROTECTED',
  INTERNAL = 'INTERNAL',
}

export enum ReferenceType {
  CALL = 'CALL',
  INSTANTIATION = 'INSTANTIATION',
  EXTENSION = 'EXTENSION',
  TYPE_REFERENCE = 'TYPE_REFERENCE',
  IMPORT = 'IMPORT',
  PROPERTY_ACCESS = 'PROPERTY_ACCESS',
  ASSIGNMENT = 'ASSIGNMENT',
  PARAMETER = 'PARAMETER',
  RETURN_TYPE = 'RETURN_TYPE',
  DECORATOR = 'DECORATOR',
}

export enum GraphType {
  FILE_IMPORTS = 'FILE_IMPORTS',
  SYMBOL_CALLS = 'SYMBOL_CALLS',
  CLASS_HIERARCHY = 'CLASS_HIERARCHY',
  TYPE_DEPENDENCIES = 'TYPE_DEPENDENCIES',
  FULL_DEPENDENCY = 'FULL_DEPENDENCY',
}

export enum CapabilityLinkType {
  IMPLEMENTS = 'IMPLEMENTS',
  SUPPORTS = 'SUPPORTS',
  TESTS = 'TESTS',
  CONFIGURES = 'CONFIGURES',
  DOCUMENTS = 'DOCUMENTS',
}

export enum SyncJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// CORE TYPES
// ============================================================================

export interface Repository {
  id: RepositoryId;
  tenantId: TenantId;
  name: string;
  description?: string;
  url: string;
  provider: RepoProvider;
  defaultBranch: string;
  authType: RepoAuthType;
  authConfig: Record<string, unknown>;
  status: RepoStatus;
  statusMessage?: string;
  clonedAt?: Date;
  lastSyncAt?: Date;
  lastSyncCommit?: string;
  localPath?: string;
  fileCount: number;
  totalLines: number;
  languages: Record<string, number>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  branches?: CodeBranch[];
  files?: CodeFile[];
}

export interface CodeBranch {
  id: CodeBranchId;
  repositoryId: RepositoryId;
  name: string;
  isDefault: boolean;
  isTracked: boolean;
  headCommit?: string;
  aheadOfDefault: number;
  behindDefault: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeFile {
  id: CodeFileId;
  repositoryId: RepositoryId;
  path: string;
  name: string;
  extension?: string;
  language?: string;
  fileType: FileType;
  contentHash: string;
  lineCount: number;
  byteSize: number;
  lastModifiedCommit?: string;
  lastModifiedAt?: Date;
  changeFrequency: number;
  complexity: FileComplexity;
  deletedAt?: Date;
  deletedInCommit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileComplexity {
  cyclomatic?: number;
  linesOfCode?: number;
  functions?: number;
  classes?: number;
  maintainabilityIndex?: number;
}

export interface FileImport {
  id: FileImportId;
  repositoryId: RepositoryId;
  sourceFileId: CodeFileId;
  targetFileId?: CodeFileId;
  importPath: string;
  importType: ImportType;
  isResolved: boolean;
  isExternal: boolean;
  importedSymbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeCommit {
  id: CodeCommitId;
  repositoryId: RepositoryId;
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: Date;
  committerName: string;
  committerEmail: string;
  committedAt: Date;
  parentShas: string[];
  isMerge: boolean;
  filesChanged: number;
  insertions: number;
  deletions: number;
  branchName?: string;
  createdAt: Date;
  fileChanges?: FileChange[];
}

export interface FileChange {
  id: FileChangeId;
  commitId: CodeCommitId;
  fileId?: CodeFileId;
  changeType: FileChangeType;
  oldPath?: string;
  newPath: string;
  insertions: number;
  deletions: number;
  oldHash?: string;
  newHash?: string;
  createdAt: Date;
}

export interface RepoSyncJob {
  id: RepoSyncJobId;
  repositoryId: RepositoryId;
  jobType: SyncJobType;
  status: SyncJobStatus;
  progress: number;
  progressMessage?: string;
  fromCommit?: string;
  toCommit?: string;
  filesProcessed: number;
  commitsProcessed: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface CreateRepositoryRequest {
  name: string;
  description?: string;
  url: string;
  provider?: RepoProvider;
  defaultBranch?: string;
  authType?: RepoAuthType;
  authConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateRepositoryRequest {
  name?: string;
  description?: string;
  defaultBranch?: string;
  authType?: RepoAuthType;
  authConfig?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ListFilesFilter {
  path?: string; // Filter by path prefix
  extension?: string;
  language?: string;
  fileType?: FileType;
  minChangeFrequency?: number;
  limit?: number;
  offset?: number;
}

export interface ListCommitsFilter {
  branch?: string;
  author?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface RepositoryFilter {
  status?: RepoStatus;
  provider?: RepoProvider;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface DependencyNode {
  fileId: CodeFileId;
  path: string;
  language?: string;
  depth: number;
  children: DependencyNode[];
}

export interface DependencyGraph {
  root: DependencyNode;
  totalNodes: number;
  maxDepth: number;
  externalDependencies: ExternalDependency[];
}

export interface ExternalDependency {
  name: string;
  importCount: number;
  files: string[];
}

export interface FileHotspot {
  fileId: CodeFileId;
  path: string;
  changeCount: number;
  uniqueAuthors: number;
  recentChanges: number; // Changes in last 30 days
  complexity?: FileComplexity;
  riskScore: number; // 0-100, based on change frequency + complexity
}

export interface RepositoryStats {
  fileCount: number;
  totalLines: number;
  languages: Record<string, number>;
  commitCount: number;
  contributorCount: number;
  avgFileSize: number;
  avgComplexity: number;
}

export interface ChangeActivity {
  date: string; // ISO date
  commits: number;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

// ============================================================================
// GIT SYNC TYPES
// ============================================================================

export interface GitCloneOptions {
  depth?: number; // Shallow clone depth
  branch?: string;
  singleBranch?: boolean;
}

export interface GitFetchOptions {
  prune?: boolean; // Remove deleted remote branches
  tags?: boolean;
}

export interface GitCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: Date;
  committerName: string;
  committerEmail: string;
  committedAt: Date;
  parentShas: string[];
}

export interface GitFileStatus {
  path: string;
  status: 'A' | 'M' | 'D' | 'R' | 'C'; // Added, Modified, Deleted, Renamed, Copied
  oldPath?: string;
  insertions: number;
  deletions: number;
}

export interface GitDiff {
  commit: GitCommitInfo;
  files: GitFileStatus[];
  stats: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  };
}

// ============================================================================
// IMPORT ANALYSIS TYPES
// ============================================================================

export interface ParsedImport {
  importPath: string;
  importType: ImportType;
  importedSymbols: string[];
  isTypeOnly: boolean;
  line: number;
}

export interface ImportAnalysisResult {
  imports: ParsedImport[];
  reexports: ParsedImport[];
  language: string;
}

export interface ResolvedImport extends ParsedImport {
  isResolved: boolean;
  isExternal: boolean;
  resolvedPath?: string;
  resolvedFileId?: CodeFileId;
}

// ============================================================================
// MCP TYPES
// ============================================================================

export interface MCPRepositoryInfo {
  id: string;
  name: string;
  url: string;
  status: RepoStatus;
  fileCount: number;
  languages: Record<string, number>;
  lastSyncAt?: string;
}

export interface MCPFileInfo {
  id: string;
  path: string;
  language?: string;
  fileType: FileType;
  lineCount: number;
  changeFrequency: number;
}

export interface MCPDependencyInfo {
  path: string;
  imports: string[];
  importedBy: string[];
  externalDeps: string[];
}

export interface MCPHotspotInfo {
  path: string;
  changeCount: number;
  authors: number;
  riskScore: number;
}

export interface MCPCommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: number;
}

// ============================================================================
// SYMBOL ANALYSIS TYPES
// ============================================================================

export type CodeSymbolId = string & { __brand: 'CodeSymbolId' };
export type SymbolReferenceId = string & { __brand: 'SymbolReferenceId' };
export type DependencyGraphId = string & { __brand: 'DependencyGraphId' };
export type SymbolCapabilityLinkId = string & { __brand: 'SymbolCapabilityLinkId' };

export interface SymbolParameter {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface CodeSymbol {
  id: CodeSymbolId;
  repositoryId: RepositoryId;
  fileId: CodeFileId;
  name: string;
  kind: SymbolKind;
  signature?: string;
  documentation?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  parentSymbolId?: CodeSymbolId;
  containerName?: string;
  visibility: SymbolVisibility;
  isExported: boolean;
  isAsync: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  lineCount: number;
  parameterCount: number;
  returnType?: string;
  parameters: SymbolParameter[];
  typeParameters: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedInCommit?: string;
}

export interface SymbolReference {
  id: SymbolReferenceId;
  repositoryId: RepositoryId;
  sourceSymbolId: CodeSymbolId;
  sourceFileId: CodeFileId;
  sourceLine: number;
  sourceColumn: number;
  targetSymbolId?: CodeSymbolId;
  targetFileId?: CodeFileId;
  targetName: string;
  referenceType: ReferenceType;
  isTypeOnly: boolean;
  isExternal: boolean;
  externalPackage?: string;
  createdAt: Date;
}

export interface CachedDependencyGraph {
  id: DependencyGraphId;
  repositoryId: RepositoryId;
  graphType: GraphType;
  rootId?: string;
  rootPath?: string;
  graphData: CallGraphData;
  nodeCount: number;
  edgeCount: number;
  maxDepth: number;
  commitSha: string;
  isStale: boolean;
  computedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SymbolCapabilityLink {
  id: SymbolCapabilityLinkId;
  symbolId: CodeSymbolId;
  capabilityId: string;
  confidence: number;
  linkType: CapabilityLinkType;
  isAutoLinked: boolean;
  evidence: string[];
  linkedBy?: string;
  linkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SYMBOL ANALYSIS REQUEST/FILTER TYPES
// ============================================================================

export interface ListSymbolsFilter {
  fileId?: CodeFileId;
  kind?: SymbolKind | SymbolKind[];
  name?: string;
  isExported?: boolean;
  visibility?: SymbolVisibility;
  minComplexity?: number;
  limit?: number;
  offset?: number;
}

export interface SearchSymbolsRequest {
  query: string;
  kind?: SymbolKind[];
  filePatterns?: string[];
  limit?: number;
}

export interface SymbolSearchResult {
  symbol: CodeSymbol;
  file: {
    id: CodeFileId;
    path: string;
  };
  matchScore: number;
}

// ============================================================================
// CALL GRAPH TYPES
// ============================================================================

export interface CallGraphNode {
  symbolId: CodeSymbolId;
  name: string;
  kind: SymbolKind;
  filePath: string;
  fileId: CodeFileId;
  depth: number;
  complexity: number;
  callCount: number; // How many times this is called
  children: CallGraphNode[];
}

export interface CallGraphData {
  root: CallGraphNode;
  totalNodes: number;
  maxDepth: number;
  externalCalls: ExternalCallInfo[];
  metrics: CallGraphMetrics;
}

export interface ExternalCallInfo {
  package: string;
  symbol: string;
  callCount: number;
  calledFrom: string[]; // File paths
}

export interface CallGraphMetrics {
  avgFanOut: number; // Average outgoing calls per function
  avgFanIn: number; // Average incoming calls per function
  maxFanOut: number;
  maxFanIn: number;
  couplingScore: number; // 0-100
}

// ============================================================================
// COMPLEXITY METRICS TYPES
// ============================================================================

export interface SymbolComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  logicalLinesOfCode: number;
  parameterCount: number;
  nestingDepth: number;
  maintainabilityIndex: number;
}

export interface FileComplexityReport {
  fileId: CodeFileId;
  path: string;
  totalSymbols: number;
  avgCyclomaticComplexity: number;
  avgCognitiveComplexity: number;
  maxCyclomaticComplexity: number;
  maxCognitiveComplexity: number;
  complexSymbols: Array<{
    symbolId: CodeSymbolId;
    name: string;
    kind: SymbolKind;
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
  }>;
}

export interface RepositoryComplexityReport {
  repositoryId: RepositoryId;
  analyzedAt: Date;
  totalFiles: number;
  totalSymbols: number;
  avgFileComplexity: number;
  avgSymbolComplexity: number;
  complexityDistribution: {
    low: number; // 1-10
    medium: number; // 11-20
    high: number; // 21-50
    veryHigh: number; // 50+
  };
  topComplexFiles: FileComplexityReport[];
  topComplexSymbols: Array<{
    symbolId: CodeSymbolId;
    name: string;
    filePath: string;
    cyclomaticComplexity: number;
  }>;
}

// ============================================================================
// MCP SYMBOL TYPES
// ============================================================================

export interface MCPSymbolInfo {
  id: string;
  name: string;
  kind: SymbolKind;
  signature?: string;
  filePath: string;
  line: number;
  isExported: boolean;
  complexity: number;
}

export interface MCPCallGraphInfo {
  rootSymbol: string;
  rootFile: string;
  nodeCount: number;
  maxDepth: number;
  calls: Array<{
    from: string;
    to: string;
    fromFile: string;
    toFile: string;
  }>;
}

export interface MCPComplexityInfo {
  filePath: string;
  avgComplexity: number;
  maxComplexity: number;
  complexSymbols: Array<{
    name: string;
    complexity: number;
    line: number;
  }>;
}
