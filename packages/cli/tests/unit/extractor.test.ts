import { describe, it, expect } from 'vitest';
import { NextjsExtractor } from '../../src/lib/extractor/nextjs.js';
import { AngularExtractor } from '../../src/lib/extractor/angular.js';
import { detectIcuPatterns, hasIcuPatterns } from '../../src/lib/extractor/icu-detector.js';
import { createExtractor } from '../../src/lib/extractor/index.js';

describe('NextjsExtractor', () => {
  const extractor = new NextjsExtractor({
    functions: ['t', 'useTranslation'],
  });

  it('should extract keys from t() calls', () => {
    const code = `
      const { t } = useTranslation();
      const title = t('home.title');
      const desc = t('home.description', { name: 'John' });
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('home.title');
    expect(keys).toContain('home.description');
  });

  it('should extract keys from useTranslation namespace', () => {
    const code = `
      const { t } = useTranslation('common');
      const title = t('title');
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('common:title');
  });

  it('should skip dynamic keys', () => {
    const code = `
      const key = getKey();
      const title = t(key);
    `;

    const result = extractor.extractFromCode(code);
    expect(result).toHaveLength(0);
  });

  it('should detect template literal keys', () => {
    const code = `
      const title = t(\`home.title\`);
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('home.title');
  });

  it('should extract multiple keys from same file', () => {
    const code = `
      const { t } = useTranslation();
      const items = [
        t('nav.home'),
        t('nav.about'),
        t('nav.contact'),
      ];
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toHaveLength(3);
    expect(keys).toContain('nav.home');
    expect(keys).toContain('nav.about');
    expect(keys).toContain('nav.contact');
  });

  it('should extract keys from member expression calls like i18n.t()', () => {
    const code = `
      const title = i18n.t('page.title');
      const desc = this.t('page.description');
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('page.title');
    expect(keys).toContain('page.description');
  });

  it('should extract keys with details including location', () => {
    const code = `const title = t('home.title');`;
    const keys = extractor.extractFromCodeWithDetails(code, 'test.tsx');

    expect(keys).toHaveLength(1);
    expect(keys[0].key).toBe('home.title');
    expect(keys[0].location).toBeDefined();
    expect(keys[0].location?.file).toBe('test.tsx');
    expect(keys[0].location?.line).toBe(1);
  });

  it('should handle JSX syntax', () => {
    const code = `
      function MyComponent() {
        const { t } = useTranslation();
        return (
          <div>
            <h1>{t('page.heading')}</h1>
            <p>{t('page.content')}</p>
          </div>
        );
      }
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('page.heading');
    expect(keys).toContain('page.content');
  });

  it('should handle TypeScript syntax', () => {
    const code = `
      interface Props {
        title: string;
      }

      function MyComponent({ title }: Props): JSX.Element {
        const { t } = useTranslation();
        return <h1>{t('component.title')}</h1>;
      }
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('component.title');
  });

  it('should handle parse errors gracefully', () => {
    const invalidCode = `
      const { t = useTranslation(;
      t('broken';
    `;

    // Should not throw
    const keys = extractor.extractFromCode(invalidCode);
    expect(Array.isArray(keys)).toBe(true);
  });
});

describe('AngularExtractor', () => {
  const extractor = new AngularExtractor({
    functions: ['translate', 'instant', 'get'],
  });

  it('should extract keys from pipe syntax {{ key | translate }}', () => {
    const code = `
      <div>{{ 'home.title' | translate }}</div>
      <span>{{ 'home.description' | translate }}</span>
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('home.title');
    expect(keys).toContain('home.description');
  });

  it('should extract keys from translate service calls', () => {
    const code = `
      this.translate.instant('settings.title');
      this.translateService.get('settings.description');
    `;

    const keys = extractor.extractFromCode(code);
    expect(keys).toContain('settings.title');
    expect(keys).toContain('settings.description');
  });

  it('should extract keys with details including location', () => {
    const code = `{{ 'app.title' | translate }}`;
    const keys = extractor.extractFromCodeWithDetails(code, 'test.html');

    expect(keys).toHaveLength(1);
    expect(keys[0].key).toBe('app.title');
    expect(keys[0].location?.file).toBe('test.html');
  });
});

describe('ICU Pattern Detection', () => {
  it('should detect plural patterns', () => {
    const result = detectIcuPatterns('{count, plural, =0 {none} one {one} other {{count} items}}');
    expect(result.variables).toContain('count');
    expect(result.patterns).toContain('plural');
    expect(result.isValid).toBe(true);
  });

  it('should detect select patterns', () => {
    const result = detectIcuPatterns('{gender, select, male {He} female {She} other {They}}');
    expect(result.variables).toContain('gender');
    expect(result.patterns).toContain('select');
    expect(result.isValid).toBe(true);
  });

  it('should detect simple interpolation', () => {
    const result = detectIcuPatterns('Hello, {name}!');
    expect(result.variables).toContain('name');
    expect(result.isValid).toBe(true);
  });

  it('should detect number formatting', () => {
    const result = detectIcuPatterns('Price: {amount, number, currency}');
    expect(result.variables).toContain('amount');
    expect(result.patterns).toContain('number');
    expect(result.isValid).toBe(true);
  });

  it('should detect date formatting', () => {
    const result = detectIcuPatterns('Updated {date, date, medium}');
    expect(result.variables).toContain('date');
    expect(result.patterns).toContain('date');
    expect(result.isValid).toBe(true);
  });

  it('should detect time formatting', () => {
    const result = detectIcuPatterns('Meeting at {time, time, short}');
    expect(result.variables).toContain('time');
    expect(result.patterns).toContain('time');
    expect(result.isValid).toBe(true);
  });

  it('should return empty for plain text', () => {
    const result = detectIcuPatterns('Hello, World!');
    expect(result.variables).toHaveLength(0);
    expect(result.patterns).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should detect multiple variables', () => {
    const result = detectIcuPatterns('Hello {firstName} {lastName}, you have {count} messages');
    expect(result.variables).toContain('firstName');
    expect(result.variables).toContain('lastName');
    expect(result.variables).toContain('count');
    expect(result.variables).toHaveLength(3);
  });

  it('should handle nested patterns', () => {
    const result = detectIcuPatterns(
      '{count, plural, =0 {No items} one {{user} has one item} other {{user} has {count} items}}'
    );
    expect(result.variables).toContain('count');
    expect(result.variables).toContain('user');
    expect(result.patterns).toContain('plural');
  });

  it('should handle invalid ICU syntax gracefully', () => {
    const result = detectIcuPatterns('{unclosed brace');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.variables).toHaveLength(0);
    expect(result.patterns).toHaveLength(0);
  });

  it('should provide hasIcuPatterns helper', () => {
    expect(hasIcuPatterns('Hello, {name}!')).toBe(true);
    expect(hasIcuPatterns('Plain text')).toBe(false);
  });
});

describe('createExtractor', () => {
  it('should create NextjsExtractor for nextjs framework', () => {
    const extractor = createExtractor('nextjs', { functions: ['t'] });
    expect(extractor).toBeInstanceOf(NextjsExtractor);
  });

  it('should create AngularExtractor for angular framework', () => {
    const extractor = createExtractor('angular', { functions: ['translate'] });
    expect(extractor).toBeInstanceOf(AngularExtractor);
  });

  it('should throw error for unknown framework', () => {
    expect(() => {
      createExtractor('vue' as 'nextjs', { functions: ['t'] });
    }).toThrow('Unknown framework: vue');
  });
});
