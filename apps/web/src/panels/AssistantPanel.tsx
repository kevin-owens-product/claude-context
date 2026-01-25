/**
 * AssistantPanel - AI Assistant sidebar
 * Modes: Chat, Code, Review, Plan
 * Has full context access and can create items
 */

import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  X,
  MessageSquare,
  Terminal,
  Eye,
  Map,
  Send,
  Plus,
  Sparkles,
  Target,
  FileText,
  Layers,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useWorkspace, type AssistantMode } from '../contexts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
}

interface MessageAction {
  type: 'create_slice' | 'create_artifact' | 'link_intent' | 'pin_context';
  label: string;
  data: Record<string, unknown>;
}

const modes: { id: AssistantMode; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'code', label: 'Code', icon: <Terminal className="w-4 h-4" /> },
  { id: 'review', label: 'Review', icon: <Eye className="w-4 h-4" /> },
  { id: 'plan', label: 'Plan', icon: <Map className="w-4 h-4" /> },
];

interface AssistantPanelProps {
  onClose: () => void;
  onCreateSlice?: (name: string, description: string) => void;
}

export function AssistantPanel({ onClose, onCreateSlice }: AssistantPanelProps) {
  const {
    assistantMode,
    setAssistantMode,
    currentProject,
    selectedSlices,
    pinnedItems,
    projectIntents,
    projectContext,
    pinItem,
  } = useWorkspace();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Claude, your AI assistant for ${currentProject?.name || 'this project'}. I have access to your project context, intents, and work items. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage = generateResponse(input, {
        project: currentProject,
        selectedSlices,
        pinnedItems,
        intents: projectIntents,
        context: projectContext,
      });
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = (action: MessageAction) => {
    switch (action.type) {
      case 'create_slice':
        onCreateSlice?.(
          action.data.name as string,
          action.data.description as string
        );
        break;
      case 'pin_context':
        pinItem({
          id: action.data.id as string,
          type: action.data.type as 'intent' | 'context' | 'artifact',
          name: action.data.name as string,
          subtype: action.data.subtype as string,
        });
        break;
    }
  };

  return (
    <div className="w-96 h-full flex flex-col bg-claude-neutral-900 border-l border-claude-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-claude-primary-400" />
          <span className="font-medium text-claude-neutral-100">Claude</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-claude-neutral-800">
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => setAssistantMode(mode.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              assistantMode === mode.id
                ? 'bg-claude-neutral-800 text-claude-neutral-100'
                : 'text-claude-neutral-500 hover:text-claude-neutral-300'
            )}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Context Summary */}
      <div className="px-3 py-2 border-b border-claude-neutral-800 bg-claude-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-claude-neutral-500">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-500" />
            {projectIntents.length} intents
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-500" />
            {projectContext.length} docs
          </span>
          {selectedSlices.length > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-500" />
              {selectedSlices.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onAction={handleAction}
          />
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-claude-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Claude is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t border-claude-neutral-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <QuickActionButton
            label="Create slice"
            icon={<Plus className="w-3 h-3" />}
            onClick={() => setInput('Create a new slice for ')}
          />
          <QuickActionButton
            label="Summarize"
            icon={<FileText className="w-3 h-3" />}
            onClick={() => setInput('Summarize the current project status')}
          />
          <QuickActionButton
            label="Review code"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => {
              setAssistantMode('review');
              setInput('Review the open pull requests');
            }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-claude-neutral-800">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude anything..."
            className="w-full px-4 py-3 pr-12 text-sm bg-claude-neutral-800 rounded-lg border border-claude-neutral-700 text-claude-neutral-100 placeholder-claude-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-claude-primary-500"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={clsx(
              'absolute right-2 bottom-2 p-2 rounded-lg transition-colors',
              input.trim() && !isTyping
                ? 'bg-claude-primary-500 text-white hover:bg-claude-primary-400'
                : 'bg-claude-neutral-700 text-claude-neutral-500'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onAction: (action: MessageAction) => void;
}

function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        'flex gap-3',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isAssistant
            ? 'bg-gradient-to-br from-claude-primary-400 to-claude-primary-600'
            : 'bg-claude-neutral-700'
        )}
      >
        {isAssistant ? (
          <Sparkles className="w-4 h-4 text-white" />
        ) : (
          <span className="text-xs text-claude-neutral-300 font-medium">
            You
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className={clsx(
          'flex-1 max-w-[85%]',
          !isAssistant && 'flex flex-col items-end'
        )}
      >
        <div
          className={clsx(
            'rounded-lg px-4 py-2.5 text-sm',
            isAssistant
              ? 'bg-claude-neutral-800 text-claude-neutral-100'
              : 'bg-claude-primary-500/20 text-claude-primary-100'
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-claude-neutral-700">
              {message.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onAction(action)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-claude-neutral-700 hover:bg-claude-neutral-600 text-claude-neutral-200 rounded-md transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message actions */}
        {isAssistant && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={handleCopy}
              className="p-1 text-claude-neutral-600 hover:text-claude-neutral-400 transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            <button
              className="p-1 text-claude-neutral-600 hover:text-claude-neutral-400 transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickActionButton({ label, icon, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 bg-claude-neutral-800 hover:bg-claude-neutral-700 rounded-full transition-colors whitespace-nowrap"
    >
      {icon}
      {label}
    </button>
  );
}

// Helper function to generate mock responses
function generateResponse(
  input: string,
  context: {
    project?: { name: string } | null;
    selectedSlices: Array<{ name: string; shortId: string }>;
    pinnedItems: Array<{ name: string }>;
    intents: Array<{ name: string; type: string }>;
    context: Array<{ name: string }>;
  }
): Message {
  const lowerInput = input.toLowerCase();

  // Create slice intent
  if (lowerInput.includes('create') && lowerInput.includes('slice')) {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I can help you create a new slice. Based on the project context, here's what I suggest:\n\n**Name:** Implement requested feature\n**Status:** Ready\n**Priority:** Medium\n\nWould you like me to create this slice, or would you prefer to modify these details first?`,
      timestamp: new Date(),
      actions: [
        {
          type: 'create_slice',
          label: 'Create Slice',
          data: {
            name: 'Implement requested feature',
            description: 'Feature implementation based on user request',
          },
        },
      ],
    };
  }

  // Summarize intent
  if (lowerInput.includes('summarize') || lowerInput.includes('status')) {
    const goals = context.intents.filter(i => i.type === 'goal');
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Here's a summary of **${context.project?.name || 'the project'}**:\n\n**Active Goals:** ${goals.length}\n**Context Documents:** ${context.context.length}\n**Pinned Items:** ${context.pinnedItems.length}\n\n${context.selectedSlices.length > 0 ? `\nYou currently have ${context.selectedSlices.length} slice(s) selected.` : ''}\n\nWould you like me to dive deeper into any specific area?`,
      timestamp: new Date(),
    };
  }

  // Default response
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: `I understand you're asking about "${input}". Let me help you with that.\n\nBased on the current project context, I can assist with:\n\n1. Creating or updating slices\n2. Reviewing project intents and constraints\n3. Analyzing context documents\n4. Planning implementation approaches\n\nWhat would you like to focus on?`,
    timestamp: new Date(),
  };
}
