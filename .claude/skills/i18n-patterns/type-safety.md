# Type-Safe Translations

Lingx SDK provides full TypeScript support for translation keys.

## Type Generation

Generate types from translation files:

```bash
npx lingx types
```

This creates `src/lingx.d.ts` with union type of all valid keys.

## TKey Type

`TKey` is a branded string type representing valid translation keys:

```typescript
import type { TKey } from '@lingx/sdk-nextjs';

// Use in interfaces
interface MenuItem {
  href: string;
  labelKey: TKey; // Must be a valid translation key
}
```

## Translation Functions

### t() - Static Keys

For string literal keys only:

```tsx
const { t } = useTranslation();

t('common.save'); // ✅ Works
t('common.unknown'); // ❌ TypeScript error if key doesn't exist

const key = 'common.save';
t(key); // ❌ TypeScript error - must be literal
```

### td() - Dynamic Keys

For keys stored in variables:

```tsx
const { td } = useTranslation();

const menuItem = { labelKey: tKey('nav.home') };
td(menuItem.labelKey); // ✅ Works with TKey
```

### tKey() - Create Type-Safe Key

Creates a `TKey` from a string literal with validation:

```tsx
import { tKey } from '@lingx/sdk-nextjs';

const key = tKey('common.save'); // ✅ Returns TKey
const bad = tKey('unknown.key'); // ❌ TypeScript error
```

### tKeyUnsafe() - Escape Hatch

For truly dynamic keys without type checking:

```tsx
import { tKeyUnsafe } from '@lingx/sdk-nextjs';

// When key is computed at runtime
const section = getSectionName();
const key = tKeyUnsafe(`${section}.title`); // No type checking
td(key);
```

## Common Patterns

### Navigation Items

```tsx
import { tKey, type TKey } from '@lingx/sdk-nextjs';

interface NavItem {
  href: string;
  labelKey: TKey;
}

const navItems: NavItem[] = [
  { href: '/', labelKey: tKey('nav.dashboard') },
  { href: '/projects', labelKey: tKey('nav.projects') },
];

function Sidebar() {
  const { td } = useTranslation();

  return (
    <nav>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          {td(item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
```

### Dynamic Content

```tsx
// When key depends on runtime data
function StatusBadge({ status }: { status: string }) {
  const { td } = useTranslation();

  // Use tKeyUnsafe for runtime-computed keys
  const key = tKeyUnsafe(`status.${status}`);

  return <Badge>{td(key)}</Badge>;
}
```

## Best Practices

### Prefer tKey over tKeyUnsafe

```tsx
// ✅ Type-safe - caught at compile time
const items = [
  { key: tKey('nav.home') }, // Error if key doesn't exist
];

// ⚠️ Unchecked - only caught at runtime
const items = [
  { key: tKeyUnsafe('nav.hoem') }, // Typo not caught!
];
```

### Use TKey in Interfaces

```tsx
// ✅ Interface ensures only valid keys
interface Feature {
  titleKey: TKey;
}

// ❌ String allows any value
interface Feature {
  titleKey: string; // Could be anything
}
```

### Regenerate Types After Changes

```bash
# After modifying translation files
npx lingx pull
npx lingx types
```
