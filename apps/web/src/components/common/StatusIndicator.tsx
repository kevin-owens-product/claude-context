/**
 * StatusIndicator - Visual indicators for health, status, and progress
 * @prompt-id forge-v4.1:web:components:status:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { clsx } from 'clsx';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Pause,
  Loader2,
  MinusCircle,
} from 'lucide-react';

// Status Dot - simple colored dot
type DotStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';

interface StatusDotProps {
  status: DotStatus;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const dotColors: Record<DotStatus, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-500',
  pending: 'bg-yellow-500',
};

const dotSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusDot({ status, pulse = false, size = 'md', className }: StatusDotProps) {
  return (
    <span className={clsx('relative inline-flex', className)}>
      <span
        className={clsx(
          'rounded-full',
          dotColors[status],
          dotSizes[size],
          pulse && 'animate-pulse'
        )}
      />
      {pulse && (
        <span
          className={clsx(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            dotColors[status]
          )}
        />
      )}
    </span>
  );
}

// Status Badge - dot + label
interface StatusBadgeProps {
  status: DotStatus;
  label: string;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, pulse = false, className }: StatusBadgeProps) {
  const bgColors: Record<DotStatus, string> = {
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
        bgColors[status],
        className
      )}
    >
      <StatusDot status={status} pulse={pulse} size="sm" />
      {label}
    </span>
  );
}

// Health Score - circular progress indicator
interface HealthScoreProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function HealthScore({ score, size = 'md', showLabel = true, className }: HealthScoreProps) {
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: 'text-green-500', bg: 'text-green-500/20' };
    if (s >= 60) return { stroke: 'text-yellow-500', bg: 'text-yellow-500/20' };
    if (s >= 40) return { stroke: 'text-orange-500', bg: 'text-orange-500/20' };
    return { stroke: 'text-red-500', bg: 'text-red-500/20' };
  };

  const sizes = {
    sm: { size: 40, stroke: 4, text: 'text-xs' },
    md: { size: 56, stroke: 5, text: 'text-sm' },
    lg: { size: 80, stroke: 6, text: 'text-lg' },
  };

  const { size: svgSize, stroke, text } = sizes[size];
  const radius = (svgSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = getColor(score);

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={svgSize} height={svgSize} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={colors.bg}
          stroke="currentColor"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(colors.stroke, 'transition-all duration-500')}
          stroke="currentColor"
        />
      </svg>
      {showLabel && (
        <span className={clsx('absolute font-bold text-white', text)}>
          {Math.round(score)}
        </span>
      )}
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantStyles = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
  };

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{value}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={clsx('w-full bg-gray-700 rounded-full overflow-hidden', heightStyles[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-300', variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Status Icon with label
type IconStatus = 'success' | 'error' | 'warning' | 'pending' | 'paused' | 'running' | 'cancelled';

interface StatusIconProps {
  status: IconStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: Record<IconStatus, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-500' },
  error: { icon: XCircle, color: 'text-red-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  pending: { icon: Clock, color: 'text-yellow-500' },
  paused: { icon: Pause, color: 'text-gray-500' },
  running: { icon: Loader2, color: 'text-blue-500' },
  cancelled: { icon: MinusCircle, color: 'text-gray-500' },
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function StatusIcon({ status, label, size = 'md', className }: StatusIconProps) {
  const { icon: Icon, color } = iconMap[status];
  const isAnimated = status === 'running';

  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <Icon className={clsx(iconSizes[size], color, isAnimated && 'animate-spin')} />
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </span>
  );
}

// Trend Indicator
interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  showIcon?: boolean;
  className?: string;
}

export function TrendIndicator({ value, suffix = '%', showIcon = true, className }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <span
      className={clsx(
        'inline-flex items-center text-sm font-medium',
        isPositive ? 'text-green-400' : isNeutral ? 'text-gray-400' : 'text-red-400',
        className
      )}
    >
      {showIcon && !isNeutral && (
        <span className={clsx('mr-0.5', isPositive ? '↑' : '↓')} />
      )}
      {isPositive && '+'}
      {value}
      {suffix}
    </span>
  );
}
