/**
 * NotificationsCenter - Smart notification hub with priorities and actions
 * Groups related notifications, supports inline actions
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Settings,
  AlertCircle,
  GitPullRequest,
  MessageSquare,
  AtSign,
  Target,
  Calendar,
  Zap,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'mention' | 'pr_review' | 'status_change' | 'comment' | 'deadline' | 'assigned' | 'blocked' | 'completed' | 'automation';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
  relatedItem?: {
    type: 'slice' | 'intent' | 'artifact';
    id: string;
    name: string;
  };
  actions?: {
    label: string;
    action: () => void;
    primary?: boolean;
  }[];
}

interface NotificationsCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'mention',
    title: 'Sarah mentioned you in APIGW-234',
    description: '@john can you review the gRPC implementation?',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    priority: 'high',
    relatedItem: { type: 'slice', id: 'slice-1', name: 'gRPC Protocol Support' },
  },
  {
    id: '2',
    type: 'pr_review',
    title: 'PR ready for your review',
    description: 'feat: Add rate limiting middleware (#456)',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
    priority: 'high',
    relatedItem: { type: 'slice', id: 'slice-2', name: 'Rate Limiting Middleware' },
  },
  {
    id: '3',
    type: 'blocked',
    title: 'Item blocked',
    description: 'AUTH-123 is now blocked: Waiting for API design approval',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: false,
    priority: 'medium',
    relatedItem: { type: 'slice', id: 'slice-3', name: 'OAuth Integration' },
  },
  {
    id: '4',
    type: 'deadline',
    title: 'Deadline approaching',
    description: 'API Gateway v3 launch is due in 3 days',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    read: true,
    priority: 'medium',
    relatedItem: { type: 'intent', id: 'intent-1', name: 'API Gateway v3' },
  },
  {
    id: '5',
    type: 'completed',
    title: 'Item completed',
    description: 'CACHE-789 was marked as completed by Mike',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    read: true,
    priority: 'low',
  },
  {
    id: '6',
    type: 'automation',
    title: 'Automation triggered',
    description: 'Auto-assign rule assigned 3 items to reviewers',
    timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    read: true,
    priority: 'low',
  },
];

export function NotificationsCenter({ isOpen, onClose }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'reviews'>('all');
  const [isMuted, setIsMuted] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'mentions':
        return notifications.filter(n => n.type === 'mention' || n.type === 'comment');
      case 'reviews':
        return notifications.filter(n => n.type === 'pr_review');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    filteredNotifications.forEach(n => {
      const date = new Date(n.timestamp);
      if (date >= todayStart) {
        today.push(n);
      } else if (date >= yesterdayStart) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    return { today, yesterday, older };
  }, [filteredNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const typeIcons = {
    mention: AtSign,
    pr_review: GitPullRequest,
    status_change: Target,
    comment: MessageSquare,
    deadline: Calendar,
    assigned: Target,
    blocked: AlertCircle,
    completed: Check,
    automation: Zap,
  };

  const typeColors = {
    mention: 'text-blue-400',
    pr_review: 'text-purple-400',
    status_change: 'text-yellow-400',
    comment: 'text-cyan-400',
    deadline: 'text-orange-400',
    assigned: 'text-green-400',
    blocked: 'text-red-400',
    completed: 'text-green-400',
    automation: 'text-yellow-400',
  };

  const priorityBorders = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-claude-neutral-600',
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const renderNotificationGroup = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-4 py-2 text-xs font-medium text-claude-neutral-500 uppercase tracking-wider sticky top-0 bg-claude-neutral-900">
          {title}
        </h3>
        <div className="space-y-1 px-2">
          {items.map(notification => {
            const Icon = typeIcons[notification.type];
            return (
              <div
                key={notification.id}
                className={clsx(
                  'group relative flex items-start gap-3 p-3 rounded-lg border-l-2 transition-colors',
                  priorityBorders[notification.priority],
                  notification.read
                    ? 'bg-claude-neutral-900 hover:bg-claude-neutral-850'
                    : 'bg-claude-neutral-850 hover:bg-claude-neutral-800'
                )}
              >
                {/* Type Icon */}
                <div className={clsx('p-1.5 rounded-lg bg-claude-neutral-800', !notification.read && 'bg-claude-neutral-700')}>
                  <Icon className={clsx('w-4 h-4', typeColors[notification.type])} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      'text-sm',
                      notification.read ? 'text-claude-neutral-400' : 'text-claude-neutral-200 font-medium'
                    )}>
                      {notification.title}
                    </p>
                    <span className="text-xs text-claude-neutral-500 whitespace-nowrap">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-claude-neutral-500 mt-0.5 truncate">
                    {notification.description}
                  </p>

                  {/* Related Item */}
                  {notification.relatedItem && (
                    <button className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-claude-neutral-800 hover:bg-claude-neutral-700 rounded text-xs text-claude-neutral-300 transition-colors">
                      <Target className="w-3 h-3" />
                      {notification.relatedItem.name}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1.5 text-claude-neutral-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-claude-neutral-900 border-l border-claude-neutral-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-claude-neutral-300" />
            <h2 className="text-sm font-semibold text-claude-neutral-100">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                isMuted
                  ? 'text-claude-neutral-500 bg-claude-neutral-800'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-claude-neutral-800">
          {(['all', 'unread', 'mentions', 'reviews'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 text-xs rounded-lg transition-colors capitalize',
                filter === f
                  ? 'bg-claude-primary-500/20 text-claude-primary-400'
                  : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
              )}
            >
              {f}
            </button>
          ))}
          <div className="flex-1" />
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-auto py-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-claude-neutral-500">
              <Bell className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            <>
              {renderNotificationGroup('Today', groupedNotifications.today)}
              {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
              {renderNotificationGroup('Older', groupedNotifications.older)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
          <button className="w-full py-2 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors">
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
}
