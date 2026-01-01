# ICU MessageFormat

The SDK supports [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) for advanced formatting including pluralization, gender selection, and locale-aware number/date formatting.

## Simple Interpolation

Basic variable substitution with `{name}` syntax:

```json
{
  "greeting": "Hello, {name}!",
  "welcome": "Welcome to {appName}, {userName}!"
}
```

```tsx
t('greeting', { name: 'World' })
// → "Hello, World!"

t('welcome', { appName: 'LocaleFlow', userName: 'John' })
// → "Welcome to LocaleFlow, John!"
```

## Pluralization

Handle singular, plural, and special cases with the `plural` function:

```json
{
  "items": "{count, plural, =0 {No items} one {1 item} other {{count} items}}",
  "messages": "{count, plural, =0 {No new messages} one {# new message} other {# new messages}}"
}
```

```tsx
t('items', { count: 0 })   // → "No items"
t('items', { count: 1 })   // → "1 item"
t('items', { count: 5 })   // → "5 items"

t('messages', { count: 1 })  // → "1 new message"
t('messages', { count: 42 }) // → "42 new messages"
```

### Plural Categories

| Category | Description | Example Languages |
|----------|-------------|-------------------|
| `zero` | Zero items | Arabic, Latvian |
| `one` | Singular | English, German, Spanish |
| `two` | Dual | Arabic, Hebrew, Slovenian |
| `few` | Few (2-4) | Polish, Russian, Czech |
| `many` | Many (5+) | Polish, Russian, Arabic |
| `other` | Default fallback | All languages |

### Exact Matches

Use `=N` for exact number matches:

```json
{
  "cartItems": "{count, plural, =0 {Cart is empty} =1 {1 item in cart} =2 {A pair of items} other {{count} items in cart}}"
}
```

### The `#` Symbol

Use `#` as a placeholder for the count value:

```json
{
  "notifications": "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}"
}
```

## Select (Categories)

Choose between options based on a value:

```json
{
  "pronoun": "{gender, select, male {He} female {She} other {They}}",
  "status": "{status, select, active {Active} pending {Pending} inactive {Inactive} other {Unknown}}"
}
```

```tsx
t('pronoun', { gender: 'female' })  // → "She"
t('pronoun', { gender: 'other' })   // → "They"

t('status', { status: 'active' })   // → "Active"
t('status', { status: 'archived' }) // → "Unknown"
```

### Combining with Text

```json
{
  "userAction": "{gender, select, male {He} female {She} other {They}} updated {gender, select, male {his} female {her} other {their}} profile."
}
```

## Ordinal Numbers

Position/ranking with `selectordinal`:

```json
{
  "place": "You finished in {position, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} place!",
  "floor": "Take the elevator to the {floor, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} floor."
}
```

```tsx
t('place', { position: 1 })   // → "You finished in 1st place!"
t('place', { position: 2 })   // → "You finished in 2nd place!"
t('place', { position: 3 })   // → "You finished in 3rd place!"
t('place', { position: 4 })   // → "You finished in 4th place!"
t('place', { position: 21 })  // → "You finished in 21st place!"
```

## Number Formatting

Locale-aware number formatting:

```json
{
  "price": "Price: {amount, number, ::currency/USD}",
  "percent": "Discount: {value, number, ::percent}",
  "compact": "Views: {count, number, ::compact-short}"
}
```

```tsx
// In English (en-US)
t('price', { amount: 1234.56 })    // → "Price: $1,234.56"
t('percent', { value: 0.25 })       // → "Discount: 25%"
t('compact', { count: 1500000 })    // → "Views: 1.5M"

// In German (de-DE)
t('price', { amount: 1234.56 })    // → "Price: 1.234,56 $"
```

### Number Skeletons

| Skeleton | Description | Example |
|----------|-------------|---------|
| `::currency/USD` | Currency format | $1,234.56 |
| `::currency/EUR` | Euro format | €1.234,56 |
| `::percent` | Percentage | 25% |
| `::compact-short` | Compact (short) | 1.5M |
| `::compact-long` | Compact (long) | 1.5 million |
| `::precision-integer` | Integer only | 1,235 |
| `::sign-always` | Always show sign | +42 |

## Date Formatting

Locale-aware date formatting:

```json
{
  "created": "Created: {date, date, medium}",
  "updated": "Last updated {date, date, long}",
  "short": "Date: {date, date, short}"
}
```

```tsx
const today = new Date('2025-12-28');

// In English
t('created', { date: today })  // → "Created: Dec 28, 2025"
t('updated', { date: today })  // → "Last updated December 28, 2025"
t('short', { date: today })    // → "Date: 12/28/25"

// In German
t('created', { date: today })  // → "Created: 28.12.2025"
```

### Date Styles

| Style | Example (en-US) |
|-------|-----------------|
| `short` | 12/28/25 |
| `medium` | Dec 28, 2025 |
| `long` | December 28, 2025 |
| `full` | Saturday, December 28, 2025 |

## Time Formatting

```json
{
  "meeting": "Meeting at {time, time, short}",
  "event": "Event starts at {time, time, medium}"
}
```

```tsx
const time = new Date('2025-12-28T14:30:00');

// In English (en-US)
t('meeting', { time })  // → "Meeting at 2:30 PM"

// In German (de-DE)
t('meeting', { time })  // → "Meeting at 14:30"
```

## Nested Patterns

Combine multiple patterns:

```json
{
  "orderStatus": "{gender, select, male {He} female {She} other {They}} ordered {count, plural, one {# item} other {# items}} on {date, date, medium}."
}
```

```tsx
t('orderStatus', {
  gender: 'female',
  count: 3,
  date: new Date('2025-12-28')
})
// → "She ordered 3 items on Dec 28, 2025."
```

## Escaping Braces

To include literal braces, use single quotes:

```json
{
  "code": "Use '{name}' as the variable name.",
  "json": "Format: '{ \"key\": \"value\" }'"
}
```

```tsx
t('code')  // → "Use {name} as the variable name."
```

## Performance

The SDK optimizes ICU formatting:

1. **Fast path detection**: Simple `{name}` placeholders bypass the full ICU parser
2. **AST caching**: Parsed ICU messages are cached (up to 500 by default)
3. **LRU eviction**: Cache uses least-recently-used eviction when full
4. **Cache clearing**: Cache clears on language change

```tsx
// Fast path - no ICU parsing needed
t('greeting', { name: 'World' })  // Simple placeholder

// Full ICU parsing (cached after first use)
t('items', { count: 5 })  // Plural pattern
```

## Best Practices

### Do

```json
{
  "items": "{count, plural, one {# item} other {# items}}",
  "greeting": "Hello, {name}!"
}
```

### Don't

```tsx
// Don't concatenate translations
t('hello') + ' ' + t('world')  // Bad

// Use single translation with variables
t('helloWorld')  // Good

// Don't use numbers directly in keys
t(`step${stepNumber}`)  // Bad - not extractable

// Use ICU select or separate keys
t('step', { number: stepNumber })  // Good
```

## Related

- [Hooks Reference](./hooks.md) - Using `t()` and `td()`
- [Advanced](./advanced.md) - Caching and performance
- [ICU Syntax Spec](https://unicode-org.github.io/icu/userguide/format_parse/messages/) - Full ICU documentation
