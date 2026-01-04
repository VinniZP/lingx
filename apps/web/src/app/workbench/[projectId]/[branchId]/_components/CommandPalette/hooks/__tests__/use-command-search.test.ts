import type { TranslationKey } from '@/lib/api';
import type { ProjectLanguage } from '@lingx/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCommandSearch } from '../use-command-search';

// Helper to create mock TranslationKey
function createMockKey(
  id: string,
  name: string,
  translations: { language: string; value: string }[] = []
): TranslationKey {
  return {
    id,
    name,
    namespace: null,
    description: null,
    branchId: 'branch-1',
    translations: translations.map((t) => ({
      id: `trans-${id}-${t.language}`,
      language: t.language,
      value: t.value,
      status: 'DRAFT' as const,
      isOutdated: false,
      translationKeyId: id,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create mock ProjectLanguage
function createMockLanguage(code: string, name: string, isDefault = false): ProjectLanguage {
  return {
    id: `lang-${code}`,
    code,
    name,
    isDefault,
  };
}

const mockLanguages: ProjectLanguage[] = [
  createMockLanguage('en', 'English', true),
  createMockLanguage('de', 'German'),
  createMockLanguage('fr', 'French'),
];

describe('useCommandSearch', () => {
  describe('empty query handling', () => {
    it('should return empty array when query is empty', () => {
      const keys = [createMockKey('key-1', 'greeting')];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: '',
        })
      );

      expect(result.current).toEqual([]);
    });

    it('should return empty array when query is only whitespace', () => {
      const keys = [createMockKey('key-1', 'greeting')];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: '   ',
        })
      );

      expect(result.current).toEqual([]);
    });
  });

  describe('key name matching', () => {
    it('should find keys by exact name match', () => {
      const keys = [createMockKey('key-1', 'greeting'), createMockKey('key-2', 'farewell')];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'greeting',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].keyId).toBe('key-1');
      expect(result.current[0].matchType).toBe('key-name');
    });

    it('should find keys by partial name match', () => {
      const keys = [
        createMockKey('key-1', 'user.greeting.welcome'),
        createMockKey('key-2', 'user.farewell.goodbye'),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'greet',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].keyId).toBe('key-1');
    });

    it('should be case-insensitive for key name matching', () => {
      const keys = [createMockKey('key-1', 'UserGreeting')];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'usergreeting',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].keyId).toBe('key-1');
    });
  });

  describe('translation content matching', () => {
    it('should find keys by translation content', () => {
      const keys = [
        createMockKey('key-1', 'greeting', [{ language: 'en', value: 'Hello World' }]),
        createMockKey('key-2', 'farewell', [{ language: 'en', value: 'Goodbye' }]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'world',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].keyId).toBe('key-1');
      expect(result.current[0].matchType).toBe('translation-content');
      expect(result.current[0].matchedLanguage).toBe('English');
    });

    it('should search across all languages', () => {
      const keys = [
        createMockKey('key-1', 'greeting', [
          { language: 'en', value: 'Hello' },
          { language: 'de', value: 'Guten Tag' },
        ]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'guten',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].matchedLanguage).toBe('German');
    });

    it('should include matched content snippet', () => {
      const keys = [
        createMockKey('key-1', 'message', [
          {
            language: 'en',
            value:
              'This is a very long message that contains the search term somewhere in the middle of it',
          },
        ]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'search',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].matchedContent).toContain('search');
      expect(result.current[0].matchedContent).toContain('...');
    });
  });

  describe('relevance scoring and ordering', () => {
    it('should prioritize key name matches over translation content matches with equal position relevance', () => {
      // Both keys contain 'cancel' in a substring position, so the key-name bonus (+30) determines order
      const keys = [
        createMockKey('key-1', 'button.submit', [{ language: 'en', value: 'Please cancel this' }]),
        createMockKey('key-2', 'action.cancel', [{ language: 'en', value: 'Submit form' }]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'cancel',
        })
      );

      expect(result.current).toHaveLength(2);
      // Key name match should come first due to +30 bonus
      expect(result.current[0].keyId).toBe('key-2');
      expect(result.current[0].matchType).toBe('key-name');
      // Translation content match should come second
      expect(result.current[1].keyId).toBe('key-1');
      expect(result.current[1].matchType).toBe('translation-content');
    });

    it('should prioritize exact matches over partial matches', () => {
      const keys = [
        createMockKey('key-1', 'user.button'),
        createMockKey('key-2', 'button'),
        createMockKey('key-3', 'submit.button.text'),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'button',
        })
      );

      expect(result.current).toHaveLength(3);
      // Exact match should come first
      expect(result.current[0].keyId).toBe('key-2');
    });

    it('should prioritize prefix matches over substring matches', () => {
      const keys = [
        createMockKey('key-1', 'my.button.click'),
        createMockKey('key-2', 'button.submit'),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'button',
        })
      );

      expect(result.current).toHaveLength(2);
      // Prefix match should come first
      expect(result.current[0].keyId).toBe('key-2');
    });
  });

  describe('maxResults limit', () => {
    it('should respect default maxResults limit of 10', () => {
      const keys = Array.from({ length: 15 }, (_, i) => createMockKey(`key-${i}`, `test.key.${i}`));

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'test',
        })
      );

      expect(result.current).toHaveLength(10);
    });

    it('should respect custom maxResults limit', () => {
      const keys = Array.from({ length: 15 }, (_, i) => createMockKey(`key-${i}`, `test.key.${i}`));

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'test',
          maxResults: 5,
        })
      );

      expect(result.current).toHaveLength(5);
    });
  });

  describe('deduplication', () => {
    it('should not include duplicate keys when matched by both name and content', () => {
      const keys = [
        createMockKey('key-1', 'hello.greeting', [{ language: 'en', value: 'Hello there' }]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'hello',
        })
      );

      // Should only appear once (key name match takes precedence)
      expect(result.current).toHaveLength(1);
      expect(result.current[0].matchType).toBe('key-name');
    });

    it('should only include one match per key for translation content', () => {
      const keys = [
        createMockKey('key-1', 'message', [
          { language: 'en', value: 'Hello world' },
          { language: 'de', value: 'Hello Welt' },
        ]),
      ];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'hello',
        })
      );

      // Should only appear once even though "hello" is in both translations
      expect(result.current).toHaveLength(1);
    });
  });

  describe('namespace handling', () => {
    it('should include namespace in search results', () => {
      const key = createMockKey('key-1', 'greeting');
      key.namespace = 'common';

      const { result } = renderHook(() =>
        useCommandSearch({
          keys: [key],
          languages: mockLanguages,
          query: 'greeting',
        })
      );

      expect(result.current[0].namespace).toBe('common');
    });
  });

  describe('edge cases', () => {
    it('should handle empty keys array', () => {
      const { result } = renderHook(() =>
        useCommandSearch({
          keys: [],
          languages: mockLanguages,
          query: 'test',
        })
      );

      expect(result.current).toEqual([]);
    });

    it('should handle keys with no translations', () => {
      const keys = [createMockKey('key-1', 'empty.key', [])];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'empty',
        })
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].matchType).toBe('key-name');
    });

    it('should handle special regex characters in query', () => {
      const keys = [createMockKey('key-1', 'button.click')];

      const { result } = renderHook(() =>
        useCommandSearch({
          keys,
          languages: mockLanguages,
          query: 'button.',
        })
      );

      expect(result.current).toHaveLength(1);
    });
  });
});
