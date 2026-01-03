/**
 * Quality Estimation Service
 *
 * Provides AI-powered translation quality scoring using a tiered approach:
 * 1. Heuristic checks (free, fast) - placeholders, ICU syntax, length, punctuation
 * 2. Glossary validation (database-dependent)
 * 3. AI evaluation (cost, slow) - only for uncertain/low-score translations
 *
 * Cost target: <$0.50/10K translations via aggressive heuristic-first strategy
 */

import {
  PrismaClient,
  type TranslationQualityScore as PrismaQualityScore,
  AIProvider as AIProviderEnum,
} from '@prisma/client';
import {
  runQualityChecks,
  calculateScore,
  validateICUSyntaxAsync,
  type QualityScoreResult,
  type QualityIssue,
} from '@lingx/shared';
import { KeyContextService } from './key-context.service.js';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, type LanguageModel } from 'ai';
import { z } from 'zod';
import { createDecipheriv, createHash } from 'crypto';

/**
 * Extended quality score with AI dimensions
 */
export interface QualityScore extends QualityScoreResult {
  accuracy?: number; // AI: semantic fidelity (0-100)
  fluency?: number; // AI: natural language quality (0-100)
  terminology?: number; // Glossary + AI (0-100)
  format?: number; // Heuristic: ICU, placeholders, length (0-100)
  evaluationType: 'heuristic' | 'ai' | 'hybrid';
  cached: boolean;
}

/**
 * Branch quality summary
 */
export interface BranchQualitySummary {
  averageScore: number;
  distribution: {
    excellent: number; // >=80
    good: number; // 60-79
    needsReview: number; // <60
  };
  byLanguage: Record<string, { average: number; count: number }>;
  totalScored: number;
  totalTranslations: number;
}

/**
 * Evaluation options
 */
export interface EvaluateOptions {
  forceAI?: boolean; // Force AI evaluation even if heuristics pass
}

/**
 * Quality scoring configuration
 */
export interface QualityScoringConfigData {
  scoreAfterAITranslation: boolean;
  scoreBeforeMerge: boolean;
  autoApproveThreshold: number;
  flagThreshold: number;
  aiEvaluationEnabled: boolean;
  aiEvaluationProvider: string | null;
  aiEvaluationModel: string | null;
}

// Note: Encryption key is retrieved dynamically via getEncryptionKey() method
// to match AI Translation Service approach

/**
 * MQM AI Evaluation result (parsed from JSON response)
 */
interface MQMResult {
  accuracy: number;
  fluency: number;
  terminology: number;
  issues: Array<{
    type: 'accuracy' | 'fluency' | 'terminology';
    severity: 'critical' | 'major' | 'minor';
    message: string;
  }>;
}

/**
 * Static MQM system prompt - cached by providers (Anthropic 90% cheaper, OpenAI 50% cheaper)
 *
 * IMPORTANT: Keep static content in system prompt for caching.
 * Dynamic content (key name, source, target) goes in user message.
 */
const MQM_SYSTEM_PROMPT = `You are an MQM (Multidimensional Quality Metrics) translation quality evaluator.

Score each dimension 0-100:

1. ACCURACY: Does the translation preserve the original meaning?
   - 100: Perfect semantic fidelity
   - 80-99: Minor omissions that don't affect meaning
   - 50-79: Some meaning lost
   - 0-49: Significant errors (wrong meaning, AI hallucination, explanation instead of translation)

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

IMPORTANT: If the target looks like an AI response/explanation rather than a translation (contains questions, clarification requests, or is much longer than expected), score ACCURACY as 0.

Return ONLY valid JSON in this exact format:
{"accuracy":N,"fluency":N,"terminology":N,"issues":[{"type":"accuracy|fluency|terminology","severity":"critical|major|minor","message":"..."}]}

If no issues found, return empty issues array: {"accuracy":N,"fluency":N,"terminology":N,"issues":[]}`;

/** Max retries for invalid JSON responses (single-language) */
const MAX_RETRIES = 2;

// ============================================
// MULTI-LANGUAGE BATCH EVALUATION
// ============================================

/** Conversation retry settings for multi-language evaluation */
const MAX_TURNS_PER_CONVERSATION = 7;
const MAX_FRESH_STARTS = 3;

/**
 * Zod schema for a single language evaluation
 */
const languageEvaluationSchema = z.object({
  accuracy: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  terminology: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      type: z.enum(['accuracy', 'fluency', 'terminology']),
      severity: z.enum(['critical', 'major', 'minor']),
      message: z.string(),
    })
  ).default([]),
});

// Type is inferred from schema where needed

/**
 * Create dynamic Zod schema for multi-language response
 */
function createMultiLanguageSchema(languages: string[]) {
  return z.object({
    evaluations: z.object(
      Object.fromEntries(languages.map(lang => [lang, languageEvaluationSchema]))
    ) as z.ZodObject<Record<string, typeof languageEvaluationSchema>>,
  });
}

/**
 * Multi-language MQM system prompt
 * Emphasizes consistent scoring across languages
 */
const MQM_MULTI_LANGUAGE_SYSTEM_PROMPT = `You are an MQM (Multidimensional Quality Metrics) translation quality evaluator.

CRITICAL: You are evaluating ALL translations for a single key. Apply CONSISTENT scoring across languages:
- Same issues MUST have the same severity in all languages
- Compare translations relative to each other for fair calibration
- Do not be harsh on one language and lenient on another

Score each dimension 0-100:

1. ACCURACY: Does the translation preserve the original meaning?
   - 100: Perfect semantic fidelity
   - 80-99: Minor omissions that don't affect meaning
   - 50-79: Some meaning lost
   - 0-49: Significant errors (wrong meaning, AI hallucination, explanation instead of translation)

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

IMPORTANT: If any translation looks like an AI response/explanation rather than a translation (contains questions, clarification requests, or is much longer than expected), score its ACCURACY as 0.

Return ONLY valid JSON in this EXACT format:
{
  "evaluations": {
    "LANG_CODE": {
      "accuracy": N,
      "fluency": N,
      "terminology": N,
      "issues": [
        { "type": "accuracy", "severity": "major", "message": "Description of issue" }
      ]
    }
  }
}

ISSUE OBJECT FORMAT (MUST follow exactly):
- type: ONLY "accuracy", "fluency", or "terminology" (lowercase, no other values)
- severity: ONLY "critical", "major", or "minor" (lowercase, no other values)
- message: string describing the specific issue

If no issues for a language, use empty array: "issues": []
Each language code must match exactly what was provided in the request.`;;

/**
 * Quality Estimation Service
 */
export class QualityEstimationService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Evaluate translation quality using tiered approach
   *
   * Flow:
   * 1. Check cache (return if valid and not forceAI)
   * 2. Run shared quality checks (placeholder, whitespace, punctuation, length)
   * 3. Calculate score from issues
   * 4. Add glossary check (DB-dependent)
   * 5. If passed and no AI needed → save heuristic score
   * 6. Else if AI enabled → escalate to AI evaluation
   * 7. Combine AI dimensions + heuristic format score
   * 8. Save and return
   */
  async evaluate(translationId: string, options?: EvaluateOptions): Promise<QualityScore> {
    const translation = await this.prisma.translation.findUnique({
      where: { id: translationId },
      include: {
        key: {
          include: {
            branch: {
              include: {
                space: {
                  include: { project: true },
                },
              },
            },
          },
        },
        qualityScore: true,
      },
    });

    if (!translation || !translation.value) {
      throw new Error('Translation not found or empty');
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

    const keyName = translation.key.name;
    const lang = translation.language;

    // Check cache using content hash (cache is ALWAYS respected, forceAI only affects evaluation mode)
    if (translation.qualityScore && sourceTranslation?.value) {
      const currentHash = this.generateContentHash(sourceTranslation.value, translation.value);
      if (translation.qualityScore.contentHash === currentHash) {
        console.log(`[Quality] CACHE HIT: ${keyName}/${lang} score=${translation.qualityScore.score}`);
        return this.formatCachedScore(translation.qualityScore);
      }
      // Content changed, fall through to re-evaluate
      console.log(`[Quality] CACHE MISS (content changed): ${keyName}/${lang}`);
    } else if (!translation.qualityScore) {
      console.log(`[Quality] NO CACHE: ${keyName}/${lang} (first evaluation)`);
    }

    if (!sourceTranslation?.value) {
      // No source to compare - score based on ICU syntax only
      console.log(`[Quality] FORMAT ONLY: ${keyName}/${lang} (no source text)`);
      return this.scoreFormatOnly(translationId, translation.value);
    }

    // Level 1: Heuristic checks (shared package)
    const checkResult = runQualityChecks({
      source: sourceTranslation.value,
      target: translation.value,
      sourceLanguage,
      targetLanguage: translation.language,
    });

    // Calculate score from issues
    const scoreResult = calculateScore(checkResult);

    // Level 2: Glossary check (API-only, needs DB)
    const glossaryResult = await this.checkGlossary(
      project.id,
      sourceTranslation.value,
      translation.value,
      translation.language
    );

    // Combine heuristic + glossary results
    let finalScore = scoreResult.score;
    let needsAI = scoreResult.needsAIEvaluation;
    const allIssues = [...scoreResult.issues];

    if (glossaryResult && !glossaryResult.passed) {
      // Reduce score for glossary issues (up to 10 points penalty)
      finalScore -= Math.min(10, 100 - glossaryResult.score);
      if (glossaryResult.issue) allIssues.push(glossaryResult.issue);
      needsAI = true; // Glossary issues warrant deeper analysis
    }

    // Generate content hash for cache
    const contentHash = this.generateContentHash(sourceTranslation.value, translation.value);

    // Level 3: AI evaluation (if enabled and provider configured)
    const config = await this.getConfig(project.id);
    const aiAvailable = config.aiEvaluationEnabled && config.aiEvaluationProvider && config.aiEvaluationModel;

    // If heuristics pass and AI not forced/needed, return heuristic score
    // forceAI=true means "always use AI" (but still respect cache)
    if (scoreResult.passed && !options?.forceAI && !needsAI) {
      console.log(`[Quality] HEURISTIC PASS: ${keyName}/${lang} score=${Math.round(finalScore)} (skipping AI)`);
      return this.saveScore(translationId, {
        score: Math.round(finalScore),
        format: scoreResult.score,
        issues: allIssues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }

    // Use AI if available
    if (aiAvailable) {
      const reason = options?.forceAI ? 'forceAI=true' : needsAI ? 'heuristics flagged issues' : 'heuristics failed';
      console.log(`[Quality] AI EVAL START: ${keyName}/${lang} (${reason}) provider=${config.aiEvaluationProvider} model=${config.aiEvaluationModel}`);
      return this.evaluateWithAI(
        translationId,
        translation.keyId, // Key ID for fetching related keys
        translation.key.name, // Key name for context
        sourceTranslation.value,
        translation.value,
        sourceLanguage,
        translation.language,
        project.id,
        { score: Math.round(finalScore), issues: allIssues },
        contentHash
      );
    }

    // Return heuristic result if AI not available/enabled
    console.log(`[Quality] HEURISTIC ONLY: ${keyName}/${lang} score=${Math.round(finalScore)} (AI not configured)`);
    return this.saveScore(translationId, {
      score: Math.round(finalScore),
      format: scoreResult.score,
      issues: allIssues,
      evaluationType: 'heuristic',
      contentHash,
    });
  }

  /**
   * Batch evaluate multiple translations
   *
   * Processes in parallel batches of 10 to avoid overwhelming database
   */
  async evaluateBatch(
    translationIds: string[],
    _projectId: string,
    options?: EvaluateOptions
  ): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();
    const batchSize = 10;

    for (let i = 0; i < translationIds.length; i += batchSize) {
      const batch = translationIds.slice(i, i + batchSize);
      const promises = batch.map((id) =>
        this.evaluate(id, options)
          .then((score) => results.set(id, score))
          .catch((err) => {
            console.error(`[Quality] Failed to evaluate ${id}:`, err.message);
          })
      );
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get quality summary for a branch
   *
   * Returns distribution of scores, average, and breakdown by language
   */
  async getBranchSummary(branchId: string): Promise<BranchQualitySummary> {
    const translations = await this.prisma.translation.findMany({
      where: {
        key: { branchId },
        value: { not: '' },
      },
      include: { qualityScore: true },
    });

    const scored = translations.filter((t) => t.qualityScore);
    const scores = scored.map((t) => t.qualityScore!.score);

    const distribution = {
      excellent: scores.filter((s) => s >= 80).length,
      good: scores.filter((s) => s >= 60 && s < 80).length,
      needsReview: scores.filter((s) => s < 60).length,
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
      averageScore:
        scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      distribution,
      byLanguage: byLanguageAvg,
      totalScored: scored.length,
      totalTranslations: translations.length,
    };
  }

  /**
   * Get or create quality scoring config for project
   */
  async getConfig(projectId: string): Promise<QualityScoringConfigData> {
    const config = await this.prisma.qualityScoringConfig.findUnique({
      where: { projectId },
    });

    return (
      config || {
        scoreAfterAITranslation: true,
        scoreBeforeMerge: false,
        autoApproveThreshold: 80,
        flagThreshold: 60,
        aiEvaluationEnabled: true,
        aiEvaluationProvider: null,
        aiEvaluationModel: null,
      }
    );
  }

  /**
   * Update quality scoring config
   */
  async updateConfig(
    projectId: string,
    input: Partial<QualityScoringConfigData>
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

  /**
   * Validate ICU MessageFormat syntax
   *
   * Uses shared package's async validator
   * Should be called on save, before quality scoring
   */
  async validateICUSyntax(text: string): Promise<{ valid: boolean; error?: string }> {
    return validateICUSyntaxAsync(text);
  }

  // ============================================
  // MULTI-LANGUAGE BATCH EVALUATION (PUBLIC)
  // ============================================

  /**
   * Evaluate ALL languages for a single key in ONE AI call
   *
   * Benefits:
   * - Consistent scoring across languages (same issue = same severity)
   * - 5x fewer API calls (for 5 languages)
   * - Better context with related keys in all languages
   *
   * @param keyId - Translation key ID
   * @param keyName - Key name for context
   * @param translations - All translations for this key
   * @param sourceText - Source text
   * @param sourceLocale - Source language code
   * @param projectId - Project ID for config lookup
   * @param heuristicResults - Map of language -> heuristic results
   * @returns Map of language -> QualityScore
   */
  async evaluateKeyAllLanguages(
    keyId: string,
    keyName: string,
    translations: Array<{ id: string; language: string; value: string }>,
    sourceText: string,
    sourceLocale: string,
    projectId: string,
    heuristicResults: Map<string, { score: number; issues: QualityIssue[] }>
  ): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();
    const languages = translations.map(t => t.language);

    // Get config
    const config = await this.getConfig(projectId);
    const aiAvailable = config.aiEvaluationEnabled && config.aiEvaluationProvider && config.aiEvaluationModel;

    // If AI not available, return heuristic results for all
    if (!aiAvailable) {
      console.log(`[Quality] AI not configured, using heuristics for key ${keyName}`);
      for (const t of translations) {
        const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };
        const contentHash = this.generateContentHash(sourceText, t.value);
        const score = await this.saveScore(t.id, {
          score: heuristic.score,
          format: heuristic.score,
          issues: heuristic.issues,
          evaluationType: 'heuristic',
          contentHash,
        });
        results.set(t.language, score);
      }
      return results;
    }

    // Fetch related keys with ALL language translations
    let relatedKeys: Array<{
      keyName: string;
      source: string;
      translations: Record<string, string>;
    }> = [];

    try {
      const keyContextService = new KeyContextService(this.prisma);
      const aiContext = await keyContextService.getAIContext(keyId, languages[0], sourceLocale);

      // Transform to include all languages
      for (const r of aiContext.relatedTranslations.slice(0, 5)) {
        // r.translations already contains translations keyed by language code
        // Filter to only include languages we're evaluating
        const translationsMap: Record<string, string> = {};
        for (const lang of languages) {
          if (r.translations[lang]) {
            translationsMap[lang] = r.translations[lang];
          }
        }

        if (r.translations[sourceLocale]) {
          relatedKeys.push({
            keyName: r.keyName,
            source: r.translations[sourceLocale],
            translations: translationsMap,
          });
        }
      }

      relatedKeys = relatedKeys.filter(rk => rk.source); // Only include if has source
    } catch (error) {
      console.warn('[Quality] Failed to fetch related keys:', error);
    }

    // Get AI provider config
    const aiConfig = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: config.aiEvaluationProvider as AIProviderEnum,
        },
      },
    });

    if (!aiConfig?.isActive) {
      console.log('[Quality] AI provider not active, using heuristics for all languages');
      for (const t of translations) {
        const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };
        const contentHash = this.generateContentHash(sourceText, t.value);
        const score = await this.saveScore(t.id, {
          score: heuristic.score,
          format: heuristic.score,
          issues: heuristic.issues,
          evaluationType: 'heuristic',
          contentHash,
        });
        results.set(t.language, score);
      }
      return results;
    }

    try {
      const apiKey = this.decryptApiKey(aiConfig.apiKey, aiConfig.apiKeyIv);
      const model = this.getLanguageModel(
        config.aiEvaluationProvider as AIProviderEnum,
        config.aiEvaluationModel!,
        apiKey
      );
      const isAnthropic = config.aiEvaluationProvider === 'ANTHROPIC';

      // Build multi-language prompt
      const userPrompt = this.buildMultiLanguagePrompt(
        keyName,
        sourceText,
        sourceLocale,
        translations.map(t => ({ language: t.language, value: t.value })),
        relatedKeys
      );

      // Create dynamic schema for these languages
      const schema = createMultiLanguageSchema(languages);

      // Call AI with conversation retry
      console.log(`[Quality] AI MULTI-LANG START: ${keyName} (${languages.join(', ')})`);
      const { result, totalUsage, cacheMetrics } = await this.callAIWithConversationRetry(
        model,
        userPrompt,
        schema,
        isAnthropic
      );

      // Log cache metrics
      if (cacheMetrics.cacheRead > 0 || cacheMetrics.cacheCreation > 0) {
        console.log(
          `[Quality] CACHE: ${cacheMetrics.cacheRead} tokens read (90% cheaper), ${cacheMetrics.cacheCreation} tokens created`
        );
      }

      // Process results for each language
      for (const t of translations) {
        const langResult = result.evaluations[t.language];
        const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };

        if (!langResult) {
          console.warn(`[Quality] No AI result for ${t.language}, using heuristic`);
          const contentHash = this.generateContentHash(sourceText, t.value);
          const score = await this.saveScore(t.id, {
            score: heuristic.score,
            format: heuristic.score,
            issues: heuristic.issues,
            evaluationType: 'heuristic',
            contentHash,
          });
          results.set(t.language, score);
          continue;
        }

        // Combine AI scores with heuristic format score
        const combinedScore = Math.round(
          langResult.accuracy * 0.4 +
          langResult.fluency * 0.25 +
          langResult.terminology * 0.15 +
          heuristic.score * 0.2
        );

        // Map AI issues
        const aiIssues: QualityIssue[] = langResult.issues.map((issue) => ({
          type: `ai_${issue.type}` as QualityIssue['type'],
          severity: issue.severity === 'critical' ? 'error' : issue.severity === 'major' ? 'warning' : 'info',
          message: issue.message,
        }));

        const allIssues = [...heuristic.issues, ...aiIssues];
        const contentHash = this.generateContentHash(sourceText, t.value);

        const score = await this.saveScore(t.id, {
          score: combinedScore,
          accuracy: langResult.accuracy,
          fluency: langResult.fluency,
          terminology: langResult.terminology,
          format: heuristic.score,
          issues: allIssues,
          evaluationType: 'ai',
          provider: config.aiEvaluationProvider!,
          model: config.aiEvaluationModel!,
          inputTokens: Math.round(totalUsage.inputTokens / languages.length),
          outputTokens: Math.round(totalUsage.outputTokens / languages.length),
          contentHash,
        });

        results.set(t.language, score);
      }

      console.log(
        `[Quality] AI MULTI-LANG DONE: ${keyName} (${languages.length} langs, ${totalUsage.inputTokens}in/${totalUsage.outputTokens}out)`
      );

      return results;

    } catch (error) {
      console.error('[Quality] Multi-language AI evaluation failed, falling back to heuristics:', error);

      // Fallback to heuristics for all
      for (const t of translations) {
        const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };
        const contentHash = this.generateContentHash(sourceText, t.value);
        const score = await this.saveScore(t.id, {
          score: heuristic.score,
          format: heuristic.score,
          issues: heuristic.issues,
          evaluationType: 'heuristic',
          contentHash,
        });
        results.set(t.language, score);
      }
      return results;
    }
  }

  // ============================================
  // PRIVATE: GLOSSARY CHECK (API-only, needs DB)
  // ============================================

  private async checkGlossary(
    projectId: string,
    source: string,
    target: string,
    targetLocale: string
  ): Promise<{ passed: boolean; score: number; issue?: QualityIssue } | null> {
    // Get glossary terms for this project
    const glossaryTerms = await this.prisma.glossaryEntry.findMany({
      where: { projectId },
      include: {
        translations: {
          where: { targetLanguage: targetLocale },
        },
      },
    });

    if (glossaryTerms.length === 0) return null;

    // Check which source terms appear in the source text
    const relevantTerms = glossaryTerms.filter((term) =>
      source.toLowerCase().includes(term.sourceTerm.toLowerCase())
    );

    if (relevantTerms.length === 0) return null;

    // Check if target translations are present in target text
    const missingTerms = relevantTerms.filter((term) => {
      const targetTerm = term.translations[0]?.targetTerm;
      return targetTerm && !target.toLowerCase().includes(targetTerm.toLowerCase());
    });

    if (missingTerms.length === 0) {
      return { passed: true, score: 100 };
    }

    const score = Math.max(0, 100 - missingTerms.length * 15);

    return {
      passed: false,
      score,
      issue: {
        type: 'glossary_missing',
        severity: 'warning',
        message: `Missing glossary terms: ${missingTerms.map((t) => t.translations[0]?.targetTerm || t.sourceTerm).join(', ')}`,
      },
    };
  }

  // ============================================
  // PRIVATE: AI EVALUATION
  // ============================================

  /**
   * Evaluate translation quality using AI (MQM - Multidimensional Quality Metrics)
   *
   * Uses generateText with system/user message split for prompt caching:
   * - System prompt (static): MQM instructions - cached by Anthropic (90% cheaper) / OpenAI (50% cheaper)
   * - User message (dynamic): Key name, source, target, related translations
   *
   * Dimensions:
   * - Accuracy (40%): Semantic fidelity to source
   * - Fluency (25%): Natural language quality
   * - Terminology (15%): Domain term correctness
   * - Format (20%): Structure preservation (from heuristics)
   */
  private async evaluateWithAI(
    translationId: string,
    keyId: string,
    keyName: string,
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string,
    projectId: string,
    heuristicResult: { score: number; issues: QualityIssue[] },
    contentHash: string
  ): Promise<QualityScore> {
    const config = await this.getConfig(projectId);

    // Fetch nearby keys for context
    let relatedKeys: Array<{ key: string; source: string; target: string }> = [];
    try {
      const keyContextService = new KeyContextService(this.prisma);
      const aiContext = await keyContextService.getAIContext(keyId, targetLocale, sourceLocale);
      relatedKeys = aiContext.relatedTranslations
        .slice(0, 10)
        .map((r) => ({
          key: r.keyName,
          source: r.translations[sourceLocale] || '',
          target: r.translations[targetLocale] || '',
        }))
        .filter((r) => r.source && r.target);
    } catch (error) {
      console.warn('[Quality] Failed to fetch related keys:', error);
    }

    // Get AI provider config and decrypt API key
    const aiConfig = await this.prisma.aITranslationConfig.findUnique({
      where: {
        projectId_provider: {
          projectId,
          provider: config.aiEvaluationProvider as AIProviderEnum,
        },
      },
    });

    if (!aiConfig?.isActive) {
      console.log('[Quality] AI provider not active, falling back to heuristic');
      return this.saveScore(translationId, {
        score: heuristicResult.score,
        format: heuristicResult.score,
        issues: heuristicResult.issues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }

    try {
      const apiKey = this.decryptApiKey(aiConfig.apiKey, aiConfig.apiKeyIv);
      const model = this.getLanguageModel(
        config.aiEvaluationProvider as AIProviderEnum,
        config.aiEvaluationModel!,
        apiKey
      );
      const isAnthropic = config.aiEvaluationProvider === 'ANTHROPIC';

      // Build dynamic user prompt (system prompt is static constant)
      const userPrompt = this.buildMQMUserPrompt(keyName, source, target, sourceLocale, targetLocale, relatedKeys);

      // Call AI with retry logic for invalid JSON
      const { result, usage, cacheMetrics } = await this.callAIWithRetry(
        model,
        userPrompt,
        isAnthropic
      );

      // Log cache metrics
      if (cacheMetrics.cacheRead > 0 || cacheMetrics.cacheCreation > 0) {
        console.log(
          `[Quality] CACHE: ${cacheMetrics.cacheRead} tokens read (90% cheaper), ${cacheMetrics.cacheCreation} tokens created`
        );
      }

      // Combine AI scores with heuristic format score
      // Weights: accuracy 40%, fluency 25%, terminology 15%, format 20%
      const combinedScore = Math.round(
        result.accuracy * 0.4 +
          result.fluency * 0.25 +
          result.terminology * 0.15 +
          heuristicResult.score * 0.2
      );

      // Map AI issues to QualityIssue format
      const aiIssues: QualityIssue[] = result.issues.map((issue) => ({
        type: `ai_${issue.type}` as QualityIssue['type'],
        severity: issue.severity === 'critical' ? 'error' : issue.severity === 'major' ? 'warning' : 'info',
        message: issue.message,
      }));

      const allIssues = [...heuristicResult.issues, ...aiIssues];

      console.log(
        `[Quality] AI EVAL DONE: ${keyName}/${targetLocale} accuracy=${result.accuracy} fluency=${result.fluency} terminology=${result.terminology} format=${heuristicResult.score} → combined=${combinedScore} (tokens: ${usage.inputTokens}in/${usage.outputTokens}out)`
      );

      return this.saveScore(translationId, {
        score: combinedScore,
        accuracy: result.accuracy,
        fluency: result.fluency,
        terminology: result.terminology,
        format: heuristicResult.score,
        issues: allIssues,
        evaluationType: 'ai',
        provider: config.aiEvaluationProvider!,
        model: config.aiEvaluationModel!,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        contentHash,
      });
    } catch (error) {
      console.error('[Quality] AI evaluation failed, falling back to heuristic:', error);
      return this.saveScore(translationId, {
        score: heuristicResult.score,
        format: heuristicResult.score,
        issues: heuristicResult.issues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }
  }

  /**
   * Call AI with retry logic for invalid JSON responses
   *
   * - Uses generateText with system/user messages for prompt caching
   * - Anthropic: explicit cacheControl on system message
   * - OpenAI: auto-caches if system prompt >= 1024 tokens
   * - Retries up to MAX_RETRIES times with error feedback
   */
  private async callAIWithRetry(
    model: LanguageModel,
    userPrompt: string,
    isAnthropic: boolean
  ): Promise<{
    result: MQMResult;
    usage: { inputTokens: number; outputTokens: number };
    cacheMetrics: { cacheRead: number; cacheCreation: number };
  }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Build messages with cache control for Anthropic
      const systemMessage = {
        role: 'system' as const,
        content: MQM_SYSTEM_PROMPT,
        ...(isAnthropic && {
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        }),
      };

      const userMessage = {
        role: 'user' as const,
        content: attempt === 0
          ? userPrompt
          : `${userPrompt}\n\nIMPORTANT: Return valid JSON only. Previous response was invalid: ${lastError?.message}`,
      };

      const messages = [systemMessage, userMessage];

      const { text, usage, providerMetadata } = await generateText({
        model,
        messages,
      });

      // Extract cache metrics from Anthropic response
      const anthropicMeta = providerMetadata?.anthropic as {
        cacheReadInputTokens?: number;
        cacheCreationInputTokens?: number;
      } | undefined;

      const cacheMetrics = {
        cacheRead: anthropicMeta?.cacheReadInputTokens || 0,
        cacheCreation: anthropicMeta?.cacheCreationInputTokens || 0,
      };

      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON object found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const result = this.validateMQMResponse(parsed);

        if (attempt > 0) {
          console.log(`[Quality] JSON parse succeeded on retry ${attempt}`);
        }

        return {
          result,
          usage: {
            inputTokens: usage?.inputTokens || 0,
            outputTokens: usage?.outputTokens || 0,
          },
          cacheMetrics,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `[Quality] JSON parse failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`
        );

        if (attempt === MAX_RETRIES) {
          throw new Error(`Failed to get valid JSON after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
        }
      }
    }

    throw lastError; // TypeScript satisfaction
  }

  /**
   * Validate MQM response structure
   */
  private validateMQMResponse(obj: unknown): MQMResult {
    if (typeof obj !== 'object' || obj === null) {
      throw new Error('Invalid MQM response: not an object');
    }

    const { accuracy, fluency, terminology, issues } = obj as Record<string, unknown>;

    if (typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
      throw new Error(`Invalid accuracy score: ${accuracy}`);
    }
    if (typeof fluency !== 'number' || fluency < 0 || fluency > 100) {
      throw new Error(`Invalid fluency score: ${fluency}`);
    }
    if (typeof terminology !== 'number' || terminology < 0 || terminology > 100) {
      throw new Error(`Invalid terminology score: ${terminology}`);
    }

    // Validate issues array if present
    const validatedIssues: MQMResult['issues'] = [];
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (
          typeof issue === 'object' &&
          issue !== null &&
          typeof issue.type === 'string' &&
          typeof issue.severity === 'string' &&
          typeof issue.message === 'string'
        ) {
          validatedIssues.push({
            type: issue.type as 'accuracy' | 'fluency' | 'terminology',
            severity: issue.severity as 'critical' | 'major' | 'minor',
            message: issue.message,
          });
        }
      }
    }

    return { accuracy, fluency, terminology, issues: validatedIssues };
  }

  /**
   * Build MQM user prompt (dynamic content only)
   *
   * System prompt (static, cached) is defined in MQM_SYSTEM_PROMPT constant.
   * This method builds only the dynamic user message.
   */
  private buildMQMUserPrompt(
    keyName: string,
    source: string,
    target: string,
    sourceLocale: string,
    targetLocale: string,
    relatedKeys: Array<{ key: string; source: string; target: string }> = []
  ): string {
    let prompt = `Key: ${keyName}
Source (${sourceLocale}): "${source}"
Target (${targetLocale}): "${target}"`;

    // Add related keys context if available
    if (relatedKeys.length > 0) {
      prompt += `

Nearby translations for context:
${relatedKeys.map((r) => `- ${r.key}: "${r.source}" → "${r.target}"`).join('\n')}`;
    }

    return prompt;
  }

  /**
   * Build multi-language XML prompt for batch evaluation
   *
   * Uses XML structure for clear separation of:
   * - Key name
   * - Source text
   * - All target translations
   * - Related keys with all language translations
   */
  private buildMultiLanguagePrompt(
    keyName: string,
    sourceText: string,
    sourceLocale: string,
    translations: Array<{ language: string; value: string }>,
    relatedKeys: Array<{
      keyName: string;
      source: string;
      translations: Record<string, string>;
    }>
  ): string {
    const langs = translations.map(t => t.language);

    let xml = `<evaluation_request>
  <key>${this.escapeXml(keyName)}</key>
  <source lang="${sourceLocale}">${this.escapeXml(sourceText)}</source>

  <translations>
${translations.map(t => `    <translation lang="${t.language}">${this.escapeXml(t.value)}</translation>`).join('\n')}
  </translations>`;

    if (relatedKeys.length > 0) {
      xml += `

  <related_keys>
${relatedKeys.map(rk => `    <key name="${this.escapeXml(rk.keyName)}">
      <source lang="${sourceLocale}">${this.escapeXml(rk.source)}</source>
${langs.filter(l => rk.translations[l]).map(l => `      <translation lang="${l}">${this.escapeXml(rk.translations[l])}</translation>`).join('\n')}
    </key>`).join('\n')}
  </related_keys>`;
    }

    xml += `
</evaluation_request>`;

    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Call AI with conversation-based retry for multi-language evaluation
   *
   * Strategy:
   * - Keep conversation history so AI learns from mistakes
   * - Max 7 turns per conversation
   * - If still failing after 7 turns, clear history and start fresh
   * - Max 3 fresh starts (21 total attempts)
   *
   * Uses Zod for validation with detailed path errors
   */
  private async callAIWithConversationRetry<T>(
    model: LanguageModel,
    userPrompt: string,
    schema: z.ZodType<T>,
    isAnthropic: boolean
  ): Promise<{
    result: T;
    totalUsage: { inputTokens: number; outputTokens: number };
    cacheMetrics: { cacheRead: number; cacheCreation: number };
  }> {
    for (let freshStart = 1; freshStart <= MAX_FRESH_STARTS; freshStart++) {
      // Build conversation history - use separate arrays for each role to satisfy TypeScript
      const systemMessage = {
        role: 'system' as const,
        content: MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
        ...(isAnthropic && {
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        }),
      };

      // Start with system + initial user message
      const conversationHistory: Array<
        | { role: 'user'; content: string }
        | { role: 'assistant'; content: string }
      > = [
        { role: 'user' as const, content: userPrompt },
      ];

      let totalUsage = { inputTokens: 0, outputTokens: 0 };
      let cacheMetrics = { cacheRead: 0, cacheCreation: 0 };

      for (let turn = 1; turn <= MAX_TURNS_PER_CONVERSATION; turn++) {
        console.log(
          `[Quality] Fresh start ${freshStart}/${MAX_FRESH_STARTS}, turn ${turn}/${MAX_TURNS_PER_CONVERSATION}`
        );

        // Build messages array for this call
        const messages = [systemMessage, ...conversationHistory];

        const { text, usage, providerMetadata } = await generateText({
          model,
          messages,
        });

        // Accumulate usage
        totalUsage.inputTokens += usage?.inputTokens || 0;
        totalUsage.outputTokens += usage?.outputTokens || 0;

        // Extract cache metrics from Anthropic response
        const anthropicMeta = providerMetadata?.anthropic as {
          cacheReadInputTokens?: number;
          cacheCreationInputTokens?: number;
        } | undefined;

        cacheMetrics.cacheRead += anthropicMeta?.cacheReadInputTokens || 0;
        cacheMetrics.cacheCreation += anthropicMeta?.cacheCreationInputTokens || 0;

        // Add assistant response to history
        conversationHistory.push({ role: 'assistant' as const, content: text });

        try {
          // 1. Extract JSON from response (handle markdown code blocks)
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON object found in response');
          }

          // 2. Parse JSON
          const parsed = JSON.parse(jsonMatch[0]);

          // 3. Validate with Zod
          const validated = schema.parse(parsed);

          console.log(`[Quality] ✅ Success on fresh start ${freshStart}, turn ${turn}`);
          return { result: validated, totalUsage, cacheMetrics };

        } catch (error) {
          // Format error message for AI to understand
          let errorMessage: string;
          if (error instanceof z.ZodError) {
            errorMessage = error.issues
              .map((e) => `Path: ${e.path.join('.')}, Error: ${e.message}`)
              .join('\n');
          } else if (error instanceof SyntaxError) {
            errorMessage = `JSON syntax error: ${error.message}`;
          } else {
            errorMessage = String(error);
          }

          console.warn(`[Quality] Turn ${turn} failed:\n${errorMessage}`);

          if (turn < MAX_TURNS_PER_CONVERSATION) {
            // Add error feedback to conversation (AI sees its mistake + all previous attempts)
            conversationHistory.push({
              role: 'user' as const,
              content: `<validation_error>\n${errorMessage}\n</validation_error>\n\nPlease fix the JSON and try again. Return ONLY the corrected JSON.`,
            });
          }
        }
      }

      console.warn(
        `[Quality] Fresh start ${freshStart} exhausted all ${MAX_TURNS_PER_CONVERSATION} turns, resetting...`
      );
    }

    throw new Error(
      `Failed after ${MAX_FRESH_STARTS} fresh starts × ${MAX_TURNS_PER_CONVERSATION} turns`
    );
  }

  /**
   * Get language model for AI provider
   */
  private getLanguageModel(
    provider: AIProviderEnum,
    modelId: string,
    apiKey: string
  ): LanguageModel {
    switch (provider) {
      case 'OPENAI': {
        const openai = createOpenAI({ apiKey });
        return openai(modelId);
      }
      case 'ANTHROPIC': {
        const anthropic = createAnthropic({ apiKey });
        return anthropic(modelId);
      }
      default:
        throw new Error(`Unsupported AI provider for quality evaluation: ${provider}`);
    }
  }

  /**
   * Decrypt API key stored in database
   */
  private decryptApiKey(encrypted: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');

    // Split encrypted data and auth tag (last 32 hex chars = 16 bytes)
    const authTag = Buffer.from(encrypted.slice(-32), 'hex');
    const encryptedData = encrypted.slice(0, -32);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption key from environment
   * Uses same key as AI Translation service for consistency
   */
  private getEncryptionKey(): Buffer {
    const keyHex = process.env.AI_ENCRYPTION_KEY || process.env.MT_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'AI_ENCRYPTION_KEY (or MT_ENCRYPTION_KEY) must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
      );
    }
    return Buffer.from(keyHex, 'hex');
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
      format?: number;
      issues: QualityIssue[];
      evaluationType: 'heuristic' | 'ai' | 'hybrid';
      provider?: string;
      model?: string;
      inputTokens?: number;
      outputTokens?: number;
      contentHash?: string;
    }
  ): Promise<QualityScore> {
    await this.prisma.translationQualityScore.upsert({
      where: { translationId },
      update: {
        score: data.score,
        accuracyScore: data.accuracy ?? null,
        fluencyScore: data.fluency ?? null,
        terminologyScore: data.terminology ?? null,
        formatScore: data.format || data.score,
        evaluationType: data.evaluationType,
        provider: data.provider ?? null,
        model: data.model ?? null,
        issues: data.issues as any,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        contentHash: data.contentHash ?? null,
      },
      create: {
        translationId,
        score: data.score,
        accuracyScore: data.accuracy ?? null,
        fluencyScore: data.fluency ?? null,
        terminologyScore: data.terminology ?? null,
        formatScore: data.format || data.score,
        evaluationType: data.evaluationType,
        provider: data.provider ?? null,
        model: data.model ?? null,
        issues: data.issues as any,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        contentHash: data.contentHash ?? null,
      },
    });

    return {
      score: data.score,
      accuracy: data.accuracy,
      fluency: data.fluency,
      terminology: data.terminology,
      format: data.format,
      passed: data.score >= 80,
      needsAIEvaluation: false, // Already evaluated
      issues: data.issues,
      evaluationType: data.evaluationType,
      cached: false,
    };
  }

  private formatCachedScore(stored: PrismaQualityScore): QualityScore {
    return {
      score: stored.score,
      accuracy: stored.accuracyScore ?? undefined,
      fluency: stored.fluencyScore ?? undefined,
      terminology: stored.terminologyScore ?? undefined,
      format: stored.formatScore,
      passed: stored.score >= 80,
      needsAIEvaluation: false,
      issues: (stored.issues as unknown) as QualityIssue[],
      evaluationType: stored.evaluationType as 'heuristic' | 'ai' | 'hybrid',
      cached: true,
    };
  }

  /**
   * Generate content hash for cache validation (public for batch pre-filtering)
   * Hash is based on source + target text.
   */
  generateContentHash(source: string, target: string): string {
    return createHash('sha256').update(`${source}|${target}`).digest('hex').substring(0, 16);
  }

  private async scoreFormatOnly(
    translationId: string,
    text: string
  ): Promise<QualityScore> {
    // When there's no source to compare, just validate ICU syntax
    const icuCheck = await this.validateICUSyntax(text);
    const score = icuCheck.valid ? 100 : 50;
    const issues: QualityIssue[] = icuCheck.valid
      ? []
      : [
          {
            type: 'icu_syntax',
            severity: 'error',
            message: icuCheck.error || 'Invalid ICU syntax',
          },
        ];

    return this.saveScore(translationId, {
      score,
      format: score,
      issues,
      evaluationType: 'heuristic',
    });
  }
}
