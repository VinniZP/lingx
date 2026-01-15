'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GlossaryTag } from '@/lib/api';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { ProjectLanguage } from '@lingx/shared';
import { Globe, Hash, Search, Tag } from 'lucide-react';

interface GlossaryFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sourceLanguageFilter: string;
  onSourceLanguageChange: (value: string) => void;
  domainFilter: string;
  onDomainChange: (value: string) => void;
  tagFilter: string;
  onTagChange: (value: string) => void;
  languages: ProjectLanguage[];
  domains: string[];
  tags: GlossaryTag[];
  totalEntries: number;
}

export function GlossaryFiltersBar({
  search,
  onSearchChange,
  sourceLanguageFilter,
  onSourceLanguageChange,
  domainFilter,
  onDomainChange,
  tagFilter,
  onTagChange,
  languages,
  domains,
  tags,
  totalEntries,
}: GlossaryFiltersBarProps) {
  const { t } = useTranslation('glossary');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-md min-w-[240px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
        <Input
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-card border-border/50 h-11 pl-10"
        />
      </div>

      <Select value={sourceLanguageFilter} onValueChange={onSourceLanguageChange}>
        <SelectTrigger className="bg-card border-border/50 h-10 w-[150px]">
          <Globe className="text-muted-foreground mr-2 size-3.5" />
          <SelectValue placeholder={t('filters.language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allLanguages')}</SelectItem>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {domains.length > 0 && (
        <Select value={domainFilter} onValueChange={onDomainChange}>
          <SelectTrigger className="bg-card border-border/50 h-10 w-[150px]">
            <Hash className="text-muted-foreground mr-2 size-3.5" />
            <SelectValue placeholder={t('filters.domain')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allDomains')}</SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tags.length > 0 && (
        <Select value={tagFilter} onValueChange={onTagChange}>
          <SelectTrigger className="bg-card border-border/50 h-10 w-[150px]">
            <Tag className="text-muted-foreground mr-2 size-3.5" />
            <SelectValue placeholder={t('filters.tag')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTags')}</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  {tag.color && (
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  )}
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground text-sm tabular-nums">
          {t('filters.entriesCount', { count: totalEntries })}
        </span>
      </div>
    </div>
  );
}
