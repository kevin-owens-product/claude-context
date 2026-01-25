import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { Tabs, TabList, TabTrigger, TabContent, SegmentedControl } from './Tabs';

describe('Tabs', () => {
  it('renders with default tab active', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tabs on click', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('calls onChange when tab changes', () => {
    const onChange = vi.fn();
    render(
      <Tabs defaultValue="tab1" onChange={onChange}>
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('respects controlled value prop', () => {
    const { rerender } = render(
      <Tabs defaultValue="tab1" value="tab2">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    expect(screen.getByText('Content 2')).toBeInTheDocument();

    // Value prop should control which tab is shown
    rerender(
      <Tabs defaultValue="tab1" value="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});

describe('TabList', () => {
  it('renders tabs with correct role', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content</TabContent>
      </Tabs>
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    const { container } = render(
      <Tabs defaultValue="tab1">
        <TabList variant="underline">
          <TabTrigger value="tab1" variant="underline">Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content</TabContent>
      </Tabs>
    );
    expect(container.querySelector('.border-b')).toBeInTheDocument();
  });
});

describe('TabTrigger', () => {
  it('shows active state', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content</TabContent>
      </Tabs>
    );
    const tab = screen.getByRole('tab');
    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  it('disables tab when disabled prop is set', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2" disabled>Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    const disabledTab = screen.getByText('Tab 2').closest('button');
    expect(disabledTab).toBeDisabled();
  });

  it('does not switch to disabled tab', () => {
    const onChange = vi.fn();
    render(
      <Tabs defaultValue="tab1" onChange={onChange}>
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2" disabled>Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2">Content 2</TabContent>
      </Tabs>
    );
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders icon', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1" icon={<span data-testid="icon">*</span>}>Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content</TabContent>
      </Tabs>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders badge', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1" badge={5}>Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content</TabContent>
      </Tabs>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('TabContent', () => {
  it('renders content for active tab', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
      </Tabs>
    );
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('keeps content mounted when forceMount is true', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabList>
          <TabTrigger value="tab1">Tab 1</TabTrigger>
          <TabTrigger value="tab2">Tab 2</TabTrigger>
        </TabList>
        <TabContent value="tab1">Content 1</TabContent>
        <TabContent value="tab2" forceMount>Content 2</TabContent>
      </Tabs>
    );
    // Both should be in the document, but one hidden
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.getByText('Content 2').closest('[role="tabpanel"]')).toHaveAttribute('hidden');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3' },
  ];

  it('renders all options', () => {
    render(<SegmentedControl options={options} value="opt1" onChange={() => {}} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('calls onChange when option is clicked', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="opt1" onChange={onChange} />);
    fireEvent.click(screen.getByText('Option 2'));
    expect(onChange).toHaveBeenCalledWith('opt2');
  });

  it('highlights selected option', () => {
    const { container } = render(
      <SegmentedControl options={options} value="opt2" onChange={() => {}} />
    );
    const selectedButton = screen.getByText('Option 2').closest('button');
    expect(selectedButton).toHaveClass('bg-gray-700');
  });

  it('renders with icons', () => {
    const optionsWithIcons = [
      { value: 'opt1', label: 'Option 1', icon: <span data-testid="icon1">*</span> },
      { value: 'opt2', label: 'Option 2', icon: <span data-testid="icon2">*</span> },
    ];
    render(<SegmentedControl options={optionsWithIcons} value="opt1" onChange={() => {}} />);
    expect(screen.getByTestId('icon1')).toBeInTheDocument();
    expect(screen.getByTestId('icon2')).toBeInTheDocument();
  });
});
