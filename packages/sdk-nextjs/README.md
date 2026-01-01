# @localeflow/sdk-nextjs

Modern i18n SDK for Next.js 15+ and React 19+ with full ICU MessageFormat support.

## Features

- **Non-blocking initialization** - Never blocks rendering, instant TTI
- **ICU MessageFormat** - Full support for plurals, numbers, dates, selects
- **Server Components** - Native RSC and App Router support
- **Multi-language bundles** - Instant language switching without network requests
- **9 language detectors** - Cookie, localStorage, navigator, path, query string, and more
- **Namespace lazy-loading** - Code-split translations by route/feature
- **TypeScript-first** - Full type definitions and branded translation keys

## Installation

```bash
pnpm add @localeflow/sdk-nextjs
# or
npm install @localeflow/sdk-nextjs
```

**Peer dependencies:** React 19+, Next.js 15+

## Quick Start

### 1. Create translation files

```json
// locales/en.json
{
  "greeting": "Hello, {name}!",
  "items": "{count, plural, =0 {No items} one {1 item} other {{count} items}}"
}
```

### 2. Add the provider

```tsx
// app/layout.tsx
import { LocaleflowProvider } from '@localeflow/sdk-nextjs';
import en from './locales/en.json';
import de from './locales/de.json';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleflowProvider defaultLanguage="en" staticData={{ en, de }}>
          {children}
        </LocaleflowProvider>
      </body>
    </html>
  );
}
```

### 3. Use translations

```tsx
// app/page.tsx
'use client';

import { useTranslation, useLanguage, LanguageSwitcher } from '@localeflow/sdk-nextjs';

export default function Page() {
  const { t } = useTranslation();

  return (
    <div>
      <LanguageSwitcher labels={{ en: 'English', de: 'Deutsch' }} />
      <h1>{t('greeting', { name: 'World' })}</h1>
      <p>{t('items', { count: 5 })}</p>
    </div>
  );
}
```

### 4. Server Components

```tsx
// app/[lang]/page.tsx
import { getTranslations } from '@localeflow/sdk-nextjs/server';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

export default async function Page({ params }: { params: { lang: string } }) {
  const { t } = await getTranslations({
    staticData: { en, de },
    language: params.lang,
  });

  return <h1>{t('greeting', { name: 'World' })}</h1>;
}
```

## API at a Glance

### Hooks

| Hook | Description |
|------|-------------|
| `useTranslation(ns?)` | Translate strings with `t()` and `td()` |
| `useLanguage()` | Language switching with `setLanguage()` |
| `useNamespace(ns, opts)` | Lazy-load translation namespaces |
| `useLocaleflow()` | Full context access |

### Components

| Component | Description |
|-----------|-------------|
| `LocaleflowProvider` | Root provider with configuration |
| `LanguageSwitcher` | Drop-in language selector |

### Server Utilities

| Function | Description |
|----------|-------------|
| `getTranslations(opts)` | Translations for Server Components |
| `getAvailableLanguages(data)` | Get languages for `generateStaticParams` |

### Utilities

| Utility | Description |
|---------|-------------|
| `tKey(key)` | Mark keys for static extraction |

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | Installation and basic setup |
| [Provider Configuration](./docs/provider.md) | All provider options and loading strategies |
| [Hooks Reference](./docs/hooks.md) | Complete hooks API |
| [Components](./docs/components.md) | Built-in and custom components |
| [ICU MessageFormat](./docs/icu-format.md) | Plurals, numbers, dates, selects |
| [Language Detection](./docs/language-detection.md) | 9 built-in detectors and custom detectors |
| [Server-Side Usage](./docs/server-side.md) | RSC, App Router, and SSG |
| [Advanced Topics](./docs/advanced.md) | Caching, performance, TypeScript |
| [Comparison](./docs/comparison.md) | vs i18next and react-intl |
| [Troubleshooting](./docs/troubleshooting.md) | Common issues and solutions |

## ICU MessageFormat Examples

```tsx
// Simple interpolation
t('greeting', { name: 'World' })  // "Hello, World!"

// Pluralization
t('items', { count: 5 })  // "5 items"

// Number formatting
t('price', { amount: 99.99 })  // "$99.99"

// Date formatting
t('updated', { date: new Date() })  // "Dec 28, 2025"

// Select
t('pronoun', { gender: 'female' })  // "She"
```

## TypeScript

```tsx
import type {
  LocaleflowProviderProps,
  UseTranslationReturn,
  UseLanguageReturn,
  TranslationKey,
} from '@localeflow/sdk-nextjs';

import { tKey } from '@localeflow/sdk-nextjs';

// Type-safe dynamic keys
const keys = [tKey('nav.home'), tKey('nav.about')];
const { td } = useTranslation();
keys.map(key => td(key));  // Type-safe!
```

## License

MIT
