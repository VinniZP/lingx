# ADR-0001: Monorepo Structure

## Status

Accepted

## Context

Localeflow is a localization management platform with multiple components that need to be developed, tested, and deployed together:

- **Web Application** (Next.js frontend)
- **Backend API** (Fastify server)
- **CLI Tool** (Node.js command-line interface)
- **SDKs** (Next.js SDK, Angular SDK)
- **Shared packages** (types, utilities)

These components have significant code sharing requirements:
1. TypeScript types shared between API, CLI, and SDKs
2. API contracts shared between backend and frontend
3. Utility functions used across multiple packages
4. Consistent testing and linting configurations

We need to determine the best strategy for organizing this codebase while enabling:
- Efficient developer experience with fast builds
- Easy code sharing between packages
- Consistent tooling and configuration
- Independent versioning and publishing for SDKs and CLI

## Decision

Adopt **pnpm workspaces with Turborepo** as the monorepo management solution.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Use pnpm workspaces for dependency management and Turborepo for build orchestration |
| **Why now** | Project architecture must be established before any implementation begins to avoid costly restructuring later |
| **Why this** | pnpm provides superior disk efficiency and strict dependency isolation critical for SDK development; Turborepo offers simple caching without forcing architectural constraints |
| **Known unknowns** | Performance at scale with 5+ packages in development mode; potential pnpm symlink issues with certain npm packages |
| **Kill criteria** | If more than 20% of development time is spent fighting workspace tooling issues after 2 sprints |

## Rationale

The combination of pnpm workspaces and Turborepo provides the best balance of:
1. **Performance**: pnpm's content-addressable store reduces disk usage by 60-80% and provides 3-5x faster installations
2. **Simplicity**: Turborepo works on top of existing package.json scripts without forcing restructuring
3. **Flexibility**: Easy to add new packages without changing build configuration
4. **Type Safety**: Strict dependency resolution prevents "phantom dependency" issues critical for SDK development

### Options Considered

#### 1. npm workspaces (Standalone)
**Description**: Use npm's built-in workspace feature without additional build tooling.

**Pros**:
- No additional dependencies
- Most widely adopted and understood
- Zero learning curve for developers

**Cons**:
- Basic workspace support lacks advanced filtering and scoped commands
- Flat dependency tree can hide dependency issues
- No built-in caching for builds
- Slower installations due to duplication

**Effort**: 1 day initial setup

#### 2. Yarn workspaces + Yarn PnP
**Description**: Use Yarn workspaces with Plug'n'Play for zero-installs.

**Pros**:
- Mature plugin ecosystem
- Plug'n'Play eliminates node_modules entirely
- Good monorepo support for small-to-medium projects
- Zero-installs possible with repository-checked dependencies

**Cons**:
- PnP requires extra tooling support (IDE plugins, special configuration)
- Compatibility issues with packages that don't support PnP
- More complex debugging when issues arise
- Teams using Yarn v1 would need migration

**Effort**: 2 days initial setup + ongoing compatibility work

#### 3. pnpm workspaces + Turborepo (Selected)
**Description**: Use pnpm for dependency management with Turborepo for build orchestration and caching.

**Pros**:
- 60-80% disk usage reduction compared to npm/yarn
- 3-5x faster installation times through intelligent caching
- Strict dependency resolution prevents phantom dependencies
- Turborepo provides powerful caching with minimal configuration
- Turborepo is lightweight and non-intrusive
- Works with existing package.json scripts
- Backed by Vercel, excellent Next.js integration
- 100% Node.js module resolution compatible

**Cons**:
- Some legacy packages may have symlink compatibility issues
- Smaller community than npm (though rapidly growing)
- Learning curve for pnpm-specific features
- Requires pnpm to be installed (not bundled with Node.js)

**Effort**: 1-2 days initial setup

#### 4. Nx
**Description**: Use Nx as a comprehensive monorepo build system with code generation and dependency graph visualization.

**Pros**:
- Powerful dependency graph and affected-only builds
- Built-in code generators and scaffolding
- Strong architectural enforcement
- Supports multiple languages beyond JavaScript
- Nx Cloud for remote caching
- More mature (since 2016)

**Cons**:
- Steeper learning curve
- More opinionated structure
- Heavier tooling overhead
- Can feel "locked in" to Nx patterns
- Overkill for projects with fewer than 10 packages
- Performance claims disputed in real-world benchmarks

**Effort**: 3-4 days initial setup + ongoing learning investment

#### 5. Lerna (Legacy)
**Description**: Use Lerna for monorepo management and versioning.

**Pros**:
- Mature tool with long history
- Good for publishing multiple packages
- Independent versioning support

**Cons**:
- Now recommends using other tools (Nx has absorbed Lerna)
- Performance issues with large monorepos
- No built-in caching
- Considered legacy approach in 2025

**Effort**: 2 days initial setup

## Comparison

| Evaluation Axis | npm workspaces | Yarn PnP | pnpm + Turborepo | Nx | Lerna |
|-----------------|----------------|----------|------------------|-----|-------|
| Installation Speed | Slow | Fast | Very Fast | Fast | Slow |
| Disk Efficiency | Low | High | Very High | Medium | Low |
| Learning Curve | None | Medium | Low | High | Low |
| Caching | None | None | Excellent | Excellent | None |
| Flexibility | High | Medium | High | Low | Medium |
| Ecosystem Maturity | High | Medium | Growing | High | Declining |
| SDK Publishing | Basic | Good | Excellent | Excellent | Good |

## Consequences

### Positive Consequences

- **Faster CI/CD**: Turborepo caching reduces build times significantly for unchanged packages
- **Disk efficiency**: Developers save gigabytes of disk space across multiple branches
- **Strict dependencies**: SDK packages will have explicit, verified dependencies preventing runtime issues for end users
- **Simple adoption**: Existing Node.js skills transfer directly; no special patterns required
- **Independent publishing**: Each SDK and CLI can be versioned and published independently

### Negative Consequences

- **pnpm installation required**: All developers and CI systems must have pnpm installed
- **Potential compatibility issues**: Some npm packages may require `shamefully-hoist` or other workarounds
- **Additional tooling**: Two tools (pnpm + Turborepo) instead of one

### Neutral Consequences

- **Standard workspace conventions**: Package structure follows common monorepo patterns
- **Configuration files**: Requires `pnpm-workspace.yaml` and `turbo.json` configuration files

## Implementation Guidance

- Define workspace packages using `pnpm-workspace.yaml` with explicit package paths
- Configure Turborepo pipelines for common tasks (build, test, lint, typecheck)
- Use `workspace:*` protocol for internal dependencies to ensure local linking
- Enable remote caching in CI for shared build artifacts
- Enforce strict dependency checking (`auto-install-peers: false`)
- Document pnpm installation requirements in project README

## Proposed Workspace Structure

```
localeflow/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── cli/          # CLI tool
│   ├── sdk-nextjs/   # Next.js 16 SDK
│   ├── sdk-angular/  # Angular SDK
│   ├── shared/       # Shared types and utilities
│   └── config/       # Shared configuration (eslint, tsconfig, etc.)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Related Information

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- PRD: `/docs/prd/PRD.md` - Project requirements and tech stack definition
- OVERVIEW: `/docs/OVERVIEW.md` - Product vision and component overview

## References

- [pnpm vs npm vs Yarn Comparison](https://refine.dev/blog/pnpm-vs-npm-and-yarn/) - Detailed package manager comparison
- [Mastering pnpm Workspaces Guide](https://blog.glen-thomas.com/software%20engineering/2025/10/02/mastering-pnpm-workspaces-complete-guide-to-monorepo-management.html) - pnpm workspace patterns
- [npm vs Yarn vs pnpm 2025](https://dev.to/hamzakhan/npm-vs-yarn-vs-pnpm-which-package-manager-should-you-use-in-2025-2f1g) - 2025 comparison
- [Nx vs Turborepo Guide](https://www.wisp.blog/blog/nx-vs-turborepo-a-comprehensive-guide-to-monorepo-tools) - Monorepo tool comparison
- [Why Turborepo Over Nx](https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp) - Practical perspective on tool selection
