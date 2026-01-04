# Quality Estimation Architecture

## Overview

AI-powered translation quality scoring system with multi-language batch processing.

## Core Architecture

### Tiered Evaluation Strategy

1. **Heuristic-first** - Fast rule-based checks (format, placeholders, ICU syntax)
2. **Glossary check** - Terminology validation against project glossary
3. **AI evaluation** - Only triggered when heuristics are inconclusive or forceAI=true

Target: <$0.50 per 10K translations

### Multi-Language Batch Processing

- Evaluates ALL translations for a key in ONE AI call
- 5x fewer API calls for 5 languages
- Consistent scoring across languages (same AI context)

### Conversation-Based Retry with Zod Validation

- 7 turns per conversation
- 3 fresh starts maximum
- Max 21 total attempts
- Exponential backoff between retries

## Module Structure

```
services/quality/
├── ai/
│   ├── ai-evaluator.ts       # Multi-language AI evaluation
│   ├── circuit-breaker.ts    # Failure protection (3 failures → 30s cooldown)
│   ├── prompt-builder.ts     # XML-structured prompts
│   └── response-parser.ts    # Zod-validated JSON extraction
├── cache/
│   └── content-hasher.ts     # SHA-256 cache invalidation
├── crypto/
│   └── api-key-decryptor.ts  # AES-256-GCM decryption
├── evaluators/
│   ├── heuristic-evaluator.ts
│   └── glossary-evaluator.ts
├── persistence/
│   └── score-repository.ts
├── scoring/
│   └── score-calculator.ts   # Pure scoring functions
└── factory.ts                # Dependency injection
```

## Key Services

### QualityEstimationService

- Main orchestrator for quality evaluation
- Delegates to specialized evaluators
- Manages caching via content hash

### AccessService (Separation of Concerns)

- Centralized authorization logic
- `verifyTranslationAccess()` - Check user can access translation
- `verifyBranchAccess()` - Check user can access branch, returns projectId
- `verifyProjectAccess()` - Check user membership + optional role

### BatchEvaluationService

- Handles bulk quality evaluation jobs
- Pre-filters cache hits before queueing
- Uses BullMQ for job processing

## Caching Strategy

### Content Hash

- SHA-256 of `sourceValue + targetValue`
- Stored in `TranslationQualityScore.contentHash`
- Cache invalidated when hash changes

### Database Indexes

```prisma
@@index([contentHash])
@@index([translationId, contentHash])
```

## Score Calculation

### MQM-Based Scoring

- **Accuracy**: 40% weight
- **Fluency**: 25% weight
- **Terminology**: 15% weight
- **Format**: 20% weight

### Thresholds

- `autoApproveThreshold`: 80 (default)
- `flagThreshold`: 60 (default)

## Circuit Breaker Pattern

- 3 failures within 60 seconds → OPEN state
- 30 second cooldown before allowing retry
- Prevents cascading AI failures
- Per-evaluator instance (not global)

## Prompt Structure

Uses XML format for clear language separation:

```xml
<translation lang="de">
  <key>greeting</key>
  <source lang="en">Hello World</source>
  <target>Hallo Welt</target>
</translation>
```

## Cost Optimization

- Anthropic prompt caching: 90% cost reduction
- OpenAI prompt caching: 50% cost reduction
- Heuristic-first prevents unnecessary AI calls
- Multi-language batching: 5x fewer calls
