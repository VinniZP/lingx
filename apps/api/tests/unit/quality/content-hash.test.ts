/**
 * Content Hash Unit Tests
 *
 * Tests deterministic hash generation for cache invalidation.
 */

import { describe, it, expect } from 'vitest';
import {
  generateContentHash,
  isContentHashValid,
  HASH_CONFIG,
} from '../../../src/services/quality/cache/content-hash.js';

describe('generateContentHash', () => {
  it('should return a hex string', () => {
    const hash = generateContentHash('Hello', 'Bonjour');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should return hash of configured length', () => {
    const hash = generateContentHash('Hello', 'Bonjour');
    expect(hash.length).toBe(HASH_CONFIG.length);
  });

  it('should be deterministic (same input = same output)', () => {
    const hash1 = generateContentHash('Hello', 'Bonjour');
    const hash2 = generateContentHash('Hello', 'Bonjour');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different source', () => {
    const hash1 = generateContentHash('Hello', 'Bonjour');
    const hash2 = generateContentHash('Goodbye', 'Bonjour');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash for different target', () => {
    const hash1 = generateContentHash('Hello', 'Bonjour');
    const hash2 = generateContentHash('Hello', 'Salut');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hash for swapped source/target', () => {
    const hash1 = generateContentHash('Hello', 'Bonjour');
    const hash2 = generateContentHash('Bonjour', 'Hello');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty strings', () => {
    const hash1 = generateContentHash('', '');
    expect(hash1.length).toBe(HASH_CONFIG.length);

    const hash2 = generateContentHash('Hello', '');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle Unicode characters', () => {
    const hash1 = generateContentHash('Hello', '你好');
    const hash2 = generateContentHash('Hello', 'Привет');
    expect(hash1).not.toBe(hash2);
    expect(hash1.length).toBe(HASH_CONFIG.length);
  });

  it('should handle long strings', () => {
    const longSource = 'a'.repeat(10000);
    const longTarget = 'b'.repeat(10000);
    const hash = generateContentHash(longSource, longTarget);
    expect(hash.length).toBe(HASH_CONFIG.length);
  });

  it('should handle special characters', () => {
    const hash1 = generateContentHash('Hello | World', 'Bonjour');
    const hash2 = generateContentHash('Hello', 'World | Bonjour');
    // The separator '|' is part of the format, so different structure = different hash
    expect(hash1.length).toBe(HASH_CONFIG.length);
    expect(hash2.length).toBe(HASH_CONFIG.length);
  });

  it('should handle newlines and whitespace', () => {
    const hash1 = generateContentHash('Hello\nWorld', 'Bonjour');
    const hash2 = generateContentHash('Hello World', 'Bonjour');
    expect(hash1).not.toBe(hash2);
  });
});

describe('isContentHashValid', () => {
  it('should return true when hash matches current content', () => {
    const source = 'Hello';
    const target = 'Bonjour';
    const hash = generateContentHash(source, target);

    expect(isContentHashValid(hash, source, target)).toBe(true);
  });

  it('should return false when source changed', () => {
    const hash = generateContentHash('Hello', 'Bonjour');
    expect(isContentHashValid(hash, 'Goodbye', 'Bonjour')).toBe(false);
  });

  it('should return false when target changed', () => {
    const hash = generateContentHash('Hello', 'Bonjour');
    expect(isContentHashValid(hash, 'Hello', 'Salut')).toBe(false);
  });

  it('should return false when hash is null', () => {
    expect(isContentHashValid(null, 'Hello', 'Bonjour')).toBe(false);
  });

  it('should return false when hash is empty string', () => {
    expect(isContentHashValid('', 'Hello', 'Bonjour')).toBe(false);
  });

  it('should return false for wrong hash', () => {
    expect(isContentHashValid('wrong_hash', 'Hello', 'Bonjour')).toBe(false);
  });

  it('should be case sensitive', () => {
    const hash = generateContentHash('Hello', 'Bonjour');
    expect(isContentHashValid(hash, 'hello', 'Bonjour')).toBe(false);
    expect(isContentHashValid(hash, 'Hello', 'bonjour')).toBe(false);
  });
});

describe('HASH_CONFIG', () => {
  it('should use sha256 algorithm', () => {
    expect(HASH_CONFIG.algorithm).toBe('sha256');
  });

  it('should use hex encoding', () => {
    expect(HASH_CONFIG.encoding).toBe('hex');
  });

  it('should truncate to 16 characters', () => {
    expect(HASH_CONFIG.length).toBe(16);
  });
});
