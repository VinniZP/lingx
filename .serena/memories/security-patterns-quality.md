# Security Patterns - Quality Estimation

## PR Review Security Issues Addressed

### 1. API Key Decryption Validation ✅

**Location**: `services/quality/crypto/api-key-decryptor.ts`

**Applied Fixes**:

- IV format validation: `/^[0-9a-f]{32}$/i`
- Encrypted data format validation
- Proper error handling with non-exposing messages
- Note: GCM auth tag provides cryptographic integrity validation

```typescript
// IV validation
if (!ivHex || !/^[0-9a-f]{32}$/i.test(ivHex)) {
  throw new Error('Invalid IV format: must be 32 hex characters');
}

// Encrypted data validation
if (!encrypted || encrypted.length < 32 || !/^[0-9a-f]+$/i.test(encrypted)) {
  throw new Error('Invalid encrypted data format');
}
```

### 2. DoS Prevention via Array Limits ✅

**Location**: `routes/quality-estimation.ts`

**Applied Fixes**:

- `MAX_BATCH_TRANSLATION_IDS = 1000` constant
- Zod schema: `z.array(z.string()).max(1000)`
- Runtime validation before database queries

### 3. Authorization Checks ✅

**Location**: `services/access.service.ts`

**Applied Fixes**:

- Centralized access control in dedicated service
- All routes verify user membership before operations
- Uses nested includes for efficient authorization queries

### 4. Type Safety - Replaced z.any() ✅

**Location**: `@lingx/shared/src/validation/quality.schema.ts`

**Applied Fixes**:

- Moved Zod schemas to shared package
- Proper schema for QualityIssue:

```typescript
export const qualityIssueSchema = z.object({
  type: qualityCheckTypeSchema,
  severity: qualityIssueSeveritySchema,
  message: z.string(),
});
```

### 5. Regex DoS Protection ✅

**Location**: `services/quality/ai/response-parser.ts`

**Applied Fixes**:

- 50KB limit on AI response parsing
- Prevents regex backtracking attacks

```typescript
const MAX_RESPONSE_SIZE = 50 * 1024;

export function extractJsonFromText(text: string): string {
  const searchText = text.length > MAX_RESPONSE_SIZE ? text.slice(0, MAX_RESPONSE_SIZE) : text;
  // ...
}
```

### 6. Content Hash Indexes ✅

**Location**: `prisma/migrations/20260103133755_add_content_hash_indexes/`

**Applied Fixes**:

```sql
CREATE INDEX "TranslationQualityScore_contentHash_idx"
  ON "TranslationQualityScore"("contentHash");

CREATE INDEX "TranslationQualityScore_translationId_contentHash_idx"
  ON "TranslationQualityScore"("translationId", "contentHash");
```

### 7. Error Message Specificity ✅

**Location**: `services/quality-estimation.service.ts`

**Applied Fixes**:

```typescript
if (!translation) {
  throw new NotFoundError('Translation');
}
if (!translation.value) {
  throw new ValidationError('Translation value is empty');
}
```

### 8. Magic Numbers Extracted ✅

**Location**: `services/quality-estimation.service.ts`

**Applied Fixes**:

```typescript
const EVALUATION_BATCH_SIZE = 10;
```

## Remaining Considerations

### Race Condition in Cache Check

- Documented and accepted as low-risk
- Content hash comparison at evaluation time catches stale data
- Alternative: Add `lastModifiedAt` timestamp for stricter validation

### Worker Error Tracking

- Failures logged but not metrically tracked
- Consider adding Prometheus/metrics for production monitoring

### XML Prompt Injection

- User content is XML-escaped via `escapeXml()` function
- Handles: `&`, `<`, `>`, `"`, `'`

## Environment Variables Required

- `AI_ENCRYPTION_KEY` or `MT_ENCRYPTION_KEY`: 64-char hex (32 bytes for AES-256)
- `REDIS_URL`: Redis connection for BullMQ job queues
