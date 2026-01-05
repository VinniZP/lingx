---
description: Check i18n compliance in current git changes
allowed-tools: Bash(git:*), Read, Grep, Glob
---

Check the current git diff for i18n compliance issues in this Lingx project.

**Step 1: Get changed files**
Run: !`git diff --name-only HEAD`
Also check staged: !`git diff --cached --name-only`

**Step 2: For each changed .tsx/.ts file, analyze for:**

1. **Hardcoded strings** - Find user-facing text not wrapped in translation functions:
   - Button labels, form labels, error messages, tooltips
   - Toast notifications, modal titles, confirmation text
   - Placeholder text, helper text, validation messages
   - IGNORE: console.log, comments, CSS classes, URLs, technical identifiers, prop names

2. **Translation function patterns** - Verify correct usage:
   - `t('key')` - for static string literal keys
   - `td(dynamicKey)` - for dynamic keys from tKey()/tKeyUnsafe()
   - `tKey('key')` - type-safe key wrapper
   - `tKeyUnsafe('key')` - escape hatch for truly dynamic keys

3. **Dynamic key issues** - Find problematic patterns:
   - Variables passed directly to `t()` without `tKey()` wrapper
   - Template literals inside `t()` calls: `t(\`${var}.key\`)`
   - String concatenation: `t(prefix + '.key')`

**Step 3: If translation files (.json in locales/) were modified:**

- Validate JSON structure
- Check ICU MessageFormat syntax (plurals need `other` case, selects need valid keywords)
- Verify consistent key naming patterns

**Step 4: Generate report**

```markdown
## i18n Compliance Report

### Summary

- Files checked: X
- Issues found: X
- Severity: Low/Medium/High

### Hardcoded Strings

| File:Line | Text     | Suggested Key |
| --------- | -------- | ------------- |
| path:42   | "Submit" | common.submit |

### Translation Function Issues

| File:Line | Issue           | Fix                 |
| --------- | --------------- | ------------------- |
| path:15   | Variable in t() | Use td(tKey('...')) |

### ICU Syntax Issues

| File    | Key         | Issue                |
| ------- | ----------- | -------------------- |
| en.json | items.count | Missing 'other' case |

### Recommendations

1. [Specific actionable fixes]
```

**Knowledge - Lingx i18n patterns:**

- `const { t, td } = useTranslation()` or `useTranslation('namespace')`
- Keys follow format: `namespace.section.item` (e.g., `dashboard.activity.title`)
- ICU plural: `{count, plural, one {# item} other {# items}}`
- ICU select: `{gender, select, male {He} female {She} other {They}}`
