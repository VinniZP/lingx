/**
 * Lingx Web Authentication E2E Tests
 *
 * Design Doc: DESIGN.md
 * Test Type: End-to-End Test
 * Test Count: 6 tests
 *
 * Tests cover:
 * - User registration flow (AC-WEB-020)
 * - User login flow (AC-WEB-021)
 * - Logout flow
 * - Role-based access (AC-WEB-022)
 */

import { expect, test } from '@playwright/test';
import { createUniqueUser, logout, registerUser } from './fixtures/test-helpers';

test.describe('Authentication User Journey', () => {
  // ==========================================================================
  // User Registration Flow - AC-WEB-020
  // ==========================================================================

  test.describe('User Registration Flow - AC-WEB-020', () => {
    test('User Journey: Complete registration from landing page to dashboard', async ({ page }) => {
      const uniqueUser = createUniqueUser('reg');

      // Start from landing page
      await page.goto('/');

      // Navigate to register - click "Get started" or "Register" link
      const getStartedButton = page.getByRole('link', {
        name: /get started|register/i,
      });
      await getStartedButton.first().click();
      await expect(page).toHaveURL('/register');

      // Fill registration form using placeholders (more reliable due to FormControl wrapper)
      await page.getByPlaceholder(/john doe/i).fill(uniqueUser.name);
      await page.getByPlaceholder(/you@example\.com/i).fill(uniqueUser.email);
      await page.getByPlaceholder(/create a strong password/i).fill(uniqueUser.password);

      // Submit
      await page.getByRole('button', { name: /create an account/i }).click();

      // Verify successful registration - redirected to dashboard
      await expect(page).toHaveURL('/dashboard', {
        timeout: 15000,
      });

      // Verify user is logged in - should see user menu in sidebar
      await expect(page.getByTestId('user-menu')).toBeVisible({ timeout: 5000 });

      // User name should be displayed in the greeting heading
      await expect(
        page.getByRole('heading', { name: new RegExp(uniqueUser.name.split(' ')[0], 'i') })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for invalid registration input', async ({ page }) => {
      await page.goto('/register');

      const emailInput = page.getByPlaceholder(/you@example\.com/i);
      const passwordInput = page.getByPlaceholder(/create a strong password/i);
      const submitButton = page.getByRole('button', { name: /create an account/i });

      // Test with weak password - fill and blur to trigger validation
      await emailInput.fill('test@example.com');
      await passwordInput.fill('123');
      await passwordInput.blur();

      // Form validation error should appear (onTouched mode)
      // Try to submit - should show validation errors
      await submitButton.click();

      // Should still be on register page due to validation
      await expect(page).toHaveURL('/register');

      // Test with invalid email format
      await emailInput.fill('invalid-email');
      await passwordInput.fill('TestPassword123!');

      // Try to submit - HTML5 validation should prevent submission
      await submitButton.click();

      // Should still be on register page
      await expect(page).toHaveURL('/register');
    });
  });

  // ==========================================================================
  // User Login Flow - AC-WEB-021
  // ==========================================================================

  test.describe('User Login Flow - AC-WEB-021', () => {
    let testUser: { name: string; email: string; password: string };

    test.beforeEach(async ({ page }) => {
      // Register a user first
      testUser = createUniqueUser('login');
      await registerUser(page, testUser);
      await logout(page);
    });

    test('User Journey: Login with existing account and access dashboard', async ({ page }) => {
      await page.goto('/login');

      // Fill login form using placeholders
      await page.getByPlaceholder(/you@example\.com/i).fill(testUser.email);
      await page.getByPlaceholder(/enter your password/i).fill(testUser.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();

      // Verify successful login - redirected to dashboard
      await expect(page).toHaveURL('/dashboard', {
        timeout: 15000,
      });

      // Verify session persists across page reload
      await page.reload();
      await expect(page).toHaveURL('/dashboard');

      // User should still be logged in - user menu should be visible
      await expect(page.getByTestId('user-menu')).toBeVisible();
    });

    test('should show error for invalid login credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with wrong password using placeholders
      await page.getByPlaceholder(/you@example\.com/i).fill(testUser.email);
      await page.getByPlaceholder(/enter your password/i).fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();

      // Wait for error toast/message
      // The app uses sonner for toasts - target the toast title specifically
      await expect(page.getByText('Sign in failed')).toBeVisible({
        timeout: 10000,
      });

      // Verify still on login page
      await expect(page).toHaveURL('/login');
    });
  });

  // ==========================================================================
  // Logout Flow
  // ==========================================================================

  test.describe('Logout Flow', () => {
    test('should logout user and clear session', async ({ page }) => {
      const user = createUniqueUser('logout');

      // Register and verify logged in
      await registerUser(page, user);
      await expect(page).toHaveURL('/dashboard');

      // Perform logout via user menu
      await page.getByTestId('user-menu').click();

      // Wait for menu to be visible before clicking logout
      const logoutButton = page.getByTestId('logout-button');
      await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
      await logoutButton.click();

      // Verify redirected to login page
      await expect(page).toHaveURL('/login', { timeout: 15000 });

      // Wait a moment for cookies to be cleared on the server
      await page.waitForTimeout(500);

      // Verify protected route redirects to login
      // Use waitForURL after goto to handle client-side redirect
      await page.goto('/projects');

      // The dashboard layout should redirect to login when not authenticated
      // Wait for either the redirect or the loading to finish
      await expect(page).toHaveURL('/login', { timeout: 15000 });
    });
  });

  // ==========================================================================
  // Role-Based Access - AC-WEB-022
  // ==========================================================================

  test.describe('Role-Based Access - AC-WEB-022', () => {
    test('should deny developer access to manager-only features', async ({ page }) => {
      // Register as a regular user (developer role by default)
      const user = createUniqueUser('dev-role');
      await registerUser(page, user);

      // User should be logged in
      await expect(page.getByTestId('user-menu')).toBeVisible();

      // Settings link should not be visible for non-manager users in the sidebar
      // Note: Users may see project settings if they own a project, but not account settings
      const settingsNavLink = page
        .getByRole('navigation')
        .getByRole('link', { name: /^settings$/i });
      await expect(settingsNavLink).not.toBeVisible();

      // Try to directly access settings page
      await page.goto('/settings');

      // Should either:
      // 1. Be redirected away from settings
      // 2. See an access denied message
      // 3. See a 404/not found page

      // Wait for page to settle
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasAccessDenied = await page
        .getByText(/access denied|unauthorized|forbidden/i)
        .isVisible()
        .catch(() => false);
      const wasRedirected =
        !url.includes('/settings') ||
        url.includes('/login') ||
        url.includes('/projects') ||
        url.includes('/dashboard');

      // Either redirected or shown access denied
      expect(hasAccessDenied || wasRedirected).toBeTruthy();
    });
  });
});
