/**
 * Tooltip - Hover tooltips and popovers
 * @prompt-id forge-v4.1:web:components:tooltip:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Keep tooltip within viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));

    setPosition({ top, left });
  }, [placement]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }
    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone child and add event handlers
  const trigger = (
    <span
      ref={triggerRef as React.RefObject<HTMLSpanElement>}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      className="inline-flex"
    >
      {children}
    </span>
  );

  const arrowStyles: Record<TooltipPlacement, string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
    left: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rotate-45',
    right: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
  };

  const tooltip = isVisible && (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={clsx(
        'fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        className
      )}
      style={{ top: position.top, left: position.left }}
    >
      {content}
      <div
        className={clsx(
          'absolute w-2 h-2 bg-gray-800',
          arrowStyles[placement]
        )}
      />
    </div>
  );

  return (
    <>
      {trigger}
      {createPortal(tooltip, document.body)}
    </>
  );
}

// Simple text tooltip shorthand
interface SimpleTooltipProps {
  text: string;
  children: React.ReactElement;
  placement?: TooltipPlacement;
}

export function SimpleTooltip({ text, children, placement = 'top' }: SimpleTooltipProps) {
  return (
    <Tooltip content={text} placement={placement}>
      {children}
    </Tooltip>
  );
}

// Info tooltip with icon
interface InfoTooltipProps {
  content: React.ReactNode;
  placement?: TooltipPlacement;
}

export function InfoTooltip({ content, placement = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip content={content} placement={placement}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="More information"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Tooltip>
  );
}
