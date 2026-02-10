import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  FileText,
  MessageSquare,
  Cpu,
  Wrench,
  User,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Input, TextArea } from '../common/Input';
import { useApp } from '../../store/AppContext';
import type { ContextEntry, ContextEntryType, ContextStrategy } from '../../types';

const ENTRY_TYPE_ICONS: Record<ContextEntryType, React.ReactNode> = {
  file: <FileText size={12} />,
  conversation: <MessageSquare size={12} />,
  system_prompt: <Cpu size={12} />,
  tool_output: <Wrench size={12} />,
  user_context: <User size={12} />,
};

const STRATEGY_OPTIONS: { value: ContextStrategy; label: string; description: string }[] = [
  { value: 'fifo', label: 'FIFO', description: 'First in, first out' },
  { value: 'priority', label: 'Priority', description: 'Highest priority kept' },
  { value: 'relevance', label: 'Relevance', description: 'Most relevant kept' },
  { value: 'manual', label: 'Manual', description: 'You decide what stays' },
];

export function ContextMode() {
  const { state, dispatch } = useApp();
  const context = state.context;
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryType, setNewEntryType] = useState<ContextEntryType>('user_context');

  const usagePercent = (context.usedTokens / context.maxTokens) * 100;

  const addEntry = useCallback(() => {
    if (!newEntryName.trim() || !newEntryContent.trim()) return;

    const tokens = Math.ceil(newEntryContent.length / 4); // rough estimate
    const newEntry: ContextEntry = {
      id: crypto.randomUUID(),
      type: newEntryType,
      name: newEntryName,
      tokens,
      pinned: false,
      priority: 5,
      content: newEntryContent,
      addedAt: Date.now(),
    };

    dispatch({
      type: 'SET_CONTEXT_BUDGET',
      payload: {
        entries: [...context.entries, newEntry],
        usedTokens: context.usedTokens + tokens,
      },
    });

    setNewEntryName('');
    setNewEntryContent('');
  }, [newEntryName, newEntryContent, newEntryType, context, dispatch]);

  const removeEntry = useCallback(
    (id: string) => {
      const entry = context.entries.find((e) => e.id === id);
      if (!entry) return;

      dispatch({
        type: 'SET_CONTEXT_BUDGET',
        payload: {
          entries: context.entries.filter((e) => e.id !== id),
          usedTokens: Math.max(0, context.usedTokens - entry.tokens),
        },
      });
    },
    [context, dispatch]
  );

  const togglePin = useCallback(
    (id: string) => {
      dispatch({
        type: 'SET_CONTEXT_BUDGET',
        payload: {
          entries: context.entries.map((e) =>
            e.id === id ? { ...e, pinned: !e.pinned } : e
          ),
        },
      });
    },
    [context.entries, dispatch]
  );

  const setStrategy = useCallback(
    (strategy: ContextStrategy) => {
      dispatch({
        type: 'SET_CONTEXT_BUDGET',
        payload: { strategy },
      });
    },
    [dispatch]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Token budget bar */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-text-secondary">Token Budget</span>
          <span className="text-xs text-text-muted">
            {context.usedTokens.toLocaleString()} / {context.maxTokens.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              usagePercent < 60 ? 'bg-emerald-500' :
              usagePercent < 85 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-text-muted">
          <span>{usagePercent.toFixed(1)}% used</span>
          <span>{(context.maxTokens - context.usedTokens).toLocaleString()} remaining</span>
        </div>
      </div>

      {/* Strategy */}
      <div className="p-3 border-b border-border">
        <label className="text-xs font-medium text-text-muted mb-1.5 block">
          Eviction Strategy
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {STRATEGY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStrategy(opt.value)}
              className={clsx(
                'p-2 rounded-lg border text-left transition-all text-xs',
                context.strategy === opt.value
                  ? 'border-teal-500/50 bg-teal-500/10 text-teal-300'
                  : 'border-border bg-surface-0 text-text-muted hover:border-surface-3'
              )}
            >
              <span className="font-medium block">{opt.label}</span>
              <span className="text-[10px] text-text-muted">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add entry */}
        <div className="p-3 border-b border-border space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Add Context Entry
          </h3>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(ENTRY_TYPE_ICONS) as ContextEntryType[]).map((type) => (
              <button
                key={type}
                onClick={() => setNewEntryType(type)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] capitalize transition-colors',
                  newEntryType === type
                    ? 'bg-teal-500/20 text-teal-300 font-medium'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {ENTRY_TYPE_ICONS[type]}
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <Input
            placeholder="Entry name"
            value={newEntryName}
            onChange={(e) => setNewEntryName(e.target.value)}
            className="text-xs"
          />
          <TextArea
            placeholder="Content..."
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={12} />}
            onClick={addEntry}
            disabled={!newEntryName.trim() || !newEntryContent.trim()}
            fullWidth
            className="!bg-teal-600 hover:!bg-teal-500"
          >
            Add Entry
          </Button>
        </div>

        {/* Entry list */}
        <div className="p-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Context Entries ({context.entries.length})
          </h3>
          {context.entries.length > 0 ? (
            <div className="space-y-1.5">
              {context.entries
                .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors',
                      entry.pinned
                        ? 'border-teal-500/30 bg-teal-500/5'
                        : 'border-border hover:bg-surface-1/50'
                    )}
                  >
                    <span className="text-text-muted flex-shrink-0">
                      {ENTRY_TYPE_ICONS[entry.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary truncate">{entry.name}</p>
                      <p className="text-[10px] text-text-muted">
                        {entry.tokens.toLocaleString()} tokens | {entry.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePin(entry.id)}
                        className={clsx(
                          'p-1 rounded hover:bg-surface-2 transition-colors',
                          entry.pinned ? 'text-teal-400' : 'text-text-muted'
                        )}
                        aria-label={entry.pinned ? 'Unpin entry' : 'Pin entry'}
                      >
                        {entry.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                      </button>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-red-400 transition-colors"
                        aria-label="Remove entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">
              No context entries. Add files, prompts, or custom context above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
