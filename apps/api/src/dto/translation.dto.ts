/**
 * Translation DTOs - transforms Prisma Translation/TranslationKey models to API response format
 */
import type { TranslationKey, Translation } from '@prisma/client';
import type {
  TranslationValue,
  TranslationKeyResponse,
  KeyListResponse,
} from '@localeflow/shared';

/** Prisma TranslationKey with translations included */
type KeyWithTranslations = TranslationKey & {
  translations: Translation[];
};

/**
 * Transform Prisma Translation to TranslationValue
 */
export function toTranslationValueDto(translation: Translation): TranslationValue {
  return {
    id: translation.id,
    language: translation.language,
    value: translation.value,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: translation.updatedAt.toISOString(),
  };
}

/**
 * Transform Prisma TranslationKey with translations to TranslationKeyResponse
 */
export function toTranslationKeyDto(key: KeyWithTranslations): TranslationKeyResponse {
  return {
    id: key.id,
    name: key.name,
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
