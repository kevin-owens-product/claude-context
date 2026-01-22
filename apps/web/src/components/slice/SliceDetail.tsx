/**
 * @prompt-id forge-v4.1:web:components:slice-detail:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Send,
  Check,
  X,
  RotateCcw,
  Archive,
  Plus,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSlice, useTransitionSlice, useToggleCriterion } from '../../hooks';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SliceStatus, SliceEvent, type Slice } from '../../types';

interface SliceDetailProps {
  sliceId: string;
  onBack: () => void;
}

const statusVariant: Record<SliceStatus, 'default' | 'info' | 'warning' | 'success'> = {
  [SliceStatus.PENDING]: 'default',
  [SliceStatus.ACTIVE]: 'info',
  [SliceStatus.IN_REVIEW]: 'warning',
  [SliceStatus.COMPLETED]: 'success',
  [SliceStatus.ARCHIVED]: 'default',
};

const statusLabels: Record<SliceStatus, string> = {
  [SliceStatus.PENDING]: 'Pending',
  [SliceStatus.ACTIVE]: 'Active',
  [SliceStatus.IN_REVIEW]: 'In Review',
  [SliceStatus.COMPLETED]: 'Completed',
  [SliceStatus.ARCHIVED]: 'Archived',
};

const availableTransitions: Record<SliceStatus, SliceEvent[]> = {
  [SliceStatus.PENDING]: [SliceEvent.START],
  [SliceStatus.ACTIVE]: [SliceEvent.SUBMIT, SliceEvent.CANCEL],
  [SliceStatus.IN_REVIEW]: [SliceEvent.APPROVE, SliceEvent.REQUEST_CHANGES],
  [SliceStatus.COMPLETED]: [SliceEvent.REOPEN, SliceEvent.ARCHIVE],
  [SliceStatus.ARCHIVED]: [],
};

const eventLabels: Record<SliceEvent, string> = {
  [SliceEvent.START]: 'Start Work',
  [SliceEvent.SUBMIT]: 'Submit for Review',
  [SliceEvent.APPROVE]: 'Approve',
  [SliceEvent.REQUEST_CHANGES]: 'Request Changes',
  [SliceEvent.CANCEL]: 'Cancel',
  [SliceEvent.REOPEN]: 'Reopen',
  [SliceEvent.ARCHIVE]: 'Archive',
};

const eventIcons: Record<SliceEvent, React.ReactNode> = {
  [SliceEvent.START]: <Play className="w-4 h-4" />,
  [SliceEvent.SUBMIT]: <Send className="w-4 h-4" />,
  [SliceEvent.APPROVE]: <Check className="w-4 h-4" />,
  [SliceEvent.REQUEST_CHANGES]: <X className="w-4 h-4" />,
  [SliceEvent.CANCEL]: <X className="w-4 h-4" />,
  [SliceEvent.REOPEN]: <RotateCcw className="w-4 h-4" />,
  [SliceEvent.ARCHIVE]: <Archive className="w-4 h-4" />,
};

const eventVariants: Record<SliceEvent, 'primary' | 'secondary' | 'danger' | 'outline'> = {
  [SliceEvent.START]: 'primary',
  [SliceEvent.SUBMIT]: 'primary',
  [SliceEvent.APPROVE]: 'primary',
  [SliceEvent.REQUEST_CHANGES]: 'danger',
  [SliceEvent.CANCEL]: 'outline',
  [SliceEvent.REOPEN]: 'secondary',
  [SliceEvent.ARCHIVE]: 'outline',
};

export function SliceDetail({ sliceId, onBack }: SliceDetailProps) {
  const [changeComment, setChangeComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const { data: slice, isLoading } = useSlice(sliceId);
  const transitionMutation = useTransitionSlice();
  const toggleCriterionMutation = useToggleCriterion();

  if (isLoading || !slice) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading slice...
      </div>
    );
  }

  const transitions = availableTransitions[slice.status];

  const handleTransition = (event: SliceEvent) => {
    if (event === SliceEvent.REQUEST_CHANGES) {
      setShowCommentInput(true);
      return;
    }

    transitionMutation.mutate({ sliceId, event });
  };

  const handleRequestChanges = () => {
    transitionMutation.mutate(
      { sliceId, event: SliceEvent.REQUEST_CHANGES, comment: changeComment },
      {
        onSuccess: () => {
          setShowCommentInput(false);
          setChangeComment('');
        },
      },
    );
  };

  const handleToggleCriterion = (criterionId: string) => {
    toggleCriterionMutation.mutate({ sliceId, criterionId });
  };

  const completedCriteria = slice.acceptanceCriteria.filter((c) => c.isCompleted).length;
  const totalCriteria = slice.acceptanceCriteria.length;
  const canSubmit = totalCriteria === 0 || completedCriteria === totalCriteria;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to list
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">{slice.shortId}</span>
              <Badge variant={statusVariant[slice.status]}>
                {statusLabels[slice.status]}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{slice.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Outcome */}
        <Card>
          <CardHeader>
            <h3 className="font-medium text-gray-900">Desired Outcome</h3>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{slice.outcome}</p>
          </CardContent>
        </Card>

        {/* Anti-Scope */}
        {slice.antiScope.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Out of Scope</h3>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {slice.antiScope.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Constraints */}
        {slice.constraints.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Constraints</h3>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {slice.constraints.map((constraint) => (
                  <li key={constraint.id}>{constraint.content}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Acceptance Criteria */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Acceptance Criteria</h3>
              <span className="text-sm text-gray-600">
                {completedCriteria} / {totalCriteria} complete
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {slice.acceptanceCriteria.length === 0 ? (
              <p className="text-gray-500 text-sm">No acceptance criteria defined</p>
            ) : (
              <ul className="space-y-2">
                {slice.acceptanceCriteria.map((criterion) => (
                  <li
                    key={criterion.id}
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => handleToggleCriterion(criterion.id)}
                  >
                    {criterion.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={clsx(
                        'text-gray-700',
                        criterion.isCompleted && 'line-through text-gray-500',
                      )}
                    >
                      {criterion.content}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Request Changes Comment Input */}
        {showCommentInput && (
          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Request Changes</h3>
            </CardHeader>
            <CardContent>
              <textarea
                value={changeComment}
                onChange={(e) => setChangeComment(e.target.value)}
                placeholder="Describe the changes needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <Button
                  variant="danger"
                  onClick={handleRequestChanges}
                  loading={transitionMutation.isPending}
                  disabled={!changeComment.trim()}
                >
                  Submit Changes Request
                </Button>
                <Button variant="outline" onClick={() => setShowCommentInput(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions Footer */}
      {transitions.length > 0 && !showCommentInput && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {transitions.map((event) => {
              const isSubmit = event === SliceEvent.SUBMIT;
              const disabled = isSubmit && !canSubmit;

              return (
                <Button
                  key={event}
                  variant={eventVariants[event]}
                  onClick={() => handleTransition(event)}
                  loading={transitionMutation.isPending}
                  disabled={disabled}
                  title={disabled ? 'Complete all acceptance criteria first' : undefined}
                >
                  {eventIcons[event]}
                  <span className="ml-1">{eventLabels[event]}</span>
                </Button>
              );
            })}
          </div>
          {slice.status === SliceStatus.ACTIVE && !canSubmit && (
            <p className="mt-2 text-sm text-gray-600">
              Complete all acceptance criteria to submit for review
            </p>
          )}
        </div>
      )}
    </div>
  );
}
