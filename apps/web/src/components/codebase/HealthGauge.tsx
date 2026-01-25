/**
 * HealthGauge - Circular health score indicator
 *
 * Displays a health score as an animated circular gauge with
 * color-coded status and optional trend indicator.
 *
 * @prompt-id forge-v4.1:web:component:health-gauge:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

// React hooks imported as needed
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthStatus, TrendDirection } from '../../api/codeHealth';

interface HealthGaugeProps {
  score: number;
  status?: HealthStatus;
  trend?: TrendDirection;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

const statusColors: Record<HealthStatus, { stroke: string; bg: string; text: string }> = {
  HEALTHY: { stroke: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-400' },
  WARNING: { stroke: '#eab308', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  CRITICAL: { stroke: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-400' },
  UNKNOWN: { stroke: '#6b7280', bg: 'bg-gray-500/10', text: 'text-gray-400' },
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  IMPROVING: <TrendingUp className="w-3 h-3 text-green-400" />,
  STABLE: <Minus className="w-3 h-3 text-gray-400" />,
  DECLINING: <TrendingDown className="w-3 h-3 text-red-400" />,
};

const sizes = {
  sm: { outer: 64, inner: 52, stroke: 6, fontSize: 14, labelSize: 10 },
  md: { outer: 96, inner: 80, stroke: 8, fontSize: 20, labelSize: 12 },
  lg: { outer: 128, inner: 108, stroke: 10, fontSize: 28, labelSize: 14 },
};

function getStatusFromScore(score: number): HealthStatus {
  if (score >= 70) return 'HEALTHY';
  if (score >= 40) return 'WARNING';
  return 'CRITICAL';
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

export function HealthGauge({
  score,
  status,
  trend,
  label,
  size = 'md',
  showPercentage = true,
  className,
}: HealthGaugeProps) {
  const sizeConfig = sizes[size];
  const resolvedStatus = status || getStatusFromScore(score);
  const strokeColor = statusColors[resolvedStatus].stroke;

  const percentage = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (sizeConfig.outer - sizeConfig.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={clsx('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: sizeConfig.outer, height: sizeConfig.outer }}>
        {/* Background circle */}
        <svg
          width={sizeConfig.outer}
          height={sizeConfig.outer}
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx={sizeConfig.outer / 2}
            cy={sizeConfig.outer / 2}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={sizeConfig.stroke}
          />
          {/* Progress */}
          <circle
            cx={sizeConfig.outer / 2}
            cy={sizeConfig.outer / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={sizeConfig.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          {showPercentage && (
            <span
              className="font-bold text-white"
              style={{ fontSize: sizeConfig.fontSize }}
            >
              {percentage}
            </span>
          )}
          {trend && (
            <div className="mt-0.5">
              {trendIcons[trend]}
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      {label && (
        <span
          className="mt-2 text-gray-400 text-center"
          style={{ fontSize: sizeConfig.labelSize }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// Variant with multiple metrics
interface MultiHealthGaugeProps {
  metrics: {
    label: string;
    score: number;
    status?: HealthStatus;
    trend?: TrendDirection;
  }[];
  className?: string;
}

export function MultiHealthGauge({ metrics, className }: MultiHealthGaugeProps) {
  return (
    <div className={clsx('flex items-start gap-6', className)}>
      {metrics.map((metric, index) => (
        <HealthGauge
          key={index}
          score={metric.score}
          status={metric.status}
          trend={metric.trend}
          label={metric.label}
          size="sm"
        />
      ))}
    </div>
  );
}

// Horizontal bar variant
interface HealthBarProps {
  score: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function HealthBar({
  score,
  label,
  showValue = true,
  className,
}: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, Math.round(score)));
  const color = getScoreColor(score);

  return (
    <div className={clsx('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showValue && <span className="text-sm font-medium" style={{ color }}>{percentage}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// Status badge variant
interface HealthBadgeProps {
  status: HealthStatus;
  score?: number;
  trend?: TrendDirection;
  size?: 'sm' | 'md';
  className?: string;
}

export function HealthBadge({
  status,
  score,
  trend,
  size = 'md',
  className,
}: HealthBadgeProps) {
  const colors = statusColors[status];

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full',
        colors.bg,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      <span className={clsx('font-medium', colors.text)}>
        {status}
      </span>
      {score !== undefined && (
        <span className={colors.text}>{Math.round(score)}%</span>
      )}
      {trend && trendIcons[trend]}
    </div>
  );
}

export default HealthGauge;
