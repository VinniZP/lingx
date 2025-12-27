# Localeflow: Product Overview

## Vision

A developer-friendly localization management platform with git-like branching for translations, enabling teams to safely manage translations across multiple environments without feature work polluting production.

## Problem

Current localization tools fail developers and translation managers in key ways:

| Pain Point | Impact |
|------------|--------|
| No environment isolation | Dev changes immediately affect production |
| No branching model | Feature translations can't be isolated until release |
| Poor CLI experience | No conflict detection, unreliable extraction |
| Weak framework SDKs | Poor DX for Angular and modern frameworks |
| No space separation | Frontend/backend translations mixed together |

### Real-World Scenario

> "We changed a button text while developing a feature. It went live to production immediately, but the feature won't be released for another month. Users saw text that didn't match their experience."

## Solution

A localization platform that treats translations like code:

- **Spaces** for logical separation (frontend, backend, mobile)
- **Branches** for safe feature development
- **Environments** that point to specific branches
- **Modern CLI** with conflict detection and reliable extraction
- **Framework SDKs** designed for great developer experience

---

## Target Users

### Developer

**Goals:**
- Quickly integrate translations into applications
- Extract and sync translation keys from code
- Work on feature translations without affecting production
- Resolve translation conflicts before merging

**Workflows:**
- Pull translations to local environment
- Extract new keys from source code
- Push updated translations
- Create feature branches for new work
- Merge translations when feature is ready

### Translation Manager

**Goals:**
- Edit translations efficiently across languages
- Review translation changes before they go live
- Manage multiple projects and environments
- Understand translation coverage and gaps

**Workflows:**
- Browse and edit translations in web UI
- Review branch changes before merge
- Switch environment branch pointers for releases
- Track missing translations per language

---

## Core Concepts

### Projects

Top-level container for a product or application. Defines which languages are supported.

**Example:** "E-commerce Platform" with languages: English, Ukrainian, German

### Spaces

Isolated segments within a project. Translations in one space don't affect another.

**Examples:**
- `frontend` - Web application translations
- `backend` - API error messages, email templates
- `mobile` - Mobile app specific strings

### Branches

Git-like branches for translations. Enable safe feature development.

**Default behavior:**
- Every space has a `main` branch (auto-created)
- Simple users just work on `main` directly
- Power users create feature branches

**Example workflow:**
1. Create branch `feature-checkout-redesign`
2. Update translations for new checkout flow
3. Merge to `main` when feature ships

### Environments

Deployment targets that point to branches.

**Example:**
- `production` → points to `main`
- `staging` → points to `release-2.1`
- `development` → points to `feature-checkout-redesign`

---

## Features

### Web Application

#### Project Management
- Create, edit, delete projects
- Configure supported languages per project
- View project-level statistics (keys, translations, coverage)

#### Space Management
- Create isolated spaces within projects
- View space-level translation statistics
- Navigate between spaces

#### Translation Editor
- Browse translation keys with search and filter
- Edit translations inline with multi-language view
- Add context/description for translators
- Bulk operations (delete, export)
- See translation coverage per language

#### Branch Management
- Create branches from existing branch
- View branch list with metadata
- Compare branches (diff view)
- Merge branches with conflict resolution
- Delete merged branches

#### Environment Management
- Create environments (dev, staging, prod)
- Point environments to specific branches
- Quick-switch branch pointers for releases

#### User Management
- User registration and authentication
- Role-based access (developer, manager)
- API key generation for SDK/CLI access

### Command Line Interface (CLI)

#### Authentication
- Login with credentials
- Store and manage API keys
- Logout and token cleanup

#### Translation Sync
- **Pull**: Download translations to local files (JSON, YAML, etc.)
- **Push**: Upload local changes to platform
- **Sync**: Bidirectional sync with conflict detection

#### Code Analysis
- **Extract**: Scan source code for translation keys
- **Check**: Find missing keys, unused keys, untranslated strings

#### Branch Operations
- Create new branches
- View branch diff with clear conflict display
- Merge branches with resolution options
- Interactive conflict resolution

### SDKs

#### Angular SDK
- Module-based configuration
- Translate pipe for templates
- Service for programmatic access
- Interpolation support
- Language switching

#### Next.js SDK
- Provider component for app setup
- React hook for translations
- Server component support
- Static generation compatible
- Interpolation support

---

## Key Workflows

### Workflow 1: Setting Up a New Project

1. Create project in web UI
2. Add supported languages
3. Create spaces (frontend, backend)
4. Generate API key for CLI/SDK
5. Configure SDK in application
6. Use CLI to extract initial keys

### Workflow 2: Daily Translation Work

1. Translator opens web UI
2. Filters by language and space
3. Edits translations inline
4. Changes are saved immediately
5. Developers pull latest translations

### Workflow 3: Feature Development with Branches

1. Developer creates feature branch via CLI
2. Updates translations for new feature
3. Pushes changes to feature branch
4. Feature goes through development/testing
5. When ready, merges branch to main
6. Production environment already points to main

### Workflow 4: Release Management

1. Create `release-X.Y` branch from `main`
2. Point `staging` environment to release branch
3. Test with staging translations
4. When approved, merge release to `main`
5. Production automatically gets updates

### Workflow 5: Conflict Resolution

1. Developer tries to merge feature branch
2. CLI shows conflicts with clear diff
3. Developer chooses resolution per conflict
4. Merge completes
5. Changes available in target branch

---

## Success Metrics

| Metric | Description |
|--------|-------------|
| Translation coverage | % of keys translated per language |
| Branch merge time | Time from branch creation to merge |
| CLI usage | Pull/push/sync operations per day |
| Conflict rate | % of merges with conflicts |
| Time to first translation | Onboarding speed for new projects |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Web Frontend | Next.js, TailwindCSS, shadcn/ui |
| Backend API | Fastify, Prisma |
| Database | PostgreSQL |
| CLI | Node.js, Commander.js |
| SDKs | TypeScript (Angular, React/Next.js) |
| Monorepo | pnpm workspaces, Turborepo |
| Deployment | Docker, docker-compose |

---

## Future Considerations

These features are out of scope for MVP but may be added later:

- **Translation memory**: Suggest translations based on similar keys
- **Machine translation**: Auto-translate with review workflow
- **Webhooks**: Notify external systems on translation changes
- **Git integration**: Auto-create translation branches from git branches
- **Comments & discussions**: Collaborate on specific translations
- **Audit log**: Track who changed what and when
- **Multi-tenant SaaS**: Organization management, billing
- **Import/Export**: Bulk operations with various formats
- **Screenshots**: Attach context screenshots to keys
- **Pluralization**: Handle plural forms per language
- **Variables validation**: Ensure interpolation variables match across languages
