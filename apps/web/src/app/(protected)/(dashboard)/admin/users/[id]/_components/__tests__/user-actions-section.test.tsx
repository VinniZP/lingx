'use client';

import type { AdminUserDetailsResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserActionsSection } from '../user-actions-section';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'admin.actions.dangerZone': 'Danger Zone',
        'admin.actions.disable': 'Disable Account',
        'admin.actions.enable': 'Enable Account',
        'admin.actions.impersonate': 'Impersonate User',
        'admin.actions.disableDescription': 'Immediately log them out and prevent future logins.',
        'admin.actions.enableDescription': 'Allow the user to log in again.',
        'admin.actions.impersonateDescription': 'Act as this user for 1 hour.',
      };
      return translations[key] || key;
    },
  }),
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

describe('UserActionsSection', () => {
  test('renders section title', () => {
    render(
      <UserActionsSection
        user={mockUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  test('shows disable button for active users', () => {
    render(
      <UserActionsSection
        user={mockUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /disable account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enable account/i })).not.toBeInTheDocument();
  });

  test('shows enable button for disabled users', () => {
    const disabledUser = { ...mockUser, isDisabled: true };
    render(
      <UserActionsSection
        user={disabledUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /enable account/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disable account/i })).not.toBeInTheDocument();
  });

  test('shows impersonate button for active users', () => {
    render(
      <UserActionsSection
        user={mockUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /impersonate user/i })).toBeInTheDocument();
  });

  test('hides impersonate button for disabled users', () => {
    const disabledUser = { ...mockUser, isDisabled: true };
    render(
      <UserActionsSection
        user={disabledUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /impersonate user/i })).not.toBeInTheDocument();
  });

  test('calls onDisable when disable button is clicked', () => {
    const onDisable = vi.fn();
    render(
      <UserActionsSection
        user={mockUser}
        onDisable={onDisable}
        onEnable={vi.fn()}
        onImpersonate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /disable account/i }));
    expect(onDisable).toHaveBeenCalled();
  });

  test('calls onEnable when enable button is clicked', () => {
    const onEnable = vi.fn();
    const disabledUser = { ...mockUser, isDisabled: true };
    render(
      <UserActionsSection
        user={disabledUser}
        onDisable={vi.fn()}
        onEnable={onEnable}
        onImpersonate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /enable account/i }));
    expect(onEnable).toHaveBeenCalled();
  });

  test('calls onImpersonate when impersonate button is clicked', () => {
    const onImpersonate = vi.fn();
    render(
      <UserActionsSection
        user={mockUser}
        onDisable={vi.fn()}
        onEnable={vi.fn()}
        onImpersonate={onImpersonate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /impersonate user/i }));
    expect(onImpersonate).toHaveBeenCalled();
  });
});
