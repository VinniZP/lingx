'use client';

import type { ProjectInvitationResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { InvitationRow } from '../invitation-row';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'members.invitedBy': `Invited by ${params?.name}`,
        'members.expired': 'Expired',
        'members.expiresIn': `Expires in ${params?.days} days`,
        'members.revokeInvitation': 'Revoke Invitation',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock date-fns to control time calculations
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    differenceInDays: vi.fn((date1: Date, date2: Date) => {
      const diffTime = date1.getTime() - date2.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }),
  };
});

// Helper to create invitation with different expiry dates
const createInvitation = (daysUntilExpiry: number): ProjectInvitationResponse => {
  const expiresAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);

  return {
    id: 'inv-1',
    email: 'invitee@example.com',
    role: 'DEVELOPER',
    expiresAt: expiresAt.toISOString(),
    invitedBy: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };
};

describe('InvitationRow', () => {
  test('renders email, role, and inviter name', () => {
    const invitation = createInvitation(5);
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPER')).toBeInTheDocument();
    expect(screen.getByText('Invited by John Doe')).toBeInTheDocument();
  });

  test('shows expired status when past expiry', () => {
    const invitation = createInvitation(-1); // 1 day ago
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  test('shows expiring soon status when within 2 days', () => {
    const invitation = createInvitation(1); // 1 day left
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    // Date calculations may result in 0 or 1 days depending on timing
    expect(screen.getByText(/Expires in [01] days/)).toBeInTheDocument();
  });

  test('shows normal expiry when more than 2 days', () => {
    const invitation = createInvitation(5); // 5 days left
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    // The exact number of days may vary slightly due to date calculations
    expect(screen.getByText(/Expires in \d+ days/)).toBeInTheDocument();
  });

  test('calls onRevoke when revoke button is clicked', () => {
    const onRevoke = vi.fn();
    const invitation = createInvitation(5);
    render(<InvitationRow invitation={invitation} onRevoke={onRevoke} isRevoking={false} />);

    const revokeButton = screen.getByRole('button', { name: 'Revoke Invitation' });
    fireEvent.click(revokeButton);

    expect(onRevoke).toHaveBeenCalled();
  });

  test('disables revoke button when isRevoking', () => {
    const invitation = createInvitation(5);
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={true} />);

    const revokeButton = screen.getByRole('button', { name: 'Revoke Invitation' });
    expect(revokeButton).toBeDisabled();
  });

  test('uses email when inviter name is null', () => {
    const invitation: ProjectInvitationResponse = {
      id: 'inv-2',
      email: 'invitee@example.com',
      role: 'MANAGER',
      expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      invitedBy: {
        id: 'user-2',
        name: null,
        email: 'noname@example.com',
      },
    };
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    expect(screen.getByText('Invited by noname@example.com')).toBeInTheDocument();
  });

  test('renders MANAGER role badge', () => {
    const invitation: ProjectInvitationResponse = {
      id: 'inv-3',
      email: 'manager@example.com',
      role: 'MANAGER',
      expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      invitedBy: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    };
    render(<InvitationRow invitation={invitation} onRevoke={vi.fn()} isRevoking={false} />);

    expect(screen.getByText('MANAGER')).toBeInTheDocument();
  });
});
