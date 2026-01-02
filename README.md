# Lingx

A self-hosted, developer-friendly localization management platform with git-like branching for translations.

## Features

- **Git-like Branching** - Create feature branches for translations, merge when ready
- **Space Isolation** - Separate frontend, backend, and mobile translations
- **Environment Management** - Point production/staging to different branches
- **Powerful CLI** - Pull, push, sync, and extract translations from code
- **Next.js SDK** - Full React 19 integration with hooks and ICU MessageFormat
- **Self-Hosted** - Keep your translation data under your control

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for CLI/SDK development)
- pnpm 8+

### Run with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/lingx.git
cd lingx

# Create environment file
cp .env.example .env
# Edit .env with your configuration (especially JWT_SECRET)

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Start database
docker-compose up -d postgres

# Run migrations
pnpm --filter=@lingx/api prisma migrate dev

# Seed database
pnpm --filter=@lingx/api prisma db seed

# Start development servers
pnpm dev
```

## Documentation

- [Getting Started Guide](./docs/getting-started.md)
- [CLI Reference](./packages/cli/README.md)
- [Next.js SDK Guide](./packages/sdk-nextjs/README.md)
- [Deployment Guide](./docs/deployment.md)
- [API Documentation](http://localhost:3001/docs) (when running)

## Architecture

```
lingx/
├── apps/
│   ├── api/          # Fastify backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── cli/          # CLI tool (lf command)
│   ├── sdk-nextjs/   # Next.js React SDK
│   └── shared/       # Shared types and utilities
└── docs/             # Documentation
```

## Tech Stack

- **Backend**: Fastify 5, Prisma 7, PostgreSQL
- **Frontend**: Next.js 16, React 19, TailwindCSS, shadcn/ui
- **CLI**: Commander.js, Node.js
- **SDK**: React 19, @formatjs/intl-messageformat

## Core Concepts

### Projects
Projects are the top-level container for your localization. Each project has its own set of languages, spaces, and environments.

### Spaces
Spaces let you organize translations by area (frontend, backend, mobile). Each space has its own branches and translation keys.

### Branches
Branches work like git branches for your translations. The `main` branch is created by default. Create feature branches to work on translations without affecting production.

### Environments
Environments (production, staging, development) point to specific branches. When you switch an environment's branch pointer, SDK responses update accordingly.

## CLI Overview

```bash
# Install CLI
npm install -g @lingx/cli

# Authenticate
lf auth login

# Pull translations
lf pull

# Push translations
lf push

# Extract keys from code
lf extract --format=nextjs

# Check for issues
lf check --missing --unused --validate-icu

# Branch operations
lf branch create feature-x --from=main
lf branch diff feature-x main
lf branch merge feature-x --into=main
```

## SDK Overview

```tsx
// Provider setup
import { LingxProvider } from '@lingx/sdk-nextjs';

<LingxProvider
  apiKey={process.env.LINGX_API_KEY}
  environment="production"
  project="my-app"
  space="frontend"
  defaultLanguage="en"
>
  <App />
</LingxProvider>

// Using translations
import { useTranslation } from '@lingx/sdk-nextjs';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('welcome.title')}</h1>;
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
