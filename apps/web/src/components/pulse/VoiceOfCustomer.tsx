/**
 * VoiceOfCustomer - Real-time customer feedback intelligence
 *
 * Shows aggregated customer sentiment and trending topics:
 * - Sentiment analysis from all feedback channels
 * - Trending feature requests
 * - Pain points and frustrations
 * - Positive highlights
 *
 * Helps product teams understand what customers are actually saying.
 */

import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertCircle,
  Sparkles,
  Quote,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

// Simulated voice of customer data
const useVoiceOfCustomer = () => {
  return useMemo(() => ({
    overallSentiment: {
      positive: 62,
      neutral: 24,
      negative: 14,
      trend: 'improving' as const,
    },
    trendingTopics: [
      { topic: 'Smart Search', mentions: 47, sentiment: 0.78, trend: 'up' as const },
      { topic: 'Export Feature', mentions: 32, sentiment: 0.45, trend: 'stable' as const },
      { topic: 'Mobile App', mentions: 28, sentiment: 0.35, trend: 'down' as const },
      { topic: 'Onboarding', mentions: 24, sentiment: 0.82, trend: 'up' as const },
    ],
    recentQuotes: [
      { quote: "The new dashboard is exactly what we needed!", sentiment: 'positive' as const, source: 'Enterprise Customer' },
      { quote: "Bulk export is still too slow for our workflows", sentiment: 'negative' as const, source: 'Mid-market Customer' },
      { quote: "Love the AI suggestions, but they could be more accurate", sentiment: 'neutral' as const, source: 'Startup Customer' },
    ],
    topRequests: [
      { feature: 'Bulk Actions Improvements', votes: 89, urgency: 'high' as const },
      { feature: 'Custom Report Builder', votes: 67, urgency: 'medium' as const },
      { feature: 'API Rate Limit Increase', votes: 54, urgency: 'high' as const },
      { feature: 'Dark Mode Improvements', votes: 32, urgency: 'low' as const },
    ],
    painPoints: [
      { issue: 'Export performance on large datasets', severity: 'high' as const, mentions: 23 },
      { issue: 'Mobile responsiveness issues', severity: 'medium' as const, mentions: 18 },
    ],
  }), []);
};

interface VoiceOfCustomerProps {
  compact?: boolean;
}

export function VoiceOfCustomer({ compact = false }: VoiceOfCustomerProps) {
  const voc = useVoiceOfCustomer();

  const sentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return 'text-green-400';
    if (sentiment >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={clsx('space-y-4', compact && 'space-y-3')}>
      {/* Sentiment Overview */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium text-claude-neutral-200">Overall Sentiment</span>
          </div>
          <div className={clsx(
            'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
            voc.overallSentiment.trend === 'improving' ? 'bg-green-500/20 text-green-400' :
            voc.overallSentiment.trend === 'declining' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-500/20 text-gray-400'
          )}>
            <TrendingUp className="w-3 h-3" />
            {voc.overallSentiment.trend}
          </div>
        </div>

        {/* Sentiment Bar */}
        <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-green-500 rounded-l-full"
            style={{ width: `${voc.overallSentiment.positive}%` }}
          />
          <div
            className="h-full bg-gray-500"
            style={{ width: `${voc.overallSentiment.neutral}%` }}
          />
          <div
            className="h-full bg-red-500 rounded-r-full"
            style={{ width: `${voc.overallSentiment.negative}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-claude-neutral-500">
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-green-400" />
            {voc.overallSentiment.positive}% positive
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="w-3 h-3 text-red-400" />
            {voc.overallSentiment.negative}% negative
          </span>
        </div>
      </div>

      {/* Trending Topics */}
      <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-medium text-claude-neutral-300">Trending Topics</span>
        </div>
        <div className="space-y-2">
          {voc.trendingTopics.slice(0, compact ? 3 : 4).map((topic, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-claude-neutral-400">{topic.topic}</span>
                <span className="text-[10px] text-claude-neutral-500">{topic.mentions} mentions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={clsx(
                  'text-xs',
                  sentimentColor(topic.sentiment)
                )}>
                  {Math.round(topic.sentiment * 100)}%
                </div>
                {topic.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-400" />}
                {topic.trend === 'down' && <ArrowUpRight className="w-3 h-3 text-red-400 rotate-90" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Quotes */}
      {!compact && (
        <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-claude-neutral-300">Recent Customer Quotes</span>
          </div>
          <div className="space-y-2">
            {voc.recentQuotes.map((quote, idx) => (
              <div
                key={idx}
                className={clsx(
                  'p-2 rounded-lg text-xs border-l-2',
                  quote.sentiment === 'positive' && 'bg-green-500/5 border-green-500',
                  quote.sentiment === 'negative' && 'bg-red-500/5 border-red-500',
                  quote.sentiment === 'neutral' && 'bg-gray-500/5 border-gray-500',
                )}
              >
                <p className="text-claude-neutral-300 italic">"{quote.quote}"</p>
                <p className="text-claude-neutral-500 text-[10px] mt-1">— {quote.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Feature Requests */}
      <div className="p-3 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-medium text-claude-neutral-300">Top Feature Requests</span>
        </div>
        <div className="space-y-2">
          {voc.topRequests.slice(0, compact ? 2 : 3).map((request, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-xs text-claude-neutral-400">{request.feature}</span>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  request.urgency === 'high' && 'bg-red-500/20 text-red-400',
                  request.urgency === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                  request.urgency === 'low' && 'bg-gray-500/20 text-gray-400',
                )}>
                  {request.urgency}
                </span>
                <span className="text-xs text-claude-neutral-500">{request.votes} votes</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pain Points Alert */}
      {voc.painPoints.filter(p => p.severity === 'high').length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-red-300">Active Pain Points</div>
            {voc.painPoints.filter(p => p.severity === 'high').map((pain, idx) => (
              <div key={idx} className="text-xs text-red-400/80 mt-0.5">
                {pain.issue} ({pain.mentions} mentions)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-claude-primary-500/10 border border-claude-primary-500/20">
        <Sparkles className="w-4 h-4 text-claude-primary-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-xs font-medium text-claude-primary-300">AI Insight</div>
          <div className="text-xs text-claude-neutral-400 mt-0.5">
            Export performance is the #1 pain point across enterprise customers.
            Smart Search sentiment improved 23% after the recent update.
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceOfCustomer;
