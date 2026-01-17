'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { InviteDialog } from '../invite-dialog';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'members.inviteTeamMembers': 'Invite Team Members',
        'members.inviteDescription': 'Send invitations to new team members.',
        'members.emailAddresses': 'Email Addresses',
        'members.emailsHint': 'Enter one email per line or separate with commas.',
        'members.role': 'Role',
        'members.roles.manager': 'Manager',
        'members.roles.developer': 'Developer',
        'members.roles.managerDescription': 'Can manage members and settings',
        'members.roles.developerDescription': 'Can edit translations',
        'members.managerCanOnlyInviteDevelopers': 'Managers can only invite as Developer.',
        'members.invitationExpiryInfo': 'Invitations expire after 7 days.',
        'members.sendInvitations': 'Send Invitations',
        'members.enterValidEmail': 'Please enter valid email addresses.',
        'members.invitationsSent': `${params?.count} invitation(s) sent`,
        'members.invitationsSkipped': `${params?.count} skipped`,
        'members.invitationsFailed': `${params?.count} failed`,
        'members.skippedReason': 'Already member or has pending invitation',
        'members.sendMore': 'Send More',
        'members.inviteFailed': 'Failed to send invitations',
        'common.cancel': 'Cancel',
        'common.done': 'Done',
        'common.tryAgain': 'Please try again.',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the member API
vi.mock('@/lib/api/members', () => ({
  memberApi: {
    invite: vi.fn(),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to render with QueryClient
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('InviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dialog when open', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    expect(screen.getByText('Invite Team Members')).toBeInTheDocument();
    expect(screen.getByText('Email Addresses')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  test('shows email textarea with hint', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    expect(screen.getByPlaceholderText(/jane@example.com/)).toBeInTheDocument();
    expect(
      screen.getByText('Enter one email per line or separate with commas.')
    ).toBeInTheDocument();
  });

  test('shows info about 7-day expiry', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    expect(screen.getByText('Invitations expire after 7 days.')).toBeInTheDocument();
  });

  test('allows OWNER to select MANAGER or DEVELOPER role', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    // Find the role select trigger
    const roleSelect = screen.getByRole('combobox');
    expect(roleSelect).not.toBeDisabled();
  });

  test('disables role selector for MANAGER (can only invite DEVELOPER)', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="MANAGER" />
    );

    // Role select should be disabled for MANAGER
    const roleSelect = screen.getByRole('combobox');
    expect(roleSelect).toBeDisabled();
    expect(screen.getByText('Managers can only invite as Developer.')).toBeInTheDocument();
  });

  test('shows cancel and send buttons', () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Invitations' })).toBeInTheDocument();
  });

  test('validates empty email input', async () => {
    renderWithQueryClient(
      <InviteDialog open={true} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    // Type an invalid email format
    const textarea = screen.getByPlaceholderText(/jane@example.com/);
    fireEvent.change(textarea, { target: { value: 'not-an-email' } });

    // Click send
    const sendButton = screen.getByRole('button', { name: 'Send Invitations' });
    fireEvent.click(sendButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Please enter valid email addresses.')).toBeInTheDocument();
    });
  });

  test('does not render when closed', () => {
    renderWithQueryClient(
      <InviteDialog open={false} onOpenChange={vi.fn()} projectId="project-1" actorRole="OWNER" />
    );

    expect(screen.queryByText('Invite Team Members')).not.toBeInTheDocument();
  });
});
