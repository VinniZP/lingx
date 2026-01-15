import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserStatusBadge } from '../user-status-badge';

const translations: Record<string, string> = {
  'admin.status.active': 'Active',
  'admin.status.disabled': 'Disabled',
};

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] || key,
    td: (key: string) => translations[key] || key,
  }),
  tKey: (key: string) => key,
}));

describe('UserStatusBadge', () => {
  test('renders active status with correct styling', () => {
    render(<UserStatusBadge isDisabled={false} />);

    const badge = screen.getByText('Active').closest('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-success/10');
    expect(badge).toHaveClass('text-success');
  });

  test('renders disabled status with correct styling', () => {
    render(<UserStatusBadge isDisabled={true} />);

    const badge = screen.getByText('Disabled').closest('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-destructive/10');
    expect(badge).toHaveClass('text-destructive');
  });

  test('includes icon for each status', () => {
    const { container: activeContainer } = render(<UserStatusBadge isDisabled={false} />);
    expect(activeContainer.querySelector('svg')).toBeInTheDocument();

    const { container: disabledContainer } = render(<UserStatusBadge isDisabled={true} />);
    expect(disabledContainer.querySelector('svg')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<UserStatusBadge isDisabled={false} className="custom-class" />);

    const badge = screen.getByText('Active').closest('div');
    expect(badge).toHaveClass('custom-class');
  });
});
