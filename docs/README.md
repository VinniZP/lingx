# Localeflow Documentation

Welcome to the Localeflow documentation. This guide will help you get started with Localeflow, a self-hosted localization management platform with git-like branching for translations.

## Documentation Index

### Getting Started

- [Getting Started Guide](./getting-started.md) - Complete setup walkthrough from installation to first translation

### Deployment

- [Deployment Guide](./deployment.md) - Production deployment with Docker, nginx, SSL, and database management

### Package Documentation

- [CLI Reference](../packages/cli/README.md) - Command-line tool documentation with all commands and options
- [Next.js SDK Guide](../packages/sdk-nextjs/README.md) - React SDK integration with hooks, ICU MessageFormat, and SSR support

### Architecture

- [Design Document](./design/DESIGN.md) - Technical design, API specifications, and system architecture
- [Product Requirements](./prd/PRD.md) - Product requirements and feature specifications

### Architecture Decision Records (ADRs)

- [ADR-0001: Monorepo Structure](./adr/ADR-0001-monorepo-structure.md) - pnpm workspaces + Turborepo
- [ADR-0002: Branch Storage Strategy](./adr/ADR-0002-branch-storage-strategy.md) - Copy-on-write for branch data
- [ADR-0003: Authentication Approach](./adr/ADR-0003-authentication-approach.md) - JWT + API Keys
- [ADR-0004: API Framework Selection](./adr/ADR-0004-api-framework-selection.md) - Fastify + Prisma

## Quick Links

### For Developers

1. **First time setup?** Start with the [Getting Started Guide](./getting-started.md)
2. **Using the CLI?** Check the [CLI Reference](../packages/cli/README.md)
3. **Integrating with Next.js?** See the [SDK Guide](../packages/sdk-nextjs/README.md)

### For DevOps

1. **Deploying to production?** Follow the [Deployment Guide](./deployment.md)
2. **Need API details?** Run the server and visit `/docs` for OpenAPI documentation

### For Architects

1. **Understanding the system?** Read the [Design Document](./design/DESIGN.md)
2. **Technical decisions?** Review the ADRs in `./adr/`

## API Documentation

When the Localeflow API is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:3001/docs
- **OpenAPI JSON**: http://localhost:3001/docs/json

## Support

For issues and feature requests, please use the GitHub issue tracker.
