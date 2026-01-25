import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { FeedbackView } from './FeedbackView';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch;

describe('FeedbackView', () => {
  const defaultProps = {
    tenantId: 'test-tenant',
  };

  it('renders without crashing', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getByText('Feedback Inbox')).toBeInTheDocument();
  });

  it('displays metrics', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    // NPS appears in both metrics and dropdown
    expect(screen.getAllByText('NPS').length).toBeGreaterThan(0);
    expect(screen.getByText('Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('displays demo feedback items', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getByText('Need SSO/SAML Support')).toBeInTheDocument();
    expect(screen.getByText('Dashboard charts not loading in Safari')).toBeInTheDocument();
    expect(screen.getByText('Amazing support experience!')).toBeInTheDocument();
  });

  it('displays feedback types', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getAllByText(/Feature/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bug/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Praise/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/NPS/i).length).toBeGreaterThan(0);
  });

  it('displays priority levels', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LOW').length).toBeGreaterThan(0);
  });

  it('displays status indicators', () => {
    render(<FeedbackView {...defaultProps} />);
    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RESOLVED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CLOSED').length).toBeGreaterThan(0);
  });

  it('has a working search input', () => {
    render(<FeedbackView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search feedback...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'SSO' } });
    expect(searchInput).toHaveValue('SSO');
  });

  it('has type filter dropdown', () => {
    render(<FeedbackView {...defaultProps} />);
    const typeFilter = screen.getByDisplayValue('All Types');
    expect(typeFilter).toBeInTheDocument();

    fireEvent.change(typeFilter, { target: { value: 'BUG_REPORT' } });
    expect(typeFilter).toHaveValue('BUG_REPORT');
  });

  it('has status filter dropdown', () => {
    render(<FeedbackView {...defaultProps} />);
    const statusFilter = screen.getByDisplayValue('All Status');
    expect(statusFilter).toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: 'NEW' } });
    expect(statusFilter).toHaveValue('NEW');
  });

  it('shows feedback detail when clicking an item', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on a feedback item
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check if detail panel shows
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Tier')).toBeInTheDocument();
    // MRR appears multiple times
    expect(screen.getAllByText('MRR').length).toBeGreaterThan(0);
  });

  it('shows customer info in detail panel', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on a feedback item
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check for customer info
    expect(screen.getAllByText('Acme Corporation').length).toBeGreaterThan(0);
  });

  it('shows sentiment emojis', () => {
    render(<FeedbackView {...defaultProps} />);
    // Sentiment emojis should be visible in the list
    expect(document.body.textContent).toMatch(/[😍🙂😐😕😠]/);
  });

  it('shows linked feature request when available', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on feedback with linked feature
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check for linked feature
    expect(screen.getByText('Linked Feature Request')).toBeInTheDocument();
    expect(screen.getByText('SSO/SAML Enterprise Authentication')).toBeInTheDocument();
  });

  it('shows conversation thread when responses exist', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on feedback with responses
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check for conversation section
    expect(screen.getByText('Conversation')).toBeInTheDocument();
  });

  it('shows quick actions in detail panel', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on a feedback item
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check for quick actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('has reply input in detail panel', () => {
    render(<FeedbackView {...defaultProps} />);

    // Click on a feedback item
    fireEvent.click(screen.getByText('Need SSO/SAML Support'));

    // Check for reply input
    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    expect(screen.getByText('Send Reply')).toBeInTheDocument();
    expect(screen.getByText('Internal Note')).toBeInTheDocument();
  });

  it('shows NPS scores when available', () => {
    render(<FeedbackView {...defaultProps} />);
    // Check for NPS scores in feedback list
    expect(screen.getAllByText(/NPS:/i).length).toBeGreaterThan(0);
  });
});
