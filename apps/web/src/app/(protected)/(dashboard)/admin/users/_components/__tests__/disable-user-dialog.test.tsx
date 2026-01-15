'use client';

import type { AdminUserResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DisableUserDialog } from '../disable-user-dialog';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'admin.disable.title': 'Disable User Account',
        'admin.disable.description': `Are you sure you want to disable ${params?.name}'s account?`,
        'admin.disable.warning': 'This will immediately log them out and prevent future logins.',
        'admin.disable.confirm': 'Disable Account',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
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

describe('DisableUserDialog', () => {
  test('renders dialog when user is provided', () => {
    render(
      <DisableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    );

    expect(screen.getByText('Disable User Account')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to disable John Doe's account/)
    ).toBeInTheDocument();
    expect(
      screen.getByText('This will immediately log them out and prevent future logins.')
    ).toBeInTheDocument();
  });

  test('does not render when user is null', () => {
    render(
      <DisableUserDialog user={null} onOpenChange={vi.fn()} onConfirm={vi.fn()} isPending={false} />
    );

    expect(screen.queryByText('Disable User Account')).not.toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <DisableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isPending={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Disable Account' });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  test('calls onOpenChange when cancel button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <DisableUserDialog
        user={mockUser}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        isPending={false}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('disables confirm button when isPending is true', () => {
    render(
      <DisableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Disable Account' });
    expect(confirmButton).toBeDisabled();
  });

  test('shows destructive styling on confirm button', () => {
    render(
      <DisableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Disable Account' });
    expect(confirmButton).toHaveClass('bg-destructive');
  });
});
