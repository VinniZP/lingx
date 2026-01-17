import type { AdminUserResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserRow } from '../user-row';

const translations: Record<string, string> = {
  'admin.status.active': 'Active',
  'admin.status.disabled': 'Disabled',
  'admin.roles.admin': 'Admin',
  'admin.roles.manager': 'Manager',
  'admin.roles.developer': 'Developer',
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

const mockUser: AdminUserResponse = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  avatarUrl: null,
  role: 'DEVELOPER',
  isDisabled: false,
  disabledAt: null,
  createdAt: '2024-01-15T10:00:00Z',
  projectCount: 5,
};

describe('UserRow', () => {
  test('renders user name and email', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('renders email as name when name is null', () => {
    const userWithoutName = { ...mockUser, name: null };
    render(
      <UserRow
        user={userWithoutName}
        onViewDetails={vi.fn()}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
      />
    );

    // Email should appear as the primary text
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('renders role badge', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  test('renders status badge for active user', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('renders status badge for disabled user', () => {
    const disabledUser = { ...mockUser, isDisabled: true, disabledAt: '2024-02-01T00:00:00Z' };
    render(
      <UserRow user={disabledUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  test('renders project count', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByText('5 projects')).toBeInTheDocument();
  });

  test('calls onViewDetails when row is clicked', () => {
    const onViewDetails = vi.fn();
    render(
      <UserRow
        user={mockUser}
        onViewDetails={onViewDetails}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
      />
    );

    const row = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(row);

    expect(onViewDetails).toHaveBeenCalledWith('user-1');
  });

  test('shows disable action for active users', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByLabelText('Disable account')).toBeInTheDocument();
  });

  test('shows enable action for disabled users', () => {
    const disabledUser = { ...mockUser, isDisabled: true };
    render(
      <UserRow user={disabledUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    expect(screen.getByLabelText('Enable account')).toBeInTheDocument();
  });

  test('calls onDisable when disable button is clicked', () => {
    const onDisable = vi.fn();
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={onDisable} onEnable={vi.fn()} />
    );

    const disableButton = screen.getByLabelText('Disable account');
    fireEvent.click(disableButton);

    expect(onDisable).toHaveBeenCalledWith('user-1');
  });

  test('calls onEnable when enable button is clicked', () => {
    const onEnable = vi.fn();
    const disabledUser = { ...mockUser, isDisabled: true };
    render(
      <UserRow
        user={disabledUser}
        onViewDetails={vi.fn()}
        onDisable={vi.fn()}
        onEnable={onEnable}
      />
    );

    const enableButton = screen.getByLabelText('Enable account');
    fireEvent.click(enableButton);

    expect(onEnable).toHaveBeenCalledWith('user-1');
  });

  test('renders avatar with initials fallback', () => {
    render(
      <UserRow user={mockUser} onViewDetails={vi.fn()} onDisable={vi.fn()} onEnable={vi.fn()} />
    );

    // Should show initials JD for John Doe
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
