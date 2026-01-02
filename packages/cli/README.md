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

## Quick Start

```bash
# Initialize a new project
lingx init

# Login with your API key
lingx auth login

# Pull translations from the platform
lingx pull

# Generate TypeScript types for type-safe translations
lingx types

# Push local changes back to the platform
lingx push
```

## Configuration

Create `lingx.config.ts` in your project root (recommended):

```typescript
import type { LingxConfig } from '@lingx/cli';

const config: LingxConfig = {
  api: {
    url: 'http://localhost:3001',
  },
  project: 'my-project-slug',
  defaultSpace: 'frontend',
  defaultBranch: 'main',
  format: {
    type: 'json',
    nested: true,
    indentation: 2,
  },
  paths: {
    translations: './locales',
    source: './src',
  },
  pull: {
    languages: [],
    filePattern: '{lang}.json',
  },
  push: {
    filePattern: '{lang}.json',
  },
  extract: {
    framework: 'nextjs',
    patterns: ['./src/**/*.tsx', './src/**/*.ts'],
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    functions: ['t', 'useTranslation'],
    markerFunctions: ['tKey'],
  },
  types: {
    enabled: true,
    output: './src/lingx.d.ts',
    sourceLocale: 'en',
  },
};

export default config;
```

Or use `.lingx.yml` (YAML format):

```yaml
api:
  url: http://localhost:3001

project: my-project-slug
defaultSpace: frontend
defaultBranch: main

paths:
  translations: ./src/locales
  source: ./src

format:
  type: json
  nested: true
  indentation: 2

pull:
  languages: []
  filePattern: "{lang}.json"

push:
  filePattern: "{lang}.json"

extract:
  framework: nextjs
  patterns:
    - "**/*.tsx"
    - "**/*.ts"
  exclude:
    - "**/node_modules/**"
    - "**/*.test.*"
  functions:
    - t
    - useTranslation

types:
  enabled: true
  output: ./src/lingx.d.ts
  sourceLocale: en
```

## Commands

### Initialize Project

Create a new Lingx configuration file interactively.

```bash
# Interactive setup
lingx init

# Non-interactive with defaults
lingx init -y

# With options
lingx init --project=my-app --space=frontend --format=json
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip prompts, use defaults |
| `--project <slug>` | `-p` | Project slug |
| `--space <name>` | `-s` | Default space |
| `--api-url <url>` | | API URL |
| `--format <type>` | | Translation format: json or yaml |
| `--framework <name>` | | Framework: nextjs, angular, or none |

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
- Next.js: `t('key')`, `useTranslation()`, `tKey('key')` (marker function)
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

# Run quality checks (placeholders, whitespace)
lingx check --quality

# All checks at once
lingx check --missing --unused --validate-icu --quality

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
| `--quality` | | Run quality checks on translations |

**Default behavior:** If no check options are specified, `--missing` and `--unused` are run by default.

### Generate TypeScript Types

Generate type definitions for type-safe translations.

```bash
# Generate types from translation files
lingx types

# Custom output path
lingx types --output=./types/translations.d.ts

# Use specific source locale
lingx types --locale=en

# Watch mode - regenerate on changes
lingx types --watch
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--output <file>` | `-o` | Output file path (overrides config) |
| `--locale <code>` | `-l` | Source locale to use (overrides config) |
| `--watch` | `-w` | Watch for changes and regenerate |

The generated types enable:
- Autocomplete for all translation keys
- Compile-time validation of keys
- ICU parameter type inference

### Key Management

Manage individual translation keys from the command line.

#### Add a Key

```bash
# Add a new key with a default value
lingx key add "button.submit" --value="Submit"

# Add with namespace
lingx key add "submit" --namespace=button --value="Submit"

# Add with language-specific values
lingx key add "greeting" --en="Hello" --de="Hallo" --fr="Bonjour"

# Add and push to API
lingx key add "button.cancel" --value="Cancel" --push
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--namespace <ns>` | `-n` | Namespace for the key |
| `--value <text>` | `-v` | Default value for all languages |
| `--<lang> <text>` | | Language-specific value (e.g., --en, --de) |
| `--push` | | Push to remote API |
| `--project <slug>` | `-p` | Project slug (for --push) |
| `--space <slug>` | `-s` | Space slug (for --push) |
| `--branch <name>` | `-b` | Branch name (for --push) |

#### Remove a Key

```bash
# Remove a key (with confirmation)
lingx key remove "button.submit"

# Remove with namespace
lingx key remove "submit" --namespace=button

# Force remove without confirmation
lingx key remove "old.key" --force

# Remove and delete from API
lingx key remove "button.submit" --push
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--namespace <ns>` | `-n` | Namespace for the key |
| `--force` | `-f` | Skip confirmation prompt |
| `--push` | | Delete from remote API |
| `--project <slug>` | `-p` | Project slug (for --push) |
| `--space <slug>` | `-s` | Space slug (for --push) |
| `--branch <name>` | `-b` | Branch name (for --push) |

#### Move/Rename a Key

```bash
# Rename a key
lingx key move "old.key" "new.key"

# Move to a different namespace
lingx key move "button.submit" "actions:submit"

# Move from namespace to root
lingx key move "button:submit" "submitButton"

# Move and update API
lingx key move "old.key" "new.key" --push
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--force` | `-f` | Skip confirmation prompt |
| `--push` | | Push changes to remote API |
| `--project <slug>` | `-p` | Project slug (for --push) |
| `--space <slug>` | `-s` | Space slug (for --push) |
| `--branch <name>` | `-b` | Branch name (for --push) |

### Branch Operations

Manage translation branches from the command line.

#### List Branches

```bash
# List all branches in configured space
lingx branch list

# Verbose output with key counts
lingx branch list -v
```

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

### Context Sync

Sync translation key context and relationships to the platform.

```bash
# Sync context from source code
lingx context

# Dry run (preview what would be synced)
lingx context --dry-run

# Trigger semantic relationship analysis
lingx context --semantic

# Set minimum similarity for semantic matches
lingx context --semantic --min-similarity=0.8
```

**Options:**
| Option | Short | Description |
|--------|-------|-------------|
| `--project <slug>` | `-p` | Project slug |
| `--space <slug>` | `-s` | Space slug |
| `--branch <name>` | `-b` | Branch name |
| `--source <dir>` | `-S` | Source directory |
| `--dry-run` | | Preview changes without syncing |
| `--semantic` | | Trigger semantic relationship analysis |
| `--min-similarity <value>` | | Minimum similarity (0.5-1.0, default: 0.7) |

This command extracts:
- Source file locations for each key
- Line numbers where keys are used
- React component context (if applicable)

### MCP Server (AI Integration)

Start an MCP (Model Context Protocol) server for AI assistant integration.

```bash
lingx mcp
```

This starts a server that integrates with AI assistants like Claude, Cursor, and others that support MCP. The server provides tools for:

- **Core Operations**: status, config, pull, push, sync, extract, check, types
- **Key Management**: add, remove, move keys
- **Branch Operations**: list, create, diff, merge branches
- **Search**: search keys by pattern, search translations by value, find similar keys
- **AI Assistance**: analyze conflicts, suggest key names, check quality issues, validate ICU

#### Claude Desktop Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lingx": {
      "command": "npx",
      "args": ["@lingx/cli", "mcp"]
    }
  }
}
```

#### Available MCP Tools

| Tool | Description |
|------|-------------|
| `lingx_status` | Get current configuration and connection status |
| `lingx_get_config` | Get the current Lingx configuration |
| `lingx_pull` | Download translations from platform |
| `lingx_push` | Upload translations to platform |
| `lingx_sync` | Bidirectional sync |
| `lingx_extract` | Extract keys from source code |
| `lingx_check` | Check translation coverage and quality |
| `lingx_types` | Generate TypeScript types |
| `lingx_key_add` | Add a new translation key |
| `lingx_key_remove` | Remove a translation key |
| `lingx_key_move` | Move/rename a translation key |
| `lingx_branch_list` | List branches in a space |
| `lingx_branch_create` | Create a new branch |
| `lingx_branch_diff` | Compare two branches |
| `lingx_branch_merge` | Merge branches |
| `lingx_search_keys` | Search keys by name pattern |
| `lingx_search_translations` | Search by translation value |
| `lingx_find_similar_keys` | Find potentially duplicate keys |
| `lingx_analyze_conflict` | Get AI-friendly conflict analysis |
| `lingx_suggest_key_name` | Suggest key names based on value |
| `lingx_check_quality_issues` | Analyze quality issues with fixes |
| `lingx_validate_icu` | Validate ICU MessageFormat syntax |

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

Verify your config file project slug matches your project in Lingx.

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
2. Verify the `api.url` in your config
3. Check for firewall or network issues

### Slow extraction

For large codebases:
1. Narrow down `extract.patterns` to specific directories
2. Add more exclusions to `extract.exclude`
3. Split extraction by module/feature

### Type generation issues

1. Ensure translation files exist in `paths.translations`
2. Run `lingx pull` to download translations first
3. Check `types.sourceLocale` matches an existing language file

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
