import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  ListOrdered,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  SkipForward,
} from 'lucide-react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { QueuedPrompt, QueuePriority, QueuedPromptStatus } from '../../types';

const PRIORITY_STYLES: Record<QueuePriority, { label: string; variant: 'danger' | 'warning' | 'default' | 'info' }> = {
  critical: { label: 'Critical', variant: 'danger' },
  high: { label: 'High', variant: 'warning' },
  normal: { label: 'Normal', variant: 'default' },
  low: { label: 'Low', variant: 'info' },
};

const STATUS_ICONS: Record<QueuedPromptStatus, React.ReactNode> = {
  queued: <Clock size={12} className="text-text-muted" />,
  running: <Loader2 size={12} className="text-indigo-400 animate-spin" />,
  completed: <CheckCircle2 size={12} className="text-emerald-400" />,
  failed: <XCircle size={12} className="text-red-400" />,
  cancelled: <SkipForward size={12} className="text-text-muted" />,
};

export function QueueMode() {
  const { state, dispatch } = useApp();
  const [promptInput, setPromptInput] = useState('');
  const [priority, setPriority] = useState<QueuePriority>('normal');
  const queue = state.queue;

  const addPrompt = useCallback(() => {
    if (!promptInput.trim()) return;

    const newPrompt: QueuedPrompt = {
      id: crypto.randomUUID(),
      prompt: promptInput,
      priority,
      status: 'queued',
      addedAt: Date.now(),
      estimatedTokens: Math.floor(promptInput.length * 2.5),
    };

    dispatch({
      type: 'SET_QUEUE_STATE',
      payload: {
        prompts: [...queue.prompts, newPrompt].sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }),
      },
    });

    setPromptInput('');
  }, [promptInput, priority, queue.prompts, dispatch]);

  const removePrompt = useCallback(
    (id: string) => {
      dispatch({
        type: 'SET_QUEUE_STATE',
        payload: {
          prompts: queue.prompts.filter((p) => p.id !== id),
        },
      });
    },
    [queue.prompts, dispatch]
  );

  const startQueue = useCallback(() => {
    if (queue.prompts.length === 0) return;

    const firstQueued = queue.prompts.find((p) => p.status === 'queued');
    if (!firstQueued) return;

    dispatch({
      type: 'SET_QUEUE_STATE',
      payload: {
        isRunning: true,
        prompts: queue.prompts.map((p) =>
          p.id === firstQueued.id
            ? { ...p, status: 'running' as QueuedPromptStatus, startedAt: Date.now() }
            : p
        ),
      },
    });

    // Simulate processing
    setTimeout(() => {
      dispatch({
        type: 'SET_QUEUE_STATE',
        payload: {
          prompts: queue.prompts.map((p) =>
            p.id === firstQueued.id
              ? {
                  ...p,
                  status: 'completed' as QueuedPromptStatus,
                  completedAt: Date.now(),
                  result: `Processed: ${p.prompt.slice(0, 50)}...`,
                }
              : p
          ),
          totalCompleted: queue.totalCompleted + 1,
          totalTokensUsed: queue.totalTokensUsed + firstQueued.estimatedTokens,
        },
      });
    }, 2000);
  }, [queue, dispatch]);

  const pauseQueue = useCallback(() => {
    dispatch({
      type: 'SET_QUEUE_STATE',
      payload: { isRunning: false },
    });
  }, [dispatch]);

  const clearCompleted = useCallback(() => {
    dispatch({
      type: 'SET_QUEUE_STATE',
      payload: {
        prompts: queue.prompts.filter(
          (p) => p.status !== 'completed' && p.status !== 'failed' && p.status !== 'cancelled'
        ),
      },
    });
  }, [queue.prompts, dispatch]);

  const queuedCount = queue.prompts.filter((p) => p.status === 'queued').length;
  const runningCount = queue.prompts.filter((p) => p.status === 'running').length;
  const completedCount = queue.prompts.filter((p) => p.status === 'completed').length;

  return (
    <div className="flex flex-col h-full">
      {/* Add prompt */}
      <div className="p-3 border-b border-border space-y-2">
        <TextArea
          placeholder="Add a prompt to the queue..."
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          rows={2}
        />

        {/* Priority selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Priority:</span>
          {(['critical', 'high', 'normal', 'low'] as QueuePriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={clsx(
                'px-2 py-1 rounded text-xs capitalize transition-colors',
                priority === p
                  ? 'bg-surface-2 text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={addPrompt}
            disabled={!promptInput.trim()}
            fullWidth
            className="!bg-purple-600 hover:!bg-purple-500"
          >
            Add to Queue
          </Button>
        </div>
      </div>

      {/* Queue controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{queuedCount} queued</span>
          <span>{runningCount} running</span>
          <span>{completedCount} done</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!queue.isRunning ? (
            <Button
              variant="success"
              size="sm"
              icon={<Play size={12} />}
              onClick={startQueue}
              disabled={queuedCount === 0}
            >
              Run
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={<Pause size={12} />}
              onClick={pauseQueue}
            >
              Pause
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            onClick={clearCompleted}
            disabled={completedCount === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto">
        {queue.prompts.length > 0 ? (
          <div className="divide-y divide-border">
            {queue.prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={clsx(
                  'flex items-start gap-2 px-3 py-2.5 hover:bg-surface-1/50 transition-colors',
                  prompt.status === 'running' && 'bg-indigo-500/5'
                )}
              >
                <span className="mt-1 flex-shrink-0">
                  {STATUS_ICONS[prompt.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm truncate',
                    prompt.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'
                  )}>
                    {prompt.prompt}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      size="sm"
                      variant={PRIORITY_STYLES[prompt.priority].variant}
                    >
                      {PRIORITY_STYLES[prompt.priority].label}
                    </Badge>
                    <span className="text-[10px] text-text-muted">
                      ~{prompt.estimatedTokens} tokens
                    </span>
                  </div>
                  {prompt.result && (
                    <p className="text-xs text-text-secondary mt-1">{prompt.result}</p>
                  )}
                </div>
                {prompt.status === 'queued' && (
                  <button
                    onClick={() => removePrompt(prompt.id)}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
                    aria-label="Remove prompt"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm">
            <ListOrdered size={32} className="mb-3 opacity-30" />
            <p>Queue is empty</p>
            <p className="text-xs mt-1">Add prompts to process them in batch</p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {(queue.totalCompleted > 0 || queue.totalTokensUsed > 0) && (
        <div className="px-3 py-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>Total: {queue.totalCompleted} completed, {queue.totalFailed} failed</span>
          <span>{queue.totalTokensUsed.toLocaleString()} tokens used</span>
        </div>
      )}
    </div>
  );
}
