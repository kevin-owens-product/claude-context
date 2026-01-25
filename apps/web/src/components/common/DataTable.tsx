/**
 * DataTable - Flexible data table with sorting, selection, and actions
 * @prompt-id forge-v4.1:web:components:datatable:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from './Input';
import { Skeleton } from './LoadingStates';

// Column definition
export interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

// Sort state
type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

// Props
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No data to display',
  rowActions,
  stickyHeader = false,
  className,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });

  // Handle sorting
  const handleSort = (columnId: string) => {
    setSortState((prev) => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) return data;

    const column = columns.find((c) => c.id === sortState.column);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aValue =
        typeof column.accessor === 'function'
          ? column.accessor(a)
          : a[column.accessor];
      const bValue =
        typeof column.accessor === 'function'
          ? column.accessor(b)
          : b[column.accessor];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortState, columns]);

  // Selection helpers
  const selectedKeys = new Set(selectedRows.map((r) => r[keyField]));
  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data);
    }
  };

  const handleSelectRow = (row: T) => {
    const key = row[keyField];
    if (selectedKeys.has(key)) {
      onSelectionChange?.(selectedRows.filter((r) => r[keyField] !== key));
    } else {
      onSelectionChange?.([...selectedRows, row]);
    }
  };

  // Render cell value
  const renderCell = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as React.ReactNode;
  };

  // Sort icon
  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortState.column !== columnId) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-500" />;
    }
    return sortState.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-400" />
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={clsx('overflow-hidden rounded-lg border border-gray-700', className)}>
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Skeleton className="w-4 h-4" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.id} className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
              {rowActions && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-t border-gray-700">
                {selectable && (
                  <td className="px-4 py-3">
                    <Skeleton className="w-4 h-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3">
                    <Skeleton className="w-6 h-6" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={clsx('overflow-hidden rounded-lg border border-gray-700', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            className={clsx(
              'bg-gray-800 text-left',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    label=""
                    checked={allSelected}
                    ref={undefined}
                    onChange={handleSelectAll}
                    className="[&>div]:hidden"
                  />
                  {someSelected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-2 h-0.5 bg-blue-500" />
                    </span>
                  )}
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={clsx(
                    'px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-200',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                  style={{ width: col.width }}
                  onClick={col.sortable ? () => handleSort(col.id) : undefined}
                >
                  <div
                    className={clsx(
                      'flex items-center gap-1',
                      col.align === 'center' && 'justify-center',
                      col.align === 'right' && 'justify-end'
                    )}
                  >
                    {col.header}
                    {col.sortable && <SortIcon columnId={col.id} />}
                  </div>
                </th>
              ))}
              {rowActions && <th className="w-12 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 bg-gray-900">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const key = row[keyField] as string;
                const isSelected = selectedKeys.has(row[keyField]);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={clsx(
                      'transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected
                        ? 'bg-blue-500/10'
                        : 'hover:bg-gray-800/50'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          label=""
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          className="[&>div]:hidden"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={clsx(
                          'px-4 py-3 text-sm text-gray-300',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className
                        )}
                      >
                        {renderCell(row, col)}
                      </td>
                    ))}
                    {rowActions && (
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700',
        className
      )}
    >
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-300"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-sm text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
