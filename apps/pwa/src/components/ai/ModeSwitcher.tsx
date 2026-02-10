import React, { useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  Bot,
  Bug,
  ListChecks,
  Users,
  ListOrdered,
  GitBranch,
  Database,
  Palette,
} from 'lucide-react';
import { AiMode, AI_MODE_COLORS, AI_MODE_LABELS } from '../../types';
import { useApp } from '../../store/AppContext';

const MODE_ICONS: Record<AiMode, React.ReactNode> = {
  [AiMode.AGENT]: <Bot size={14} />,
  [AiMode.DEBUG]: <Bug size={14} />,
  [AiMode.PLAN]: <ListChecks size={14} />,
  [AiMode.SWARM]: <Users size={14} />,
  [AiMode.QUEUE]: <ListOrdered size={14} />,
  [AiMode.SESSION]: <GitBranch size={14} />,
  [AiMode.CONTEXT]: <Database size={14} />,
  [AiMode.DESIGN]: <Palette size={14} />,
};

const MODES = Object.values(AiMode);

export function ModeSwitcher() {
  const { state, actions } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active chip into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const chip = activeRef.current;
      const containerLeft = container.scrollLeft;
      const containerRight = containerLeft + container.clientWidth;
      const chipLeft = chip.offsetLeft;
      const chipRight = chipLeft + chip.offsetWidth;

      if (chipLeft < containerLeft + 8) {
        container.scrollTo({ left: chipLeft - 8, behavior: 'smooth' });
      } else if (chipRight > containerRight - 8) {
        container.scrollTo({
          left: chipRight - container.clientWidth + 8,
          behavior: 'smooth',
        });
      }
    }
  }, [state.currentMode]);

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar border-b border-border"
      role="tablist"
      aria-label="AI Mode selector"
    >
      {MODES.map((mode) => {
        const isActive = state.currentMode === mode;
        const color = AI_MODE_COLORS[mode];

        return (
          <button
            key={mode}
            ref={isActive ? activeRef : undefined}
            onClick={() => actions.setMode(mode)}
            className={clsx(
              'mode-chip flex-shrink-0',
              isActive && 'active'
            )}
            style={{
              backgroundColor: isActive ? `${color}20` : 'transparent',
              color: isActive ? color : 'var(--text-muted)',
              borderColor: isActive ? `${color}40` : 'transparent',
            }}
            role="tab"
            aria-selected={isActive}
            aria-label={`${AI_MODE_LABELS[mode]} mode`}
          >
            {MODE_ICONS[mode]}
            <span>{AI_MODE_LABELS[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
