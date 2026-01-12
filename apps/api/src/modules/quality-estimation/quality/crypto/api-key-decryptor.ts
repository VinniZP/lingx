/**
 * API Key Decryption
 *
 * AES-256-GCM decryption for API keys stored in database.
 * Extracted as pure functions for testability.
 */

import { createDecipheriv } from 'crypto';

/**
 * Get encryption key from environment
 *
 * Looks for AI_ENCRYPTION_KEY or MT_ENCRYPTION_KEY (legacy).
 * Must be 64-character hex string (32 bytes for AES-256).
 */
export function getEncryptionKey(): Buffer {
  const keyHex = process.env.AI_ENCRYPTION_KEY || process.env.MT_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'AI_ENCRYPTION_KEY (or MT_ENCRYPTION_KEY) must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Decrypt API key stored in database
 *
 * @param encrypted - The encrypted API key as hex string (includes auth tag as last 32 chars)
 * @param ivHex - The initialization vector as 32-character hex string (16 bytes)
 * @param key - Encryption key buffer (32 bytes for AES-256)
 * @returns The decrypted API key
 * @throws Error if validation fails or decryption fails
 */
export function decryptApiKey(encrypted: string, ivHex: string, key: Buffer): string {
  // Validate IV format (32 hex chars = 16 bytes for GCM)
  if (!ivHex || !/^[0-9a-f]{32}$/i.test(ivHex)) {
    throw new Error('Invalid IV format: must be 32 hex characters');
  }
  const iv = Buffer.from(ivHex, 'hex');

  // Validate encrypted data format (must be hex, minimum 32 chars for auth tag)
  if (!encrypted || encrypted.length < 32 || !/^[0-9a-f]+$/i.test(encrypted)) {
    throw new Error('Invalid encrypted data format');
  }

  // Split encrypted data and auth tag (last 32 hex chars = 16 bytes)
  const authTag = Buffer.from(encrypted.slice(-32), 'hex');
  const encryptedData = encrypted.slice(0, -32);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Note: GCM's auth tag already validates integrity - if key/IV is wrong
  // or data is tampered, decipher.final() throws. No additional validation needed.

  return decrypted;
}
