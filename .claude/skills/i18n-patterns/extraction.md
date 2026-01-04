# Key Extraction

The Lingx CLI extracts translation keys from source code.

## Basic Usage

```bash
# Extract keys from source
npx lingx extract

# With options
npx lingx extract --sync      # Sync to locale files
npx lingx extract --clean     # Remove unused keys
npx lingx extract --detect-icu # Detect ICU variables
```

## What Gets Extracted

### t() Calls

```tsx
t('key.path'); // ✅ Extracted
t('key.path', { n: 1 }); // ✅ Extracted with params
```

### tKey() Calls

```tsx
tKey('nav.home'); // ✅ Extracted
```

### useTranslation Namespace

```tsx
const { t } = useTranslation('settings');
t('title'); // ✅ Extracted to settings namespace
```

## What Doesn't Get Extracted

### Variables in t()

```tsx
const key = 'some.key';
t(key); // ❌ Cannot extract - dynamic
```

### Template Literals

```tsx
t(`${section}.title`); // ❌ Cannot extract - dynamic
```

## CLI Commands

### Check Coverage

```bash
npx lingx check

# Output:
# Missing keys (in code but not translations):
#   - dashboard.newFeature.title
#
# Unused keys (in translations but not code):
#   - old.feature.description
```

### Validate ICU Syntax

```bash
npx lingx check --validate-icu
```

### Sync Keys

```bash
# Add missing keys to locale files
npx lingx extract --sync

# Remove unused keys
npx lingx extract --clean
```

## Workflow

### During Development

```bash
# 1. Write code with new translation keys
t('newFeature.title')

# 2. Extract and sync
npx lingx extract --sync

# 3. Add translations to locale files
# 4. Regenerate types
npx lingx types
```

### Before PR

```bash
npx lingx check
npx lingx check --validate-icu
```

## Handling Dynamic Keys

When you need truly dynamic keys:

```tsx
// Option 1: Known set with tKey
const STATUS_KEYS = {
  active: tKey('status.active'),
  inactive: tKey('status.inactive'),
} as const;

td(STATUS_KEYS[status]);

// Option 2: Runtime keys with tKeyUnsafe
td(tKeyUnsafe(`status.${status}`));
```

## Common Issues

### "Dynamic key detected"

**Fix:** Use `tKey()` or `tKeyUnsafe()`:

```tsx
// Known keys
const keys = { active: tKey('status.active') };
td(keys[status]);

// Runtime keys
td(tKeyUnsafe(`status.${status}`));
```
