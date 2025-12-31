# LocaleFlow Roadmap

> **Updated**: 2025-12-31 (Phase 8 in progress)

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

## Current Development

### Phase 8: Translation Productivity 🚧
- [x] **Translation memory** (pg_trgm fuzzy matching, auto-index approved translations, sidebar panel with TM/AI/MT placeholders)
- [x] **Server-side filtering** (all/missing/complete/pending/approved/rejected with proper pagination)
- [ ] Machine translation (DeepL, Google)
- [ ] Glossary/termbase management
- [ ] Extended quality checks
- [ ] **Dry run mode** (`--dry-run` for push/import/sync)
- [ ] **Dead key detection** (`lf check --dead`)
- [ ] **Import with merge conflicts** (interactive resolution)
- [ ] **Translation length prediction** (overflow warnings)

### Phase 9: AI & Context 📋
- [ ] **AI-powered translation with context** (near-keys, glossary, domain)
- [ ] **MCP Server** (LocaleFlow as AI tool via Model Context Protocol)
- [ ] Near-key context detection (unique feature)
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

**Phase 8: Translation Productivity**

| Priority | Deliverable | Status |
|----------|-------------|--------|
| High | Translation memory | ✅ Complete |
| High | Server-side filtering | ✅ Complete |
| High | Machine translation (DeepL, Google) | 📋 Planned |
| Medium | Glossary/termbase management | 📋 Planned |
| Medium | Extended quality checks | 📋 Planned |
| Medium | Dry run mode (`--dry-run`) | 📋 Planned |
| Medium | Dead key detection (`lf check --dead`) | 📋 Planned |
| Low | Import with merge conflicts | 📋 Planned |
| Low | Translation length prediction | 📋 Planned |

---

## References

- `docs/prd/PRD.md` - Product requirements
- `docs/STRATEGIC-ANALYSIS.md` - Competitive analysis & feature details
- `docs/TODO-API-FEATURES.md` - API feature specs
- `docs/ARCHITECTURE-IMPROVEMENTS.md` - Architecture migration tracking
- `docs/adr/` - Architecture decisions
- `.claude/skills/target-be-architecture/` - Backend architecture patterns
- `.claude/skills/target-fe-architecture/` - Frontend architecture patterns
