import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import {
  Spinner,
  PageLoading,
  Skeleton,
  SkeletonText,
  SkeletonCustomerCard,
  SkeletonDealCard,
  SkeletonObjectiveCard,
  SkeletonReleaseCard,
  SkeletonSolutionCard,
  SkeletonFeedbackItem,
  SkeletonStatsCard,
  SkeletonChart,
  ContentLoader,
  InlineLoader,
  LoadingOverlay,
  SkeletonGrid,
  SkeletonList,
  EmptyState,
  ErrorState,
} from './LoadingStates';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toHaveClass('w-6', 'h-6');
  });

  it('renders with small size', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.querySelector('svg')).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector('svg')).toHaveClass('w-8', 'h-8');
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="text-red-500" />);
    expect(container.querySelector('svg')).toHaveClass('text-red-500');
  });
});

describe('PageLoading', () => {
  it('renders with default message', () => {
    render(<PageLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<PageLoading message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders with animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstChild).toHaveClass('h-4', 'w-20');
  });
});

describe('SkeletonText', () => {
  it('renders default number of lines', () => {
    const { container } = render(<SkeletonText />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(5);
  });
});

describe('Business Skeleton Components', () => {
  it('renders SkeletonCustomerCard', () => {
    const { container } = render(<SkeletonCustomerCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonDealCard', () => {
    const { container } = render(<SkeletonDealCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonObjectiveCard', () => {
    const { container } = render(<SkeletonObjectiveCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonReleaseCard', () => {
    const { container } = render(<SkeletonReleaseCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonSolutionCard', () => {
    const { container } = render(<SkeletonSolutionCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonFeedbackItem', () => {
    const { container } = render(<SkeletonFeedbackItem />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonStatsCard', () => {
    const { container } = render(<SkeletonStatsCard />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders SkeletonChart', () => {
    const { container } = render(<SkeletonChart height={300} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('ContentLoader', () => {
  it('shows loading component when loading', () => {
    render(
      <ContentLoader
        loading={true}
        error={null}
        data={null}
        loadingComponent={<div>Custom Loading</div>}
      >
        {(data) => <div>{data}</div>}
      </ContentLoader>
    );
    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('shows default loading when no custom component', () => {
    render(
      <ContentLoader loading={true} error={null} data={null}>
        {(data) => <div>{data}</div>}
      </ContentLoader>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error component when error exists', () => {
    render(
      <ContentLoader
        loading={false}
        error={new Error('Failed to load')}
        data={null}
      >
        {(data) => <div>{data}</div>}
      </ContentLoader>
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('shows empty component when data is empty', () => {
    render(
      <ContentLoader
        loading={false}
        error={null}
        data={[]}
        isEmpty={(data) => data.length === 0}
        emptyComponent={<div>No items</div>}
      >
        {(data) => <div>{data.join(',')}</div>}
      </ContentLoader>
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders children with data', () => {
    render(
      <ContentLoader loading={false} error={null} data="Hello World">
        {(data) => <div>{data}</div>}
      </ContentLoader>
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(
      <ContentLoader
        loading={false}
        error={new Error('Failed')}
        data={null}
        onRetry={onRetry}
      >
        {(data) => <div>{data}</div>}
      </ContentLoader>
    );
    screen.getByText('Try Again').click();
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('InlineLoader', () => {
  it('shows spinner when loading', () => {
    const { container } = render(
      <InlineLoader loading={true}>
        <span>Content</span>
      </InlineLoader>
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows fallback text when loading', () => {
    render(
      <InlineLoader loading={true} fallback="Loading data...">
        <span>Content</span>
      </InlineLoader>
    );
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('shows children when not loading', () => {
    render(
      <InlineLoader loading={false}>
        <span>Content</span>
      </InlineLoader>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('LoadingOverlay', () => {
  it('shows children always', () => {
    render(
      <LoadingOverlay loading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows overlay when loading', () => {
    const { container } = render(
      <LoadingOverlay loading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(container.querySelector('.absolute')).toBeInTheDocument();
  });

  it('shows message when loading', () => {
    render(
      <LoadingOverlay loading={true} message="Saving...">
        <div>Content</div>
      </LoadingOverlay>
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});

describe('SkeletonGrid', () => {
  it('renders correct number of skeleton cards', () => {
    const MockCard = () => <div data-testid="mock-card" />;
    render(<SkeletonGrid count={4} CardComponent={MockCard} />);
    expect(screen.getAllByTestId('mock-card').length).toBe(4);
  });

  it('applies correct grid columns', () => {
    const MockCard = () => <div />;
    const { container } = render(<SkeletonGrid columns={3} CardComponent={MockCard} />);
    expect(container.firstChild).toHaveClass('lg:grid-cols-3');
  });
});

describe('SkeletonList', () => {
  it('renders correct number of rows', () => {
    const MockRow = () => <div data-testid="mock-row" />;
    render(<SkeletonList count={3} RowComponent={MockRow} />);
    expect(screen.getAllByTestId('mock-row').length).toBe(3);
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Start by adding one" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Start by adding one')).toBeInTheDocument();
  });

  it('renders action button', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Add Item', onClick }} />);
    screen.getByText('Add Item').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('renders icon', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">*</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Failed to load data" />);
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Oops!" message="Error" />);
    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });

  it('shows retry button', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    screen.getByText('Try Again').click();
    expect(onRetry).toHaveBeenCalled();
  });
});
