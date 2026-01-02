# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-02

Initial release of Lingx - a self-hosted, developer-friendly localization management platform with git-like branching for translations.

### Added

#### Core Platform
- Project management with CRUD operations
- Space isolation for organizing translations (frontend, backend, mobile)
- Git-like branching system with copy-on-write semantics
- Branch diff algorithm for comparing translation changes
- Branch merge with conflict detection and resolution
- Environment management (production, staging, development)
- Activity tracking system with GitHub-style diff preview

#### Translation Editor
- Full translation key/value CRUD with editor UI
- Expandable key cards with inline suggestions
- Approval workflow with batch operations
- Translation memory with server-side filtering
- Machine translation integration with command palette
- Namespace support for organizing translation keys
- Extended quality checks and length prediction

#### Authentication & Security
- JWT authentication (24h expiry) with API keys
- User profile settings with avatar upload
- Email verification flow
- Password change functionality
- Session management
- TOTP two-factor authentication
- WebAuthn passkey authentication

#### Glossary Management
- Glossary/termbase management backend
- Glossary management UI with import/export
- Term consistency checking

#### CLI (`@lingx/cli`)
- Authentication commands (`lingx auth login`)
- Pull, push, and sync commands for translations
- Extract command with ICU detection (`--clean` flag)
- Check command with ICU validation
- Branch management commands (create, diff, merge)
- Interactive conflict resolution for sync
- Type-safe translation generation with TKey alias
- Key management commands (add, remove, move)
- MCP server for AI assistant integration

#### Next.js SDK (`@lingx/sdk-nextjs`)
- LingxProvider with React 19 support
- Client-side translation hooks (`useTranslation`, `useLanguage`)
- ICU MessageFormat integration
- Server components and SSG support
- Language detection and persistence
- Type-safe translations with `tKey()` and `TKey` type
- Comprehensive developer documentation

#### Web Dashboard
- Premium design system with soft purple primary color
- Responsive layouts for all pages (mobile-friendly)
- Conflict resolution UI for branch diff and merge
- Statistics API with real project metrics
- Skeleton loaders for improved CLS
- Animations with reduced motion support
- ARIA labels and accessibility improvements

#### Infrastructure
- pnpm monorepo with Turborepo
- Fastify 5 API with plugin architecture
- Prisma 7 with PostgreSQL
- Next.js 16 with App Router
- Docker and Docker Compose setup
- Playwright E2E tests
- Zod validation with unified types

### Changed

- Rebranded from LocaleFlow to Lingx

### Fixed

- CORS origin configuration for credentials mode
- Docker build for Prisma 7 compatibility
- Project slug/ID mismatch in CLI integration
- Auth flow and E2E test reliability
- Glossary import with text/plain content type
- Loading states for translations
