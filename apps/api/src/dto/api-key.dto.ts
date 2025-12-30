/**
 * API Key DTOs - transforms Prisma ApiKey model to API response format
 */
import type { ApiKey } from '@prisma/client';
import type { ApiKeyItem, CreateApiKeyResponse } from '@localeflow/shared';

/**
 * Transform Prisma ApiKey to ApiKeyItem (for listing)
 * Converts Dates to ISO strings and computes revoked status
 */
export function toApiKeyDto(apiKey: Omit<ApiKey, 'keyHash'>): ApiKeyItem {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    revoked: apiKey.revokedAt !== null,
    createdAt: apiKey.createdAt.toISOString(),
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
  };
}

/**
 * Transform array of API keys
 */
export function toApiKeyDtoList(apiKeys: Omit<ApiKey, 'keyHash'>[]): ApiKeyItem[] {
  return apiKeys.map(toApiKeyDto);
}

/**
 * Transform newly created API key with full key value
 */
export function toApiKeyCreatedDto(
  apiKey: Omit<ApiKey, 'keyHash'>,
  fullKey: string
): CreateApiKeyResponse {
  return {
    id: apiKey.id,
    name: apiKey.name,
    key: fullKey,
    keyPrefix: apiKey.keyPrefix,
    createdAt: apiKey.createdAt.toISOString(),
  };
}

/**
 * Transform ApiKeyWithFullKey service result to CreateApiKeyResponse
 */
export function toApiKeyCreatedDtoFromService(result: {
  key: string;
  apiKey: Omit<ApiKey, 'keyHash'>;
}): CreateApiKeyResponse {
  return toApiKeyCreatedDto(result.apiKey, result.key);
}
