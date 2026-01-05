---
name: i18n-patterns
description: Internationalization patterns for Lingx. Type-safe translations with Lingx SDK, ICU MessageFormat, key naming conventions, and extraction. Use when adding translations, reviewing i18n code, or troubleshooting translation issues.
---

# Lingx i18n Patterns

Type-safe internationalization patterns using the Lingx SDK.

## Quick Reference

```tsx
import { useTranslation, tKey, tKeyUnsafe, type TKey } from '@lingx/sdk-nextjs';

// In component
const { t, td } = useTranslation('namespace');

t('key.path')                     // Static key
td(tKey('key.path'))              // Dynamic key, type-safe
td(tKeyUnsafe(`${var}.title`))    // Dynamic key, escape hatch
```

## File Organization

```
apps/web/public/locales/
├── en.json                 # Root namespace (common strings)
├── ru.json
├── dashboard/              # Dashboard namespace
│   ├── en.json
│   └── ru.json
├── settings/               # Settings namespace
│   ├── en.json
│   └── ru.json
├── projects/               # Projects namespace
│   ├── en.json
│   └── ru.json
└── workbench/              # Workbench namespace
    ├── en.json
    └── ru.json
```

## Documentation

| Document                         | Purpose                    |
| -------------------------------- | -------------------------- |
| [key-naming.md](key-naming.md)   | Key naming conventions     |
| [type-safety.md](type-safety.md) | TKey, tKey(), tKeyUnsafe() |
| [icu-format.md](icu-format.md)   | ICU MessageFormat patterns |
| [extraction.md](extraction.md)   | Key extraction and CLI     |

## Core Concepts

### Translation Functions

| Function            | Use Case                       | Type Safety |
| ------------------- | ------------------------------ | ----------- |
| `t('key')`          | Static string literal keys     | Full        |
| `td(dynamicKey)`    | Dynamic keys from variables    | Via tKey    |
| `tKey('key')`       | Create type-safe key reference | Full        |
| `tKeyUnsafe('key')` | Escape hatch for dynamic keys  | None        |

### Namespace Usage

```tsx
// Using namespace - looks in [namespace]/en.json
const { t } = useTranslation('settings');
t('title'); // Looks for "title" in settings/en.json

// Root namespace - looks in en.json
const { t } = useTranslation();
t('common.save'); // Looks for "common.save" in en.json
```

### Basic Usage

```tsx
'use client';

import { useTranslation } from '@lingx/sdk-nextjs';

export function SettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
      <button>{t('actions.save')}</button>
    </div>
  );
}
```

### With Dynamic Keys

```tsx
import { useTranslation, tKey, type TKey } from '@lingx/sdk-nextjs';

interface NavItem {
  href: string;
  labelKey: TKey; // Type-safe key reference
}

const navItems: NavItem[] = [
  { href: '/', labelKey: tKey('nav.home') },
  { href: '/projects', labelKey: tKey('nav.projects') },
];

function Nav() {
  const { td } = useTranslation();

  return (
    <nav>
      {navItems.map((item) => (
        <a key={item.href} href={item.href}>
          {td(item.labelKey)} {/* Use td() for dynamic keys */}
        </a>
      ))}
    </nav>
  );
}
```

## Decision Tree

```
What translation function to use?

Is the key a string literal in code?
  └─ YES → Use t('key')
  └─ NO → Is the key from a typed variable/prop?
            └─ YES → Use td(tKey('key')) or td(prop.labelKey)
            └─ NO → Use td(tKeyUnsafe(dynamicKey))

---

Where to put the key?

Is it used across multiple pages/namespaces?
  └─ YES → Root en.json (common.*)

Is it specific to one feature/page?
  └─ YES → [namespace]/en.json
```

## Best Practices

### DO

```tsx
// ✅ Use namespace in useTranslation
const { t } = useTranslation('settings');
t('security.title');

// ✅ Use tKey for typed dynamic keys
const items = [{ labelKey: tKey('nav.home') }];

// ✅ Use ICU for plurals
t('items.count', { count: 5 });
// "items.count": "{count, plural, one {# item} other {# items}}"
```

### DON'T

```tsx
// ❌ Don't use variables directly in t()
t(variableName); // No type checking!

// ❌ Don't concatenate keys
t('section.' + name); // No type checking!

// ❌ Don't use template literals in t()
t(`${section}.title`); // No type checking!
```

## Common Patterns

### Conditional Text with ICU Select

```tsx
// Translation file
{
  "status": "{state, select, enabled {Enabled} disabled {Disabled} other {Unknown}}"
}

// Usage
t('status', { state: isEnabled ? 'enabled' : 'disabled' })
```

### Pluralization

```json
{
  "items": "{count, plural, one {# item} other {# items}}"
}
```

```tsx
t('items', { count: 1 }); // "1 item"
t('items', { count: 5 }); // "5 items"
```

### With Variables

```json
{
  "greeting": "Hello, {name}!"
}
```

```tsx
t('greeting', { name: user.name });
```
