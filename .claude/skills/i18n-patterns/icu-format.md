# ICU MessageFormat

Lingx uses ICU MessageFormat for complex translations including plurals, selects, and formatting.

## Pluralization

### Basic Plural

```json
{
  "items": "{count, plural, one {# item} other {# items}}"
}
```

```tsx
t('items', { count: 1 }); // "1 item"
t('items', { count: 5 }); // "5 items"
t('items', { count: 0 }); // "0 items"
```

### With Zero Case

```json
{
  "notifications": "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}"
}
```

## Select (Gender, Type, Status)

### Basic Select

```json
{
  "userAction": "{action, select, create {created} update {updated} delete {deleted} other {modified}}"
}
```

```tsx
t('userAction', { action: 'create' }); // "created"
t('userAction', { action: 'update' }); // "updated"
```

### Status Select

```json
{
  "status": "{state, select, active {Active} inactive {Inactive} pending {Pending} other {Unknown}}"
}
```

## Variables

### Simple Variable

```json
{
  "greeting": "Hello, {name}!"
}
```

```tsx
t('greeting', { name: 'Alice' }); // "Hello, Alice!"
```

### Multiple Variables

```json
{
  "projectInfo": "{name} has {count, plural, one {# key} other {# keys}}"
}
```

```tsx
t('projectInfo', { name: 'My Project', count: 150 });
// "My Project has 150 keys"
```

## Nested Patterns

### Plural + Variable

```json
{
  "userItems": "{userName} has {count, plural, one {# item} other {# items}}"
}
```

### Select + Plural

```json
{
  "activityLog": "{actor} {action, select, create {created} delete {deleted} other {updated}} {count, plural, one {# item} other {# items}}"
}
```

## Common Patterns

### Empty States

```json
{
  "list": "{count, plural, =0 {No items yet} one {# item} other {# items}}"
}
```

### Conditional Text

Instead of ternary in code:

```tsx
// ❌ Bad
{
  isEnabled ? t('enabled') : t('disabled');
}

// ✅ Good - use ICU select
t('status', { state: isEnabled ? 'enabled' : 'disabled' });
```

```json
{
  "status": "{state, select, enabled {Enabled} disabled {Disabled} other {Unknown}}"
}
```

## Validation Rules

### Always Include `other`

```json
{
  "bad": "{type, select, a {A} b {B}}", // ❌ Missing other
  "good": "{type, select, a {A} b {B} other {?}}" // ✅ Has other
}
```

### Use Correct Plural Keywords

```json
{
  "bad": "{count, plural, 1 {one} many {many}}", // ❌ Wrong keywords
  "good": "{count, plural, one {#} other {#}}" // ✅ Correct keywords
}
```

**Valid plural keywords:** `zero`, `one`, `two`, `few`, `many`, `other`, `=N`

## Testing ICU

```bash
# Validate ICU syntax
npx lingx check --validate-icu

# Common errors:
# - Missing closing brace
# - Invalid plural keyword
# - Missing 'other' case
```
