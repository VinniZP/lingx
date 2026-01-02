# Provider Configuration

The `LingxProvider` is the core component that wraps your application and provides translation context to all child components.

## Basic Usage

```tsx
import { LingxProvider } from '@lingx/sdk-nextjs';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

<LingxProvider
  defaultLanguage="en"
  staticData={{ en, de }}
>
  <App />
</LingxProvider>
```

## Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `defaultLanguage` | `string` | Yes | Default language code (e.g., `'en'`) |
| `children` | `ReactNode` | Yes | Your application components |
| `staticData` | `object` | No | Static translation data |
| `localePath` | `string` | No | Path to local JSON files (e.g., `'/locales'`) |
| `availableLanguages` | `string[]` | No | List of supported languages (auto-detected from `staticData`) |
| `fallbackLanguage` | `string` | No | Fallback when translation is missing (defaults to `defaultLanguage`) |
| `namespaces` | `string[]` | No | Namespaces to preload on init (see [Namespace Preloading](#with-namespace-preloading)) |
| `fallback` | `ReactNode` | No | Loading fallback UI |
| `apiUrl` | `string` | No | Lingx API URL |
| `project` | `string` | No | Project slug (required with API) |
| `space` | `string` | No | Space slug (required with API) |
| `environment` | `string` | No | Environment slug (required with API) |
| `retry` | `object` | No | Retry configuration for API failures |
| `detection` | `object \| false` | No | Language detection config (see [Language Detection](./language-detection.md)) |

## Loading Strategies

### Static Data (Recommended)

Best for performance and SSG/SSR. Translations are bundled with your app.

**Single-language bundle:**
```tsx
import en from '@/locales/en.json';

<LingxProvider
  defaultLanguage="en"
  staticData={en}
  localePath="/locales"  // For other languages
  availableLanguages={['en', 'de', 'es']}
>
```

**Multi-language bundle (recommended):**
```tsx
import en from '@/locales/en.json';
import de from '@/locales/de.json';
import es from '@/locales/es.json';

<LingxProvider
  defaultLanguage="en"
  staticData={{ en, de, es }}
>
```

With multi-language bundles:
- Available languages are auto-detected
- Language switching is instant (no network requests)
- Works offline

### Local JSON Fallback

Load translations from local JSON files at runtime:

```tsx
<LingxProvider
  defaultLanguage="en"
  localePath="/locales"
  availableLanguages={['en', 'de', 'es']}
>
```

Files should be at `/public/locales/{lang}.json`.

### API with Fallback (Hybrid)

Try Lingx API first, fall back to local files:

```tsx
<LingxProvider
  defaultLanguage="en"
  apiUrl="https://api.lingx.io"
  project="my-project"
  space="main"
  environment="production"
  localePath="/locales"  // Fallback
  retry={{
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  }}
>
```

Loading priority:
1. API (with retry and exponential backoff)
2. Local JSON files (if API fails)
3. Error (if both fail)

```mermaid
flowchart TD
    A[Start] --> B{staticData<br/>provided?}
    B -->|Yes| C[Use static data<br/>instantly]
    B -->|No| D{API configured?}
    D -->|Yes| E[Fetch from API]
    E --> F{Success?}
    F -->|Yes| G[Use API data]
    F -->|No| H{Retry?}
    H -->|Yes| I[Wait with backoff]
    I --> E
    H -->|No| J{localePath<br/>configured?}
    D -->|No| J
    J -->|Yes| K[Fetch local JSON]
    K --> L{Success?}
    L -->|Yes| M[Use local data]
    L -->|No| N[Error state]
    J -->|No| N

    C --> O[Ready]
    G --> O
    M --> O
    N --> O

    style C fill:#10b981,color:#fff
    style G fill:#10b981,color:#fff
    style M fill:#10b981,color:#fff
    style N fill:#ef4444,color:#fff
```

## Loading Fallback

Show a loading UI while translations load:

```tsx
<LingxProvider
  defaultLanguage="en"
  apiUrl="https://api.lingx.io"
  fallback={<LoadingSpinner />}
>
```

Note: With `staticData`, the fallback is not shown because translations are immediately available.

## Non-Blocking Initialization

The provider is designed for instant rendering:

- `ready` is always `true` (never blocks rendering)
- With `staticData`: translations available immediately
- Without `staticData`: loads asynchronously in background
- Components can render immediately and update when translations load

```tsx
const { t, ready } = useTranslation();

// ready is always true - safe to render immediately
return <h1>{t('title')}</h1>;
```

## Retry Configuration

Configure retry behavior for API failures:

```tsx
<LingxProvider
  retry={{
    maxAttempts: 3,      // Number of retries (default: 3)
    baseDelay: 1000,     // Initial delay in ms (default: 1000)
    maxDelay: 10000,     // Maximum delay in ms (default: 10000)
  }}
>
```

Uses exponential backoff: 1s → 2s → 4s → ... → maxDelay

## Fallback Language

When a translation key is missing in the current language, the SDK automatically falls back to the default language. This is useful when translations are incomplete.

```tsx
<LingxProvider
  defaultLanguage="en"
  fallbackLanguage="en"  // Optional - defaults to defaultLanguage
  staticData={{ en, de }}
  availableLanguages={['en', 'de', 'ru', 'uk']}
>
```

**How it works:**

1. User switches to Russian (`ru`)
2. For key `greeting` with Russian translation → shows Russian
3. For key `dashboard.title` missing in Russian → shows English (fallback)
4. For key missing in both → shows the raw key

**With namespaces:**

Fallback also works with namespace translations. When loading a namespace, the SDK loads both the current language and fallback language translations.

```tsx
const { t } = useTranslation('settings');

// If 'settings:account.title' is missing in Russian,
// shows English translation from the settings namespace
t('account.title');
```

**Best practices:**

- Always keep your default language (usually English) complete
- Use fallback for languages with incomplete translations
- Incomplete translations show fallback instead of raw keys

## TypeScript

The provider props are fully typed:

```tsx
import type { LingxProviderProps } from '@lingx/sdk-nextjs';

const config: LingxProviderProps = {
  defaultLanguage: 'en',
  staticData: { en, de },
  children: <App />,
};
```

## Examples

### Next.js App Router with i18n Routing

```tsx
// app/[lang]/layout.tsx
import { LingxProvider } from '@lingx/sdk-nextjs';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

const translations = { en, de };

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  return (
    <LingxProvider
      defaultLanguage={params.lang}
      staticData={translations}
    >
      {children}
    </LingxProvider>
  );
}

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'de' }];
}
```

### With Namespace Preloading

The `namespaces` prop preloads specified namespaces when the provider initializes:

```tsx
<LingxProvider
  defaultLanguage="en"
  staticData={{ en, de }}
  namespaces={['common', 'auth']}  // Preload these namespaces
>
```

**When to preload namespaces:**

- **Critical UI**: Preload namespaces used on every page (e.g., `common`, `nav`)
- **SSR/SSG**: Ensure namespace translations are available during server render
- **Landing pages**: Preload namespaces needed for above-the-fold content

**How it works:**

1. Provider initializes with root translations from `staticData`
2. Specified namespaces are loaded immediately (parallel requests)
3. Components using `useTranslation('namespace')` check if already loaded
4. If preloaded, `ready` is immediately `true`; otherwise, auto-loads on mount

```tsx
// With preloading: 'common' is ready immediately
const { t, ready } = useTranslation('common');
// ready = true (preloaded)

// Without preloading: 'checkout' loads on mount
const { t, ready } = useTranslation('checkout');
// ready = false → true (after load)
```

**Namespace file structure:**

When using namespaces, organize translation files in subdirectories:

```
public/locales/
├── en.json                    # Root translations
├── de.json
├── common/
│   ├── en.json                # Common namespace
│   └── de.json
└── auth/
    ├── en.json                # Auth namespace
    └── de.json
```

See [Type-Safe Translations](./type-safety.md#namespace-types) for namespace type generation and [Hooks Reference](./hooks.md#with-namespace) for usage patterns.

## Related

- [Getting Started](./getting-started.md)
- [Language Detection](./language-detection.md)
- [Server-Side Usage](./server-side.md)
