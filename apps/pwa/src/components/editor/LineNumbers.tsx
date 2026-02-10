import React from 'react';
import clsx from 'clsx';

interface LineNumbersProps {
  lineCount: number;
  activeLine?: number;
  fontSize?: number;
  lineHeight?: number;
}

export function LineNumbers({
  lineCount,
  activeLine,
  fontSize = 14,
  lineHeight = 1.6,
}: LineNumbersProps) {
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div
      className="flex flex-col items-end pr-3 pl-2 select-none text-text-muted font-mono bg-surface-0 border-r border-border"
      style={{ fontSize: `${fontSize}px`, lineHeight }}
      aria-hidden="true"
    >
      {lines.map((num) => (
        <div
          key={num}
          className={clsx(
            'px-1 transition-colors duration-100',
            num === activeLine
              ? 'text-text-primary bg-surface-1/50'
              : 'text-text-muted'
          )}
        >
          {num}
        </div>
      ))}
    </div>
  );
}
