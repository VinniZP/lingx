# Getting Started

This guide walks you through setting up `@localeflow/sdk-nextjs` in your Next.js application.

## Prerequisites

- **Next.js 15+** with App Router
- **React 19+**
- **Node.js 18+**

## Installation

```bash
# Using pnpm (recommended)
pnpm add @localeflow/sdk-nextjs

# Using npm
npm install @localeflow/sdk-nextjs

# Using yarn
yarn add @localeflow/sdk-nextjs
```

## Quick Setup

### 1. Create Translation Files

Create a `locales` directory with JSON files for each language:

```
app/
├── locales/
│   ├── en.json
│   └── de.json
├── layout.tsx
└── page.tsx
```

**locales/en.json:**
```json
{
  "greeting": "Hello, {name}!",
  "items": "{count, plural, =0 {No items} one {1 item} other {{count} items}}"
}
```

**locales/de.json:**
```json
{
  "greeting": "Hallo, {name}!",
  "items": "{count, plural, =0 {Keine Artikel} one {1 Artikel} other {{count} Artikel}}"
}
```

### 2. Add the Provider

Wrap your application with `LocaleflowProvider` in your root layout:

```tsx
// app/layout.tsx
import { LocaleflowProvider } from '@localeflow/sdk-nextjs';
import en from './locales/en.json';
import de from './locales/de.json';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LocaleflowProvider
          defaultLanguage="en"
          staticData={{ en, de }}
        >
          {children}
        </LocaleflowProvider>
      </body>
    </html>
  );
}
```

### 3. Use Translations

Use the `useTranslation` hook in your components:

```tsx
// app/page.tsx
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('greeting', { name: 'World' })}</h1>
      <p>{t('items', { count: 5 })}</p>
    </div>
  );
}
```

### 4. Add Language Switching

Use the `LanguageSwitcher` component or build your own:

```tsx
'use client';

import { LanguageSwitcher } from '@localeflow/sdk-nextjs';

export function Header() {
  return (
    <header>
      <LanguageSwitcher
        labels={{
          en: 'English',
          de: 'Deutsch',
        }}
      />
    </header>
  );
}
```

Or create a custom switcher:

```tsx
'use client';

import { useLanguage } from '@localeflow/sdk-nextjs';

export function CustomLanguageSwitcher() {
  const { language, setLanguage, availableLanguages, isChanging } = useLanguage();

  return (
    <div>
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          disabled={isChanging || language === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

## Next Steps

- [Provider Configuration](./provider.md) - Learn about all provider options
- [Hooks Reference](./hooks.md) - Explore all available hooks
- [ICU MessageFormat](./icu-format.md) - Master pluralization and formatting
- [Server Components](./server-side.md) - Use translations in Server Components
- [Language Detection](./language-detection.md) - Configure automatic language detection
