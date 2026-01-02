/**
 * API Key Service
 *
 * Handles API key creation, validation, and revocation.
 * Keys are prefixed with "lf_" and stored as SHA-256 hashes.
 */
import { PrismaClient, ApiKey } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { NotFoundError } from '../plugins/error-handler.js';

/** Prefix for Lingx API keys */
const KEY_PREFIX = 'lf_';
/** Length of random bytes for key generation (32 bytes = 64 hex characters) */
const KEY_LENGTH = 32;

export interface CreateApiKeyInput {
  name: string;
  userId: string;
  expiresAt?: Date;
}

export interface ApiKeyWithFullKey {
  key: string;
  apiKey: Omit<ApiKey, 'keyHash'>;
}

export class ApiKeyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new API key
   *
   * The full key is returned only once at creation time.
   * Only the SHA-256 hash is stored in the database.
   *
   * @param input - API key creation data
   * @returns The full key (shown once) and API key metadata
   */
  async create(input: CreateApiKeyInput): Promise<ApiKeyWithFullKey> {
    // Generate random key
    const randomPart = randomBytes(KEY_LENGTH).toString('hex');
    const fullKey = `${KEY_PREFIX}${randomPart}`;

    // Hash for storage
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.substring(0, 11); // "lf_" + first 8 chars

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: input.name,
        keyHash,
        keyPrefix,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });

    // Return key (only shown once) and apiKey metadata
    const { keyHash: _, ...apiKeyWithoutHash } = apiKey;
    return {
      key: fullKey,
      apiKey: apiKeyWithoutHash,
    };
  }

  /**
   * List all active API keys for a user
   *
   * Does not return revoked keys or the key hash.
   *
   * @param userId - User ID
   * @returns Array of API key metadata (without hashes)
   */
  async list(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
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
   * Revoke an API key
   *
   * Sets the revokedAt timestamp. The key cannot be used after revocation.
   *
   * @param id - API key ID
   * @param userId - User ID (for ownership verification)
   * @throws NotFoundError if key not found or not owned by user
   */
  async revoke(id: string, userId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Validate an API key
   *
   * Checks if the key is valid, not revoked, and not expired.
   * Updates the lastUsedAt timestamp on successful validation.
   *
   * @param key - The full API key to validate
   * @returns User ID and API key ID if valid, null otherwise
   */
  async validateKey(key: string): Promise<{ userId: string; apiKeyId: string } | null> {
    // Hash the provided key
    const keyHash = createHash('sha256').update(key).digest('hex');

    // Find matching API key
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!apiKey) return null;

    // Check if revoked
    if (apiKey.revokedAt) return null;

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: apiKey.userId, apiKeyId: apiKey.id };
  }
}
