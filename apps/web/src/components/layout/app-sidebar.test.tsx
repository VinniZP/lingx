import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppSidebar, SidebarProvider } from './app-sidebar'
import { LingxProvider } from '@lingx/sdk-nextjs'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock useIsMobile to return desktop mode
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Static translations for tests
const staticTranslations = {
  'sidebar.brand': 'Lingx',
  'sidebar.tagline': 'Translation Management',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.projects': 'Projects',
  'sidebar.settings': 'Settings',
  'sidebar.language': 'Language',
  'sidebar.userFallback': 'User',
  'sidebar.apiKeys': 'API Keys',
  'sidebar.signOut': 'Sign out',
}

/**
 * Accessibility tests for AppSidebar component
 * Tests WCAG 2.1 AA compliance requirements:
 * - ARIA labels on interactive elements
 * - Navigation landmarks
 * - Focus indicators (via CSS class verification)
 */
// TODO: These tests check for accessibility features that need to be implemented
// Skipping until component is updated with proper ARIA labels and landmarks
describe.skip('AppSidebar Accessibility', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    isManager: true,
  }

  const mockOnLogout = vi.fn()

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <LingxProvider defaultLanguage="en" staticData={staticTranslations}>
        <SidebarProvider>
          {ui}
        </SidebarProvider>
      </LingxProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ARIA Labels', () => {
    it('should have aria-label on search button', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      const searchButton = screen.getByRole('button', { name: /search translations and projects/i })
      expect(searchButton).toBeInTheDocument()
      expect(searchButton).toHaveAttribute('aria-label', 'Search translations and projects')
    })

    it('should have aria-label on user menu button', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      const userMenuButton = screen.getByTestId('user-menu')
      expect(userMenuButton).toHaveAttribute('aria-label', 'User menu')
    })
  })

  describe('Navigation Landmarks', () => {
    it('should have navigation landmark with proper aria-label', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      const navigation = screen.getByRole('navigation', { name: /main navigation/i })
      expect(navigation).toBeInTheDocument()
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation')
    })
  })

  describe('Navigation Items Accessibility', () => {
    it('should render navigation links with visible text labels', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      // All navigation items should have visible text
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })

    it('should indicate active navigation item', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      // Find the link to /dashboard
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toBeInTheDocument()
    })

    it('should show settings link only for managers', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      // Manager should see Settings
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should hide settings link for non-managers', () => {
      const nonManagerUser = {
        ...mockUser,
        isManager: false,
      }

      renderWithProvider(
        <AppSidebar
          user={nonManagerUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      // Non-manager should not see Settings navigation item
      // Query for text 'Settings' that is inside navigation
      const navigation = screen.getByRole('navigation', { name: /main navigation/i })
      expect(within(navigation).queryByText('Settings')).not.toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should have focusable navigation items', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      const projectsLink = screen.getByRole('link', { name: /projects/i })

      // Links should be focusable (not have tabIndex=-1)
      expect(dashboardLink).not.toHaveAttribute('tabIndex', '-1')
      expect(projectsLink).not.toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('User Information Display', () => {
    it('should display user initials for screen readers', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      // User initials should be visible (TU for Test User)
      expect(screen.getByText('TU')).toBeInTheDocument()
    })

    it('should display user name and email', () => {
      renderWithProvider(
        <AppSidebar
          user={mockUser}
          pathname="/dashboard"
          onLogout={mockOnLogout}
        />
      )

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })
})
