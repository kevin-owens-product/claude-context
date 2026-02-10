import React from 'react';
import {
  Wifi,
  WifiOff,
  GitBranch,
  Circle,
  Settings,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AI_MODE_COLORS, AI_MODE_LABELS } from '../../types';

interface StatusBarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function StatusBar({ onNavigate }: StatusBarProps) {
  const { state } = useApp();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeFile = state.files.openFiles.find(
    (f) => f.id === state.files.activeFileId
  );

  return (
    <div className="flex items-center justify-between h-8 px-3 bg-surface-1 border-b border-border text-xs text-text-muted select-none">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Current mode indicator */}
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            fill={AI_MODE_COLORS[state.currentMode]}
            color={AI_MODE_COLORS[state.currentMode]}
          />
          <span className="font-medium" style={{ color: AI_MODE_COLORS[state.currentMode] }}>
            {AI_MODE_LABELS[state.currentMode]}
          </span>
        </div>

        {/* Git branch */}
        <div className="flex items-center gap-1 text-text-muted">
          <GitBranch size={12} />
          <span>main</span>
        </div>

        {/* Provider */}
        <span className="text-text-muted">
          {state.settings.provider === 'claude'
            ? 'Claude'
            : state.settings.provider === 'openai'
            ? 'OpenAI'
            : 'Gemini'}
        </span>
      </div>

      {/* Center - file path */}
      <div className="hidden md:flex items-center gap-1">
        {activeFile && (
          <span className="text-text-secondary">
            {activeFile.path}
            {activeFile.isModified && (
              <span className="text-amber-400 ml-1">*</span>
            )}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Token count */}
        <span className="text-text-muted">
          {state.context.usedTokens.toLocaleString()} / {(state.context.maxTokens / 1000).toFixed(0)}K tokens
        </span>

        {/* Online status */}
        <div className="flex items-center gap-1">
          {isOnline ? (
            <Wifi size={12} className="text-emerald-400" />
          ) : (
            <WifiOff size={12} className="text-red-400" />
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className="p-0.5 rounded hover:bg-surface-2 transition-colors"
          aria-label="Settings"
        >
          <Settings size={12} />
        </button>
      </div>
    </div>
  );
}
