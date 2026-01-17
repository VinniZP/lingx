'use client';

import type { AdminUserResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { EnableUserDialog } from '../enable-user-dialog';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'admin.enable.title': 'Enable User Account',
        'admin.enable.description': `Enable ${params?.name}'s account?`,
        'admin.enable.confirm': 'Enable Account',
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
  isDisabled: true,
  disabledAt: '2024-02-01T00:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  projectCount: 5,
};

describe('EnableUserDialog', () => {
  test('renders dialog when user is provided', () => {
    render(
      <EnableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    );

    expect(screen.getByText('Enable User Account')).toBeInTheDocument();
    expect(screen.getByText(/Enable John Doe's account/)).toBeInTheDocument();
  });

  test('does not render when user is null', () => {
    render(
      <EnableUserDialog user={null} onOpenChange={vi.fn()} onConfirm={vi.fn()} isPending={false} />
    );

    expect(screen.queryByText('Enable User Account')).not.toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <EnableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isPending={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Enable Account' });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  test('calls onOpenChange when cancel button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <EnableUserDialog
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
      <EnableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Enable Account' });
    expect(confirmButton).toBeDisabled();
  });

  test('shows success styling on confirm button', () => {
    render(
      <EnableUserDialog
        user={mockUser}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Enable Account' });
    expect(confirmButton).toHaveClass('bg-success');
  });
});
