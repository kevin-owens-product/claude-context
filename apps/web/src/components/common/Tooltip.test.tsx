import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { Tooltip, SimpleTooltip, InfoTooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show tooltip initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover after delay', async () => {
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByText('Hover me'));

    // Tooltip should not appear immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance timer past the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByText('Hover me'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip when disabled', () => {
    render(
      <Tooltip content="Tooltip text" delay={0} disabled>
        <button>Hover me</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus', () => {
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Focus me</button>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText('Focus me'));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Focus me</button>
      </Tooltip>
    );

    fireEvent.focus(screen.getByText('Focus me'));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(screen.getByText('Focus me'));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('SimpleTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders tooltip with text', () => {
    render(
      <SimpleTooltip text="Simple tooltip">
        <button>Hover me</button>
      </SimpleTooltip>
    );

    fireEvent.mouseEnter(screen.getByText('Hover me'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Simple tooltip')).toBeInTheDocument();
  });
});

describe('InfoTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders info icon button', () => {
    render(<InfoTooltip content="Info content" />);
    expect(screen.getByLabelText('More information')).toBeInTheDocument();
  });

  it('shows tooltip content on hover', () => {
    render(<InfoTooltip content="Info content" />);

    fireEvent.mouseEnter(screen.getByLabelText('More information'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Info content')).toBeInTheDocument();
  });
});
