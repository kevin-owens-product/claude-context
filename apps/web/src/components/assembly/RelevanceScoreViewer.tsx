/**
 * Relevance Score Viewer - Display context relevance scoring details
 * @prompt-id forge-v4.1:web:components:assembly:relevance-score:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Shield,
  Zap,
  Info,
} from 'lucide-react';
import type { RelevanceScore } from '../../api/assembly';

interface RelevanceScoreViewerProps {
  scores: RelevanceScore[];
  showDetails?: boolean;
}

export function RelevanceScoreViewer({ scores, showDetails = false }: RelevanceScoreViewerProps) {
  const [expanded, setExpanded] = useState(showDetails);

  // Sort by total score descending
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="claude-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-700/50 transition-colors"
      >
        <h3 className="font-serif text-heading-3 text-claude-neutral-800 dark:text-claude-neutral-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-claude-primary-500" />
          Relevance Scores
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-claude-neutral-500">{scores.length} sources</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-claude-neutral-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-claude-neutral-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-claude-cream-50 dark:bg-claude-neutral-700/50 rounded-claude-sm text-xs">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span className="text-claude-neutral-600 dark:text-claude-neutral-400">Semantic (50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-green-500" />
              <span className="text-claude-neutral-600 dark:text-claude-neutral-400">Recency (30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-500" />
              <span className="text-claude-neutral-600 dark:text-claude-neutral-400">Confidence (20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-500" />
              <span className="text-claude-neutral-600 dark:text-claude-neutral-400">Project Boost</span>
            </div>
          </div>

          {/* Score List */}
          <div className="space-y-2">
            {sortedScores.map((score) => (
              <ScoreRow key={score.nodeId} score={score} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({ score }: { score: RelevanceScore }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const totalPercent = Math.round(score.totalScore * 100);

  return (
    <div className="border border-claude-cream-200 dark:border-claude-neutral-600 rounded-claude-sm overflow-hidden">
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-claude-cream-50 dark:hover:bg-claude-neutral-700/50"
      >
        {/* Score Bar */}
        <div className="w-20 flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="flex-1 h-2 bg-claude-cream-200 dark:bg-claude-neutral-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full',
                  totalPercent >= 70 ? 'bg-claude-success' : totalPercent >= 40 ? 'bg-yellow-500' : 'bg-claude-neutral-400'
                )}
                style={{ width: `${totalPercent}%` }}
              />
            </div>
            <span className="text-xs font-medium text-claude-neutral-700 dark:text-claude-neutral-300 w-8">
              {totalPercent}%
            </span>
          </div>
        </div>

        {/* Node Info */}
        <div className="flex-1 text-left">
          <span className="text-sm text-claude-neutral-800 dark:text-claude-neutral-200 font-mono">
            {score.nodeId.substring(0, 8)}...
          </span>
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-claude-cream-200 dark:bg-claude-neutral-600 text-claude-neutral-600 dark:text-claude-neutral-400">
            {score.nodeType}
          </span>
        </div>

        <Info className="w-4 h-4 text-claude-neutral-400" />
      </button>

      {showBreakdown && (
        <div className="px-3 py-2 bg-claude-cream-50 dark:bg-claude-neutral-700/30 border-t border-claude-cream-200 dark:border-claude-neutral-600">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <ScoreComponent
              icon={<Sparkles className="w-3 h-3 text-blue-500" />}
              label="Semantic"
              value={score.semanticScore}
              weight={0.5}
            />
            <ScoreComponent
              icon={<Clock className="w-3 h-3 text-green-500" />}
              label="Recency"
              value={score.recencyScore}
              weight={0.3}
            />
            <ScoreComponent
              icon={<Shield className="w-3 h-3 text-purple-500" />}
              label="Confidence"
              value={score.confidenceScore}
              weight={0.2}
            />
            <ScoreComponent
              icon={<Zap className="w-3 h-3 text-orange-500" />}
              label="Project Boost"
              value={score.projectBoost}
              isBoost
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreComponent({
  icon,
  label,
  value,
  weight,
  isBoost,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  weight?: number;
  isBoost?: boolean;
}) {
  const displayValue = Math.round(value * 100);

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-claude-neutral-500">{label}</span>
      </div>
      <div className="font-medium text-claude-neutral-800 dark:text-claude-neutral-200">
        {isBoost ? (value > 0 ? `+${displayValue}%` : '-') : `${displayValue}%`}
      </div>
      {weight && (
        <div className="text-claude-neutral-400">
          × {weight} = {Math.round(value * weight * 100)}%
        </div>
      )}
    </div>
  );
}
