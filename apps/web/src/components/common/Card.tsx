/**
 * @prompt-id forge-v4.1:web:components:card:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-claude-neutral-800 rounded-lg border border-gray-200 dark:border-claude-neutral-700 shadow-sm',
        onClick && 'cursor-pointer hover:border-gray-300 dark:hover:border-claude-neutral-600 hover:shadow-md transition-all',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('px-4 py-3 border-b border-gray-200 dark:border-claude-neutral-700', className)}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx('px-4 py-3', className)}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg', className)}>
      {children}
    </div>
  );
}
