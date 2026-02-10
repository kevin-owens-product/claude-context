import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Terminal,
  Search,
  MessageSquare,
  Loader2,
  ThumbsUp,
  Bot,
} from 'lucide-react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { AgentAction, AgentSession, AgentActionType } from '../../types';
import { AiMode } from '../../types';

const ACTION_ICONS: Record<AgentActionType, React.ReactNode> = {
  READ_FILE: <FileText size={14} />,
  WRITE_FILE: <FileText size={14} />,
  EXECUTE_COMMAND: <Terminal size={14} />,
  SEARCH: <Search size={14} />,
  ASK_USER: <MessageSquare size={14} />,
  COMPLETE: <CheckCircle2 size={14} />,
};

const STATUS_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock size={14} />, color: 'text-text-muted' },
  running: { icon: <Loader2 size={14} className="animate-spin" />, color: 'text-indigo-400' },
  completed: { icon: <CheckCircle2 size={14} />, color: 'text-emerald-400' },
  failed: { icon: <XCircle size={14} />, color: 'text-red-400' },
  needs_approval: { icon: <ThumbsUp size={14} />, color: 'text-amber-400' },
};

function ActionItem({ action }: { action: AgentAction }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_STYLES[action.status];

  return (
    <div
      className="border border-border rounded-lg overflow-hidden cursor-pointer hover:border-surface-3 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={status.color}>{status.icon}</span>
        <span className="text-text-muted">{ACTION_ICONS[action.type]}</span>
        <span className="text-sm text-text-primary truncate flex-1">
          {action.description}
        </span>
        <Badge
          size="sm"
          variant={
            action.status === 'completed' ? 'success' :
            action.status === 'failed' ? 'danger' :
            action.status === 'running' ? 'primary' :
            action.status === 'needs_approval' ? 'warning' : 'default'
          }
        >
          {action.status}
        </Badge>
      </div>
      {expanded && (
        <div className="px-3 py-2 border-t border-border bg-surface-0/50">
          <div className="text-xs text-text-muted mb-1">Input:</div>
          <pre className="text-xs font-mono text-text-secondary bg-surface-1 rounded p-2 overflow-x-auto mb-2">
            {action.input}
          </pre>
          {action.output && (
            <>
              <div className="text-xs text-text-muted mb-1">Output:</div>
              <pre className="text-xs font-mono text-text-secondary bg-surface-1 rounded p-2 overflow-x-auto">
                {action.output}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentMode() {
  const { state, dispatch, actions: appActions } = useApp();
  const [taskInput, setTaskInput] = useState('');
  const session = state.agent;

  const startAgent = useCallback(() => {
    if (!taskInput.trim()) return;

    const newSession: AgentSession = {
      id: crypto.randomUUID(),
      task: taskInput,
      status: 'running',
      actions: [
        {
          id: crypto.randomUUID(),
          type: 'SEARCH',
          description: 'Analyzing codebase structure',
          input: taskInput,
          status: 'running',
          timestamp: Date.now(),
        },
      ],
      startedAt: Date.now(),
      totalTokens: 0,
    };

    dispatch({ type: 'SET_AGENT_SESSION', payload: newSession });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: taskInput,
      timestamp: Date.now(),
      mode: AiMode.AGENT,
    });

    // Simulate agent working
    setTimeout(() => {
      dispatch({
        type: 'SET_AGENT_SESSION',
        payload: {
          ...newSession,
          actions: [
            { ...newSession.actions[0], status: 'completed', output: 'Found 12 relevant files' },
            {
              id: crypto.randomUUID(),
              type: 'READ_FILE',
              description: 'Reading main configuration file',
              input: 'config.ts',
              output: 'Configuration loaded successfully',
              status: 'completed',
              timestamp: Date.now(),
            },
            {
              id: crypto.randomUUID(),
              type: 'WRITE_FILE',
              description: 'Implementing requested changes',
              input: 'src/feature.ts',
              status: 'needs_approval',
              timestamp: Date.now(),
            },
          ],
          totalTokens: 2450,
        },
      });

      appActions.addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've analyzed the codebase and found the relevant files. I'm implementing the changes now.\n\nHere's my plan:\n1. Read the configuration\n2. Implement the feature\n3. Update tests\n\nI need your approval to write changes to \`src/feature.ts\`.`,
        timestamp: Date.now(),
        mode: AiMode.AGENT,
        tokens: 2450,
      });
    }, 1500);

    setTaskInput('');
  }, [taskInput, dispatch, appActions]);

  const stopAgent = useCallback(() => {
    if (session) {
      dispatch({
        type: 'SET_AGENT_SESSION',
        payload: { ...session, status: 'paused' },
      });
    }
  }, [session, dispatch]);

  const approveAction = useCallback(() => {
    if (!session) return;
    const updated: AgentSession = {
      ...session,
      actions: session.actions.map((a) =>
        a.status === 'needs_approval' ? { ...a, status: 'completed', output: 'Changes applied' } : a
      ),
      status: 'completed',
      completedAt: Date.now(),
    };
    dispatch({ type: 'SET_AGENT_SESSION', payload: updated });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Changes approved and applied successfully. Task completed.',
      timestamp: Date.now(),
      mode: AiMode.AGENT,
      tokens: 150,
    });
  }, [session, dispatch, appActions]);

  return (
    <div className="flex flex-col h-full">
      {/* Task input */}
      <div className="p-3 border-b border-border">
        <TextArea
          placeholder="Describe a task for the AI agent..."
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-2 mt-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={14} />}
            onClick={startAgent}
            disabled={!taskInput.trim() || session?.status === 'running'}
          >
            Start Agent
          </Button>
          {session?.status === 'running' && (
            <Button
              variant="danger"
              size="sm"
              icon={<Square size={14} />}
              onClick={stopAgent}
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Session status */}
      {session && (
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                session.status === 'running' ? 'primary' :
                session.status === 'completed' ? 'success' :
                session.status === 'failed' ? 'danger' : 'default'
              }
              dot
            >
              {session.status}
            </Badge>
            <span className="text-xs text-text-muted">
              {session.actions.length} actions
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {session.totalTokens.toLocaleString()} tokens
          </span>
        </div>
      )}

      {/* Action list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {session?.actions.map((action) => (
          <ActionItem key={action.id} action={action} />
        ))}

        {session?.actions.some((a) => a.status === 'needs_approval') && (
          <div className="flex gap-2 mt-3">
            <Button
              variant="success"
              size="sm"
              icon={<ThumbsUp size={14} />}
              onClick={approveAction}
              fullWidth
            >
              Approve Changes
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<XCircle size={14} />}
              onClick={stopAgent}
              fullWidth
            >
              Reject
            </Button>
          </div>
        )}

        {!session && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm">
            <Bot size={32} className="mb-3 opacity-30" />
            <p>Give the agent a task to get started</p>
            <p className="text-xs mt-1">It will autonomously execute steps to complete it</p>
          </div>
        )}
      </div>
    </div>
  );
}
