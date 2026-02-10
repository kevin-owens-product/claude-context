import React, { useRef, useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Send, X, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { AiMode, AI_MODE_COLORS } from '../../types';
import type { ChatMessageData } from '../../types';
import { ModeSwitcher } from './ModeSwitcher';
import { ChatMessage } from './ChatMessage';
import { AgentMode } from './AgentMode';
import { DebugMode } from './DebugMode';
import { PlanMode } from './PlanMode';
import { SwarmMode } from './SwarmMode';
import { QueueMode } from './QueueMode';
import { SessionMode } from './SessionMode';
import { ContextMode } from './ContextMode';
import { DesignMode } from './DesignMode';
import { useBreakpoint } from '../../hooks/useMediaQuery';

const MODE_PANELS: Record<AiMode, React.ComponentType> = {
  [AiMode.AGENT]: AgentMode,
  [AiMode.DEBUG]: DebugMode,
  [AiMode.PLAN]: PlanMode,
  [AiMode.SWARM]: SwarmMode,
  [AiMode.QUEUE]: QueueMode,
  [AiMode.SESSION]: SessionMode,
  [AiMode.CONTEXT]: ContextMode,
  [AiMode.DESIGN]: DesignMode,
};

export function AiPanel() {
  const { state, actions } = useApp();
  const { isPhone } = useBreakpoint();
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentMode = state.currentMode;
  const ModePanel = MODE_PANELS[currentMode];
  const modeColor = AI_MODE_COLORS[currentMode];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages.length]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput,
      timestamp: Date.now(),
      mode: currentMode,
    };

    actions.addMessage(userMessage);
    setChatInput('');

    // Simulate assistant response
    setTimeout(() => {
      actions.addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I received your message in **${currentMode}** mode. Here's a simulated response.\n\nYou said: "${chatInput}"\n\nIn a production app, this would call the AI API with the appropriate mode-specific system prompt and context.`,
        timestamp: Date.now(),
        mode: currentMode,
        tokens: Math.floor(chatInput.length * 1.5),
      });
    }, 800);
  }, [chatInput, currentMode, actions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter messages for current mode
  const modeMessages = state.messages.filter((m) => m.mode === currentMode);

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: `${modeColor}30` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: modeColor }}
          />
          <h2 className="text-sm font-semibold" style={{ color: modeColor }}>
            AI Assistant
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
            aria-label={showChat ? 'Show mode panel' : 'Show chat'}
          >
            {showChat ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          {isPhone && (
            <button
              onClick={actions.toggleAiPanel}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
              aria-label="Close AI panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mode switcher */}
      <ModeSwitcher />

      {/* Content area - mode panel or chat */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {showChat ? (
          // Chat view
          <>
            <div className="flex-1 overflow-y-auto">
              {modeMessages.length > 0 ? (
                <>
                  {modeMessages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm p-6">
                  <p>No messages in this mode yet</p>
                  <p className="text-xs mt-1">Type a message below to start</p>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${currentMode} mode...`}
                  className="flex-1 px-3 py-2 bg-surface-1 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className={clsx(
                    'p-2.5 rounded-lg transition-all touch-target',
                    chatInput.trim()
                      ? 'text-white hover:opacity-90'
                      : 'bg-surface-2 text-text-muted cursor-not-allowed'
                  )}
                  style={
                    chatInput.trim()
                      ? { backgroundColor: modeColor }
                      : undefined
                  }
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Mode-specific panel
          <ModePanel />
        )}
      </div>
    </div>
  );
}
