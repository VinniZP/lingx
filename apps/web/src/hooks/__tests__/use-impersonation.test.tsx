'use client';

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useImpersonation } from '../use-impersonation';

// Mock authApi
vi.mock('@/lib/api', () => ({
  authApi: {
    exitImpersonation: vi.fn().mockResolvedValue({ message: 'Exited impersonation mode' }),
  },
}));

// Helper to set cookie
function setCookie(name: string, value: string) {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: `${name}=${encodeURIComponent(value)}`,
  });
}

// Helper to clear cookies
function clearCookies() {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: '',
  });
}

// Mock window.location
const mockLocation = {
  href: '',
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('useImpersonation', () => {
  beforeEach(() => {
    clearCookies();
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('returns isImpersonating false when no impersonation cookie', () => {
    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.impersonatedUser).toBeNull();
  });

  test('returns isImpersonating true when impersonation_meta cookie exists', () => {
    const future = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    const meta = JSON.stringify({
      userName: 'John',
      userEmail: 'john@test.com',
      expiresAt: future,
    });
    setCookie('impersonation_meta', meta);

    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(true);
    expect(result.current.impersonatedUser).toEqual({ name: 'John', email: 'john@test.com' });
  });

  test('returns isImpersonating false when token is expired', () => {
    const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const meta = JSON.stringify({
      userName: 'John',
      userEmail: 'john@test.com',
      expiresAt: past,
    });
    setCookie('impersonation_meta', meta);

    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(false);
  });

  test('exitImpersonation calls API and redirects', async () => {
    const { authApi } = await import('@/lib/api');
    const future = new Date(Date.now() + 3600000).toISOString();
    const meta = JSON.stringify({
      userName: 'John',
      userEmail: 'john@test.com',
      expiresAt: future,
    });
    setCookie('impersonation_meta', meta);

    const { result } = renderHook(() => useImpersonation());

    await act(async () => {
      await result.current.exitImpersonation();
    });

    expect(authApi.exitImpersonation).toHaveBeenCalled();
    expect(mockLocation.href).toBe('/admin/users');
  });

  test('handles malformed cookie gracefully', () => {
    setCookie('impersonation_meta', 'not-valid-json');

    const { result } = renderHook(() => useImpersonation());

    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.impersonatedUser).toBeNull();
  });
});
