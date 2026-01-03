# Test Coverage - Quality Estimation Feature

## Unit Tests Added

### AccessService Tests (10 tests)

**File**: `tests/unit/access.service.test.ts`

- `verifyTranslationAccess()`
  - ✅ throws NotFoundError when translation not found
  - ✅ throws ForbiddenError when user not a member
  - ✅ succeeds when user is a member

- `verifyBranchAccess()`
  - ✅ throws NotFoundError when branch not found
  - ✅ throws ForbiddenError when user not a member
  - ✅ returns projectId when user is a member

- `verifyProjectAccess()`
  - ✅ throws NotFoundError when project not found
  - ✅ throws ForbiddenError when user not a member
  - ✅ throws ForbiddenError when user role insufficient
  - ✅ succeeds when user has required role

### BatchEvaluationService Tests (7 tests)

**File**: `tests/unit/batch-evaluation.service.test.ts`

- ✅ processes empty array
- ✅ pre-filters cache hits
- ✅ queues only translations needing evaluation
- ✅ returns job stats (total, cached, queued)
- ✅ handles mixed cache hits and misses
- ✅ validates user access before processing
- ✅ handles worker queue failures gracefully

### QualityEstimationService Tests (17 tests)

**File**: `tests/unit/quality-estimation.service.test.ts`

- `evaluate()`
  - ✅ throws when translation not found
  - ✅ throws when translation value is empty
  - ✅ uses formatStoredScore when cache matches
  - ✅ scores format only when no source translation
  - ✅ runs heuristic checks and returns score
  - ✅ reduces score when glossary issues found
  - ✅ falls back to heuristic when AI decryption fails
  - ✅ falls back to heuristic when AI provider not active

- `evaluateBatch()`
  - ✅ processes empty array
  - ✅ continues processing after individual failures

- `getBranchSummary()`
  - ✅ delegates to score repository

- `getConfig()`
  - ✅ returns stored config when exists
  - ✅ returns default config when none exists

- `updateConfig()`
  - ✅ upserts config via prisma

- `validateICUSyntax()`
  - ✅ returns valid for simple text
  - ✅ returns valid for correct ICU plurals
  - ✅ returns error for invalid ICU syntax

- `evaluateKeyAllLanguages()`
  - ✅ uses heuristics when AI not configured
  - ✅ falls back to heuristics when AI provider not active

### AIEvaluator Tests (18 tests)

**File**: `tests/unit/quality/ai-evaluator.test.ts`

- `evaluateSingle()`
  - ✅ returns MQM scores for valid response
  - ✅ handles provider-specific API calls
  - ✅ retries on invalid JSON
  - ✅ fails after max retries

- `evaluateMultiLanguage()`
  - ✅ returns results for all languages
  - ✅ checks circuit breaker before attempting
  - ✅ records success in circuit breaker
  - ✅ uses conversation retry on JSON errors
  - ✅ records failure after exhausting retries
  - ✅ accumulates cache metrics across turns
  - ✅ includes related keys with all languages

- Circuit breaker delegation
  - ✅ delegates canAttempt to circuit breaker
  - ✅ delegates getRemainingOpenTime to circuit breaker

- Error handling
  - ✅ throws on no JSON in response
  - ✅ throws on invalid MQM structure

### CircuitBreaker Tests (12 tests)

**File**: `tests/unit/quality/circuit-breaker.test.ts`

- ✅ allows attempts when closed
- ✅ opens after threshold failures
- ✅ resets after window expires
- ✅ returns remaining open time
- ✅ transitions to half-open after cooldown
- ✅ closes on success in half-open state

### ResponseParser Tests (15 tests)

**File**: `tests/unit/quality/response-parser.test.ts`

- `extractJsonFromText()`
  - ✅ extracts plain JSON
  - ✅ extracts from markdown code blocks
  - ✅ extracts from text with surrounding content
  - ✅ throws when no JSON found
  - ✅ limits input to 50KB (DoS protection)

- `parseMQMResponse()`
  - ✅ parses valid MQM response
  - ✅ validates accuracy/fluency/terminology bounds
  - ✅ filters malformed issues

- `parseWithZodSchema()`
  - ✅ validates against provided schema
  - ✅ throws ZodError on validation failure

### API Key Decryptor Tests (22 tests)

**File**: `tests/unit/quality/crypto/api-key-decryptor.test.ts`

- `getEncryptionKey()`
  - ✅ returns key from AI_ENCRYPTION_KEY
  - ✅ falls back to MT_ENCRYPTION_KEY
  - ✅ throws if no key set
  - ✅ throws if key wrong length

- `decryptApiKey()`
  - ✅ decrypts valid encrypted value
  - ✅ handles unicode characters
  - ✅ handles empty string

- IV validation
  - ✅ throws for empty IV
  - ✅ throws for IV too short/long
  - ✅ throws for non-hex IV
  - ✅ accepts uppercase hex IV

- Auth tag verification
  - ✅ throws for tampered encrypted data
  - ✅ throws for tampered auth tag
  - ✅ throws for wrong key
  - ✅ throws for wrong IV

- Round-trip tests
  - ✅ encrypts and decrypts multiple values
  - ✅ works with long API keys

### Integration Tests

**ScoreRepository Tests** (17 tests)
**File**: `tests/integration/quality/score-repository.test.ts`

- ✅ saves quality score
- ✅ updates existing score
- ✅ finds by translation ID
- ✅ returns null for non-existent
- ✅ formats stored score correctly
- ✅ gets branch summary with distribution
- ✅ calculates language-specific averages
- ✅ deletes score
- ✅ deletes all scores by branch

## Total: 100+ tests covering quality estimation
