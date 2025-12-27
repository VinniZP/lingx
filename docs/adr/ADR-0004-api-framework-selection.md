# ADR-0004: API Framework Selection

## Status

Accepted

## Context

Localeflow requires a backend API to serve:

1. **Web Application**: CRUD operations for projects, spaces, branches, translations
2. **CLI Tool**: Sync operations, branch management, key extraction results
3. **SDKs**: Translation fetching for runtime applications

API requirements from PRD:
- NFR-PERF: API response time < 200ms for 95th percentile
- NFR-SCA-001: Support 100+ concurrent users
- NFR-SCA-003: Support 10,000+ keys per branch
- NFR-DEP-004: Health check endpoints for container orchestration

Technical requirements:
- TypeScript-first development
- PostgreSQL database via Prisma ORM (specified in PRD)
- JSON request/response
- RESTful API design
- JWT authentication integration
- File upload support (for future import/export)

The tech stack already specifies Fastify in the PRD and OVERVIEW documents. This ADR documents the rationale and confirms this decision after evaluating alternatives.

## Decision

Adopt **Fastify with Prisma ORM** as the backend API framework.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Use Fastify as the HTTP framework with Prisma for database access |
| **Why now** | Framework choice affects all API implementation, testing patterns, and developer experience |
| **Why this** | Best performance for self-hosted deployments; schema-based validation aligns with TypeScript-first approach; Prisma provides excellent type safety |
| **Known unknowns** | Plugin ecosystem maturity for specific use cases; memory usage under sustained load |
| **Kill criteria** | If plugin gaps require significant custom middleware development, or if performance advantages don't materialize in practice |

## Rationale

Fastify + Prisma provides:

1. **Performance**: 2.7x more requests than Express; important for self-hosted single-server deployments
2. **Type Safety**: Built-in JSON Schema validation + Prisma's generated types
3. **Developer Experience**: Clear plugin architecture, excellent documentation
4. **Deployment**: Low memory footprint suitable for Docker deployment

### Options Considered

#### 1. Express + TypeORM
**Description**: Industry-standard Node.js framework with traditional ORM.

**Pros**:
- Largest ecosystem and community
- Most tutorials and examples available
- Highly flexible and unopinionated
- Easy to find developers with experience
- Battle-tested at massive scale

**Cons**:
- Lower performance than modern alternatives (15K vs 30K Rps)
- No built-in validation or schema support
- TypeORM has spotty maintenance with unresolved bugs
- Requires additional middleware for common tasks
- Lacks built-in TypeScript support

**Effort**: 4-5 days initial setup

#### 2. Fastify + Prisma (Selected)
**Description**: High-performance Node.js framework with modern ORM featuring excellent TypeScript integration.

**Pros**:
- Exceptional performance (30K+ requests/second, 2.7x Express)
- Built-in JSON Schema validation and serialization
- Excellent TypeScript support
- Prisma provides type-safe database queries with auto-generated client
- Active development and modern architecture
- Schema-based validation with automatic OpenAPI generation
- Low overhead, optimized for high throughput
- First-class plugin architecture

**Cons**:
- Smaller ecosystem than Express
- Fewer tutorials and community resources
- Higher memory usage than Express (130MB vs 50MB baseline)
- Prisma has vendor lock-in via proprietary DSL
- Some Express middleware requires adaptation

**Effort**: 3-4 days initial setup

**Performance Data**:
- Fastify: ~30,000 requests per second
- Express: ~15,000 requests per second
- At 200 concurrent connections: Fastify delivers 50K RPS vs Express 17K RPS
- CPU usage: Fastify 82% less than Express under load

#### 3. NestJS + Prisma
**Description**: Enterprise-grade TypeScript framework with Angular-inspired architecture.

**Pros**:
- Strong architectural patterns (modules, controllers, services)
- Built-in dependency injection
- Excellent for large teams
- Can use either Express or Fastify under the hood
- Good for complex business logic organization
- NestJS with Fastify offers 50K RPS (vs 17K with Express)

**Cons**:
- Steeper learning curve
- More boilerplate code
- Overkill for smaller projects
- Framework overhead for simple CRUD operations
- Opinionated structure may not fit all use cases

**Effort**: 5-7 days initial setup

#### 4. Fastify + Drizzle ORM
**Description**: High-performance framework with the newest, fastest ORM option.

**Pros**:
- Drizzle is currently the fastest ORM (2025)
- SQL-first approach with TypeScript
- Tiny bundle size (~7kb), excellent for serverless
- Zero cold-start overhead
- Direct SQL control

**Cons**:
- Drizzle is newer with smaller community
- Requires solid SQL knowledge
- Less "magic" than Prisma (explicit over implicit)
- Fewer learning resources
- Migration tooling less mature than Prisma

**Effort**: 4-5 days initial setup

#### 5. Hono
**Description**: Ultralight, edge-first web framework.

**Pros**:
- Extremely lightweight
- Designed for edge/serverless
- Web-standards based (fetch API)
- Multi-runtime (Node, Deno, Bun, Cloudflare Workers)

**Cons**:
- Newer, less mature
- Smaller ecosystem
- Optimized for edge, may not be best for traditional server
- Less middleware available

**Effort**: 4-5 days initial setup

## Comparison

| Evaluation Axis | Express + TypeORM | Fastify + Prisma | NestJS + Prisma | Fastify + Drizzle | Hono |
|-----------------|-------------------|------------------|-----------------|-------------------|------|
| Performance (RPS) | 15K | 30K | 17-50K | 30K | 25K |
| Type Safety | Medium | Excellent | Excellent | Excellent | Good |
| Ecosystem Size | Largest | Large | Large | Medium | Small |
| Learning Curve | Low | Low | High | Medium | Low |
| ORM Type Safety | Medium | Excellent | Excellent | Excellent | N/A |
| Self-hosted Fit | Good | Excellent | Good | Excellent | Medium |
| MVP Timeline | Low | Low | Medium | Low | Low |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Fastify API Server                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Plugins Layer                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │   @fastify/ │  │   @fastify/ │  │    Custom       │   │  │
│  │  │   jwt       │  │   cors      │  │    Auth Plugin  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Routes Layer                         │  │
│  │  /api/auth/*   /api/projects/*   /api/branches/*         │  │
│  │  /api/spaces/* /api/keys/*       /api/sdk/*              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Services Layer                        │  │
│  │  AuthService   ProjectService   BranchService            │  │
│  │  SpaceService  TranslationService   MergeService         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Prisma Client                         │  │
│  │  Type-safe queries   Migrations   Connection pooling     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                     ┌────────────────┐                          │
│                     │   PostgreSQL   │                          │
│                     └────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive Consequences

- **High performance**: 2x+ throughput over Express benefits resource-constrained self-hosted deployments
- **Type safety end-to-end**: JSON Schema validation + Prisma types catch errors at compile time
- **Developer productivity**: Clear patterns, auto-generated Prisma client, schema-driven development
- **Built-in features**: Request validation, serialization, logging included
- **Modern ecosystem**: Active development, good Vercel/Next.js integration

### Negative Consequences

- **Smaller community**: Fewer Stack Overflow answers, tutorials than Express
- **Memory overhead**: Higher baseline memory usage (~130MB vs ~50MB)
- **Express middleware incompatibility**: Some middleware requires adaptation
- **Prisma schema lock-in**: Migration to another ORM requires rewriting data layer

### Neutral Consequences

- **Plugin architecture**: Different pattern from Express middleware (neither better nor worse)
- **JSON Schema requirement**: Additional schema definitions (but provides validation)

## Implementation Guidance

### Project Structure
```
apps/api/
├── src/
│   ├── plugins/           # Fastify plugins (auth, prisma, etc.)
│   ├── routes/            # Route handlers organized by domain
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── spaces/
│   │   ├── branches/
│   │   ├── keys/
│   │   └── sdk/
│   ├── services/          # Business logic
│   ├── schemas/           # JSON Schema definitions
│   └── utils/             # Helpers and utilities
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
└── test/                  # Tests
```

### Key Plugins to Use
- `@fastify/jwt` - JWT authentication
- `@fastify/cors` - CORS handling
- `@fastify/helmet` - Security headers
- `@fastify/rate-limit` - Rate limiting
- `@fastify/swagger` - OpenAPI documentation

### Prisma Configuration
- Enable query logging in development
- Configure connection pooling for production
- Use migrations for schema changes
- Generate client in postinstall hook

### Performance Optimization
- Enable HTTP/2 where supported
- Use Fastify's built-in serialization
- Implement response caching for SDK endpoints
- Use Prisma's `select` to fetch only needed fields

## Related Information

- ADR-0001: Monorepo Structure (API is in apps/api)
- ADR-0003: Authentication Approach (JWT integration)
- PRD Section 11.1: Architecture Overview
- PRD Appendix C: API Endpoint Summary

## References

- [Express vs Fastify vs NestJS Performance](https://medium.com/@devang.bhagdev/express-vs-nestjs-vs-fastify-api-performance-face-off-with-100-concurrent-users-22583222810d) - Benchmark comparison
- [Choosing Node.js Backend Framework](https://leapcell.io/blog/choosing-your-node-js-backend-framework-express-fastify-or-nestjs) - Framework selection guide
- [NestJS Express vs Fastify](https://medium.com/deno-the-complete-reference/nestjs-express-vs-fastify-comparison-for-hello-world-19875479e41d) - NestJS adapter comparison
- [Fastify vs NestJS](https://betterstack.com/community/guides/scaling-nodejs/nestjs-vs-fastify/) - In-depth comparison
- [Top TypeScript ORM 2025](https://www.bytebase.com/blog/top-typescript-orm/) - ORM comparison
- [Drizzle vs Prisma](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) - ORM performance analysis
- [Node.js ORMs in 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/) - Comprehensive ORM guide
