/**
 * @prompt-id forge-v4.1:web:components:feedback-form:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';
import { useSubmitFeedback } from '../../hooks';
import { Card, CardHeader, CardContent, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { FeedbackRating, FeedbackErrorCategory } from '../../types';

interface FeedbackFormProps {
  sessionId: string;
  onComplete?: () => void;
}

const errorCategories: { value: FeedbackErrorCategory; label: string }[] = [
  { value: FeedbackErrorCategory.HALLUCINATION, label: 'Hallucination' },
  { value: FeedbackErrorCategory.OUTDATED_INFO, label: 'Outdated Information' },
  { value: FeedbackErrorCategory.MISSING_CONTEXT, label: 'Missing Context' },
  { value: FeedbackErrorCategory.WRONG_STYLE, label: 'Wrong Style/Tone' },
  { value: FeedbackErrorCategory.INCOMPLETE, label: 'Incomplete Response' },
  { value: FeedbackErrorCategory.OTHER, label: 'Other' },
];

export function FeedbackForm({ sessionId, onComplete }: FeedbackFormProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [selectedErrors, setSelectedErrors] = useState<FeedbackErrorCategory[]>([]);
  const [missingContext, setMissingContext] = useState('');
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const submitMutation = useSubmitFeedback();

  const handleRatingSelect = (selectedRating: FeedbackRating) => {
    setRating(selectedRating);
    if (selectedRating === FeedbackRating.NEGATIVE) {
      setShowDetails(true);
    } else {
      setShowDetails(false);
    }
  };

  const toggleErrorCategory = (category: FeedbackErrorCategory) => {
    setSelectedErrors((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleSubmit = () => {
    if (!rating) return;

    submitMutation.mutate(
      {
        sessionId,
        rating,
        errorCategories: selectedErrors.length > 0 ? selectedErrors : undefined,
        missingContext: missingContext.trim() || undefined,
        comment: comment.trim() || undefined,
      },
      { onSuccess: onComplete },
    );
  };

  const handleSkip = () => {
    submitMutation.mutate(
      { sessionId, rating: FeedbackRating.SKIPPED },
      { onSuccess: onComplete },
    );
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-medium text-gray-900">How was the AI response?</h3>
      </CardHeader>

      <CardContent>
        {/* Rating Buttons */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => handleRatingSelect(FeedbackRating.POSITIVE)}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all',
              rating === FeedbackRating.POSITIVE
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50',
            )}
          >
            <ThumbsUp className="w-5 h-5" />
            <span>Helpful</span>
          </button>

          <button
            onClick={() => handleRatingSelect(FeedbackRating.NEGATIVE)}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all',
              rating === FeedbackRating.NEGATIVE
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-red-300 hover:bg-red-50',
            )}
          >
            <ThumbsDown className="w-5 h-5" />
            <span>Not Helpful</span>
          </button>
        </div>

        {/* Detailed Feedback (shown for negative ratings) */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Error Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What was wrong? (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {errorCategories.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => toggleErrorCategory(value)}
                    className={clsx(
                      'px-3 py-1.5 text-sm rounded-full transition-colors',
                      selectedErrors.includes(value)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Missing Context */}
            {selectedErrors.includes(FeedbackErrorCategory.MISSING_CONTEXT) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What context was missing?
                </label>
                <textarea
                  value={missingContext}
                  onChange={(e) => setMissingContext(e.target.value)}
                  placeholder="Describe what information would have helped..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            )}

            {/* Additional Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional comments (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any other feedback..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            disabled={submitMutation.isPending}
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </button>

          <Button
            onClick={handleSubmit}
            disabled={!rating}
            loading={submitMutation.isPending}
          >
            Submit Feedback
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
