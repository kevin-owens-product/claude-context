/**
 * useError - Hook for error state management
 * @prompt-id forge-v4.1:web:hooks:error:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useCallback, useMemo } from 'react';

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  retryable?: boolean;
}

export type ErrorType = 'network' | 'validation' | 'auth' | 'notFound' | 'forbidden' | 'server' | 'unknown';

export function getErrorType(error: unknown): ErrorType {
  // Get message from various error types
  let message = '';
  if (error instanceof Error) {
    message = error.message.toLowerCase();
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as { message: unknown }).message).toLowerCase();
  }

  if (message) {
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'auth';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'forbidden';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'notFound';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server';
    }
  }

  // Check for HTTP response errors
  if (typeof error === 'object' && error !== null) {
    const httpError = error as { status?: number; statusCode?: number };
    const status = httpError.status || httpError.statusCode;

    if (status === 401) return 'auth';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'notFound';
    if (status && status >= 400 && status < 500) return 'validation';
    if (status && status >= 500) return 'server';
  }

  return 'unknown';
}

export function createAppError(
  error: unknown,
  code = 'UNKNOWN_ERROR',
  retryable = true
): AppError {
  let message = 'An unexpected error occurred';
  let details: Record<string, unknown> | undefined;

  if (error instanceof Error) {
    message = error.message;
    details = { stack: error.stack };
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    message = (obj.message as string) || message;
    details = obj;
  }

  return {
    code,
    message,
    details,
    timestamp: new Date(),
    retryable,
  };
}

interface UseErrorOptions {
  onError?: (error: AppError) => void;
  autoReset?: number; // Auto-reset after ms
}

export function useError(options: UseErrorOptions = {}) {
  const { onError, autoReset } = options;
  const [error, setError] = useState<AppError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const setAppError = useCallback(
    (err: unknown, code?: string, retryable?: boolean) => {
      const appError = createAppError(err, code, retryable);
      setError(appError);
      onError?.(appError);

      if (autoReset && autoReset > 0) {
        setTimeout(() => {
          setError(null);
        }, autoReset);
      }
    },
    [onError, autoReset]
  );

  const clearError = useCallback(() => {
    setError(null);
    setIsRecovering(false);
  }, []);

  const retry = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (!error?.retryable) return null;

      setIsRecovering(true);
      try {
        const result = await fn();
        clearError();
        return result;
      } catch (err) {
        setAppError(err);
        return null;
      } finally {
        setIsRecovering(false);
      }
    },
    [error, clearError, setAppError]
  );

  const errorType = useMemo(() => (error ? getErrorType(error) : null), [error]);

  return {
    error,
    errorType,
    isRecovering,
    setError: setAppError,
    clearError,
    retry,
    hasError: error !== null,
  };
}

// Hook for async operations with error handling
interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useAsync<T>(options: UseAsyncOptions<T> = {}) {
  const { onSuccess, onError, retryCount = 0, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(
    async (asyncFn: () => Promise<T>, currentAttempt = 0): Promise<T | null> => {
      setLoading(true);
      setError(null);
      setAttempt(currentAttempt);

      try {
        const result = await asyncFn();
        setData(result);
        setLoading(false);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const appError = createAppError(err);

        // Retry logic
        if (currentAttempt < retryCount && appError.retryable) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return execute(asyncFn, currentAttempt + 1);
        }

        setError(appError);
        setLoading(false);
        onError?.(appError);
        return null;
      }
    },
    [onSuccess, onError, retryCount, retryDelay]
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setAttempt(0);
  }, []);

  return {
    data,
    loading,
    error,
    attempt,
    execute,
    reset,
    isRetrying: attempt > 0 && loading,
  };
}

// Hook for form validation errors
export interface ValidationError {
  field: string;
  message: string;
}

export function useValidationErrors() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const addError = useCallback((field: string, message: string) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const removeError = useCallback((field: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getError = useCallback(
    (field: string) => errors.find((e) => e.field === field)?.message,
    [errors]
  );

  const hasErrors = errors.length > 0;

  const setValidationErrors = useCallback((errs: ValidationError[]) => {
    setErrors(errs);
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    getError,
    hasErrors,
    setValidationErrors,
  };
}
