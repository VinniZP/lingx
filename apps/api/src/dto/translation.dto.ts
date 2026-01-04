/**
 * Translation DTOs - transforms Prisma Translation/TranslationKey models to API response format
 */
import type {
  EmbeddedQualityScore,
  KeyListResponse,
  TranslationKeyResponse,
  TranslationValue,
} from '@lingx/shared';
import type { Translation, TranslationKey, TranslationQualityScore } from '@prisma/client';

/** Prisma Translation with optional quality score included */
type TranslationWithOptionalQuality = Translation & {
  qualityScore?: TranslationQualityScore | null;
};

/** Prisma TranslationKey with translations (including optional quality scores) included */
type KeyWithTranslations = TranslationKey & {
  translations: TranslationWithOptionalQuality[];
};

/**
 * Transform Prisma TranslationQualityScore to EmbeddedQualityScore
 *
 * The contentHash is exposed so the frontend can detect stale scores
 * by comparing with generateContentHash(sourceValue, targetValue).
 */
function toQualityScoreDto(
  score: TranslationQualityScore | null | undefined
): EmbeddedQualityScore | null {
  if (!score) return null;
  return {
    score: score.score,
    accuracy: score.accuracyScore,
    fluency: score.fluencyScore,
    terminology: score.terminologyScore,
    format: score.formatScore,
    evaluationType: score.evaluationType as 'heuristic' | 'ai' | 'hybrid',
    contentHash: score.contentHash,
  };
}

/**
 * Transform Prisma Translation to TranslationValue
 */
export function toTranslationValueDto(
  translation: TranslationWithOptionalQuality
): TranslationValue {
  return {
    id: translation.id,
    language: translation.language,
    value: translation.value,
    status: translation.status,
    statusUpdatedAt: translation.statusUpdatedAt?.toISOString() ?? null,
    statusUpdatedBy: translation.statusUpdatedBy,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: translation.updatedAt.toISOString(),
    qualityScore: toQualityScoreDto(translation.qualityScore),
  };
}

/**
 * Transform Prisma TranslationKey with translations to TranslationKeyResponse
 */
export function toTranslationKeyDto(key: KeyWithTranslations): TranslationKeyResponse {
  return {
    id: key.id,
    name: key.name,
    namespace: key.namespace,
    description: key.description,
    branchId: key.branchId,
    translations: key.translations.map(toTranslationValueDto),
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

/**
 * Transform array of TranslationKeys
 */
export function toTranslationKeyDtoList(keys: KeyWithTranslations[]): TranslationKeyResponse[] {
  return keys.map(toTranslationKeyDto);
}

/**
 * Transform KeyListResult (pagination) to KeyListResponse
 */
export function toKeyListResultDto(result: {
  keys: KeyWithTranslations[];
  total: number;
  page: number;
  limit: number;
}): KeyListResponse {
  return {
    keys: toTranslationKeyDtoList(result.keys),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
}
