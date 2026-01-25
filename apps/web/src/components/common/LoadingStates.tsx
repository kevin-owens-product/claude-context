/**
 * LoadingStates - Loading indicators and skeletons
 * Consistent loading UX throughout the app
 */

import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

// Spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2
      className={clsx(
        'animate-spin text-claude-primary-500',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Full page loading
interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-claude-neutral-900">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-claude-neutral-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// Skeleton base
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-claude-neutral-800 rounded',
        className
      )}
    />
  );
}

// Skeleton for text lines
interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            'h-4',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// Skeleton for slice card
export function SkeletonSliceCard() {
  return (
    <div className="bg-claude-neutral-800 rounded-lg p-3 border border-claude-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-8" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center justify-between pt-2 border-t border-claude-neutral-700">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Skeleton for board column
export function SkeletonBoardColumn() {
  return (
    <div className="w-80 flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8" />
      </div>
      <div className="rounded-lg p-2 space-y-2 bg-claude-neutral-800/50">
        <SkeletonSliceCard />
        <SkeletonSliceCard />
        <SkeletonSliceCard />
      </div>
    </div>
  );
}

// Skeleton for list row
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-claude-neutral-800">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

// Skeleton for artifact card
export function SkeletonArtifactCard() {
  return (
    <div className="bg-claude-neutral-800 rounded-xl border border-claude-neutral-700 overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

// Skeleton for timeline row
export function SkeletonTimelineRow() {
  return (
    <div className="flex h-12 border-b border-claude-neutral-800">
      <div className="w-64 flex-shrink-0 px-4 flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <div className="flex-1 flex items-center px-4">
        <Skeleton className="h-7 w-32 rounded-md" />
      </div>
    </div>
  );
}

// Skeleton for document sidebar
export function SkeletonDocumentSidebar() {
  return (
    <div className="space-y-4 p-2">
      {[1, 2, 3].map(group => (
        <div key={group}>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="space-y-1">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {icon && (
          <div className="w-16 h-16 mx-auto mb-4 text-claude-neutral-600">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-claude-neutral-200 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-claude-neutral-500 mb-4">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-claude-primary-500 text-white rounded-lg hover:bg-claude-primary-600 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Error state
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">!</span>
        </div>
        <h3 className="text-lg font-medium text-claude-neutral-200 mb-2">
          {title}
        </h3>
        <p className="text-claude-neutral-500 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-claude-neutral-800 text-claude-neutral-200 rounded-lg hover:bg-claude-neutral-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// Inline loading for buttons
interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
}

export function ButtonLoading({ loading, children }: ButtonLoadingProps) {
  return (
    <>
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </>
  );
}

// ============= BUSINESS DOMAIN SKELETONS =============

// Skeleton for customer card
export function SkeletonCustomerCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

// Skeleton for deal/pipeline card
export function SkeletonDealCard() {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-24 mb-3" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-12 rounded" />
      </div>
    </div>
  );
}

// Skeleton for objective/OKR card
export function SkeletonObjectiveCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for release card
export function SkeletonReleaseCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-4 w-12 ml-auto" />
      </div>
    </div>
  );
}

// Skeleton for solution card
export function SkeletonSolutionCard() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
      <Skeleton className="h-32 w-full" />
      <div className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for feedback item
export function SkeletonFeedbackItem() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-12 rounded" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4 mb-3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for stats card
export function SkeletonStatsCard() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Skeleton for chart
export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className={`w-full rounded`} style={{ height }} />
    </div>
  );
}

// ============= CONTENT LOADERS =============

// Wrapper for async content with loading, error, and empty states
interface ContentLoaderProps<T> {
  loading: boolean;
  error?: Error | null;
  data: T | null | undefined;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
}

export function ContentLoader<T>({
  loading,
  error,
  data,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  isEmpty,
  onRetry,
}: ContentLoaderProps<T>) {
  if (loading) {
    return <>{loadingComponent || <PageLoading />}</>;
  }

  if (error) {
    return (
      <>
        {errorComponent || (
          <ErrorState message={error.message} onRetry={onRetry} />
        )}
      </>
    );
  }

  if (!data || (isEmpty && isEmpty(data))) {
    return (
      <>
        {emptyComponent || (
          <EmptyState title="No data" description="There's nothing here yet." />
        )}
      </>
    );
  }

  return <>{children(data)}</>;
}

// Inline loading indicator
interface InlineLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function InlineLoader({
  loading,
  children,
  fallback,
  className,
}: InlineLoaderProps) {
  if (loading) {
    return (
      <div className={clsx('inline-flex items-center gap-2', className)}>
        <Spinner size="sm" />
        {fallback && <span className="text-gray-400 text-sm">{fallback}</span>}
      </div>
    );
  }

  return <>{children}</>;
}

// Overlay loading for existing content
interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  loading,
  children,
  message,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={clsx('relative', className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-2" />
            {message && <p className="text-gray-400 text-sm">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Grid skeleton for card lists
interface SkeletonGridProps {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  CardComponent: React.ComponentType;
  className?: string;
}

export function SkeletonGrid({
  count = 6,
  columns = 3,
  CardComponent,
  className,
}: SkeletonGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={clsx('grid gap-4', gridClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </div>
  );
}

// List skeleton
interface SkeletonListProps {
  count?: number;
  RowComponent: React.ComponentType;
  className?: string;
}

export function SkeletonList({ count = 5, RowComponent, className }: SkeletonListProps) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RowComponent key={i} />
      ))}
    </div>
  );
}
