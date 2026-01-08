# Lingx Project Instructions

## Main instructions

- Use LSP for reference tracing: Prefer findReferences over Grep when finding all usages of a function/class for refactoring. Use incomingCalls when tracing what code calls a specific function.

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Fastify 5, Prisma 7, PostgreSQL, Redis (BullMQ)
- **Web**: Next.js 16 (App Router), React 19, shadcn/ui, TailwindCSS v4
- **Auth**: JWT (24h) + API Keys
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Forms**: react-hook-form + zod + shadcn Form components

## Package Management

- Always use `pnpm` (not npm/yarn)
- Use `pnpm add <package>` without version pinning
- Use official CLI tools:
  - `npx shadcn@latest add <component>` for shadcn components
  - `npx prisma migrate dev` for database migrations

## Prisma 7 (Breaking Changes)

- NO `url` in `datasource` block - use `prisma.config.ts` instead
- Use adapter-based client: `@prisma/adapter-pg` with `pg.Pool`
- Docs: https://www.prisma.io/docs

## Architecture Patterns

### Target Backend Architecture (CQRS-lite)

- **CommandBus**: Write operations via command handlers
- **QueryBus**: Read operations with caching
- **EventBus**: Side effects (real-time sync, webhooks, audit)
- **Thin Routes**: Routes validate → authorize → dispatch to bus
- **Domain Modules**: Organized by business domain (`modules/translation/`, `modules/project/`)

```
modules/[domain]/
├── commands/           # Write operations
├── queries/            # Read operations
├── events/             # Side effects
├── handlers/           # Event handlers
└── repository.ts       # Data access
```

### Target Frontend Architecture (Progressive FSD)

- **Layer Hierarchy**: app → widgets → features → entities → shared
- **Entities**: Business object display (ProjectCard, KeyRow)
- **Features**: User actions with mutations (AITranslate, DeleteKey)
- **Widgets**: Complex UI blocks (TranslationEditor)
- **Shared**: UI primitives, utilities, API client

```
# Import rule: lower layers cannot import from higher layers
app/        → widgets, features, entities, shared
widgets/    → features, entities, shared
features/   → entities, shared
entities/   → shared
shared/     → (nothing)
```

### Current Patterns (Legacy)

- **AccessService**: Centralized authorization (`verifyTranslationAccess`, `verifyBranchAccess`, `verifyProjectAccess`)
- **Factory Pattern**: Use factories for dependency injection (`createQualityEstimationService`)
- **Repository Pattern**: Data access via repositories (`ScoreRepository`)

### Shared Validation

- Define Zod schemas in `@lingx/shared/src/validation/`
- Import in both API routes and frontend for type safety
- Never use `z.any()` - always define proper schemas

### Background Jobs

- Use BullMQ with Redis for async processing
- Workers in `apps/api/src/workers/`
- Circuit breaker pattern for external API calls (3 failures → 30s cooldown)

### Security

- Validate all user input (Zod schema + runtime checks)
- Limit array sizes to prevent DoS (e.g., `MAX_BATCH_SIZE = 1000`)
- AES-256-GCM for API key encryption (uses `AI_ENCRYPTION_KEY` env var)
- Regex DoS protection: limit input size before applying patterns

## Documentation

- `docs/prd/PRD.md` - Product requirements
- `docs/design/DESIGN.md` - Technical design, API specs
- `docs/adr/` - Architecture Decision Records
- `docs/TODO-API-FEATURES.md` - UI features needing API implementation

### SDK Documentation (`packages/sdk-nextjs/docs/`)

- `getting-started.md` - Installation and basic setup
- `type-safety.md` - Type generation, TKey, tKey(), tKeyUnsafe()
- `hooks.md` - useTranslation, useLanguage, useNamespace, useLingx
- `provider.md` - LingxProvider configuration
- `icu-format.md` - ICU MessageFormat (plurals, numbers, dates, selects)
- `server-side.md` - Server Components and App Router
- `language-detection.md` - 9 built-in detectors
- `advanced.md` - Caching, performance, TypeScript
- `components.md` - LanguageSwitcher and custom components
- `troubleshooting.md` - Common issues and solutions

### CLI Documentation (`packages/cli/`)

- `lingx extract` - Extract translation keys from source
- `lingx pull` - Pull translations from API
- `lingx push` - Push translations to API
- `lingx sync` - Bidirectional sync
- `lingx types` - Generate TypeScript types from translations

---

## Design System (Premium Styling)

### Colors (globals.css)

- **Primary**: Soft purple `#7C6EE6` (light) / `#9D8DF1` (dark)
- **Background**: Lavender-tinted `#E8E6EF` (light) / Near black `#0D0D0D` (dark)
- **Cards/Islands**: Pure white with subtle inner glow shadows
- **Semantic**: Success green, Warning amber, Destructive coral

### Sizing Standards

- **Form inputs**: `h-11` (44px), `rounded-xl`, `bg-card`, `border-border`
- **Buttons**: `h-11` default, `h-9` small, `h-12` large, `rounded-xl`
- **Icons in buttons**: `size-4.5` default
- **Select/Textarea**: Match input styling

### Visual Effects

- **Islands**: `.island` class with inner glow shadow
- **Animations**: `animate-fade-in-up` with stagger classes (`stagger-1` to `stagger-6`)
- **Easing**: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`
- **Card hover**: `.card-hover` for elevation on hover

---

## Form Patterns

### Always Use shadcn Form Components

```tsx
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onTouched', // Show errors after field is blurred
  defaultValues: { ... },
});

<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormDescription>Helper text</FormDescription>
        <FormMessage /> {/* Auto-shows errors with icon */}
      </FormItem>
    )}
  />
</Form>
```

### Validation Mode

- Use `mode: 'onTouched'` - errors show only after field is blurred
- `FormMessage` automatically includes AlertCircle icon

---

## Frontend Development

### Required Skill

When implementing UI components, ALWAYS use `Skill(frontend-design)` for premium aesthetics.

### Key Component Files

- `components/ui/button.tsx` - h-11 default, rounded-xl
- `components/ui/input.tsx` - h-11, rounded-xl, bg-card
- `components/ui/select.tsx` - h-11, rounded-xl, full-width
- `components/ui/form.tsx` - Form validation with icons
- `components/ui/textarea.tsx` - rounded-xl, min-h-[120px]

### Page Structure

- Use `.island` class for card containers
- Add `animate-fade-in-up` with `stagger-N` for entrance animations
- Consistent spacing with `space-y-6` between sections

---

## Tailwind CSS v4 Syntax

Spacing scale: value × 4px (e.g., 50 = 200px, 200 = 800px, 250 = 1000px)

Fractional values supported: 0.5 = 2px, 1.5 = 6px, 2.5 = 10px

Syntax changes from v3:

- `bg-gradient-to-*` → `bg-linear-to-*`
- `shadow-color/[0.03]` → `shadow-color/3` (opacity without brackets)
- `bg-opacity-50` → `bg-black/50` (slash syntax)
- `text-opacity-50` → `text-white/50`
- `w-[200px]` → `w-50` (prefer scale over arbitrary)
- `w-[800px] h-[800px]` → `size-200` (combined size utility)
- `min-w-[200px]` → `min-w-50`
- `w-[1000px]` → `w-250`

---

## i18n Patterns (Type-Safe Translations)

### Type Generation

Run `lingx types` to generate TypeScript types from translation files. This provides:

- Autocomplete for all translation keys
- Compile-time validation of keys
- ICU parameter type inference (plural → number, date → Date)

### Key Types

```tsx
import { tKey, tKeyUnsafe, type TKey } from '@lingx/sdk-nextjs';

// TKey - convenience type for typed translation keys
interface NavItem {
  href: string;
  labelKey: TKey;
}

// tKey() - strict, validates key exists
const items: NavItem[] = [{ href: '/', labelKey: tKey('nav.home') }];

// tKeyUnsafe() - escape hatch for dynamic keys
const dynamicKey = tKeyUnsafe(`${section}.title`);
```

### Translation Functions

```tsx
const { t, td } = useTranslation();

// t() - for string literal keys
t('greeting', { name: 'World' });

// td() - for dynamic keys (from tKey())
items.map((item) => td(item.labelKey));
```

### Configuration

```typescript
// lingx.config.ts
export default {
  paths: {
    translations: './public/locales',
    source: './src',
  },
  types: {
    enabled: true,
    output: './src/lingx.d.ts',
    sourceLocale: 'en',
  },
};
```

See `packages/sdk-nextjs/docs/type-safety.md` for full documentation.

---

## Testing Patterns

### Test Structure

```
apps/api/tests/
├── unit/           # Pure function tests, mocked dependencies
├── integration/    # Database tests with real Prisma
└── e2e/            # Full API tests (if applicable)
```

### Running Tests

```bash
pnpm --filter @lingx/api test              # Run all tests
pnpm --filter @lingx/api test:integration  # Integration only
```

### Test Environment

- Uses `TEST_DATABASE_URL` with `?schema=test` for isolation
- Redis required for worker/queue tests
- CI uses Docker services for Postgres and Redis

---

## Current Placeholder Data

These UI elements use fake data and need API implementation:

- Dashboard: completion rate (87%), activity feed
- Projects: progress bars, key counts
- See `docs/TODO-API-FEATURES.md` for full list

---

## Claude Code Extensions

### Refactoring Plugin (`.claude/plugins/lingx-refactor/`)

Plugin for refactoring code to follow architecture patterns:

| Command               | Description                             |
| --------------------- | --------------------------------------- |
| `/refactor-be [path]` | Refactor backend to CQRS-lite pattern   |
| `/refactor-fe [path]` | Migrate frontend component to FSD layer |
| `/add-tests [path]`   | Generate Vitest test coverage           |

**Agents:**

- `architecture-analyzer` - Analyze code, suggest refactoring opportunities
- `refactoring-agent` - Execute refactoring with file updates
- `test-coverage-agent` - Generate tests for refactored code

**Skills:**

- `target-be-architecture` - CQRS-lite patterns documentation
- `target-fe-architecture` - Progressive FSD patterns documentation

### Project Commands (`.claude/commands/`)

| Command          | Description               |
| ---------------- | ------------------------- |
| `/scaffold-api`  | Scaffold new API endpoint |
| `/scaffold-page` | Scaffold new Next.js page |
| `/debug-api`     | Debug API issues          |
| `/i18n-check`    | Check i18n compliance     |
| `/pre-pr-check`  | Run checks before PR      |
| `/release-prep`  | Prepare release           |

### Project Skills (`.claude/skills/`)

- `i18n-patterns` - Translation key naming, ICU format
- `testing-patterns` - Unit, integration, E2E test patterns
