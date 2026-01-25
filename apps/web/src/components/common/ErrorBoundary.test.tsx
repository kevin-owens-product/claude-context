import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import {
  ErrorBoundary,
  ErrorFallback,
  InlineError,
  EmptyErrorState,
  NetworkError,
  ForbiddenError,
  NotFoundError,
} from './ErrorBoundary';

// Component that throws an error
function ThrowError({ error }: { error: Error }) {
  throw error;
}

// Suppress console.error for error boundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback when error occurs', () => {
    const error = new Error('Test error');
    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback', () => {
    const error = new Error('Test error');
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('calls onError callback', () => {
    const onError = vi.fn();
    const error = new Error('Test error');
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(error, expect.any(Object));
  });

  it('resets on Try Again click', () => {
    let shouldThrow = true;
    function MaybeThrow() {
      if (shouldThrow) throw new Error('Test error');
      return <div>Success</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change state and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders error message', () => {
    const error = new Error('Something broke');
    render(<ErrorFallback error={error} />);
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('renders default message when no error', () => {
    render(<ErrorFallback error={null} />);
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('shows error details when showDetails is true', () => {
    const error = new Error('Detailed error');
    error.stack = 'Error stack trace here';
    render(<ErrorFallback error={error} showDetails />);

    fireEvent.click(screen.getByText('Error Details'));
    expect(screen.getByText('Error stack trace here')).toBeInTheDocument();
  });

  it('calls onReset when Try Again is clicked', () => {
    const onReset = vi.fn();
    render(<ErrorFallback error={new Error('test')} onReset={onReset} />);

    fireEvent.click(screen.getByText('Try Again'));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('InlineError', () => {
  it('renders error message', () => {
    render(<InlineError message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<InlineError message="Error" onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides retry button when onRetry is not provided', () => {
    render(<InlineError message="Error" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});

describe('EmptyErrorState', () => {
  it('renders title and message', () => {
    render(<EmptyErrorState title="Failed to load" message="Unable to fetch data" />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Unable to fetch data')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyErrorState
        message="Error occurred"
        action={{ label: 'Retry', onClick }}
      />
    );

    fireEvent.click(screen.getByText('Retry'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('NetworkError', () => {
  it('renders network error message', () => {
    render(<NetworkError />);
    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('ForbiddenError', () => {
  it('renders access denied message', () => {
    render(<ForbiddenError />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<ForbiddenError message="You need admin access" />);
    expect(screen.getByText('You need admin access')).toBeInTheDocument();
  });

  it('shows go back button when onGoBack is provided', () => {
    const onGoBack = vi.fn();
    render(<ForbiddenError onGoBack={onGoBack} />);

    fireEvent.click(screen.getByText('Go Back'));
    expect(onGoBack).toHaveBeenCalled();
  });
});

describe('NotFoundError', () => {
  it('renders not found message', () => {
    render(<NotFoundError />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('renders custom resource name', () => {
    render(<NotFoundError resource="customer" />);
    expect(screen.getByText(/The customer you're looking for/)).toBeInTheDocument();
  });

  it('shows go back button when onGoBack is provided', () => {
    const onGoBack = vi.fn();
    render(<NotFoundError onGoBack={onGoBack} />);

    fireEvent.click(screen.getByText('Go Back'));
    expect(onGoBack).toHaveBeenCalled();
  });
});
