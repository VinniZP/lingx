/**
 * Localeflow E2E Test Helpers
 *
 * Shared utilities for Playwright E2E tests.
 * These helpers provide reusable functions for common operations.
 */

import { Page, expect } from '@playwright/test';

// =============================================================================
// Test User Data
// =============================================================================

/**
 * Default test user for E2E tests.
 * Each test should generate unique email using timestamp.
 */
export const TEST_USER = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

/**
 * Manager user for testing role-based access.
 */
export const MANAGER_USER = {
  name: 'Manager User',
  email: `manager-${Date.now()}@example.com`,
  password: 'ManagerPass123!',
  role: 'manager' as const,
};

// =============================================================================
// Authentication Helpers
// =============================================================================

/**
 * Registers a new user via the registration form.
 *
 * @param page - Playwright page object
 * @param user - User details (defaults to TEST_USER with unique email)
 */
export async function registerUser(
  page: Page,
  user: { name: string; email: string; password: string } = {
    ...TEST_USER,
    email: `test-${Date.now()}@example.com`,
  }
): Promise<void> {
  await page.goto('/register');

  // Fill registration form
  await page.getByLabel(/full name/i).fill(user.name);
  await page.getByLabel(/email address/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);
  await page.getByLabel(/confirm password/i).fill(user.password);

  // Submit form
  await page.getByRole('button', { name: /create account/i }).click();

  // Wait for redirect to dashboard/projects
  await expect(page).toHaveURL(/\/(dashboard|projects|$)/, { timeout: 15000 });
}

/**
 * Logs in an existing user via the login form.
 *
 * @param page - Playwright page object
 * @param user - User credentials
 */
export async function loginUser(
  page: Page,
  user: { email: string; password: string } = TEST_USER
): Promise<void> {
  await page.goto('/login');

  // Fill login form
  await page.getByLabel(/email address/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard/projects
  await expect(page).toHaveURL(/\/(dashboard|projects|$)/, { timeout: 15000 });
}

/**
 * Logs out the current user via the user menu.
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu (click the avatar/user button in sidebar)
  await page.locator('aside').getByRole('button').last().click();

  // Click sign out option
  await page.getByRole('menuitem', { name: /sign out/i }).click();

  // Wait for redirect to login or landing
  await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });
}

// =============================================================================
// Project Helpers
// =============================================================================

/**
 * Creates a new project via the project creation form.
 *
 * @param page - Playwright page object
 * @param name - Project name
 * @param slug - Project slug (URL-friendly identifier)
 * @param languages - Array of language codes (default: en, uk, de)
 */
export async function createProject(
  page: Page,
  name: string,
  slug: string,
  languages: string[] = ['en', 'uk', 'de']
): Promise<void> {
  await page.goto('/projects/new');

  // Fill project form
  await page.getByLabel(/project name/i).fill(name);
  await page.getByLabel(/project slug/i).fill(slug);

  // Select languages if language selector exists
  const languageSelector = page.locator('[data-testid="language-selector"]');
  if (await languageSelector.isVisible()) {
    await languageSelector.click();
    for (const lang of languages) {
      await page.locator(`[data-testid="language-${lang}"]`).click();
    }
    await page.keyboard.press('Escape');
  }

  // Submit form
  await page.getByRole('button', { name: /create project/i }).click();

  // Wait for project page
  await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 15000 });
}

/**
 * Creates a new space within a project.
 *
 * @param page - Playwright page object
 * @param name - Space name
 */
export async function createSpace(page: Page, name: string): Promise<void> {
  // Click new space button
  await page.getByRole('button', { name: /new space|create space/i }).click();

  // Fill space name
  await page.getByLabel(/space name|name/i).fill(name);

  // Submit form
  await page.getByRole('button', { name: /create/i }).click();

  // Verify space created
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

/**
 * Creates a new branch from an existing branch.
 *
 * @param page - Playwright page object
 * @param name - Branch name
 * @param fromBranch - Source branch (default: main)
 */
export async function createBranch(
  page: Page,
  name: string,
  fromBranch: string = 'main'
): Promise<void> {
  // Click new branch button
  await page.getByRole('button', { name: /new branch|create branch/i }).click();

  // Fill branch name
  await page.getByLabel(/branch name|name/i).fill(name);

  // Select source branch if available
  const sourceBranchSelect = page.getByLabel(/source branch|base branch/i);
  if (await sourceBranchSelect.isVisible()) {
    await sourceBranchSelect.selectOption({ label: fromBranch });
  }

  // Submit form
  await page.getByRole('button', { name: /create/i }).click();

  // Verify branch created
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// Translation Helpers
// =============================================================================

/**
 * Adds a new translation key with values for multiple languages.
 *
 * @param page - Playwright page object
 * @param key - Translation key (e.g., "button.submit")
 * @param translations - Object mapping language codes to translation values
 * @param description - Optional description for the key
 */
export async function addTranslationKey(
  page: Page,
  key: string,
  translations: Record<string, string>,
  description?: string
): Promise<void> {
  // Click add key button
  await page.getByRole('button', { name: /add key|new key/i }).click();

  // Fill key name
  await page.getByLabel(/key|translation key/i).fill(key);

  // Fill description if provided
  if (description) {
    const descInput = page.getByLabel(/description/i);
    if (await descInput.isVisible()) {
      await descInput.fill(description);
    }
  }

  // Fill translations for each language
  for (const [lang, value] of Object.entries(translations)) {
    const input = page.locator(`[data-testid="translation-${lang}"]`);
    if (await input.isVisible()) {
      await input.fill(value);
    } else {
      // Try alternate selectors
      const altInput = page.getByLabel(new RegExp(lang, 'i'));
      if (await altInput.isVisible()) {
        await altInput.fill(value);
      }
    }
  }

  // Submit form
  await page.getByRole('button', { name: /create|save/i }).click();

  // Verify key created
  await expect(page.getByText(key)).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// Environment Helpers
// =============================================================================

/**
 * Creates a new environment.
 *
 * @param page - Playwright page object
 * @param name - Environment name (e.g., "Production")
 * @param slug - Environment slug (e.g., "production")
 */
export async function createEnvironment(
  page: Page,
  name: string,
  slug: string
): Promise<void> {
  // Click new environment button
  await page
    .getByRole('button', { name: /new environment|create environment/i })
    .click();

  // Fill environment form
  await page.getByLabel(/environment name|name/i).fill(name);
  await page.getByLabel(/slug/i).fill(slug);

  // Submit form
  await page.getByRole('button', { name: /create/i }).click();

  // Verify environment created
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generates a unique identifier for test data isolation.
 *
 * @returns A unique timestamp-based identifier
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a unique user for a test.
 *
 * @param prefix - Prefix for the email (default: "test")
 * @returns User object with unique email
 */
export function createUniqueUser(prefix: string = 'test'): {
  name: string;
  email: string;
  password: string;
} {
  const id = generateUniqueId();
  return {
    name: `Test User ${id}`,
    email: `${prefix}-${id}@example.com`,
    password: 'TestPassword123!',
  };
}

/**
 * Waits for a toast notification to appear.
 *
 * @param page - Playwright page object
 * @param message - Toast message to wait for (partial match)
 */
export async function waitForToast(
  page: Page,
  message: string | RegExp
): Promise<void> {
  const toastSelector =
    typeof message === 'string' ? `text=${message}` : message;
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: toastSelector })).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Dismisses any visible toast notifications.
 *
 * @param page - Playwright page object
 */
export async function dismissToasts(page: Page): Promise<void> {
  const toasts = page.locator('[data-sonner-toast]');
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    await toasts.nth(i).click();
  }
}

// =============================================================================
// Selectors (data-testid references)
// =============================================================================

export const SELECTORS = {
  // Auth
  loginForm: '[data-testid="login-form"]',
  registerForm: '[data-testid="register-form"]',
  userMenu: '[data-testid="user-menu"]',
  logoutButton: '[data-testid="logout-button"]',

  // Navigation
  sidebar: '[data-testid="sidebar"]',
  breadcrumb: '[data-testid="breadcrumb"]',

  // Projects
  projectList: '[data-testid="project-list"]',
  projectCard: '[data-testid="project-card"]',
  newProjectButton: '[data-testid="new-project-button"]',

  // Spaces
  spaceList: '[data-testid="space-list"]',
  newSpaceButton: '[data-testid="new-space-button"]',

  // Branches
  branchList: '[data-testid="branch-list"]',
  newBranchButton: '[data-testid="new-branch-button"]',
  diffButton: '[data-testid="diff-button"]',

  // Translations
  translationTable: '[data-testid="translation-table"]',
  searchInput: '[data-testid="search-input"]',
  addKeyButton: '[data-testid="add-key-button"]',

  // Diff
  addedKeys: '[data-testid="added-keys"]',
  modifiedKeys: '[data-testid="modified-keys"]',
  deletedKeys: '[data-testid="deleted-keys"]',

  // API Keys
  generateKeyButton: '[data-testid="generate-key-button"]',
  newApiKey: '[data-testid="new-api-key"]',
  revokeKeyButton: '[data-testid="revoke-key-button"]',

  // Common
  errorMessage: '[data-testid="error-message"]',
  successMessage: '[data-testid="success-message"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
} as const;
