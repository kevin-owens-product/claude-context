import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  AiMode,
  AuthState,
  AppSettings,
  PanelState,
  OpenFile,
  FileNode,
  ChatMessageData,
  AgentSession,
  DebugSession,
  PlanSession,
  SwarmSession,
  PromptQueueState,
  SessionState,
  ContextBudget,
  DesignSettings,
  DeviceType,
  Project,
} from '../types';
import { AiMode as AiModeEnum } from '../types';

// ===== State Shape =====

export interface AppState {
  auth: AuthState;
  settings: AppSettings;
  panels: PanelState;
  currentMode: AiMode;
  deviceType: DeviceType;
  files: {
    tree: FileNode[];
    openFiles: OpenFile[];
    activeFileId: string | null;
  };
  messages: ChatMessageData[];
  agent: AgentSession | null;
  debug: DebugSession | null;
  plan: PlanSession | null;
  swarm: SwarmSession | null;
  queue: PromptQueueState;
  session: SessionState;
  context: ContextBudget;
  design: DesignSettings;
  onboardingComplete: boolean;
  projects: Project[];
  currentProject: Project | null;
}

const initialState: AppState = {
  auth: {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
  },
  settings: {
    apiKey: '',
    provider: 'claude',
    theme: 'dark',
    fontSize: 14,
  },
  panels: {
    sidebarOpen: false,
    aiPanelOpen: true,
    terminalOpen: false,
    fileExplorerOpen: false,
  },
  currentMode: AiModeEnum.AGENT,
  deviceType: 'desktop',
  files: {
    tree: [
      {
        id: 'root',
        name: 'project',
        path: '/',
        type: 'directory',
        children: [
          {
            id: 'src',
            name: 'src',
            path: '/src',
            type: 'directory',
            children: [
              {
                id: 'main-ts',
                name: 'main.ts',
                path: '/src/main.ts',
                type: 'file',
                language: 'typescript',
                content:
                  '// Welcome to Claude Context\n\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));\n',
              },
              {
                id: 'app-tsx',
                name: 'App.tsx',
                path: '/src/App.tsx',
                type: 'file',
                language: 'typescriptreact',
                content:
                  'import React from "react";\n\nexport function App() {\n  return (\n    <div className="app">\n      <h1>Claude Context</h1>\n      <p>AI-powered development</p>\n    </div>\n  );\n}\n',
              },
              {
                id: 'styles-css',
                name: 'styles.css',
                path: '/src/styles.css',
                type: 'file',
                language: 'css',
                content:
                  ':root {\n  --primary: #6366f1;\n  --bg: #0f172a;\n}\n\n.app {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 2rem;\n}\n',
              },
            ],
          },
          {
            id: 'package-json',
            name: 'package.json',
            path: '/package.json',
            type: 'file',
            language: 'json',
            content:
              '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "tsc && vite build"\n  }\n}\n',
          },
          {
            id: 'readme',
            name: 'README.md',
            path: '/README.md',
            type: 'file',
            language: 'markdown',
            content: '# My Project\n\nA sample project for Claude Context.\n',
          },
        ],
      },
    ],
    openFiles: [
      {
        id: 'main-ts',
        path: '/src/main.ts',
        name: 'main.ts',
        language: 'typescript',
        isModified: false,
        content:
          '// Welcome to Claude Context\n\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));\n',
      },
    ],
    activeFileId: 'main-ts',
  },
  messages: [],
  agent: null,
  debug: null,
  plan: null,
  swarm: null,
  queue: {
    prompts: [],
    isRunning: false,
    concurrency: 1,
    totalCompleted: 0,
    totalFailed: 0,
    totalTokensUsed: 0,
  },
  session: {
    branches: [],
    activeBranchId: 'main',
    checkpoints: [],
  },
  context: {
    maxTokens: 128000,
    usedTokens: 0,
    entries: [],
    strategy: 'relevance',
  },
  design: {
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    lineHeight: 1.6,
    activePreset: 'default',
    presets: [
      {
        id: 'default',
        name: 'Default',
        description: 'Standard layout',
        sidebarWidth: 260,
        aiPanelWidth: 400,
        showTerminal: false,
        showFileExplorer: true,
      },
      {
        id: 'focus',
        name: 'Focus',
        description: 'Editor only',
        sidebarWidth: 0,
        aiPanelWidth: 0,
        showTerminal: false,
        showFileExplorer: false,
      },
      {
        id: 'ai-first',
        name: 'AI First',
        description: 'Large AI panel',
        sidebarWidth: 200,
        aiPanelWidth: 600,
        showTerminal: false,
        showFileExplorer: false,
      },
    ],
    accentColor: '#6366F1',
    borderRadius: 8,
  },
  onboardingComplete: false,
  projects: [
    {
      id: 'demo',
      name: 'Demo Project',
      path: '/demo',
      lastOpened: Date.now(),
      language: 'typescript',
      description: 'A sample TypeScript project',
    },
  ],
  currentProject: null,
};

// ===== Actions =====

type AppAction =
  | { type: 'SET_AUTH'; payload: Partial<AuthState> }
  | { type: 'LOGOUT' }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_MODE'; payload: AiMode }
  | { type: 'SET_DEVICE_TYPE'; payload: DeviceType }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_AI_PANEL' }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'TOGGLE_FILE_EXPLORER' }
  | { type: 'SET_PANELS'; payload: Partial<PanelState> }
  | { type: 'OPEN_FILE'; payload: OpenFile }
  | { type: 'CLOSE_FILE'; payload: string }
  | { type: 'SET_ACTIVE_FILE'; payload: string }
  | { type: 'UPDATE_FILE_CONTENT'; payload: { id: string; content: string } }
  | { type: 'ADD_MESSAGE'; payload: ChatMessageData }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_AGENT_SESSION'; payload: AgentSession | null }
  | { type: 'SET_DEBUG_SESSION'; payload: DebugSession | null }
  | { type: 'SET_PLAN_SESSION'; payload: PlanSession | null }
  | { type: 'SET_SWARM_SESSION'; payload: SwarmSession | null }
  | { type: 'SET_QUEUE_STATE'; payload: Partial<PromptQueueState> }
  | { type: 'SET_SESSION_STATE'; payload: Partial<SessionState> }
  | { type: 'SET_CONTEXT_BUDGET'; payload: Partial<ContextBudget> }
  | { type: 'SET_DESIGN_SETTINGS'; payload: Partial<DesignSettings> }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'ADD_PROJECT'; payload: Project };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, auth: { ...state.auth, ...action.payload } };

    case 'LOGOUT':
      return {
        ...state,
        auth: { isAuthenticated: false, user: null, token: null, isLoading: false },
      };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'SET_MODE':
      return { ...state, currentMode: action.payload };

    case 'SET_DEVICE_TYPE':
      return { ...state, deviceType: action.payload };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        panels: { ...state.panels, sidebarOpen: !state.panels.sidebarOpen },
      };

    case 'TOGGLE_AI_PANEL':
      return {
        ...state,
        panels: { ...state.panels, aiPanelOpen: !state.panels.aiPanelOpen },
      };

    case 'TOGGLE_TERMINAL':
      return {
        ...state,
        panels: { ...state.panels, terminalOpen: !state.panels.terminalOpen },
      };

    case 'TOGGLE_FILE_EXPLORER':
      return {
        ...state,
        panels: { ...state.panels, fileExplorerOpen: !state.panels.fileExplorerOpen },
      };

    case 'SET_PANELS':
      return { ...state, panels: { ...state.panels, ...action.payload } };

    case 'OPEN_FILE': {
      const exists = state.files.openFiles.find((f) => f.id === action.payload.id);
      if (exists) {
        return { ...state, files: { ...state.files, activeFileId: action.payload.id } };
      }
      return {
        ...state,
        files: {
          ...state.files,
          openFiles: [...state.files.openFiles, action.payload],
          activeFileId: action.payload.id,
        },
      };
    }

    case 'CLOSE_FILE': {
      const filtered = state.files.openFiles.filter((f) => f.id !== action.payload);
      const newActiveId =
        state.files.activeFileId === action.payload
          ? filtered[filtered.length - 1]?.id ?? null
          : state.files.activeFileId;
      return {
        ...state,
        files: { ...state.files, openFiles: filtered, activeFileId: newActiveId },
      };
    }

    case 'SET_ACTIVE_FILE':
      return { ...state, files: { ...state.files, activeFileId: action.payload } };

    case 'UPDATE_FILE_CONTENT':
      return {
        ...state,
        files: {
          ...state.files,
          openFiles: state.files.openFiles.map((f) =>
            f.id === action.payload.id
              ? { ...f, content: action.payload.content, isModified: true }
              : f
          ),
        },
      };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    case 'SET_AGENT_SESSION':
      return { ...state, agent: action.payload };

    case 'SET_DEBUG_SESSION':
      return { ...state, debug: action.payload };

    case 'SET_PLAN_SESSION':
      return { ...state, plan: action.payload };

    case 'SET_SWARM_SESSION':
      return { ...state, swarm: action.payload };

    case 'SET_QUEUE_STATE':
      return { ...state, queue: { ...state.queue, ...action.payload } };

    case 'SET_SESSION_STATE':
      return { ...state, session: { ...state.session, ...action.payload } };

    case 'SET_CONTEXT_BUDGET':
      return { ...state, context: { ...state.context, ...action.payload } };

    case 'SET_DESIGN_SETTINGS':
      return { ...state, design: { ...state.design, ...action.payload } };

    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };

    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };

    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };

    default:
      return state;
  }
}

// ===== Context =====

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    login: (email: string, token: string) => void;
    logout: () => void;
    setMode: (mode: AiMode) => void;
    toggleSidebar: () => void;
    toggleAiPanel: () => void;
    toggleTerminal: () => void;
    toggleFileExplorer: () => void;
    openFile: (file: OpenFile) => void;
    closeFile: (fileId: string) => void;
    setActiveFile: (fileId: string) => void;
    updateFileContent: (fileId: string, content: string) => void;
    addMessage: (message: ChatMessageData) => void;
    clearMessages: () => void;
    completeOnboarding: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    updateDesign: (settings: Partial<DesignSettings>) => void;
  };
}

const AppContext = createContext<AppContextType | null>(null);

// ===== Provider =====

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions = {
    login: useCallback(
      (email: string, token: string) => {
        dispatch({
          type: 'SET_AUTH',
          payload: {
            isAuthenticated: true,
            user: { id: '1', email, name: email.split('@')[0] },
            token,
            isLoading: false,
          },
        });
      },
      []
    ),

    logout: useCallback(() => {
      dispatch({ type: 'LOGOUT' });
    }, []),

    setMode: useCallback((mode: AiMode) => {
      dispatch({ type: 'SET_MODE', payload: mode });
    }, []),

    toggleSidebar: useCallback(() => {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }, []),

    toggleAiPanel: useCallback(() => {
      dispatch({ type: 'TOGGLE_AI_PANEL' });
    }, []),

    toggleTerminal: useCallback(() => {
      dispatch({ type: 'TOGGLE_TERMINAL' });
    }, []),

    toggleFileExplorer: useCallback(() => {
      dispatch({ type: 'TOGGLE_FILE_EXPLORER' });
    }, []),

    openFile: useCallback((file: OpenFile) => {
      dispatch({ type: 'OPEN_FILE', payload: file });
    }, []),

    closeFile: useCallback((fileId: string) => {
      dispatch({ type: 'CLOSE_FILE', payload: fileId });
    }, []),

    setActiveFile: useCallback((fileId: string) => {
      dispatch({ type: 'SET_ACTIVE_FILE', payload: fileId });
    }, []),

    updateFileContent: useCallback((fileId: string, content: string) => {
      dispatch({ type: 'UPDATE_FILE_CONTENT', payload: { id: fileId, content } });
    }, []),

    addMessage: useCallback((message: ChatMessageData) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    }, []),

    clearMessages: useCallback(() => {
      dispatch({ type: 'CLEAR_MESSAGES' });
    }, []),

    completeOnboarding: useCallback(() => {
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    }, []),

    updateSettings: useCallback((settings: Partial<AppSettings>) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []),

    updateDesign: useCallback((settings: Partial<DesignSettings>) => {
      dispatch({ type: 'SET_DESIGN_SETTINGS', payload: settings });
    }, []),
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// ===== Hook =====

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useAuth() {
  const { state, actions } = useApp();
  return { auth: state.auth, login: actions.login, logout: actions.logout };
}

export function useFiles() {
  const { state, actions } = useApp();
  return {
    files: state.files,
    openFile: actions.openFile,
    closeFile: actions.closeFile,
    setActiveFile: actions.setActiveFile,
    updateFileContent: actions.updateFileContent,
  };
}

export function useAiMode() {
  const { state, actions } = useApp();
  return { currentMode: state.currentMode, setMode: actions.setMode };
}
