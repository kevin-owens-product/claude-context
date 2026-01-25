import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { OutcomesView } from './OutcomesView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('OutcomesView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<OutcomesView {...defaultProps} />);
    expect(screen.getByText('Outcomes & OKRs')).toBeInTheDocument();
  });

  it('displays KPI cards', () => {
    render(<OutcomesView {...defaultProps} />);
    expect(screen.getByText('Total Objectives')).toBeInTheDocument();
    expect(screen.getByText('Avg Progress')).toBeInTheDocument();
    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Achieved').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('KRs On Track')).toBeInTheDocument();
  });

  it('displays demo objectives', () => {
    render(<OutcomesView {...defaultProps} />);
    expect(screen.getByText('Accelerate Product-Led Growth')).toBeInTheDocument();
    expect(screen.getByText('Expand Enterprise Revenue')).toBeInTheDocument();
    expect(screen.getByText('Improve Customer Success')).toBeInTheDocument();
    expect(screen.getByText('Platform Reliability')).toBeInTheDocument();
  });

  it('displays objective levels', () => {
    render(<OutcomesView {...defaultProps} />);
    // Check for level badges
    expect(screen.getAllByText('COMPANY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEPARTMENT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TEAM').length).toBeGreaterThan(0);
  });

  it('has a working search input', () => {
    render(<OutcomesView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search objectives...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Growth' } });
    expect(searchInput).toHaveValue('Growth');
  });

  it('has level filter dropdown', () => {
    render(<OutcomesView {...defaultProps} />);
    const levelFilter = screen.getByDisplayValue('All Levels');
    expect(levelFilter).toBeInTheDocument();

    fireEvent.change(levelFilter, { target: { value: 'COMPANY' } });
    expect(levelFilter).toHaveValue('COMPANY');
  });

  it('has status filter dropdown', () => {
    render(<OutcomesView {...defaultProps} />);
    const statusFilter = screen.getByDisplayValue('All Status');
    expect(statusFilter).toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    expect(statusFilter).toHaveValue('ACTIVE');
  });

  it('expands objective to show key results', () => {
    render(<OutcomesView {...defaultProps} />);

    // First objective should already be expanded based on initial state
    // Check for a key result from the first objective
    expect(screen.getByText('Increase monthly active users to 50K')).toBeInTheDocument();
  });

  it('opens detail panel when clicking objective title', () => {
    render(<OutcomesView {...defaultProps} />);

    // Click on an objective title
    fireEvent.click(screen.getByText('Expand Enterprise Revenue'));

    // Check if detail panel appears
    expect(screen.getByText('Objective Details')).toBeInTheDocument();
  });

  it('displays New Objective button', () => {
    render(<OutcomesView {...defaultProps} />);
    expect(screen.getByText('New Objective')).toBeInTheDocument();
  });

  it('shows progress bars for objectives', () => {
    render(<OutcomesView {...defaultProps} />);
    // Check for percentage displays
    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThan(0);
  });

  it('shows owner information', () => {
    render(<OutcomesView {...defaultProps} />);
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText('Marcus Rodriguez')).toBeInTheDocument();
  });
});
