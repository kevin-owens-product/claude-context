import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Users,
  Square,
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Pause,
} from 'lucide-react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { SwarmSession, SwarmStrategy, SwarmWorker, SwarmWorkerStatus } from '../../types';
import { AiMode } from '../../types';

const STRATEGIES: { value: SwarmStrategy; label: string; description: string }[] = [
  { value: 'parallel', label: 'Parallel', description: 'All workers execute simultaneously' },
  { value: 'pipeline', label: 'Pipeline', description: 'Workers pass output to the next' },
  { value: 'debate', label: 'Debate', description: 'Workers debate and reach consensus' },
  { value: 'review', label: 'Review', description: 'Workers review each others work' },
];

const WORKER_STATUS_STYLES: Record<SwarmWorkerStatus, { icon: React.ReactNode; color: string }> = {
  idle: { icon: <Clock size={12} />, color: 'text-text-muted' },
  working: { icon: <Loader2 size={12} className="animate-spin" />, color: 'text-amber-400' },
  completed: { icon: <CheckCircle2 size={12} />, color: 'text-emerald-400' },
  failed: { icon: <XCircle size={12} />, color: 'text-red-400' },
  waiting: { icon: <Pause size={12} />, color: 'text-blue-400' },
};

function WorkerCard({ worker }: { worker: SwarmWorker }) {
  const status = WORKER_STATUS_STYLES[worker.status];

  return (
    <div className="border border-border rounded-lg p-3 bg-surface-0/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={status.color}>{status.icon}</span>
          <span className="text-sm font-medium text-text-primary">{worker.name}</span>
        </div>
        <Badge size="sm" variant={worker.status === 'completed' ? 'success' : worker.status === 'working' ? 'warning' : 'default'}>
          {worker.status}
        </Badge>
      </div>
      <p className="text-xs text-text-muted mb-2">{worker.role}</p>

      {/* Progress bar */}
      <div className="h-1 bg-surface-2 rounded-full overflow-hidden mb-1.5">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            worker.status === 'completed' ? 'bg-emerald-500' :
            worker.status === 'working' ? 'bg-amber-500' :
            worker.status === 'failed' ? 'bg-red-500' : 'bg-surface-3'
          )}
          style={{ width: `${worker.progress}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-text-muted">
        <span>{worker.progress}%</span>
        <span>{worker.tokensUsed} tokens</span>
      </div>

      {worker.currentTask && (
        <p className="text-xs text-text-secondary mt-2 bg-surface-1 rounded p-1.5">
          {worker.currentTask}
        </p>
      )}
    </div>
  );
}

export function SwarmMode() {
  const { state, dispatch, actions: appActions } = useApp();
  const [taskInput, setTaskInput] = useState('');
  const [strategy, setStrategy] = useState<SwarmStrategy>('parallel');
  const session = state.swarm;

  const startSwarm = useCallback(() => {
    if (!taskInput.trim()) return;

    const workers: SwarmWorker[] = [
      {
        id: '1',
        name: 'Architect',
        role: 'Designs system architecture and interfaces',
        status: 'working',
        currentTask: 'Analyzing requirements and designing structure',
        progress: 25,
        tokensUsed: 320,
      },
      {
        id: '2',
        name: 'Implementer',
        role: 'Writes the core implementation code',
        status: strategy === 'pipeline' ? 'waiting' : 'working',
        currentTask: strategy === 'pipeline' ? 'Waiting for Architect' : 'Writing implementation',
        progress: strategy === 'pipeline' ? 0 : 15,
        tokensUsed: strategy === 'pipeline' ? 0 : 180,
      },
      {
        id: '3',
        name: 'Tester',
        role: 'Writes tests and validates correctness',
        status: strategy === 'pipeline' ? 'waiting' : 'working',
        currentTask: strategy === 'pipeline' ? 'Waiting for Implementer' : 'Setting up test framework',
        progress: strategy === 'pipeline' ? 0 : 10,
        tokensUsed: strategy === 'pipeline' ? 0 : 100,
      },
      {
        id: '4',
        name: 'Reviewer',
        role: 'Reviews code quality and best practices',
        status: 'idle',
        progress: 0,
        tokensUsed: 0,
      },
    ];

    const newSession: SwarmSession = {
      id: crypto.randomUUID(),
      strategy,
      workers,
      task: taskInput,
      status: 'running',
    };

    dispatch({ type: 'SET_SWARM_SESSION', payload: newSession });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Swarm (${strategy}): ${taskInput}`,
      timestamp: Date.now(),
      mode: AiMode.SWARM,
    });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Swarm initialized with **${strategy}** strategy and **4 workers**. Task distributed and processing has begun.`,
      timestamp: Date.now(),
      mode: AiMode.SWARM,
      tokens: 200,
    });

    // Simulate progress
    setTimeout(() => {
      dispatch({
        type: 'SET_SWARM_SESSION',
        payload: {
          ...newSession,
          workers: workers.map((w) => ({
            ...w,
            status: w.id === '4' ? 'idle' : 'completed',
            progress: w.id === '4' ? 0 : 100,
            tokensUsed: w.id === '4' ? 0 : Math.floor(Math.random() * 2000) + 500,
            currentTask: w.id === '4' ? undefined : 'Done',
            output: w.id === '4' ? undefined : `Completed: ${w.role}`,
          } as SwarmWorker)),
          status: 'merging',
        },
      });
    }, 3000);

    setTaskInput('');
  }, [taskInput, strategy, dispatch, appActions]);

  return (
    <div className="flex flex-col h-full">
      {/* Task input */}
      <div className="p-3 border-b border-border space-y-3">
        <TextArea
          placeholder="Describe the task for the swarm..."
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          rows={2}
        />

        {/* Strategy selector */}
        <div>
          <label className="text-xs font-medium text-text-muted mb-1.5 block">Strategy</label>
          <div className="grid grid-cols-2 gap-1.5">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={clsx(
                  'p-2 rounded-lg border text-left transition-all',
                  strategy === s.value
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-border bg-surface-0 text-text-muted hover:border-surface-3'
                )}
              >
                <span className="text-xs font-medium block">{s.label}</span>
                <span className="text-[10px] text-text-muted">{s.description}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Users size={14} />}
          onClick={startSwarm}
          disabled={!taskInput.trim() || session?.status === 'running'}
          fullWidth
          className="!bg-amber-600 hover:!bg-amber-500"
        >
          Launch Swarm
        </Button>
      </div>

      {/* Workers grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {session && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="warning" dot>
                  {session.status}
                </Badge>
                <span className="text-xs text-text-muted">
                  {session.workers.filter((w) => w.status === 'completed').length}/{session.workers.length} completed
                </span>
              </div>
              {session.status === 'running' && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Square size={12} />}
                  onClick={() =>
                    dispatch({
                      type: 'SET_SWARM_SESSION',
                      payload: { ...session, status: 'failed' },
                    })
                  }
                >
                  Stop
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {session.workers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>

            {session.aggregatedOutput && (
              <div className="mt-3 p-3 bg-surface-1 rounded-lg border border-emerald-500/30">
                <h4 className="text-xs font-semibold text-emerald-400 mb-1">Merged Output</h4>
                <p className="text-sm text-text-primary">{session.aggregatedOutput}</p>
              </div>
            )}
          </>
        )}

        {!session && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm">
            <Users size={32} className="mb-3 opacity-30" />
            <p>Launch a swarm of AI workers</p>
            <p className="text-xs mt-1">Multiple agents collaborate to complete complex tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
