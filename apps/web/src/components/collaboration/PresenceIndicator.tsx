/**
 * PresenceIndicator - Real-time collaboration awareness
 * Shows who's viewing or editing the same items
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Users,
  Eye,
  Edit3,
  MessageCircle,
  Video,
  Phone,
  Share2,
  Sparkles,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentView?: string;
  currentItem?: string;
  isEditing?: boolean;
  lastSeen?: string;
}

interface PresenceIndicatorProps {
  currentItemId?: string;
  currentItemType?: 'slice' | 'intent' | 'artifact' | 'doc';
  compact?: boolean;
}

// Mock team members for demo
const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    avatar: 'SC',
    status: 'online',
    currentView: 'Board',
    currentItem: 'slice-apigw-234',
    isEditing: true,
  },
  {
    id: 'user-2',
    name: 'Mike Johnson',
    avatar: 'MJ',
    status: 'online',
    currentView: 'List',
    currentItem: 'slice-auth-123',
  },
  {
    id: 'user-3',
    name: 'Emily Davis',
    avatar: 'ED',
    status: 'away',
    currentView: 'Timeline',
    lastSeen: '5m ago',
  },
  {
    id: 'user-4',
    name: 'Alex Kim',
    avatar: 'AK',
    status: 'busy',
    currentView: 'Canvas',
    currentItem: 'intent-api-gateway',
  },
  {
    id: 'user-5',
    name: 'James Wilson',
    avatar: 'JW',
    status: 'offline',
    lastSeen: '2h ago',
  },
];

export function PresenceIndicator({
  currentItemId,
  currentItemType,
  compact = false,
}: PresenceIndicatorProps) {
  const [members] = useState<TeamMember[]>(mockTeamMembers);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Members viewing same item
  const membersOnSameItem = useMemo(() => {
    if (!currentItemId) return [];
    return members.filter(m => m.currentItem === currentItemId && m.status !== 'offline');
  }, [members, currentItemId]);

  // All online members
  const onlineMembers = useMemo(
    () => members.filter(m => m.status !== 'offline'),
    [members]
  );

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-claude-neutral-500',
  };

  const statusLabels = {
    online: 'Online',
    away: 'Away',
    busy: 'Do not disturb',
    offline: 'Offline',
  };

  // Compact avatar stack
  if (compact) {
    const displayMembers = membersOnSameItem.length > 0 ? membersOnSameItem : onlineMembers.slice(0, 3);
    const remainingCount = onlineMembers.length - displayMembers.length;

    return (
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {displayMembers.slice(0, 3).map(member => (
            <div
              key={member.id}
              className="relative group"
              title={member.name}
            >
              <div className="w-7 h-7 rounded-full bg-claude-neutral-700 border-2 border-claude-neutral-900 flex items-center justify-center text-xs font-medium text-claude-neutral-300 cursor-pointer hover:z-10 hover:ring-2 hover:ring-claude-primary-500 transition-all">
                {member.avatar}
              </div>
              <span className={clsx(
                'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-claude-neutral-900',
                statusColors[member.status]
              )} />
              {member.isEditing && (
                <span className="absolute -top-1 -right-1 p-0.5 bg-blue-500 rounded-full">
                  <Edit3 className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
          ))}
        </div>
        {remainingCount > 0 && (
          <span className="ml-2 text-xs text-claude-neutral-500">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  }

  // Full presence panel
  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          showDetails
            ? 'bg-claude-primary-500/20 text-claude-primary-400'
            : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
        )}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm">{onlineMembers.length} online</span>
        <div className="flex -space-x-1.5">
          {onlineMembers.slice(0, 3).map(member => (
            <div
              key={member.id}
              className={clsx(
                'w-5 h-5 rounded-full border border-claude-neutral-900 flex items-center justify-center text-[10px] font-medium',
                member.status === 'online' ? 'bg-green-500/20 text-green-400' :
                member.status === 'away' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              )}
            >
              {member.avatar}
            </div>
          ))}
        </div>
      </button>

      {/* Dropdown Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-claude-neutral-850 rounded-xl border border-claude-neutral-800 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
            <span className="text-sm font-medium text-claude-neutral-200">Team Activity</span>
            {currentItemId && membersOnSameItem.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {membersOnSameItem.length} here
              </span>
            )}
          </div>

          {/* Members viewing same item */}
          {currentItemId && membersOnSameItem.length > 0 && (
            <div className="p-3 bg-blue-500/5 border-b border-claude-neutral-800">
              <div className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                <Eye className="w-3 h-3" />
                <span>Also viewing this {currentItemType}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {membersOnSameItem.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-2 py-1 bg-claude-neutral-800 rounded-lg"
                  >
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full bg-claude-neutral-700 flex items-center justify-center text-xs font-medium text-claude-neutral-300">
                        {member.avatar}
                      </div>
                      <span className={clsx(
                        'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-claude-neutral-800',
                        statusColors[member.status]
                      )} />
                    </div>
                    <span className="text-xs text-claude-neutral-300">{member.name.split(' ')[0]}</span>
                    {member.isEditing && (
                      <Edit3 className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All members list */}
          <div className="max-h-64 overflow-auto">
            {members.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-claude-neutral-800 transition-colors text-left',
                  selectedMember?.id === member.id && 'bg-claude-neutral-800'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                    member.status === 'offline' ? 'bg-claude-neutral-700 text-claude-neutral-500' : 'bg-claude-neutral-700 text-claude-neutral-300'
                  )}>
                    {member.avatar}
                  </div>
                  <span className={clsx(
                    'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-claude-neutral-850',
                    statusColors[member.status]
                  )} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-sm font-medium truncate',
                      member.status === 'offline' ? 'text-claude-neutral-500' : 'text-claude-neutral-200'
                    )}>
                      {member.name}
                    </span>
                    {member.isEditing && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded">
                        <Edit3 className="w-2.5 h-2.5" />
                        Editing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-claude-neutral-500">
                    {member.status === 'offline' ? (
                      <span>Last seen {member.lastSeen}</span>
                    ) : member.currentView ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>{member.currentView}</span>
                      </>
                    ) : (
                      <span>{statusLabels[member.status]}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {member.status !== 'offline' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button className="p-1.5 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-700 rounded transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Footer with quick actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-claude-neutral-800 bg-claude-neutral-900/50">
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors" title="Start call">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors" title="Start video call">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors" title="Share screen">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-claude-neutral-400 hover:text-purple-400 transition-colors">
              <Sparkles className="w-3 h-3" />
              Start CoWork session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Smaller inline indicator for item cards
export function ItemPresence({
  itemId,
  size = 'sm'
}: {
  itemId: string;
  size?: 'sm' | 'md';
}) {
  const [viewers] = useState<TeamMember[]>(
    mockTeamMembers.filter(m => m.currentItem === itemId && m.status !== 'offline')
  );

  if (viewers.length === 0) return null;

  const sizes = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
  };

  return (
    <div className="flex items-center -space-x-1.5">
      {viewers.slice(0, 2).map(viewer => (
        <div
          key={viewer.id}
          className={clsx(
            'rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center font-medium text-blue-400',
            sizes[size]
          )}
          title={`${viewer.name} is ${viewer.isEditing ? 'editing' : 'viewing'}`}
        >
          {viewer.avatar}
        </div>
      ))}
      {viewers.length > 2 && (
        <div className={clsx(
          'rounded-full bg-claude-neutral-700 border border-claude-neutral-600 flex items-center justify-center font-medium text-claude-neutral-400',
          sizes[size]
        )}>
          +{viewers.length - 2}
        </div>
      )}
    </div>
  );
}
