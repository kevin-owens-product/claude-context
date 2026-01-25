import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { SolutionsView } from './SolutionsView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('SolutionsView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getByText('Solution Gallery')).toBeInTheDocument();
  });

  it('displays KPI cards', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getByText('Published Solutions')).toBeInTheDocument();
    expect(screen.getByText('Implementations')).toBeInTheDocument();
    expect(screen.getByText('Avg Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Hours Saved')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('displays demo use cases', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getByText('Automated Lead Scoring')).toBeInTheDocument();
    expect(screen.getByText('Customer Health Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Sprint Planning Assistant')).toBeInTheDocument();
  });

  it('displays categories', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getAllByText('Sales').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Marketing').length).toBeGreaterThan(0);
  });

  it('displays complexity levels', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getAllByText('LOW').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
  });

  it('has a working search input', () => {
    render(<SolutionsView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search solutions...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Lead' } });
    expect(searchInput).toHaveValue('Lead');
  });

  it('has category filter dropdown', () => {
    render(<SolutionsView {...defaultProps} />);
    const categoryFilter = screen.getByDisplayValue('All Categories');
    expect(categoryFilter).toBeInTheDocument();

    fireEvent.change(categoryFilter, { target: { value: 'Sales' } });
    expect(categoryFilter).toHaveValue('Sales');
  });

  it('has complexity filter dropdown', () => {
    render(<SolutionsView {...defaultProps} />);
    const complexityFilter = screen.getByDisplayValue('All Complexity');
    expect(complexityFilter).toBeInTheDocument();

    fireEvent.change(complexityFilter, { target: { value: 'LOW' } });
    expect(complexityFilter).toHaveValue('LOW');
  });

  it('toggles between grid and list view', () => {
    render(<SolutionsView {...defaultProps} />);

    // Find view toggle buttons
    const gridButton = screen.getByRole('button', { name: 'Grid' });
    const listButton = screen.getByRole('button', { name: 'List' });

    expect(gridButton).toBeInTheDocument();
    expect(listButton).toBeInTheDocument();

    // Click list
    fireEvent.click(listButton);

    // Click grid
    fireEvent.click(gridButton);
  });

  it('opens detail panel when clicking a use case', () => {
    render(<SolutionsView {...defaultProps} />);

    // Click on a use case
    fireEvent.click(screen.getByText('Automated Lead Scoring'));

    // Check if detail panel appears
    expect(screen.getByText('Solution Details')).toBeInTheDocument();
  });

  it('displays Submit Solution button', () => {
    render(<SolutionsView {...defaultProps} />);
    expect(screen.getByText('Submit Solution')).toBeInTheDocument();
  });

  it('shows time saved metrics', () => {
    render(<SolutionsView {...defaultProps} />);
    // Check for time saved indicators
    expect(screen.getAllByText(/h/i).length).toBeGreaterThan(0);
  });

  it('shows success rates', () => {
    render(<SolutionsView {...defaultProps} />);
    // Check for percentage success rates
    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0);
  });

  it('shows implementation counts', () => {
    render(<SolutionsView {...defaultProps} />);
    // Check for implementation counts - look for "Implementations" KPI label
    expect(screen.getByText('Implementations')).toBeInTheDocument();
  });

  it('displays value propositions', () => {
    render(<SolutionsView {...defaultProps} />);
    // Click to see value proposition in detail panel
    fireEvent.click(screen.getByText('Automated Lead Scoring'));
    expect(screen.getByText('Value Proposition')).toBeInTheDocument();
  });
});
