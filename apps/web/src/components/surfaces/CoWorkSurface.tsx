/**
 * CoWork Surface - Real-time collaboration with Claude
 */

import { Users, Video, Mic, ScreenShare, MessageSquare, Hand, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isAI?: boolean;
  isSpeaking?: boolean;
}

interface CoWorkSurfaceProps {
  projectName?: string;
}

const mockParticipants: Participant[] = [
  { id: '1', name: 'Claude', isAI: true, isSpeaking: true },
  { id: '2', name: 'You', avatar: 'Y' },
];

export function CoWorkSurface({ projectName }: CoWorkSurfaceProps) {
  return (
    <div className="flex h-full bg-claude-neutral-900">
      {/* Main workspace */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
          <div>
            <h2 className="font-semibold text-white">CoWork Session</h2>
            <p className="text-sm text-claude-neutral-400">
              {projectName || 'Project'} workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-claude-neutral-800 rounded-lg transition-colors">
              <Mic className="w-5 h-5 text-claude-neutral-400" />
            </button>
            <button className="p-2 hover:bg-claude-neutral-800 rounded-lg transition-colors">
              <Video className="w-5 h-5 text-claude-neutral-400" />
            </button>
            <button className="p-2 hover:bg-claude-neutral-800 rounded-lg transition-colors">
              <ScreenShare className="w-5 h-5 text-claude-neutral-400" />
            </button>
            <button className="p-2 hover:bg-claude-neutral-800 rounded-lg transition-colors">
              <Hand className="w-5 h-5 text-claude-neutral-400" />
            </button>
          </div>
        </div>

        {/* Shared workspace area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">
              Work together in real-time
            </h3>
            <p className="text-claude-neutral-400 mb-8 leading-relaxed">
              CoWork lets you collaborate with Claude on complex tasks. Share your screen,
              discuss ideas, and work on artifacts together. Claude can observe, suggest,
              and help you build.
            </p>
            <div className="grid grid-cols-3 gap-4 text-left">
              <FeatureCard
                icon={<ScreenShare className="w-5 h-5" />}
                title="Screen Sharing"
                description="Share your screen for Claude to see and understand your work"
              />
              <FeatureCard
                icon={<MessageSquare className="w-5 h-5" />}
                title="Live Discussion"
                description="Talk through problems and get real-time guidance"
              />
              <FeatureCard
                icon={<Sparkles className="w-5 h-5" />}
                title="Active Assistance"
                description="Claude can suggest, edit, and create alongside you"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Participants panel */}
      <div className="w-64 border-l border-claude-neutral-800 flex flex-col">
        <div className="p-4 border-b border-claude-neutral-800">
          <h3 className="font-medium text-claude-neutral-300">
            Participants ({mockParticipants.length})
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {mockParticipants.map((participant) => (
            <div
              key={participant.id}
              className={clsx(
                'flex items-center gap-3 p-2 rounded-lg',
                participant.isSpeaking && 'bg-claude-primary-900/30 ring-1 ring-claude-primary-500'
              )}
            >
              {participant.isAI ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-claude-neutral-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-claude-neutral-300">
                    {participant.avatar || participant.name[0]}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-claude-neutral-200">
                    {participant.name}
                  </span>
                  {participant.isAI && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-claude-primary-900/50 text-claude-primary-400">
                      AI
                    </span>
                  )}
                </div>
                {participant.isSpeaking && (
                  <span className="text-xs text-claude-primary-400">Speaking...</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-claude-neutral-800">
          <button className="w-full py-2 px-4 bg-claude-primary-500 hover:bg-claude-primary-600 text-white rounded-lg font-medium transition-colors">
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-claude-neutral-800/50 border border-claude-neutral-700">
      <div className="text-claude-primary-400 mb-2">{icon}</div>
      <h4 className="font-medium text-claude-neutral-200 mb-1">{title}</h4>
      <p className="text-xs text-claude-neutral-400">{description}</p>
    </div>
  );
}
