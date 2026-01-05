# E2E Testing with Playwright

End-to-end tests verify complete user flows in real browsers.

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Start dev server before tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to page before each test
    await page.goto('/dashboard');
  });

  test('should display project list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.getByTestId('project-list')).toBeVisible();
  });
});
```

## Page Object Model

Create reusable page objects for maintainability:

```typescript
// tests/e2e/pages/dashboard-page.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newProjectButton: Locator;
  readonly projectList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.newProjectButton = page.getByRole('button', { name: 'New Project' });
    this.projectList = page.getByTestId('project-list');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async createProject(name: string, slug: string) {
    await this.newProjectButton.click();
    await this.page.getByLabel('Name').fill(name);
    await this.page.getByLabel('Slug').fill(slug);
    await this.page.getByRole('button', { name: 'Create' }).click();
  }

  async expectProjectVisible(name: string) {
    await expect(this.projectList.getByText(name)).toBeVisible();
  }
}

// Usage in test
test('should create new project', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  await dashboard.createProject('My Project', 'my-project');
  await dashboard.expectProjectVisible('My Project');
});
```

## Authentication Fixtures

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';

// Extend base test with authenticated page
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for redirect
    await page.waitForURL('/dashboard');

    // Use authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Usage
import { test, expect } from './fixtures/auth';

test('should access protected page', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/settings');
  await expect(authenticatedPage.getByText('Settings')).toBeVisible();
});
```

## Reusable Auth State

Save and reuse authentication state across tests:

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');

  // Save storage state
  await page.context().storageState({ path: authFile });
});

// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: {
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },
],
```

## Testing Forms

```typescript
test('should validate form inputs', async ({ page }) => {
  await page.goto('/projects/new');

  // Submit empty form
  await page.getByRole('button', { name: 'Create' }).click();

  // Expect validation errors
  await expect(page.getByText('Name is required')).toBeVisible();

  // Fill required field
  await page.getByLabel('Name').fill('My Project');
  await page.getByRole('button', { name: 'Create' }).click();

  // Expect success
  await expect(page).toHaveURL(/\/projects\/\w+/);
});

test('should handle form submission', async ({ page }) => {
  await page.goto('/settings');

  await page.getByLabel('Display Name').fill('New Name');
  await page.getByRole('button', { name: 'Save' }).click();

  // Wait for toast/feedback
  await expect(page.getByText('Settings saved')).toBeVisible();
});
```

## Testing Navigation

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/dashboard');

  // Click navigation link
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL('/settings');

  // Use back button
  await page.goBack();
  await expect(page).toHaveURL('/dashboard');
});

test('should handle breadcrumbs', async ({ page }) => {
  await page.goto('/projects/my-project/keys');

  await page.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL('/projects');
});
```

## API Mocking

Mock API responses for edge cases:

```typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Mock API to return error
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  );

  await page.goto('/dashboard');

  await expect(page.getByText('Failed to load projects')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('should show empty state', async ({ page }) => {
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify([]),
    })
  );

  await page.goto('/dashboard');

  await expect(page.getByText('No projects yet')).toBeVisible();
});
```

## Visual Testing

```typescript
test('should match visual snapshot', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});

test('should match component snapshot', async ({ page }) => {
  await page.goto('/dashboard');
  const header = page.getByRole('banner');
  await expect(header).toHaveScreenshot('header.png');
});
```

## Best Practices

### Use Role-Based Selectors

```typescript
// ✅ Good - accessible and resilient
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email').fill('test@example.com');
await page.getByRole('heading', { name: 'Welcome' });

// ❌ Avoid - fragile selectors
await page.click('.btn-primary');
await page.locator('#email-input').fill('test@example.com');
```

### Use Test IDs for Complex Elements

```typescript
// Component
<DataTable data-testid="project-table">...</DataTable>

// Test
await expect(page.getByTestId('project-table')).toBeVisible();
```

### Wait for Network Idle

```typescript
test('should load data', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for API calls to complete
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('project-list')).toBeVisible();
});
```

### Handle Flaky Tests

```typescript
test('should handle slow loading', async ({ page }) => {
  await page.goto('/dashboard');

  // Explicit wait for dynamic content
  await expect(page.getByText('Projects')).toBeVisible({ timeout: 10000 });
});
```

## Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Debug specific test
npx playwright test --debug tests/e2e/dashboard.spec.ts

# View trace
npx playwright show-trace trace.zip
```

## CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```
