import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import {
  TextInput,
  SearchInput,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
} from './Input';

describe('TextInput', () => {
  it('renders with label', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<TextInput placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<TextInput error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<TextInput success="Email verified" />);
    expect(screen.getByText('Email verified')).toBeInTheDocument();
  });

  it('shows hint text', () => {
    render(<TextInput hint="We'll never share your email" />);
    expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<TextInput onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders with left icon', () => {
    render(<TextInput leftIcon={<span data-testid="icon">@</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('renders search icon', () => {
    const { container } = render(<SearchInput />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onSearch on Enter', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('test query');
  });
});

describe('PasswordInput', () => {
  it('starts with password hidden', () => {
    render(<PasswordInput />);
    const input = document.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility', () => {
    render(<PasswordInput />);
    const input = document.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');

    // Find and click the toggle button
    const toggleButton = document.querySelector('button');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
    }
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Textarea error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('applies resize class', () => {
    const { container } = render(<Textarea resize="none" />);
    expect(container.querySelector('.resize-none')).toBeInTheDocument();
  });
});

describe('Select', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3', disabled: true },
  ];

  it('renders options', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders placeholder', () => {
    render(<Select options={options} placeholder="Select an option" />);
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select options={options} label="Category" />);
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Select options={options} error="Please select an option" />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('handles change', () => {
    const onChange = vi.fn();
    render(<Select options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'opt2' } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Checkbox label="Accept" description="By checking this box..." />);
    expect(screen.getByText('By checking this box...')).toBeInTheDocument();
  });

  it('handles change', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Accept" onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });

  it('can be checked', () => {
    render(<Checkbox label="Accept" defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
