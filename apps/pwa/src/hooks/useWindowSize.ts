import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768, isLandscape: true, isPortrait: false };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isLandscape: window.innerWidth > window.innerHeight,
      isPortrait: window.innerHeight >= window.innerWidth,
    };
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
          isLandscape: window.innerWidth > window.innerHeight,
          isPortrait: window.innerHeight >= window.innerWidth,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Also listen for orientation changes on mobile
    if ('orientation' in screen) {
      screen.orientation.addEventListener('change', handleResize);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if ('orientation' in screen) {
        screen.orientation.removeEventListener('change', handleResize);
      }
    };
  }, []);

  return size;
}

interface FoldableInfo {
  isFoldable: boolean;
  foldPosition: number | null;
  screenSegments: number;
}

export function useFoldableDetection(): FoldableInfo {
  const [foldableInfo, setFoldableInfo] = useState<FoldableInfo>({
    isFoldable: false,
    foldPosition: null,
    screenSegments: 1,
  });

  useEffect(() => {
    const checkFoldable = () => {
      // Check for CSS screen-spanning support
      const spanningQuery = window.matchMedia(
        '(screen-spanning: single-fold-vertical)'
      );
      const isFoldable = spanningQuery.matches;

      // Try to get fold position from CSS environment variables
      let foldPosition: number | null = null;
      if (isFoldable) {
        const testEl = document.createElement('div');
        testEl.style.width = 'env(fold-left, 0px)';
        document.body.appendChild(testEl);
        const computedWidth = getComputedStyle(testEl).width;
        foldPosition = parseInt(computedWidth, 10) || null;
        document.body.removeChild(testEl);
      }

      // Check for Window Segments API
      const segments = (window as unknown as { getWindowSegments?: () => DOMRect[] })
        .getWindowSegments?.()?.length ?? 1;

      setFoldableInfo({
        isFoldable,
        foldPosition,
        screenSegments: segments,
      });
    };

    checkFoldable();

    const spanningQuery = window.matchMedia(
      '(screen-spanning: single-fold-vertical)'
    );
    spanningQuery.addEventListener('change', checkFoldable);

    return () => {
      spanningQuery.removeEventListener('change', checkFoldable);
    };
  }, []);

  return foldableInfo;
}
