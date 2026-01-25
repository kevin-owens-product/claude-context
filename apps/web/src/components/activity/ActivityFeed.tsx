/**
 * ActivityFeed - Real-time activity stream
 * Shows all project activity with filtering and search
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Activity,
  GitPullRequest,
  GitCommit,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  Link2,
  Target,
  FileText,
  Search,
  Bell,
  BellOff,
} from 'lucide-react';
import type { Slice, Intent, Artifact } from '../../data/enterprise-data';

interface ActivityItem {
  id: string;
  type: 'slice' | 'intent' | 'artifact' | 'comment' | 'pr' | 'commit' | 'review';
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'blocked' | 'linked' | 'commented' | 'merged' | 'approved' | 'rejected';
  user: { id: string; name: string; avatar: string };
  target: { id: string; name: string; type: string };
  timestamp: string;
  details?: string;
  metadata?: Record<string, string>;
}

interface ActivityFeedProps {
  slices: Slice[];
  intents: Intent[];
  artifacts: Artifact[];
  onSliceClick?: (slice: Slice) => void;
  onIntentClick?: (intent: Intent) => void;
  onArtifactClick?: (artifact: Artifact) => void;
}

export function ActivityFeed({
  slices,
  intents,
  artifacts,
  onSliceClick,
  onIntentClick,
  onArtifactClick,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<'all' | 'slices' | 'prs' | 'comments'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Generate activity from data
  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Generate activities from slices
    slices.forEach(slice => {
      // Created activity
      items.push({
        id: `${slice.id}-created`,
        type: 'slice',
        action: 'created',
        user: slice.assignee,
        target: { id: slice.id, name: slice.name, type: 'slice' },
        timestamp: slice.createdAt,
      });

      // Status changes
      if (slice.status === 'completed') {
        items.push({
          id: `${slice.id}-completed`,
          type: 'slice',
          action: 'completed',
          user: slice.assignee,
          target: { id: slice.id, name: slice.name, type: 'slice' },
          timestamp: slice.updatedAt,
        });
      }

      if (slice.status === 'blocked') {
        items.push({
          id: `${slice.id}-blocked`,
          type: 'slice',
          action: 'blocked',
          user: slice.assignee,
          target: { id: slice.id, name: slice.name, type: 'slice' },
          timestamp: slice.updatedAt,
          details: slice.blockedReason,
        });
      }

      // PR activities
      slice.pullRequests?.forEach(pr => {
        if (pr.status === 'merged') {
          items.push({
            id: `${slice.id}-pr-${pr.number}-merged`,
            type: 'pr',
            action: 'merged',
            user: slice.assignee,
            target: { id: `pr-${pr.number}`, name: `PR #${pr.number}`, type: 'pr' },
            timestamp: slice.updatedAt,
            metadata: { sliceId: slice.id, sliceName: slice.name },
          });
        }
      });

      // Linked to intent
      if (slice.linkedIntent) {
        const intent = intents.find(i => i.id === slice.linkedIntent);
        if (intent) {
          items.push({
            id: `${slice.id}-linked-${intent.id}`,
            type: 'slice',
            action: 'linked',
            user: slice.assignee,
            target: { id: slice.id, name: slice.name, type: 'slice' },
            timestamp: slice.updatedAt,
            details: `Linked to ${intent.name}`,
          });
        }
      }
    });

    // Generate activities from intents
    intents.forEach(intent => {
      items.push({
        id: `${intent.id}-created`,
        type: 'intent',
        action: 'created',
        user: { id: intent.createdBy, name: intent.createdBy, avatar: intent.createdBy.slice(0, 2).toUpperCase() },
        target: { id: intent.id, name: intent.name, type: 'intent' },
        timestamp: intent.createdAt,
      });
    });

    // Generate activities from artifacts
    artifacts.forEach(artifact => {
      items.push({
        id: `${artifact.id}-created`,
        type: 'artifact',
        action: 'created',
        user: { id: artifact.createdBy, name: artifact.createdBy, avatar: artifact.createdBy.slice(0, 2).toUpperCase() },
        target: { id: artifact.id, name: artifact.name, type: 'artifact' },
        timestamp: artifact.createdAt,
      });

      artifact.reviews?.forEach(review => {
        items.push({
          id: `${artifact.id}-review-${review.id}`,
          type: 'review',
          action: review.status === 'approved' ? 'approved' : review.status === 'changes-requested' ? 'rejected' : 'commented',
          user: { id: review.reviewer, name: review.reviewer, avatar: review.reviewer.slice(0, 2).toUpperCase() },
          target: { id: artifact.id, name: artifact.name, type: 'artifact' },
          timestamp: review.timestamp,
          details: review.comments,
        });
      });
    });

    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [slices, intents, artifacts]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (filter === 'slices') {
      result = result.filter(a => a.type === 'slice');
    } else if (filter === 'prs') {
      result = result.filter(a => a.type === 'pr' || a.type === 'commit');
    } else if (filter === 'comments') {
      result = result.filter(a => a.type === 'comment' || a.type === 'review');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.target.name.toLowerCase().includes(query) ||
          a.user.name.toLowerCase().includes(query) ||
          a.details?.toLowerCase().includes(query)
      );
    }

    return result.slice(0, 50); // Limit to 50 items
  }, [activities, filter, searchQuery]);

  // Group by day
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};

    filteredActivities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday';
      } else {
        key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  const actionIcons = {
    created: Plus,
    updated: Edit3,
    deleted: Trash2,
    completed: CheckCircle,
    blocked: AlertCircle,
    linked: Link2,
    commented: MessageSquare,
    merged: GitPullRequest,
    approved: CheckCircle,
    rejected: XCircle,
  };

  const actionColors = {
    created: 'text-blue-400',
    updated: 'text-yellow-400',
    deleted: 'text-red-400',
    completed: 'text-green-400',
    blocked: 'text-red-400',
    linked: 'text-purple-400',
    commented: 'text-cyan-400',
    merged: 'text-green-400',
    approved: 'text-green-400',
    rejected: 'text-orange-400',
  };

  const typeIcons = {
    slice: Activity,
    intent: Target,
    artifact: FileText,
    comment: MessageSquare,
    pr: GitPullRequest,
    commit: GitCommit,
    review: MessageSquare,
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleItemClick = (activity: ActivityItem) => {
    if (activity.target.type === 'slice') {
      const slice = slices.find(s => s.id === activity.target.id);
      if (slice) onSliceClick?.(slice);
    } else if (activity.target.type === 'intent') {
      const intent = intents.find(i => i.id === activity.target.id);
      if (intent) onIntentClick?.(intent);
    } else if (activity.target.type === 'artifact') {
      const artifact = artifacts.find(a => a.id === activity.target.id);
      if (artifact) onArtifactClick?.(artifact);
    }
  };

  return (
    <div className="flex flex-col h-full bg-claude-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-claude-primary-400" />
          <h2 className="text-sm font-semibold text-claude-neutral-100">Activity</h2>
        </div>
        <button
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          className={clsx(
            'p-1.5 rounded-lg transition-colors',
            notificationsEnabled
              ? 'text-claude-primary-400 bg-claude-primary-500/20'
              : 'text-claude-neutral-500 hover:text-claude-neutral-300'
          )}
        >
          {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-2 space-y-2 border-b border-claude-neutral-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'slices', 'prs', 'comments'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-2 py-1 text-xs rounded-md transition-colors capitalize',
                filter === f
                  ? 'bg-claude-primary-500/20 text-claude-primary-400'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-auto">
        {Object.entries(groupedActivities).map(([day, items]) => (
          <div key={day}>
            <div className="sticky top-0 px-4 py-2 bg-claude-neutral-850 text-xs font-medium text-claude-neutral-500">
              {day}
            </div>
            <div className="space-y-1 p-2">
              {items.map(activity => {
                const ActionIcon = actionIcons[activity.action];
                const TypeIcon = typeIcons[activity.type];

                return (
                  <button
                    key={activity.id}
                    onClick={() => handleItemClick(activity)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-claude-neutral-800 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-claude-neutral-700 flex items-center justify-center text-xs font-medium text-claude-neutral-300 flex-shrink-0">
                      {activity.user.avatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium text-claude-neutral-200">
                          {activity.user.name}
                        </span>
                        <ActionIcon className={clsx('w-3 h-3', actionColors[activity.action])} />
                        <span className="text-claude-neutral-400">
                          {activity.action}
                        </span>
                        <TypeIcon className="w-3 h-3 text-claude-neutral-500" />
                      </div>
                      <p className="text-sm text-claude-neutral-300 truncate">
                        {activity.target.name}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-claude-neutral-500 truncate mt-0.5">
                          {activity.details}
                        </p>
                      )}
                    </div>

                    {/* Time */}
                    <span className="text-xs text-claude-neutral-500 flex-shrink-0">
                      {formatTime(activity.timestamp)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="flex items-center justify-center h-48 text-claude-neutral-500">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
