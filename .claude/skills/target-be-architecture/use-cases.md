# Use Cases

Use cases encapsulate complex business operations that span multiple services or require coordinated authorization.

## When to Use

| Scenario | Use Case? |
|----------|-----------|
| Simple CRUD | No - use service directly |
| Single service, simple auth | No - use service directly |
| Multiple services involved | **Yes** |
| Complex authorization logic | **Yes** |
| Transaction spanning services | **Yes** |
| Workflow with multiple steps | **Yes** |

## Structure

```typescript
// use-cases/merge-branch.use-case.ts

import type { PrismaClient } from '@prisma/client';
import { BranchService } from '../services/branch.service.js';
import { TranslationService } from '../services/translation.service.js';
import { Result, ok, err } from '../lib/result.js';

export interface MergeBranchInput {
  sourceBranchId: string;
  targetBranchId: string;
  userId: string;
  projectId: string;
}

export interface MergeBranchOutput {
  merged: number;
  conflicts: number;
}

export class MergeBranchUseCase {
  private branchService: BranchService;
  private translationService: TranslationService;

  constructor(private prisma: PrismaClient) {
    this.branchService = new BranchService(prisma);
    this.translationService = new TranslationService(prisma);
  }

  async execute(input: MergeBranchInput): Promise<Result<MergeBranchOutput, AppError>> {
    // 1. Authorization
    const hasAccess = await this.checkAccess(input);
    if (!hasAccess) {
      return err(new ForbiddenError('Not authorized to merge'));
    }

    // 2. Validation
    const sourceBranch = await this.branchService.findById(input.sourceBranchId);
    if (!sourceBranch) {
      return err(new NotFoundError('Source branch'));
    }

    const targetBranch = await this.branchService.findById(input.targetBranchId);
    if (!targetBranch) {
      return err(new NotFoundError('Target branch'));
    }

    // 3. Business logic
    const diff = await this.branchService.diff(
      input.sourceBranchId,
      input.targetBranchId
    );

    if (diff.conflicts.length > 0) {
      return err(new ConflictError('Merge conflicts detected', {
        conflicts: diff.conflicts,
      }));
    }

    // 4. Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      return this.branchService.merge(
        input.sourceBranchId,
        input.targetBranchId,
        tx
      );
    });

    return ok({
      merged: result.merged,
      conflicts: 0,
    });
  }

  private async checkAccess(input: MergeBranchInput): Promise<boolean> {
    // Complex authorization logic
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: input.projectId,
          userId: input.userId,
        },
      },
    });

    return member?.role === 'ADMIN' || member?.role === 'MANAGER';
  }
}
```

## Usage in Routes

```typescript
fastify.post('/api/branches/:id/merge', async (request, reply) => {
  const useCase = new MergeBranchUseCase(fastify.prisma);

  const result = await useCase.execute({
    sourceBranchId: request.params.id,
    targetBranchId: request.body.targetBranchId,
    userId: request.user.userId,
    projectId: request.body.projectId,
  });

  if (result.ok) {
    return result.data;
  }

  // Error handling based on type
  if (result.error instanceof ForbiddenError) {
    return reply.status(403).send({ error: result.error.message });
  }
  if (result.error instanceof ConflictError) {
    return reply.status(409).send({
      error: result.error.message,
      conflicts: result.error.details?.conflicts,
    });
  }

  throw result.error;
});
```

## Patterns

### 1. Input/Output Types

Always define clear input and output interfaces:

```typescript
export interface CreateProjectWithTeamInput {
  name: string;
  slug: string;
  ownerId: string;
  teamMembers: Array<{
    userId: string;
    role: ProjectRole;
  }>;
}

export interface CreateProjectWithTeamOutput {
  project: ProjectWithLanguages;
  invitesSent: number;
}
```

### 2. Authorization First

Check authorization before any business logic:

```typescript
async execute(input: Input): Promise<Result<Output, AppError>> {
  // 1. Authorization - fail fast
  if (!await this.checkAccess(input)) {
    return err(new ForbiddenError('Not authorized'));
  }

  // 2. Rest of the logic
  // ...
}
```

### 3. Compose Services

Use cases orchestrate multiple services:

```typescript
constructor(private prisma: PrismaClient) {
  this.projectService = new ProjectService(prisma);
  this.memberService = new MemberService(prisma);
  this.notificationService = new NotificationService(prisma);
}
```

### 4. Transaction Management

Use cases manage transaction boundaries:

```typescript
async execute(input: Input): Promise<Result<Output, AppError>> {
  return this.prisma.$transaction(async (tx) => {
    // All services use the same transaction
    const project = await this.projectService.create(input, tx);
    await this.memberService.addMembers(project.id, input.members, tx);
    return ok({ project });
  });
}
```

## Example: Import Translations Use Case

```typescript
export interface ImportTranslationsInput {
  branchId: string;
  projectId: string;
  userId: string;
  data: Record<string, Record<string, string>>; // { key: { lang: value } }
  options: {
    overwrite: boolean;
    createMissing: boolean;
  };
}

export interface ImportTranslationsOutput {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
}

export class ImportTranslationsUseCase {
  private branchService: BranchService;
  private translationService: TranslationService;

  constructor(private prisma: PrismaClient) {
    this.branchService = new BranchService(prisma);
    this.translationService = new TranslationService(prisma);
  }

  async execute(
    input: ImportTranslationsInput
  ): Promise<Result<ImportTranslationsOutput, AppError>> {
    // 1. Authorization
    const member = await this.checkMembership(input.projectId, input.userId);
    if (!member || member.role === 'VIEWER') {
      return err(new ForbiddenError('Cannot import translations'));
    }

    // 2. Validate branch exists
    const branch = await this.branchService.findById(input.branchId);
    if (!branch) {
      return err(new NotFoundError('Branch'));
    }

    // 3. Process import
    const warnings: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const [keyName, translations] of Object.entries(input.data)) {
        // Find or create key
        let key = await this.translationService.findKeyByName(
          input.branchId,
          keyName,
          tx
        );

        if (!key) {
          if (input.options.createMissing) {
            key = await this.translationService.createKey(
              input.branchId,
              keyName,
              tx
            );
            created++;
          } else {
            warnings.push(`Key "${keyName}" not found, skipped`);
            skipped++;
            continue;
          }
        }

        // Set translations
        for (const [lang, value] of Object.entries(translations)) {
          const existing = await this.translationService.getTranslation(
            key.id,
            lang,
            tx
          );

          if (existing && !input.options.overwrite) {
            skipped++;
            continue;
          }

          await this.translationService.setTranslation(key.id, lang, value, tx);
          updated++;
        }
      }
    });

    return ok({ created, updated, skipped, warnings });
  }

  private async checkMembership(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
```

## Anti-patterns

### Don't duplicate service logic

```typescript
// BAD - duplicating service logic in use case
async execute(input: Input) {
  const project = await this.prisma.project.create({ ... }); // Direct Prisma
}

// GOOD - delegate to service
async execute(input: Input) {
  const project = await this.projectService.create(input);
}
```

### Don't skip authorization

```typescript
// BAD - assuming caller checked auth
async execute(input: Input) {
  // Just do the work...
}

// GOOD - use case owns authorization
async execute(input: Input) {
  if (!await this.checkAccess(input)) {
    return err(new ForbiddenError());
  }
  // Then do the work...
}
```
