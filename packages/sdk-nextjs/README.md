# Localeflow Next.js SDK

React SDK for integrating Localeflow translations into your Next.js 16 application with full React 19 support.

## Installation

```bash
pnpm add @localeflow/sdk-nextjs
# or
npm install @localeflow/sdk-nextjs
```

## Features

- React 19 compatible with use() hook support
- Full ICU MessageFormat support (plural, select, number, date)
- Server Components and Static Generation (SSG) support
- Namespace lazy-loading
- Language switching without page reload
- TypeScript first

## Quick Start

### 1. Environment Variables

```bash
# .env.local
LOCALEFLOW_API_KEY=lf_your_api_key_here
NEXT_PUBLIC_LOCALEFLOW_ENV=production
```

### 2. Provider Setup

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
          project="my-app"
          space="frontend"
          defaultLanguage="en"
          availableLanguages={['en', 'uk', 'de']}
        >
          {children}
        </LocaleflowProvider>
      </body>
    </html>
  );
}
```

### 3. Use Translations

```tsx
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export function MyComponent() {
  const { t, ready, error } = useTranslation();

  if (!ready) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.greeting', { name: 'User' })}</p>
    </div>
  );
}
```

## Provider Props

```tsx
interface LocaleflowProviderProps {
  // Required
  apiKey: string;              // Your Localeflow API key
  environment: string;         // Environment name (production, staging, etc.)
  project: string;             // Project slug
  space: string;               // Space slug
  defaultLanguage: string;     // Default/fallback language code

  // Optional
  apiUrl?: string;             // API URL (default: http://localhost:3001)
  availableLanguages?: string[]; // List of available languages
  namespaces?: string[];       // Namespaces to preload
  staticData?: TranslationBundle; // Pre-loaded translations (for SSG)
  fallback?: ReactNode;        // Loading fallback component
  children: ReactNode;
}
```

## Hooks

### useTranslation

Main hook for translating strings with ICU MessageFormat support.

```tsx
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export function MyComponent() {
  const { t, ready, error } = useTranslation();

  // Without namespace
  return <h1>{t('welcome.title')}</h1>;
}

// With namespace
export function AuthComponent() {
  const { t } = useTranslation('auth');

  // Looks up 'auth:login.title'
  return <h1>{t('login.title')}</h1>;
}
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `t` | `(key, values?) => string` | Translation function |
| `ready` | `boolean` | Whether translations are loaded |
| `error` | `Error \| null` | Any loading error |

### useLanguage

Hook for language management.

```tsx
'use client';

import { useLanguage } from '@localeflow/sdk-nextjs';

export function LanguageSwitcher() {
  const {
    language,
    setLanguage,
    availableLanguages,
    isChanging
  } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      disabled={isChanging}
    >
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </select>
  );
}
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `language` | `string` | Current language code |
| `setLanguage` | `(lang: string) => Promise<void>` | Change language |
| `availableLanguages` | `string[]` | Available language codes |
| `isChanging` | `boolean` | Whether language is being changed |

### useNamespace

Hook for lazy-loading translation namespaces.

```tsx
'use client';

import { useNamespace } from '@localeflow/sdk-nextjs';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { useEffect } from 'react';

export function CheckoutPage() {
  const { isLoaded, isLoading, loadNamespace } = useNamespace();
  const { t } = useTranslation();

  useEffect(() => {
    loadNamespace('checkout');
  }, [loadNamespace]);

  if (isLoading) return <div>Loading checkout...</div>;
  if (!isLoaded('checkout')) return null;

  // Use namespaced key with colon separator
  return <div>{t('checkout:title')}</div>;
}
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `isLoaded` | `(ns: string) => boolean` | Check if namespace is loaded |
| `isLoading` | `boolean` | Whether any namespace is loading |
| `loadNamespace` | `(ns: string) => Promise<void>` | Load a namespace |

### useLocaleflow

Low-level hook for accessing the full context. Use when you need access to all SDK features.

```tsx
'use client';

import { useLocaleflow } from '@localeflow/sdk-nextjs';

export function DebugComponent() {
  const context = useLocaleflow();

  console.log('Current language:', context.language);
  console.log('Loaded namespaces:', [...context.loadedNamespaces]);
  console.log('Translation count:', Object.keys(context.translations).length);

  return null;
}
```

## ICU MessageFormat

The SDK fully supports ICU MessageFormat syntax for advanced translations.

### Simple Interpolation

```
// Translation: "Hello, {name}!"
t('greeting', { name: 'World' })  // "Hello, World!"
```

### Pluralization

```
// Translation: "{count, plural, =0 {No items} one {1 item} other {{count} items}}"
t('cart.items', { count: 0 })  // "No items"
t('cart.items', { count: 1 })  // "1 item"
t('cart.items', { count: 5 })  // "5 items"
```

### Select (Gender, etc.)

```
// Translation: "{gender, select, male {He} female {She} other {They}} liked your post."
t('notification', { gender: 'female' })  // "She liked your post."
t('notification', { gender: 'other' })   // "They liked your post."
```

### Number Formatting

```
// Translation: "Price: {amount, number, currency}"
t('product.price', { amount: 1234.56 })  // "Price: $1,234.56" (en-US)
t('product.price', { amount: 1234.56 })  // "Price: 1.234,56 EUR" (de-DE)
```

### Date Formatting

```
// Translation: "Updated {date, date, medium}"
t('post.updated', { date: new Date() })  // "Updated Dec 28, 2025"

// Translation: "Meeting at {time, time, short}"
t('meeting.time', { time: new Date() })  // "Meeting at 2:30 PM"
```

### Ordinal (Position)

```
// Translation: "You are {position, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}"
t('ranking', { position: 1 })  // "You are 1st"
t('ranking', { position: 2 })  // "You are 2nd"
t('ranking', { position: 3 })  // "You are 3rd"
t('ranking', { position: 4 })  // "You are 4th"
```

## Server Components

Use `getTranslations` for Server Components (RSC):

```tsx
// app/page.tsx
import { getTranslations } from '@localeflow/sdk-nextjs/server';

export default async function Page() {
  const { t } = await getTranslations();

  return <h1>{t('home.title')}</h1>;
}
```

### Server Configuration

Configure the server-side SDK once in your layout:

```tsx
// app/layout.tsx
import { configureServer } from '@localeflow/sdk-nextjs/server';

// Configure server-side translations
configureServer({
  apiKey: process.env.LOCALEFLOW_API_KEY!,
  environment: 'production',
  project: 'my-app',
  space: 'frontend',
  defaultLanguage: 'en',
  apiUrl: 'http://localhost:3001',
});

export default function RootLayout({ children }) {
  // ... rest of layout
}
```

### With Language Parameter

```tsx
// app/[lang]/page.tsx
import { getTranslations } from '@localeflow/sdk-nextjs/server';

export default async function Page({
  params,
}: {
  params: { lang: string };
}) {
  const { t } = await getTranslations(undefined, params.lang);

  return <h1>{t('home.title')}</h1>;
}
```

## Static Generation (SSG)

For statically generated pages with translations:

```tsx
// app/[lang]/page.tsx
import { getTranslations, getAvailableLanguages } from '@localeflow/sdk-nextjs/server';

// Generate static pages for all languages
export async function generateStaticParams() {
  const languages = await getAvailableLanguages();
  return languages.map((lang) => ({ lang }));
}

export default async function Page({
  params,
}: {
  params: { lang: string };
}) {
  const { t } = await getTranslations(undefined, params.lang);

  return <h1>{t('home.title')}</h1>;
}
```

## Components

### LanguageSwitcher

Built-in language switcher component:

```tsx
import { LanguageSwitcher } from '@localeflow/sdk-nextjs';

export function Header() {
  return (
    <header>
      <LanguageSwitcher
        className="language-select"
        renderOption={(lang) => lang.toUpperCase()}
      />
    </header>
  );
}
```

## TypeScript

The SDK exports all types for TypeScript usage:

```typescript
import type {
  LocaleflowProviderProps,
  LocaleflowConfig,
  LocaleflowContextValue,
  TranslationFunction,
  TranslationValues,
  TranslationBundle,
} from '@localeflow/sdk-nextjs';

// Hook return types
import type {
  UseTranslationReturn,
  UseLanguageReturn,
  UseNamespaceReturn,
} from '@localeflow/sdk-nextjs';
```

## Advanced Usage

### Custom Client

For advanced use cases, access the client directly:

```tsx
import { LocaleflowClient } from '@localeflow/sdk-nextjs';

const client = new LocaleflowClient({
  apiKey: 'lf_...',
  environment: 'production',
  project: 'my-app',
  space: 'frontend',
  defaultLanguage: 'en',
});

await client.init();
const translation = client.translate('key', { name: 'value' });
```

### Preloading Translations

For SSG or SSR, preload translations:

```tsx
<LocaleflowProvider
  apiKey={apiKey}
  environment="production"
  project="my-app"
  space="frontend"
  defaultLanguage="en"
  staticData={{
    'welcome.title': 'Welcome!',
    'welcome.greeting': 'Hello, {name}!',
  }}
>
  {children}
</LocaleflowProvider>
```

### Translation Cache

The SDK caches translations automatically. Access the cache for debugging:

```tsx
import { TranslationCache } from '@localeflow/sdk-nextjs';

const cache = new TranslationCache({ ttl: 60000 });
cache.get('my-key');
cache.set('my-key', translations);
cache.clear();
```

## Troubleshooting

### "Translation not found" warnings

1. Ensure keys exist in Localeflow and are synced
2. Check namespace prefixes (use `namespace:key` format)
3. Verify the correct branch is configured

### Language switch not working

1. Verify `setLanguage` is called with a valid language
2. Check that the language is in `availableLanguages`
3. Ensure no errors in console

### Server Component errors

Use `getTranslations` from `@localeflow/sdk-nextjs/server`, not the hooks.

```tsx
// Correct for Server Components
import { getTranslations } from '@localeflow/sdk-nextjs/server';

// Hooks are for Client Components only
import { useTranslation } from '@localeflow/sdk-nextjs';
```

### Hydration mismatch

If you see hydration errors, ensure:
1. Server and client render the same language
2. Static data matches server-fetched data
3. Use the same language detection on both sides

### Slow initial load

1. Preload critical namespaces via provider `namespaces` prop
2. Use SSG with `staticData` for static pages
3. Consider code splitting by namespace

## Migration from other i18n libraries

### From next-intl

```diff
- import { useTranslations } from 'next-intl';
+ import { useTranslation } from '@localeflow/sdk-nextjs';

function MyComponent() {
-  const t = useTranslations('common');
+  const { t } = useTranslation('common');

   return <h1>{t('title')}</h1>;
}
```

### From react-i18next

```diff
- import { useTranslation } from 'react-i18next';
+ import { useTranslation } from '@localeflow/sdk-nextjs';

function MyComponent() {
-  const { t, i18n } = useTranslation();
+  const { t, ready } = useTranslation();
+  const { language, setLanguage } = useLanguage();

   return <h1>{t('title')}</h1>;
}
```

## Development

```bash
# Clone the monorepo
git clone https://github.com/your-org/localeflow.git
cd localeflow

# Install dependencies
pnpm install

# Build SDK
pnpm --filter=@localeflow/sdk-nextjs build

# Run tests
pnpm --filter=@localeflow/sdk-nextjs test
```
