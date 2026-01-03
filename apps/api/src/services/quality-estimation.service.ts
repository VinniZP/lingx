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

import { PrismaClient, AIProvider as AIProviderEnum } from '@prisma/client';
import {
  runQualityChecks,
  calculateScore,
  validateICUSyntaxAsync,
  type QualityIssue,
  type QualityScore,
  type BranchQualitySummary,
  type QualityScoringConfig,
  type EvaluateOptions,
} from '@lingx/shared';
import { KeyContextService } from './key-context.service.js';
import { NotFoundError, ValidationError } from '../plugins/error-handler.js';

import {
  createLanguageModel,
  type AIProvider,
  generateContentHash,
  GlossaryEvaluator,
  GLOSSARY_MAX_PENALTY,
  AIEvaluator,
  ScoreRepository,
  getEncryptionKey,
  decryptApiKey,
  calculateCombinedScore,
  mapAIIssuesToQualityIssues,
  buildFormatOnlyResult,
  DEFAULT_QUALITY_CONFIG,
} from './quality/index.js';

export type { QualityScore, BranchQualitySummary, EvaluateOptions };

/** Number of translations to evaluate in parallel per batch */
const EVALUATION_BATCH_SIZE = 10;

/**
 * Quality Estimation Service
 */
export class QualityEstimationService {
  constructor(
    private prisma: PrismaClient,
    private scoreRepository: ScoreRepository,
    private aiEvaluator: AIEvaluator,
    private glossaryEvaluator: GlossaryEvaluator,
    private keyContextService: KeyContextService,
  ) {}

  /**
   * Get cached quality score for a translation (no evaluation)
   * Returns null if no cached score exists
   */
  async getCachedScore(translationId: string): Promise<QualityScore | null> {
    const result = await this.scoreRepository.findByTranslationId(translationId);
    return result?.score ?? null;
  }

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

    if (!translation) {
      throw new NotFoundError('Translation');
    }
    if (!translation.value) {
      throw new ValidationError('Translation value is empty');
    }

    const project = translation.key.branch.space.project;
    const sourceLanguage = project.defaultLanguage;

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
      const currentHash = generateContentHash(sourceTranslation.value, translation.value);
      if (translation.qualityScore.contentHash === currentHash) {
        console.log(`[Quality] CACHE HIT: ${keyName}/${lang} score=${translation.qualityScore.score}`);
        return this.scoreRepository.formatStoredScore(translation.qualityScore);
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

    const scoreResult = calculateScore(checkResult);

    // Level 2: Glossary check (API-only, needs DB)
    const glossaryResult = await this.checkGlossary(
      project.id,
      sourceTranslation.value,
      translation.value,
      translation.language
    );

    let finalScore = scoreResult.score;
    let needsAI = scoreResult.needsAIEvaluation;
    const allIssues = [...scoreResult.issues];

    if (glossaryResult && !glossaryResult.passed) {
      // Reduce score for glossary issues (up to GLOSSARY_MAX_PENALTY points)
      finalScore -= Math.min(GLOSSARY_MAX_PENALTY, 100 - glossaryResult.score);
      if (glossaryResult.issue) allIssues.push(glossaryResult.issue);
      needsAI = true; // Glossary issues warrant deeper analysis
    }

    const contentHash = generateContentHash(sourceTranslation.value, translation.value);

    // Level 3: AI evaluation (if enabled and provider configured)
    const config = await this.getConfig(project.id);
    const aiAvailable = config.aiEvaluationEnabled && config.aiEvaluationProvider && config.aiEvaluationModel;

    // If heuristics pass and AI not forced/needed, return heuristic score
    // forceAI=true means "always use AI" (but still respect cache)
    if (scoreResult.passed && !options?.forceAI && !needsAI) {
      console.log(`[Quality] HEURISTIC PASS: ${keyName}/${lang} score=${Math.round(finalScore)} (skipping AI)`);
      return this.scoreRepository.save(translationId, {
        score: Math.round(finalScore),
        format: scoreResult.score,
        issues: allIssues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }

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

    console.log(`[Quality] HEURISTIC ONLY: ${keyName}/${lang} score=${Math.round(finalScore)} (AI not configured)`);
    return this.scoreRepository.save(translationId, {
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

    for (let i = 0; i < translationIds.length; i += EVALUATION_BATCH_SIZE) {
      const batch = translationIds.slice(i, i + EVALUATION_BATCH_SIZE);
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
    return this.scoreRepository.getBranchSummary(branchId);
  }

  /**
   * Get or create quality scoring config for project
   */
  async getConfig(projectId: string): Promise<QualityScoringConfig> {
    const config = await this.prisma.qualityScoringConfig.findUnique({
      where: { projectId },
    });
    return config || DEFAULT_QUALITY_CONFIG;
  }

  /**
   * Update quality scoring config
   */
  async updateConfig(
    projectId: string,
    input: Partial<QualityScoringConfig>
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

    const config = await this.getConfig(projectId);
    const aiAvailable = config.aiEvaluationEnabled && config.aiEvaluationProvider && config.aiEvaluationModel;

    if (!aiAvailable) {
      console.log(`[Quality] AI not configured, using heuristics for key ${keyName}`);
      return this.saveHeuristicResults(translations, sourceText, heuristicResults);
    }

    // Fetch related keys with ALL language translations
    let relatedKeys: Array<{
      keyName: string;
      source: string;
      translations: Record<string, string>;
    }> = [];

    try {
      const aiContext = await this.keyContextService.getAIContext(keyId, languages[0], sourceLocale);

      for (const r of aiContext.relatedTranslations.slice(0, 5)) {
        // r.translations is keyed by language code - filter to languages we're evaluating
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

      relatedKeys = relatedKeys.filter(rk => rk.source);
    } catch (error) {
      console.warn('[Quality] Failed to fetch related keys:', error);
    }

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
      return this.saveHeuristicResults(translations, sourceText, heuristicResults);
    }

    try {
      const apiKey = this.decryptApiKeyFromDb(aiConfig.apiKey, aiConfig.apiKeyIv);
      const model = createLanguageModel({
        provider: config.aiEvaluationProvider as AIProvider,
        modelId: config.aiEvaluationModel!,
        apiKey,
      });
      const isAnthropic = config.aiEvaluationProvider === 'ANTHROPIC';

      console.log(`[Quality] AI MULTI-LANG START: ${keyName} (${languages.join(', ')})`);
      const aiResults = await this.aiEvaluator.evaluateMultiLanguage(
        keyName,
        sourceText,
        sourceLocale,
        translations.map(t => ({ language: t.language, value: t.value })),
        relatedKeys,
        { model, isAnthropic }
      );

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const t of translations) {
        const langResult = aiResults.get(t.language);
        const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };

        if (!langResult) {
          console.warn(`[Quality] No AI result for ${t.language}, using heuristic`);
          const contentHash = generateContentHash(sourceText, t.value);
          const score = await this.scoreRepository.save(t.id, {
            score: heuristic.score,
            format: heuristic.score,
            issues: heuristic.issues,
            evaluationType: 'heuristic',
            contentHash,
          });
          results.set(t.language, score);
          continue;
        }

        totalInputTokens += langResult.usage.inputTokens;
        totalOutputTokens += langResult.usage.outputTokens;

        if (langResult.cacheMetrics.cacheRead > 0 || langResult.cacheMetrics.cacheCreation > 0) {
          console.log(
            `[Quality] CACHE (${t.language}): ${langResult.cacheMetrics.cacheRead} tokens read, ${langResult.cacheMetrics.cacheCreation} tokens created`
          );
        }

        const combinedScore = calculateCombinedScore(
          {
            accuracy: langResult.accuracy,
            fluency: langResult.fluency,
            terminology: langResult.terminology,
          },
          heuristic.score
        );

        const aiIssues = mapAIIssuesToQualityIssues(langResult.issues);
        const allIssues = [...heuristic.issues, ...aiIssues];
        const contentHash = generateContentHash(sourceText, t.value);

        const score = await this.scoreRepository.save(t.id, {
          score: combinedScore,
          accuracy: langResult.accuracy,
          fluency: langResult.fluency,
          terminology: langResult.terminology,
          format: heuristic.score,
          issues: allIssues,
          evaluationType: 'ai',
          provider: config.aiEvaluationProvider!,
          model: config.aiEvaluationModel!,
          inputTokens: langResult.usage.inputTokens,
          outputTokens: langResult.usage.outputTokens,
          contentHash,
        });

        results.set(t.language, score);
      }

      console.log(
        `[Quality] AI MULTI-LANG DONE: ${keyName} (${languages.length} langs, ${totalInputTokens}in/${totalOutputTokens}out)`
      );

      return results;

    } catch (error) {
      console.error('[Quality] Multi-language AI evaluation failed, falling back to heuristics:', error);
      return this.saveHeuristicResults(translations, sourceText, heuristicResults);
    }
  }


  /**
   * Save heuristic results for translations (helper to reduce duplication)
   */
  private async saveHeuristicResults(
    translations: Array<{ id: string; language: string; value: string }>,
    sourceText: string,
    heuristicResults: Map<string, { score: number; issues: QualityIssue[] }>
  ): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();
    for (const t of translations) {
      const heuristic = heuristicResults.get(t.language) || { score: 100, issues: [] };
      const contentHash = generateContentHash(sourceText, t.value);
      const score = await this.scoreRepository.save(t.id, {
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

  private async checkGlossary(
    projectId: string,
    source: string,
    target: string,
    targetLocale: string
  ): Promise<{ passed: boolean; score: number; issue?: QualityIssue } | null> {
    return this.glossaryEvaluator.evaluate(projectId, source, target, targetLocale);
  }

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

    let relatedKeys: Array<{ key: string; source: string; target: string }> = [];
    try {
      const aiContext = await this.keyContextService.getAIContext(keyId, targetLocale, sourceLocale);
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
      return this.scoreRepository.save(translationId, {
        score: heuristicResult.score,
        format: heuristicResult.score,
        issues: heuristicResult.issues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }

    try {
      const apiKey = this.decryptApiKeyFromDb(aiConfig.apiKey, aiConfig.apiKeyIv);
      const model = createLanguageModel({
        provider: config.aiEvaluationProvider as AIProvider,
        modelId: config.aiEvaluationModel!,
        apiKey,
      });
      const isAnthropic = config.aiEvaluationProvider === 'ANTHROPIC';

      const aiResult = await this.aiEvaluator.evaluateSingle(
        keyName,
        source,
        target,
        sourceLocale,
        targetLocale,
        relatedKeys,
        { model, isAnthropic }
      );

      if (aiResult.cacheMetrics.cacheRead > 0 || aiResult.cacheMetrics.cacheCreation > 0) {
        console.log(
          `[Quality] CACHE: ${aiResult.cacheMetrics.cacheRead} tokens read (90% cheaper), ${aiResult.cacheMetrics.cacheCreation} tokens created`
        );
      }

      const combinedScore = calculateCombinedScore(
        {
          accuracy: aiResult.accuracy,
          fluency: aiResult.fluency,
          terminology: aiResult.terminology,
        },
        heuristicResult.score
      );

      const aiIssues = mapAIIssuesToQualityIssues(aiResult.issues);
      const allIssues = [...heuristicResult.issues, ...aiIssues];

      console.log(
        `[Quality] AI EVAL DONE: ${keyName}/${targetLocale} accuracy=${aiResult.accuracy} fluency=${aiResult.fluency} terminology=${aiResult.terminology} format=${heuristicResult.score} → combined=${combinedScore} (tokens: ${aiResult.usage.inputTokens}in/${aiResult.usage.outputTokens}out)`
      );

      return this.scoreRepository.save(translationId, {
        score: combinedScore,
        accuracy: aiResult.accuracy,
        fluency: aiResult.fluency,
        terminology: aiResult.terminology,
        format: heuristicResult.score,
        issues: allIssues,
        evaluationType: 'ai',
        provider: config.aiEvaluationProvider!,
        model: config.aiEvaluationModel!,
        inputTokens: aiResult.usage.inputTokens,
        outputTokens: aiResult.usage.outputTokens,
        contentHash,
      });
    } catch (error) {
      console.error('[Quality] AI evaluation failed, falling back to heuristic:', error);
      return this.scoreRepository.save(translationId, {
        score: heuristicResult.score,
        format: heuristicResult.score,
        issues: heuristicResult.issues,
        evaluationType: 'heuristic',
        contentHash,
      });
    }
  }

  /**
   * Decrypt API key stored in database.
   * Wrapper around extracted pure function with error logging.
   */
  private decryptApiKeyFromDb(encrypted: string, ivHex: string): string {
    try {
      const key = getEncryptionKey();
      return decryptApiKey(encrypted, ivHex, key);
    } catch (error) {
      console.error('[Quality] Failed to decrypt API key:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Invalid or corrupted API key configuration');
    }
  }

  private async scoreFormatOnly(
    translationId: string,
    text: string
  ): Promise<QualityScore> {
    const icuCheck = await this.validateICUSyntax(text);
    const result = buildFormatOnlyResult(icuCheck);

    return this.scoreRepository.save(translationId, {
      score: result.score,
      format: result.score,
      issues: result.issues,
      evaluationType: 'heuristic',
    });
  }
}
