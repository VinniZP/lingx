# Comparison with Other Libraries

This guide compares `@localeflow/sdk-nextjs` with popular i18n libraries to help you understand the differences and make an informed choice.

## Quick Comparison

| Feature | LocaleFlow SDK | i18next | react-intl |
|---------|---------------|---------|------------|
| Setup complexity | Minimal | Moderate | Moderate |
| ICU MessageFormat | Full | Plugin | Full |
| React Server Components | Native | Limited | Limited |
| Non-blocking init | Default | Configurable | Configurable |
| Multi-language bundle | Native | Possible | Possible |
| Language detection | Built-in (9 detectors) | Plugin | Manual |
| Bundle size | ~15KB | ~30KB+ | ~25KB |
| TypeScript | First-class | Good | Good |

## vs i18next / react-i18next

### Simpler Setup

**i18next** requires initialization and configuration:

```tsx
// i18next setup
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });
```

**LocaleFlow SDK** works with just a provider:

```tsx
// LocaleFlow setup
import { LocaleflowProvider } from '@localeflow/sdk-nextjs';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

<LocaleflowProvider defaultLanguage="en" staticData={{ en, de }}>
  <App />
</LocaleflowProvider>
```

### Non-Blocking by Default

**i18next** can block rendering while loading:

```tsx
// i18next - may show loading state
const { t, ready } = useTranslation();
if (!ready) return <Loading />;
```

**LocaleFlow SDK** never blocks:

```tsx
// LocaleFlow - always renders immediately
const { t, ready } = useTranslation();
// ready is always true
return <h1>{t('title')}</h1>;
```

### Built-in Server Components

**i18next** requires workarounds for React Server Components.

**LocaleFlow SDK** has native RSC support:

```tsx
// Server Component
import { getTranslations } from '@localeflow/sdk-nextjs/server';

export default async function Page({ params }) {
  const { t } = await getTranslations({
    staticData: { en, de },
    language: params.lang,
  });

  return <h1>{t('title')}</h1>;
}
```

### Multi-Language Bundles

**i18next** loads languages on demand by default.

**LocaleFlow SDK** supports bundled multi-language data for instant switching:

```tsx
// All languages available immediately
<LocaleflowProvider
  defaultLanguage="en"
  staticData={{ en, de, es, fr }}
>
```

### ICU Format

**i18next** requires the `i18next-icu` plugin for full ICU support.

**LocaleFlow SDK** includes ICU MessageFormat natively:

```tsx
// Works out of the box
t('items', { count: 5 })  // "{count, plural, one {# item} other {# items}}"
```

---

## vs react-intl (FormatJS)

### Easier Setup

**react-intl** requires more boilerplate:

```tsx
// react-intl setup
import { IntlProvider, FormattedMessage } from 'react-intl';
import enMessages from '@/locales/en.json';

<IntlProvider locale="en" messages={enMessages}>
  <App />
</IntlProvider>

// Usage
<FormattedMessage id="greeting" values={{ name: 'World' }} />
```

**LocaleFlow SDK** is more concise:

```tsx
// LocaleFlow setup
<LocaleflowProvider defaultLanguage="en" staticData={{ en, de }}>
  <App />
</LocaleflowProvider>

// Usage
const { t } = useTranslation();
t('greeting', { name: 'World' })
```

### Simpler API

**react-intl** uses component-based API:

```tsx
import { FormattedMessage, FormattedNumber, FormattedDate } from 'react-intl';

<FormattedMessage id="greeting" values={{ name: 'World' }} />
<FormattedNumber value={1000} style="currency" currency="USD" />
<FormattedDate value={new Date()} />
```

**LocaleFlow SDK** uses a function-based API:

```tsx
const { t } = useTranslation();

t('greeting', { name: 'World' })
t('price', { amount: 1000 })  // ICU: {amount, number, ::currency/USD}
t('date', { date: new Date() })  // ICU: {date, date, medium}
```

### Same ICU Support

Both libraries fully support ICU MessageFormat:
- Pluralization
- Select (gender, categories)
- Number formatting
- Date/time formatting

### Better DX

**LocaleFlow SDK** provides:
- `tKey()` for static extraction
- `td()` for type-safe dynamic keys
- Built-in language detection (9 strategies)
- Built-in LanguageSwitcher component

---

## When to Use LocaleFlow SDK

Choose **LocaleFlow SDK** if you:

- Want minimal configuration
- Use Next.js App Router with Server Components
- Need instant language switching
- Prefer non-blocking initialization
- Want built-in language detection
- Value smaller bundle size

## When to Consider Alternatives

Consider **i18next** if you:

- Need extensive plugin ecosystem
- Have existing i18next infrastructure
- Need features like context, pluralization rules customization

Consider **react-intl** if you:

- Need CLDR-based formatting
- Want component-based API
- Are already using FormatJS ecosystem

---

## Migration from i18next

```tsx
// Before (i18next)
import { useTranslation } from 'react-i18next';

function Component() {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <h1>{t('title')}</h1>
      <button onClick={() => i18n.changeLanguage('de')}>DE</button>
    </div>
  );
}

// After (LocaleFlow)
import { useTranslation, useLanguage } from '@localeflow/sdk-nextjs';

function Component() {
  const { t } = useTranslation();
  const { setLanguage } = useLanguage();
  return (
    <div>
      <h1>{t('title')}</h1>
      <button onClick={() => setLanguage('de')}>DE</button>
    </div>
  );
}
```

## Migration from react-intl

```tsx
// Before (react-intl)
import { FormattedMessage, useIntl } from 'react-intl';

function Component() {
  const intl = useIntl();
  return (
    <div>
      <FormattedMessage id="title" />
      <p>{intl.formatMessage({ id: 'greeting' }, { name: 'World' })}</p>
    </div>
  );
}

// After (LocaleFlow)
import { useTranslation } from '@localeflow/sdk-nextjs';

function Component() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('greeting', { name: 'World' })}</p>
    </div>
  );
}
```
