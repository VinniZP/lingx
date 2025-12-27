# ADR-0003: Authentication Approach

## Status

Accepted

## Context

Localeflow requires authentication for multiple access patterns:

1. **Web Application**: Users accessing the translation management UI via browser
2. **CLI Tool**: Developers using command-line operations (pull, push, sync, branch operations)
3. **SDKs**: Applications fetching translations at runtime (Next.js, Angular)

Authentication requirements from PRD:
- FR-WEB-020: User registration with email/password
- FR-WEB-021: User authentication with JWT
- FR-WEB-022: Role-based access (developer, manager)
- FR-WEB-023: API key generation for SDK/CLI access
- NFR-SEC-003: JWT tokens expire after 24 hours
- NFR-SEC-004: API keys can be revoked
- NFR-SEC-005: Rate limiting on authentication endpoints

Key constraints:
- Self-hosted deployment (no external identity provider required)
- Must support both interactive (web) and programmatic (CLI/SDK) access
- Simple setup for MVP (no OAuth providers initially)
- Secure credential storage and transmission

## Decision

Adopt **JWT-based email/password authentication** with separate **API keys for CLI/SDK access**.

### Decision Details

| Item | Content |
|------|---------|
| **Decision** | Use JWT access tokens (24h expiry) for web sessions, plus revocable API keys for CLI/SDK |
| **Why now** | Authentication architecture affects all API endpoints, user management, and client implementations |
| **Why this** | Stateless JWTs scale well for self-hosted deployments; API keys provide simple CLI/SDK integration without complex token refresh flows |
| **Known unknowns** | Optimal JWT expiry time for user experience; API key rotation best practices for production |
| **Kill criteria** | If security audits reveal fundamental JWT vulnerabilities that cannot be mitigated, or if real-time revocation becomes critical |

## Rationale

The dual-token approach addresses different use cases optimally:

1. **JWTs for Web**: Stateless authentication scales without session storage, ideal for single-server self-hosted deployments
2. **API Keys for CLI/SDK**: Long-lived credentials that don't require interactive login, with server-side revocation capability

This approach avoids the complexity of OAuth while providing sufficient security for MVP.

### Options Considered

#### 1. Session-Based Authentication (Cookies)
**Description**: Server stores session data in database/Redis, client receives session ID cookie.

**Pros**:
- Immediate revocation (delete session from store)
- HttpOnly cookies prevent JavaScript access
- Mature, well-understood approach
- Smaller payload than JWTs
- Prevents JavaScript from accessing auth-related secrets with HttpOnly option

**Cons**:
- Requires server-side session storage (Redis or database)
- Session store becomes single point of failure
- Harder to scale horizontally without shared session store
- Cookies harder to handle on mobile and CLI applications
- Session-based authentication isn't great for mobile apps

**Effort**: 4-5 days implementation

#### 2. JWT-Based Authentication (Selected)
**Description**: Server issues signed JWT tokens containing user claims. Tokens are validated locally without database lookup.

**Pros**:
- Stateless - no server-side session storage required
- Easy horizontal scaling (any server can validate)
- JWTs are perfect for modern web apps, especially single-page ones
- Contains user claims (role, permissions) in token
- Works well across web, CLI, and mobile
- Simpler self-hosted deployment
- JWTs are handy for microservices architectures

**Cons**:
- Cannot be invalidated before expiry (without blacklist)
- Larger payload than session cookies
- Token theft gives access until expiry
- If access permissions change, user retains old permissions until token expires
- Requires careful handling of refresh tokens

**Mitigation**:
- Short expiry (24h) limits damage window
- Critical operations (password change) invalidate all tokens via version counter
- Secure HttpOnly cookie storage for web

**Effort**: 3-4 days implementation

#### 3. OAuth 2.0 Only (External Providers)
**Description**: Delegate authentication entirely to external OAuth providers (Google, GitHub, etc.).

**Pros**:
- No password management responsibility
- Leverages provider's security infrastructure
- Users have fewer passwords to manage
- Built-in MFA from providers

**Cons**:
- Requires external service dependencies
- Complex for self-hosted environments
- Users must have accounts with providers
- More complex implementation
- Not suitable for air-gapped deployments

**Effort**: 5-7 days implementation

#### 4. Passport.js Integration
**Description**: Use Passport.js authentication middleware for Node.js with multiple strategy support.

**Pros**:
- Flexible strategy system (local, OAuth, etc.)
- Large ecosystem of authentication strategies
- Battle-tested in production environments
- Supports multiple authentication methods simultaneously

**Cons**:
- Additional dependency with learning curve
- Express-centric (integration with Fastify requires adapters)
- Adds abstraction layer that may not be needed for MVP
- Some strategies are poorly maintained

**Effort**: 4-5 days implementation

#### 5. Hybrid: Short JWT + Refresh Token
**Description**: Short-lived access tokens (15 min) with longer refresh tokens (7 days) stored server-side.

**Pros**:
- Short access tokens limit exposure window
- Refresh tokens enable server-side revocation
- Best of both worlds (stateless + revocable)
- Combining benefits of session tokens and JWTs

**Cons**:
- More complex implementation
- Requires refresh token storage and rotation
- More complex client-side token management
- Additional API endpoints for token refresh

**Effort**: 5-6 days implementation

## Comparison

| Evaluation Axis | Session-Based | JWT (24h) | OAuth Only | Passport.js | Hybrid JWT |
|-----------------|---------------|-----------|------------|-------------|------------|
| Implementation Complexity | Medium | Low | High | Medium | High |
| Scalability | Low | High | High | Medium | High |
| Revocation Speed | Instant | 24h max | Instant | Varies | Near-instant |
| Self-hosted Simplicity | Medium | High | Low | Medium | Medium |
| CLI/SDK Support | Poor | Good | Poor | Medium | Good |
| MVP Timeline | Medium | Low | High | Medium | High |

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Web Application                                                 │
│  ┌──────────────┐    POST /auth/login     ┌──────────────────┐ │
│  │   Browser    │ ──────────────────────→ │   Fastify API    │ │
│  │              │ ←────────────────────── │                  │ │
│  │  (HttpOnly   │    JWT in HttpOnly      │  Validate creds  │ │
│  │   Cookie)    │       Cookie            │  Issue JWT       │ │
│  └──────────────┘                         └──────────────────┘ │
│                                                                  │
│  CLI / SDK                                                       │
│  ┌──────────────┐    Authorization:       ┌──────────────────┐ │
│  │     CLI      │    Bearer <api-key>     │   Fastify API    │ │
│  │              │ ──────────────────────→ │                  │ │
│  │   (stores    │                         │  Validate key    │ │
│  │   API key)   │                         │  Check revoked   │ │
│  └──────────────┘                         └──────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Types

| Token Type | Purpose | Storage | Expiry | Revocation |
|------------|---------|---------|--------|------------|
| JWT Access Token | Web session authentication | HttpOnly cookie | 24 hours | Via version counter |
| API Key | CLI/SDK authentication | Local config file | Never (until revoked) | Server-side flag |

## Consequences

### Positive Consequences

- **Simple self-hosted deployment**: No Redis or session store required
- **Scalable architecture**: Stateless JWTs work on any server instance
- **CLI/SDK friendly**: API keys are simple to configure and use
- **Reasonable security**: HttpOnly cookies for web, revocable API keys for CLI
- **Fast validation**: JWT verification is cryptographic, no database lookup

### Negative Consequences

- **Delayed revocation for web**: JWT valid until expiry (max 24h)
- **JWT expiry is an MVP trade-off**: 2025 security best practices (RFC 8725) recommend 5-15 minute access tokens with refresh tokens. The 24h expiry simplifies MVP implementation but should be reduced post-MVP with a proper refresh token flow for enhanced security.
- **Password management**: Must implement secure password hashing and storage
- **Token management**: CLI users must manage API keys securely
- **No SSO out of the box**: Users must create accounts specifically for Localeflow

### Neutral Consequences

- **Standard auth patterns**: Common approach familiar to most developers
- **Future OAuth integration**: Can add OAuth strategies later as optional enhancement

## Implementation Guidance

### JWT Implementation
- Sign tokens with RS256 (asymmetric) for future microservices expansion, or HS256 (symmetric) for simplicity
- Include claims: `sub` (userId), `role`, `tokenVersion`, `exp`, `iat`
- Set expiry to 24 hours as per NFR-SEC-003
- Store in HttpOnly, Secure, SameSite=Strict cookie for web

### API Key Implementation
- Generate cryptographically random keys (32+ bytes)
- Store hashed version in database (bcrypt not needed, SHA-256 sufficient for random keys)
- Include key prefix for identification (e.g., `tk_live_...`)
- Support key naming for user organization
- Implement last-used timestamp for audit

### Password Security
- Hash with bcrypt, cost factor 12+ (per NFR-SEC-002)
- Enforce minimum password requirements
- Implement rate limiting on login (10 req/min per NFR-SEC-005)

### Critical Operations
- Password change: Increment user's `tokenVersion` to invalidate all JWTs
- Account lockout: After 5 failed attempts, require email verification
- API key revocation: Mark as revoked in database, check on every request

## Related Information

- ADR-0004: API Framework Selection (Fastify authentication plugins)
- PRD Section 5.1.6: User Management requirements
- PRD Section 6.3: Security requirements

## References

- [JWTs vs Sessions: Which is Right?](https://stytch.com/blog/jwts-vs-sessions-which-is-right-for-you/) - Comprehensive comparison
- [JWT vs Session Authentication](https://dev.to/codeparrot/jwt-vs-session-authentication-1mol) - Developer perspective
- [Combining Session Tokens and JWTs](https://clerk.com/blog/combining-the-benefits-of-session-tokens-and-jwts) - Hybrid approach analysis
- [Session vs Token Authentication](https://www.authgear.com/post/session-vs-token-authentication) - Security trade-offs
- [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies) - Modern auth patterns
