import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Bug,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Wrench,
  Lightbulb,
} from 'lucide-react';
import { Button } from '../common/Button';
import { TextArea } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { DebugSession, DebugHypothesis, DebugSeverity } from '../../types';
import { AiMode } from '../../types';

export function DebugMode() {
  const { state, dispatch, actions: appActions } = useApp();
  const [bugDescription, setBugDescription] = useState('');
  const [severity, setSeverity] = useState<DebugSeverity>('medium');
  const session = state.debug;

  const startDebug = useCallback(() => {
    if (!bugDescription.trim()) return;

    const newSession: DebugSession = {
      id: crypto.randomUUID(),
      bugDescription,
      severity,
      hypotheses: [],
      logs: [
        {
          timestamp: Date.now(),
          level: 'info',
          message: 'Starting debug analysis...',
          source: 'debugger',
        },
      ],
      status: 'investigating',
    };

    dispatch({ type: 'SET_DEBUG_SESSION', payload: newSession });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Debug: ${bugDescription} (Severity: ${severity})`,
      timestamp: Date.now(),
      mode: AiMode.DEBUG,
    });

    // Simulate analysis
    setTimeout(() => {
      const hypotheses: DebugHypothesis[] = [
        {
          id: crypto.randomUUID(),
          description: 'Null reference in data transformation pipeline',
          likelihood: 0.7,
          evidence: ['Stack trace points to transform.ts:42', 'Input data occasionally has undefined fields'],
          disproved: false,
          tested: false,
        },
        {
          id: crypto.randomUUID(),
          description: 'Race condition in async state update',
          likelihood: 0.2,
          evidence: ['Intermittent failure pattern', 'Multiple concurrent requests possible'],
          disproved: false,
          tested: false,
        },
        {
          id: crypto.randomUUID(),
          description: 'Incorrect type coercion in comparison',
          likelihood: 0.1,
          evidence: ['Uses loose equality in filter'],
          disproved: false,
          tested: false,
        },
      ];

      dispatch({
        type: 'SET_DEBUG_SESSION',
        payload: {
          ...newSession,
          hypotheses,
          logs: [
            ...newSession.logs,
            { timestamp: Date.now(), level: 'info', message: 'Generated 3 hypotheses', source: 'analyzer' },
            { timestamp: Date.now(), level: 'warn', message: 'High likelihood: Null reference found', source: 'analyzer' },
          ],
          status: 'hypothesis_testing',
        },
      });

      appActions.addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've analyzed the bug report and generated **3 hypotheses**:\n\n1. **Null reference** (70% likely) - Stack trace points to transform.ts:42\n2. **Race condition** (20% likely) - Intermittent failure pattern\n3. **Type coercion** (10% likely) - Loose equality in filter\n\nI recommend testing hypothesis 1 first.`,
        timestamp: Date.now(),
        mode: AiMode.DEBUG,
        tokens: 890,
      });
    }, 1200);

    setBugDescription('');
  }, [bugDescription, severity, dispatch, appActions]);

  const testHypothesis = useCallback(
    (hypothesisId: string) => {
      if (!session) return;

      const updated: DebugSession = {
        ...session,
        hypotheses: session.hypotheses.map((h) =>
          h.id === hypothesisId ? { ...h, tested: true } : h
        ),
        logs: [
          ...session.logs,
          {
            timestamp: Date.now(),
            level: 'info',
            message: `Testing hypothesis: ${session.hypotheses.find((h) => h.id === hypothesisId)?.description}`,
            source: 'tester',
          },
        ],
      };

      dispatch({ type: 'SET_DEBUG_SESSION', payload: updated });

      // Simulate test result
      setTimeout(() => {
        const hypothesis = session.hypotheses.find((h) => h.id === hypothesisId);
        if (hypothesis && hypothesis.likelihood >= 0.5) {
          dispatch({
            type: 'SET_DEBUG_SESSION',
            payload: {
              ...updated,
              status: 'fix_proposed',
              rootCause: hypothesis.description,
              fixProposal: `Add null check before accessing nested property in transform.ts:\n\n\`\`\`typescript\nconst value = data?.nested?.field ?? defaultValue;\n\`\`\``,
              logs: [
                ...updated.logs,
                { timestamp: Date.now(), level: 'info', message: 'Root cause confirmed!', source: 'tester' },
              ],
            },
          });

          appActions.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Root cause confirmed: **${hypothesis.description}**\n\nProposed fix:\n\`\`\`typescript\nconst value = data?.nested?.field ?? defaultValue;\n\`\`\`\n\nThis adds proper null checking to prevent the error.`,
            timestamp: Date.now(),
            mode: AiMode.DEBUG,
            tokens: 340,
          });
        }
      }, 1000);
    },
    [session, dispatch, appActions]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Bug description input */}
      <div className="p-3 border-b border-border space-y-2">
        <TextArea
          placeholder="Describe the bug or paste an error message..."
          value={bugDescription}
          onChange={(e) => setBugDescription(e.target.value)}
          rows={2}
        />

        {/* Severity selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Severity:</span>
          {(['critical', 'high', 'medium', 'low'] as DebugSeverity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={clsx(
                'px-2 py-1 rounded text-xs capitalize transition-colors',
                severity === s
                  ? 'bg-surface-2 text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <Button
          variant="danger"
          size="sm"
          icon={<Bug size={14} />}
          onClick={startDebug}
          disabled={!bugDescription.trim()}
          fullWidth
        >
          Analyze Bug
        </Button>
      </div>

      {/* Debug content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hypotheses */}
        {session && session.hypotheses.length > 0 && (
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb size={12} />
              Hypotheses
            </h3>
            <div className="space-y-2">
              {session.hypotheses.map((h) => (
                <div
                  key={h.id}
                  className={clsx(
                    'border rounded-lg p-3',
                    h.tested && h.likelihood >= 0.5
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : h.disproved
                      ? 'border-red-500/30 bg-red-500/5 opacity-60'
                      : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-primary">{h.description}</p>
                    <Badge
                      size="sm"
                      variant={h.likelihood >= 0.5 ? 'warning' : 'default'}
                    >
                      {(h.likelihood * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {h.evidence.map((e, i) => (
                      <p key={i} className="text-xs text-text-muted flex items-center gap-1">
                        <span className="text-text-muted">-</span> {e}
                      </p>
                    ))}
                  </div>
                  {!h.tested && !h.disproved && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<FlaskConical size={12} />}
                      className="mt-2"
                      onClick={() => testHypothesis(h.id)}
                    >
                      Test
                    </Button>
                  )}
                  {h.tested && (
                    <Badge size="sm" variant="success" className="mt-2">
                      Tested
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fix proposal */}
        {session?.fixProposal && (
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wrench size={12} />
              Proposed Fix
            </h3>
            <div className="bg-surface-1 rounded-lg p-3 text-sm text-text-primary whitespace-pre-wrap">
              {session.fixProposal}
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="success" size="sm" icon={<CheckCircle2 size={14} />}>
                Apply Fix
              </Button>
              <Button variant="ghost" size="sm" icon={<XCircle size={14} />}>
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Logs */}
        {session && session.logs.length > 0 && (
          <div className="p-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Debug Log
            </h3>
            <div className="space-y-1 font-mono text-xs">
              {session.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-text-muted whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={clsx(
                      'uppercase w-12 text-right flex-shrink-0',
                      log.level === 'error' && 'text-red-400',
                      log.level === 'warn' && 'text-amber-400',
                      log.level === 'info' && 'text-blue-400',
                      log.level === 'debug' && 'text-text-muted'
                    )}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-text-secondary">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!session && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm p-6">
            <Bug size={32} className="mb-3 opacity-30" />
            <p>Describe a bug to start debugging</p>
            <p className="text-xs mt-1">AI will generate hypotheses and help isolate the root cause</p>
          </div>
        )}
      </div>
    </div>
  );
}
