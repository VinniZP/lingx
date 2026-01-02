# Lingx Roadmap

> **Updated**: 2026-01-02 (Phase 8 complete - Now on Phase 9: AI & Context)

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🚧 | In Progress |
| 📋 | Planned |
| 🔮 | Future |

---

## MVP Milestone (Complete)

### Phase 1: Foundation ✅
- [x] Monorepo setup (pnpm + Turborepo)
- [x] API server with authentication
- [x] Database schema
- [x] Web application scaffold

### Phase 2: Core Features ✅
- [x] Project management
- [x] Space management
- [x] Branch management
- [x] Translation editor
- [x] Environment management

### Phase 3: Branch Operations ✅
- [x] Branch diff view
- [x] Branch merge
- [x] Conflict resolution UI

### Phase 4: CLI Tool ✅
- [x] Authentication commands
- [x] Pull/push/sync translations
- [x] Key extraction from source code
- [x] ICU syntax validation
- [x] Branch operations
- [x] Interactive conflict resolution

### Phase 5: Next.js SDK ✅
- [x] Translation hooks
- [x] ICU MessageFormat support
- [x] Language switching
- [x] Language detection & persistence
- [x] Server component support

### Phase 6: UI Polish ✅
- [x] Responsive design
- [x] Premium design system
- [x] Animations & accessibility
- [x] E2E test coverage
- [x] Docker deployment

---

## Completed Phases

### Phase 7: Dashboard & Analytics ✅
- [x] Dashboard statistics API
- [x] Project statistics on cards
- [x] Activity tracking infrastructure (Redis/BullMQ, schema, service, workers, API)
- [x] Activity logging integration (add logging to translation/branch routes)
- [x] Activity feed UI with diff preview drawer
- [x] Zod validation with unified API/frontend types
- [x] **User profile settings** (name, email change with verification, avatar upload, preferences UI)
- [x] **Security settings** (password change, active sessions)
- [x] **Two-factor authentication** (TOTP with backup codes, 30-day device trust)
- [x] **Passkeys/WebAuthn** (passwordless login, security score)
- [x] **Key approval status** (pending/approved, auto-reset on change)

---

## Completed Phases (continued)

### Phase 8: Translation Productivity ✅
- [x] **Translation memory** (pg_trgm fuzzy matching, auto-index approved translations, sidebar panel with TM/AI/MT placeholders)
- [x] **Server-side filtering** (all/missing/complete/pending/approved/rejected with proper pagination)
- [x] **Translation editor UX redesign**
  - [x] Expandable key cards (click-to-expand pattern)
  - [x] Inline TM/MT suggestions below inputs
  - [x] Full keyboard navigation (↑↓ keys, Tab fields, Esc collapse)
  - [x] Command palette (Cmd+K) with quick actions
  - [x] Approve/reject entire key from command palette
  - [x] Editable source language
  - [x] Source text preview in collapsed key view
  - [x] Multi-language MT batch endpoint
  - [x] Premium Kbd component with Command icon
- [x] **Machine translation** (DeepL, Google Translate with provider config, usage tracking, caching)
- [x] **Glossary/termbase management**
  - [x] Per-project glossary with rich terminology (context, notes, part of speech, domain, tags)
  - [x] Fuzzy term matching in translation editor sidebar
  - [x] CSV and TBX (ISO 30042) import/export
  - [x] MT provider sync (DeepL/Google glossaries)
  - [x] Usage tracking and statistics
  - [x] Premium settings UI with tag management
- [x] **Extended quality checks**
  - [x] Placeholder consistency (missing/extra variables)
  - [x] Whitespace issues (leading/trailing, double spaces, tabs)
  - [x] Punctuation mismatch detection
  - [x] CLI `--quality` flag for batch checking
  - [x] Real-time quality feedback in Web UI
  - [x] API batch quality check endpoint
- [x] **Interactive conflict resolution**
  - [x] Shared conflict resolver utility
  - [x] `lf sync` interactive conflict resolution
  - [x] `--force-local` / `--force-remote` flags for sync
  - [x] Unified UX across push and sync commands
- [x] **Translation length prediction**
  - [x] Language-specific expansion ratios (30+ languages)
  - [x] Warning at 150%, error at 200% of expected length
  - [x] ICU placeholder-aware length calculation
  - [x] Configurable thresholds via QualityCheckConfig
- [x] **Namespace support (SDK & CLI)**
  - [x] File organization (`locales/[namespace]/[lang].json`)
  - [x] `useTranslation('namespace')` with `ready` state for lazy-loading
  - [x] Type-safe namespaced keys (`NamespaceKeys`, `TNsKey<NS>`, `tKey('key', 'namespace')`)
  - [x] CLI namespace handling (pull/push/extract/types/check)
  - [x] Internal delimiter format (U+001F) for clean key separation
  - [x] Comprehensive SDK documentation update

---

## Current Development

### Phase 9: AI & Context 🚧
- [ ] **AI-powered translation with context** (near-keys, glossary, domain)
- [ ] **MCP Server** (Lingx as AI tool via Model Context Protocol)
- [x] **Near-key context detection** (unique feature - source file, component, semantic relationships)
- [ ] **AI quality estimation** (auto-score translations)
- [ ] Screenshot context system
- [ ] Additional file formats (XLIFF, Gettext, etc.)

### Phase 10: Ecosystem & Integrations 📋
- [ ] Webhooks
- [ ] Git repository integration
- [ ] **ESLint plugin** (React + Angular rules)
- [ ] Angular SDK
- [ ] In-context editing SDK

---

## Future Enhancements 🔮

- User preferences integration (apply theme, default project, notifications)
- Translation memory cross-project sharing
- Comments & discussions
- Real-time collaboration
- Mobile app
- Variable validation across languages

---

## Current Focus

**Phase 9: AI & Context**

| Priority | Deliverable | Status |
|----------|-------------|--------|
| High | AI-powered translation with context | 📋 Planned |
| High | MCP Server (Model Context Protocol) | 📋 Planned |
| High | Near-key context detection | ✅ Complete |
| Medium | AI quality estimation | 📋 Planned |
| Medium | Screenshot context system | 📋 Planned |
| Low | Additional file formats (XLIFF, Gettext) | 📋 Planned |

---

## References

- `docs/prd/PRD.md` - Product requirements
- `docs/STRATEGIC-ANALYSIS.md` - Competitive analysis & feature details
- `docs/TODO-API-FEATURES.md` - API feature specs
- `docs/ARCHITECTURE-IMPROVEMENTS.md` - Architecture migration tracking
- `docs/adr/` - Architecture decisions
- `.claude/skills/target-be-architecture/` - Backend architecture patterns
- `.claude/skills/target-fe-architecture/` - Frontend architecture patterns
