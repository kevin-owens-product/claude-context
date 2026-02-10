import { useState, useEffect, useCallback } from 'react';
import type { DeviceType } from '../types';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const isPhone = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isFoldable = useMediaQuery('(screen-spanning: single-fold-vertical)');

  const getDeviceType = useCallback((): DeviceType => {
    if (isFoldable) return 'foldable';
    if (isDesktop) return 'desktop';
    if (isTablet) return 'tablet';
    return 'phone';
  }, [isFoldable, isDesktop, isTablet]);

  return {
    isPhone,
    isTablet,
    isDesktop,
    isFoldable,
    deviceType: getDeviceType(),
  };
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
