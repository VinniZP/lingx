'use client';

import { authApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

interface ImpersonatedUser {
  name: string | null;
  email: string;
}

interface ImpersonationMeta {
  userName: string | null;
  userEmail: string;
  expiresAt: string;
}

interface UseImpersonationReturn {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  expiresAt: Date | null;
  timeRemaining: string;
  exitImpersonation: () => Promise<void>;
}

/**
 * Parse the impersonation_meta cookie.
 * Returns null if cookie doesn't exist or is invalid.
 */
function getImpersonationMeta(): ImpersonationMeta | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const metaCookie = cookies.find((c) => c.trim().startsWith('impersonation_meta='));

  if (!metaCookie) return null;

  try {
    const value = metaCookie.split('=')[1];
    const decoded = decodeURIComponent(value);
    return JSON.parse(decoded) as ImpersonationMeta;
  } catch (error) {
    console.error('[useImpersonation] Failed to parse impersonation_meta cookie:', error);
    return null;
  }
}

export function useImpersonation(): UseImpersonationReturn {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Check cookie on mount and periodically
  useEffect(() => {
    const checkImpersonation = () => {
      const meta = getImpersonationMeta();

      if (!meta) {
        setIsImpersonating(false);
        setImpersonatedUser(null);
        setExpiresAt(null);
        setTimeRemaining('');
        return;
      }

      const expires = new Date(meta.expiresAt);
      if (expires <= new Date()) {
        // Token expired - cookie will be ignored by server, clear local state
        setIsImpersonating(false);
        setImpersonatedUser(null);
        setExpiresAt(null);
        setTimeRemaining('');
        return;
      }

      setIsImpersonating(true);
      setImpersonatedUser({
        name: meta.userName,
        email: meta.userEmail,
      });
      setExpiresAt(expires);
      setTimeRemaining(formatDistanceToNow(expires, { addSuffix: false }));
    };

    checkImpersonation();

    // Update time remaining every minute
    const interval = setInterval(checkImpersonation, 60000);
    return () => clearInterval(interval);
  }, []);

  const exitImpersonation = useCallback(async () => {
    try {
      await authApi.exitImpersonation();
    } catch (error) {
      console.error('[useImpersonation] Failed to exit impersonation:', error);
    }

    // Clear local state
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setExpiresAt(null);
    setTimeRemaining('');

    // Redirect to admin panel with full page reload (clears any cached state)
    window.location.href = '/admin/users';
  }, []);

  return {
    isImpersonating,
    impersonatedUser,
    expiresAt,
    timeRemaining,
    exitImpersonation,
  };
}
