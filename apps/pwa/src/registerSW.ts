export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New content available - notify user
          dispatchEvent(
            new CustomEvent('sw-update-available', {
              detail: { registration },
            })
          );
        }
      });
    });

    // Handle controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Optionally reload for fresh content
    });
  } catch (error) {
    // Service worker registration failed - app still works without it
  }
}

export function requestBackgroundSync(tag: string): void {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      (registration as unknown as { sync: { register: (tag: string) => Promise<void> } })
        .sync.register(tag);
    });
  }
}
