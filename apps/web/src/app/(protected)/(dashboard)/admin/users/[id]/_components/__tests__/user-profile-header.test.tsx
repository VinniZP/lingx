import type { AdminUserDetailsResponse } from '@lingx/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserProfileHeader } from '../user-profile-header';

const translations: Record<string, string> = {
  'admin.status.active': 'Active',
  'admin.status.disabled': 'Disabled',
  'admin.roles.admin': 'Admin',
  'admin.roles.manager': 'Manager',
  'admin.roles.developer': 'Developer',
};

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'admin.users.memberSince') return `Member since ${params?.date}`;
      if (key === 'admin.users.disabledOn') return `Disabled on ${params?.date}`;
      if (key === 'admin.users.disabledBy') return `by ${params?.admin}`;
      return translations[key] || key;
    },
    td: (key: string) => translations[key] || key,
  }),
  tKey: (key: string) => key,
}));

const mockUser: AdminUserDetailsResponse = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  avatarUrl: null,
  role: 'DEVELOPER',
  isDisabled: false,
  disabledAt: null,
  disabledBy: null,
  createdAt: '2024-01-15T10:00:00Z',
  projects: [],
  stats: {
    projectCount: 5,
    lastActiveAt: null,
  },
};

describe('UserProfileHeader', () => {
  test('renders user name and email', () => {
    render(<UserProfileHeader user={mockUser} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('renders email as name when name is null', () => {
    const userWithoutName = { ...mockUser, name: null };
    render(<UserProfileHeader user={userWithoutName} />);

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('renders role badge', () => {
    render(<UserProfileHeader user={mockUser} />);

    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  test('renders status badge for active user', () => {
    render(<UserProfileHeader user={mockUser} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('renders status badge for disabled user', () => {
    const disabledUser = {
      ...mockUser,
      isDisabled: true,
      disabledAt: '2024-02-01T00:00:00Z',
      disabledBy: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
      },
    };
    render(<UserProfileHeader user={disabledUser} />);

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  test('renders member since date', () => {
    render(<UserProfileHeader user={mockUser} />);

    expect(screen.getByText(/Member since/)).toBeInTheDocument();
  });

  test('renders disabled info when user is disabled', () => {
    const disabledUser = {
      ...mockUser,
      isDisabled: true,
      disabledAt: '2024-02-01T00:00:00Z',
      disabledBy: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
      },
    };
    render(<UserProfileHeader user={disabledUser} />);

    expect(screen.getByText(/Disabled on/)).toBeInTheDocument();
    expect(screen.getByText(/by Admin User/)).toBeInTheDocument();
  });

  test('renders avatar with initials fallback', () => {
    render(<UserProfileHeader user={mockUser} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
