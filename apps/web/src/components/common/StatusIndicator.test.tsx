import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import {
  StatusDot,
  StatusBadge,
  HealthScore,
  ProgressBar,
  StatusIcon,
  TrendIndicator,
} from './StatusIndicator';

describe('StatusDot', () => {
  it('renders with success status', () => {
    const { container } = render(<StatusDot status="success" />);
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('renders with error status', () => {
    const { container } = render(<StatusDot status="error" />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('renders with warning status', () => {
    const { container } = render(<StatusDot status="warning" />);
    expect(container.querySelector('.bg-amber-500')).toBeInTheDocument();
  });

  it('applies pulse animation when enabled', () => {
    const { container } = render(<StatusDot status="success" pulse={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('renders label text', () => {
    render(<StatusBadge status="success" label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies correct styling for status', () => {
    const { container } = render(<StatusBadge status="error" label="Failed" />);
    expect(container.querySelector('.text-red-400')).toBeInTheDocument();
  });
});

describe('HealthScore', () => {
  it('renders score value', () => {
    render(<HealthScore score={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<HealthScore score={85} showLabel={false} />);
    expect(screen.queryByText('85')).not.toBeInTheDocument();
  });

  it('applies correct color for high score', () => {
    const { container } = render(<HealthScore score={90} />);
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('applies correct color for medium score', () => {
    const { container } = render(<HealthScore score={65} />);
    expect(container.querySelector('.text-yellow-500')).toBeInTheDocument();
  });

  it('applies correct color for low score', () => {
    const { container } = render(<HealthScore score={30} />);
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('renders with correct percentage', () => {
    const { container } = render(<ProgressBar value={50} />);
    const progressFill = container.querySelector('[style*="width: 50%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it('shows label when enabled', () => {
    render(<ProgressBar value={75} showLabel={true} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps value to 100%', () => {
    const { container } = render(<ProgressBar value={150} />);
    const progressFill = container.querySelector('[style*="width: 100%"]');
    expect(progressFill).toBeInTheDocument();
  });

  it('applies variant styling', () => {
    const { container } = render(<ProgressBar value={50} variant="success" />);
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});

describe('StatusIcon', () => {
  it('renders success icon', () => {
    const { container } = render(<StatusIcon status="success" />);
    expect(container.querySelector('.text-green-500')).toBeInTheDocument();
  });

  it('renders error icon', () => {
    const { container } = render(<StatusIcon status="error" />);
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<StatusIcon status="success" label="Completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('animates for running status', () => {
    const { container } = render(<StatusIcon status="running" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('TrendIndicator', () => {
  it('shows positive trend', () => {
    render(<TrendIndicator value={10} />);
    expect(screen.getByText(/\+10%/)).toBeInTheDocument();
  });

  it('shows negative trend', () => {
    render(<TrendIndicator value={-5} />);
    expect(screen.getByText(/-5%/)).toBeInTheDocument();
  });

  it('applies correct color for positive', () => {
    const { container } = render(<TrendIndicator value={10} />);
    expect(container.querySelector('.text-green-400')).toBeInTheDocument();
  });

  it('applies correct color for negative', () => {
    const { container } = render(<TrendIndicator value={-10} />);
    expect(container.querySelector('.text-red-400')).toBeInTheDocument();
  });

  it('applies neutral color for zero', () => {
    const { container } = render(<TrendIndicator value={0} />);
    expect(container.querySelector('.text-gray-400')).toBeInTheDocument();
  });

  it('uses custom suffix', () => {
    render(<TrendIndicator value={5} suffix=" pts" />);
    expect(screen.getByText(/\+5 pts/)).toBeInTheDocument();
  });
});
