/**
 * AISpotlight - Quick access to Living Software intelligence
 *
 * Triggered by ⌘+/ (or Ctrl+/) to quickly:
 * - Get system status at a glance
 * - Ask Claude a quick question
 * - See critical alerts
 * - Navigate to any view
 *
 * Like macOS Spotlight but for your product intelligence.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  Search,
  Target,
  Activity,
  Box,
  FlaskConical,
  LayoutDashboard,
  Users,
  MessageSquare,
  Rocket,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../../contexts';
import { useIntents, useSignals, useCapabilities, useExperiments } from '../../hooks';
import type { Intent } from '../../api/intents';
import type { Signal } from '../../api/signals';
import type { Experiment } from '../../api/experiments';

interface SpotlightAction {
  id: string;
  type: 'navigation' | 'insight' | 'command';
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    color: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  };
  action: () => void;
}

interface AISpotlightProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISpotlight({ isOpen, onClose }: AISpotlightProps) {
  const { setCurrentView, openAssistant } = useWorkspace();
  const { intents } = useIntents();
  const { signals } = useSignals();
  const { capabilities } = useCapabilities();
  const { experiments } = useExperiments();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Compute system health for quick status
  const systemStatus = useMemo(() => {
    const criticalSignals = signals.filter((s: Signal) => s.health === 'CRITICAL').length;
    const warningSignals = signals.filter((s: Signal) => s.health === 'WARNING').length;
    const atRiskIntents = intents.filter((i: Intent) => i.fulfillmentScore < 0.4 && i.status === 'ACTIVE').length;
    const runningExperiments = experiments.filter((e: Experiment) => e.status === 'RUNNING').length;
    const healthyPercent = signals.length > 0
      ? Math.round((signals.filter((s: Signal) => ['EXCELLENT', 'GOOD'].includes(s.health)).length / signals.length) * 100)
      : 100;

    return {
      criticalSignals,
      warningSignals,
      atRiskIntents,
      runningExperiments,
      healthyPercent,
      status: criticalSignals > 0 ? 'critical' : warningSignals > 0 ? 'warning' : 'healthy',
    };
  }, [signals, intents, experiments]);

  // Generate spotlight actions
  const actions = useMemo((): SpotlightAction[] => {
    const items: SpotlightAction[] = [];

    // Quick status (always first)
    items.push({
      id: 'status',
      type: 'insight',
      icon: systemStatus.status === 'healthy'
        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
        : systemStatus.status === 'warning'
        ? <AlertCircle className="w-5 h-5 text-yellow-400" />
        : <AlertCircle className="w-5 h-5 text-red-400" />,
      title: `System Health: ${systemStatus.healthyPercent}%`,
      subtitle: systemStatus.status === 'healthy'
        ? 'All systems operational'
        : `${systemStatus.criticalSignals + systemStatus.warningSignals} issues need attention`,
      badge: systemStatus.status !== 'healthy' ? {
        text: systemStatus.criticalSignals > 0 ? 'Critical' : 'Warning',
        color: systemStatus.criticalSignals > 0 ? 'red' : 'yellow',
      } : undefined,
      action: () => {
        setCurrentView('signals');
        onClose();
      },
    });

    // Critical alerts
    if (systemStatus.criticalSignals > 0) {
      items.push({
        id: 'critical-alerts',
        type: 'insight',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        title: `${systemStatus.criticalSignals} Critical Alert${systemStatus.criticalSignals > 1 ? 's' : ''}`,
        subtitle: 'Immediate attention required',
        badge: { text: 'Urgent', color: 'red' },
        action: () => {
          setCurrentView('signals');
          onClose();
        },
      });
    }

    // At-risk intents
    if (systemStatus.atRiskIntents > 0) {
      items.push({
        id: 'at-risk-intents',
        type: 'insight',
        icon: <Target className="w-5 h-5 text-yellow-400" />,
        title: `${systemStatus.atRiskIntents} Intent${systemStatus.atRiskIntents > 1 ? 's' : ''} at Risk`,
        subtitle: 'Strategic goals falling behind',
        badge: { text: 'Review', color: 'yellow' },
        action: () => {
          setCurrentView('intents');
          onClose();
        },
      });
    }

    // Running experiments
    if (systemStatus.runningExperiments > 0) {
      const significantExps = experiments.filter((e: Experiment) =>
        e.status === 'RUNNING' && e.statisticalSignificance && e.statisticalSignificance > 0.95
      ).length;
      items.push({
        id: 'experiments',
        type: 'insight',
        icon: <FlaskConical className="w-5 h-5 text-purple-400" />,
        title: `${systemStatus.runningExperiments} Experiment${systemStatus.runningExperiments > 1 ? 's' : ''} Running`,
        subtitle: significantExps > 0 ? `${significantExps} reached significance!` : 'Collecting data...',
        badge: significantExps > 0 ? { text: 'Ready', color: 'green' } : undefined,
        action: () => {
          setCurrentView('experiments');
          onClose();
        },
      });
    }

    // Ask Claude
    items.push({
      id: 'ask-claude',
      type: 'command',
      icon: <Sparkles className="w-5 h-5 text-claude-primary-400" />,
      title: 'Ask Claude',
      subtitle: 'Get AI-powered insights and recommendations',
      action: () => {
        openAssistant('chat');
        onClose();
      },
    });

    // Navigation actions
    const navActions = [
      { id: 'nav-dashboard', label: 'Command Center', view: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'nav-customer-intelligence', label: 'Customer Intelligence', view: 'customer-intelligence', icon: <Users className="w-5 h-5 text-pink-400" /> },
      { id: 'nav-intents', label: 'Intents (WHY)', view: 'intents', icon: <Target className="w-5 h-5 text-purple-400" /> },
      { id: 'nav-capabilities', label: 'Capabilities (WHAT)', view: 'capabilities', icon: <Box className="w-5 h-5 text-blue-400" /> },
      { id: 'nav-signals', label: 'Signals (HOW)', view: 'signals', icon: <Activity className="w-5 h-5 text-green-400" /> },
      { id: 'nav-experiments', label: 'Experiments (LEARN)', view: 'experiments', icon: <FlaskConical className="w-5 h-5 text-cyan-400" /> },
      { id: 'nav-customers', label: 'Customers', view: 'customers', icon: <Users className="w-5 h-5" /> },
      { id: 'nav-feedback', label: 'Feedback', view: 'feedback', icon: <MessageSquare className="w-5 h-5" /> },
      { id: 'nav-releases', label: 'Releases', view: 'releases', icon: <Rocket className="w-5 h-5" /> },
    ];

    navActions.forEach(nav => {
      items.push({
        id: nav.id,
        type: 'navigation',
        icon: nav.icon,
        title: nav.label,
        subtitle: `Go to ${nav.label}`,
        action: () => {
          setCurrentView(nav.view as any);
          onClose();
        },
      });
    });

    return items;
  }, [systemStatus, experiments, setCurrentView, openAssistant, onClose]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions.slice(0, 8);
    const q = query.toLowerCase();
    return actions.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.subtitle?.toLowerCase().includes(q) ||
      (a.type === 'navigation' && a.id.includes(q))
    );
  }, [actions, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const badgeColors = {
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Spotlight */}
      <div
        className="relative w-full max-w-xl bg-claude-neutral-900 rounded-2xl shadow-2xl border border-claude-neutral-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-claude-neutral-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="What do you need?"
            className="flex-1 bg-transparent text-lg text-claude-neutral-100 placeholder-claude-neutral-500 focus:outline-none"
          />
          <div className="flex items-center gap-1 text-xs text-claude-neutral-500">
            <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-claude-neutral-800 rounded">/</kbd>
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-claude-neutral-800/50 text-xs">
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              systemStatus.status === 'healthy' && 'bg-green-500',
              systemStatus.status === 'warning' && 'bg-yellow-500',
              systemStatus.status === 'critical' && 'bg-red-500 animate-pulse',
            )} />
            <span className="text-claude-neutral-400">
              {systemStatus.healthyPercent}% healthy
            </span>
          </div>
          <span className="text-claude-neutral-600">•</span>
          <span className="text-claude-neutral-400">
            {intents.length} intents
          </span>
          <span className="text-claude-neutral-600">•</span>
          <span className="text-claude-neutral-400">
            {signals.length} signals
          </span>
          <span className="text-claude-neutral-600">•</span>
          <span className="text-claude-neutral-400">
            {capabilities.length} capabilities
          </span>
        </div>

        {/* Actions List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {filteredActions.map((action, idx) => (
            <button
              key={action.id}
              onClick={action.action}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                idx === selectedIndex
                  ? 'bg-claude-primary-500/20'
                  : 'hover:bg-claude-neutral-800/50'
              )}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-claude-neutral-800 flex items-center justify-center">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-claude-neutral-100">
                    {action.title}
                  </span>
                  {action.badge && (
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', badgeColors[action.badge.color])}>
                      {action.badge.text}
                    </span>
                  )}
                </div>
                {action.subtitle && (
                  <p className="text-xs text-claude-neutral-500 truncate">
                    {action.subtitle}
                  </p>
                )}
              </div>
              <ArrowRight className={clsx(
                'w-4 h-4 transition-opacity',
                idx === selectedIndex ? 'text-claude-primary-400 opacity-100' : 'text-claude-neutral-600 opacity-0'
              )} />
            </button>
          ))}

          {filteredActions.length === 0 && (
            <div className="p-8 text-center text-claude-neutral-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-claude-neutral-800 bg-claude-neutral-900/80 text-[10px] text-claude-neutral-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-claude-neutral-800 rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-claude-neutral-800 rounded">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-claude-neutral-800 rounded">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-claude-primary-400" />
            Living Software Intelligence
          </span>
        </div>
      </div>
    </div>
  );
}

export default AISpotlight;
