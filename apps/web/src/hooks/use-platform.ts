'use client';

import { useSyncExternalStore } from 'react';

export interface PlatformInfo {
  /** Whether the user is on macOS */
  isMac: boolean;
  /** The modifier key symbol: '⌘' for Mac, 'Ctrl' for others */
  modKey: '⌘' | 'Ctrl';
  /** The modifier key name for accessibility */
  modKeyName: 'Command' | 'Control';
}

// Check for macOS using userAgentData (modern) or userAgent (fallback)
function checkIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Modern API (Chromium-based browsers)
  if ('userAgentData' in navigator) {
    const uaData = navigator.userAgentData as { platform?: string };
    return uaData.platform === 'macOS';
  }
  // Fallback to userAgent
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Cache the result since platform doesn't change
let cachedIsMac: boolean | null = null;

function getSnapshot(): boolean {
  if (cachedIsMac === null) {
    cachedIsMac = checkIsMac();
  }
  return cachedIsMac;
}

function getServerSnapshot(): boolean {
  return false; // Default to non-Mac on server
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function subscribe(_callback: () => void): () => void {
  // Platform doesn't change, no subscription needed
  return () => {};
}

/**
 * Hook to detect the user's operating system for platform-specific UI.
 * Useful for displaying correct keyboard shortcuts (⌘ vs Ctrl).
 *
 * SSR-safe: defaults to non-Mac until client-side hydration.
 *
 * @returns Platform information including isMac and modifier key symbol
 */
export function usePlatform(): PlatformInfo {
  const isMac = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    isMac,
    modKey: isMac ? '⌘' : 'Ctrl',
    modKeyName: isMac ? 'Command' : 'Control',
  };
}
