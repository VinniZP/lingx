# Design Document: AI Quality Estimation

## Overview

This Design Document defines the technical implementation for AI Quality Estimation in Lingx. The feature provides automated translation quality scoring using a tiered heuristic-first approach to minimize token costs while providing actionable quality insights.

## Design Summary (Meta)

```yaml
design_type: "new_feature"
risk_level: "low"
main_constraints:
  - "Cost efficiency: <$0.50/10K translations"
  - "Latency: <200ms heuristics, <5s AI (batched)"
  - "70%+ translations scored without AI"
biggest_risks:
  - "Heuristic false positives/negatives"
  - "AI model inconsistency across providers"
  - "Score storage growth at scale"
unknowns:
  - "Optimal heuristic thresholds per language pair"
  - "User adoption of quality-based workflows"
```

## Background and Context

### Prerequisite Documents

| Document | Related Decisions |
|----------|-------------------|
| [PRD-quality-estimation.md](../prd/PRD-quality-estimation.md) | Feature requirements and user journeys |
| [AI Translation Service](../../apps/api/src/services/ai-translation.service.ts) | Existing AI infrastructure |
| [MT Batch Worker](../../apps/api/src/workers/mt-batch.worker.ts) | Background job patterns |

---

## Existing Infrastructure

**IMPORTANT**: We already have a comprehensive quality check system in `packages/shared/src/validation/quality-checks/`. The new AI Quality Estimation feature will **extend** this system, not replace it.

### Existing Quality Checks Module

| File | Purpose | Reuse Strategy |
|------|---------|----------------|
| `types.ts` | `QualityIssue`, `QualityCheckResult`, `QualityChecker` interfaces | **Extend** - add scoring types |
| `placeholder-check.ts` | Checks missing/extra `{variables}` | **Reuse as-is** |
| `whitespace-check.ts` | Checks leading/trailing, double spaces, tabs | **Reuse as-is** |
| `punctuation-check.ts` | Checks ending punctuation mismatch | **Reuse as-is** |
| `length-check.ts` | Uses `LANGUAGE_RATIOS` for expansion prediction | **Reuse as-is** |
| `runner.ts` | `runQualityChecks()`, `runBatchQualityChecks()` | **Extend** - add scoring |
| `index.ts` | Module exports | **Extend** - export new functions |

### Existing CLI Integration

The CLI already supports quality checks via `lingx check --quality`:

```bash
# Current behavior (pass/fail issues)
$ lingx check --quality

Quality Checks

  checkout.total
    ✗ [ja] Missing placeholder: {currency}
    ~ [de] Translation has unexpected trailing whitespace

Found 1 error(s), 1 warning(s) in 2 key(s)
```

### What Needs to Be Added

| Component | Location | Description |
|-----------|----------|-------------|
| **ICU Syntax Checker** | `quality-checks/icu-syntax-check.ts` | Parse with `@messageformat/parser` |
| **Score Calculator** | `quality-checks/score-calculator.ts` | Convert issues → 0-100 score |
| **Glossary Checker** | API service only (needs DB) | Check required glossary terms |
| **AI Escalation** | API service | Trigger AI for uncertain cases |
| **Score Storage** | Prisma model | Persist scores per translation |

### Key Design Decision: Shared vs API-Only

| Check | Shared Package | API Only | Reason |
|-------|----------------|----------|--------|
| Placeholder | ✅ | | No DB needed |
| Whitespace | ✅ | | No DB needed |
| Punctuation | ✅ | | No DB needed |
| Length | ✅ | | Uses static `LANGUAGE_RATIOS` |
| ICU Syntax | ✅ | | Parser is pure function |
| **Glossary** | | ✅ | Needs DB lookup |
| **AI Evaluation** | | ✅ | Needs AI service |
| **Score Storage** | | ✅ | Needs DB |

### Agreement Checklist

#### Scope
- [x] Level 1: Heuristic scoring (ICU, placeholders, length, glossary)
- [x] Level 2: AI evaluation (accuracy, fluency, terminology, format)
- [x] ICU pre-check on save (separate from scoring)
- [x] Score storage and retrieval
- [x] API endpoints for scoring operations
- [x] UI integration (translation editor, dashboard)
- [x] CLI quality check command

#### Non-Scope (Explicitly not changing)
- [ ] Auto-fix low-quality translations
- [ ] Block publishing based on score
- [ ] Translation memory score integration
- [ ] SDK runtime quality checks

#### Constraints
- [x] Scoring cost: <20% of translation cost overhead
- [x] Heuristic latency: <200ms
- [x] AI evaluation: Background job, <5s per batch
- [x] Score persistence: Permanent storage

---

## Technical Architecture

### System Flow

```
Translation Change (save/AI generate)
           │
           ▼
┌──────────────────────┐
│ ICU Pre-Check        │ ─── Invalid ──→ Block save, show error
│ (@messageformat)     │
└──────────┬───────────┘
           │ Valid
           ▼
┌──────────────────────┐
│ Level 1: Heuristics  │ ─── All pass ──→ Score: 90-100
│ (sync, <50ms)        │                   evaluationType: "heuristic"
└──────────┬───────────┘
           │ Uncertain/Failed
           ▼
┌──────────────────────┐
│ Queue AI Evaluation  │
│ (BullMQ background)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Level 2: AI Scoring  │ ─── Complete ──→ Score: 0-100
│ (async, batched)     │                   evaluationType: "ai"
└──────────────────────┘
```

---

## Database Schema

### New Models

```prisma
// apps/api/prisma/schema.prisma

model TranslationQualityScore {
  id              String   @id @default(uuid())
  translationId   String   @unique
  translation     Translation @relation(fields: [translationId], references: [id], onDelete: Cascade)

  // Overall score 0-100
  score           Int

  // Dimension breakdown (nullable - only set for AI evaluation)
  accuracyScore   Int?
  fluencyScore    Int?
  terminologyScore Int?
  formatScore     Int

  // Evaluation metadata
  evaluationType  String   // "heuristic" | "ai" | "hybrid"
  provider        String?  // AI provider used (if any)
  model           String?  // Model used (if any)

  // Issues found
  issues          Json     // QualityIssue[]

  // Token usage (for cost tracking)
  inputTokens     Int      @default(0)
  outputTokens    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([score])
  @@index([evaluationType])
}

model QualityScoringConfig {
  id                    String   @id @default(uuid())
  projectId             String   @unique
  project               Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Triggers
  scoreAfterAITranslation Boolean @default(true)
  scoreBeforeMerge        Boolean @default(false)

  // Thresholds
  autoApproveThreshold    Int     @default(80)
  flagThreshold           Int     @default(60)

  // AI evaluation settings
  aiEvaluationEnabled     Boolean @default(true)
  aiEvaluationProvider    String? // null = use project default
  aiEvaluationModel       String? // null = use provider default

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

### Update Translation Model

```prisma
model Translation {
  // ... existing fields

  qualityScore    TranslationQualityScore?
}
```

### Update Shared Types

Extend existing types in `packages/shared/src/validation/quality-checks/types.ts`:

```typescript
// Add new check type for ICU syntax
export type QualityCheckType =
  | 'placeholder_missing'
  | 'placeholder_extra'
  | 'whitespace_leading'
  | 'whitespace_trailing'
  | 'whitespace_double'
  | 'whitespace_tab'
  | 'punctuation_mismatch'
  | 'length_too_long'
  | 'length_critical'
  | 'icu_syntax'        // NEW
  | 'glossary_missing'; // NEW (API-only)
```

---

## Service Implementation

### Extend Shared Quality Checks

First, we extend the existing shared module with ICU syntax checking and score calculation:

```typescript
// packages/shared/src/validation/quality-checks/icu-syntax-check.ts

import type { QualityChecker, QualityCheckInput, QualityIssue } from './types.js';

/**
 * ICU Syntax checker - validates MessageFormat syntax
 * Requires @messageformat/parser to be installed
 */
export const icuSyntaxChecker: QualityChecker = {
  name: 'icu_syntax',

  check(input: QualityCheckInput): QualityIssue[] {
    const issues: QualityIssue[] = [];

    if (!input.target?.trim()) return issues;

    // Check for unbalanced braces (quick check without parser)
    const openBraces = (input.target.match(/\{/g) || []).length;
    const closeBraces = (input.target.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push({
        type: 'icu_syntax',
        severity: 'error',
        message: `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
      });
    }

    // Check for empty placeholders {}
    if (/\{\s*\}/.test(input.target)) {
      issues.push({
        type: 'icu_syntax',
        severity: 'error',
        message: 'Empty placeholder {} found',
      });
    }

    return issues;
  },
};

// For async validation with @messageformat/parser (optional dependency)
export async function validateICUSyntaxAsync(
  text: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { parse } = await import('@messageformat/parser');
    parse(text);
    return { valid: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      // Parser not available - assume valid
      return { valid: true };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid ICU syntax',
    };
  }
}
```

```typescript
// packages/shared/src/validation/quality-checks/score-calculator.ts

import type { QualityCheckResult, QualityIssue } from './types.js';

/**
 * Score weights by issue type
 */
const ISSUE_WEIGHTS: Record<string, number> = {
  // Critical issues (high impact)
  placeholder_missing: 30,
  icu_syntax: 25,
  length_critical: 20,

  // Major issues (medium impact)
  placeholder_extra: 15,
  punctuation_mismatch: 10,
  length_too_long: 10,

  // Minor issues (low impact)
  whitespace_leading: 5,
  whitespace_trailing: 5,
  whitespace_double: 3,
  whitespace_tab: 3,
};

/**
 * Severity multipliers
 */
const SEVERITY_MULTIPLIERS: Record<string, number> = {
  error: 1.0,
  warning: 0.5,
  info: 0.1,
};

export interface QualityScoreResult {
  /** Overall score 0-100 */
  score: number;
  /** Whether all critical checks passed */
  passed: boolean;
  /** Whether AI evaluation is recommended */
  needsAIEvaluation: boolean;
  /** Original issues from quality checks */
  issues: QualityIssue[];
}

/**
 * Calculate a numeric score from quality check issues
 *
 * @param result - Result from runQualityChecks()
 * @returns Score result with 0-100 score
 */
export function calculateScore(result: QualityCheckResult): QualityScoreResult {
  let score = 100;
  let needsAI = false;

  for (const issue of result.issues) {
    const weight = ISSUE_WEIGHTS[issue.type] ?? 10;
    const multiplier = SEVERITY_MULTIPLIERS[issue.severity] ?? 0.5;
    const penalty = weight * multiplier;

    score -= penalty;

    // Flag for AI evaluation if length issues detected
    if (issue.type === 'length_too_long' || issue.type === 'length_critical') {
      needsAI = true;
    }
  }

  return {
    score: Math.max(0, Math.round(score)),
    passed: score >= 80 && !result.hasErrors,
    needsAIEvaluation: needsAI || score < 70,
    issues: result.issues,
  };
}

/**
 * Run quality checks and calculate score in one call
 */
export { runQualityChecks } from './runner.js';
```

```typescript
// packages/shared/src/validation/quality-checks/index.ts (update exports)

// ... existing exports ...

// NEW: ICU syntax checker
export { icuSyntaxChecker, validateICUSyntaxAsync } from './icu-syntax-check.js';

// NEW: Score calculator
export { calculateScore, type QualityScoreResult } from './score-calculator.js';
```

### Quality Estimation Service (API)

The API service extends the shared checks with DB-dependent features:

```typescript
// apps/api/src/services/quality-estimation.service.ts

import { PrismaClient } from '@prisma/client';
import {
  runQualityChecks,
  calculateScore,
  validateICUSyntaxAsync,
  type QualityCheckResult,
  type QualityScoreResult,
} from '@lingx/shared';
import { AITranslationService } from './ai-translation.service.js';

// Extended types for API (adds AI dimensions)
export interface QualityScore extends QualityScoreResult {
  accuracy?: number;       // AI only
  fluency?: number;        // AI only
  terminology?: number;    // Glossary + AI
  evaluationType: 'heuristic' | 'ai' | 'hybrid';
  cached: boolean;
}

export class QualityEstimationService {
  constructor(
    private prisma: PrismaClient,
    private aiService?: AITranslationService
  ) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Evaluate translation quality using tiered approach
   *
   * Flow:
   * 1. Run shared quality checks (placeholder, whitespace, punctuation, length)
   * 2. Calculate score from issues
   * 3. Add glossary check (DB-dependent)
   * 4. If uncertain, escalate to AI
   */
  async evaluate(
    translationId: string,
    options?: { forceAI?: boolean }
  ): Promise<QualityScore> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      include: {
        key: {
          include: {
            branch: {
              include: {
                space: {
                  include: { project: true }
                }
              }
            }
          }
        },
        qualityScore: true,
      },
    });

    if (!translation || !translation.value) {
      throw new Error('Translation not found or empty');
    }

    // Check cache (unless forceAI)
    if (translation.qualityScore && !options?.forceAI) {
      return this.formatCachedScore(translation.qualityScore);
    }

    const project = translation.key.branch.space.project;
    const sourceLanguage = project.defaultLanguage;

    // Get source translation
    const sourceTranslation = await this.prisma.translation.findFirst({
      where: {
        keyId: translation.keyId,
        language: sourceLanguage,
      },
    });

    if (!sourceTranslation?.value) {
      // No source to compare - score based on ICU syntax only
      return this.scoreFormatOnly(translationId, translation.value);
    }

    // Level 1: Use SHARED quality checks
    const checkResult = runQualityChecks({
      source: sourceTranslation.value,
      target: translation.value,
      sourceLanguage,
      targetLanguage: translation.language,
    });

    // Calculate score from issues using SHARED calculator
    const scoreResult = calculateScore(checkResult);

    // Add glossary check (API-only, needs DB)
    const glossaryResult = await this.checkGlossary(
      project.id,
      sourceTranslation.value,
      translation.value,
      translation.language
    );

    // Combine results
    let finalScore = scoreResult.score;
    let needsAI = scoreResult.needsAIEvaluation;
    const allIssues = [...scoreResult.issues];

    if (glossaryResult && !glossaryResult.passed) {
      finalScore -= Math.min(10, (100 - glossaryResult.score) * 0.1);
      if (glossaryResult.issue) allIssues.push(glossaryResult.issue);
      needsAI = true; // Glossary issues need AI verification
    }

    // If heuristics pass and AI not forced, return heuristic score
    if (scoreResult.passed && !options?.forceAI && !needsAI) {
      return this.saveScore(translationId, {
        score: Math.round(finalScore),
        issues: allIssues,
        evaluationType: 'heuristic',
      });
    }

    // Level 2: AI evaluation (if enabled and needed)
    const config = await this.getConfig(project.id);
    if (config.aiEvaluationEnabled && this.aiService) {
      return this.evaluateWithAI(
        translationId,
        sourceTranslation.value,
        translation.value,
        sourceLanguage,
        translation.language,
        project.id,
        { score: Math.round(finalScore), issues: allIssues }
      );
    }

    // Return heuristic result if AI not available
    return this.saveScore(translationId, {
      score: Math.round(finalScore),
      issues: allIssues,
      evaluationType: 'heuristic',
    });
  }

  /**
   * Batch evaluate multiple translations
   */
  async evaluateBatch(
    translationIds: string[],
    projectId: string,
    options?: { forceAI?: boolean }
  ): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();

    // Process in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < translationIds.length; i += batchSize) {
      const batch = translationIds.slice(i, i + batchSize);
      const promises = batch.map(id =>
        this.evaluate(id, options)
          .then(score => results.set(id, score))
          .catch(err => {
            console.error(`[Quality] Failed to evaluate ${id}:`, err.message);
          })
      );
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get quality summary for a branch
   */
  async getBranchSummary(branchId: string): Promise<{
    averageScore: number;
    distribution: { excellent: number; good: number; needsReview: number };
    byLanguage: Record<string, { average: number; count: number }>;
    totalScored: number;
    totalTranslations: number;
  }> {
    const translations = await this.prisma.translation.findMany({
      where: {
        key: { branchId },
        value: { not: '' },
      },
      include: { qualityScore: true },
    });

    const scored = translations.filter(t => t.qualityScore);
    const scores = scored.map(t => t.qualityScore!.score);

    const distribution = {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      needsReview: scores.filter(s => s < 60).length,
    };

    // Group by language
    const byLanguage: Record<string, { total: number; count: number }> = {};
    for (const t of scored) {
      if (!byLanguage[t.language]) {
        byLanguage[t.language] = { total: 0, count: 0 };
      }
      byLanguage[t.language].total += t.qualityScore!.score;
      byLanguage[t.language].count += 1;
    }

    const byLanguageAvg: Record<string, { average: number; count: number }> = {};
    for (const [lang, data] of Object.entries(byLanguage)) {
      byLanguageAvg[lang] = {
        average: Math.round(data.total / data.count),
        count: data.count,
      };
    }

    return {
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      distribution,
      byLanguage: byLanguageAvg,
      totalScored: scored.length,
      totalTranslations: translations.length,
    };
  }

  /**
   * Get or create quality scoring config for project
   */
  async getConfig(projectId: string): Promise<{
    scoreAfterAITranslation: boolean;
    scoreBeforeMerge: boolean;
    autoApproveThreshold: number;
    flagThreshold: number;
    aiEvaluationEnabled: boolean;
    aiEvaluationProvider: string | null;
    aiEvaluationModel: string | null;
  }> {
    const config = await this.prisma.qualityScoringConfig.findUnique({
      where: { projectId },
    });

    return config || {
      scoreAfterAITranslation: true,
      scoreBeforeMerge: false,
      autoApproveThreshold: 80,
      flagThreshold: 60,
      aiEvaluationEnabled: true,
      aiEvaluationProvider: null,
      aiEvaluationModel: null,
    };
  }

  /**
   * Update quality scoring config
   */
  async updateConfig(
    projectId: string,
    input: Partial<{
      scoreAfterAITranslation: boolean;
      scoreBeforeMerge: boolean;
      autoApproveThreshold: number;
      flagThreshold: number;
      aiEvaluationEnabled: boolean;
      aiEvaluationProvider: string | null;
      aiEvaluationModel: string | null;
    }>
  ): Promise<void> {
    await this.prisma.qualityScoringConfig.upsert({
      where: { projectId },
      update: input,
      create: {
        projectId,
        ...input,
      },
    });
  }

  // ============================================
  // ICU PRE-CHECK (Separate from scoring)
  // Uses shared validateICUSyntaxAsync from @lingx/shared
  // ============================================

  /**
   * Validate ICU MessageFormat syntax
   * Should be called on save, before quality scoring
   */
  async validateICUSyntax(text: string): Promise<{ valid: boolean; error?: string }> {
    return validateICUSyntaxAsync(text);
  }

  // ============================================
  // PRIVATE: GLOSSARY CHECK (API-only, needs DB)
  // Other checks use shared module
  // ============================================

  private async checkGlossary(
    projectId: string,
    source: string,
    target: string,
    targetLocale: string
  ): Promise<{ passed: boolean; score: number; issue?: QualityIssue } | null> {
    // Get glossary terms for this project
    const glossaryTerms = await this.prisma.glossaryTerm.findMany({
      where: { projectId },
      include: {
        translations: {
          where: { language: targetLocale },
        },
      },
    });

    if (glossaryTerms.length === 0) return null;

    // Check which source terms appear in the source text
    const relevantTerms = glossaryTerms.filter(term =>
      source.toLowerCase().includes(term.term.toLowerCase())
    );

    if (relevantTerms.length === 0) return null;

    // Check if target translations are present in target text
    const missingTerms = relevantTerms.filter(term => {
      const targetTerm = term.translations[0]?.translation;
      return targetTerm && !target.toLowerCase().includes(targetTerm.toLowerCase());
    });

    if (missingTerms.length === 0) {
      return { passed: true, score: 100 };
    }

    const score = Math.max(0, 100 - (missingTerms.length * 15));

    return {
      passed: false,
      score,
      issue: {
        type: 'terminology',
        severity: 'major',
        description: `Missing glossary terms: ${missingTerms.map(t => t.translations[0]?.translation || t.term).join(', ')}`,
      },
    };
  }

  // ============================================
  // PRIVATE: AI EVALUATION
  // ============================================

  private async evaluateWithAI(
    translationId: string,
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string,
    projectId: string,
    heuristicResult: HeuristicResult
  ): Promise<QualityScore> {
    if (!this.aiService) {
      throw new Error('AI service not available');
    }

    const config = await this.getConfig(projectId);

    // Build evaluation prompt
    const prompt = this.buildAIEvaluationPrompt(source, target, sourceLocale, targetLocale);

    try {
      // Use AI service for evaluation
      // For now, we'll use a simplified approach - in production,
      // this would be a dedicated evaluation endpoint
      const result = await this.callAIEvaluation(
        projectId,
        prompt,
        config.aiEvaluationProvider,
        config.aiEvaluationModel
      );

      // Combine AI result with heuristic format score
      const combinedScore = Math.round(
        (result.accuracy * 0.4) +
        (result.fluency * 0.25) +
        (result.terminology * 0.15) +
        (heuristicResult.score * 0.2) // Format from heuristics
      );

      const allIssues = [
        ...heuristicResult.issues,
        ...result.issues,
      ];

      return await this.saveScore(translationId, {
        score: combinedScore,
        accuracy: result.accuracy,
        fluency: result.fluency,
        terminology: result.terminology,
        format: heuristicResult.score,
        issues: allIssues,
        evaluationType: 'ai',
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    } catch (error) {
      console.error('[Quality] AI evaluation failed:', error);
      // Fall back to heuristic result
      return await this.saveScore(translationId, {
        score: heuristicResult.score,
        format: heuristicResult.score,
        issues: heuristicResult.issues,
        evaluationType: 'heuristic',
      });
    }
  }

  private buildAIEvaluationPrompt(
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string
  ): string {
    return `Evaluate this translation using MQM (Multidimensional Quality Metrics).

Source (${sourceLocale}): "${source}"
Target (${targetLocale}): "${target}"

Score each dimension 0-100:

1. ACCURACY: Does the translation preserve the original meaning?
   - 100: Perfect semantic fidelity
   - 80-99: Minor omissions that don't affect meaning
   - 50-79: Some meaning lost
   - 0-49: Significant errors

2. FLUENCY: Does it read naturally in the target language?
   - 100: Native-level, perfect grammar
   - 80-99: Minor issues, still natural
   - 50-79: Awkward phrasing
   - 0-49: Hard to understand

3. TERMINOLOGY: Are domain terms translated correctly?
   - 100: All terms correct
   - 80-99: Minor inconsistencies
   - 50-79: Some wrong terms
   - 0-49: Major term errors

Return JSON only:
{
  "accuracy": <score>,
  "fluency": <score>,
  "terminology": <score>,
  "issues": [{"type": "accuracy|fluency|terminology", "severity": "critical|major|minor", "description": "..."}]
}`;
  }

  private async callAIEvaluation(
    projectId: string,
    prompt: string,
    provider?: string | null,
    model?: string | null
  ): Promise<{
    accuracy: number;
    fluency: number;
    terminology: number;
    issues: QualityIssue[];
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    // This would use the AI service in production
    // For now, return a mock response structure
    // TODO: Implement actual AI call using this.aiService

    // Placeholder - actual implementation would call AI
    return {
      accuracy: 85,
      fluency: 80,
      terminology: 90,
      issues: [],
      provider: provider || 'ANTHROPIC',
      model: model || 'claude-haiku-4-5',
      inputTokens: 150,
      outputTokens: 50,
    };
  }

  // ============================================
  // PRIVATE: STORAGE
  // ============================================

  private async saveScore(
    translationId: string,
    data: {
      score: number;
      accuracy?: number;
      fluency?: number;
      terminology?: number;
      format: number;
      issues: QualityIssue[];
      evaluationType: 'heuristic' | 'ai' | 'hybrid';
      provider?: string;
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
    }
  ): Promise<QualityScore> {
    await this.prisma.translationQualityScore.upsert({
      where: { translationId },
      update: {
        score: data.score,
        accuracyScore: data.accuracy,
        fluencyScore: data.fluency,
        terminologyScore: data.terminology,
        formatScore: data.format,
        evaluationType: data.evaluationType,
        provider: data.provider,
        model: data.model,
        issues: data.issues as any,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
      },
      create: {
        translationId,
        score: data.score,
        accuracyScore: data.accuracy,
        fluencyScore: data.fluency,
        terminologyScore: data.terminology,
        formatScore: data.format,
        evaluationType: data.evaluationType,
        provider: data.provider,
        model: data.model,
        issues: data.issues as any,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
      },
    });

    return {
      score: data.score,
      accuracy: data.accuracy,
      fluency: data.fluency,
      terminology: data.terminology,
      format: data.format,
      issues: data.issues,
      evaluationType: data.evaluationType,
      cached: false,
    };
  }

  private formatCachedScore(stored: any): QualityScore {
    return {
      score: stored.score,
      accuracy: stored.accuracyScore,
      fluency: stored.fluencyScore,
      terminology: stored.terminologyScore,
      format: stored.formatScore,
      issues: stored.issues as QualityIssue[],
      evaluationType: stored.evaluationType as 'heuristic' | 'ai' | 'hybrid',
      cached: true,
    };
  }

  private async scoreFormatOnly(translationId: string, text: string): Promise<QualityScore> {
    const icuCheck = this.checkICUSyntax(text);
    const score = icuCheck.passed ? 100 : 50;

    return await this.saveScore(translationId, {
      score,
      format: score,
      issues: icuCheck.issue ? [icuCheck.issue] : [],
      evaluationType: 'heuristic',
    });
  }
}
```

---

## API Endpoints

### Quality Scoring Routes

```typescript
// apps/api/src/routes/quality-estimation.ts

import { FastifyPluginAsync } from 'fastify';
import { QualityEstimationService } from '../services/quality-estimation.service.js';
import { AITranslationService } from '../services/ai-translation.service.js';

export const qualityEstimationRoutes: FastifyPluginAsync = async (fastify) => {
  const qualityService = new QualityEstimationService(
    fastify.prisma,
    new AITranslationService(fastify.prisma)
  );

  // Evaluate single translation
  fastify.post<{
    Params: { translationId: string };
    Body: { forceAI?: boolean };
  }>('/translations/:translationId/quality', {
    schema: {
      params: {
        type: 'object',
        required: ['translationId'],
        properties: {
          translationId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          forceAI: { type: 'boolean' },
        },
      },
    },
  }, async (request) => {
    const { translationId } = request.params;
    const { forceAI } = request.body || {};

    return qualityService.evaluate(translationId, { forceAI });
  });

  // Batch evaluate translations
  fastify.post<{
    Params: { branchId: string };
    Body: {
      translationIds?: string[];
      filter?: { untranslated?: boolean; aiGenerated?: boolean };
    };
  }>('/branches/:branchId/quality/batch', {
    schema: {
      params: {
        type: 'object',
        required: ['branchId'],
        properties: {
          branchId: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { branchId } = request.params;
    const { translationIds } = request.body || {};

    // Get branch to find projectId
    const branch = await fastify.prisma.branch.findUnique({
      where: { id: branchId },
      include: { space: true },
    });

    if (!branch) {
      throw fastify.httpErrors.notFound('Branch not found');
    }

    // If no IDs provided, get all translations in branch
    const ids = translationIds || (await fastify.prisma.translation.findMany({
      where: { key: { branchId } },
      select: { id: true },
    })).map(t => t.id);

    // Queue batch job
    const job = await fastify.mtQueue.add('quality-batch', {
      type: 'quality-batch',
      projectId: branch.space.projectId,
      branchId,
      translationIds: ids,
      userId: request.user!.id,
    });

    return { jobId: job.id };
  });

  // Get quality summary for branch
  fastify.get<{
    Params: { branchId: string };
  }>('/branches/:branchId/quality/summary', {
    schema: {
      params: {
        type: 'object',
        required: ['branchId'],
        properties: {
          branchId: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { branchId } = request.params;
    return qualityService.getBranchSummary(branchId);
  });

  // Get quality config for project
  fastify.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/quality/config', async (request) => {
    const { projectId } = request.params;
    return qualityService.getConfig(projectId);
  });

  // Update quality config
  fastify.put<{
    Params: { projectId: string };
    Body: {
      scoreAfterAITranslation?: boolean;
      scoreBeforeMerge?: boolean;
      autoApproveThreshold?: number;
      flagThreshold?: number;
      aiEvaluationEnabled?: boolean;
      aiEvaluationProvider?: string | null;
      aiEvaluationModel?: string | null;
    };
  }>('/projects/:projectId/quality/config', async (request) => {
    const { projectId } = request.params;
    await qualityService.updateConfig(projectId, request.body);
    return qualityService.getConfig(projectId);
  });

  // Validate ICU syntax (pre-check)
  fastify.post<{
    Body: { text: string };
  }>('/quality/validate-icu', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { text } = request.body;
    return qualityService.validateICUSyntax(text);
  });
};
```

---

## Background Job Integration

### Quality Scoring Worker

```typescript
// Extend apps/api/src/workers/mt-batch.worker.ts

// Add new job type
export type MTJobType =
  | 'translate-batch'
  | 'pre-translate'
  | 'cleanup-cache'
  | 'bulk-translate-ui'
  | 'quality-batch';  // NEW

// Add to job data interface
export interface MTJobData {
  // ... existing fields

  // For quality-batch
  type: MTJobType;
}

// Add handler in worker switch statement
case 'quality-batch':
  await handleQualityBatch(prisma, qualityService, job);
  break;

// Handler implementation
async function handleQualityBatch(
  prisma: PrismaClient,
  qualityService: QualityEstimationService,
  job: Job<MTJobData>
): Promise<void> {
  const { translationIds } = job.data;

  if (!translationIds || translationIds.length === 0) {
    return;
  }

  let processed = 0;
  const total = translationIds.length;

  // Process in batches
  const batchSize = 20;
  for (let i = 0; i < translationIds.length; i += batchSize) {
    const batch = translationIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(id => qualityService.evaluate(id).catch(console.error))
    );

    processed += batch.length;
    await job.updateProgress({ processed, total });
  }
}
```

---

## CLI Integration

### Quality Check Command

```typescript
// packages/cli/src/commands/check.ts

import { Command } from 'commander';

export function createCheckCommand(): Command {
  const cmd = new Command('check')
    .description('Run quality checks on translations');

  cmd
    .command('quality')
    .description('Check translation quality scores')
    .option('--branch <name>', 'Branch name', 'main')
    .option('--threshold <number>', 'Minimum acceptable score', '80')
    .option('--details', 'Show detailed issues')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      // Implementation would call API endpoint
      // GET /branches/:branchId/quality/summary
    });

  return cmd;
}
```

---

## Acceptance Criteria

### AC-QUAL-001: Heuristic Scoring
- **When** a translation is saved with valid ICU syntax and all placeholders preserved
- **Then** the system shall assign a quality score of 90-100 within 200ms
- **And** the evaluation type shall be "heuristic"

### AC-QUAL-002: AI Escalation
- **When** heuristic checks detect uncertainty (e.g., unusual length ratio)
- **Then** the system shall queue AI evaluation
- **And** the final score shall reflect AI assessment of accuracy and fluency

### AC-QUAL-003: ICU Pre-Check
- **When** a user attempts to save a translation with invalid ICU syntax
- **Then** the system shall block the save
- **And** display a clear error message with the syntax issue

### AC-QUAL-004: Quality Summary
- **When** viewing a branch with scored translations
- **Then** the system shall display average score and distribution
- **And** group scores by language

### AC-QUAL-005: Flagged Translations
- **When** a translation scores below the flag threshold (default 60)
- **Then** the translation shall be marked with a warning indicator
- **And** appear in the "Needs Review" filter

### AC-QUAL-006: Configuration
- **When** a project admin updates quality scoring settings
- **Then** the changes shall apply to all subsequent evaluations
- **And** existing scores shall not be recalculated automatically

---

## Dependencies

### npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@messageformat/parser` | ^6.0.0 | ICU syntax validation |

### Internal Dependencies

- `AITranslationService` - For AI evaluation calls
- `GlossaryService` - For terminology checks
- BullMQ queue - For batch processing

---

## Effort Estimate

Since we're extending the existing quality-checks system, effort is reduced:

| Component | Story Points | Notes |
|-----------|--------------|-------|
| ICU syntax checker (shared) | 1 | New file in existing module |
| Score calculator (shared) | 1 | New file in existing module |
| Database schema + migration | 1 | New Prisma models |
| API service (glossary + AI) | 2 | Extend existing checks |
| API endpoints | 1 | Similar to existing routes |
| Background job worker | 1 | Extend existing worker |
| CLI enhancement | 1 | Add `--score` flag to existing `check` |
| UI integration (editor) | 2 | Score display in translation view |
| UI integration (dashboard) | 2 | Quality summary widget |
| Testing | 2 | Unit + integration tests |
| **Total** | **14** | **Reduced from 18** |

### Reused Code (0 points - already done)

| Component | Location |
|-----------|----------|
| Placeholder checker | `packages/shared/.../placeholder-check.ts` |
| Whitespace checker | `packages/shared/.../whitespace-check.ts` |
| Punctuation checker | `packages/shared/.../punctuation-check.ts` |
| Length checker | `packages/shared/.../length-check.ts` |
| Quality runner | `packages/shared/.../runner.ts` |
| CLI `--quality` flag | `packages/cli/src/commands/check.ts` |

---

## Open Questions

1. Should scores be invalidated when source translation changes?
2. How to handle glossary changes affecting existing scores?
3. Should CLI output color-code scores in terminal?
