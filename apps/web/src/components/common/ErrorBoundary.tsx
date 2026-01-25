/**
 * ErrorBoundary - React error boundary with fallback UI
 * @prompt-id forge-v4.1:web:components:error-boundary:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { clsx } from 'clsx';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const changed = this.props.resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (changed) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
          showDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback UI
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onReset?: () => void;
  showDetails?: boolean;
}

export function ErrorFallback({ error, errorInfo, onReset, showDetails = false }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-500/20 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">
          Something went wrong
        </h2>

        <p className="text-gray-400 mb-6">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="flex items-center justify-center gap-3 mb-6">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Reload Page
          </button>
        </div>

        {showDetails && error && (
          <details className="text-left bg-gray-800/50 rounded-lg p-4 mt-4">
            <summary className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white">
              <Bug className="w-4 h-4" />
              Error Details
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-red-400 font-mono break-all">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs text-gray-500 overflow-x-auto max-h-48 p-2 bg-gray-900 rounded">
                  {error.stack}
                </pre>
              )}
              {errorInfo?.componentStack && (
                <pre className="text-xs text-gray-500 overflow-x-auto max-h-32 p-2 bg-gray-900 rounded">
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// Inline error component for smaller areas
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg',
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <span className="text-sm text-red-300 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

// Empty state with error styling
interface EmptyErrorStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyErrorState({
  title = 'Unable to load',
  message,
  action,
  className,
}: EmptyErrorStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="p-3 bg-red-500/10 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-sm mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

// Network error specific display
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="p-3 bg-amber-500/10 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Connection Problem</h3>
      <p className="text-gray-400 text-center max-w-sm mb-4">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

// Forbidden/Unauthorized error display
interface ForbiddenErrorProps {
  message?: string;
  onGoBack?: () => void;
  className?: string;
}

export function ForbiddenError({
  message = "You don't have permission to access this resource.",
  onGoBack,
  className,
}: ForbiddenErrorProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="p-3 bg-purple-500/10 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
      <p className="text-gray-400 text-center max-w-sm mb-4">{message}</p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      )}
    </div>
  );
}

// Not found error display
interface NotFoundErrorProps {
  resource?: string;
  onGoBack?: () => void;
  className?: string;
}

export function NotFoundError({
  resource = 'resource',
  onGoBack,
  className,
}: NotFoundErrorProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="p-3 bg-gray-500/10 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">Not Found</h3>
      <p className="text-gray-400 text-center max-w-sm mb-4">
        The {resource} you're looking for doesn't exist or has been removed.
      </p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      )}
    </div>
  );
}
