'use client';

import type { ChangeEvent } from 'react';
import { useLanguage } from '../hooks/useLanguage';

/**
 * Props for LanguageSwitcher component
 */
export interface LanguageSwitcherProps {
  /**
   * Custom class name for the select element
   */
  className?: string;

  /**
   * Labels for language codes
   * @example { en: 'English', uk: 'Ukrainian', de: 'Deutsch' }
   */
  labels?: Record<string, string>;

  /**
   * Called when language changes
   * @param lang - The new language code
   */
  onChange?: (lang: string) => void;
}

/**
 * Ready-to-use language switcher component.
 *
 * Renders a select dropdown with available languages.
 * Automatically handles language switching via the Lingx context.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LanguageSwitcher />
 *
 * // With custom labels
 * <LanguageSwitcher
 *   labels={{ en: 'English', uk: 'Ukrainian', de: 'Deutsch' }}
 *   onChange={(lang) => console.log('Switched to', lang)}
 * />
 *
 * // With styling
 * <LanguageSwitcher className="my-language-select" />
 * ```
 */
export function LanguageSwitcher({
  className,
  labels = {},
  onChange,
}: LanguageSwitcherProps) {
  const { language, setLanguage, availableLanguages, isChanging } = useLanguage();

  const handleChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    await setLanguage(newLang);
    onChange?.(newLang);
  };

  return (
    <select
      value={language}
      onChange={handleChange}
      disabled={isChanging}
      className={className}
      aria-label="Select language"
    >
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {labels[lang] || lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
