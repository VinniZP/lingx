import type { AdminUserProject } from '@lingx/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { UserProjectsSection } from '../user-projects-section';

const translations: Record<string, string> = {
  'admin.users.projects': 'Projects',
  'admin.users.noProjects': 'Not a member of any projects',
  'members.roles.owner': 'Owner',
  'members.roles.manager': 'Manager',
  'members.roles.developer': 'Developer',
};

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] || key,
    td: (key: string) => translations[key] || key,
  }),
  tKey: (key: string) => key,
}));

const mockProjects: AdminUserProject[] = [
  {
    id: 'proj-1',
    name: 'Project Alpha',
    slug: 'alpha',
    role: 'OWNER',
  },
  {
    id: 'proj-2',
    name: 'Project Beta',
    slug: 'beta',
    role: 'DEVELOPER',
  },
];

describe('UserProjectsSection', () => {
  test('renders section title', () => {
    render(<UserProjectsSection projects={mockProjects} />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  test('renders project list', () => {
    render(<UserProjectsSection projects={mockProjects} />);

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  test('renders project roles', () => {
    render(<UserProjectsSection projects={mockProjects} />);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  test('renders empty state when no projects', () => {
    render(<UserProjectsSection projects={[]} />);

    expect(screen.getByText('Not a member of any projects')).toBeInTheDocument();
  });

  test('renders project links', () => {
    render(<UserProjectsSection projects={mockProjects} />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/projects/alpha');
    expect(links[1]).toHaveAttribute('href', '/projects/beta');
  });
});
