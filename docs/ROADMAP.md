# LocaleFlow Roadmap

> **Updated**: 2025-12-30

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

## Current Development

### Phase 7: Dashboard & Analytics 🚧
- [x] Dashboard statistics API
- [x] Project statistics on cards
- [ ] Activity tracking system
- [ ] Activity feed display
- [ ] Field-level validation errors
- [ ] **User profile settings** (name, email, avatar, preferences)
- [ ] **Security settings** (password change, active sessions)
- [ ] **Two-factor authentication** (TOTP with backup codes)
- [ ] **Passkeys/WebAuthn** (passwordless login)
- [ ] **Key approval status** (pending/approved, auto-reset on change)

### Phase 8: Translation Productivity 📋
- [ ] Translation memory
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

- Translation memory cross-project sharing
- Comments & discussions
- Real-time collaboration
- Mobile app
- Variable validation across languages

---

## Current Focus

**Phase 7: Dashboard & Analytics**

| Priority | Deliverable | Status |
|----------|-------------|--------|
| High | Dashboard statistics API | ✅ Done |
| High | Project statistics on cards | ✅ Done |
| High | User profile settings | 📋 Next |
| High | Security settings | 📋 |
| High | Two-factor authentication (TOTP) | 📋 |
| High | Key approval status | 📋 |
| Medium | Passkeys/WebAuthn | 📋 |
| Medium | Activity tracking system | 📋 |
| Medium | Activity feed display | 📋 |

---

## References

- `docs/prd/PRD.md` - Product requirements
- `docs/STRATEGIC-ANALYSIS.md` - Competitive analysis & feature details
- `docs/TODO-API-FEATURES.md` - API feature specs
- `docs/ARCHITECTURE-IMPROVEMENTS.md` - Architecture migration tracking
- `docs/adr/` - Architecture decisions
- `.claude/skills/target-be-architecture/` - Backend architecture patterns
- `.claude/skills/target-fe-architecture/` - Frontend architecture patterns
