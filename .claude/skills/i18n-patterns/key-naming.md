# Key Naming Conventions

Consistent key naming ensures maintainability and discoverability.

## File Structure

```
public/locales/
├── en.json                 # Root namespace (shared/common)
├── ru.json
├── dashboard/
│   ├── en.json             # Dashboard-specific
│   └── ru.json
├── settings/
│   ├── en.json             # Settings-specific
│   └── ru.json
└── projects/
    ├── en.json             # Projects-specific
    └── ru.json
```

## Key Format

Within a namespace file:

```
section.item
```

**Examples in `settings/en.json`:**

```json
{
  "title": "Settings",
  "security.title": "Security",
  "security.description": "Manage your security settings",
  "actions.save": "Save changes"
}
```

## Naming Rules

### 1. Use Lowercase

```json
{
  "settings": {}, // ✅ Good
  "Settings": {}, // ❌ Bad
  "SETTINGS": {} // ❌ Bad
}
```

### 2. Use Dots for Hierarchy

```json
{
  "security.title": "Security",
  "security.description": "...",
  "security.twoFactor.enable": "Enable 2FA"
}
```

### 3. Use camelCase for Multi-word

```json
{
  "twoFactor.enable": "Enable 2FA", // ✅ Good
  "two_factor.enable": "", // ❌ Bad (snake_case)
  "two-factor.enable": "" // ❌ Bad (kebab-case)
}
```

## Common Prefixes

| Prefix           | Usage                | Example                          |
| ---------------- | -------------------- | -------------------------------- |
| `title`          | Page/section titles  | `title`, `security.title`        |
| `description`    | Descriptive text     | `description`                    |
| `actions.*`      | Buttons, links       | `actions.save`, `actions.cancel` |
| `labels.*`       | Form labels          | `labels.email`                   |
| `placeholders.*` | Input placeholders   | `placeholders.search`            |
| `errors.*`       | Error messages       | `errors.required`                |
| `empty.*`        | Empty state text     | `empty.title`                    |
| `confirm.*`      | Confirmation dialogs | `confirm.delete.title`           |
| `toast.*`        | Toast notifications  | `toast.saved`                    |

## Namespace Organization

### Root (en.json)

Shared across all pages:

```json
{
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "nav.dashboard": "Dashboard",
  "nav.projects": "Projects",
  "nav.settings": "Settings",
  "errors.network": "Network error. Please try again."
}
```

### Feature Namespace (dashboard/en.json)

Feature-specific strings:

```json
{
  "title": "Dashboard",
  "description": "Overview of your projects",
  "stats.projects": "Projects",
  "stats.keys": "Keys",
  "stats.languages": "Languages",
  "activity.title": "Recent Activity",
  "activity.empty": "No recent activity"
}
```

## Choosing Namespace vs Root

| Put in Root (en.json)         | Put in Namespace                |
| ----------------------------- | ------------------------------- |
| Navigation labels             | Page titles                     |
| Common actions (save, cancel) | Page-specific content           |
| Shared error messages         | Feature-specific actions        |
| UI element labels             | Form labels specific to feature |

## Anti-patterns

### Don't Use Generic Keys

```json
{
  "button1": "Save", // ❌ Meaningless
  "text": "Welcome", // ❌ Too generic
  "message": "Success" // ❌ Ambiguous
}
```

### Don't Duplicate Across Namespaces

```json
// dashboard/en.json
{ "save": "Save" }          // ❌ Duplicate

// settings/en.json
{ "save": "Save" }          // ❌ Use root common.save
```

**Instead, use root namespace:**

```json
// en.json (root)
{ "common.save": "Save" }

// In component
const { t } = useTranslation();
t('common.save')
```
