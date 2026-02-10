import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  GitBranch,
  GitCommit,
  Plus,
  Trash2,
  Bookmark,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { SessionBranch, SessionCheckpoint } from '../../types';
import { AiMode } from '../../types';

export function SessionMode() {
  const { state, dispatch, actions: appActions } = useApp();
  const [branchName, setBranchName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const session = state.session;

  // Initialize with default branch if empty
  React.useEffect(() => {
    if (session.branches.length === 0) {
      dispatch({
        type: 'SET_SESSION_STATE',
        payload: {
          branches: [
            {
              id: 'main',
              name: 'main',
              checkpointId: 'initial',
              createdAt: Date.now(),
              messages: [],
            },
          ],
          activeBranchId: 'main',
          checkpoints: [
            {
              id: 'initial',
              name: 'Start',
              timestamp: Date.now(),
              messageCount: 0,
              tokensUsed: 0,
            },
          ],
        },
      });
    }
  }, [session.branches.length, dispatch]);

  const createBranch = useCallback(() => {
    if (!branchName.trim()) return;

    const activeBranch = session.branches.find(
      (b) => b.id === session.activeBranchId
    );

    const checkpoint: SessionCheckpoint = {
      id: crypto.randomUUID(),
      name: `Before ${branchName}`,
      timestamp: Date.now(),
      messageCount: state.messages.length,
      tokensUsed: state.context.usedTokens,
    };

    const newBranch: SessionBranch = {
      id: crypto.randomUUID(),
      name: branchName,
      parentId: session.activeBranchId,
      checkpointId: checkpoint.id,
      createdAt: Date.now(),
      messages: [...state.messages],
    };

    dispatch({
      type: 'SET_SESSION_STATE',
      payload: {
        branches: [...session.branches, newBranch],
        activeBranchId: newBranch.id,
        checkpoints: [...session.checkpoints, checkpoint],
      },
    });

    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'system',
      content: `Branched to "${branchName}" from "${activeBranch?.name || 'main'}"`,
      timestamp: Date.now(),
      mode: AiMode.SESSION,
    });

    setBranchName('');
  }, [branchName, session, state.messages, state.context.usedTokens, dispatch, appActions]);

  const switchBranch = useCallback(
    (branchId: string) => {
      const branch = session.branches.find((b) => b.id === branchId);
      if (!branch) return;

      dispatch({
        type: 'SET_SESSION_STATE',
        payload: { activeBranchId: branchId },
      });

      appActions.addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: `Switched to branch "${branch.name}"`,
        timestamp: Date.now(),
        mode: AiMode.SESSION,
      });
    },
    [session.branches, dispatch, appActions]
  );

  const createCheckpoint = useCallback(() => {
    if (!checkpointName.trim()) return;

    const checkpoint: SessionCheckpoint = {
      id: crypto.randomUUID(),
      name: checkpointName,
      timestamp: Date.now(),
      messageCount: state.messages.length,
      tokensUsed: state.context.usedTokens,
    };

    dispatch({
      type: 'SET_SESSION_STATE',
      payload: {
        checkpoints: [...session.checkpoints, checkpoint],
      },
    });

    setCheckpointName('');
  }, [checkpointName, state.messages.length, state.context.usedTokens, session.checkpoints, dispatch]);

  const deleteBranch = useCallback(
    (branchId: string) => {
      if (branchId === 'main') return;
      dispatch({
        type: 'SET_SESSION_STATE',
        payload: {
          branches: session.branches.filter((b) => b.id !== branchId),
          activeBranchId:
            session.activeBranchId === branchId ? 'main' : session.activeBranchId,
        },
      });
    },
    [session, dispatch]
  );

  const activeBranch = session.branches.find(
    (b) => b.id === session.activeBranchId
  );

  return (
    <div className="flex flex-col h-full">
      {/* Current branch */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-text-primary">
            {activeBranch?.name || 'main'}
          </span>
          <Badge size="sm" variant="info">active</Badge>
        </div>

        {/* Create branch */}
        <div className="flex gap-2">
          <Input
            placeholder="New branch name..."
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="text-xs"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={createBranch}
            disabled={!branchName.trim()}
            className="!bg-cyan-600 hover:!bg-cyan-500 flex-shrink-0"
          >
            Branch
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Branches list */}
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitBranch size={12} />
            Branches ({session.branches.length})
          </h3>
          <div className="space-y-1">
            {session.branches.map((branch) => (
              <div
                key={branch.id}
                className={clsx(
                  'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                  branch.id === session.activeBranchId
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'hover:bg-surface-1 border border-transparent'
                )}
                onClick={() => switchBranch(branch.id)}
              >
                <GitBranch
                  size={14}
                  className={
                    branch.id === session.activeBranchId
                      ? 'text-cyan-400'
                      : 'text-text-muted'
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{branch.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {branch.messages.length} messages
                    {branch.parentId && (
                      <>
                        {' '}| from{' '}
                        {session.branches.find((b) => b.id === branch.parentId)?.name || '?'}
                      </>
                    )}
                  </p>
                </div>
                {branch.id !== 'main' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBranch(branch.id);
                    }}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-red-400 transition-colors"
                    aria-label={`Delete branch ${branch.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Checkpoints */}
        <div className="p-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Bookmark size={12} />
            Checkpoints ({session.checkpoints.length})
          </h3>

          {/* Create checkpoint */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Checkpoint name..."
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<GitCommit size={12} />}
              onClick={createCheckpoint}
              disabled={!checkpointName.trim()}
              className="flex-shrink-0"
            >
              Save
            </Button>
          </div>

          <div className="space-y-1.5">
            {session.checkpoints.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-0/50 border border-border"
              >
                <GitCommit size={12} className="text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{cp.name}</p>
                  <p className="text-[10px] text-text-muted">
                    {cp.messageCount} messages | {cp.tokensUsed} tokens
                  </p>
                </div>
                <span className="text-[10px] text-text-muted flex-shrink-0">
                  {new Date(cp.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
