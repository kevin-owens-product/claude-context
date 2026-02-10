import React, { useState, useCallback, useRef } from 'react';
import clsx from 'clsx';
import {
  Sparkles,
  Bot,
  Layers,
  Key,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useApp } from '../../store/AppContext';

interface OnboardingPageData {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

const PAGES: OnboardingPageData[] = [
  {
    title: 'Welcome to Claude Context',
    description: 'An AI-powered local development environment that runs right in your browser.',
    icon: <Sparkles size={40} />,
    color: '#6366F1',
    features: [
      'Full code editor with syntax highlighting',
      'Integrated AI assistant with multiple modes',
      'Works offline with service worker caching',
      'Responsive design for any device',
    ],
  },
  {
    title: '8 Powerful AI Modes',
    description: 'Switch between specialized AI modes tailored for different development tasks.',
    icon: <Bot size={40} />,
    color: '#10B981',
    features: [
      'Agent: Autonomous task execution',
      'Debug: Systematic bug investigation',
      'Plan: Strategic step-by-step planning',
      'Swarm: Multi-agent collaboration',
      'Queue: Batch prompt processing',
      'Session: Branching conversations',
      'Context: Token budget management',
      'Design: UI customization',
    ],
  },
  {
    title: 'Multi-Model Support',
    description: 'Connect to Claude, OpenAI, or Gemini. Use the best model for each task.',
    icon: <Layers size={40} />,
    color: '#F59E0B',
    features: [
      'Claude (Anthropic) for deep analysis',
      'OpenAI GPT models for versatility',
      'Google Gemini for multimodal tasks',
      'Easy provider switching per session',
    ],
  },
  {
    title: 'Set Up Your API Key',
    description: 'Add your API key to unlock full AI capabilities. Keys are stored locally.',
    icon: <Key size={40} />,
    color: '#EC4899',
    features: [
      'Keys stored securely in your browser',
      'Never sent to third-party servers',
      'Demo mode available without a key',
      'Switch providers anytime in settings',
    ],
  },
];

export function OnboardingScreen() {
  const { actions } = useApp();
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const page = PAGES[currentPage];
  const isLast = currentPage === PAGES.length - 1;
  const isFirst = currentPage === 0;

  const goNext = useCallback(() => {
    if (isLast) {
      actions.completeOnboarding();
    } else {
      setCurrentPage((p) => Math.min(p + 1, PAGES.length - 1));
    }
  }, [isLast, actions]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const skip = useCallback(() => {
    actions.completeOnboarding();
  }, [actions]);

  // Swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-full bg-surface-0 p-6 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-md">
        {/* Skip button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={skip}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
          >
            Skip
          </button>
        </div>

        {/* Page content */}
        <div className="flex flex-col items-center text-center animate-fade-in" key={currentPage}>
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg text-white"
            style={{
              backgroundColor: page.color,
              boxShadow: `0 8px 32px ${page.color}30`,
            }}
          >
            {page.icon}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-text-primary mb-2">{page.title}</h1>

          {/* Description */}
          <p className="text-sm text-text-secondary mb-6 leading-relaxed max-w-xs">
            {page.description}
          </p>

          {/* Features */}
          <div className="w-full space-y-2 mb-8">
            {page.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-left px-4 py-2.5 bg-surface-1 rounded-lg"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeIn 0.3s ease-out forwards',
                  opacity: 0,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: page.color }}
                />
                <span className="text-sm text-text-secondary">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {PAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={clsx(
                'rounded-full transition-all duration-300',
                index === currentPage
                  ? 'w-6 h-2'
                  : 'w-2 h-2 bg-surface-3 hover:bg-surface-2'
              )}
              style={
                index === currentPage
                  ? { backgroundColor: page.color }
                  : undefined
              }
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          {!isFirst && (
            <Button
              variant="ghost"
              size="lg"
              icon={<ChevronLeft size={16} />}
              onClick={goPrev}
              className="border border-border"
            >
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={
              isLast ? <ArrowRight size={16} /> : <ChevronRight size={16} />
            }
            iconPosition="right"
            onClick={goNext}
            style={{ backgroundColor: page.color }}
          >
            {isLast ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
