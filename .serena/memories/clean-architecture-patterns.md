# Clean Architecture Patterns

## Applied Patterns

### 1. Separation of Concerns

#### Before (Anti-pattern)

```typescript
// Routes had authorization logic mixed with business logic
app.post('/api/quality', async (request) => {
  // Authorization check inline
  const branch = await prisma.branch.findUnique({...});
  if (!branch || branch.space.project.members.length === 0) {
    throw new ForbiddenError();
  }
  // Business logic
  return qualityService.evaluate(...);
});
```

#### After (Clean)

```typescript
// Routes are thin: validate → authorize → delegate
app.post('/api/quality', async (request) => {
  await accessService.verifyBranchAccess(userId, branchId);
  return qualityService.evaluate(...);
});
```

### 2. Centralized Access Control (AccessService)

**Location**: `services/access.service.ts`

**Methods**:

```typescript
// Check user can access a specific translation
async verifyTranslationAccess(userId: string, translationId: string): Promise<void>

// Check user can access branch, returns projectId for subsequent operations
async verifyBranchAccess(userId: string, branchId: string): Promise<string>

// Check user membership with optional role requirement
async verifyProjectAccess(userId: string, projectId: string, roles?: string[]): Promise<void>
```

**Benefits**:

- Single source of truth for authorization
- Easily testable (10 unit tests)
- Consistent error handling (NotFoundError, ForbiddenError)

### 3. Shared Validation Schemas

**Location**: `@lingx/shared/src/validation/quality.schema.ts`

**Exports**:

```typescript
// Enums
export const qualityIssueSeveritySchema = z.enum(['error', 'warning', 'info']);
export const qualityCheckTypeSchema = z.enum([...]);
export const aiProviderSchema = z.enum(['ANTHROPIC', 'OPENAI', 'GOOGLE_AI', 'MISTRAL']);

// Objects
export const qualityIssueSchema = z.object({...});
export const qualityScoreResponseSchema = z.object({...});
export const branchQualitySummarySchema = z.object({...});
export const qualityScoringConfigSchema = z.object({...});
```

**Usage in API**:

```typescript
import { qualityScoreResponseSchema } from '@lingx/shared';

// Route response validation
schema: { response: { 200: qualityScoreResponseSchema } }
```

**Usage in Frontend**:

```typescript
import type { QualityScoreResponse } from '@lingx/shared';

// Type-safe API responses
const score: QualityScoreResponse = await api.getScore(id);
```

### 4. Factory Pattern for Dependency Injection

**Location**: `services/quality/factory.ts`

```typescript
export function createQualityEstimationService(prisma: PrismaClient): QualityEstimationService {
  const scoreRepository = new ScoreRepository(prisma);
  const circuitBreaker = new CircuitBreaker();
  const aiEvaluator = new AIEvaluator(circuitBreaker);
  const glossaryEvaluator = new GlossaryEvaluator(prisma);
  const keyContextService = new KeyContextService(prisma);

  return new QualityEstimationService(
    prisma,
    scoreRepository,
    aiEvaluator,
    glossaryEvaluator,
    keyContextService
  );
}

export function createBatchEvaluationService(
  prisma: PrismaClient,
  queue: Queue
): BatchEvaluationService {
  return new BatchEvaluationService(prisma, queue);
}
```

### 5. Repository Pattern

**Location**: `services/quality/persistence/score-repository.ts`

**Methods**:

```typescript
save(translationId: string, score: ScoreInput): Promise<StoredScore>
findByTranslationId(id: string): Promise<StoredScore | null>
getBranchSummary(branchId: string): Promise<BranchSummary>
formatStoredScore(stored: StoredScore): FormattedScore
delete(translationId: string): Promise<void>
deleteByBranch(branchId: string): Promise<number>
```

### 6. Pure Functions for Testability

**Location**: `services/quality/scoring/score-calculator.ts`

```typescript
// Pure functions - no side effects, easily testable
export function calculateWeightedScore(
  accuracy: number,
  fluency: number,
  terminology: number,
  format: number
): number;

export function determinePassFail(score: number, threshold: number): boolean;
```

## File Organization

```
services/
├── access.service.ts           # Authorization (NEW)
├── quality-estimation.service.ts  # Main orchestrator
├── batch-evaluation.service.ts    # Batch processing (NEW)
└── quality/
    ├── factory.ts                 # DI container
    ├── index.ts                   # Public exports
    ├── ai/                        # AI evaluation
    ├── cache/                     # Caching logic
    ├── crypto/                    # Encryption
    ├── evaluators/                # Evaluation strategies
    ├── persistence/               # Data access
    └── scoring/                   # Pure scoring logic

routes/
└── quality-estimation.ts          # Thin HTTP handlers

packages/shared/src/validation/
├── quality.schema.ts              # Shared Zod schemas
└── index.ts                       # Exports
```

## Testing Structure

```
tests/
├── unit/
│   ├── access.service.test.ts         # 10 tests
│   ├── batch-evaluation.service.test.ts # 7 tests
│   ├── quality-estimation.service.test.ts # 17 tests
│   └── quality/
│       ├── ai-evaluator.test.ts
│       ├── circuit-breaker.test.ts
│       ├── response-parser.test.ts
│       └── crypto/
│           └── api-key-decryptor.test.ts
└── integration/
    └── quality/
        └── score-repository.test.ts
```
