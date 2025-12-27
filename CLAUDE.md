# Localeflow Project Instructions

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Fastify 5, Prisma 7, PostgreSQL
- **Web**: Next.js 16 (App Router), React 19, shadcn/ui, TailwindCSS
- **Auth**: JWT (24h) + API Keys
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Package Management Rules
- Always use `pnpm` (not npm/yarn)
- Use `pnpm add <package>` without version pinning - always latest
- Use official CLI tools for scaffolding:
  - `pnpm create next-app@latest` for Next.js
  - `npx shadcn@latest init/add` for shadcn components
  - `npx prisma init` for Prisma setup

## Prisma 7 (Breaking Changes)
- NO `url` in `datasource` block of schema.prisma - use prisma.config.ts instead
- Use adapter-based client: `@prisma/adapter-pg` with `pg.Pool`
- Check Prisma docs when encountering issues: https://www.prisma.io/docs

## Documentation
Before implementing features, check:
- `docs/prd/PRD.md` - Product requirements
- `docs/design/DESIGN.md` - Technical design, API specs, schemas
- `docs/adr/` - Architecture Decision Records
- `docs/plans/` - Work plans and task decomposition

## Frontend Development
- When implementing FrontEnd ALWAYS use Skill(frontend-design), IT'S REQUIRED.
- Use shadcn/ui components from `@/components/ui`
- Follow the distinctive Localeflow design: deep indigo/violet + warm amber accents
