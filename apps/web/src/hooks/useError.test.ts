import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useError,
  useAsync,
  useValidationErrors,
  getErrorType,
  createAppError,
} from './useError';

describe('getErrorType', () => {
  it('returns network for fetch errors', () => {
    expect(getErrorType(new Error('fetch failed'))).toBe('network');
    expect(getErrorType(new Error('network error'))).toBe('network');
  });

  it('returns auth for 401 errors', () => {
    expect(getErrorType(new Error('401 unauthorized'))).toBe('auth');
    expect(getErrorType({ status: 401 })).toBe('auth');
  });

  it('returns forbidden for 403 errors', () => {
    expect(getErrorType(new Error('403 forbidden'))).toBe('forbidden');
    expect(getErrorType({ status: 403 })).toBe('forbidden');
  });

  it('returns notFound for 404 errors', () => {
    expect(getErrorType(new Error('404 not found'))).toBe('notFound');
    expect(getErrorType({ statusCode: 404 })).toBe('notFound');
  });

  it('returns validation for invalid input errors', () => {
    expect(getErrorType(new Error('validation failed'))).toBe('validation');
    expect(getErrorType({ status: 400 })).toBe('validation');
  });

  it('returns server for 500 errors', () => {
    expect(getErrorType(new Error('500 server error'))).toBe('server');
    expect(getErrorType({ status: 500 })).toBe('server');
  });

  it('returns unknown for unrecognized errors', () => {
    expect(getErrorType(new Error('random error'))).toBe('unknown');
    expect(getErrorType('string error')).toBe('unknown');
  });
});

describe('createAppError', () => {
  it('creates error from Error object', () => {
    const error = new Error('Test error');
    const appError = createAppError(error);

    expect(appError.message).toBe('Test error');
    expect(appError.code).toBe('UNKNOWN_ERROR');
    expect(appError.retryable).toBe(true);
    expect(appError.timestamp).toBeInstanceOf(Date);
  });

  it('creates error from string', () => {
    const appError = createAppError('String error', 'CUSTOM_CODE');

    expect(appError.message).toBe('String error');
    expect(appError.code).toBe('CUSTOM_CODE');
  });

  it('creates error from object', () => {
    const appError = createAppError({ message: 'Object error', extra: 'data' });

    expect(appError.message).toBe('Object error');
    expect(appError.details).toEqual({ message: 'Object error', extra: 'data' });
  });

  it('sets retryable flag', () => {
    const appError = createAppError('error', 'CODE', false);
    expect(appError.retryable).toBe(false);
  });
});

describe('useError', () => {
  it('starts with no error', () => {
    const { result } = renderHook(() => useError());

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('sets error', () => {
    const { result } = renderHook(() => useError());

    act(() => {
      result.current.setError(new Error('Test error'));
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.error?.message).toBe('Test error');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useError());

    act(() => {
      result.current.setError(new Error('Test error'));
    });

    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.hasError).toBe(false);
  });

  it('calls onError callback', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useError({ onError }));

    act(() => {
      result.current.setError(new Error('Test error'));
    });

    expect(onError).toHaveBeenCalled();
  });

  it('auto-resets error after timeout', async () => {
    const { result } = renderHook(() => useError({ autoReset: 100 }));

    act(() => {
      result.current.setError(new Error('Test error'));
    });

    expect(result.current.hasError).toBe(true);

    await waitFor(
      () => {
        expect(result.current.hasError).toBe(false);
      },
      { timeout: 200 }
    );
  });

  it('retries operation', async () => {
    const { result } = renderHook(() => useError());
    let callCount = 0;

    act(() => {
      result.current.setError(new Error('Initial error'), 'ERROR', true);
    });

    const successFn = vi.fn(async () => {
      callCount++;
      return 'success';
    });

    let retryResult: string | null = null;
    await act(async () => {
      retryResult = await result.current.retry(successFn);
    });

    expect(successFn).toHaveBeenCalled();
    expect(retryResult).toBe('success');
    expect(result.current.hasError).toBe(false);
  });

  it('computes errorType', () => {
    const { result } = renderHook(() => useError());

    act(() => {
      result.current.setError(new Error('network failed'));
    });

    expect(result.current.errorType).toBe('network');
  });
});

describe('useAsync', () => {
  it('executes async function successfully', async () => {
    const { result } = renderHook(() => useAsync<string>());

    let data: string | null = null;
    await act(async () => {
      data = await result.current.execute(async () => 'result');
    });

    expect(data).toBe('result');
    expect(result.current.data).toBe('result');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles error', async () => {
    const { result } = renderHook(() => useAsync<string>());

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('Failed');
      });
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe('Failed');
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsync<string>({ onSuccess }));

    await act(async () => {
      await result.current.execute(async () => 'data');
    });

    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('calls onError callback', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsync<string>({ onError }));

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('Failed');
      });
    });

    expect(onError).toHaveBeenCalled();
  });

  it('retries on failure', async () => {
    let attempts = 0;
    const { result } = renderHook(() =>
      useAsync<string>({ retryCount: 2, retryDelay: 10 })
    );

    await act(async () => {
      await result.current.execute(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Retry');
        return 'success';
      });
    });

    expect(attempts).toBe(3);
    expect(result.current.data).toBe('success');
  });

  it('resets state', async () => {
    const { result } = renderHook(() => useAsync<string>());

    await act(async () => {
      await result.current.execute(async () => 'data');
    });

    expect(result.current.data).toBe('data');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useValidationErrors', () => {
  it('starts with no errors', () => {
    const { result } = renderHook(() => useValidationErrors());

    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('adds error', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.addError('email', 'Invalid email');
    });

    expect(result.current.errors).toEqual([{ field: 'email', message: 'Invalid email' }]);
    expect(result.current.hasErrors).toBe(true);
  });

  it('replaces error for same field', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.addError('email', 'Invalid email');
      result.current.addError('email', 'Email required');
    });

    expect(result.current.errors).toEqual([{ field: 'email', message: 'Email required' }]);
  });

  it('removes error', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.addError('email', 'Invalid');
      result.current.addError('name', 'Required');
    });

    act(() => {
      result.current.removeError('email');
    });

    expect(result.current.errors).toEqual([{ field: 'name', message: 'Required' }]);
  });

  it('clears all errors', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.addError('email', 'Invalid');
      result.current.addError('name', 'Required');
    });

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('gets error for field', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.addError('email', 'Invalid email');
    });

    expect(result.current.getError('email')).toBe('Invalid email');
    expect(result.current.getError('name')).toBeUndefined();
  });

  it('sets multiple errors at once', () => {
    const { result } = renderHook(() => useValidationErrors());

    act(() => {
      result.current.setValidationErrors([
        { field: 'email', message: 'Invalid' },
        { field: 'name', message: 'Required' },
      ]);
    });

    expect(result.current.errors).toHaveLength(2);
  });
});
