/**
 * @prompt-id forge-v4.1:web:components:slice-list:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { useSlices } from '../../hooks';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SliceStatus, type Slice } from '../../types';

interface SliceListProps {
  workspaceId: string;
  onSelectSlice: (sliceId: string) => void;
  onCreateSlice: () => void;
}

const statusVariant: Record<SliceStatus, 'default' | 'info' | 'warning' | 'success'> = {
  [SliceStatus.PENDING]: 'default',
  [SliceStatus.ACTIVE]: 'info',
  [SliceStatus.IN_REVIEW]: 'warning',
  [SliceStatus.COMPLETED]: 'success',
  [SliceStatus.ARCHIVED]: 'default',
};

const statusLabels: Record<SliceStatus, string> = {
  [SliceStatus.PENDING]: 'Pending',
  [SliceStatus.ACTIVE]: 'Active',
  [SliceStatus.IN_REVIEW]: 'In Review',
  [SliceStatus.COMPLETED]: 'Completed',
  [SliceStatus.ARCHIVED]: 'Archived',
};

export function SliceList({ workspaceId, onSelectSlice, onCreateSlice }: SliceListProps) {
  const [statusFilter, setStatusFilter] = useState<SliceStatus | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { data: slicesResult, isLoading } = useSlices(workspaceId, {
    status: statusFilter,
  });

  const slices = slicesResult?.data || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Work Slices</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
            <Button size="sm" onClick={onCreateSlice}>
              <Plus className="w-4 h-4 mr-1" />
              New Slice
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter(undefined)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !statusFilter
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.values(SliceStatus).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slice List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading slices...
          </div>
        ) : slices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p>No slices found</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onCreateSlice}>
              Create your first slice
            </Button>
          </div>
        ) : (
          slices.map((slice) => (
            <SliceCard
              key={slice.id}
              slice={slice}
              onClick={() => onSelectSlice(slice.id)}
            />
          ))
        )}
      </div>

      {/* Summary Footer */}
      {slicesResult && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          Showing {slices.length} of {slicesResult.total} slices
        </div>
      )}
    </div>
  );
}

interface SliceCardProps {
  slice: Slice;
  onClick: () => void;
}

function SliceCard({ slice, onClick }: SliceCardProps) {
  const completedCriteria = slice.acceptanceCriteria.filter((c) => c.isCompleted).length;
  const totalCriteria = slice.acceptanceCriteria.length;

  return (
    <Card onClick={onClick}>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">{slice.shortId}</span>
              <Badge variant={statusVariant[slice.status]}>
                {statusLabels[slice.status]}
              </Badge>
            </div>
            <h3 className="font-medium text-gray-900 truncate">{slice.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{slice.outcome}</p>
          </div>
        </div>

        {totalCriteria > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Acceptance Criteria</span>
              <span>{completedCriteria} / {totalCriteria}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(completedCriteria / totalCriteria) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
