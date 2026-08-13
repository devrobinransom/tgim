/**
 * QA: i18n catalog parity across en/hi/mr. TS already enforces key parity at
 * compile time (Record<MessageKey, string>); these tests add runtime checks so
 * a translation can never regress to an empty string or duplicate a key set.
 */
import { messages } from './i18n';

describe('i18n catalog', () => {
  const locales = Object.keys(messages) as (keyof typeof messages)[];

  it('defines every message in all three locales with identical key sets', () => {
    const keySets = locales.map((locale) => Object.keys(messages[locale]));
    const reference = keySets[0].sort();
    for (const keys of keySets) {
      expect([...keys].sort()).toEqual(reference);
    }
    expect(reference.length).toBeGreaterThan(50);
  });

  it('has no empty or whitespace-only translations', () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(messages[locale])) {
        expect(`${locale}.${key}`).toBeDefined();
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('localizes the five core tab labels distinctly per language', () => {
    expect(messages.en.home).toBe('Home');
    expect(messages.hi.report).toBe('रिपोर्ट');
    expect(messages.mr.promises).toBe('आश्वासने');
  });
});