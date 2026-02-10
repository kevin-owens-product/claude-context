// ===== AI Modes (matching Android AiModes.kt) =====

export enum AiMode {
  AGENT = 'AGENT',
  DEBUG = 'DEBUG',
  PLAN = 'PLAN',
  SWARM = 'SWARM',
  QUEUE = 'QUEUE',
  SESSION = 'SESSION',
  CONTEXT = 'CONTEXT',
  DESIGN = 'DESIGN',
}

export const AI_MODE_COLORS: Record<AiMode, string> = {
  [AiMode.AGENT]: '#6366F1',
  [AiMode.DEBUG]: '#EF4444',
  [AiMode.PLAN]: '#10B981',
  [AiMode.SWARM]: '#F59E0B',
  [AiMode.QUEUE]: '#8B5CF6',
  [AiMode.SESSION]: '#06B6D4',
  [AiMode.CONTEXT]: '#14B8A6',
  [AiMode.DESIGN]: '#EC4899',
};

export const AI_MODE_LABELS: Record<AiMode, string> = {
  [AiMode.AGENT]: 'Agent',
  [AiMode.DEBUG]: 'Debug',
  [AiMode.PLAN]: 'Plan',
  [AiMode.SWARM]: 'Swarm',
  [AiMode.QUEUE]: 'Queue',
  [AiMode.SESSION]: 'Session',
  [AiMode.CONTEXT]: 'Context',
  [AiMode.DESIGN]: 'Design',
};

export const AI_MODE_DESCRIPTIONS: Record<AiMode, string> = {
  [AiMode.AGENT]: 'Autonomous AI agent that executes tasks',
  [AiMode.DEBUG]: 'Systematic debugging with hypothesis testing',
  [AiMode.PLAN]: 'Strategic planning and step-by-step execution',
  [AiMode.SWARM]: 'Parallel multi-agent task execution',
  [AiMode.QUEUE]: 'Batch prompt queue management',
  [AiMode.SESSION]: 'Branching conversation sessions',
  [AiMode.CONTEXT]: 'Token budget and context management',
  [AiMode.DESIGN]: 'Theme and UI customization',
};

// ===== Agent Mode Types =====

export type AgentActionType =
  | 'READ_FILE'
  | 'WRITE_FILE'
  | 'EXECUTE_COMMAND'
  | 'SEARCH'
  | 'ASK_USER'
  | 'COMPLETE';

export interface AgentAction {
  id: string;
  type: AgentActionType;
  description: string;
  input: string;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'needs_approval';
  timestamp: number;
}

export interface AgentSession {
  id: string;
  task: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  actions: AgentAction[];
  startedAt?: number;
  completedAt?: number;
  totalTokens: number;
}

// ===== Debug Mode Types =====

export type DebugSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface DebugHypothesis {
  id: string;
  description: string;
  likelihood: number;
  evidence: string[];
  disproved: boolean;
  tested: boolean;
}

export interface DebugLogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source?: string;
}

export interface DebugSession {
  id: string;
  bugDescription: string;
  severity: DebugSeverity;
  hypotheses: DebugHypothesis[];
  logs: DebugLogEntry[];
  fixProposal?: string;
  status: 'investigating' | 'hypothesis_testing' | 'fix_proposed' | 'resolved';
  rootCause?: string;
}

// ===== Plan Mode Types =====

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: PlanStepStatus;
  dependencies: string[];
  estimatedTokens: number;
  substeps: PlanStep[];
  output?: string;
}

export interface PlanQuestion {
  id: string;
  question: string;
  answer?: string;
  required: boolean;
}

export interface PlanSession {
  id: string;
  goal: string;
  questions: PlanQuestion[];
  steps: PlanStep[];
  status: 'gathering_info' | 'planning' | 'executing' | 'completed';
  totalEstimatedTokens: number;
  tokensUsed: number;
}

// ===== Swarm Mode Types =====

export type SwarmStrategy = 'parallel' | 'pipeline' | 'debate' | 'review';

export type SwarmWorkerStatus =
  | 'idle'
  | 'working'
  | 'completed'
  | 'failed'
  | 'waiting';

export interface SwarmWorker {
  id: string;
  name: string;
  role: string;
  status: SwarmWorkerStatus;
  currentTask?: string;
  progress: number;
  tokensUsed: number;
  output?: string;
}

export interface SwarmSession {
  id: string;
  strategy: SwarmStrategy;
  workers: SwarmWorker[];
  task: string;
  status: 'configuring' | 'running' | 'merging' | 'completed' | 'failed';
  aggregatedOutput?: string;
}

// ===== Queue Mode Types =====

export type QueuePriority = 'critical' | 'high' | 'normal' | 'low';

export type QueuedPromptStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface QueuedPrompt {
  id: string;
  prompt: string;
  priority: QueuePriority;
  status: QueuedPromptStatus;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
  estimatedTokens: number;
}

export interface PromptQueueState {
  prompts: QueuedPrompt[];
  isRunning: boolean;
  concurrency: number;
  totalCompleted: number;
  totalFailed: number;
  totalTokensUsed: number;
}

// ===== Session Mode Types =====

export interface SessionCheckpoint {
  id: string;
  name: string;
  timestamp: number;
  messageCount: number;
  tokensUsed: number;
}

export interface SessionBranch {
  id: string;
  name: string;
  parentId?: string;
  checkpointId: string;
  createdAt: number;
  messages: ChatMessageData[];
}

export interface SessionState {
  branches: SessionBranch[];
  activeBranchId: string;
  checkpoints: SessionCheckpoint[];
}

// ===== Context Mode Types =====

export type ContextEntryType =
  | 'file'
  | 'conversation'
  | 'system_prompt'
  | 'tool_output'
  | 'user_context';

export type ContextStrategy = 'fifo' | 'priority' | 'relevance' | 'manual';

export interface ContextEntry {
  id: string;
  type: ContextEntryType;
  name: string;
  tokens: number;
  pinned: boolean;
  priority: number;
  content: string;
  addedAt: number;
}

export interface ContextBudget {
  maxTokens: number;
  usedTokens: number;
  entries: ContextEntry[];
  strategy: ContextStrategy;
}

// ===== Design Mode Types =====

export type ThemeVariant = 'dark' | 'light' | 'auto';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  sidebarWidth: number;
  aiPanelWidth: number;
  showTerminal: boolean;
  showFileExplorer: boolean;
}

export interface DesignSettings {
  theme: ThemeVariant;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  activePreset: string;
  presets: LayoutPreset[];
  accentColor: string;
  borderRadius: number;
}

// ===== Chat Message Types =====

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  mode: AiMode;
  tokens?: number;
  codeBlocks?: CodeBlock[];
  isStreaming?: boolean;
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

// ===== Auth Types =====

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// ===== App Settings =====

export type AiProvider = 'claude' | 'openai' | 'gemini';

export interface AppSettings {
  apiKey: string;
  provider: AiProvider;
  theme: ThemeVariant;
  fontSize: number;
}

// ===== File System Types =====

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  language?: string;
  content?: string;
  isOpen?: boolean;
  isModified?: boolean;
}

export interface OpenFile {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
  cursorPosition?: { line: number; column: number };
}

// ===== Layout Types =====

export type DeviceType = 'phone' | 'tablet' | 'foldable' | 'desktop';

export interface PanelState {
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  terminalOpen: boolean;
  fileExplorerOpen: boolean;
}

// ===== Onboarding =====

export interface OnboardingPage {
  title: string;
  description: string;
  icon: string;
}

// ===== Project =====

export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  language: string;
  description?: string;
}
