'use client';

import type { ProjectMemberResponse } from '@lingx/shared';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { TransferOwnershipDialog } from '../transfer-ownership-dialog';

// Mock ResizeObserver for Radix UI components
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'members.transfer.title': 'Transfer Ownership',
        'members.transfer.selectDescription': 'Select a member to transfer ownership to.',
        'members.transfer.confirmDescription': 'Confirm the ownership transfer.',
        'members.transfer.newOwner': 'New Owner',
        'members.transfer.selectMember': 'Select a member',
        'members.transfer.keepOwnership': 'Keep me as owner',
        'members.transfer.keepOwnershipDescription':
          'You will remain as a co-owner of the project.',
        'members.transfer.warningKeep': 'The selected member will become an owner alongside you.',
        'members.transfer.warningLose': 'You will be demoted to Manager and lose owner privileges.',
        'members.transfer.confirmWarningTitle': 'This action is irreversible',
        'members.transfer.confirmWarningDescription': `${params?.name} will become the new owner.`,
        'members.transfer.typeProjectName': `Type "${params?.name}" to confirm`,
        'members.transfer.transferOwnership': 'Transfer Ownership',
        'common.cancel': 'Cancel',
        'common.continue': 'Continue',
        'common.back': 'Back',
      };
      return translations[key] || key;
    },
  }),
}));

const mockMembers: ProjectMemberResponse[] = [
  {
    userId: 'current-user',
    name: 'Current User',
    email: 'current@example.com',
    avatarUrl: null,
    role: 'OWNER',
    joinedAt: '2024-01-01T00:00:00Z',
  },
  {
    userId: 'member-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
    role: 'MANAGER',
    joinedAt: '2024-01-05T00:00:00Z',
  },
  {
    userId: 'member-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatarUrl: null,
    role: 'DEVELOPER',
    joinedAt: '2024-01-10T00:00:00Z',
  },
];

describe('TransferOwnershipDialog', () => {
  test('renders dialog title when open', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    // Dialog should show transfer ownership title
    expect(screen.getAllByText(/Transfer Ownership/i).length).toBeGreaterThanOrEqual(1);
  });

  test('shows member selection dropdown', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    // Should have a combobox for member selection
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('shows keepOwnership checkbox', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Keep me as owner')).toBeInTheDocument();
  });

  test('shows warning callout', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    expect(
      screen.getByText('The selected member will become an owner alongside you.')
    ).toBeInTheDocument();
  });

  test('shows cancel and continue buttons', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
  });

  test('disables continue button initially (no member selected)', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    expect(continueButton).toBeDisabled();
  });

  test('disables buttons when isTransferring', () => {
    render(
      <TransferOwnershipDialog
        open={true}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const continueButton = screen.getByRole('button', { name: /Continue/i });

    expect(cancelButton).toBeDisabled();
    expect(continueButton).toBeDisabled();
  });

  test('does not render when closed', () => {
    render(
      <TransferOwnershipDialog
        open={false}
        onOpenChange={vi.fn()}
        members={mockMembers}
        currentUserId="current-user"
        projectName="Test Project"
        onConfirm={vi.fn()}
        isTransferring={false}
      />
    );

    expect(screen.queryByText('Transfer Ownership')).not.toBeInTheDocument();
  });
});
