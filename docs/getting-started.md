# Getting Started with Localeflow

This guide will help you set up Localeflow and start managing translations in your project.

## Prerequisites

- Localeflow server running (see [Deployment Guide](./deployment.md))
- Node.js 20+ for CLI/SDK
- A Next.js application

## Step 1: Create Your Account

1. Open Localeflow at http://localhost:3000 (or your deployment URL)
2. Click "Register" and create an account
3. Log in to access the dashboard

## Step 2: Create a Project

1. From the dashboard, click "New Project"
2. Enter project details:
   - **Name**: e.g., "My Web App"
   - **Slug**: e.g., "my-web-app"
   - **Languages**: Select all languages you need
   - **Default Language**: Usually English (en)
3. Click "Create Project"

## Step 3: Create a Space

Spaces let you organize translations by area (frontend, backend, mobile).

1. Navigate to your project
2. Click "New Space"
3. Enter space name: e.g., "Frontend"
4. A `main` branch is automatically created

## Step 4: Add Translation Keys

1. Go to your space's main branch
2. Click "Add Key"
3. Enter:
   - **Key**: e.g., `button.submit`
   - **Description**: Context for translators
   - **Translations**: Values for each language
4. Save the key

## Step 5: Install the CLI

```bash
# Install globally
npm install -g @localeflow/cli

# Or use npx
npx @localeflow/cli
```

## Step 6: Configure CLI

Create `.localeflow.yml` in your project root:

```yaml
# API connection
apiUrl: http://localhost:3001

# Project configuration
project: my-web-app
defaultSpace: frontend
defaultBranch: main

# File paths
paths:
  translations: ./src/locales
  source: ./src

# Output format
format:
  type: json
  nested: true
  indentation: 2

# Pull settings
pull:
  languages: []  # Empty means all languages
  filePattern: "{lang}.json"

# Push settings
push:
  languages: []  # Empty means all languages
  filePattern: "{lang}.json"

# Extract settings
extract:
  framework: nextjs
  patterns:
    - "**/*.tsx"
    - "**/*.ts"
  exclude:
    - "**/node_modules/**"
    - "**/*.test.*"
  functions:
    - t
    - useTranslation
```

## Step 7: Generate API Key

1. Go to Settings > API Keys
2. Click "Generate New Key"
3. Copy the key (shown only once!)

## Step 8: Login with CLI

```bash
lf auth login
# Paste your API key when prompted
```

Or set the API key directly:

```bash
lf auth login --key=lf_your_api_key_here
```

## Step 9: Pull Translations

```bash
lf pull
# Translations downloaded to ./src/locales/
```

Your project will now have translation files:
```
src/locales/
├── en.json
├── uk.json
└── de.json
```

## Step 10: Install SDK

```bash
pnpm add @localeflow/sdk-nextjs
```

## Step 11: Set Up Provider

```tsx
// app/layout.tsx
import { LocaleflowProvider } from '@localeflow/sdk-nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <LocaleflowProvider
          apiKey={process.env.LOCALEFLOW_API_KEY!}
          environment={process.env.NEXT_PUBLIC_LOCALEFLOW_ENV!}
          project="my-web-app"
          space="frontend"
          defaultLanguage="en"
        >
          {children}
        </LocaleflowProvider>
      </body>
    </html>
  );
}
```

## Step 12: Use Translations

```tsx
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export function MyComponent() {
  const { t, ready, error } = useTranslation();

  if (!ready) return <div>Loading translations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.greeting', { name: 'User' })}</p>
      <button>{t('button.submit')}</button>
    </div>
  );
}
```

## Workflow Example: Feature Development

When working on a new feature that requires new translations:

### 1. Create a Feature Branch

```bash
lf branch create feature-checkout --from=main
```

### 2. Update Your Config

Update `.localeflow.yml` to use the feature branch:

```yaml
defaultBranch: feature-checkout
```

### 3. Add New Keys in the UI

1. Navigate to your feature branch in Localeflow
2. Add the translation keys you need
3. Add translations for each language

### 4. Pull to Local

```bash
lf pull
```

### 5. Develop Your Feature

Use the new translation keys in your code:

```tsx
function CheckoutPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('checkout.title')}</h1>
      <p>{t('checkout.summary', { total: 99.99 })}</p>
    </div>
  );
}
```

### 6. Merge When Ready

When your feature is complete:

```bash
lf branch merge feature-checkout --into=main
```

Or use the web UI to merge with conflict resolution.

## Development vs Production

### Development

Point your development environment to the `main` branch or a feature branch:

```bash
# Environment variables
NEXT_PUBLIC_LOCALEFLOW_ENV=development
```

### Production

Point production to the `main` branch (or a `release` branch):

```bash
# Environment variables
NEXT_PUBLIC_LOCALEFLOW_ENV=production
```

## Next Steps

- [CLI Command Reference](../packages/cli/README.md) - All CLI commands and options
- [SDK Advanced Usage](../packages/sdk-nextjs/README.md) - ICU MessageFormat, namespaces, SSR
- [Deployment Guide](./deployment.md) - Production deployment with Docker
