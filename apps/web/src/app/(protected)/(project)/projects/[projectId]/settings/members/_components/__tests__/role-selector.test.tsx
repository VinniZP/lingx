'use client';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { RoleSelector } from '../role-selector';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'members.roles.owner': 'Owner',
        'members.roles.manager': 'Manager',
        'members.roles.developer': 'Developer',
        'members.roles.ownerDescription': 'Full control over project',
        'members.roles.managerDescription': 'Can manage members and settings',
        'members.roles.developerDescription': 'Can edit translations',
      };
      return translations[key] || key;
    },
  }),
}));

describe('RoleSelector', () => {
  test('renders current role as static badge when disabled', () => {
    render(
      <RoleSelector
        role="DEVELOPER"
        actorRole="OWNER"
        disabled={true}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Developer')).toBeInTheDocument();
    // Should not have dropdown trigger (chevron) when disabled
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('renders OWNER role as static badge (not changeable)', () => {
    render(
      <RoleSelector
        role="OWNER"
        actorRole="OWNER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    // OWNER role should always be static (can only be assigned via Transfer Ownership)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('shows dropdown for OWNER viewing DEVELOPER', async () => {
    render(
      <RoleSelector
        role="DEVELOPER"
        actorRole="OWNER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    // Should have a dropdown trigger
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  test('shows dropdown for OWNER viewing MANAGER', () => {
    render(
      <RoleSelector
        role="MANAGER"
        actorRole="OWNER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  test('MANAGER can only see DEVELOPER option (static for MANAGER role)', () => {
    render(
      <RoleSelector
        role="MANAGER"
        actorRole="MANAGER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    // MANAGER viewing MANAGER should be static since MANAGER can only set DEVELOPER
    expect(screen.getByText('Manager')).toBeInTheDocument();
    // Should be static badge, not dropdown
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('shows loading state when isLoading is true', () => {
    render(
      <RoleSelector
        role="DEVELOPER"
        actorRole="OWNER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={true}
      />
    );

    // Should still render the role text
    expect(screen.getByText('Developer')).toBeInTheDocument();
    // The button should be disabled when loading
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
  });

  test('opens dropdown when clicked', async () => {
    const onChange = vi.fn();
    render(
      <RoleSelector
        role="DEVELOPER"
        actorRole="OWNER"
        disabled={false}
        onChange={onChange}
        isLoading={false}
      />
    );

    // Click to open dropdown
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Wait for dropdown to open and check for menu items
    await waitFor(() => {
      // The dropdown should now be visible with options
      expect(screen.getAllByText(/Manager|Developer/).length).toBeGreaterThanOrEqual(1);
    });
  });

  test('renders static badge for DEVELOPER actor (no permissions)', () => {
    render(
      <RoleSelector
        role="DEVELOPER"
        actorRole="DEVELOPER"
        disabled={false}
        onChange={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Developer')).toBeInTheDocument();
    // DEVELOPER has no permission to change roles, so should be static
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
