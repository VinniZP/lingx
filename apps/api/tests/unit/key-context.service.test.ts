/**
 * Key Context Service Tests
 *
 * Tests for confidence formulas, key pattern detection, and XML context generation.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  computeKeyPatternConfidence,
  computeNearbyConfidence,
  computeSameComponentConfidence,
  computeSameFileConfidence,
  KeyContextService,
  type AIContextTranslation,
} from '../../src/modules/key-context/key-context.service';

describe('KeyContextService', () => {
  describe('computeNearbyConfidence', () => {
    it('returns 1.0 for distance 0 (same line)', () => {
      expect(computeNearbyConfidence(0)).toBeCloseTo(1.0, 4);
    });

    it('returns ~0.87 for distance 2 (adjacent lines)', () => {
      // e^(-2/15) ≈ 0.875
      expect(computeNearbyConfidence(2)).toBeCloseTo(0.875, 2);
    });

    it('returns ~0.51 for distance 10', () => {
      // e^(-10/15) ≈ 0.513
      expect(computeNearbyConfidence(10)).toBeCloseTo(0.513, 2);
    });

    it('returns ~0.135 for distance 30 (at threshold)', () => {
      // e^(-30/15) = e^(-2) ≈ 0.135
      expect(computeNearbyConfidence(30)).toBeCloseTo(0.135, 2);
    });

    it('returns 0 for distance > 30 (beyond threshold)', () => {
      expect(computeNearbyConfidence(31)).toBe(0);
      expect(computeNearbyConfidence(100)).toBe(0);
    });

    it('returns 0 for negative distance', () => {
      expect(computeNearbyConfidence(-1)).toBe(0);
      expect(computeNearbyConfidence(-100)).toBe(0);
    });
  });

  describe('computeSameFileConfidence', () => {
    it('returns 1.0 for negative distance (no line info)', () => {
      expect(computeSameFileConfidence(-1)).toBe(1.0);
    });

    it('returns 1.0 for distance 0', () => {
      expect(computeSameFileConfidence(0)).toBeCloseTo(1.0, 4);
    });

    it('returns ~0.93 for distance 10', () => {
      // 0.6 + 0.4 * e^(-10/50) = 0.6 + 0.4 * e^(-0.2) ≈ 0.6 + 0.4 * 0.819 ≈ 0.928
      expect(computeSameFileConfidence(10)).toBeCloseTo(0.928, 2);
    });

    it('returns ~0.75 for distance 50', () => {
      // 0.6 + 0.4 * e^(-50/50) = 0.6 + 0.4 * e^(-1) ≈ 0.6 + 0.4 * 0.368 ≈ 0.747
      expect(computeSameFileConfidence(50)).toBeCloseTo(0.747, 2);
    });

    it('returns ~0.65 for distance 100', () => {
      // 0.6 + 0.4 * e^(-100/50) = 0.6 + 0.4 * e^(-2) ≈ 0.6 + 0.4 * 0.135 ≈ 0.654
      expect(computeSameFileConfidence(100)).toBeCloseTo(0.654, 2);
    });

    it('approaches 0.6 for very large distance', () => {
      // 0.6 + 0.4 * e^(-500/50) ≈ 0.6 + 0 ≈ 0.6
      expect(computeSameFileConfidence(500)).toBeCloseTo(0.6, 1);
    });
  });

  describe('computeSameComponentConfidence', () => {
    it('returns 1.0 for negative distance (no line info)', () => {
      expect(computeSameComponentConfidence(-1)).toBe(1.0);
    });

    it('returns 1.0 for distance 0', () => {
      expect(computeSameComponentConfidence(0)).toBeCloseTo(1.0, 4);
    });

    it('returns ~0.92 for distance 10', () => {
      // 0.8 + 0.2 * e^(-10/20) = 0.8 + 0.2 * e^(-0.5) ≈ 0.8 + 0.2 * 0.607 ≈ 0.921
      expect(computeSameComponentConfidence(10)).toBeCloseTo(0.921, 2);
    });

    it('returns ~0.87 for distance 20', () => {
      // 0.8 + 0.2 * e^(-20/20) = 0.8 + 0.2 * e^(-1) ≈ 0.8 + 0.2 * 0.368 ≈ 0.874
      expect(computeSameComponentConfidence(20)).toBeCloseTo(0.874, 2);
    });

    it('approaches 0.8 for very large distance', () => {
      // 0.8 + 0.2 * e^(-200/20) ≈ 0.8 + 0 ≈ 0.8
      expect(computeSameComponentConfidence(200)).toBeCloseTo(0.8, 1);
    });
  });

  describe('computeKeyPatternConfidence', () => {
    describe('LCP ratio tests', () => {
      it('returns 1.0 for identical keys', () => {
        expect(computeKeyPatternConfidence('form.email.label', 'form.email.label')).toBeCloseTo(
          1.0,
          4
        );
      });

      it('returns high confidence for keys with same prefix', () => {
        // form.email.label vs form.email.placeholder
        // LCP: 2 segments (form, email), total: 3 segments
        // lcpRatio = 2/3 = 0.667
        // jaccard: {form, email, label} vs {form, email, placeholder}
        // intersection: {form, email} = 2
        // union: {form, email, label, placeholder} = 4
        // jaccard = 2/4 = 0.5
        // combined = 0.6 * 0.667 + 0.4 * 0.5 = 0.4 + 0.2 = 0.6
        const confidence = computeKeyPatternConfidence(
          'form.email.label',
          'form.email.placeholder'
        );
        expect(confidence).toBeCloseTo(0.6, 2);
      });

      it('returns medium confidence for keys with partial prefix', () => {
        // form.email.label vs form.password.label
        // LCP: 1 segment (form), total: 3 segments
        // lcpRatio = 1/3 = 0.333
        // jaccard: {form, email, label} vs {form, password, label}
        // intersection: {form, label} = 2
        // union: {form, email, label, password} = 4
        // jaccard = 2/4 = 0.5
        // combined = 0.6 * 0.333 + 0.4 * 0.5 = 0.2 + 0.2 = 0.4
        const confidence = computeKeyPatternConfidence('form.email.label', 'form.password.label');
        expect(confidence).toBeCloseTo(0.4, 2);
      });

      it('returns low confidence for unrelated keys', () => {
        // button.save vs error.network.timeout
        // LCP: 0 segments
        // lcpRatio = 0/3 = 0
        // jaccard: {button, save} vs {error, network, timeout}
        // intersection: {} = 0
        // union: {button, save, error, network, timeout} = 5
        // jaccard = 0/5 = 0
        // combined = 0.6 * 0 + 0.4 * 0 = 0
        const confidence = computeKeyPatternConfidence('button.save', 'error.network.timeout');
        expect(confidence).toBe(0);
      });
    });

    describe('Jaccard similarity tests', () => {
      it('returns high confidence for keys with same segments in different order', () => {
        // form.email.label vs email.form.label
        // LCP: 0 segments (form !== email)
        // lcpRatio = 0/3 = 0
        // jaccard: {form, email, label} vs {email, form, label}
        // intersection: {form, email, label} = 3
        // union: {form, email, label} = 3
        // jaccard = 3/3 = 1.0
        // combined = 0.6 * 0 + 0.4 * 1.0 = 0.4
        const confidence = computeKeyPatternConfidence('form.email.label', 'email.form.label');
        expect(confidence).toBeCloseTo(0.4, 2);
      });
    });

    describe('Edge cases', () => {
      it('handles single-segment keys', () => {
        // button vs button
        expect(computeKeyPatternConfidence('button', 'button')).toBeCloseTo(1.0, 4);

        // button vs cancel
        // LCP: 0, jaccard: 0
        expect(computeKeyPatternConfidence('button', 'cancel')).toBe(0);
      });

      it('handles keys with different segment counts', () => {
        // form.email vs form.email.label.hint
        // LCP: 2 segments (form, email), total: max(2, 4) = 4
        // lcpRatio = 2/4 = 0.5
        // jaccard: {form, email} vs {form, email, label, hint}
        // intersection: {form, email} = 2
        // union: {form, email, label, hint} = 4
        // jaccard = 2/4 = 0.5
        // combined = 0.6 * 0.5 + 0.4 * 0.5 = 0.3 + 0.2 = 0.5
        const confidence = computeKeyPatternConfidence('form.email', 'form.email.label.hint');
        expect(confidence).toBeCloseTo(0.5, 2);
      });

      it('handles empty segments', () => {
        // This shouldn't happen in practice, but test edge case
        expect(computeKeyPatternConfidence('', '')).toBe(0);
      });
    });

    describe('Real-world patterns', () => {
      it('detects related button keys', () => {
        const buttonSave = 'button.save';
        const buttonCancel = 'button.cancel';
        const buttonSubmit = 'button.submit';

        // button.save vs button.cancel
        // LCP: 1/2 = 0.5
        // jaccard: {button, save} vs {button, cancel} = 1/3 ≈ 0.333
        // combined = 0.6 * 0.5 + 0.4 * 0.333 = 0.3 + 0.133 ≈ 0.433
        expect(computeKeyPatternConfidence(buttonSave, buttonCancel)).toBeCloseTo(0.433, 2);
        expect(computeKeyPatternConfidence(buttonSave, buttonSubmit)).toBeCloseTo(0.433, 2);
      });

      it('detects related form field keys', () => {
        const emailLabel = 'form.email.label';
        const emailPlaceholder = 'form.email.placeholder';
        const emailError = 'form.email.error';

        // All should have >=0.5 confidence with each other
        expect(computeKeyPatternConfidence(emailLabel, emailPlaceholder)).toBeGreaterThan(0.5);
        expect(computeKeyPatternConfidence(emailLabel, emailError)).toBeGreaterThan(0.5);
        expect(computeKeyPatternConfidence(emailPlaceholder, emailError)).toBeGreaterThan(0.5);
      });
    });
  });

  describe('KeyContextService class methods', () => {
    let service: KeyContextService;

    beforeEach(() => {
      // Create service with null prisma - we're only testing non-DB methods
      service = new KeyContextService(null as never);
    });

    describe('buildStructuredContext', () => {
      it('returns empty string for empty array', () => {
        const result = service.buildStructuredContext([], 'es', 'en');
        expect(result).toBe('');
      });

      it('returns empty string when no entries have both source and target', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'test.key',
            relationshipType: 'NEARBY',
            confidence: 0.9,
            isApproved: false,
            translations: { en: 'Hello' }, // Missing 'es'
          },
        ];
        const result = service.buildStructuredContext(related, 'es', 'en');
        expect(result).toBe('');
      });

      it('generates valid XML with single related key', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'greeting',
            relationshipType: 'NEARBY',
            confidence: 0.94,
            isApproved: true,
            translations: { en: 'Hello', es: 'Hola' },
          },
        ];
        const result = service.buildStructuredContext(related, 'es', 'en');

        expect(result).toContain('<related_keys>');
        expect(result).toContain('</related_keys>');
        expect(result).toContain(
          '<related_key name="greeting" type="NEARBY" confidence="0.94" approved="true">'
        );
        expect(result).toContain('<source lang="en">Hello</source>');
        expect(result).toContain('<target lang="es">Hola</target>');
      });

      it('generates XML with multiple related keys', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'button.save',
            relationshipType: 'KEY_PATTERN',
            confidence: 0.85,
            isApproved: false,
            translations: { en: 'Save', de: 'Speichern' },
          },
          {
            keyName: 'button.cancel',
            relationshipType: 'KEY_PATTERN',
            confidence: 0.85,
            isApproved: true,
            translations: { en: 'Cancel', de: 'Abbrechen' },
          },
        ];
        const result = service.buildStructuredContext(related, 'de', 'en');

        expect(result).toContain(
          '<related_key name="button.save" type="KEY_PATTERN" confidence="0.85">'
        );
        expect(result).toContain(
          '<related_key name="button.cancel" type="KEY_PATTERN" confidence="0.85" approved="true">'
        );
        expect(result).toContain('<source lang="en">Save</source>');
        expect(result).toContain('<target lang="de">Speichern</target>');
        expect(result).toContain('<source lang="en">Cancel</source>');
        expect(result).toContain('<target lang="de">Abbrechen</target>');
      });

      it('escapes XML special characters', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'special<>&"\'',
            relationshipType: 'SAME_FILE',
            confidence: 0.75,
            isApproved: false,
            translations: {
              en: 'Hello <world> & "quotes"',
              fr: "Bonjour <monde> & 'guillemets'",
            },
          },
        ];
        const result = service.buildStructuredContext(related, 'fr', 'en');

        expect(result).toContain('name="special&lt;&gt;&amp;&quot;&apos;"');
        expect(result).toContain(
          '<source lang="en">Hello &lt;world&gt; &amp; &quot;quotes&quot;</source>'
        );
        expect(result).toContain(
          '<target lang="fr">Bonjour &lt;monde&gt; &amp; &apos;guillemets&apos;</target>'
        );
      });

      it('filters out entries without target translation', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'has.both',
            relationshipType: 'NEARBY',
            confidence: 0.9,
            isApproved: false,
            translations: { en: 'Has both', es: 'Tiene ambos' },
          },
          {
            keyName: 'missing.target',
            relationshipType: 'NEARBY',
            confidence: 0.9,
            isApproved: false,
            translations: { en: 'Missing target' }, // No 'es' translation
          },
        ];
        const result = service.buildStructuredContext(related, 'es', 'en');

        expect(result).toContain('name="has.both"');
        expect(result).not.toContain('name="missing.target"');
      });

      it('includes all relationship types', () => {
        const types: Array<AIContextTranslation['relationshipType']> = [
          'NEARBY',
          'KEY_PATTERN',
          'SAME_COMPONENT',
          'SAME_FILE',
          'SEMANTIC',
        ];

        for (const type of types) {
          const related: AIContextTranslation[] = [
            {
              keyName: 'test',
              relationshipType: type,
              confidence: 0.5,
              isApproved: false,
              translations: { en: 'Test', es: 'Prueba' },
            },
          ];
          const result = service.buildStructuredContext(related, 'es', 'en');
          expect(result).toContain(`type="${type}"`);
        }
      });

      it('formats confidence to 2 decimal places', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'test',
            relationshipType: 'NEARBY',
            confidence: 0.123456789,
            isApproved: false,
            translations: { en: 'Test', es: 'Prueba' },
          },
        ];
        const result = service.buildStructuredContext(related, 'es', 'en');
        expect(result).toContain('confidence="0.12"');
      });
    });

    describe('buildContextPrompt', () => {
      it('returns empty string for empty array', () => {
        const result = service.buildContextPrompt([], 'es', 'en');
        expect(result).toBe('');
      });

      it('returns empty string when no entries have both languages', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'test',
            relationshipType: 'NEARBY',
            confidence: 0.9,
            isApproved: false,
            translations: { en: 'Hello' },
          },
        ];
        const result = service.buildContextPrompt(related, 'es', 'en');
        expect(result).toBe('');
      });

      it('generates context prompt with translations', () => {
        const related: AIContextTranslation[] = [
          {
            keyName: 'greeting',
            relationshipType: 'NEARBY',
            confidence: 0.9,
            isApproved: false,
            translations: { en: 'Hello', es: 'Hola' },
          },
        ];
        const result = service.buildContextPrompt(related, 'es', 'en');

        expect(result).toContain('Here are similar translations');
        expect(result).toContain('"Hello" → "Hola"');
      });

      it('limits to 3 examples', () => {
        const related: AIContextTranslation[] = Array.from({ length: 5 }, (_, i) => ({
          keyName: `key.${i}`,
          relationshipType: 'NEARBY' as const,
          confidence: 0.9,
          isApproved: false,
          translations: { en: `English ${i}`, es: `Spanish ${i}` },
        }));
        const result = service.buildContextPrompt(related, 'es', 'en');

        // Should only have 3 examples
        const matches = result.match(/→/g);
        expect(matches?.length).toBe(3);
      });
    });
  });
});
