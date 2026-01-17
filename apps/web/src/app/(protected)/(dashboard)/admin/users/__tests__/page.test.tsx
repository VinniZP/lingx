import type { AdminUserListResponse } from '@lingx/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import AdminUsersPage from '../page';

const translations: Record<string, string> = {
  'admin.title': 'Administration',
  'admin.users.title': 'User Management',
  'admin.users.description': 'Manage user accounts across the platform',
  'admin.users.search': 'Search users...',
  'admin.users.emptyState': 'No users found',
  'admin.users.emptyStateDescription': 'Try adjusting your search or filters',
  'admin.users.filters.role': 'Role',
  'admin.users.filters.status': 'Status',
  'admin.users.filters.allRoles': 'All Roles',
  'admin.users.filters.allStatuses': 'All Statuses',
  'admin.roles.admin': 'Admin',
  'admin.roles.manager': 'Manager',
  'admin.roles.developer': 'Developer',
  'admin.status.active': 'Active',
  'admin.status.disabled': 'Disabled',
  'admin.users.count': 'users',
  'admin.actions.viewDetails': 'View details',
  'admin.actions.disable': 'Disable account',
  'admin.actions.enable': 'Enable account',
};

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'admin.users.projectCount') {
        return `${params?.count || 0} projects`;
      }
      return translations[key] || key;
    },
    td: (key: string) => translations[key] || key,
  }),
  tKey: (key: string) => key,
}));

// Mock the admin API
vi.mock('@/lib/api/admin', () => ({
  adminApi: {
    listUsers: vi.fn(),
    disableUser: vi.fn(),
    enableUser: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUsersResponse: AdminUserListResponse = {
  users: [
    {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      avatarUrl: null,
      role: 'DEVELOPER',
      isDisabled: false,
      disabledAt: null,
      createdAt: '2024-01-15T10:00:00Z',
      projectCount: 5,
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      avatarUrl: null,
      role: 'ADMIN',
      isDisabled: false,
      disabledAt: null,
      createdAt: '2024-01-10T10:00:00Z',
      projectCount: 3,
    },
  ],
  total: 2,
  page: 1,
  limit: 50,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('AdminUsersPage', () => {
  test('renders page title and description', async () => {
    const { adminApi } = await import('@/lib/api/admin');
    vi.mocked(adminApi.listUsers).mockResolvedValue(mockUsersResponse);

    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage user accounts across the platform')).toBeInTheDocument();
  });

  test('renders search input', async () => {
    const { adminApi } = await import('@/lib/api/admin');
    vi.mocked(adminApi.listUsers).mockResolvedValue(mockUsersResponse);

    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  test('renders filter selects', async () => {
    const { adminApi } = await import('@/lib/api/admin');
    vi.mocked(adminApi.listUsers).mockResolvedValue(mockUsersResponse);

    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
  });
});
