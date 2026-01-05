---
description: Prepare a release with changelog, checks, and version bump
argument-hint: <version-type> (patch|minor|major)
allowed-tools: Bash(pnpm:*, git:*, npx:*), Read, Grep, Glob
---

Prepare a release for Lingx with version bump: **$ARGUMENTS**

## Phase 1: Pre-Release Checks

Run all checks to ensure release readiness:

```bash
# 1. Ensure clean working directory
git status

# 2. Pull latest from main
git pull origin main

# 3. Run full test suite
pnpm test

# 4. Run type checking
pnpm typecheck

# 5. Run linting
pnpm lint

# 6. Build all packages
pnpm build
```

If any check fails, stop and report the issue.

## Phase 2: Sync Translations

Ensure all translations are synced:

```bash
# Pull latest translations
npx lingx pull

# Check for missing/unused keys
npx lingx check

# Push any local changes
npx lingx push
```

Report any translation coverage issues.

## Phase 3: Generate Changelog

Analyze commits since the last release:

```bash
# Get last release tag
git describe --tags --abbrev=0

# Get commits since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Categorize commits into:

- **Features** (`feat:`) - New functionality
- **Bug Fixes** (`fix:`) - Bug fixes
- **Breaking Changes** (`BREAKING CHANGE:` or `!:`) - Breaking changes
- **Other** - Refactoring, docs, chores

Generate changelog entry:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- Feature description (#PR)

### Fixed

- Bug fix description (#PR)

### Changed

- Change description (#PR)

### Breaking Changes

- Breaking change description (#PR)
```

## Phase 4: Version Bump

Use changesets for version management:

```bash
# Create changeset
pnpm changeset

# Or if version type is specified:
# For patch: pnpm changeset --empty (then edit)
```

Based on $ARGUMENTS:

- `patch` - Bug fixes, no new features (0.0.X)
- `minor` - New features, backwards compatible (0.X.0)
- `major` - Breaking changes (X.0.0)

## Phase 5: Create Release Summary

Generate a release summary:

```markdown
## Release Summary: vX.Y.Z

### Checklist

- [ ] All tests passing
- [ ] Type checking passing
- [ ] Linting passing
- [ ] Build successful
- [ ] Translations synced
- [ ] Changelog updated
- [ ] Version bumped

### Changes in this Release

- X features added
- Y bugs fixed
- Z breaking changes

### Changelog

[Generated changelog]

### Next Steps

1. Review changes
2. Run `pnpm changeset version` to apply version
3. Commit version bump
4. Create release PR or tag
```

## Phase 6: Final Output

Provide:

1. Pre-release check results (pass/fail for each)
2. Translation sync status
3. Changelog entry
4. Version bump status
5. Release summary
6. Recommended next steps

If any critical issues found, clearly list them and recommend fixes before proceeding with release.
