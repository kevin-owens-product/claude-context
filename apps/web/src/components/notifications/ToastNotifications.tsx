/**
 * ToastNotifications - Proactive alert system
 *
 * Shows toast notifications for:
 * - Critical signal alerts
 * - Experiment milestones
 * - Intent status changes
 * - System health warnings
 *
 * Automatically surfaces important events without requiring user to check.
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  X,
  AlertCircle,
  Target,
  FlaskConical,
  ArrowRight,
  Bell,
  BellOff,
} from 'lucide-react';
import { useWorkspace } from '../../contexts';
import { useSignals, useExperiments, useIntents } from '../../hooks';
import type { Signal } from '../../api/signals';
import type { Experiment } from '../../api/experiments';
import type { Intent } from '../../api/intents';

interface Toast {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
  read: boolean;
}

export function ToastNotifications() {
  const { setCurrentView } = useWorkspace();
  const { signals } = useSignals();
  const { experiments } = useExperiments();
  const { intents } = useIntents();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [muted, setMuted] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Generate toasts based on data changes
  useEffect(() => {
    if (muted) return;
    const newToasts: Toast[] = [];
    const now = new Date();

    // Check for critical signals
    signals.forEach((s: Signal) => {
      const toastId = `signal-critical-${s.id}`;
      if (s.health === 'CRITICAL' && !seenIds.has(toastId)) {
        newToasts.push({
          id: toastId,
          type: 'critical',
          title: 'Critical Signal Alert',
          message: `${s.name} has entered critical state${s.currentValue !== undefined ? ` (${s.currentValue}${s.unit || ''})` : ''}`,
          icon: <AlertCircle className="w-5 h-5" />,
          action: {
            label: 'View',
            onClick: () => setCurrentView('signals'),
          },
          timestamp: now,
          read: false,
        });
      }
    });

    // Check for experiments reaching significance
    experiments.forEach((e: Experiment) => {
      const toastId = `experiment-significant-${e.id}`;
      if (
        e.status === 'RUNNING' &&
        e.statisticalSignificance &&
        e.statisticalSignificance > 0.95 &&
        !seenIds.has(toastId)
      ) {
        newToasts.push({
          id: toastId,
          type: 'success',
          title: 'Experiment Ready!',
          message: `"${e.name}" has reached ${Math.round(e.statisticalSignificance * 100)}% statistical significance`,
          icon: <FlaskConical className="w-5 h-5" />,
          action: {
            label: 'View Results',
            onClick: () => setCurrentView('experiments'),
          },
          timestamp: now,
          read: false,
        });
      }
    });

    // Check for at-risk intents
    intents.forEach((i: Intent) => {
      const toastId = `intent-risk-${i.id}`;
      if (
        i.fulfillmentScore < 0.3 &&
        i.status === 'ACTIVE' &&
        !seenIds.has(toastId)
      ) {
        newToasts.push({
          id: toastId,
          type: 'warning',
          title: 'Intent At Risk',
          message: `"${i.title.slice(0, 40)}..." fulfillment dropped to ${Math.round(i.fulfillmentScore * 100)}%`,
          icon: <Target className="w-5 h-5" />,
          action: {
            label: 'View',
            onClick: () => setCurrentView('intents'),
          },
          timestamp: now,
          read: false,
        });
      }
    });

    // Add new toasts and mark them as seen
    if (newToasts.length > 0) {
      setToasts(prev => [...newToasts, ...prev].slice(0, 5));
      setSeenIds(prev => {
        const next = new Set(prev);
        newToasts.forEach(t => next.add(t.id));
        return next;
      });
    }
  }, [signals, experiments, intents, muted, seenIds, setCurrentView]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  if (toasts.length === 0 && !muted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {/* Mute toggle */}
      {toasts.length > 0 && (
        <div className="flex justify-end gap-2 mb-1">
          <button
            onClick={dismissAll}
            className="px-2 py-1 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 bg-claude-neutral-800/90 hover:bg-claude-neutral-700 rounded transition-colors backdrop-blur-sm"
          >
            Clear all
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className={clsx(
              'p-1.5 rounded transition-colors backdrop-blur-sm',
              muted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-claude-neutral-800/90 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700'
            )}
            title={muted ? 'Unmute notifications' : 'Mute notifications'}
          >
            {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Toast list */}
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-start gap-3 p-4 rounded-xl shadow-lg backdrop-blur-sm border animate-in slide-in-from-right duration-300',
            toast.type === 'critical' && 'bg-red-950/90 border-red-500/30',
            toast.type === 'warning' && 'bg-yellow-950/90 border-yellow-500/30',
            toast.type === 'success' && 'bg-green-950/90 border-green-500/30',
            toast.type === 'info' && 'bg-blue-950/90 border-blue-500/30',
          )}
        >
          {/* Icon */}
          <div className={clsx(
            'flex-shrink-0',
            toast.type === 'critical' && 'text-red-400',
            toast.type === 'warning' && 'text-yellow-400',
            toast.type === 'success' && 'text-green-400',
            toast.type === 'info' && 'text-blue-400',
          )}>
            {toast.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={clsx(
              'text-sm font-semibold',
              toast.type === 'critical' && 'text-red-200',
              toast.type === 'warning' && 'text-yellow-200',
              toast.type === 'success' && 'text-green-200',
              toast.type === 'info' && 'text-blue-200',
            )}>
              {toast.title}
            </h4>
            <p className="text-xs text-claude-neutral-400 mt-0.5 line-clamp-2">
              {toast.message}
            </p>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className={clsx(
                  'flex items-center gap-1 mt-2 text-xs font-medium transition-colors',
                  toast.type === 'critical' && 'text-red-300 hover:text-red-200',
                  toast.type === 'warning' && 'text-yellow-300 hover:text-yellow-200',
                  toast.type === 'success' && 'text-green-300 hover:text-green-200',
                  toast.type === 'info' && 'text-blue-300 hover:text-blue-200',
                )}
              >
                {toast.action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-shrink-0 p-1 text-claude-neutral-500 hover:text-claude-neutral-300 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Muted indicator */}
      {muted && toasts.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-claude-neutral-800/90 rounded-lg backdrop-blur-sm">
          <BellOff className="w-4 h-4 text-claude-neutral-500" />
          <span className="text-xs text-claude-neutral-500">Notifications muted</span>
          <button
            onClick={() => setMuted(false)}
            className="ml-auto text-xs text-claude-primary-400 hover:text-claude-primary-300"
          >
            Unmute
          </button>
        </div>
      )}
    </div>
  );
}

export default ToastNotifications;
