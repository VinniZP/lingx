import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserRoleBadge } from '../user-role-badge';

const translations: Record<string, string> = {
  'admin.roles.admin': 'Admin',
  'admin.roles.manager': 'Manager',
  'admin.roles.developer': 'Developer',
};

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] || key,
    td: (key: string) => translations[key] || key,
  }),
  tKey: (key: string) => key,
}));

describe('UserRoleBadge', () => {
  test('renders ADMIN role with correct styling', () => {
    render(<UserRoleBadge role="ADMIN" />);

    const badge = screen.getByText('Admin').closest('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-destructive/10');
    expect(badge).toHaveClass('text-destructive');
  });

  test('renders MANAGER role with correct styling', () => {
    render(<UserRoleBadge role="MANAGER" />);

    const badge = screen.getByText('Manager').closest('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-info/10');
    expect(badge).toHaveClass('text-info');
  });

  test('renders DEVELOPER role with correct styling', () => {
    render(<UserRoleBadge role="DEVELOPER" />);

    const badge = screen.getByText('Developer').closest('div');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-success/10');
    expect(badge).toHaveClass('text-success');
  });

  test('includes icon for each role', () => {
    const { container: adminContainer } = render(<UserRoleBadge role="ADMIN" />);
    expect(adminContainer.querySelector('svg')).toBeInTheDocument();

    const { container: managerContainer } = render(<UserRoleBadge role="MANAGER" />);
    expect(managerContainer.querySelector('svg')).toBeInTheDocument();

    const { container: developerContainer } = render(<UserRoleBadge role="DEVELOPER" />);
    expect(developerContainer.querySelector('svg')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<UserRoleBadge role="ADMIN" className="custom-class" />);

    const badge = screen.getByText('Admin').closest('div');
    expect(badge).toHaveClass('custom-class');
  });
});
