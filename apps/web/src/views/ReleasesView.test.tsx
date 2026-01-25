import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { ReleasesView } from './ReleasesView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('ReleasesView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getByText('Releases')).toBeInTheDocument();
  });

  it('displays KPI cards', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getByText('Total Releases')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    // 'Released' appears in both KPI label and filter dropdown
    expect(screen.getAllByText('Released').length).toBeGreaterThan(0);
    expect(screen.getByText('Features Shipped')).toBeInTheDocument();
    expect(screen.getByText('Bugs Fixed')).toBeInTheDocument();
  });

  it('displays demo releases', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getByText('v2.5.0')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Authentication')).toBeInTheDocument();
    expect(screen.getByText('v2.4.2')).toBeInTheDocument();
    expect(screen.getByText('Performance Patch')).toBeInTheDocument();
  });

  it('displays release types', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getAllByText('MINOR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PATCH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MAJOR').length).toBeGreaterThan(0);
  });

  it('displays release statuses', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('STAGED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RELEASED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PLANNED').length).toBeGreaterThan(0);
  });

  it('has a working search input', () => {
    render(<ReleasesView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search releases...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Authentication' } });
    expect(searchInput).toHaveValue('Authentication');
  });

  it('has type filter dropdown', () => {
    render(<ReleasesView {...defaultProps} />);
    const typeFilter = screen.getByDisplayValue('All Types');
    expect(typeFilter).toBeInTheDocument();

    fireEvent.change(typeFilter, { target: { value: 'MAJOR' } });
    expect(typeFilter).toHaveValue('MAJOR');
  });

  it('has status filter dropdown', () => {
    render(<ReleasesView {...defaultProps} />);
    const statusFilter = screen.getByDisplayValue('All Status');
    expect(statusFilter).toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: 'RELEASED' } });
    expect(statusFilter).toHaveValue('RELEASED');
  });

  it('toggles between list and timeline view', () => {
    render(<ReleasesView {...defaultProps} />);

    // Find view toggle buttons
    const listButton = screen.getByRole('button', { name: 'List' });
    const timelineButton = screen.getByRole('button', { name: 'Timeline' });

    expect(listButton).toBeInTheDocument();
    expect(timelineButton).toBeInTheDocument();

    // Click timeline
    fireEvent.click(timelineButton);

    // Click list
    fireEvent.click(listButton);
  });

  it('opens detail panel when clicking a release', () => {
    render(<ReleasesView {...defaultProps} />);

    // Click on a release
    fireEvent.click(screen.getByText('Enterprise Authentication'));

    // Check if detail panel appears
    expect(screen.getByText('Release Details')).toBeInTheDocument();
  });

  it('displays New Release button', () => {
    render(<ReleasesView {...defaultProps} />);
    expect(screen.getByText('New Release')).toBeInTheDocument();
  });

  it('shows customer impact numbers', () => {
    render(<ReleasesView {...defaultProps} />);
    // Check for customer counts in demo data
    expect(screen.getAllByText(/customers/).length).toBeGreaterThan(0);
  });

  it('shows release item counts', () => {
    render(<ReleasesView {...defaultProps} />);
    // Check for item counts
    expect(screen.getAllByText(/items/).length).toBeGreaterThan(0);
  });
});
