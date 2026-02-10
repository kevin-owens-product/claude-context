import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { TerminalSquare, X, Minus } from 'lucide-react';
import { useApp } from '../../store/AppContext';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: number;
}

// Simple ANSI color parser
function parseAnsi(text: string): React.ReactNode[] {
  const ANSI_CODES: Record<string, string> = {
    '30': 'ansi-black',
    '31': 'ansi-red',
    '32': 'ansi-green',
    '33': 'ansi-yellow',
    '34': 'ansi-blue',
    '35': 'ansi-magenta',
    '36': 'ansi-cyan',
    '37': 'ansi-white',
    '90': 'ansi-bright-black',
    '91': 'ansi-bright-red',
    '92': 'ansi-bright-green',
    '93': 'ansi-bright-yellow',
    '94': 'ansi-bright-blue',
    '95': 'ansi-bright-magenta',
    '96': 'ansi-bright-cyan',
    '97': 'ansi-bright-white',
    '1': 'ansi-bold',
    '3': 'ansi-italic',
    '4': 'ansi-underline',
  };

  const parts: React.ReactNode[] = [];
  const regex = /\x1b\[(\d+(?:;\d+)*)m/g;
  let lastIndex = 0;
  let currentClasses: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this escape code
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push(
          <span key={`${lastIndex}`} className={currentClasses.join(' ')}>
            {textBefore}
          </span>
        );
      }
    }

    // Parse escape codes
    const codes = match[1].split(';');
    for (const code of codes) {
      if (code === '0') {
        currentClasses = [];
      } else if (ANSI_CODES[code]) {
        currentClasses.push(ANSI_CODES[code]);
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`${lastIndex}`} className={currentClasses.join(' ')}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [text];
}

// Simulated file system and commands
function executeCommand(command: string): { output: string; isError: boolean } {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      return {
        output: [
          'Available commands:',
          '  help          Show this help message',
          '  ls            List files',
          '  pwd           Print working directory',
          '  echo <text>   Print text',
          '  clear         Clear terminal',
          '  date          Show current date',
          '  whoami        Show current user',
          '  node -v       Show Node.js version',
          '  npm -v        Show npm version',
          '  cat <file>    Show file contents',
          '  history       Show command history',
          '',
          '\x1b[33mNote: This is a simulated terminal for demo purposes\x1b[0m',
        ].join('\n'),
        isError: false,
      };

    case 'ls':
      return {
        output: [
          '\x1b[34msrc/\x1b[0m    \x1b[34mnode_modules/\x1b[0m    \x1b[34mpublic/\x1b[0m',
          'package.json    tsconfig.json    README.md',
          'vite.config.ts  tailwind.config.js',
        ].join('\n'),
        isError: false,
      };

    case 'pwd':
      return { output: '/home/user/claude-context', isError: false };

    case 'echo':
      return { output: args.join(' '), isError: false };

    case 'date':
      return { output: new Date().toString(), isError: false };

    case 'whoami':
      return { output: 'claude-context-user', isError: false };

    case 'node':
      if (args[0] === '-v') return { output: 'v20.11.0', isError: false };
      return { output: 'node: use -v for version', isError: false };

    case 'npm':
      if (args[0] === '-v') return { output: '10.4.0', isError: false };
      return { output: 'npm: use -v for version', isError: false };

    case 'cat':
      if (!args[0]) return { output: 'cat: missing file operand', isError: true };
      if (args[0] === 'package.json') {
        return {
          output: '{\n  "name": "my-project",\n  "version": "1.0.0"\n}',
          isError: false,
        };
      }
      return { output: `cat: ${args[0]}: No such file or directory`, isError: true };

    case 'clear':
      return { output: '__CLEAR__', isError: false };

    case '':
      return { output: '', isError: false };

    default:
      return {
        output: `\x1b[31m${cmd}: command not found\x1b[0m\nType 'help' for available commands.`,
        isError: true,
      };
  }
}

export function Terminal() {
  const { actions } = useApp();
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '\x1b[36mClaude Context Terminal v1.0.0\x1b[0m\nType \x1b[33mhelp\x1b[0m for available commands.\n',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on click
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();

    // Add input line
    const inputLine: TerminalLine = {
      id: crypto.randomUUID(),
      type: 'input',
      content: trimmed,
      timestamp: Date.now(),
    };

    if (trimmed) {
      setHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    }

    const result = executeCommand(trimmed);

    if (result.output === '__CLEAR__') {
      setLines([]);
      setInput('');
      return;
    }

    const outputLine: TerminalLine = {
      id: crypto.randomUUID(),
      type: result.isError ? 'error' : 'output',
      content: result.output,
      timestamp: Date.now(),
    };

    setLines((prev) => [...prev, inputLine, ...(result.output ? [outputLine] : [])]);
    setInput('');
  }, [input]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length > 0) {
          const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex >= 0) {
          const newIndex = historyIndex + 1;
          if (newIndex >= history.length) {
            setHistoryIndex(-1);
            setInput('');
          } else {
            setHistoryIndex(newIndex);
            setInput(history[newIndex]);
          }
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        setLines([]);
      }
    },
    [handleSubmit, history, historyIndex]
  );

  return (
    <div className="flex flex-col h-full bg-surface-0 font-mono text-sm" onClick={focusInput}>
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-1 border-b border-border">
        <div className="flex items-center gap-2">
          <TerminalSquare size={14} className="text-emerald-400" />
          <span className="text-xs text-text-secondary">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLines([])}
            className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear terminal"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={actions.toggleTerminal}
            className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close terminal"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5"
      >
        {lines.map((line) => (
          <div key={line.id} className="terminal-line">
            {line.type === 'input' ? (
              <div className="flex items-center gap-1">
                <span className="ansi-green">$</span>
                <span className="text-text-primary">{line.content}</span>
              </div>
            ) : (
              <div
                className={clsx(
                  line.type === 'error' && 'text-red-400',
                  line.type === 'system' && 'text-text-secondary',
                  line.type === 'output' && 'text-text-secondary'
                )}
              >
                {parseAnsi(line.content)}
              </div>
            )}
          </div>
        ))}

        {/* Input line */}
        <div className="flex items-center gap-1 terminal-line">
          <span className="ansi-green">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-text-primary outline-none caret-emerald-400"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            aria-label="Terminal input"
          />
        </div>
      </div>
    </div>
  );
}
