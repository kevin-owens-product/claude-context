/**
 * HotspotScatter - Complexity vs changes scatter plot
 *
 * Visualizes code hotspots plotting complexity against change frequency.
 * High complexity + high change frequency = high risk areas.
 *
 * @prompt-id forge-v4.1:web:component:hotspot-scatter:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Download } from 'lucide-react';
import type { Hotspot } from '../../api/repositories';

interface HotspotScatterProps {
  hotspots: Hotspot[];
  onSelectHotspot?: (hotspot: Hotspot) => void;
  selectedPath?: string;
  className?: string;
}

interface ScatterPoint {
  hotspot: Hotspot;
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

const riskColors = {
  low: { fill: '#22c55e', stroke: '#16a34a' },
  medium: { fill: '#eab308', stroke: '#ca8a04' },
  high: { fill: '#f97316', stroke: '#ea580c' },
  critical: { fill: '#ef4444', stroke: '#dc2626' },
};

const PADDING = 50;
const WIDTH = 600;
const HEIGHT = 400;
const PLOT_WIDTH = WIDTH - PADDING * 2;
const PLOT_HEIGHT = HEIGHT - PADDING * 2;

function calculateRisk(complexity: number, changeCount: number): 'low' | 'medium' | 'high' | 'critical' {
  const complexityScore = Math.min(complexity / 30, 1);
  const changeScore = Math.min(changeCount / 20, 1);
  const combined = (complexityScore + changeScore) / 2;

  if (combined < 0.25) return 'low';
  if (combined < 0.5) return 'medium';
  if (combined < 0.75) return 'high';
  return 'critical';
}

export function HotspotScatter({
  hotspots,
  onSelectHotspot,
  selectedPath,
  className,
}: HotspotScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);

  const points = useMemo((): ScatterPoint[] => {
    if (hotspots.length === 0) return [];

    const maxChanges = Math.max(...hotspots.map(h => h.changeCount), 1);
    const maxComplexity = Math.max(...hotspots.map(h => h.complexity || 1), 1);

    return hotspots.map(hotspot => {
      const normalizedX = (hotspot.changeCount / maxChanges) * PLOT_WIDTH;
      const normalizedY = ((hotspot.complexity || 0) / maxComplexity) * PLOT_HEIGHT;
      const risk = calculateRisk(hotspot.complexity || 0, hotspot.changeCount);

      return {
        hotspot,
        x: PADDING + normalizedX,
        y: HEIGHT - PADDING - normalizedY, // Invert Y axis
        normalizedX,
        normalizedY,
        risk,
      };
    });
  }, [hotspots]);

  const stats = useMemo(() => {
    const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
    points.forEach(p => byRisk[p.risk]++);
    return byRisk;
  }, [points]);

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotspot-scatter.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (hotspots.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center h-64 text-gray-500', className)}>
        No hotspot data available
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-400">Critical: {stats.critical}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-400">High: {stats.high}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-400">Medium: {stats.medium}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-400">Low: {stats.low}</span>
          </div>
        </div>
        <button
          onClick={exportSVG}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="Export SVG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full bg-gray-900/50 rounded-lg"
      >
        {/* Grid lines */}
        <g stroke="#374151" strokeWidth={0.5} strokeDasharray="4 4">
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={`v-${ratio}`}
              x1={PADDING + ratio * PLOT_WIDTH}
              y1={PADDING}
              x2={PADDING + ratio * PLOT_WIDTH}
              y2={HEIGHT - PADDING}
            />
          ))}
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={`h-${ratio}`}
              x1={PADDING}
              y1={HEIGHT - PADDING - ratio * PLOT_HEIGHT}
              x2={WIDTH - PADDING}
              y2={HEIGHT - PADDING - ratio * PLOT_HEIGHT}
            />
          ))}
        </g>

        {/* Axes */}
        <g stroke="#6b7280" strokeWidth={1}>
          {/* X axis */}
          <line
            x1={PADDING}
            y1={HEIGHT - PADDING}
            x2={WIDTH - PADDING}
            y2={HEIGHT - PADDING}
          />
          {/* Y axis */}
          <line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={HEIGHT - PADDING}
          />
        </g>

        {/* Axis labels */}
        <g fill="#9ca3af" fontSize={12}>
          <text x={WIDTH / 2} y={HEIGHT - 10} textAnchor="middle">
            Change Frequency
          </text>
          <text
            x={15}
            y={HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${HEIGHT / 2})`}
          >
            Complexity
          </text>
        </g>

        {/* Risk zones (background) */}
        <g opacity={0.1}>
          {/* High risk zone (top-right) */}
          <rect
            x={PADDING + PLOT_WIDTH * 0.5}
            y={PADDING}
            width={PLOT_WIDTH * 0.5}
            height={PLOT_HEIGHT * 0.5}
            fill="#ef4444"
          />
          {/* Medium risk zones */}
          <rect
            x={PADDING}
            y={PADDING}
            width={PLOT_WIDTH * 0.5}
            height={PLOT_HEIGHT * 0.5}
            fill="#f97316"
          />
          <rect
            x={PADDING + PLOT_WIDTH * 0.5}
            y={PADDING + PLOT_HEIGHT * 0.5}
            width={PLOT_WIDTH * 0.5}
            height={PLOT_HEIGHT * 0.5}
            fill="#f97316"
          />
        </g>

        {/* Points */}
        <g>
          {points.map((point, index) => {
            const isSelected = point.hotspot.path === selectedPath;
            const isHovered = hoveredPoint?.hotspot.path === point.hotspot.path;
            const colors = riskColors[point.risk];
            const radius = isHovered || isSelected ? 8 : 6;

            return (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={colors.fill}
                  stroke={isSelected ? '#fff' : colors.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  opacity={isHovered || isSelected ? 1 : 0.7}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => onSelectHotspot?.(point.hotspot)}
                />
              </g>
            );
          })}
        </g>

        {/* Tooltip */}
        {hoveredPoint && (
          <g transform={`translate(${hoveredPoint.x + 10}, ${hoveredPoint.y - 10})`}>
            <rect
              x={0}
              y={-60}
              width={200}
              height={60}
              rx={4}
              fill="#1f2937"
              stroke="#374151"
            />
            <text x={10} y={-42} fill="#e5e7eb" fontSize={11} fontWeight={500}>
              {hoveredPoint.hotspot.path.split('/').pop()}
            </text>
            <text x={10} y={-26} fill="#9ca3af" fontSize={10}>
              Changes: {hoveredPoint.hotspot.changeCount} | Complexity: {hoveredPoint.hotspot.complexity || 'N/A'}
            </text>
            <text x={10} y={-10} fill="#9ca3af" fontSize={10}>
              Authors: {hoveredPoint.hotspot.uniqueAuthors} | Risk: {hoveredPoint.hotspot.riskScore.toFixed(1)}
            </text>
          </g>
        )}
      </svg>

      {/* Danger Zone Label */}
      <div className="absolute top-16 right-4 flex items-center gap-1.5 text-xs text-red-400/70">
        <AlertTriangle className="w-3 h-3" />
        <span>High Risk Zone</span>
      </div>
    </div>
  );
}

export default HotspotScatter;
