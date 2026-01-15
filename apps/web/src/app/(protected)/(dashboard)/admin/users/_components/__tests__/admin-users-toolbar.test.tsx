'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AdminUsersToolbar } from '../admin-users-toolbar';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'admin.users.search': 'Search users...',
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
      };
      return translations[key] || key;
    },
  }),
}));

describe('AdminUsersToolbar', () => {
  test('renders search input', () => {
    render(
      <AdminUsersToolbar
        search=""
        role={undefined}
        status={undefined}
        totalCount={10}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  test('calls onSearchChange when typing in search input', async () => {
    const onSearchChange = vi.fn();
    render(
      <AdminUsersToolbar
        search=""
        role={undefined}
        status={undefined}
        totalCount={10}
        onSearchChange={onSearchChange}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    // Debounced, so we need to wait
    await waitFor(
      () => {
        expect(onSearchChange).toHaveBeenCalledWith('john');
      },
      { timeout: 500 }
    );
  });

  test('renders role filter select', () => {
    render(
      <AdminUsersToolbar
        search=""
        role={undefined}
        status={undefined}
        totalCount={10}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
  });

  test('renders status filter select', () => {
    render(
      <AdminUsersToolbar
        search=""
        role={undefined}
        status={undefined}
        totalCount={10}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
  });

  test('displays total user count', () => {
    render(
      <AdminUsersToolbar
        search=""
        role={undefined}
        status={undefined}
        totalCount={42}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  test('shows current search value', () => {
    render(
      <AdminUsersToolbar
        search="john"
        role={undefined}
        status={undefined}
        totalCount={10}
        onSearchChange={vi.fn()}
        onRoleChange={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search users...') as HTMLInputElement;
    expect(searchInput.value).toBe('john');
  });
});
