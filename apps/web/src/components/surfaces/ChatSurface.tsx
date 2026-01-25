/**
 * Chat Surface - Claude Chat-like conversational interface
 */

import { useState } from 'react';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSurfaceProps {
  projectName?: string;
  sliceName?: string;
}

export function ChatSurface({ projectName, sliceName }: ChatSurfaceProps) {
  const contextMessage = sliceName
    ? `I'm working with you on "${sliceName}" within the ${projectName || 'project'} project. I have access to your project's context, intents, and guidelines.`
    : `I have access to your ${projectName || 'project'} context and can help you with development, writing, analysis, and more.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Claude. ${contextMessage} What would you like to work on?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you want to: "${input}". In a full implementation, I would use your project context to provide a helpful response. This is a demo of the unified Claude interface.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-claude-neutral-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-4 max-w-3xl',
              message.role === 'user' ? 'ml-auto' : ''
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-claude-primary-400 to-claude-primary-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={clsx(
                'rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-claude-primary-500 text-white'
                  : 'bg-claude-cream-100 dark:bg-claude-neutral-800 text-claude-neutral-800 dark:text-claude-neutral-100'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-claude-cream-300 dark:border-claude-neutral-800 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-claude-cream-100 dark:bg-claude-neutral-800 rounded-2xl p-3">
            <button className="p-2 text-claude-neutral-400 hover:text-claude-neutral-600 dark:hover:text-claude-neutral-300 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message Claude..."
              rows={1}
              className="flex-1 bg-transparent border-none resize-none focus:outline-none text-claude-neutral-800 dark:text-claude-neutral-100 placeholder-claude-neutral-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={clsx(
                'p-2 rounded-full transition-colors',
                input.trim()
                  ? 'bg-claude-primary-500 text-white hover:bg-claude-primary-600'
                  : 'bg-claude-neutral-200 dark:bg-claude-neutral-700 text-claude-neutral-400'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-center text-claude-neutral-400">
            Claude can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
}
