import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import { Sparkles, Mail, Lock, Key, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useApp } from '../../store/AppContext';
import type { AiProvider } from '../../types';

type AuthTab = 'login' | 'signup';

const PROVIDERS: { value: AiProvider; label: string; color: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)', color: '#6366F1' },
  { value: 'openai', label: 'OpenAI', color: '#10B981' },
  { value: 'gemini', label: 'Gemini (Google)', color: '#F59E0B' },
];

export function AuthScreen() {
  const { actions } = useApp();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      if (!password.trim()) {
        setError('Password is required');
        return;
      }

      setLoading(true);

      // Simulate auth
      setTimeout(() => {
        actions.login(email, 'mock-token-' + Date.now());
        actions.updateSettings({ provider, apiKey: apiKey || 'demo-key' });
        setLoading(false);
      }, 1000);
    },
    [email, password, provider, apiKey, actions]
  );

  const handleGuest = useCallback(() => {
    actions.login('guest@claude-context.dev', 'guest-token');
    actions.updateSettings({ provider: 'claude', apiKey: 'demo-key' });
  }, [actions]);

  return (
    <div className="flex items-center justify-center min-h-full bg-surface-0 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Claude Context</h1>
          <p className="text-sm text-text-muted mt-1">AI-powered local development</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-1 rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-all',
              tab === 'login'
                ? 'bg-surface-0 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Log In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={clsx(
              'flex-1 py-2 rounded-md text-sm font-medium transition-all',
              tab === 'signup'
                ? 'bg-surface-0 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
            error={error && !email.trim() ? 'Email is required' : undefined}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              error={error && !password.trim() ? 'Password is required' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Provider selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  className={clsx(
                    'p-2.5 rounded-lg border text-center transition-all text-xs',
                    provider === p.value
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 font-medium'
                      : 'border-border bg-surface-1 text-text-muted hover:border-surface-3'
                  )}
                >
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="relative">
            <Input
              label="API Key (optional)"
              type={showApiKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              icon={<Key size={16} />}
              hint="Leave empty to use demo mode"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-9 text-text-muted hover:text-text-primary transition-colors"
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            icon={tab === 'login' ? <ArrowRight size={16} /> : <UserPlus size={16} />}
            iconPosition="right"
          >
            {tab === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Guest mode */}
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={handleGuest}
          className="border border-border"
        >
          Continue as Guest
        </Button>

        <p className="text-[11px] text-text-muted text-center mt-6 leading-relaxed">
          By continuing, you agree to the Terms of Service and Privacy Policy.
          Your API keys are stored locally and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
