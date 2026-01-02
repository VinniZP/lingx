'use client';

import { useState, memo } from 'react';
import { useRelatedKeys, type RelatedKey, type RelationshipType } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  FileCode,
  Component,
  Brain,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTranslation, tKey, type TranslationKey, type TranslationKeys } from '@lingx/sdk-nextjs';

const relationshipConfig: Record<
  RelationshipType,
  {
    icon: typeof FileCode;
    labelKey: TranslationKey<TranslationKeys>;
    colorClass: string;
  }
> = {
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

  // Flatten all related keys for display
  const allRelatedKeys: Array<RelatedKey & { type: RelationshipType }> = data
    ? [
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
      <div className="px-4 py-2 border-t border-border/40 bg-muted/10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
      <div className="border-t-2 border-primary/20 bg-primary/5">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-2.5 flex items-center justify-between text-sm hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2.5 text-foreground/80">
              <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center">
                <ChevronDown
                  className={cn(
                    'size-4 text-primary transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </div>
              <span className="font-semibold">
                {t('translations.relatedKeys.title')}
              </span>
              <Badge variant="default" className="h-5 px-2 text-xs bg-primary/20 text-primary hover:bg-primary/20">
                {totalCount}
              </Badge>
            </div>

            {/* Relationship type indicators */}
            <div className="flex items-center gap-1.5">
              {data?.relationships.sameComponent.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn('size-6 rounded-md flex items-center justify-center cursor-default shadow-sm', relationshipConfig.SAME_COMPONENT.colorClass)}>
                      <Component className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {data.relationships.sameComponent.length} {td(relationshipConfig.SAME_COMPONENT.labelKey)}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {data?.relationships.sameFile.length ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn('size-6 rounded-md flex items-center justify-center cursor-default shadow-sm', relationshipConfig.SAME_FILE.colorClass)}>
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
                    <span className={cn('size-6 rounded-md flex items-center justify-center cursor-default shadow-sm', relationshipConfig.SEMANTIC.colorClass)}>
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
          <div className="px-4 pb-3 space-y-2">
            {allRelatedKeys.slice(0, 5).map((relatedKey) => {
              const config = relationshipConfig[relatedKey.type];
              const Icon = config.icon;

              return (
                <div
                  key={relatedKey.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border/40 hover:border-border transition-colors group"
                >
                  {/* Relationship type icon */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'size-6 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                          config.colorClass
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      {td(config.labelKey)}
                      {relatedKey.confidence < 1 && (
                        <span className="ml-1 text-muted-foreground">
                          ({Math.round(relatedKey.confidence * 100)}%)
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>

                  {/* Key info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground truncate">
                        {relatedKey.namespace && (
                          <span className="text-muted-foreground">
                            {relatedKey.namespace}:
                          </span>
                        )}
                        {relatedKey.name}
                      </span>
                      {onNavigateToKey && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onNavigateToKey(relatedKey.name)}
                        >
                          <ExternalLink className="size-3" />
                        </Button>
                      )}
                    </div>

                    {/* Show first translation preview */}
                    {relatedKey.translations && relatedKey.translations[0] && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {relatedKey.translations[0].value}
                      </p>
                    )}

                    {/* Source info */}
                    {(relatedKey.sourceFile || relatedKey.sourceComponent) && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/70">
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
                <span className="text-xs text-muted-foreground">
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
