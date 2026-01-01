'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Globe, Hash, Tag } from 'lucide-react';
import type { GlossaryTag } from '@/lib/api';
import type { ProjectLanguage } from '@localeflow/shared';

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
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={t('glossary.filters.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 bg-card border-border/50"
        />
      </div>

      <Select value={sourceLanguageFilter} onValueChange={onSourceLanguageChange}>
        <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
          <Globe className="size-3.5 mr-2 text-muted-foreground" />
          <SelectValue placeholder={t('glossary.filters.language')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.allLanguages')}</SelectItem>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {domains.length > 0 && (
        <Select value={domainFilter} onValueChange={onDomainChange}>
          <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
            <Hash className="size-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('glossary.filters.domain')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.allDomains')}</SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>{domain}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tags.length > 0 && (
        <Select value={tagFilter} onValueChange={onTagChange}>
          <SelectTrigger className="w-[150px] h-10 bg-card border-border/50">
            <Tag className="size-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder={t('glossary.filters.tag')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.allTags')}</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <div className="flex items-center gap-2">
                  {tag.color && (
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {t('glossary.filters.entriesCount', { count: totalEntries })}
        </span>
      </div>
    </div>
  );
}
