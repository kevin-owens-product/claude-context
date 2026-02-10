import React from 'react';
import clsx from 'clsx';
import { User, Bot, Wrench, Copy, Check } from 'lucide-react';
import type { ChatMessageData, CodeBlock } from '../../types';
import { AI_MODE_COLORS } from '../../types';

interface ChatMessageProps {
  message: ChatMessageData;
}

function CodeBlockDisplay({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2 text-xs text-text-muted">
        <span>{block.filename || block.language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 p-1 rounded hover:bg-surface-3 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 bg-surface-1 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  // Simple markdown-like rendering
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const language = lines[0]?.trim() || '';
      const code = lines.slice(1).join('\n');
      return (
        <CodeBlockDisplay
          key={index}
          block={{ language, code }}
        />
      );
    }

    // Render inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={index}>
        {inlineParts.map((inline, i) => {
          if (inline.startsWith('`') && inline.endsWith('`')) {
            return (
              <code
                key={i}
                className="px-1.5 py-0.5 rounded bg-surface-2 text-indigo-300 text-sm font-mono"
              >
                {inline.slice(1, -1)}
              </code>
            );
          }
          // Bold
          const boldParts = inline.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return (
                <strong key={`${i}-${j}`} className="font-semibold">
                  {bp.slice(2, -2)}
                </strong>
              );
            }
            return bp;
          });
        })}
      </span>
    );
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  const roleIcon = isUser ? (
    <User size={16} />
  ) : isTool ? (
    <Wrench size={16} />
  ) : (
    <Bot size={16} />
  );

  const modeColor = AI_MODE_COLORS[message.mode];

  return (
    <div
      className={clsx(
        'flex gap-3 px-4 py-3 animate-fade-in',
        isUser ? 'bg-transparent' : 'bg-surface-1/50'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5',
          isUser
            ? 'bg-surface-2 text-text-secondary'
            : 'text-white'
        )}
        style={!isUser ? { backgroundColor: modeColor } : undefined}
      >
        {roleIcon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-text-secondary">
            {isUser ? 'You' : isSystem ? 'System' : isTool ? 'Tool' : 'Assistant'}
          </span>
          <span className="text-[10px] text-text-muted">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.tokens && (
            <span className="text-[10px] text-text-muted">
              {message.tokens} tokens
            </span>
          )}
        </div>
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
          {renderContent(message.content)}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5" />
          )}
        </div>
        {message.codeBlocks?.map((block, i) => (
          <CodeBlockDisplay key={i} block={block} />
        ))}
      </div>
    </div>
  );
}
