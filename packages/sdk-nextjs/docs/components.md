# Components

The SDK provides ready-to-use React components for common i18n UI patterns.

## LanguageSwitcher

A drop-in language selector component that renders as a `<select>` element.

### Basic Usage

```tsx
'use client';

import { LanguageSwitcher } from '@localeflow/sdk-nextjs';

function Header() {
  return (
    <header>
      <nav>...</nav>
      <LanguageSwitcher />
    </header>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | CSS class for the select element |
| `labels` | `Record<string, string>` | - | Display labels for language codes |
| `onChange` | `(lang: string) => void` | - | Callback after language changes |

### With Custom Labels

```tsx
<LanguageSwitcher
  labels={{
    en: 'English',
    de: 'Deutsch',
    es: 'Espanol',
    uk: 'Українська',
    ja: '日本語',
  }}
/>
```

Without labels, language codes are displayed in uppercase (e.g., "EN", "DE").

### With Styling

```tsx
// With Tailwind CSS
<LanguageSwitcher
  className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
/>

// With CSS modules
import styles from './Header.module.css';
<LanguageSwitcher className={styles.languageSelect} />
```

### With onChange Callback

```tsx
<LanguageSwitcher
  onChange={(lang) => {
    console.log('Language changed to:', lang);
    // Analytics, URL update, etc.
  }}
/>
```

### Accessibility

The component includes:
- `aria-label="Select language"` for screen readers
- `disabled` state during language switching

---

## Building Custom Components

For more control, build custom components using the hooks.

### Custom Language Switcher (Buttons)

```tsx
'use client';

import { useLanguage } from '@localeflow/sdk-nextjs';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Espanol',
};

export function LanguageButtons() {
  const { language, setLanguage, availableLanguages, isChanging } = useLanguage();

  return (
    <div className="flex gap-2">
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          disabled={isChanging}
          className={`px-3 py-1 rounded ${
            language === lang
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

### Custom Dropdown with Flags

```tsx
'use client';

import { useState } from 'react';
import { useLanguage } from '@localeflow/sdk-nextjs';

const LANGUAGES = {
  en: { label: 'English', flag: '🇺🇸' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  es: { label: 'Espanol', flag: '🇪🇸' },
  ja: { label: '日本語', flag: '🇯🇵' },
};

export function FlagDropdown() {
  const { language, setLanguage, availableLanguages, isChanging } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const current = LANGUAGES[language as keyof typeof LANGUAGES];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg"
      >
        <span>{current?.flag}</span>
        <span>{current?.label}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-lg">
          {availableLanguages.map((lang) => {
            const info = LANGUAGES[lang as keyof typeof LANGUAGES];
            return (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100"
              >
                <span>{info?.flag}</span>
                <span>{info?.label || lang}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### Loading State Component

```tsx
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export function TranslatedContent({ translationKey }: { translationKey: string }) {
  const { t, error } = useTranslation();

  if (error) {
    return <span className="text-red-500">Translation error</span>;
  }

  return <span>{t(translationKey)}</span>;
}
```

### Namespace Loader Component

```tsx
'use client';

import { useNamespace } from '@localeflow/sdk-nextjs';

interface NamespaceLoaderProps {
  namespace: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function NamespaceLoader({
  namespace,
  fallback = <div>Loading...</div>,
  children,
}: NamespaceLoaderProps) {
  const { isLoaded, isLoading } = useNamespace(namespace, { autoLoad: true });

  if (isLoading) return <>{fallback}</>;
  if (!isLoaded) return <>{fallback}</>;

  return <>{children}</>;
}

// Usage
<NamespaceLoader namespace="checkout" fallback={<Spinner />}>
  <CheckoutForm />
</NamespaceLoader>
```

## Related

- [Hooks Reference](./hooks.md) - All available hooks
- [Getting Started](./getting-started.md) - Basic setup
