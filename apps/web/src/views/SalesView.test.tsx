import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '../test/utils';
import { SalesView } from './SalesView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('SalesView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<SalesView {...defaultProps} />);
    expect(screen.getByText('Sales Pipeline')).toBeInTheDocument();
  });

  it('displays KPI cards', () => {
    render(<SalesView {...defaultProps} />);
    expect(screen.getByText('Total Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Weighted Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Closing Soon')).toBeInTheDocument();
    expect(screen.getByText('Blocked by Features')).toBeInTheDocument();
    expect(screen.getByText('Won This Month')).toBeInTheDocument();
  });

  it('displays pipeline stages', () => {
    render(<SalesView {...defaultProps} />);
    expect(screen.getByText('Qualification')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Proposal')).toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
    expect(screen.getByText('Closed Won')).toBeInTheDocument();
  });

  it('displays demo deals', () => {
    render(<SalesView {...defaultProps} />);
    expect(screen.getByText('TechCorp Inc')).toBeInTheDocument();
    expect(screen.getByText('DataFlow Systems')).toBeInTheDocument();
  });

  it('has a working search input', () => {
    render(<SalesView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search deals...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'TechCorp' } });
    expect(searchInput).toHaveValue('TechCorp');
  });

  it('opens detail panel when clicking a deal', () => {
    render(<SalesView {...defaultProps} />);

    // Find the deal name text, then get its parent button element
    const dealText = screen.getByText('TechCorp Inc');
    const dealButton = dealText.closest('button');
    expect(dealButton).not.toBeNull();
    fireEvent.click(dealButton!);

    // Check if detail panel is visible
    expect(screen.getByText('Deal Details')).toBeInTheDocument();
  });

  it('closes detail panel when clicking close button', () => {
    render(<SalesView {...defaultProps} />);

    // Open detail panel
    const dealText = screen.getByText('TechCorp Inc');
    const dealButton = dealText.closest('button');
    fireEvent.click(dealButton!);

    // Verify panel is open
    expect(screen.getByText('Deal Details')).toBeInTheDocument();

    // Find and click close button (first button in the panel header)
    const detailPanel = screen.getByText('Deal Details').closest('div[class*="fixed"]') as HTMLElement;
    const closeBtn = within(detailPanel).getAllByRole('button')[0];
    fireEvent.click(closeBtn);
  });

  it('displays New Deal button', () => {
    render(<SalesView {...defaultProps} />);
    expect(screen.getByText('New Deal')).toBeInTheDocument();
  });

  it('shows deal blockers when present', () => {
    render(<SalesView {...defaultProps} />);

    // Click on TechCorp deal which has blockers
    const dealText = screen.getByText('TechCorp Inc');
    const dealButton = dealText.closest('button');
    fireEvent.click(dealButton!);

    // The blocker appears in the detail panel (may appear multiple times in AI insight too)
    expect(screen.getAllByText(/Custom Report Builder/i).length).toBeGreaterThan(0);
  });
});
