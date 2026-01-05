---
description: Run all pre-PR checks before creating a pull request
allowed-tools: Bash(pnpm:*, git:*, npx:*), Read, Grep, Glob
---

Run comprehensive validation before creating a pull request for this Lingx project.

**Phase 1: Code Quality**

1. Run TypeScript check:

   ```bash
   pnpm typecheck
   ```

2. Run linting:

   ```bash
   pnpm lint
   ```

3. Run formatting check:
   ```bash
   pnpm format:check
   ```

**Phase 2: Tests**

4. Run test suite:
   ```bash
   pnpm test
   ```

**Phase 3: i18n Compliance**

5. Check translation coverage:

   ```bash
   # If lingx CLI available
   npx lingx check
   ```

6. Scan changed files for hardcoded strings:
   - Get changed files: `git diff --name-only origin/main...HEAD`
   - For each .tsx/.ts file, check for user-facing strings not using t()/td()

7. Validate ICU syntax in any modified translation files

**Phase 4: Dead Code**

8. Run Knip for dead code detection (non-blocking):
   ```bash
   pnpm knip
   ```

**Phase 5: Build Verification**

9. Verify build succeeds:
   ```bash
   pnpm build
   ```

**Generate Summary Report**

```markdown
## Pre-PR Check Report

### Results

| Check         | Status | Details                 |
| ------------- | ------ | ----------------------- |
| TypeScript    | ✅/❌  | X errors                |
| Lint          | ✅/❌  | X warnings              |
| Format        | ✅/❌  | X files need formatting |
| Tests         | ✅/❌  | X passed, Y failed      |
| i18n Coverage | ✅/❌  | X missing, Y unused     |
| ICU Syntax    | ✅/❌  | X issues                |
| Dead Code     | ⚠️/✅  | X unused exports        |
| Build         | ✅/❌  | Success/Failed          |

### Blocking Issues

[List any issues that must be fixed before PR]

### Warnings

[List non-blocking issues to consider]

### Ready for PR: Yes/No
```

**If any blocking issues found:**

- Provide specific file:line references
- Suggest fixes where possible
- Prioritize issues by severity
