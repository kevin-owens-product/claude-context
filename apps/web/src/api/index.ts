/**
 * @prompt-id forge-v4.1:web:api:index:003
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

export * from './client';
export * from './context';
export * from './slices';
export * from './feedback';

// Business Domain APIs
export * from './customers';
export * from './deals';
export * from './objectives';
export * from './releases';
export * from './solutions';

// Living Software Platform APIs
export * from './identity';
export * from './projects';
export * from './intent-graphs';
export * from './artifacts';
export * from './assembly';

// Living Software Core APIs
export * from './intents';
export * from './signals';
export * from './capabilities';
export {
  createExperiment,
  listExperiments,
  getExperiment,
  updateExperiment,
  startExperiment,
  pauseExperiment,
  resumeExperiment,
  stopExperiment,
  recordLearnings,
  checkGuardrails,
  getExperimentStats,
  type Experiment,
  type ExperimentStats,
  type ExperimentStatus,
  type ExperimentType,
  type ExperimentVerdict,
  type TargetMetric,
  type SuccessCriterion as ExperimentSuccessCriterion,
  type Guardrail,
  type TargetAudience,
  type ExperimentResult,
  type GuardrailAction,
  type GuardrailCheckResult,
} from './experiments';

// Workflow Automation API
export * from './workflows';

// Code Intelligence APIs
export {
  // Types
  type RepoStatus,
  type FileType,
  type ImportType,
  type FileChangeType,
  type Repository,
  type CodeBranch,
  type CodeFile,
  type FileImport,
  type CodeCommit,
  type FileChange,
  type Hotspot,
  type DependencyNode as RepoDependencyNode,
  type DependencyEdge,
  type RepositorySummary,
  type SyncProgress,
  // Functions
  createRepository,
  listRepositories,
  getRepository,
  updateRepository,
  deleteRepository,
  syncRepository,
  getSyncProgress,
  getRepositorySummary,
  listBranches,
  getBranch,
  listFiles,
  getFile,
  getFileContent,
  getFileDependencies,
  getFileImports,
  listCommits,
  getCommit,
  getHotspots,
  getLanguageStats,
  getActivityStats,
  getContributorStats,
} from './repositories';
export * from './symbols';
export * from './codeHealth';
