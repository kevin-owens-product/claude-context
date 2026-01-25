import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { CustomersView } from './CustomersView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('CustomersView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<CustomersView {...defaultProps} />);
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });

  it('displays metrics', () => {
    render(<CustomersView {...defaultProps} />);
    expect(screen.getByText('Total MRR')).toBeInTheDocument();
    expect(screen.getByText('Avg Health')).toBeInTheDocument();
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('displays demo customers', () => {
    render(<CustomersView {...defaultProps} />);
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('TechStart Inc')).toBeInTheDocument();
    expect(screen.getByText('Global Dynamics')).toBeInTheDocument();
  });

  it('displays customer tiers', () => {
    render(<CustomersView {...defaultProps} />);
    expect(screen.getAllByText('STRATEGIC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ENTERPRISE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GROWTH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('STANDARD').length).toBeGreaterThan(0);
  });

  it('has a working search input', () => {
    render(<CustomersView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search customers...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Acme' } });
    expect(searchInput).toHaveValue('Acme');
  });

  it('has tier filter dropdown', () => {
    render(<CustomersView {...defaultProps} />);
    const tierFilter = screen.getByDisplayValue('All Tiers');
    expect(tierFilter).toBeInTheDocument();

    fireEvent.change(tierFilter, { target: { value: 'STRATEGIC' } });
    expect(tierFilter).toHaveValue('STRATEGIC');
  });

  it('has sort by dropdown', () => {
    render(<CustomersView {...defaultProps} />);
    const sortFilter = screen.getByDisplayValue('Churn Risk');
    expect(sortFilter).toBeInTheDocument();

    fireEvent.change(sortFilter, { target: { value: 'mrr' } });
    expect(sortFilter).toHaveValue('mrr');
  });

  it('shows customer detail when clicking a customer', () => {
    render(<CustomersView {...defaultProps} />);

    // Click on a customer
    fireEvent.click(screen.getByText('Acme Corporation'));

    // Check if detail panel shows customer info
    expect(screen.getAllByText('Acme Corporation').length).toBeGreaterThan(1);
    // Health Score appears in list and detail panel
    expect(screen.getAllByText('Health Score').length).toBeGreaterThan(0);
    // Churn Risk appears in list and detail panel
    expect(screen.getAllByText('Churn Risk').length).toBeGreaterThan(0);
    // MRR and ARR appear in metrics bar and detail panel
    expect(screen.getAllByText('MRR').length).toBeGreaterThan(0);
    expect(screen.getByText('ARR')).toBeInTheDocument();
  });

  it('displays Add Customer button', () => {
    render(<CustomersView {...defaultProps} />);
    expect(screen.getByText('+ Add Customer')).toBeInTheDocument();
  });

  it('shows health scores', () => {
    render(<CustomersView {...defaultProps} />);
    // Check for health score indicators
    expect(screen.getAllByText(/health/i).length).toBeGreaterThan(0);
  });

  it('shows churn risk indicators', () => {
    render(<CustomersView {...defaultProps} />);
    // Check for churn risk indicators
    expect(screen.getAllByText(/Churn/i).length).toBeGreaterThan(0);
  });

  it('displays at risk badge for high churn customers', () => {
    render(<CustomersView {...defaultProps} />);
    // Demo data includes customers with churnRisk > 0.5
    expect(screen.getAllByText('AT RISK').length).toBeGreaterThan(0);
  });

  it('shows primary contact when customer selected', () => {
    render(<CustomersView {...defaultProps} />);

    // Click on a customer
    fireEvent.click(screen.getByText('Acme Corporation'));

    // Check for primary contact section
    expect(screen.getByText('Primary Contact')).toBeInTheDocument();
    // Sarah Chen appears in list and detail panel
    expect(screen.getAllByText('Sarah Chen').length).toBeGreaterThan(0);
  });

  it('shows subscription info when customer selected', () => {
    render(<CustomersView {...defaultProps} />);

    // Click on a customer
    fireEvent.click(screen.getByText('Acme Corporation'));

    // Check for subscription section
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Plus')).toBeInTheDocument();
  });

  it('shows recent activity when customer selected', () => {
    render(<CustomersView {...defaultProps} />);

    // Click on a customer
    fireEvent.click(screen.getByText('Acme Corporation'));

    // Check for recent activity section
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows quick actions when customer selected', () => {
    render(<CustomersView {...defaultProps} />);

    // Click on a customer
    fireEvent.click(screen.getByText('Acme Corporation'));

    // Check for quick actions section
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
});
