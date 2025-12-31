'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';
import { authApi, totpApi, webauthnApi, User, TwoFactorRequiredResponse } from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPasskey: (email?: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isManager: boolean;
  isDeveloper: boolean;
  isAdmin: boolean;
  // Two-Factor Authentication
  pendingTwoFactor: boolean;
  tempToken: string | null;
  verifyTwoFactor: (token: string, trustDevice?: boolean) => Promise<void>;
  verifyBackupCode: (code: string, trustDevice?: boolean) => Promise<number>;
  cancelTwoFactor: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Type guard for 2FA response
function isTwoFactorRequired(response: unknown): response is TwoFactorRequiredResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'requiresTwoFactor' in response &&
    (response as TwoFactorRequiredResponse).requiresTwoFactor === true
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await authApi.me();
        setUser(response.user);
      } catch {
        // Not authenticated
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    // Check if 2FA is required
    if (isTwoFactorRequired(response)) {
      setTempToken(response.tempToken);
      setPendingTwoFactor(true);
      router.push('/two-factor');
      return;
    }

    // Normal login - user is in response
    if ('user' in response) {
      setUser(response.user);
      router.push('/dashboard');
    }
  };

  const loginWithPasskey = async (email?: string) => {
    // Get authentication options from server
    const { options, challengeToken } = await webauthnApi.getAuthOptions(email);

    // Start browser WebAuthn authentication
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authResponse = await startAuthentication({ optionsJSON: options as any });

    // Verify with server and get JWT
    const { user: loggedInUser } = await webauthnApi.verifyAuth({
      challengeToken,
      response: authResponse,
    });

    // Passkey login bypasses 2FA - set user and redirect
    setUser(loggedInUser);
    router.push('/dashboard');
  };

  const register = async (email: string, password: string, name?: string) => {
    await authApi.register({ email, password, name });
    // Auto-login after registration
    await login(email, password);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout API errors - still clear local state
      console.error('Logout API error:', error);
    }
    setUser(null);
    setPendingTwoFactor(false);
    setTempToken(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.user);
    } catch {
      // Ignore errors - user state unchanged
    }
  };

  const verifyTwoFactor = async (token: string, trustDevice = false) => {
    if (!tempToken) {
      throw new Error('No pending two-factor authentication');
    }

    const response = await totpApi.verify({ tempToken, token, trustDevice });
    setUser(response.user);
    setPendingTwoFactor(false);
    setTempToken(null);
    router.push('/dashboard');
  };

  const verifyBackupCode = async (code: string, trustDevice = false): Promise<number> => {
    if (!tempToken) {
      throw new Error('No pending two-factor authentication');
    }

    const response = await totpApi.verifyBackup({ tempToken, code, trustDevice });
    setUser(response.user);
    setPendingTwoFactor(false);
    setTempToken(null);
    router.push('/dashboard');
    return response.codesRemaining;
  };

  const cancelTwoFactor = () => {
    setPendingTwoFactor(false);
    setTempToken(null);
    router.push('/login');
  };

  // Role-based access helpers
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;
  const isDeveloper = user?.role === 'DEVELOPER';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithPasskey,
        register,
        logout,
        refreshUser,
        isManager,
        isDeveloper,
        isAdmin,
        pendingTwoFactor,
        tempToken,
        verifyTwoFactor,
        verifyBackupCode,
        cancelTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
