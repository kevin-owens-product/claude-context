import React from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-2 text-text-secondary border-border',
  primary: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  primary: 'bg-indigo-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-cyan-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  style,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        'transition-colors duration-200',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={style}
    >
      {dot && (
        <span
          className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
