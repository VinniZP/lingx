import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth';
import { authApi } from './api';

// Mock the API
vi.mock('./api', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  },
}));

// Test component that displays auth state
function TestAuthConsumer() {
  const { user, isLoading, isManager, isDeveloper, isAdmin } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="role">{user?.role || 'None'}</div>
      <div data-testid="is-manager">{isManager ? 'true' : 'false'}</div>
      <div data-testid="is-developer">{isDeveloper ? 'true' : 'false'}</div>
      <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
    </div>
  );
}

describe('AuthProvider - Role-based access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should identify DEVELOPER role correctly', async () => {
    const mockUser = {
      id: '1',
      email: 'dev@example.com',
      name: 'Developer',
      role: 'DEVELOPER' as const,
    };

    vi.mocked(authApi.me).mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('dev@example.com');
    });

    expect(screen.getByTestId('is-developer')).toHaveTextContent('true');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  it('should identify MANAGER role correctly', async () => {
    const mockUser = {
      id: '2',
      email: 'manager@example.com',
      name: 'Manager',
      role: 'MANAGER' as const,
    };

    vi.mocked(authApi.me).mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(
        'manager@example.com'
      );
    });

    expect(screen.getByTestId('is-developer')).toHaveTextContent('false');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  it('should identify ADMIN role correctly and grant manager access', async () => {
    const mockUser = {
      id: '3',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN' as const,
    };

    vi.mocked(authApi.me).mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@example.com');
    });

    expect(screen.getByTestId('is-developer')).toHaveTextContent('false');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('true'); // Admin has manager access
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  });

  it('should show no roles when user is not authenticated', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Not authenticated'));

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    expect(screen.getByTestId('is-developer')).toHaveTextContent('false');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  it('should show loading state initially', () => {
    vi.mocked(authApi.me).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
