/**
 * API Key Decryptor Unit Tests
 *
 * Tests pure functions for AES-256-GCM decryption.
 */

import { createCipheriv, randomBytes } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptApiKey, getEncryptionKey } from '../../../quality/crypto/api-key-decryptor.js';

/**
 * Helper to encrypt a value for testing decryption
 */
function encryptValue(plaintext: string, key: Buffer): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted: encrypted + authTag,
    iv: iv.toString('hex'),
  };
}

describe('getEncryptionKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return key from AI_ENCRYPTION_KEY', () => {
    const testKey = 'a'.repeat(64);
    process.env.AI_ENCRYPTION_KEY = testKey;
    delete process.env.MT_ENCRYPTION_KEY;

    const key = getEncryptionKey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('should fallback to MT_ENCRYPTION_KEY', () => {
    delete process.env.AI_ENCRYPTION_KEY;
    process.env.MT_ENCRYPTION_KEY = 'b'.repeat(64);

    const key = getEncryptionKey();

    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('should throw if no encryption key set', () => {
    delete process.env.AI_ENCRYPTION_KEY;
    delete process.env.MT_ENCRYPTION_KEY;

    expect(() => getEncryptionKey()).toThrow('AI_ENCRYPTION_KEY');
  });

  it('should throw if key is wrong length (too short)', () => {
    process.env.AI_ENCRYPTION_KEY = 'short';

    expect(() => getEncryptionKey()).toThrow('64-character hex string');
  });

  it('should throw if key is wrong length (too long)', () => {
    process.env.AI_ENCRYPTION_KEY = 'a'.repeat(128);

    expect(() => getEncryptionKey()).toThrow('64-character hex string');
  });
});

describe('decryptApiKey', () => {
  const testKey = Buffer.from('a'.repeat(64), 'hex');

  it('should decrypt a valid encrypted value', () => {
    const plaintext = 'sk-test-api-key-12345';
    const { encrypted, iv } = encryptValue(plaintext, testKey);

    const result = decryptApiKey(encrypted, iv, testKey);

    expect(result).toBe(plaintext);
  });

  it('should handle unicode characters', () => {
    const plaintext = 'api-key-with-émojis-🔐';
    const { encrypted, iv } = encryptValue(plaintext, testKey);

    const result = decryptApiKey(encrypted, iv, testKey);

    expect(result).toBe(plaintext);
  });

  it('should handle empty string (valid encrypted empty)', () => {
    const plaintext = '';
    const { encrypted, iv } = encryptValue(plaintext, testKey);

    const result = decryptApiKey(encrypted, iv, testKey);

    expect(result).toBe(plaintext);
  });

  describe('IV validation', () => {
    it('should throw for empty IV', () => {
      expect(() => decryptApiKey('a'.repeat(64), '', testKey)).toThrow('Invalid IV format');
    });

    it('should throw for IV too short', () => {
      expect(() => decryptApiKey('a'.repeat(64), 'abc123', testKey)).toThrow('Invalid IV format');
    });

    it('should throw for IV too long', () => {
      expect(() => decryptApiKey('a'.repeat(64), 'a'.repeat(64), testKey)).toThrow(
        'Invalid IV format'
      );
    });

    it('should throw for non-hex IV', () => {
      expect(() =>
        decryptApiKey('a'.repeat(64), 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', testKey)
      ).toThrow('Invalid IV format');
    });

    it('should accept uppercase hex IV', () => {
      const plaintext = 'test';
      const { encrypted, iv } = encryptValue(plaintext, testKey);

      const result = decryptApiKey(encrypted, iv.toUpperCase(), testKey);

      expect(result).toBe(plaintext);
    });
  });

  describe('encrypted data validation', () => {
    it('should throw for empty encrypted data', () => {
      const validIv = 'a'.repeat(32);

      expect(() => decryptApiKey('', validIv, testKey)).toThrow('Invalid encrypted data format');
    });

    it('should throw for encrypted data too short (< 32 chars for auth tag)', () => {
      const validIv = 'a'.repeat(32);

      expect(() => decryptApiKey('abc', validIv, testKey)).toThrow('Invalid encrypted data format');
    });

    it('should throw for non-hex encrypted data', () => {
      const validIv = 'a'.repeat(32);

      expect(() => decryptApiKey('zzzz' + 'a'.repeat(32), validIv, testKey)).toThrow(
        'Invalid encrypted data format'
      );
    });
  });

  describe('auth tag verification', () => {
    it('should throw for tampered encrypted data', () => {
      const plaintext = 'secret-api-key';
      const { encrypted, iv } = encryptValue(plaintext, testKey);

      // Tamper with the encrypted portion (not auth tag)
      const tamperedEncrypted = 'ff' + encrypted.slice(2);

      expect(() => decryptApiKey(tamperedEncrypted, iv, testKey)).toThrow();
    });

    it('should throw for tampered auth tag', () => {
      const plaintext = 'secret-api-key';
      const { encrypted, iv } = encryptValue(plaintext, testKey);

      // Tamper with the auth tag (last 32 chars)
      const tamperedEncrypted = encrypted.slice(0, -32) + 'f'.repeat(32);

      expect(() => decryptApiKey(tamperedEncrypted, iv, testKey)).toThrow();
    });

    it('should throw for wrong key', () => {
      const plaintext = 'secret-api-key';
      const { encrypted, iv } = encryptValue(plaintext, testKey);
      const wrongKey = Buffer.from('b'.repeat(64), 'hex');

      expect(() => decryptApiKey(encrypted, iv, wrongKey)).toThrow();
    });

    it('should throw for wrong IV', () => {
      const plaintext = 'secret-api-key';
      const { encrypted } = encryptValue(plaintext, testKey);
      const wrongIv = 'c'.repeat(32);

      expect(() => decryptApiKey(encrypted, wrongIv, testKey)).toThrow();
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should successfully decrypt multiple different values', () => {
      const testValues = [
        'sk-ant-api03-xxxxx',
        'sk-proj-xxxxx',
        'gsk_xxxxxxxxxxxxxxxx',
        'AIzaSyxxxxxxxxxxxxxxxx',
      ];

      for (const plaintext of testValues) {
        const { encrypted, iv } = encryptValue(plaintext, testKey);
        const result = decryptApiKey(encrypted, iv, testKey);
        expect(result).toBe(plaintext);
      }
    });

    it('should work with long API keys', () => {
      const plaintext = 'x'.repeat(500);
      const { encrypted, iv } = encryptValue(plaintext, testKey);

      const result = decryptApiKey(encrypted, iv, testKey);

      expect(result).toBe(plaintext);
    });
  });
});
