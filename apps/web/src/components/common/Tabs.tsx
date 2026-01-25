/**
 * Tabs - Tabbed interface component
 * @prompt-id forge-v4.1:web:components:tabs:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { clsx } from 'clsx';

// Context for tabs state
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Tabs container
interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;

  const setActiveTab = useCallback(
    (id: string) => {
      if (!value) {
        setInternalValue(id);
      }
      onChange?.(id);
    },
    [value, onChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab list container
interface TabListProps {
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function TabList({ children, variant = 'default', className }: TabListProps) {
  const variantStyles = {
    default: 'bg-gray-800 rounded-lg p-1 gap-1',
    pills: 'gap-2',
    underline: 'border-b border-gray-700 gap-4',
  };

  return (
    <div
      role="tablist"
      className={clsx('flex items-center', variantStyles[variant], className)}
    >
      {children}
    </div>
  );
}

// Individual tab trigger
interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function TabTrigger({
  value,
  children,
  disabled = false,
  icon,
  badge,
  variant = 'default',
  className,
}: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const baseStyles = clsx(
    'relative flex items-center gap-2 font-medium transition-all',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  const variantStyles = {
    default: clsx(
      'px-3 py-1.5 rounded-md text-sm',
      isActive
        ? 'bg-gray-700 text-white'
        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
    ),
    pills: clsx(
      'px-4 py-2 rounded-full text-sm',
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 bg-gray-800 hover:text-white hover:bg-gray-700'
    ),
    underline: clsx(
      'px-1 pb-3 text-sm border-b-2 -mb-px',
      isActive
        ? 'border-blue-500 text-white'
        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
    ),
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={clsx(baseStyles, variantStyles[variant], className)}
    >
      {icon}
      {children}
      {badge !== undefined && (
        <span
          className={clsx(
            'px-1.5 py-0.5 text-xs font-medium rounded-full',
            isActive ? 'bg-white/20' : 'bg-gray-700 text-gray-400'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Tab content panel
interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

export function TabContent({ value, children, className, forceMount = false }: TabContentProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      hidden={!isActive}
      className={clsx('focus:outline-none', className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Segmented Control (alternative to tabs for small option sets)
interface SegmentedControlProps {
  options: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps) {
  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <div className={clsx('inline-flex bg-gray-800 rounded-lg p-0.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex items-center gap-1.5 font-medium rounded-md transition-colors',
            sizeStyles[size],
            value === option.value
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
