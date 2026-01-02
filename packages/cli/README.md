# Lingx CLI

Command-line tool for managing Lingx translations in your development workflow.

## Installation

```bash
npm install -g @lingx/cli
# or
pnpm add -g @lingx/cli
# or use npx
npx @lingx/cli
```

## Configuration

Create `.lingx.yml` in your project root:

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
lingx auth login

# Login with API key directly
lingx auth login --key=lf_your_api_key_here

# Check authentication status
lingx auth status

# Logout (remove stored credentials)
lingx auth logout
```

Credentials are stored in `~/.lingx/credentials.json`.

### Pull Translations

Download translations from the platform to local files.

```bash
# Pull all translations for configured branch
lingx pull

# Pull specific language only
lingx pull --lang=en

# Pull to custom directory
lingx pull --output=./translations

# Pull in YAML format (override config)
lingx pull --format=yaml

# Override project/space/branch
lingx pull --project=my-app --space=frontend --branch=feature-x
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
lingx push

# Push from custom directory
lingx push --source=./translations

# Override project/space/branch
lingx push --project=my-app --space=frontend --branch=feature-x
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
lingx sync

# Detect conflicts without modifying
lingx sync --dry-run

# Force overwrite (use with caution)
lingx sync --force
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
lingx extract --format=nextjs

# Extract keys from Angular project
lingx extract --format=angular

# Custom source directory
lingx extract --source=./src

# Detect ICU MessageFormat variables in code
lingx extract --detect-icu

# Save results to file
lingx extract --output=extracted-keys.json
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
lingx check --missing

# Check for unused keys (in platform but not code)
lingx check --unused

# Validate ICU MessageFormat syntax
lingx check --validate-icu

# All checks at once
lingx check --missing --unused --validate-icu

# Override configuration
lingx check --project=my-app --space=frontend --branch=main
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
lingx branch create feature-checkout --from=main

# Create from current branch (as specified in config)
lingx branch create hotfix-typo
```

**Options:**
| Option | Description |
|--------|-------------|
| `--from <branch>` | Source branch to copy from |

#### List Branches

```bash
# List all branches in configured space
lingx branch list

# Verbose output with key counts
lingx branch list -v
```

#### Show Diff

```bash
# Compare two branches
lingx branch diff feature-checkout main

# Compare with current branch (from config)
lingx branch diff feature-checkout
```

Output shows:
- Added keys (new in source branch)
- Modified keys (value changed)
- Deleted keys (removed in source branch)

#### Merge Branch

```bash
# Merge feature branch into main
lingx branch merge feature-checkout --into=main

# Interactive merge (resolve conflicts one by one)
lingx branch merge feature-checkout --into=main --interactive

# Dry run (show what would be merged)
lingx branch merge feature-checkout --into=main --dry-run
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
        run: npm install -g @lingx/cli

      - name: Check translations
        run: |
          lingx auth login --key=${{ secrets.LINGX_API_KEY }}
          lingx check --missing --unused
          lingx check --validate-icu
        env:
          LINGX_API_KEY: ${{ secrets.LINGX_API_KEY }}
```

### GitLab CI

```yaml
check-translations:
  image: node:20
  stage: test
  script:
    - npm install -g @lingx/cli
    - lingx auth login --key=$LINGX_API_KEY
    - lingx check --missing --unused
    - lingx check --validate-icu
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npx @lingx/cli check --missing --validate-icu
```

## Troubleshooting

### "Not authenticated" error

Run `lingx auth login` with your API key. Check that the API key is valid and not revoked.

### "Project not found" error

Verify your `.lingx.yml` project slug matches your project in Lingx.

### "Space not found" error

Check that the space exists in your project and the slug is correct.

### "Branch not found" error

The branch may not exist. Use `lingx branch list` to see available branches.

### ICU validation errors

Run `lingx check --validate-icu` to see detailed error messages with locations.

Common ICU issues:
- Unbalanced braces: `{count, plural, one {1 item} other {{count items}}`
- Invalid plural keywords: `{count, plural, 1 {one} other {many}}` (use `=1` instead of `1`)
- Unclosed select: `{gender, select, male {He}` (missing `other` case)

### Connection refused

1. Check that the Lingx API is running
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
| `LINGX_API_KEY` | API key (alternative to auth login) |
| `LINGX_API_URL` | API URL (overrides config) |

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
git clone https://github.com/your-org/lingx.git
cd lingx

# Install dependencies
pnpm install

# Build CLI
pnpm --filter=@lingx/cli build

# Run locally
node packages/cli/dist/index.js --help

# Run tests
pnpm --filter=@lingx/cli test
```
