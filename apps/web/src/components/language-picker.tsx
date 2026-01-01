'use client';

import * as React from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage, useTranslation } from '@localeflow/sdk-nextjs';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
];

interface LanguagePickerProps {
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Alignment of dropdown */
  align?: 'start' | 'center' | 'end';
  /** Side of dropdown */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function LanguagePicker({
  compact = false,
  className,
  align = 'end',
  side = 'bottom',
}: LanguagePickerProps) {
  const { t } = useTranslation();
  const { language, setLanguage, isChanging, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentLanguage = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Filter to only show available languages
  const displayLanguages = LANGUAGES.filter(
    (l) => availableLanguages.length === 0 || availableLanguages.includes(l.code)
  );

  const handleSelect = async (code: string) => {
    if (code !== language) {
      await setLanguage(code);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          // Base styling
          'group flex items-center gap-2 outline-none select-none',
          'transition-all duration-200',
          // Compact mode (for sidebar)
          compact ? [
            'h-9 px-2.5 rounded-lg',
            'bg-sidebar-accent/50 hover:bg-sidebar-accent',
            'text-sidebar-foreground',
          ] : [
            // Full mode (for header/dashboard)
            'h-10 px-3.5 rounded-xl',
            'bg-card border border-border',
            'hover:border-primary/20 hover:shadow-sm',
            // Island-like inner glow
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]',
            'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
          ],
          // Loading state
          isChanging && 'opacity-70 pointer-events-none',
          className
        )}
        disabled={isChanging}
      >
        {/* Flag or Globe icon */}
        <span className="text-base leading-none" aria-hidden="true">
          {currentLanguage.flag}
        </span>

        {/* Language label - hidden in compact mode on small screens */}
        {!compact && (
          <span className="text-sm font-medium hidden sm:inline">
            {currentLanguage.nativeLabel}
          </span>
        )}

        {/* Chevron with rotation animation */}
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />

        {/* Subtle loading indicator */}
        {isChanging && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 rounded-xl">
            <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className="w-52"
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border -mx-1.5 -mt-1.5 mb-1.5 rounded-t-xl bg-muted/30">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('nav.language')}
            </span>
          </div>
        </div>

        <DropdownMenuRadioGroup value={language} onValueChange={handleSelect}>
          {displayLanguages.map((lang) => (
            <DropdownMenuRadioItem
              key={lang.code}
              value={lang.code}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Flag */}
                <span className="text-lg leading-none" aria-hidden="true">
                  {lang.flag}
                </span>

                {/* Labels */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lang.nativeLabel}</span>
                  <span className="text-[11px] text-muted-foreground">{lang.label}</span>
                </div>
              </div>

              {/* Check indicator (replacing the default radio circle) */}
              {language === lang.code && (
                <Check className="size-4 text-primary ml-auto" />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Compact version for sidebar footer
 */
export function LanguagePickerCompact({ className }: { className?: string }) {
  return (
    <LanguagePicker
      compact
      align="start"
      side="top"
      className={className}
    />
  );
}
