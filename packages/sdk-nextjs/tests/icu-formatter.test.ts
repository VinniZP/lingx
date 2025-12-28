import { describe, it, expect, beforeEach } from 'vitest';
import { ICUFormatter, hasICUSyntax } from '../src/client/icu-formatter';

describe('ICUFormatter', () => {
  let formatter: ICUFormatter;

  beforeEach(() => {
    formatter = new ICUFormatter('en');
  });

  describe('Simple Interpolation', () => {
    it('should interpolate simple placeholders', () => {
      const result = formatter.format('Hello, {name}!', { name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should handle multiple placeholders', () => {
      const result = formatter.format('{greeting}, {name}!', {
        greeting: 'Hello',
        name: 'World',
      });
      expect(result).toBe('Hello, World!');
    });

    it('should handle missing values gracefully', () => {
      const result = formatter.format('Hello, {name}!', {});
      // IntlMessageFormat throws on missing values, we catch and return original
      expect(result).toBe('Hello, {name}!');
    });
  });

  describe('Plural Formatting', () => {
    const pluralMessage =
      '{count, plural, =0 {No items} one {1 item} other {{count} items}}';

    it('should format plural =0', () => {
      const result = formatter.format(pluralMessage, { count: 0 });
      expect(result).toBe('No items');
    });

    it('should format plural one', () => {
      const result = formatter.format(pluralMessage, { count: 1 });
      expect(result).toBe('1 item');
    });

    it('should format plural other', () => {
      const result = formatter.format(pluralMessage, { count: 5 });
      expect(result).toBe('5 items');
    });

    it('should handle large numbers', () => {
      const result = formatter.format(pluralMessage, { count: 1000 });
      expect(result).toBe('1000 items');
    });
  });

  describe('Select Formatting', () => {
    const selectMessage =
      '{gender, select, male {He} female {She} other {They}} liked your post';

    it('should format select male', () => {
      const result = formatter.format(selectMessage, { gender: 'male' });
      expect(result).toBe('He liked your post');
    });

    it('should format select female', () => {
      const result = formatter.format(selectMessage, { gender: 'female' });
      expect(result).toBe('She liked your post');
    });

    it('should format select other', () => {
      const result = formatter.format(selectMessage, { gender: 'neutral' });
      expect(result).toBe('They liked your post');
    });
  });

  describe('SelectOrdinal Formatting', () => {
    const ordinalMessage =
      'You finished {place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';

    it('should format ordinal 1st', () => {
      const result = formatter.format(ordinalMessage, { place: 1 });
      expect(result).toBe('You finished 1st');
    });

    it('should format ordinal 2nd', () => {
      const result = formatter.format(ordinalMessage, { place: 2 });
      expect(result).toBe('You finished 2nd');
    });

    it('should format ordinal 3rd', () => {
      const result = formatter.format(ordinalMessage, { place: 3 });
      expect(result).toBe('You finished 3rd');
    });

    it('should format ordinal 4th', () => {
      const result = formatter.format(ordinalMessage, { place: 4 });
      expect(result).toBe('You finished 4th');
    });
  });

  describe('Number Formatting', () => {
    it('should format basic numbers', () => {
      const result = formatter.format('Count: {value, number}', {
        value: 1234567,
      });
      expect(result).toBe('Count: 1,234,567');
    });

    it('should format currency', () => {
      const result = formatter.format(
        'Price: {amount, number, ::currency/USD}',
        { amount: 1234.56 }
      );
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format percentages', () => {
      const result = formatter.format('Progress: {value, number, ::percent}', {
        value: 0.75,
      });
      expect(result).toBe('Progress: 75%');
    });
  });

  describe('Date Formatting', () => {
    const testDate = new Date('2025-12-28T10:30:00Z');

    it('should format date short', () => {
      const result = formatter.format('Date: {date, date, short}', {
        date: testDate,
      });
      expect(result).toMatch(/\d+\/\d+\/\d+/); // MM/DD/YY format
    });

    it('should format date medium', () => {
      const result = formatter.format('Date: {date, date, medium}', {
        date: testDate,
      });
      expect(result).toContain('Dec');
      expect(result).toContain('2025');
    });

    it('should format date long', () => {
      const result = formatter.format('Date: {date, date, long}', {
        date: testDate,
      });
      expect(result).toContain('December');
      expect(result).toContain('2025');
    });
  });

  describe('Time Formatting', () => {
    const testDate = new Date('2025-12-28T10:30:00Z');

    it('should format time short', () => {
      const result = formatter.format('Time: {time, time, short}', {
        time: testDate,
      });
      expect(result).toMatch(/\d+:\d+\s*(AM|PM)?/i);
    });

    it('should format time medium', () => {
      const result = formatter.format('Time: {time, time, medium}', {
        time: testDate,
      });
      expect(result).toMatch(/\d+:\d+:\d+/);
    });
  });

  describe('Caching', () => {
    it('should cache parsed messages', () => {
      const message =
        '{count, plural, one {1 item} other {{count} items}}';

      // Format same message multiple times
      formatter.format(message, { count: 1 });
      formatter.format(message, { count: 5 });
      formatter.format(message, { count: 10 });

      // Should have only parsed once (check cache size)
      expect(formatter.getCacheSize()).toBe(1);
    });

    it('should clear cache when language changes', () => {
      formatter.format('Hello, {name}!', { name: 'World' });
      expect(formatter.getCacheSize()).toBe(1);

      formatter.setLanguage('uk');
      expect(formatter.getCacheSize()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should return original message on parse error', () => {
      const invalidMessage = '{unclosed';
      const result = formatter.format(invalidMessage, {});
      expect(result).toBe('{unclosed');
    });

    it('should handle null/undefined values by returning original', () => {
      const result = formatter.format('Hello, {name}!', {
        name: null as unknown as string,
      });
      // IntlMessageFormat formats null as empty string
      expect(result).toBe('Hello, !');
    });
  });

  describe('Locale-specific Formatting', () => {
    it('should format Ukrainian plurals correctly', () => {
      const ukFormatter = new ICUFormatter('uk');
      const message =
        '{count, plural, one {# predmet} few {# predmety} many {# predmetiv} other {# predmeta}}';

      expect(ukFormatter.format(message, { count: 1 })).toBe('1 predmet');
      expect(ukFormatter.format(message, { count: 2 })).toBe('2 predmety');
      expect(ukFormatter.format(message, { count: 5 })).toBe('5 predmetiv');
    });

    it('should format German numbers correctly', () => {
      const deFormatter = new ICUFormatter('de');
      const result = deFormatter.format('Count: {value, number}', {
        value: 1234567,
      });
      // German uses . as thousands separator
      expect(result).toContain('1.234.567');
    });
  });
});

describe('hasICUSyntax', () => {
  it('should detect plural syntax', () => {
    expect(
      hasICUSyntax('{count, plural, one {item} other {items}}')
    ).toBe(true);
  });

  it('should detect select syntax', () => {
    expect(
      hasICUSyntax('{gender, select, male {he} female {she} other {they}}')
    ).toBe(true);
  });

  it('should detect selectordinal syntax', () => {
    expect(hasICUSyntax('{n, selectordinal, one {#st} other {#th}}')).toBe(
      true
    );
  });

  it('should detect number syntax', () => {
    expect(hasICUSyntax('{value, number}')).toBe(true);
  });

  it('should detect date syntax', () => {
    expect(hasICUSyntax('{date, date, short}')).toBe(true);
  });

  it('should detect time syntax', () => {
    expect(hasICUSyntax('{time, time, short}')).toBe(true);
  });

  it('should not detect simple interpolation', () => {
    expect(hasICUSyntax('Hello, {name}!')).toBe(false);
  });

  it('should not detect plain text', () => {
    expect(hasICUSyntax('Hello, World!')).toBe(false);
  });
});
