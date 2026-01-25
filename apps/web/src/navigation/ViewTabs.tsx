/**
 * ViewTabs - Living Software Navigation
 *
 * The platform IS Living Software. Navigation follows the core loop:
 *
 * WHY → WHAT → HOW → LEARN → BUILD
 * (Intents → Capabilities → Signals → Experiments → Work)
 *
 * Secondary views support the core loop but don't dominate.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Compass,
  Activity,
  Box,
  FlaskConical,
  Hammer,
  MoreHorizontal,
  Filter,
  Users,
  MessageSquare,
  DollarSign,
  Target,
  Rocket,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { useWorkspace, type ViewType } from '../contexts';

interface NavItem {
  id: ViewType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

// The Living Software loop - this IS the product
// Secondary views - Business & Customer insights
const secondaryViews: NavItem[] = [
  {
    id: 'customer-intelligence',
    label: 'Customers',
    subtitle: 'Intelligence',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    subtitle: 'Voice',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: 'sales',
    label: 'Sales',
    subtitle: 'Pipeline',
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    subtitle: 'OKRs',
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: 'releases',
    label: 'Releases',
    subtitle: 'Ship',
    icon: <Rocket className="w-4 h-4" />,
  },
  {
    id: 'solutions',
    label: 'Solutions',
    subtitle: 'Use Cases',
    icon: <Layers className="w-4 h-4" />,
  },
];

const livingLoop: NavItem[] = [
  {
    id: 'intents',
    label: 'Why',
    subtitle: 'Intents',
    icon: <Compass className="w-5 h-5" />,
  },
  {
    id: 'capabilities',
    label: 'What',
    subtitle: 'Capabilities',
    icon: <Box className="w-5 h-5" />,
  },
  {
    id: 'signals',
    label: 'How',
    subtitle: 'Signals',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: 'experiments',
    label: 'Learn',
    subtitle: 'Experiments',
    icon: <FlaskConical className="w-5 h-5" />,
  },
  {
    id: 'board',
    label: 'Build',
    subtitle: 'Work',
    icon: <Hammer className="w-5 h-5" />,
  },
];

interface ViewTabsProps {
  projectName?: string;
  spaceName?: string;
  onFilter?: () => void;
  onSettings?: () => void;
}

export function ViewTabs({
  projectName,
  spaceName,
  onFilter,
}: ViewTabsProps) {
  const { currentView, setCurrentView } = useWorkspace();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Find active item for indicator position
  const activeIndex = livingLoop.findIndex(item => item.id === currentView);
  const isInLoop = activeIndex !== -1;
  const isInSecondary = secondaryViews.some(item => item.id === currentView);
  const currentSecondary = secondaryViews.find(item => item.id === currentView);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-claude-neutral-900 border-b border-claude-neutral-800">
      {/* Left: Context */}
      <div className="flex items-center gap-3">
        {projectName && (
          <div className="flex items-center gap-2">
            {spaceName && (
              <span className="text-sm text-claude-neutral-500">{spaceName} /</span>
            )}
            <span className="text-sm font-medium text-claude-neutral-300">{projectName}</span>
          </div>
        )}
      </div>

      {/* Center: The Living Software Loop */}
      <div className="flex items-center">
        <div className="flex items-center bg-claude-neutral-800/50 rounded-xl p-1 gap-1">
          {livingLoop.map((item, index) => {
            const isActive = currentView === item.id;
            const isPast = isInLoop && index < activeIndex;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={clsx(
                  'relative flex flex-col items-center px-4 py-2 rounded-lg transition-all min-w-[72px]',
                  isActive
                    ? 'bg-gradient-to-b from-claude-primary-500/20 to-claude-primary-600/10 text-claude-primary-400'
                    : isPast
                    ? 'text-claude-neutral-400 hover:text-claude-neutral-300 hover:bg-claude-neutral-700/50'
                    : 'text-claude-neutral-500 hover:text-claude-neutral-400 hover:bg-claude-neutral-700/50'
                )}
              >
                <span className={clsx(
                  'transition-transform',
                  isActive && 'scale-110'
                )}>
                  {item.icon}
                </span>
                <span className={clsx(
                  'text-[10px] font-medium mt-1 uppercase tracking-wider',
                  isActive ? 'text-claude-primary-400' : 'text-claude-neutral-500'
                )}>
                  {item.label}
                </span>
                <span className={clsx(
                  'text-[11px] mt-0.5',
                  isActive ? 'text-claude-primary-300' : 'text-claude-neutral-600'
                )}>
                  {item.subtitle}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-claude-primary-500 rounded-full" />
                )}

                {/* Connection line to next */}
                {index < livingLoop.length - 1 && (
                  <div className={clsx(
                    'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-0.5 rounded-full z-10',
                    isPast || isActive ? 'bg-claude-primary-500/50' : 'bg-claude-neutral-700'
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Secondary Views Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
              isInSecondary
                ? 'bg-pink-500/20 text-pink-400'
                : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
            )}
          >
            {currentSecondary ? (
              <>
                {currentSecondary.icon}
                <span>{currentSecondary.subtitle}</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Business</span>
              </>
            )}
            <ChevronDown className={clsx(
              'w-3 h-3 transition-transform',
              moreMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown Menu */}
          {moreMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMoreMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-claude-neutral-800 border border-claude-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-2 border-b border-claude-neutral-700">
                  <div className="text-[10px] text-claude-neutral-500 uppercase tracking-wider px-2 py-1">
                    Business & Customer Views
                  </div>
                </div>
                <div className="p-1">
                  {secondaryViews.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setMoreMenuOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                        currentView === item.id
                          ? 'bg-pink-500/20 text-pink-400'
                          : 'text-claude-neutral-300 hover:bg-claude-neutral-700'
                      )}
                    >
                      {item.icon}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.subtitle}</div>
                        <div className="text-[10px] text-claude-neutral-500">{item.label}</div>
                      </div>
                      {currentView === item.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-claude-neutral-700" />

        <button
          onClick={onFilter}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>

        <button
          className="p-2 text-claude-neutral-500 hover:text-claude-neutral-300 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          title="More views"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
