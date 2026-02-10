import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  ListChecks,
  Play,
  CheckCircle2,
  Circle,
  ArrowRight,
  HelpCircle,
  SkipForward,
  Lock,
} from 'lucide-react';
import { Button } from '../common/Button';
import { TextArea, Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { useApp } from '../../store/AppContext';
import type { PlanSession, PlanStep, PlanStepStatus } from '../../types';
import { AiMode } from '../../types';

const STEP_STATUS_ICONS: Record<PlanStepStatus, React.ReactNode> = {
  pending: <Circle size={14} className="text-text-muted" />,
  in_progress: <ArrowRight size={14} className="text-indigo-400" />,
  completed: <CheckCircle2 size={14} className="text-emerald-400" />,
  skipped: <SkipForward size={14} className="text-text-muted" />,
  blocked: <Lock size={14} className="text-amber-400" />,
};

function StepItem({ step, depth = 0 }: { step: PlanStep; depth?: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={clsx(
          'flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-surface-1 transition-colors',
          step.status === 'in_progress' && 'bg-indigo-500/5'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="mt-0.5 flex-shrink-0">{STEP_STATUS_ICONS[step.status]}</span>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm',
              step.status === 'completed' && 'line-through text-text-muted',
              step.status === 'in_progress' && 'text-indigo-300 font-medium',
              step.status === 'pending' && 'text-text-primary',
              step.status === 'blocked' && 'text-amber-300',
              step.status === 'skipped' && 'text-text-muted'
            )}
          >
            {step.title}
          </p>
          {expanded && step.description && (
            <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
          )}
        </div>
        <Badge size="sm" variant="default">
          ~{step.estimatedTokens} tok
        </Badge>
      </div>
      {expanded && step.substeps.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {step.substeps.map((sub) => (
            <StepItem key={sub.id} step={sub} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanMode() {
  const { state, dispatch, actions: appActions } = useApp();
  const [goalInput, setGoalInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const session = state.plan;

  const startPlanning = useCallback(() => {
    if (!goalInput.trim()) return;

    const newSession: PlanSession = {
      id: crypto.randomUUID(),
      goal: goalInput,
      questions: [
        { id: '1', question: 'What programming language/framework is this project using?', required: true },
        { id: '2', question: 'Are there existing tests that need to be updated?', required: false },
        { id: '3', question: 'Should this be backwards compatible?', required: true },
      ],
      steps: [],
      status: 'gathering_info',
      totalEstimatedTokens: 0,
      tokensUsed: 0,
    };

    dispatch({ type: 'SET_PLAN_SESSION', payload: newSession });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Plan: ${goalInput}`,
      timestamp: Date.now(),
      mode: AiMode.PLAN,
    });
    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'I need some information before creating a plan. Please answer the following questions.',
      timestamp: Date.now(),
      mode: AiMode.PLAN,
      tokens: 120,
    });

    setGoalInput('');
  }, [goalInput, dispatch, appActions]);

  const answerQuestion = useCallback(
    (questionId: string) => {
      if (!session || !answerInput.trim()) return;

      const updated: PlanSession = {
        ...session,
        questions: session.questions.map((q) =>
          q.id === questionId ? { ...q, answer: answerInput } : q
        ),
      };

      // If all required questions answered, generate plan
      const allRequired = updated.questions
        .filter((q) => q.required)
        .every((q) => q.answer);

      if (allRequired) {
        const steps: PlanStep[] = [
          {
            id: '1',
            title: 'Set up project structure',
            description: 'Create necessary directories and config files',
            status: 'pending',
            dependencies: [],
            estimatedTokens: 500,
            substeps: [
              {
                id: '1a',
                title: 'Create directory structure',
                description: '',
                status: 'pending',
                dependencies: [],
                estimatedTokens: 200,
                substeps: [],
              },
              {
                id: '1b',
                title: 'Initialize configuration',
                description: '',
                status: 'pending',
                dependencies: ['1a'],
                estimatedTokens: 300,
                substeps: [],
              },
            ],
          },
          {
            id: '2',
            title: 'Implement core logic',
            description: 'Build the main feature functionality',
            status: 'pending',
            dependencies: ['1'],
            estimatedTokens: 2000,
            substeps: [],
          },
          {
            id: '3',
            title: 'Add error handling',
            description: 'Implement proper error boundaries and validation',
            status: 'pending',
            dependencies: ['2'],
            estimatedTokens: 800,
            substeps: [],
          },
          {
            id: '4',
            title: 'Write tests',
            description: 'Unit and integration tests for all components',
            status: 'pending',
            dependencies: ['2'],
            estimatedTokens: 1200,
            substeps: [],
          },
          {
            id: '5',
            title: 'Documentation',
            description: 'Update README and add JSDoc comments',
            status: 'pending',
            dependencies: ['3', '4'],
            estimatedTokens: 500,
            substeps: [],
          },
        ];

        updated.steps = steps;
        updated.status = 'planning';
        updated.totalEstimatedTokens = steps.reduce(
          (sum, s) => sum + s.estimatedTokens,
          0
        );

        appActions.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Plan created with **5 steps** and an estimated **${updated.totalEstimatedTokens.toLocaleString()} tokens**. Review the steps and click Execute when ready.`,
          timestamp: Date.now(),
          mode: AiMode.PLAN,
          tokens: 450,
        });
      }

      dispatch({ type: 'SET_PLAN_SESSION', payload: updated });
      setAnswerInput('');
    },
    [session, answerInput, dispatch, appActions]
  );

  const executePlan = useCallback(() => {
    if (!session) return;

    const updated: PlanSession = {
      ...session,
      status: 'executing',
      steps: session.steps.map((s, i) =>
        i === 0
          ? { ...s, status: 'in_progress' as PlanStepStatus }
          : s
      ),
    };

    dispatch({ type: 'SET_PLAN_SESSION', payload: updated });

    appActions.addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Executing plan... Starting with step 1.',
      timestamp: Date.now(),
      mode: AiMode.PLAN,
      tokens: 50,
    });

    // Simulate execution
    setTimeout(() => {
      dispatch({
        type: 'SET_PLAN_SESSION',
        payload: {
          ...updated,
          steps: updated.steps.map((s, i) =>
            i === 0
              ? {
                  ...s,
                  status: 'completed' as PlanStepStatus,
                  substeps: s.substeps.map((sub) => ({ ...sub, status: 'completed' as PlanStepStatus })),
                }
              : i === 1
              ? { ...s, status: 'in_progress' as PlanStepStatus }
              : s
          ),
          tokensUsed: 500,
        },
      });
    }, 2000);
  }, [session, dispatch, appActions]);

  return (
    <div className="flex flex-col h-full">
      {/* Goal input */}
      <div className="p-3 border-b border-border">
        <TextArea
          placeholder="What do you want to accomplish?"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          rows={2}
        />
        <Button
          variant="primary"
          size="sm"
          icon={<ListChecks size={14} />}
          onClick={startPlanning}
          disabled={!goalInput.trim()}
          fullWidth
          className="mt-2"
        >
          Create Plan
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Questions */}
        {session?.status === 'gathering_info' && (
          <div className="p-3 space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={12} />
              Questions
            </h3>
            {session.questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <p className="text-sm text-text-primary flex items-center gap-1">
                  {q.answer ? (
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle size={14} className="text-text-muted flex-shrink-0" />
                  )}
                  {q.question}
                  {q.required && <span className="text-red-400">*</span>}
                </p>
                {q.answer ? (
                  <p className="text-xs text-text-secondary ml-5">{q.answer}</p>
                ) : (
                  <div className="flex gap-2 ml-5">
                    <Input
                      placeholder="Your answer..."
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => answerQuestion(q.id)}
                    >
                      Answer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {session && session.steps.length > 0 && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Plan Steps
              </h3>
              {session.status === 'planning' && (
                <Button
                  variant="success"
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={executePlan}
                >
                  Execute Plan
                </Button>
              )}
            </div>

            {/* Progress bar */}
            {session.status === 'executing' && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>
                    {session.steps.filter((s) => s.status === 'completed').length} / {session.steps.length} steps
                  </span>
                  <span>
                    {session.tokensUsed.toLocaleString()} / {session.totalEstimatedTokens.toLocaleString()} tokens
                  </span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${(session.steps.filter((s) => s.status === 'completed').length / session.steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              {session.steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!session && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm p-6">
            <ListChecks size={32} className="mb-3 opacity-30" />
            <p>Define a goal to create a plan</p>
            <p className="text-xs mt-1">AI will break it into steps with estimated token costs</p>
          </div>
        )}
      </div>
    </div>
  );
}
