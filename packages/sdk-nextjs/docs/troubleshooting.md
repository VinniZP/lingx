# Troubleshooting

Common issues and solutions when using `@localeflow/sdk-nextjs`.

## Translations Not Loading

### Issue: Translations show as keys

**Symptoms:**
- UI shows `greeting` instead of "Hello, World!"
- Keys are displayed instead of translated text

**Solutions:**

1. **Check staticData is provided:**
```tsx
// Wrong
<LocaleflowProvider defaultLanguage="en">

// Correct
<LocaleflowProvider defaultLanguage="en" staticData={{ en, de }}>
```

2. **Verify translation key exists:**
```json
// en.json
{
  "greeting": "Hello, World!"  // Key must match
}
```

3. **Check for typos in key:**
```tsx
t('greting')   // Wrong - typo
t('greeting')  // Correct
```

4. **Namespace prefix:**
```tsx
const { t } = useTranslation('auth');
t('login.title')  // Looks up 'auth:login.title'
```

---

## Language Not Switching

### Issue: setLanguage() doesn't work

**Symptoms:**
- Clicking language switcher does nothing
- Language stays the same after `setLanguage()`

**Solutions:**

1. **Check availableLanguages includes the target:**
```tsx
<LocaleflowProvider
  defaultLanguage="en"
  staticData={{ en, de }}  // 'de' must be here
  availableLanguages={['en', 'de']}  // or here
>
```

2. **Await the setLanguage call:**
```tsx
// If you need to wait for completion
await setLanguage('de');
console.log('Now in German');
```

3. **Check if already changing:**
```tsx
const { isChanging, setLanguage } = useLanguage();

// Prevent duplicate calls
if (!isChanging) {
  setLanguage('de');
}
```

4. **With multi-language bundle, language switches instantly:**
```tsx
// Instant switching - no loading
staticData={{ en, de, es }}
```

---

## Server/Client Mismatch

### Issue: Hydration errors

**Symptoms:**
- Console shows "Text content did not match"
- Translations flicker on page load

**Solutions:**

1. **Use the same language on server and client:**
```tsx
// app/[lang]/layout.tsx
<LocaleflowProvider
  defaultLanguage={params.lang}  // Match route param
  staticData={{ en, de }}
>
```

2. **Disable detection for SSR:**
```tsx
<LocaleflowProvider
  defaultLanguage={params.lang}
  staticData={{ en, de }}
  detection={false}  // Use route param only
>
```

3. **Use getTranslations for Server Components:**
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

---

## ICU Format Errors

### Issue: ICU message not formatting correctly

**Symptoms:**
- Pluralization not working
- Shows raw ICU syntax like `{count, plural, ...}`

**Solutions:**

1. **Check ICU syntax:**
```json
// Wrong - missing closing brace
"{count, plural, one {# item} other {# items}"

// Correct
"{count, plural, one {# item} other {# items}}"
```

2. **Pass correct value types:**
```tsx
// Wrong - string instead of number
t('items', { count: '5' })

// Correct
t('items', { count: 5 })
```

3. **Check for nested braces:**
```json
// Note: value inside needs double braces
"{count, plural, one {1 item} other {{count} items}}"
```

4. **Escape literal braces:**
```json
// To show literal braces, use single quotes
"Use '{name}' in your code"
```

---

## Namespace Not Found

### Issue: Namespace translations missing

**Symptoms:**
- `useNamespace` shows `isLoaded: false`
- Namespaced translations return keys

**Solutions:**

1. **Check namespace is loaded:**
```tsx
const { isLoaded, loadNamespace } = useNamespace('checkout');

if (!isLoaded) {
  await loadNamespace();
}
```

2. **Use autoLoad option:**
```tsx
const { isLoaded } = useNamespace('checkout', { autoLoad: true });
```

3. **Verify namespace file exists:**
```
/public/locales/en/checkout.json  // For namespace 'checkout'
```

4. **Check namespace prefix in translations:**
```json
// checkout.json
{
  "title": "Checkout"  // Not "checkout:title"
}
```

---

## TypeScript Errors

### Issue: Type errors with translation keys

**Symptoms:**
- TypeScript complains about `t()` argument types
- `td()` rejects string literals

**Solutions:**

1. **Use `tKey()` for dynamic keys:**
```tsx
// Wrong
const keys = ['nav.home', 'nav.about'];
keys.map(key => td(key));  // Error: string not TranslationKey

// Correct
const keys = [tKey('nav.home'), tKey('nav.about')];
keys.map(key => td(key));  // OK
```

2. **Use `t()` for string literals:**
```tsx
// t() accepts string literals
t('greeting')  // OK

// td() only accepts TranslationKey
td(tKey('greeting'))  // OK
```

3. **Import types correctly:**
```tsx
import type { TranslationKey } from '@localeflow/sdk-nextjs';

const key: TranslationKey = tKey('some.key');
```

---

## Hook Errors

### Issue: "useLocaleflowContext must be used within LocaleflowProvider"

**Symptoms:**
- Runtime error when using hooks
- Component crashes on mount

**Solutions:**

1. **Wrap with provider:**
```tsx
// app/layout.tsx
<LocaleflowProvider defaultLanguage="en" staticData={{ en }}>
  {children}
</LocaleflowProvider>
```

2. **Check provider is at root:**
```tsx
// Wrong - provider inside the component using hooks
function App() {
  const { t } = useTranslation();  // Error!
  return (
    <LocaleflowProvider>
      ...
    </LocaleflowProvider>
  );
}

// Correct - provider wraps components using hooks
function App() {
  return (
    <LocaleflowProvider>
      <Content />  {/* useTranslation works here */}
    </LocaleflowProvider>
  );
}
```

3. **Check for Server Component:**
```tsx
// Hooks only work in Client Components
'use client';  // Add this directive

import { useTranslation } from '@localeflow/sdk-nextjs';
```

---

## API Loading Failures

### Issue: Translations fail to load from API

**Symptoms:**
- Console shows network errors
- Falls back to local files

**Solutions:**

1. **Check API configuration:**
```tsx
<LocaleflowProvider
  apiUrl="https://api.localeflow.dev"  // Must be valid URL
  project="my-project"                 // Required
  space="main"                         // Required
  environment="production"             // Required
>
```

2. **Configure fallback:**
```tsx
<LocaleflowProvider
  apiUrl="https://api.localeflow.dev"
  localePath="/locales"  // Fallback to local files
>
```

3. **Adjust retry settings:**
```tsx
<LocaleflowProvider
  retry={{
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
  }}
>
```

---

## Detection Not Working

### Issue: Language detection fails

**Symptoms:**
- Always uses default language
- Ignores browser preferences

**Solutions:**

1. **Check detection is enabled:**
```tsx
// Detection enabled by default
<LocaleflowProvider detection={{}}>

// Detection explicitly disabled
<LocaleflowProvider detection={false}>  // Won't detect
```

2. **Check detection order:**
```tsx
detection={{
  order: ['cookie', 'localStorage', 'navigator'],  // Check these
}}
```

3. **Verify availableLanguages:**
```tsx
// Detection only matches available languages
<LocaleflowProvider
  defaultLanguage="en"
  availableLanguages={['en', 'de', 'es']}  // Must include detected lang
>
```

4. **Debug detection:**
```tsx
import { LanguageDetectorService } from '@localeflow/sdk-nextjs';

const service = new LanguageDetectorService();
const detected = service.detect(['en', 'de'], 'en');
console.log('Detected:', detected);
```

---

## Common Mistakes

### 1. Forgetting 'use client' directive

```tsx
// Wrong - hooks in Server Component
import { useTranslation } from '@localeflow/sdk-nextjs';

export default function Page() {
  const { t } = useTranslation();  // Error!
}

// Correct
'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';

export default function Page() {
  const { t } = useTranslation();  // OK
}
```

### 2. Using hooks in Server Components

```tsx
// For Server Components, use getTranslations
import { getTranslations } from '@localeflow/sdk-nextjs/server';

export default async function Page({ params }) {
  const { t } = await getTranslations({ ... });
}
```

### 3. Not passing staticData on server

```tsx
// Wrong - no staticData
const { t } = await getTranslations();  // Error!

// Correct
const { t } = await getTranslations({
  staticData: { en, de },
  language: 'en',
});
```

---

## Getting Help

If you can't find a solution:

1. Check the [GitHub Issues](https://github.com/localeflow/sdk/issues)
2. Search for similar problems
3. Open a new issue with:
   - SDK version
   - Next.js version
   - Minimal reproduction
   - Error messages
