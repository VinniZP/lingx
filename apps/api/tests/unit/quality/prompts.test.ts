/**
 * Prompts Unit Tests
 *
 * Tests XML escaping, prompt building, and prompt constants.
 */

import { describe, it, expect } from 'vitest';
import {
  MQM_SYSTEM_PROMPT,
  MQM_MULTI_LANGUAGE_SYSTEM_PROMPT,
  escapeXml,
  buildMQMUserPrompt,
  buildMultiLanguagePrompt,
} from '../../../src/services/quality/ai/prompts.js';

// ============================================
// System Prompt Constants
// ============================================

describe('MQM_SYSTEM_PROMPT', () => {
  it('should contain accuracy scoring criteria', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('ACCURACY');
    expect(MQM_SYSTEM_PROMPT).toContain('0-100');
  });

  it('should contain fluency scoring criteria', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('FLUENCY');
  });

  it('should contain terminology scoring criteria', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('TERMINOLOGY');
  });

  it('should specify JSON output format', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('JSON');
    expect(MQM_SYSTEM_PROMPT).toContain('accuracy');
    expect(MQM_SYSTEM_PROMPT).toContain('fluency');
    expect(MQM_SYSTEM_PROMPT).toContain('terminology');
    expect(MQM_SYSTEM_PROMPT).toContain('issues');
  });

  it('should mention AI hallucination detection', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('AI response');
    expect(MQM_SYSTEM_PROMPT).toContain('ACCURACY as 0');
  });

  it('should specify issue format', () => {
    expect(MQM_SYSTEM_PROMPT).toContain('critical');
    expect(MQM_SYSTEM_PROMPT).toContain('major');
    expect(MQM_SYSTEM_PROMPT).toContain('minor');
  });
});

describe('MQM_MULTI_LANGUAGE_SYSTEM_PROMPT', () => {
  it('should emphasize consistent cross-language scoring', () => {
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('CONSISTENT');
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('Same issues MUST have the same severity');
  });

  it('should contain all three scoring dimensions', () => {
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('ACCURACY');
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('FLUENCY');
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('TERMINOLOGY');
  });

  it('should specify multi-language JSON format', () => {
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('evaluations');
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('LANG_CODE');
  });

  it('should specify exact issue format requirements', () => {
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('ISSUE OBJECT FORMAT');
    expect(MQM_MULTI_LANGUAGE_SYSTEM_PROMPT).toContain('lowercase');
  });
});

// ============================================
// XML Escaping
// ============================================

describe('escapeXml', () => {
  describe('standard XML entities', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('Hello & World')).toBe('Hello &amp; World');
    });

    it('should escape less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b');
    });

    it('should escape double quote', () => {
      expect(escapeXml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should escape single quote', () => {
      expect(escapeXml("it's fine")).toBe('it&apos;s fine');
    });

    it('should escape multiple entities', () => {
      expect(escapeXml('<a & b>')).toBe('&lt;a &amp; b&gt;');
    });

    it('should handle HTML-like content', () => {
      expect(escapeXml('<div class="test">content</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;content&lt;/div&gt;'
      );
    });
  });

  describe('control characters', () => {
    it('should preserve tab character', () => {
      expect(escapeXml('hello\tworld')).toBe('hello\tworld');
    });

    it('should preserve newline', () => {
      expect(escapeXml('hello\nworld')).toBe('hello\nworld');
    });

    it('should preserve carriage return', () => {
      expect(escapeXml('hello\rworld')).toBe('hello\rworld');
    });

    it('should remove null character', () => {
      expect(escapeXml('hello\x00world')).toBe('helloworld');
    });

    it('should remove bell character', () => {
      expect(escapeXml('hello\x07world')).toBe('helloworld');
    });

    it('should remove backspace', () => {
      expect(escapeXml('hello\x08world')).toBe('helloworld');
    });

    it('should remove form feed', () => {
      expect(escapeXml('hello\x0Cworld')).toBe('helloworld');
    });

    it('should remove multiple invalid control chars', () => {
      expect(escapeXml('a\x00b\x01c\x02d')).toBe('abcd');
    });
  });

  describe('CDATA end sequence', () => {
    it('should escape CDATA end sequence', () => {
      expect(escapeXml('content]]>more')).toBe('content]]&gt;more');
    });

    it('should handle multiple CDATA sequences', () => {
      expect(escapeXml(']]>test]]>')).toBe(']]&gt;test]]&gt;');
    });
  });

  describe('Unicode handling', () => {
    it('should preserve valid Unicode', () => {
      expect(escapeXml('Hello 世界')).toBe('Hello 世界');
    });

    it('should preserve emoji', () => {
      expect(escapeXml('Hello 👋')).toBe('Hello 👋');
    });

    it('should preserve Cyrillic', () => {
      expect(escapeXml('Привет')).toBe('Привет');
    });

    it('should preserve Arabic', () => {
      expect(escapeXml('مرحبا')).toBe('مرحبا');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle string with no special chars', () => {
      expect(escapeXml('Hello World')).toBe('Hello World');
    });

    it('should handle very long string', () => {
      const longString = '<'.repeat(1000);
      const expected = '&lt;'.repeat(1000);
      expect(escapeXml(longString)).toBe(expected);
    });
  });
});

// ============================================
// Single-Language User Prompt
// ============================================

describe('buildMQMUserPrompt', () => {
  it('should include key name', () => {
    const prompt = buildMQMUserPrompt('greeting.hello', 'Hello', 'Hallo', 'en', 'de');
    expect(prompt).toContain('greeting.hello');
  });

  it('should include source text with locale', () => {
    const prompt = buildMQMUserPrompt('key', 'Hello World', 'Hallo Welt', 'en', 'de');
    expect(prompt).toContain('Source (en)');
    expect(prompt).toContain('"Hello World"');
  });

  it('should include target text with locale', () => {
    const prompt = buildMQMUserPrompt('key', 'Hello', 'Hallo', 'en', 'de');
    expect(prompt).toContain('Target (de)');
    expect(prompt).toContain('"Hallo"');
  });

  it('should format without related keys', () => {
    const prompt = buildMQMUserPrompt('key', 'Hello', 'Bonjour', 'en', 'fr');
    expect(prompt).not.toContain('Nearby translations');
  });

  it('should include related keys when provided', () => {
    const relatedKeys = [
      { key: 'other.key', source: 'Goodbye', target: 'Au revoir' },
      { key: 'another.key', source: 'Thanks', target: 'Merci' },
    ];
    const prompt = buildMQMUserPrompt('key', 'Hello', 'Bonjour', 'en', 'fr', relatedKeys);

    expect(prompt).toContain('Nearby translations for context');
    expect(prompt).toContain('other.key');
    expect(prompt).toContain('"Goodbye" → "Au revoir"');
    expect(prompt).toContain('another.key');
    expect(prompt).toContain('"Thanks" → "Merci"');
  });

  it('should handle empty related keys array', () => {
    const prompt = buildMQMUserPrompt('key', 'Hello', 'Hallo', 'en', 'de', []);
    expect(prompt).not.toContain('Nearby translations');
  });

  it('should handle special characters in text', () => {
    const prompt = buildMQMUserPrompt('key', 'Hello & World', 'Hallo & Welt', 'en', 'de');
    expect(prompt).toContain('Hello & World');
    expect(prompt).toContain('Hallo & Welt');
  });

  it('should handle multi-line text', () => {
    const prompt = buildMQMUserPrompt('key', 'Line 1\nLine 2', 'Zeile 1\nZeile 2', 'en', 'de');
    expect(prompt).toContain('Line 1\nLine 2');
  });
});

// ============================================
// Multi-Language XML Prompt
// ============================================

describe('buildMultiLanguagePrompt', () => {
  it('should create valid XML structure', () => {
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', [{ language: 'de', value: 'Hallo' }], []);

    expect(prompt).toContain('<evaluation_request>');
    expect(prompt).toContain('</evaluation_request>');
    expect(prompt).toContain('<key>greeting</key>');
  });

  it('should include source with locale attribute', () => {
    const prompt = buildMultiLanguagePrompt('key', 'Hello World', 'en', [{ language: 'de', value: 'Hallo Welt' }], []);

    expect(prompt).toContain('<source lang="en">Hello World</source>');
  });

  it('should include all translations', () => {
    const translations = [
      { language: 'de', value: 'Hallo' },
      { language: 'fr', value: 'Bonjour' },
      { language: 'es', value: 'Hola' },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, []);

    expect(prompt).toContain('<translation lang="de">Hallo</translation>');
    expect(prompt).toContain('<translation lang="fr">Bonjour</translation>');
    expect(prompt).toContain('<translation lang="es">Hola</translation>');
  });

  it('should include related keys when provided', () => {
    const translations = [{ language: 'de', value: 'Hallo' }];
    const relatedKeys = [
      {
        keyName: 'farewell',
        source: 'Goodbye',
        translations: { de: 'Auf Wiedersehen' },
      },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, relatedKeys);

    expect(prompt).toContain('<related_keys>');
    expect(prompt).toContain('<key name="farewell">');
    expect(prompt).toContain('<source lang="en">Goodbye</source>');
    expect(prompt).toContain('<translation lang="de">Auf Wiedersehen</translation>');
  });

  it('should escape XML special characters in key name', () => {
    const prompt = buildMultiLanguagePrompt('key<with>&chars', 'Hello', 'en', [{ language: 'de', value: 'Hallo' }], []);

    expect(prompt).toContain('&lt;');
    expect(prompt).toContain('&amp;');
    expect(prompt).not.toContain('<key>key<with>');
  });

  it('should escape XML special characters in source text', () => {
    const prompt = buildMultiLanguagePrompt('key', 'Hello <World> & Universe', 'en', [
      { language: 'de', value: 'Hallo' },
    ], []);

    expect(prompt).toContain('Hello &lt;World&gt; &amp; Universe');
  });

  it('should escape XML special characters in translations', () => {
    const prompt = buildMultiLanguagePrompt('key', 'Hello', 'en', [{ language: 'de', value: '<Hallo & Welt>' }], []);

    expect(prompt).toContain('&lt;Hallo &amp; Welt&gt;');
  });

  it('should escape XML special characters in related keys', () => {
    const translations = [{ language: 'de', value: 'Hallo' }];
    const relatedKeys = [
      {
        keyName: 'key&name',
        source: '<source>',
        translations: { de: '<target>' },
      },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, relatedKeys);

    expect(prompt).toContain('key&amp;name');
    expect(prompt).toContain('&lt;source&gt;');
    expect(prompt).toContain('&lt;target&gt;');
  });

  it('should handle empty related keys array', () => {
    const prompt = buildMultiLanguagePrompt('key', 'Hello', 'en', [{ language: 'de', value: 'Hallo' }], []);

    expect(prompt).not.toContain('<related_keys>');
    expect(prompt).not.toContain('</related_keys>');
  });

  it('should only include translations for requested languages in related keys', () => {
    const translations = [{ language: 'de', value: 'Hallo' }];
    const relatedKeys = [
      {
        keyName: 'farewell',
        source: 'Goodbye',
        translations: { de: 'Auf Wiedersehen', fr: 'Au revoir', es: 'Adiós' },
      },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, relatedKeys);

    // Should include German (requested language)
    expect(prompt).toContain('<translation lang="de">Auf Wiedersehen</translation>');
    // Should NOT include French or Spanish (not in translations list)
    expect(prompt).not.toContain('Au revoir');
    expect(prompt).not.toContain('Adiós');
  });

  it('should handle multiple related keys', () => {
    const translations = [{ language: 'de', value: 'Hallo' }];
    const relatedKeys = [
      { keyName: 'key1', source: 'One', translations: { de: 'Eins' } },
      { keyName: 'key2', source: 'Two', translations: { de: 'Zwei' } },
      { keyName: 'key3', source: 'Three', translations: { de: 'Drei' } },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, relatedKeys);

    expect(prompt).toContain('key1');
    expect(prompt).toContain('key2');
    expect(prompt).toContain('key3');
    expect(prompt).toContain('Eins');
    expect(prompt).toContain('Zwei');
    expect(prompt).toContain('Drei');
  });

  it('should handle related keys with missing translations', () => {
    const translations = [
      { language: 'de', value: 'Hallo' },
      { language: 'fr', value: 'Bonjour' },
    ];
    const relatedKeys = [
      {
        keyName: 'farewell',
        source: 'Goodbye',
        translations: { de: 'Auf Wiedersehen' }, // Missing French
      },
    ];
    const prompt = buildMultiLanguagePrompt('greeting', 'Hello', 'en', translations, relatedKeys);

    expect(prompt).toContain('<translation lang="de">Auf Wiedersehen</translation>');
    // French translation in main section should be present
    expect(prompt).toContain('<translation lang="fr">Bonjour</translation>');
    // But French translation should NOT be in related_keys section (missing from related key)
    // Extract related_keys section and check
    const relatedKeysSection = prompt.match(/<related_keys>[\s\S]*<\/related_keys>/)?.[0] || '';
    expect(relatedKeysSection).not.toContain('lang="fr"');
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration: prompt building', () => {
  it('should create complete single-language evaluation prompt', () => {
    const relatedKeys = [
      { key: 'nav.home', source: 'Home', target: 'Startseite' },
      { key: 'nav.settings', source: 'Settings', target: 'Einstellungen' },
    ];
    const prompt = buildMQMUserPrompt('nav.about', 'About Us', 'Über uns', 'en', 'de', relatedKeys);

    // Check structure
    expect(prompt).toContain('Key: nav.about');
    expect(prompt).toContain('Source (en): "About Us"');
    expect(prompt).toContain('Target (de): "Über uns"');
    expect(prompt).toContain('Nearby translations for context:');
    expect(prompt).toContain('nav.home');
    expect(prompt).toContain('nav.settings');
  });

  it('should create complete multi-language evaluation XML', () => {
    const translations = [
      { language: 'de', value: 'Einstellungen' },
      { language: 'fr', value: 'Paramètres' },
      { language: 'es', value: 'Configuración' },
    ];
    const relatedKeys = [
      {
        keyName: 'menu.home',
        source: 'Home',
        translations: { de: 'Startseite', fr: 'Accueil', es: 'Inicio' },
      },
    ];
    const prompt = buildMultiLanguagePrompt('menu.settings', 'Settings', 'en', translations, relatedKeys);

    // Verify XML structure
    expect(prompt).toMatch(/<evaluation_request>[\s\S]*<\/evaluation_request>/);
    expect(prompt).toContain('<key>menu.settings</key>');
    expect(prompt).toContain('<source lang="en">Settings</source>');

    // Verify all translations included
    expect(prompt).toContain('<translation lang="de">Einstellungen</translation>');
    expect(prompt).toContain('<translation lang="fr">Paramètres</translation>');
    expect(prompt).toContain('<translation lang="es">Configuración</translation>');

    // Verify related keys
    expect(prompt).toContain('<related_keys>');
    expect(prompt).toContain('<key name="menu.home">');
    expect(prompt).toContain('<translation lang="de">Startseite</translation>');
    expect(prompt).toContain('<translation lang="fr">Accueil</translation>');
    expect(prompt).toContain('<translation lang="es">Inicio</translation>');
  });
});
