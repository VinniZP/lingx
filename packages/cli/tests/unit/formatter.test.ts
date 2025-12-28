import { describe, it, expect } from 'vitest';
import { JsonFormatter } from '../../src/lib/formatter/json.js';
import { YamlFormatter } from '../../src/lib/formatter/yaml.js';
import { createFormatter } from '../../src/lib/formatter/index.js';

describe('JsonFormatter', () => {
  describe('nested mode', () => {
    const formatter = new JsonFormatter({ nested: true, indentation: 2 });

    it('should format flat translations to nested JSON', () => {
      const translations = {
        'home.title': 'Welcome',
        'home.description': 'About us',
      };
      const output = formatter.format(translations);
      expect(output).toContain('"home"');
      expect(JSON.parse(output)).toEqual({
        home: {
          title: 'Welcome',
          description: 'About us',
        },
      });
    });

    it('should parse nested JSON to flat translations', () => {
      const content = JSON.stringify({
        home: {
          title: 'Welcome',
          description: 'About us',
        },
      });
      const translations = formatter.parse(content);
      expect(translations).toEqual({
        'home.title': 'Welcome',
        'home.description': 'About us',
      });
    });

    it('should handle deeply nested structures', () => {
      const translations = {
        'app.pages.home.hero.title': 'Welcome',
        'app.pages.home.hero.subtitle': 'Subtitle',
        'app.pages.about.title': 'About',
      };
      const output = formatter.format(translations);
      const parsed = JSON.parse(output);
      expect(parsed.app.pages.home.hero.title).toBe('Welcome');
      expect(parsed.app.pages.home.hero.subtitle).toBe('Subtitle');
      expect(parsed.app.pages.about.title).toBe('About');
    });

    it('should parse deeply nested structures back to flat', () => {
      const content = JSON.stringify({
        app: {
          pages: {
            home: { title: 'Home' },
            about: { title: 'About' },
          },
        },
      });
      const translations = formatter.parse(content);
      expect(translations).toEqual({
        'app.pages.home.title': 'Home',
        'app.pages.about.title': 'About',
      });
    });
  });

  describe('flat mode', () => {
    const formatter = new JsonFormatter({ nested: false, indentation: 2 });

    it('should format flat translations to flat JSON', () => {
      const translations = {
        'home.title': 'Welcome',
        'home.description': 'About us',
      };
      const output = formatter.format(translations);
      expect(JSON.parse(output)).toEqual(translations);
    });

    it('should parse flat JSON to flat translations', () => {
      const content = JSON.stringify({
        'home.title': 'Welcome',
        'home.description': 'About us',
      });
      const translations = formatter.parse(content);
      expect(translations).toEqual({
        'home.title': 'Welcome',
        'home.description': 'About us',
      });
    });
  });

  it('should have correct file extension', () => {
    const formatter = new JsonFormatter({ nested: true, indentation: 2 });
    expect(formatter.extension).toBe('.json');
  });

  it('should apply correct indentation', () => {
    const formatter4 = new JsonFormatter({ nested: false, indentation: 4 });
    const output = formatter4.format({ key: 'value' });
    expect(output).toContain('    '); // 4 spaces
  });
});

describe('YamlFormatter', () => {
  describe('nested mode', () => {
    const formatter = new YamlFormatter({ nested: true, indentation: 2 });

    it('should format translations to nested YAML', () => {
      const translations = {
        'home.title': 'Welcome',
      };
      const output = formatter.format(translations);
      expect(output).toContain('home:');
      expect(output).toContain('title: Welcome');
    });

    it('should parse nested YAML to flat translations', () => {
      const content = `home:
  title: Welcome
`;
      const translations = formatter.parse(content);
      expect(translations).toEqual({ 'home.title': 'Welcome' });
    });

    it('should handle deeply nested YAML structures', () => {
      const translations = {
        'app.nav.home': 'Home',
        'app.nav.about': 'About',
      };
      const output = formatter.format(translations);
      expect(output).toContain('app:');
      expect(output).toContain('nav:');
    });
  });

  describe('flat mode', () => {
    const formatter = new YamlFormatter({ nested: false, indentation: 2 });

    it('should format translations to flat YAML', () => {
      const translations = {
        'home.title': 'Welcome',
        'home.description': 'About us',
      };
      const output = formatter.format(translations);
      expect(output).toContain('home.title: Welcome');
    });

    it('should parse flat YAML to flat translations', () => {
      const content = `home.title: Welcome
home.description: About us
`;
      const translations = formatter.parse(content);
      expect(translations).toEqual({
        'home.title': 'Welcome',
        'home.description': 'About us',
      });
    });
  });

  it('should have correct file extension', () => {
    const formatter = new YamlFormatter({ nested: true, indentation: 2 });
    expect(formatter.extension).toBe('.yaml');
  });
});

describe('createFormatter', () => {
  it('should create JSON formatter', () => {
    const formatter = createFormatter('json', { nested: true, indentation: 2 });
    expect(formatter).toBeInstanceOf(JsonFormatter);
  });

  it('should create YAML formatter', () => {
    const formatter = createFormatter('yaml', { nested: true, indentation: 2 });
    expect(formatter).toBeInstanceOf(YamlFormatter);
  });

  it('should throw error for unknown formatter type', () => {
    expect(() => {
      createFormatter('xml' as 'json', { nested: true, indentation: 2 });
    }).toThrow('Unknown formatter type: xml');
  });
});
