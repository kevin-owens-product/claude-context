import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import { RoadmapView } from './RoadmapView';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  // Default: API not available, fallback to demo data
  mockFetch.mockRejectedValue(new Error('API not available'));
});

describe('RoadmapView', () => {
  it('renders without crashing', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    // Wait for demo data to load
    await waitFor(() => {
      expect(screen.getByText('Feature Backlog')).toBeInTheDocument();
    });
  });

  it('displays feature backlog header', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Feature Backlog')).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search features...')).toBeInTheDocument();
    });
  });

  it('displays status filter dropdown', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });
  });

  it('displays sort dropdown', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Priority Score')).toBeInTheDocument();
    });
  });

  it('shows stats summary cards', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Active Requests')).toBeInTheDocument();
      expect(screen.getByText('Total Votes')).toBeInTheDocument();
      expect(screen.getByText('Blocked Deal Value')).toBeInTheDocument();
      expect(screen.getByText('Requesting MRR')).toBeInTheDocument();
    });
  });

  it('displays feature requests from demo data', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      // Demo data includes SSO feature
      expect(screen.getByText('SSO/SAML Enterprise Authentication')).toBeInTheDocument();
    });
  });

  it('displays feature request short IDs', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('FR-001')).toBeInTheDocument();
    });
  });

  it('shows priority scores', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      // The highest priority score in demo data is 892
      expect(screen.getByText('892')).toBeInTheDocument();
    });
  });

  it('opens feature detail modal when clicking a feature', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('SSO/SAML Enterprise Authentication')).toBeInTheDocument();
    });

    // Click on a feature card
    const featureCard = screen.getByText('SSO/SAML Enterprise Authentication').closest('.cursor-pointer');
    if (featureCard) {
      fireEvent.click(featureCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Feature Request Details')).toBeInTheDocument();
    });
  });

  it('closes feature detail modal when clicking close button', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('SSO/SAML Enterprise Authentication')).toBeInTheDocument();
    });

    // Open modal
    const featureCard = screen.getByText('SSO/SAML Enterprise Authentication').closest('.cursor-pointer');
    if (featureCard) {
      fireEvent.click(featureCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Feature Request Details')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = document.querySelector('.bg-white button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('Feature Request Details')).not.toBeInTheDocument();
    });
  });

  it('filters features by search query', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('SSO/SAML Enterprise Authentication')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search features...');
    fireEvent.change(searchInput, { target: { value: 'Mobile' } });

    await waitFor(() => {
      expect(screen.getByText('Mobile App (iOS/Android)')).toBeInTheDocument();
      expect(screen.queryByText('SSO/SAML Enterprise Authentication')).not.toBeInTheDocument();
    });
  });

  it('filters features by status', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Feature Backlog')).toBeInTheDocument();
    });

    // Select 'Released' status
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'RELEASED' } });

    await waitFor(() => {
      // Webhook Support is the only RELEASED feature in demo data
      expect(screen.getByText('Webhook Support')).toBeInTheDocument();
    });
  });

  it('sorts features by vote count', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Feature Backlog')).toBeInTheDocument();
    });

    const sortSelect = screen.getByDisplayValue('Priority Score');
    fireEvent.change(sortSelect, { target: { value: 'voteCount' } });

    // After sorting by votes, Mobile App (89 votes) should be first
    await waitFor(() => {
      const cards = screen.getAllByText(/FR-\d{3}/);
      // Mobile App is FR-003 with most votes
      expect(cards[0]).toHaveTextContent('FR-003');
    });
  });

  it('displays blocked deal values in orange', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      // SSO feature has dealBlockerValue of 250000
      const blockingText = screen.getAllByText('Blocking:');
      expect(blockingText.length).toBeGreaterThan(0);
    });
  });

  it('displays feature categories', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getAllByText('Security').length).toBeGreaterThan(0);
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Platform')).toBeInTheDocument();
    });
  });

  it('displays effort estimates', async () => {
    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      // L effort = '1-2w' - may appear multiple times
      expect(screen.getAllByText('1-2w').length).toBeGreaterThan(0);
    });
  });

  it('shows loading state initially', () => {
    render(<RoadmapView tenantId="test-tenant" />);

    // While loading, should show loading message
    expect(screen.getByText('Loading features...')).toBeInTheDocument();
  });

  it('handles API success', async () => {
    const apiFeatures = [
      {
        id: 'api-feat-1',
        shortId: 'API-001',
        title: 'API Feature',
        description: 'Feature from API',
        status: 'SUBMITTED',
        priority: 'HIGH',
        voteCount: 10,
        totalMRR: 5000,
        dealBlockerValue: 0,
        priorityScore: 100,
        createdAt: '2024-01-20',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: apiFeatures }),
    });

    render(<RoadmapView tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('API Feature')).toBeInTheDocument();
    });
  });
});
