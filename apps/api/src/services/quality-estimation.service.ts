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

import { PrismaClient, type TranslationQualityScore as PrismaQualityScore } from '@prisma/client';
import {
  runQualityChecks,
  calculateScore,
  validateICUSyntaxAsync,
  type QualityScoreResult,
  type QualityIssue,
} from '@lingx/shared';

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

/**
 * Quality Estimation Service
 */
export class QualityEstimationService {
  constructor(
    private prisma: PrismaClient,
    // AI service is optional - if not provided, AI evaluation is disabled
    private aiService?: any // TODO: Type this properly when implementing AI evaluation
  ) {}

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

    // Check cache (unless forceAI)
    if (translation.qualityScore && !options?.forceAI) {
      // Smart invalidation: check if translation newer than score
      if (translation.updatedAt <= translation.qualityScore.createdAt) {
        return this.formatCachedScore(translation.qualityScore);
      }
      // Fall through to re-evaluate
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

    // If heuristics pass and AI not forced/needed, return heuristic score
    if (scoreResult.passed && !options?.forceAI && !needsAI) {
      return this.saveScore(translationId, {
        score: Math.round(finalScore),
        format: scoreResult.score,
        issues: allIssues,
        evaluationType: 'heuristic',
      });
    }

    // Level 3: AI evaluation (if enabled and needed)
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

    // Return heuristic result if AI not available/enabled
    return this.saveScore(translationId, {
      score: Math.round(finalScore),
      format: scoreResult.score,
      issues: allIssues,
      evaluationType: 'heuristic',
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
  // PRIVATE: AI EVALUATION (Placeholder for now)
  // ============================================

  private async evaluateWithAI(
    translationId: string,
    _source: string,
    _target: string,
    _sourceLocale: string,
    _targetLocale: string,
    _projectId: string,
    heuristicResult: { score: number; issues: QualityIssue[] }
  ): Promise<QualityScore> {
    // TODO: Implement AI evaluation using MQM (Multidimensional Quality Metrics)
    // For now, return heuristic result with 'hybrid' type to indicate AI was considered
    console.log('[Quality] AI evaluation not yet implemented, using heuristic result');

    return this.saveScore(translationId, {
      score: heuristicResult.score,
      format: heuristicResult.score,
      issues: heuristicResult.issues,
      evaluationType: 'heuristic',
    });
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
