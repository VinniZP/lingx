# Contributing to Lingx

Thank you for your interest in contributing to Lingx! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **pnpm** 9 or higher
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Git**

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/lingx.git
   cd lingx
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start the database**

   ```bash
   docker compose up -d
   ```

4. **Set up environment variables**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

5. **Run database migrations**

   ```bash
   pnpm --filter @lingx/api db:migrate
   ```

6. **Start development servers**

   ```bash
   pnpm dev
   ```

   This starts:
   - API at http://localhost:3001
   - Web at http://localhost:3000

## Project Structure

```
lingx/
├── apps/
│   ├── api/          # Fastify backend API
│   └── web/          # Next.js frontend
├── packages/
│   ├── cli/          # CLI tool (@lingx/cli)
│   ├── sdk-nextjs/   # Next.js SDK (@lingx/sdk-nextjs)
│   ├── shared/       # Shared types and utilities
│   └── config/       # Shared ESLint and TypeScript configs
└── docs/             # Documentation
```

## Making Changes

### Branch Naming

Create a branch with a descriptive name:

```bash
git checkout -b feat/add-language-detection
git checkout -b fix/translation-sync-bug
git checkout -b docs/improve-sdk-guide
```

### Code Style

- We use **ESLint** and **Prettier** for code formatting
- Run `pnpm lint` to check for issues
- Run `pnpm lint:fix` to auto-fix issues
- TypeScript strict mode is enabled

### Testing

- Run `pnpm test` to run all tests
- Run `pnpm test:watch` for watch mode
- Write tests for new features and bug fixes

### Building

- Run `pnpm build` to build all packages
- Run `pnpm typecheck` to verify TypeScript types

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

### Examples

```bash
feat(api): add branch comparison endpoint
fix(sdk): resolve race condition in language detection
docs(cli): add examples for sync command
chore(deps): update prisma to v7.2
```

## Pull Request Process

1. **Update your fork**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**

   ```bash
   git push origin feat/your-feature
   ```

3. **Create a Pull Request**

   - Fill out the PR template completely
   - Link any related issues
   - Add screenshots for UI changes

4. **Review Process**

   - All PRs require at least one review
   - CI must pass (lint, typecheck, tests, build)
   - Address review feedback promptly

5. **After Merge**

   - Delete your branch
   - Pull the latest changes

### PR Checklist

Before submitting:

- [ ] Code follows the project's style guidelines
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] All CI checks pass locally (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`)
- [ ] Commit messages follow Conventional Commits

## Getting Help

- **Questions**: Use [GitHub Discussions](../../discussions)
- **Bugs**: Open an [issue](../../issues/new?template=bug_report.yml)
- **Features**: Open an [issue](../../issues/new?template=feature_request.yml)

## Recognition

Contributors are recognized in:
- GitHub's contributor graph
- Release notes for significant contributions

Thank you for contributing to Lingx!
