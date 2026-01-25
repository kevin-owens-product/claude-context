/**
 * FilterBar - Filter controls for views
 * Provides filtering, grouping, and search
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Filter,
  X,
  ChevronDown,
  Check,
  SortAsc,
  Layers,
  User,
  Target,
  Calendar,
  AlertCircle,
  Save,
  Trash2,
} from 'lucide-react';
import type { Slice, Intent } from '../../data/enterprise-data';

type SliceStatus = Slice['status'];
type SlicePriority = Slice['priority'];

interface FilterState {
  status: SliceStatus[];
  priority: SlicePriority[];
  assignee: string[];
  intent: string[];
  hasBlocker: boolean | null;
  dueDateRange: 'overdue' | 'today' | 'week' | 'month' | null;
}

interface SavedFilter {
  id: string;
  name: string;
  filter: FilterState;
}

interface FilterBarProps {
  intents: Intent[];
  assignees: { id: string; name: string }[];
  activeFilter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filter: FilterState) => void;
  onDeleteFilter?: (id: string) => void;
  groupBy: string | null;
  onGroupByChange: (groupBy: string | null) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
}

const defaultFilter: FilterState = {
  status: [],
  priority: [],
  assignee: [],
  intent: [],
  hasBlocker: null,
  dueDateRange: null,
};

export function FilterBar({
  intents,
  assignees,
  activeFilter,
  onFilterChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');

  const statusOptions: { value: SliceStatus; label: string; color: string }[] = [
    { value: 'backlog', label: 'Backlog', color: 'bg-gray-500' },
    { value: 'ready', label: 'Ready', color: 'bg-blue-500' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
    { value: 'in_review', label: 'Review', color: 'bg-purple-500' },
    { value: 'completed', label: 'Done', color: 'bg-green-500' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-500' },
  ];

  const priorityOptions: { value: SlicePriority; label: string; color: string }[] = [
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low', color: 'bg-gray-500' },
  ];

  const groupByOptions = [
    { value: null, label: 'None' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'intent', label: 'Intent' },
  ];

  const sortByOptions = [
    { value: 'created', label: 'Created Date' },
    { value: 'updated', label: 'Updated Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'name', label: 'Name' },
  ];

  const hasActiveFilters =
    activeFilter.status.length > 0 ||
    activeFilter.priority.length > 0 ||
    activeFilter.assignee.length > 0 ||
    activeFilter.intent.length > 0 ||
    activeFilter.hasBlocker !== null ||
    activeFilter.dueDateRange !== null;

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const toggleStatus = (status: SliceStatus) => {
    const newStatuses = activeFilter.status.includes(status)
      ? activeFilter.status.filter(s => s !== status)
      : [...activeFilter.status, status];
    onFilterChange({ ...activeFilter, status: newStatuses });
  };

  const togglePriority = (priority: SlicePriority) => {
    const newPriorities = activeFilter.priority.includes(priority)
      ? activeFilter.priority.filter(p => p !== priority)
      : [...activeFilter.priority, priority];
    onFilterChange({ ...activeFilter, priority: newPriorities });
  };

  const toggleAssignee = (assigneeId: string) => {
    const newAssignees = activeFilter.assignee.includes(assigneeId)
      ? activeFilter.assignee.filter(a => a !== assigneeId)
      : [...activeFilter.assignee, assigneeId];
    onFilterChange({ ...activeFilter, assignee: newAssignees });
  };

  const toggleIntent = (intentId: string) => {
    const newIntents = activeFilter.intent.includes(intentId)
      ? activeFilter.intent.filter(i => i !== intentId)
      : [...activeFilter.intent, intentId];
    onFilterChange({ ...activeFilter, intent: newIntents });
  };

  const clearFilters = () => {
    onFilterChange(defaultFilter);
  };

  const handleSaveFilter = () => {
    if (filterName.trim() && onSaveFilter) {
      onSaveFilter(filterName.trim(), activeFilter);
      setFilterName('');
    }
  };

  const loadFilter = (filter: FilterState) => {
    onFilterChange(filter);
    setActiveDropdown(null);
  };

  return (
    <div className="border-b border-claude-neutral-800">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Filter Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg transition-colors',
            hasActiveFilters || isExpanded
              ? 'bg-claude-primary-500/20 text-claude-primary-400'
              : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
          )}
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-claude-primary-500 text-white text-xs rounded-full">
              {activeFilter.status.length +
                activeFilter.priority.length +
                activeFilter.assignee.length +
                activeFilter.intent.length +
                (activeFilter.hasBlocker !== null ? 1 : 0) +
                (activeFilter.dueDateRange !== null ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Quick Filters */}
        {!isExpanded && hasActiveFilters && (
          <div className="flex items-center gap-1.5">
            {activeFilter.status.map(status => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className="flex items-center gap-1 px-2 py-1 bg-claude-neutral-800 text-claude-neutral-300 text-xs rounded-full hover:bg-claude-neutral-700"
              >
                {statusOptions.find(s => s.value === status)?.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            {activeFilter.priority.map(priority => (
              <button
                key={priority}
                onClick={() => togglePriority(priority)}
                className="flex items-center gap-1 px-2 py-1 bg-claude-neutral-800 text-claude-neutral-300 text-xs rounded-full hover:bg-claude-neutral-700"
              >
                {priorityOptions.find(p => p.value === priority)?.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs text-claude-neutral-500 hover:text-claude-neutral-300"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Group By */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('groupBy')}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          >
            <Layers className="w-4 h-4" />
            Group: {groupByOptions.find(g => g.value === groupBy)?.label || 'None'}
            <ChevronDown className="w-3 h-3" />
          </button>

          {activeDropdown === 'groupBy' && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg shadow-lg z-10">
              {groupByOptions.map(option => (
                <button
                  key={option.value || 'none'}
                  onClick={() => {
                    onGroupByChange(option.value);
                    setActiveDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-claude-neutral-300 hover:bg-claude-neutral-700 transition-colors"
                >
                  {groupBy === option.value && <Check className="w-4 h-4 text-claude-primary-400" />}
                  <span className={groupBy === option.value ? 'text-claude-primary-400' : ''}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort By */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('sortBy')}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          >
            <SortAsc className="w-4 h-4" />
            Sort: {sortByOptions.find(s => s.value === sortBy)?.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {activeDropdown === 'sortBy' && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg shadow-lg z-10">
              {sortByOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortByChange(option.value);
                    setActiveDropdown(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-claude-neutral-300 hover:bg-claude-neutral-700 transition-colors"
                >
                  {sortBy === option.value && <Check className="w-4 h-4 text-claude-primary-400" />}
                  <span className={sortBy === option.value ? 'text-claude-primary-400' : ''}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('saved')}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Saved
              <ChevronDown className="w-3 h-3" />
            </button>

            {activeDropdown === 'saved' && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg shadow-lg z-10">
                {savedFilters.map(filter => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-claude-neutral-700"
                  >
                    <button
                      onClick={() => loadFilter(filter.filter)}
                      className="flex-1 text-left text-sm text-claude-neutral-300"
                    >
                      {filter.name}
                    </button>
                    <button
                      onClick={() => onDeleteFilter?.(filter.id)}
                      className="p-1 text-claude-neutral-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="px-4 py-3 bg-claude-neutral-850 border-t border-claude-neutral-800">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-claude-neutral-500 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleStatus(option.value)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors',
                      activeFilter.status.includes(option.value)
                        ? 'bg-claude-primary-500/20 text-claude-primary-400 ring-1 ring-claude-primary-500'
                        : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', option.color)} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-medium text-claude-neutral-500 mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-1.5">
                {priorityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => togglePriority(option.value)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors',
                      activeFilter.priority.includes(option.value)
                        ? 'bg-claude-primary-500/20 text-claude-primary-400 ring-1 ring-claude-primary-500'
                        : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', option.color)} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-xs font-medium text-claude-neutral-500 mb-2">
                Assignee
              </label>
              <div className="flex flex-wrap gap-1.5">
                {assignees.slice(0, 6).map(assignee => (
                  <button
                    key={assignee.id}
                    onClick={() => toggleAssignee(assignee.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors',
                      activeFilter.assignee.includes(assignee.id)
                        ? 'bg-claude-primary-500/20 text-claude-primary-400 ring-1 ring-claude-primary-500'
                        : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                    )}
                  >
                    <User className="w-3 h-3" />
                    {assignee.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Intent Filter */}
            <div>
              <label className="block text-xs font-medium text-claude-neutral-500 mb-2">
                Intent
              </label>
              <div className="flex flex-wrap gap-1.5">
                {intents.slice(0, 5).map(intent => (
                  <button
                    key={intent.id}
                    onClick={() => toggleIntent(intent.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors',
                      activeFilter.intent.includes(intent.id)
                        ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500'
                        : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                    )}
                  >
                    <Target className="w-3 h-3" />
                    {intent.name.length > 20 ? intent.name.slice(0, 20) + '...' : intent.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date Filter */}
            <div>
              <label className="block text-xs font-medium text-claude-neutral-500 mb-2">
                Due Date
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'overdue', label: 'Overdue', icon: AlertCircle },
                  { value: 'today', label: 'Today', icon: Calendar },
                  { value: 'week', label: 'This Week', icon: Calendar },
                  { value: 'month', label: 'This Month', icon: Calendar },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() =>
                      onFilterChange({
                        ...activeFilter,
                        dueDateRange:
                          activeFilter.dueDateRange === option.value
                            ? null
                            : (option.value as FilterState['dueDateRange']),
                      })
                    }
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1 text-xs rounded-full transition-colors',
                      activeFilter.dueDateRange === option.value
                        ? option.value === 'overdue'
                          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500'
                          : 'bg-claude-primary-500/20 text-claude-primary-400 ring-1 ring-claude-primary-500'
                        : 'bg-claude-neutral-800 text-claude-neutral-400 hover:bg-claude-neutral-700'
                    )}
                  >
                    <option.icon className="w-3 h-3" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Filter */}
          {hasActiveFilters && onSaveFilter && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-claude-neutral-800">
              <input
                type="text"
                placeholder="Filter name..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="px-3 py-1.5 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-primary-500 text-white text-sm rounded-lg hover:bg-claude-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { FilterState, SavedFilter };
