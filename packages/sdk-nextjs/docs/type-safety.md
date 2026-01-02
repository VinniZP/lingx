# Type-Safe Translations

This guide covers compile-time type safety for translation keys and ICU parameters. Generate TypeScript types from your translation files for autocomplete, validation, and parameter type checking.

## Overview

```mermaid
flowchart LR
    subgraph CLI["Lingx CLI"]
        JSON["en.json"]
        Gen["lingx types"]
        DTS["lingx.d.ts"]
    end

    subgraph SDK["@lingx/sdk-nextjs"]
        TR["TranslationResources"]
        NK["NamespaceKeys"]
        TK["TranslationKeys"]
        TP["TranslationParams"]
    end

    subgraph App["Your Application"]
        Code["t('key', params)"]
        Check["TypeScript Check"]
    end

    JSON --> Gen
    Gen --> DTS
    DTS -->|"module augmentation"| TR
    DTS -->|"module augmentation"| NK
    TR --> TK
    TR --> TP
    NK --> TK
    TK --> Check
    TP --> Check
    Code --> Check

    style Gen fill:#10b981,color:#fff
    style DTS fill:#6366f1,color:#fff
    style Check fill:#f59e0b,color:#fff
```

### Benefits

- **Autocomplete**: See all available translation keys as you type
- **Compile-time validation**: TypeScript errors for invalid keys
- **Parameter type inference**: ICU syntax determines TypeScript types
- **JSDoc hover**: See translation text in your editor

## Quick Start

### 1. Configure Type Generation

Add the `types` section to your `lingx.config.ts`:

```typescript
// lingx.config.ts
export default {
  paths: {
    translations: './public/locales',
    source: './src',
  },
  types: {
    enabled: true,
    output: './src/lingx.d.ts',
    sourceLocale: 'en',
  },
};
```

### 2. Generate Types

Run the CLI command:

```bash
# Generate once
lingx types

# Watch mode - regenerate on file changes
lingx types --watch
```

Output:
```
✔ Generated types: 156 keys (23 with params)
  Output: src/lingx.d.ts
```

### 3. Use Type-Safe Translations

```tsx
import { useTranslation, tKey, type TKey } from '@lingx/sdk-nextjs';

function MyComponent() {
  const { t, td } = useTranslation();

  // Autocomplete shows all valid keys
  return (
    <div>
      <h1>{t('common.greeting', { name: 'World' })}</h1>
      {/* TypeScript error if key doesn't exist */}
      {/* TypeScript error if params are wrong type */}
    </div>
  );
}
```

---

## Configuration

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable type generation |
| `output` | `string` | `'./src/lingx.d.ts'` | Output path for generated types |
| `sourceLocale` | `string` | `'en'` | Which locale to use as source of truth |

### CLI Options

```bash
lingx types [options]

Options:
  -o, --output <file>   Output file path (overrides config)
  -l, --locale <code>   Source locale (overrides config)
  -w, --watch           Watch for changes and regenerate
```

### Auto-Generation

Types are automatically regenerated when you run:
- `lingx extract` - After extracting keys
- `lingx pull` - After pulling translations
- `lingx push` - After pushing translations
- `lingx sync` - After syncing

---

## Generated Types

### Example Output

Given this translation file:

```json
{
  "auth.login.title": "Sign In",
  "common.greeting": "Hello, {name}!",
  "common.items": "{count, plural, =0 {No items} one {1 item} other {{count} items}}"
}
```

The CLI generates:

```typescript
// lingx.d.ts (auto-generated)
import '@lingx/sdk-nextjs';

declare module '@lingx/sdk-nextjs' {
  interface TranslationResources {
    keys:
      | 'auth.login.title'
      | 'common.greeting'
      | 'common.items';
  }

  interface TranslationParams {
    /** Hello, {name}! */
    'common.greeting': { name: string | number };
    /** {count, plural, =0 {No items} one {1 item} other {{count} items}} */
    'common.items': { count: number };
  }
}
```

### Module Augmentation

The generated file uses TypeScript module augmentation to extend the SDK's types without modifying the package itself. The SDK defines base interfaces:

```typescript
// In @lingx/sdk-nextjs
export interface TranslationResources {
  // Empty by default - augmented by generated types
}

export type TranslationKeys = TranslationResources extends { keys: infer K }
  ? K extends string ? K : string
  : string;
```

When you generate types, they merge with these interfaces to enable strict typing.

---

## Namespace Types

When you organize translations into namespaces (subdirectories), the type generator creates separate types for each namespace.

### File Structure

```
public/locales/
├── en.json                    # Root translations
├── de.json
├── glossary/
│   ├── en.json                # Glossary namespace
│   └── de.json
└── auth/
    ├── en.json                # Auth namespace
    └── de.json
```

### Generated Namespace Types

With namespaces, the CLI generates a `NamespaceKeys` interface alongside `TranslationResources`:

```typescript
// lingx.d.ts (auto-generated)
declare module '@lingx/sdk-nextjs' {
  interface TranslationResources {
    keys: 'common.welcome' | 'nav.home' | 'nav.about';
  }

  interface NamespaceKeys {
    /** Keys in the 'glossary' namespace */
    glossary: 'tags.title' | 'tags.addTag' | 'dialog.title';
    /** Keys in the 'auth' namespace */
    auth: 'login.title' | 'login.submit' | 'register.title';
  }
}
```

### The `TNsKey<NS>` Type

Use `TNsKey<NS>` for type-safe keys scoped to a specific namespace:

```typescript
import { type TNsKey, tKey } from '@lingx/sdk-nextjs';

// Only accepts keys from the 'glossary' namespace
interface GlossaryOption {
  value: string;
  labelKey: TNsKey<'glossary'>;
}

const options: GlossaryOption[] = [
  { value: 'noun', labelKey: tKey('partOfSpeech.noun', 'glossary') },
  { value: 'verb', labelKey: tKey('partOfSpeech.verb', 'glossary') },
];
```

### `tKey()` with Namespace

The `tKey()` function accepts an optional second argument for namespaced keys:

```typescript
import { tKey } from '@lingx/sdk-nextjs';

// Root keys (no namespace)
tKey('nav.home');                     // ✓ Validates against TranslationKeys

// Namespaced keys (second argument)
tKey('tags.title', 'glossary');       // ✓ Validates against NamespaceKeys['glossary']
tKey('invalid.key', 'glossary');      // ✗ TypeScript error!
tKey('login.title', 'auth');          // ✓ Validates against NamespaceKeys['auth']
```

### Usage with `useTranslation()`

When you use `useTranslation()` with a namespace, the `t()` function only accepts keys valid for that namespace:

```tsx
'use client';

import { useTranslation, tKey, type TNsKey } from '@lingx/sdk-nextjs';

function GlossaryPage() {
  // Scoped to 'glossary' namespace
  const { t, td, ready } = useTranslation('glossary');

  // Show loading while namespace loads
  if (!ready) {
    return <LoadingSpinner />;
  }

  // t() only accepts glossary keys - TypeScript validates!
  return (
    <div>
      <h1>{t('dialog.title')}</h1>
      <p>{t('tags.description')}</p>
    </div>
  );
}

// Type-safe key storage for namespace
interface TagItem {
  id: string;
  labelKey: TNsKey<'glossary'>;
}

const tagItems: TagItem[] = [
  { id: '1', labelKey: tKey('tags.title', 'glossary') },
  { id: '2', labelKey: tKey('tags.addTag', 'glossary') },
];
```

> **Note**: The `ready` state becomes `false` while namespace translations are loading. Always check `ready` before rendering namespace-scoped content.

---

## ICU Parameter Types

The type generator infers TypeScript types from ICU MessageFormat syntax:

| ICU Syntax | Inferred Type | Example |
|------------|---------------|---------|
| `{name}` | `string \| number` | Simple placeholder |
| `{count, plural, ...}` | `number` | Pluralization |
| `{count, selectordinal, ...}` | `number` | Ordinal numbers |
| `{gender, select, ...}` | `string` | Selection |
| `{amount, number}` | `number` | Number formatting |
| `{date, date}` | `Date` | Date formatting |
| `{time, time}` | `Date` | Time formatting |

### Examples

```json
{
  "items": "{count, plural, one {# item} other {# items}}",
  "greeting": "Hello, {name}!",
  "formatted": "Price: {price, number, currency}"
}
```

Generated types:

```typescript
interface TranslationParams {
  'items': { count: number };           // plural → number
  'greeting': { name: string | number }; // simple → string | number
  'formatted': { price: number };        // number format → number
}
```

---

## Type-Safe Keys

### The `TKey` Type

`TKey` is a convenience alias for `TranslationKey<TranslationKeys>`:

```typescript
import { type TKey } from '@lingx/sdk-nextjs';

// Use in interfaces
interface NavItem {
  href: string;
  labelKey: TKey;
}

// Use in function signatures
function translateLabel(key: TKey): string {
  const { td } = useTranslation();
  return td(key);
}
```

### `tKey()` - Strict Keys

Use `tKey()` to create type-safe translation keys for extraction and storage:

```typescript
import { tKey, type TKey } from '@lingx/sdk-nextjs';

// Define keys in arrays/objects
const navItems = [
  { path: '/', labelKey: tKey('nav.home') },
  { path: '/about', labelKey: tKey('nav.about') },
  { path: '/contact', labelKey: tKey('nav.contact') },
];

// TypeScript validates the key exists
tKey('nav.home');       // OK
tKey('invalid.key');    // TypeScript error!
```

### `tKeyUnsafe()` - Escape Hatch

Use `tKeyUnsafe()` for dynamic keys that can't be validated at compile time:

```typescript
import { tKeyUnsafe } from '@lingx/sdk-nextjs';

// Dynamic key construction
const section = getSectionFromRoute(); // 'home' | 'about' | etc.
const key = tKeyUnsafe(`${section}.title`);

// Keys from external sources
const apiKey = response.translationKey;
const translatedKey = tKeyUnsafe(apiKey);
```

**Warning**: Keys passed to `tKeyUnsafe()` are not validated. Use `tKey()` whenever possible.

### `t()` vs `td()` Functions

| Function | Input | Use Case |
|----------|-------|----------|
| `t(key)` | String literal | Direct translation in JSX |
| `td(key)` | `TKey` (from `tKey()`) | Dynamic keys from variables |

```tsx
const { t, td } = useTranslation();

// t() - direct string literals
t('greeting', { name: 'World' });

// td() - keys from variables
const key = tKey('greeting');
td(key, { name: 'World' });

// Array of keys
const items = [
  { labelKey: tKey('nav.home') },
  { labelKey: tKey('nav.about') },
];
items.map(item => td(item.labelKey));
```

---

## Usage Patterns

### Component Props

```tsx
interface ButtonProps {
  labelKey: TKey;
  icon?: React.ReactNode;
}

function Button({ labelKey, icon }: ButtonProps) {
  const { td } = useTranslation();
  return (
    <button>
      {icon}
      {td(labelKey)}
    </button>
  );
}

// Usage
<Button labelKey={tKey('common.submit')} icon={<SendIcon />} />
```

### Configuration Objects

```tsx
import { tKey, type TKey } from '@lingx/sdk-nextjs';

interface MenuItem {
  href: string;
  labelKey: TKey;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', labelKey: tKey('nav.dashboard'), icon: LayoutDashboard },
  { href: '/projects', labelKey: tKey('nav.projects'), icon: FolderOpen },
  { href: '/settings', labelKey: tKey('nav.settings'), icon: Settings },
];
```

### Return Types with Keys

```tsx
import { type TKey, tKey } from '@lingx/sdk-nextjs';

interface DateInfo {
  type: 'relative' | 'absolute';
  key: TKey;
  value?: number;
}

function getDateInfo(date: Date): DateInfo {
  const diffDays = getDaysDiff(date);

  if (diffDays === 0) {
    return { type: 'relative', key: tKey('time.today') };
  }
  if (diffDays === 1) {
    return { type: 'relative', key: tKey('time.yesterday') };
  }
  return { type: 'relative', key: tKey('time.daysAgo'), value: diffDays };
}
```

### With ICU Parameters

```tsx
interface TranslationKeyObj {
  key: TKey;
  params?: Record<string, string | number>;
}

function getActivityMessage(activity: Activity): TranslationKeyObj {
  switch (activity.type) {
    case 'translation':
      return {
        key: tKey('activity.translation'),
        params: { count: activity.count },
      };
    case 'import':
      return {
        key: tKey('activity.import'),
        params: { fileName: activity.fileName },
      };
    default:
      return { key: tKey('activity.default') };
  }
}
```

---

## TypeScript Setup

### tsconfig.json

Ensure your `tsconfig.json` includes the generated types:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  },
  "include": [
    "src/**/*",
    "src/lingx.d.ts"
  ]
}
```

### Editor Support

For best autocomplete experience:

1. **VS Code**: Install the TypeScript extension
2. **WebStorm**: TypeScript support is built-in
3. **Restart**: After generating types, restart the TS server (`Cmd+Shift+P` → "TypeScript: Restart TS Server")

---

## Troubleshooting

### Types Not Working

1. **Check generated file exists**:
   ```bash
   cat src/lingx.d.ts
   ```

2. **Verify tsconfig includes the file**:
   ```json
   {
     "include": ["src/lingx.d.ts"]
   }
   ```

3. **Restart TypeScript server** in your editor

### "Module has no exported member"

If you see errors like `Module '@lingx/sdk-nextjs' has no exported member 'useTranslation'`:

- Ensure the generated file starts with `import '@lingx/sdk-nextjs';`
- Check the file uses `interface` declarations, not `export type`

### Keys Not Autocompleting

1. Run `lingx types` to regenerate
2. Check the source locale file exists
3. Verify the key exists in the source locale JSON

### Parameter Types Wrong

The ICU parser may not recognize custom formats. Check:
- ICU syntax is valid
- Parameter names match in the translation

---

## Related

- [Hooks Reference](./hooks.md) - Using `t()`, `td()`, and namespace loading
- [ICU MessageFormat](./icu-format.md) - Formatting syntax
- [Advanced Topics](./advanced.md) - Namespace internals and performance
