'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { LeaveProjectDialog } from '../leave-project-dialog';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'members.leaveProject': 'Leave Project',
        'members.leaveConfirm': 'Are you sure you want to leave this project?',
        'members.leaveWarning': 'You will lose access to all project resources.',
        'members.leaveRegainAccess': 'To regain access, you will need to be invited again.',
        'members.stay': 'Stay',
      };
      return translations[key] || key;
    },
  }),
}));

describe('LeaveProjectDialog', () => {
  test('renders dialog when open', () => {
    render(
      <LeaveProjectDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isLeaving={false}
      />
    );

    // There are two "Leave Project" - title and button
    expect(screen.getAllByText('Leave Project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Are you sure you want to leave this project?')).toBeInTheDocument();
  });

  test('shows warning about losing access', () => {
    render(
      <LeaveProjectDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isLeaving={false}
      />
    );

    expect(screen.getByText('You will lose access to all project resources.')).toBeInTheDocument();
    expect(
      screen.getByText('To regain access, you will need to be invited again.')
    ).toBeInTheDocument();
  });

  test('calls onConfirm when leave button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <LeaveProjectDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        isLeaving={false}
      />
    );

    // Get the Leave Project button (the action button)
    const leaveButton = screen.getAllByRole('button', { name: /Leave Project/i })[0];
    fireEvent.click(leaveButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  test('calls onOpenChange when stay button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <LeaveProjectDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        isLeaving={false}
      />
    );

    const stayButton = screen.getByRole('button', { name: 'Stay' });
    fireEvent.click(stayButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('disables leave button when isLeaving is true', () => {
    render(
      <LeaveProjectDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} isLeaving={true} />
    );

    const leaveButton = screen.getAllByRole('button', { name: /Leave Project/i })[0];
    expect(leaveButton).toBeDisabled();
  });

  test('does not render when closed', () => {
    render(
      <LeaveProjectDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        isLeaving={false}
      />
    );

    expect(screen.queryByText('Leave Project')).not.toBeInTheDocument();
  });
});
