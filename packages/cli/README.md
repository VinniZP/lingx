# Localeflow CLI

Command-line tool for managing Localeflow translations in your development workflow.

## Installation

```bash
npm install -g @localeflow/cli
# or
pnpm add -g @localeflow/cli
# or use npx
npx @localeflow/cli
```

## Configuration

Create `.localeflow.yml` in your project root:

```yaml
# API connection
apiUrl: http://localhost:3001

# Project configuration
project: my-project-slug
defaultSpace: frontend
defaultBranch: main

# File paths
paths:
  translations: ./src/locales
  source: ./src

# Output format
format:
  type: json  # or yaml
  nested: true
  indentation: 2

# Pull settings
pull:
  languages: []  # Empty means all languages
  filePattern: "{lang}.json"

# Push settings
push:
  languages: []
  filePattern: "{lang}.json"

# Extract settings
extract:
  framework: nextjs  # or angular
  patterns:
    - "**/*.tsx"
    - "**/*.ts"
  exclude:
    - "**/node_modules/**"
    - "**/*.test.*"
    - "**/*.spec.*"
  functions:
    - t
    - useTranslation
```

## Commands

### Authentication

```bash
# Login with API key (interactive prompt)
lf auth login

# Login with API key directly
lf auth login --key=lf_your_api_key_here

# Check authentication status
lf auth status

# Logout (remove stored credentials)
lf auth logout
```

Credentials are stored in `~/.localeflow/credentials.json`.

### Pull Translations

Download translations from the platform to local files.

```bash
# Pull all translations for configured branch
lf pull

# Pull specific language only
lf pull --lang=en

# Pull to custom directory
lf pull --output=./translations

# Pull in YAML format (override config)
lf pull --format=yaml

# Override project/space/branch
lf pull --project=my-app --space=frontend --branch=feature-x
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--project <slug>` | `-p` | Project slug |
| `--space <slug>` | `-s` | Space slug |
| `--branch <name>` | `-b` | Branch name |
| `--format <type>` | `-f` | Output format: json or yaml |
| `--output <dir>` | `-o` | Output directory |
| `--lang <code>` | `-l` | Language code (default: all) |

### Push Translations

Upload local translations to the platform.

```bash
# Push all translations to configured branch
lf push

# Push from custom directory
lf push --source=./translations

# Override project/space/branch
lf push --project=my-app --space=frontend --branch=feature-x
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--project <slug>` | `-p` | Project slug |
| `--space <slug>` | `-s` | Space slug |
| `--branch <name>` | `-b` | Branch name |
| `--source <dir>` | | Source directory |

### Sync Translations

Bidirectional sync between local files and platform.

```bash
# Sync translations (pull + push)
lf sync

# Detect conflicts without modifying
lf sync --dry-run

# Force overwrite (use with caution)
lf sync --force
```

**Options:**
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without applying |
| `--force` | Overwrite without conflict resolution |

### Extract Keys

Extract translation keys from source code.

```bash
# Extract keys from Next.js project
lf extract --format=nextjs

# Extract keys from Angular project
lf extract --format=angular

# Custom source directory
lf extract --source=./src

# Detect ICU MessageFormat variables in code
lf extract --detect-icu

# Save results to file
lf extract --output=extracted-keys.json
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--source <dir>` | `-s` | Source directory to scan |
| `--format <type>` | `-f` | Framework: nextjs or angular |
| `--output <file>` | `-o` | Output file for extracted keys (JSON) |
| `--detect-icu` | | Detect ICU MessageFormat variables |

**Supported patterns:**
- Next.js: `t('key')`, `useTranslation()`, custom functions
- Angular: `{{ 'key' | translate }}`, `TranslateService.get('key')`

### Check Translations

Validate translation coverage and ICU syntax.

```bash
# Check for missing keys (in code but not platform)
lf check --missing

# Check for unused keys (in platform but not code)
lf check --unused

# Validate ICU MessageFormat syntax
lf check --validate-icu

# All checks at once
lf check --missing --unused --validate-icu

# Override configuration
lf check --project=my-app --space=frontend --branch=main
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--project <slug>` | `-p` | Project slug |
| `--space <slug>` | `-S` | Space slug |
| `--branch <name>` | `-b` | Branch name |
| `--source <dir>` | `-s` | Source directory |
| `--missing` | | Show keys in code but not in platform |
| `--unused` | | Show keys in platform but not in code |
| `--validate-icu` | | Validate ICU MessageFormat syntax |

**Default behavior:** If no check options are specified, `--missing` and `--unused` are run by default.

### Branch Operations

Manage translation branches from the command line.

#### Create Branch

```bash
# Create new branch from main
lf branch create feature-checkout --from=main

# Create from current branch (as specified in config)
lf branch create hotfix-typo
```

**Options:**
| Option | Description |
|--------|-------------|
| `--from <branch>` | Source branch to copy from |

#### List Branches

```bash
# List all branches in configured space
lf branch list

# Verbose output with key counts
lf branch list -v
```

#### Show Diff

```bash
# Compare two branches
lf branch diff feature-checkout main

# Compare with current branch (from config)
lf branch diff feature-checkout
```

Output shows:
- Added keys (new in source branch)
- Modified keys (value changed)
- Deleted keys (removed in source branch)

#### Merge Branch

```bash
# Merge feature branch into main
lf branch merge feature-checkout --into=main

# Interactive merge (resolve conflicts one by one)
lf branch merge feature-checkout --into=main --interactive

# Dry run (show what would be merged)
lf branch merge feature-checkout --into=main --dry-run
```

**Options:**
| Option | Description |
|--------|-------------|
| `--into <branch>` | Target branch to merge into |
| `--interactive` | Resolve conflicts interactively |
| `--dry-run` | Preview merge without applying |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Missing or unused keys found (check command) |
| 3 | ICU validation errors found |
| 4 | Merge conflicts detected |

## CI/CD Integration

### GitHub Actions

```yaml
name: Translation Check

on: [push, pull_request]

jobs:
  check-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install CLI
        run: npm install -g @localeflow/cli

      - name: Check translations
        run: |
          lf auth login --key=${{ secrets.LOCALEFLOW_API_KEY }}
          lf check --missing --unused
          lf check --validate-icu
        env:
          LOCALEFLOW_API_KEY: ${{ secrets.LOCALEFLOW_API_KEY }}
```

### GitLab CI

```yaml
check-translations:
  image: node:20
  stage: test
  script:
    - npm install -g @localeflow/cli
    - lf auth login --key=$LOCALEFLOW_API_KEY
    - lf check --missing --unused
    - lf check --validate-icu
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npx @localeflow/cli check --missing --validate-icu
```

## Troubleshooting

### "Not authenticated" error

Run `lf auth login` with your API key. Check that the API key is valid and not revoked.

### "Project not found" error

Verify your `.localeflow.yml` project slug matches your project in Localeflow.

### "Space not found" error

Check that the space exists in your project and the slug is correct.

### "Branch not found" error

The branch may not exist. Use `lf branch list` to see available branches.

### ICU validation errors

Run `lf check --validate-icu` to see detailed error messages with locations.

Common ICU issues:
- Unbalanced braces: `{count, plural, one {1 item} other {{count items}}`
- Invalid plural keywords: `{count, plural, 1 {one} other {many}}` (use `=1` instead of `1`)
- Unclosed select: `{gender, select, male {He}` (missing `other` case)

### Connection refused

1. Check that the Localeflow API is running
2. Verify the `apiUrl` in your config
3. Check for firewall or network issues

### Slow extraction

For large codebases:
1. Narrow down `extract.patterns` to specific directories
2. Add more exclusions to `extract.exclude`
3. Split extraction by module/feature

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LOCALEFLOW_API_KEY` | API key (alternative to auth login) |
| `LOCALEFLOW_API_URL` | API URL (overrides config) |

## File Format Examples

### JSON (flat)

```json
{
  "button.submit": "Submit",
  "button.cancel": "Cancel",
  "welcome.title": "Welcome"
}
```

### JSON (nested)

```json
{
  "button": {
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "welcome": {
    "title": "Welcome"
  }
}
```

### YAML

```yaml
button:
  submit: Submit
  cancel: Cancel
welcome:
  title: Welcome
```

## Development

```bash
# Clone the monorepo
git clone https://github.com/your-org/localeflow.git
cd localeflow

# Install dependencies
pnpm install

# Build CLI
pnpm --filter=@localeflow/cli build

# Run locally
node packages/cli/dist/index.js --help

# Run tests
pnpm --filter=@localeflow/cli test
```
