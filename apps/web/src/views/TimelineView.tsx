/**
 * TimelineView - Gantt-style timeline for roadmap planning
 * Shows slices with dates on a horizontal timeline
 */

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  AlertCircle,
} from 'lucide-react';
import type { Slice, Intent } from '../data/enterprise-data';

interface TimelineViewProps {
  slices: Slice[];
  intents: Intent[];
  onSliceClick?: (slice: Slice) => void;
}

type TimeScale = 'day' | 'week' | 'month';

export function TimelineView({
  slices,
  intents,
  onSliceClick,
}: TimelineViewProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>('week');
  const [viewStart, setViewStart] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - 7); // Start a week ago
    return now;
  });

  // Filter slices with dates
  const datedSlices = useMemo(() =>
    slices.filter(s => s.dueDate || s.createdAt),
    [slices]
  );

  // Group slices by intent
  const slicesByIntent = useMemo(() => {
    const groups: Record<string, { intent: Intent | null; slices: Slice[] }> = {
      'unlinked': { intent: null, slices: [] }
    };

    intents.forEach(intent => {
      groups[intent.id] = { intent, slices: [] };
    });

    datedSlices.forEach(slice => {
      if (slice.linkedIntent && groups[slice.linkedIntent]) {
        groups[slice.linkedIntent].slices.push(slice);
      } else {
        groups['unlinked'].slices.push(slice);
      }
    });

    return Object.values(groups).filter(g => g.slices.length > 0);
  }, [datedSlices, intents]);

  // Calculate time range
  const timeRange = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(viewStart);
    const numDays = timeScale === 'day' ? 14 : timeScale === 'week' ? 56 : 90;

    for (let i = 0; i < numDays; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [viewStart, timeScale]);

  const viewEnd = timeRange[timeRange.length - 1];

  // Get weeks for header
  const weeks = useMemo(() => {
    const result: { start: Date; days: number }[] = [];
    let currentWeekStart: Date | null = null;
    let currentWeekDays = 0;

    timeRange.forEach((day) => {
      if (day.getDay() === 0 || !currentWeekStart) {
        if (currentWeekStart) {
          result.push({ start: currentWeekStart, days: currentWeekDays });
        }
        currentWeekStart = new Date(day);
        currentWeekDays = 1;
      } else {
        currentWeekDays++;
      }
    });

    if (currentWeekStart) {
      result.push({ start: currentWeekStart, days: currentWeekDays });
    }

    return result;
  }, [timeRange]);

  const getSlicePosition = (slice: Slice) => {
    const startDate = new Date(slice.createdAt);
    const endDate = slice.dueDate ? new Date(slice.dueDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalDays = timeRange.length;
    const startDiff = Math.floor((startDate.getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000));
    const endDiff = Math.floor((endDate.getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000));

    const left = Math.max(0, (startDiff / totalDays) * 100);
    const right = Math.min(100, (endDiff / totalDays) * 100);
    const width = right - left;

    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    const days = timeScale === 'day' ? 7 : timeScale === 'week' ? 14 : 30;
    const newStart = new Date(viewStart);
    newStart.setDate(newStart.getDate() + (direction === 'next' ? days : -days));
    setViewStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    setViewStart(now);
  };

  const statusColors: Record<Slice['status'], string> = {
    backlog: 'bg-gray-500',
    ready: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    in_review: 'bg-purple-500',
    completed: 'bg-green-500',
    blocked: 'bg-red-500',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-claude-neutral-900">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTime('prev')}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateTime('next')}
            className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="ml-2 text-sm text-claude-neutral-300">
            {viewStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {viewEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-claude-neutral-800 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as TimeScale[]).map(scale => (
              <button
                key={scale}
                onClick={() => setTimeScale(scale)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                  timeScale === scale
                    ? 'bg-claude-neutral-700 text-claude-neutral-100'
                    : 'text-claude-neutral-400 hover:text-claude-neutral-200'
                )}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1200px]">
          {/* Time Header */}
          <div className="sticky top-0 z-10 bg-claude-neutral-900 border-b border-claude-neutral-800">
            {/* Weeks */}
            <div className="flex h-8 border-b border-claude-neutral-800">
              <div className="w-64 flex-shrink-0 px-4 flex items-center text-xs text-claude-neutral-500">
                <Calendar className="w-4 h-4 mr-2" />
                Timeline
              </div>
              <div className="flex-1 flex">
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-xs text-claude-neutral-400 border-l border-claude-neutral-800"
                    style={{ width: `${(week.days / timeRange.length) * 100}%` }}
                  >
                    Week of {week.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            </div>

            {/* Days */}
            <div className="flex h-6">
              <div className="w-64 flex-shrink-0" />
              <div className="flex-1 flex">
                {timeRange.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={clsx(
                        'flex-1 text-center text-[10px] border-l border-claude-neutral-800 flex items-center justify-center',
                        isToday ? 'bg-claude-primary-500/20 text-claude-primary-400' :
                        isWeekend ? 'bg-claude-neutral-800/50 text-claude-neutral-600' :
                        'text-claude-neutral-500'
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows by Intent */}
          {slicesByIntent.map(({ intent, slices: groupSlices }) => (
            <div key={intent?.id || 'unlinked'} className="border-b border-claude-neutral-800">
              {/* Intent Header */}
              <div className="flex h-10 bg-claude-neutral-850">
                <div className="w-64 flex-shrink-0 px-4 flex items-center gap-2">
                  {intent ? (
                    <>
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-claude-neutral-200 truncate">
                        {intent.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-claude-neutral-500" />
                      <span className="text-sm text-claude-neutral-500">
                        Unlinked Slices
                      </span>
                    </>
                  )}
                  <span className="text-xs text-claude-neutral-500 ml-auto">
                    {groupSlices.length}
                  </span>
                </div>
                <div className="flex-1 relative">
                  {/* Today line */}
                  {timeRange.some(d => d.toDateString() === new Date().toDateString()) && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-claude-primary-500 z-10"
                      style={{
                        left: `${(Math.floor((new Date().getTime() - viewStart.getTime()) / (24 * 60 * 60 * 1000)) / timeRange.length) * 100}%`
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Slice Bars */}
              {groupSlices.map(slice => {
                const position = getSlicePosition(slice);
                const isOverdue = slice.dueDate && new Date(slice.dueDate) < new Date() && slice.status !== 'completed';

                return (
                  <div key={slice.id} className="flex h-12 hover:bg-claude-neutral-800/50">
                    <div className="w-64 flex-shrink-0 px-4 flex items-center">
                      <span className="text-xs font-mono text-claude-neutral-500 mr-2">
                        {slice.shortId}
                      </span>
                      <span className="text-sm text-claude-neutral-300 truncate">
                        {slice.name}
                      </span>
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <button
                        onClick={() => onSliceClick?.(slice)}
                        className={clsx(
                          'absolute h-7 rounded-md flex items-center px-2 text-xs text-white font-medium transition-all hover:brightness-110',
                          statusColors[slice.status],
                          isOverdue && 'ring-2 ring-red-400'
                        )}
                        style={{
                          left: position.left,
                          width: position.width,
                          minWidth: '60px',
                        }}
                        title={`${slice.name} - ${slice.status}`}
                      >
                        <span className="truncate">{slice.name}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Empty State */}
          {slicesByIntent.length === 0 && (
            <div className="flex items-center justify-center h-64 text-claude-neutral-500">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg mb-1">No items with dates</p>
                <p className="text-sm">Add due dates to slices to see them on the timeline</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
