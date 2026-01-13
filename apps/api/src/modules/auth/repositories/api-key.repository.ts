/**
 * API Key Repository
 *
 * Data access layer for API key operations in the auth module.
 * Encapsulates all Prisma queries for API key-related operations.
 */
import type { ApiKey, PrismaClient } from '@prisma/client';

export type ApiKeyWithoutHash = Omit<ApiKey, 'keyHash'>;

export interface CreateApiKeyData {
  name: string;
  userId: string;
  keyHash: string;
  keyPrefix: string;
  expiresAt?: Date;
}

export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new API key.
   * Key hash should be pre-computed by the handler.
   */
  async create(data: CreateApiKeyData): Promise<ApiKeyWithoutHash> {
    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });

    const { keyHash: _, ...apiKeyWithoutHash } = apiKey;
    return apiKeyWithoutHash;
  }

  /**
   * Find all active (non-revoked) API keys for a user.
   * Returns keys without the hash field.
   */
  async findByUserId(userId: string): Promise<ApiKeyWithoutHash[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(({ keyHash: _, ...rest }) => rest);
  }

  /**
   * Find an API key by ID with ownership verification.
   * Returns the full API key including hash.
   */
  async findByIdAndUserId(id: string, userId: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Revoke an API key by setting revokedAt timestamp.
   */
  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Find an API key by its hash.
   * Used for API key validation.
   */
  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
    });
  }

  /**
   * Update the lastUsedAt timestamp for an API key.
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
