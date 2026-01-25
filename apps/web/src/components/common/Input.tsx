/**
 * Input Components - Form inputs with consistent styling
 * @prompt-id forge-v4.1:web:components:input:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Search, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

// Base input styles
const baseInputStyles = clsx(
  'w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-colors'
);

const inputStateStyles = {
  default: 'border-gray-700 focus:border-blue-500 focus:ring-blue-500/20',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
  success: 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
};

// Text Input
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, success, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const state = error ? 'error' : success ? 'success' : 'default';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              baseInputStyles,
              inputStateStyles[state],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10'
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {rightIcon}
            </div>
          )}
          {state === 'error' && !rightIcon && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
          )}
          {state === 'success' && !rightIcon && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        {(error || success || hint) && (
          <p
            className={clsx(
              'mt-1.5 text-xs',
              error ? 'text-red-400' : success ? 'text-green-400' : 'text-gray-500'
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

// Search Input
interface SearchInputProps extends Omit<TextInputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch((e.target as HTMLInputElement).value);
      }
      onKeyDown?.(e);
    };

    return (
      <TextInput
        ref={ref}
        type="search"
        leftIcon={<Search className="w-4 h-4" />}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Password Input
interface PasswordInputProps extends Omit<TextInputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextInput
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-gray-500 hover:text-gray-300 focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, success, hint, resize = 'vertical', className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const state = error ? 'error' : success ? 'success' : 'default';

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            baseInputStyles,
            inputStateStyles[state],
            resizeStyles[resize],
            'min-h-[80px]'
          )}
          {...props}
        />
        {(error || success || hint) && (
          <p
            className={clsx(
              'mt-1.5 text-xs',
              error ? 'text-red-400' : success ? 'text-green-400' : 'text-gray-500'
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const state = error ? 'error' : 'default';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            baseInputStyles,
            inputStateStyles[state],
            'appearance-none bg-no-repeat bg-right pr-10',
            'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")]',
            'bg-[length:1.5em_1.5em]',
            '[&::-ms-expand]:hidden'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || hint) && (
          <p className={clsx('mt-1.5 text-xs', error ? 'text-red-400' : 'text-gray-500')}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Checkbox
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('flex items-start gap-3', className)}>
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={clsx(
            'mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800',
            'text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900',
            'cursor-pointer'
          )}
          {...props}
        />
        <div>
          <label htmlFor={inputId} className="text-sm font-medium text-gray-300 cursor-pointer">
            {label}
          </label>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Form Group wrapper
interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return <div className={clsx('space-y-4', className)}>{children}</div>;
}

// Form Actions wrapper
interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center' | 'between';
  className?: string;
}

export function FormActions({ children, align = 'right', className }: FormActionsProps) {
  const alignStyles = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  };

  return (
    <div className={clsx('flex items-center gap-3 pt-4', alignStyles[align], className)}>
      {children}
    </div>
  );
}
