'use client';

import type { ProjectMemberResponse } from '@lingx/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { MemberRow } from '../member-row';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'members.you': 'You',
        'members.joined': `Joined ${params?.time}`,
        'members.remove': 'Remove',
        'members.leave': 'Leave',
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

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 days ago',
}));

const createMember = (overrides: Partial<ProjectMemberResponse> = {}): ProjectMemberResponse => ({
  userId: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  avatarUrl: null,
  role: 'DEVELOPER',
  joinedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('MemberRow', () => {
  test('renders member name, email, and avatar initials', () => {
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
  });

  test('shows "(You)" indicator for current user', () => {
    const member = createMember({ userId: 'current-user' });
    render(
      <MemberRow
        member={member}
        currentUserId="current-user"
        currentUserRole="DEVELOPER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  test('shows remove button for OWNER viewing other member', () => {
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    expect(removeButton).toBeInTheDocument();
  });

  test('hides remove button for non-OWNER', () => {
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="MANAGER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  test('hides remove button when viewing self', () => {
    const member = createMember({ userId: 'current-user' });
    render(
      <MemberRow
        member={member}
        currentUserId="current-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  test('shows leave button for current user', () => {
    const member = createMember({ userId: 'current-user' });
    render(
      <MemberRow
        member={member}
        currentUserId="current-user"
        currentUserRole="DEVELOPER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Leave/i })).toBeInTheDocument();
  });

  test('hides leave button for sole OWNER', () => {
    const member = createMember({ userId: 'current-user', role: 'OWNER' });
    render(
      <MemberRow
        member={member}
        currentUserId="current-user"
        currentUserRole="OWNER"
        isOnlyOwner={true}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Leave/i })).not.toBeInTheDocument();
  });

  test('displays joined timestamp', () => {
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByText(/Joined 2 days ago/i)).toBeInTheDocument();
  });

  test('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={onRemove}
        onLeave={vi.fn()}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith('user-1');
  });

  test('calls onLeave when leave button is clicked', () => {
    const onLeave = vi.fn();
    const member = createMember({ userId: 'current-user' });
    render(
      <MemberRow
        member={member}
        currentUserId="current-user"
        currentUserRole="DEVELOPER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={onLeave}
      />
    );

    const leaveButton = screen.getByRole('button', { name: /Leave/i });
    fireEvent.click(leaveButton);

    expect(onLeave).toHaveBeenCalled();
  });

  test('uses email for display when name is null', () => {
    const member = createMember({ name: null });
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    // Email should be the primary display
    const emails = screen.getAllByText('john@example.com');
    expect(emails.length).toBeGreaterThanOrEqual(1);
  });

  test('disables remove button when isRemoving', () => {
    const member = createMember();
    render(
      <MemberRow
        member={member}
        currentUserId="other-user"
        currentUserRole="OWNER"
        isOnlyOwner={false}
        onRoleChange={vi.fn()}
        onRemove={vi.fn()}
        onLeave={vi.fn()}
        isRemoving={true}
      />
    );

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    expect(removeButton).toBeDisabled();
  });
});
