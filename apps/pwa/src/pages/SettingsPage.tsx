import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Settings,
  Key,
  Palette,
  Monitor,
  Info,
  ChevronLeft,
  Sun,
  Moon,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  Download,
  Upload,
  Shield,
  Bell,
  HardDrive,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useApp } from '../store/AppContext';
import type { AiProvider, ThemeVariant } from '../types';

interface SettingsPageProps {
  onNavigate: (page: string) => void;
}

const PROVIDERS: { value: AiProvider; label: string; description: string }[] = [
  { value: 'claude', label: 'Claude', description: 'Anthropic Claude models' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-4, GPT-3.5, etc.' },
  { value: 'gemini', label: 'Gemini', description: 'Google Gemini models' },
];

type SettingsSection = 'general' | 'api' | 'appearance' | 'storage' | 'about';

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { state, actions } = useApp();
  const { settings, auth } = state;
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'api', label: 'API Keys', icon: <Key size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ];

  const saveApiKey = useCallback(() => {
    actions.updateSettings({ apiKey: apiKeyInput });
  }, [apiKeyInput, actions]);

  const setTheme = useCallback(
    (theme: ThemeVariant) => {
      actions.updateSettings({ theme });
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else if (theme === 'dark') {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
        document.documentElement.classList.toggle('light', !prefersDark);
      }
    },
    [actions]
  );

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => onNavigate('editor')}
            className="p-2 rounded-lg hover:bg-surface-1 text-text-muted hover:text-text-primary transition-colors touch-target"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar pb-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
                activeSection === section.id
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-1'
              )}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>

        {/* General settings */}
        {activeSection === 'general' && (
          <div className="space-y-6">
            {/* User profile */}
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Profile</h3>
              {auth.user ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                    {auth.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{auth.user.name}</p>
                    <p className="text-xs text-text-muted">{auth.user.email}</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<LogOut size={14} />}
                    className="ml-auto"
                    onClick={actions.logout}
                  >
                    Log Out
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-text-muted">Not logged in</p>
              )}
            </div>

            {/* Provider selection */}
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">AI Provider</h3>
              <div className="space-y-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => actions.updateSettings({ provider: p.value })}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      settings.provider === p.value
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-border hover:border-surface-3'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-3 h-3 rounded-full border-2',
                        settings.provider === p.value
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-surface-3'
                      )}
                    />
                    <div>
                      <p className="text-sm text-text-primary font-medium">{p.label}</p>
                      <p className="text-xs text-text-muted">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Bell size={14} />
                    Notifications
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">Get notified when AI tasks complete</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-surface-3 peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* API settings */}
        {activeSection === 'api' && (
          <div className="space-y-6">
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Shield size={14} />
                API Key
              </h3>
              <p className="text-xs text-text-muted mb-3">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    icon={<Key size={16} />}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={saveApiKey}
                    disabled={apiKeyInput === settings.apiKey}
                  >
                    Save Key
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => {
                      setApiKeyInput('');
                      actions.updateSettings({ apiKey: '' });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <p className="text-xs text-amber-300 leading-relaxed">
                API keys are stored in your browser's local storage. Clearing browser data will remove them.
                For production use, consider using environment variables or a secure vault.
              </p>
            </div>
          </div>
        )}

        {/* Appearance settings */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Theme</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'dark' as ThemeVariant, label: 'Dark', icon: <Moon size={16} /> },
                  { value: 'light' as ThemeVariant, label: 'Light', icon: <Sun size={16} /> },
                  { value: 'auto' as ThemeVariant, label: 'System', icon: <Monitor size={16} /> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={clsx(
                      'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                      settings.theme === opt.value
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border-border text-text-muted hover:border-surface-3'
                    )}
                  >
                    {opt.icon}
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Font Size: {settings.fontSize}px
              </h3>
              <input
                type="range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) =>
                  actions.updateSettings({ fontSize: parseInt(e.target.value) })
                }
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>10px</span>
                <span>24px</span>
              </div>
            </div>
          </div>
        )}

        {/* Storage settings */}
        {activeSection === 'storage' && (
          <div className="space-y-6">
            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Data Management</h3>
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Download size={16} />}
                  fullWidth
                  className="justify-start"
                >
                  Export Settings
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<Upload size={16} />}
                  fullWidth
                  className="justify-start"
                >
                  Import Settings
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  icon={<Trash2 size={16} />}
                  fullWidth
                  className="justify-start"
                >
                  Clear All Data
                </Button>
              </div>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Cache</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Service Worker Cache</span>
                <Badge variant="default">Active</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then((names) =>
                      Promise.all(names.map((name) => caches.delete(name)))
                    );
                  }
                }}
              >
                Clear Cache
              </Button>
            </div>
          </div>
        )}

        {/* About */}
        {activeSection === 'about' && (
          <div className="space-y-6">
            <div className="bg-surface-1 rounded-xl p-6 border border-border text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                <Palette size={28} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Claude Context</h2>
              <p className="text-sm text-text-muted mt-1">Version 1.0.0</p>
              <p className="text-xs text-text-muted mt-3 max-w-xs mx-auto leading-relaxed">
                AI-powered local development environment. Built with React, TypeScript, Vite, and Tailwind CSS.
              </p>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Technology Stack</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                <div className="p-2 bg-surface-0 rounded-lg">React 18</div>
                <div className="p-2 bg-surface-0 rounded-lg">TypeScript 5</div>
                <div className="p-2 bg-surface-0 rounded-lg">Vite 5</div>
                <div className="p-2 bg-surface-0 rounded-lg">Tailwind CSS 3</div>
                <div className="p-2 bg-surface-0 rounded-lg">Monaco Editor</div>
                <div className="p-2 bg-surface-0 rounded-lg">Lucide Icons</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Import Badge in scope
function Badge({ children, variant }: { children: React.ReactNode; variant: string }) {
  return (
    <span
      className={clsx(
        'px-2 py-0.5 rounded-full text-[10px] font-medium',
        variant === 'default' && 'bg-surface-2 text-text-secondary'
      )}
    >
      {children}
    </span>
  );
}
