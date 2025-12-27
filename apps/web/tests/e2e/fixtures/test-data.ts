// Localeflow Web E2E Test Fixtures - Design Doc: DESIGN.md
// Generated: 2025-12-27
// Purpose: Shared test data and setup utilities for E2E tests

/**
 * E2E Test Fixtures
 *
 * These fixtures provide consistent test data for Playwright E2E tests.
 * Data can be seeded via API calls before tests run.
 */

// =============================================================================
// Test User Data
// =============================================================================

/**
 * Test user credentials for E2E tests.
 * These users should be created before tests or via API seeding.
 */
export const testUsers = {
  developer: {
    email: 'developer@test.localeflow.local',
    password: 'TestPassword123!',
    name: 'Test Developer',
    role: 'developer' as const,
  },
  manager: {
    email: 'manager@test.localeflow.local',
    password: 'TestPassword123!',
    name: 'Test Manager',
    role: 'manager' as const,
  },
  admin: {
    email: 'admin@test.localeflow.local',
    password: 'TestPassword123!',
    name: 'Test Admin',
    role: 'admin' as const,
  },
};

// =============================================================================
// Test Project Data
// =============================================================================

/**
 * Sample project data for E2E tests.
 */
export const testProjects = {
  webApp: {
    name: 'Test Web Application',
    slug: 'test-web-app',
    languages: ['en', 'uk', 'de'],
    defaultLanguage: 'en',
  },
  mobileApp: {
    name: 'Test Mobile App',
    slug: 'test-mobile-app',
    languages: ['en', 'es', 'fr'],
    defaultLanguage: 'en',
  },
};

// =============================================================================
// Test Translation Data
// =============================================================================

/**
 * Sample translation keys for E2E tests.
 */
export const testTranslations = {
  common: [
    {
      key: 'button.submit',
      description: 'Submit button label',
      translations: {
        en: 'Submit',
        uk: 'Надіслати',
        de: 'Senden',
      },
    },
    {
      key: 'button.cancel',
      description: 'Cancel button label',
      translations: {
        en: 'Cancel',
        uk: 'Скасувати',
        de: 'Abbrechen',
      },
    },
    {
      key: 'nav.home',
      description: 'Navigation home link',
      translations: {
        en: 'Home',
        uk: 'Головна',
        de: 'Startseite',
      },
    },
  ],
  checkout: [
    {
      key: 'checkout.title',
      description: 'Checkout page title',
      translations: {
        en: 'Checkout',
        uk: 'Оформлення замовлення',
        de: 'Kasse',
      },
    },
    {
      key: 'cart.total',
      description: 'Cart total label',
      translations: {
        en: 'Total',
        uk: 'Разом',
        de: 'Gesamt',
      },
    },
  ],
};

// =============================================================================
// URL Patterns
// =============================================================================

/**
 * URL patterns for navigation assertions.
 */
export const urlPatterns = {
  landing: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  projects: '/projects',
  newProject: '/projects/new',
  projectDetail: (id: string) => `/projects/${id}`,
  spaces: (projectId: string) => `/projects/${projectId}/spaces`,
  branches: (projectId: string, spaceId: string) =>
    `/projects/${projectId}/spaces/${spaceId}/branches`,
  translations: (projectId: string, spaceId: string, branchId: string) =>
    `/projects/${projectId}/spaces/${spaceId}/branches/${branchId}`,
  branchDiff: (projectId: string, spaceId: string, branchId: string, targetId: string) =>
    `/projects/${projectId}/spaces/${spaceId}/branches/${branchId}/diff/${targetId}`,
  environments: (projectId: string) => `/projects/${projectId}/environments`,
  settings: '/settings',
  apiKeys: '/settings/api-keys',
};

// =============================================================================
// Selectors
// =============================================================================

/**
 * Common selectors for E2E tests.
 * Use data-testid attributes for stable selectors.
 */
export const selectors = {
  // Auth
  loginForm: '[data-testid="login-form"]',
  registerForm: '[data-testid="register-form"]',
  emailInput: '[data-testid="email-input"]',
  passwordInput: '[data-testid="password-input"]',
  submitButton: '[data-testid="submit-button"]',
  logoutButton: '[data-testid="logout-button"]',
  userMenu: '[data-testid="user-menu"]',

  // Navigation
  sidebar: '[data-testid="sidebar"]',
  breadcrumb: '[data-testid="breadcrumb"]',
  navLink: (name: string) => `[data-testid="nav-${name}"]`,

  // Projects
  projectList: '[data-testid="project-list"]',
  projectCard: '[data-testid="project-card"]',
  newProjectButton: '[data-testid="new-project-button"]',
  projectForm: '[data-testid="project-form"]',

  // Spaces
  spaceList: '[data-testid="space-list"]',
  newSpaceButton: '[data-testid="new-space-button"]',

  // Branches
  branchList: '[data-testid="branch-list"]',
  newBranchButton: '[data-testid="new-branch-button"]',
  branchSelector: '[data-testid="branch-selector"]',
  mergeButton: '[data-testid="merge-button"]',
  diffView: '[data-testid="diff-view"]',

  // Translations
  translationTable: '[data-testid="translation-table"]',
  translationRow: '[data-testid="translation-row"]',
  searchInput: '[data-testid="search-input"]',
  addKeyButton: '[data-testid="add-key-button"]',
  keyNameInput: '[data-testid="key-name-input"]',
  descriptionInput: '[data-testid="description-input"]',
  translationInput: (lang: string) => `[data-testid="translation-${lang}"]`,
  saveButton: '[data-testid="save-button"]',

  // API Keys
  apiKeyList: '[data-testid="api-key-list"]',
  generateKeyButton: '[data-testid="generate-key-button"]',
  apiKeyValue: '[data-testid="api-key-value"]',
  copyKeyButton: '[data-testid="copy-key-button"]',
  revokeKeyButton: '[data-testid="revoke-key-button"]',

  // Common
  errorMessage: '[data-testid="error-message"]',
  successMessage: '[data-testid="success-message"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  confirmDialog: '[data-testid="confirm-dialog"]',
  confirmButton: '[data-testid="confirm-button"]',
  cancelButton: '[data-testid="cancel-button"]',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * TODO: Implement seedTestData function
 *
 * Seeds test data via API before E2E tests.
 * Should be called in test.beforeAll or globalSetup.
 *
 * @param apiBaseUrl - API base URL
 * @returns Created test data references
 */
// export async function seedTestData(apiBaseUrl: string): Promise<{
//   users: Record<string, { id: string; email: string }>;
//   projects: Record<string, { id: string; slug: string }>;
//   apiKeys: Record<string, string>;
// }>

/**
 * TODO: Implement cleanupTestData function
 *
 * Removes test data after E2E tests complete.
 * Should be called in test.afterAll or globalTeardown.
 *
 * @param apiBaseUrl - API base URL
 */
// export async function cleanupTestData(apiBaseUrl: string): Promise<void>

/**
 * TODO: Implement loginAsUser function
 *
 * Logs in as test user and returns authenticated page.
 * Uses API login to set cookie, avoiding UI interaction.
 *
 * @param page - Playwright page
 * @param user - Test user credentials
 */
// export async function loginAsUser(
//   page: Page,
//   user: { email: string; password: string }
// ): Promise<void>
