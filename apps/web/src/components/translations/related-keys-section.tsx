'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRelatedKeys, type RelatedKey, type RelationshipType } from '@/hooks';
import { cn } from '@/lib/utils';
import { tKey, useTranslation, type TranslationKey, type TranslationKeys } from '@lingx/sdk-nextjs';
import {
  Brain,
  ChevronDown,
  Component,
  ExternalLink,
  FileCode,
  Loader2,
  MapPin,
  Regex,
} from 'lucide-react';
import { memo, useState } from 'react';

const relationshipConfig: Record<
  RelationshipType,
  {
    icon: typeof FileCode;
    labelKey: TranslationKey<TranslationKeys>;
    colorClass: string;
  }
> = {
  NEARBY: {
    icon: MapPin,
    labelKey: tKey('translations.relatedKeys.nearby'),
    colorClass: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  },
  KEY_PATTERN: {
    icon: Regex,
    labelKey: tKey('translations.relatedKeys.keyPattern'),
    colorClass: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  },
  SAME_FILE: {
    icon: FileCode,
    labelKey: tKey('translations.relatedKeys.sameFile'),
    colorClass: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  },
  SAME_COMPONENT: {
    icon: Component,
    labelKey: tKey('translations.relatedKeys.sameComponent'),
    colorClass: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  },
  SEMANTIC: {
    icon: Brain,
    labelKey: tKey('translations.relatedKeys.semantic'),
    colorClass: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  },
};

interface RelatedKeysSectionProps {
  branchId: string;
  keyId: string;
  isExpanded: boolean;
  onNavigateToKey?: (keyName: string) => void;
}

export const RelatedKeysSection = memo(function RelatedKeysSection({
  branchId,
  keyId,
  isExpanded,
  onNavigateToKey,
}: RelatedKeysSectionProps) {
  const { t, td } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useRelatedKeys(branchId, keyId, {
    enabled: isExpanded,
    limit: 10,
    includeTranslations: true,
  });

  // Flatten all related keys for display (prioritized order)
  const allRelatedKeys: Array<RelatedKey & { type: RelationshipType }> = data
    ? [
        ...data.relationships.nearby.map((k) => ({
          ...k,
          type: 'NEARBY' as const,
        })),
        ...data.relationships.keyPattern.map((k) => ({
          ...k,
          type: 'KEY_PATTERN' as const,
        })),
        ...data.relationships.sameComponent.map((k) => ({
          ...k,
          type: 'SAME_COMPONENT' as const,
        })),
        ...data.relationships.sameFile.map((k) => ({
          ...k,
          type: 'SAME_FILE' as const,
        })),
        ...data.relationships.semantic.map((k) => ({
          ...k,
          type: 'SEMANTIC' as const,
        })),
      ]
    : [];

  const totalCount = allRelatedKeys.length;

  // Don't render if no data or not expanded
  if (!isExpanded) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="border-border/40 bg-muted/10 border-t px-4 py-2">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          <span>{t('translations.relatedKeys.loading')}</span>
        </div>
      </div>
    );
  }

  // No related keys found
  if (totalCount === 0 && !error) {
    return null;
  }

  // Error state
  if (error) {
    return null; // Silently fail - related keys are not critical
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-primary/20 bg-primary/5 border-t-2">
        <CollapsibleTrigger asChild>
          <button className="hover:bg-primary/10 flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors">
            <div className="text-foreground/80 flex items-center gap-2.5">
              <div className="bg-primary/10 flex size-6 items-center justify-center rounded-md">
                <ChevronDown
                  className={cn(
                    'text-primary size-4 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
              <span className="font-semibold">{t('translations.relatedKeys.title')}</span>
              <Badge
                variant="default"
                className="bg-primary/20 text-primary hover:bg-primary/20 h-5 px-2 text-xs"
              >
                {totalCount}
              </Badge>
            </div>

            {/* Relationship type indicators */}
            <div className="flex items-center gap-1.5">
              {data?.relationships.nearby.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex size-6 cursor-default items-center justify-center rounded-md shadow-sm',
                        relationshipConfig.NEARBY.colorClass
                      )}
                    >
                      <MapPin className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.nearby.length} {td(relationshipConfig.NEARBY.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {data?.relationships.keyPattern.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex size-6 cursor-default items-center justify-center rounded-md shadow-sm',
                        relationshipConfig.KEY_PATTERN.colorClass
                      )}
                    >
                      <Regex className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.keyPattern.length}{' '}
                    {td(relationshipConfig.KEY_PATTERN.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {data?.relationships.sameComponent.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex size-6 cursor-default items-center justify-center rounded-md shadow-sm',
                        relationshipConfig.SAME_COMPONENT.colorClass
                      )}
                    >
                      <Component className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.sameComponent.length}{' '}
                    {td(relationshipConfig.SAME_COMPONENT.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {data?.relationships.sameFile.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex size-6 cursor-default items-center justify-center rounded-md shadow-sm',
                        relationshipConfig.SAME_FILE.colorClass
                      )}
                    >
                      <FileCode className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.sameFile.length} {td(relationshipConfig.SAME_FILE.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {data?.relationships.semantic.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'flex size-6 cursor-default items-center justify-center rounded-md shadow-sm',
                        relationshipConfig.SEMANTIC.colorClass
                      )}
                    >
                      <Brain className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.semantic.length} {td(relationshipConfig.SEMANTIC.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-2 px-4 pb-3">
            {allRelatedKeys.slice(0, 5).map((relatedKey) => {
              const config = relationshipConfig[relatedKey.type];
              const Icon = config.icon;

              return (
                <div
                  key={relatedKey.id}
                  className="bg-background/50 border-border/40 hover:border-border group flex items-start gap-2 rounded-lg border p-2 transition-colors"
                >
                  {/* Relationship type icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md',
                          config.colorClass
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      {td(config.labelKey)}
                      {relatedKey.confidence < 1 && (
                        <span className="text-muted-foreground ml-1">
                          ({Math.round(relatedKey.confidence * 100)}%)
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  {/* Key info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground truncate font-mono text-xs">
                        {relatedKey.namespace && (
                          <span className="text-muted-foreground">{relatedKey.namespace}:</span>
                        )}
                        {relatedKey.name}
                      </span>
                      {onNavigateToKey && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => onNavigateToKey(relatedKey.name)}
                        >
                          <ExternalLink className="size-3" />
                        </Button>
                      )}
                    </div>

                    {/* Show first translation preview */}
                    {relatedKey.translations && relatedKey.translations[0] && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {relatedKey.translations[0].value}
                      </p>
                    )}

                    {/* Source info */}
                    {(relatedKey.sourceFile || relatedKey.sourceComponent) && (
                      <div className="text-muted-foreground/70 mt-1 flex items-center gap-2 text-[10px]">
                        {relatedKey.sourceComponent && (
                          <span className="flex items-center gap-0.5">
                            <Component className="size-2.5" />
                            {relatedKey.sourceComponent}
                          </span>
                        )}
                        {relatedKey.sourceFile && (
                          <span className="flex items-center gap-0.5 truncate">
                            <FileCode className="size-2.5" />
                            {relatedKey.sourceFile.split('/').pop()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Show more indicator */}
            {allRelatedKeys.length > 5 && (
              <div className="text-center">
                <span className="text-muted-foreground text-xs">
                  {t('translations.relatedKeys.andMore', { count: allRelatedKeys.length - 5 })}
                </span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
