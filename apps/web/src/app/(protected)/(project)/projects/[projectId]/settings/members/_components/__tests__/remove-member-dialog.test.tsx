'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { RemoveMemberDialog } from '../remove-member-dialog';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'members.removeMember': 'Remove Member',
        'members.removeCannotUndo': 'This action cannot be undone.',
        'members.removeConfirm': `Are you sure you want to remove ${params?.name} from this project?`,
        'members.removeWarning': 'They will immediately lose access to all project resources.',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

const mockMember = {
  userId: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
};

describe('RemoveMemberDialog', () => {
  test('renders dialog when open', () => {
    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={vi.fn()}
        member={mockMember}
        onConfirm={vi.fn()}
        isRemoving={false}
      />
    );

    // There are two "Remove Member" - title and button
    expect(screen.getAllByText('Remove Member').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to remove John Doe from this project/)
    ).toBeInTheDocument();
  });

  test('shows warning about permanent action', () => {
    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={vi.fn()}
        member={mockMember}
        onConfirm={vi.fn()}
        isRemoving={false}
      />
    );

    expect(
      screen.getByText('They will immediately lose access to all project resources.')
    ).toBeInTheDocument();
  });

  test('uses email when name is null', () => {
    const memberWithoutName = {
      userId: 'user-2',
      name: null,
      email: 'noname@example.com',
    };

    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={vi.fn()}
        member={memberWithoutName}
        onConfirm={vi.fn()}
        isRemoving={false}
      />
    );

    expect(
      screen.getByText(/Are you sure you want to remove noname@example.com from this project/)
    ).toBeInTheDocument();
  });

  test('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={vi.fn()}
        member={mockMember}
        onConfirm={onConfirm}
        isRemoving={false}
      />
    );

    // Find all buttons with "Remove Member" text and get the action button (second one)
    const confirmButton = screen.getAllByRole('button', { name: /Remove Member/i })[0];
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  test('calls onOpenChange when cancel button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={onOpenChange}
        member={mockMember}
        onConfirm={vi.fn()}
        isRemoving={false}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('disables confirm button when isRemoving is true', () => {
    render(
      <RemoveMemberDialog
        open={true}
        onOpenChange={vi.fn()}
        member={mockMember}
        onConfirm={vi.fn()}
        isRemoving={true}
      />
    );

    const confirmButton = screen.getAllByRole('button', { name: /Remove Member/i })[0];
    expect(confirmButton).toBeDisabled();
  });
});
