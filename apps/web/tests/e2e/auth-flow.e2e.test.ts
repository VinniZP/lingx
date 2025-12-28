/**
 * Localeflow Web Authentication E2E Tests
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

import { test, expect } from '@playwright/test';
import {
  TEST_USER,
  registerUser,
  loginUser,
  logout,
  createUniqueUser,
} from './fixtures/test-helpers';

test.describe('Authentication User Journey', () => {
  // ==========================================================================
  // User Registration Flow - AC-WEB-020
  // ==========================================================================

  test.describe('User Registration Flow - AC-WEB-020', () => {
    test('User Journey: Complete registration from landing page to dashboard', async ({
      page,
    }) => {
      const uniqueUser = createUniqueUser('reg');

      // Start from landing page
      await page.goto('/');

      // Navigate to register - click "Get started" or "Register" link
      const getStartedButton = page.getByRole('link', {
        name: /get started|register/i,
      });
      await getStartedButton.first().click();
      await expect(page).toHaveURL('/register');

      // Fill registration form
      await page.getByLabel(/full name/i).fill(uniqueUser.name);
      await page.getByLabel(/email address/i).fill(uniqueUser.email);
      await page.getByLabel(/^password$/i).fill(uniqueUser.password);
      await page.getByLabel(/confirm password/i).fill(uniqueUser.password);

      // Submit
      await page.getByRole('button', { name: /create account/i }).click();

      // Verify successful registration - redirected to dashboard
      await expect(page).toHaveURL('/dashboard', {
        timeout: 15000,
      });

      // Verify user is logged in - should see user menu or avatar in sidebar
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // User name should be displayed in the greeting heading
      await expect(
        page.getByRole('heading', { name: new RegExp(uniqueUser.name.split(' ')[0], 'i') })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for invalid registration input', async ({
      page,
    }) => {
      await page.goto('/register');

      // Try to submit with empty password (name is optional)
      await page.getByLabel(/email address/i).fill('test@example.com');
      await page.getByLabel(/^password$/i).fill('');

      // The submit button should be disabled or form should not submit
      const submitButton = page.getByRole('button', {
        name: /create account/i,
      });

      // Test with weak password
      await page.getByLabel(/^password$/i).fill('123');
      await page.getByLabel(/confirm password/i).fill('123');

      // Password requirements should show as not met
      // The password requirements UI shows checkmarks for met requirements
      const requirementsList = page.locator('.text-muted-foreground');
      await expect(requirementsList.first()).toBeVisible();

      // Button should be disabled with weak password
      await expect(submitButton).toBeDisabled();

      // Test with valid password but non-matching confirmation
      await page.getByLabel(/^password$/i).fill('TestPassword123!');
      await page.getByLabel(/confirm password/i).fill('DifferentPassword123!');

      // Should show password mismatch error
      await expect(page.getByText(/passwords do not match/i)).toBeVisible();

      // Button should still be disabled
      await expect(submitButton).toBeDisabled();

      // Test with invalid email format
      await page.getByLabel(/email address/i).fill('invalid-email');
      await page.getByLabel(/^password$/i).fill('TestPassword123!');
      await page.getByLabel(/confirm password/i).fill('TestPassword123!');

      // Try to submit - HTML5 validation should prevent submission
      await submitButton.click({ force: true });

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

    test('User Journey: Login with existing account and access dashboard', async ({
      page,
    }) => {
      await page.goto('/login');

      // Fill login form
      await page.getByLabel(/email address/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Verify successful login - redirected to dashboard
      await expect(page).toHaveURL('/dashboard', {
        timeout: 15000,
      });

      // Verify session persists across page reload
      await page.reload();
      await expect(page).toHaveURL('/dashboard');

      // User should still be logged in - sidebar should be visible
      await expect(page.locator('aside')).toBeVisible();
    });

    test('should show error for invalid login credentials', async ({
      page,
    }) => {
      await page.goto('/login');

      // Fill with wrong password
      await page.getByLabel(/email address/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill('WrongPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for error toast/message
      // The app uses sonner for toasts
      await expect(page.getByText(/sign in failed|invalid/i)).toBeVisible({
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
      await page.getByTestId('logout-button').click();

      // Verify redirected to login page
      await expect(page).toHaveURL('/login', { timeout: 10000 });

      // Verify protected route redirects to login
      await page.goto('/projects');
      await expect(page).toHaveURL('/login', { timeout: 10000 });
    });
  });

  // ==========================================================================
  // Role-Based Access - AC-WEB-022
  // ==========================================================================

  test.describe('Role-Based Access - AC-WEB-022', () => {
    test('should deny developer access to manager-only features', async ({
      page,
    }) => {
      // Register as a regular user (developer role by default)
      const user = createUniqueUser('dev-role');
      await registerUser(page, user);

      // The sidebar should NOT show Settings link for regular users
      // Check if Settings link is hidden from navigation
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Settings link should not be visible for non-manager users
      const settingsNavLink = sidebar.getByRole('link', { name: /settings/i });
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
