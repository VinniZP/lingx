# Getting Started

This guide walks you through setting up `@lingx/sdk-nextjs` in your Next.js application.

## Prerequisites

- **Next.js 15+** with App Router
- **React 19+**
- **Node.js 18+**

## Installation

```bash
# Using pnpm (recommended)
pnpm add @lingx/sdk-nextjs

# Using npm
npm install @lingx/sdk-nextjs

# Using yarn
yarn add @lingx/sdk-nextjs
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

Wrap your application with `LingxProvider` in your root layout:

```tsx
// app/layout.tsx
import { LingxProvider } from '@lingx/sdk-nextjs';
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
        <LingxProvider
          defaultLanguage="en"
          staticData={{ en, de }}
        >
          {children}
        </LingxProvider>
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

import { useTranslation } from '@lingx/sdk-nextjs';

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

### 4. Generate Types (Optional)

For TypeScript autocomplete and validation, generate types from your translations:

```bash
# Create lingx.config.ts first, then run:
lingx types
```

This creates a `.d.ts` file that provides autocomplete for translation keys and validates ICU parameters. See [Type-Safe Translations](./type-safety.md) for setup details.

### 5. Organize with Namespaces (Optional)

For larger applications, organize translations into namespaces using subdirectories:

```
app/
├── locales/
│   ├── en.json              # Root translations
│   ├── de.json
│   ├── glossary/
│   │   ├── en.json          # Glossary namespace
│   │   └── de.json
│   └── auth/
│       ├── en.json          # Auth namespace
│       └── de.json
├── layout.tsx
└── page.tsx
```

Use `useTranslation()` with the namespace name:

```tsx
'use client';

import { useTranslation } from '@lingx/sdk-nextjs';

function GlossaryPage() {
  const { t, ready } = useTranslation('glossary');

  // Wait for namespace to load
  if (!ready) return <LoadingSpinner />;

  return <h1>{t('dialog.title')}</h1>;
}
```

See [Type-Safe Translations](./type-safety.md#namespace-types) for advanced namespace patterns with TypeScript.

### 6. Add Language Switching

Use the `LanguageSwitcher` component or build your own:

```tsx
'use client';

import { LanguageSwitcher } from '@lingx/sdk-nextjs';

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

import { useLanguage } from '@lingx/sdk-nextjs';

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

- [Type-Safe Translations](./type-safety.md) - Generate types for autocomplete, validation, and namespaces
- [Provider Configuration](./provider.md) - Learn about all provider options
- [Hooks Reference](./hooks.md) - Explore all available hooks including namespace loading
- [ICU MessageFormat](./icu-format.md) - Master pluralization and formatting
- [Server Components](./server-side.md) - Use translations in Server Components
- [Language Detection](./language-detection.md) - Configure automatic language detection
