'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRelatedKeys } from '@/hooks/use-related-keys';
import type { RelationshipType, TranslationKey } from '@/lib/api';
import { flattenAndSortRelationships, type ScoredRelatedKey } from '@/lib/related-keys-scoring';
import { cn } from '@/lib/utils';
import { Brain, FileText, FolderOpen, Link2Off, Loader2, MapPin, Regex } from 'lucide-react';
import { useMemo } from 'react';

interface RelatedKeysTabProps {
  keyData: TranslationKey;
  branchId: string;
  onSelectKey?: (keyId: string) => void;
}

// Relationship type config
const relationshipConfig: Record<
  RelationshipType,
  {
    label: string;
    icon: typeof MapPin;
    color: string;
    bgColor: string;
  }
> = {
  NEARBY: {
    label: 'Nearby',
    icon: MapPin,
    color: 'text-green-600',
    bgColor: 'bg-green-600/10',
  },
  KEY_PATTERN: {
    label: 'Key Pattern',
    icon: Regex,
    color: 'text-orange-600',
    bgColor: 'bg-orange-600/10',
  },
  SAME_FILE: {
    label: 'Same File',
    icon: FileText,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  SAME_COMPONENT: {
    label: 'Same Component',
    icon: FolderOpen,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  SEMANTIC: {
    label: 'Semantic Match',
    icon: Brain,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

function RelatedKeyItem({
  relatedKey,
  onSelect,
}: {
  relatedKey: ScoredRelatedKey;
  onSelect?: (keyId: string) => void;
}) {
  const config = relationshipConfig[relatedKey.type];
  const Icon = config.icon;
  const scorePercent = Math.round(relatedKey.score * 100);

  return (
    <button
      className={cn(
        'w-full rounded-lg border p-2.5 text-left transition-all duration-200',
        'hover:bg-muted/50 hover:border-border',
        'bg-card border-border/50'
      )}
      onClick={() => onSelect?.(relatedKey.id)}
    >
      <div className="flex items-start gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('cursor-help rounded-md p-1.5', config.bgColor)}>
              <Icon className={cn('size-3.5', config.color)} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground">Relevance: {scorePercent}%</span>
              {relatedKey.sourceLine != null && (
                <span className="text-muted-foreground">Line {relatedKey.sourceLine}</span>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="truncate font-mono text-sm font-medium">{relatedKey.name}</span>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 text-[10px]',
                scorePercent >= 80 && 'border-green-500/50 text-green-600',
                scorePercent >= 60 && scorePercent < 80 && 'border-amber-500/50 text-amber-600',
                scorePercent < 60 && 'border-muted-foreground/30'
              )}
            >
              {scorePercent}%
            </Badge>
          </div>
          {relatedKey.namespace && (
            <p className="text-muted-foreground truncate text-xs">{relatedKey.namespace}</p>
          )}
          {(relatedKey.sourceFile || relatedKey.sourceComponent) && (
            <p className="text-muted-foreground/70 mt-0.5 truncate text-[11px]">
              {relatedKey.sourceComponent || relatedKey.sourceFile}
              {relatedKey.sourceLine != null && (
                <span className="ml-1">:{relatedKey.sourceLine}</span>
              )}
            </p>
          )}
          {/* Show first translation preview if available */}
          {relatedKey.translations && relatedKey.translations[0] && (
            <p className="text-muted-foreground mt-1 truncate text-xs italic">
              &quot;{relatedKey.translations[0].value}&quot;
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function RelatedKeysTab({ keyData, branchId, onSelectKey }: RelatedKeysTabProps) {
  const { data, isLoading, error } = useRelatedKeys(branchId, keyData.id, {
    limit: 30, // Fetch more keys
    includeTranslations: true,
  });

  // Flatten and sort by AI relevance score
  const relationships = data?.relationships;
  const sortedKeys = useMemo(() => {
    if (!relationships) return [];
    return flattenAndSortRelationships(relationships);
  }, [relationships]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-destructive text-sm">Failed to load related keys</p>
        <p className="text-muted-foreground mt-1 text-xs">Please try again later</p>
      </div>
    );
  }

  // Empty state
  if (sortedKeys.length === 0) {
    return (
      <div className="space-y-3 py-6 text-center">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-3">
            <Link2Off className="text-muted-foreground size-5" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">No related keys found</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Related keys will appear here when keys share the same file, component, or have similar
            translations
          </p>
        </div>
      </div>
    );
  }

  // Count by type for summary
  const typeCounts = sortedKeys.reduce(
    (acc, key) => {
      acc[key.type] = (acc[key.type] || 0) + 1;
      return acc;
    },
    {} as Record<RelationshipType, number>
  );

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs">{sortedKeys.length} related keys</span>
        <span className="text-muted-foreground/50">•</span>
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = relationshipConfig[type as RelationshipType];
          const Icon = config.icon;
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
                    config.bgColor,
                    config.color
                  )}
                >
                  <Icon className="size-3" />
                  <span>{count}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {count} {config.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Sorted list of all related keys */}
      <div className="space-y-1.5">
        {sortedKeys.slice(0, 15).map((key) => (
          <RelatedKeyItem key={key.id} relatedKey={key} onSelect={onSelectKey} />
        ))}
      </div>

      {/* Show more indicator */}
      {sortedKeys.length > 15 && (
        <div className="text-center">
          <span className="text-muted-foreground text-xs">
            +{sortedKeys.length - 15} more related keys
          </span>
        </div>
      )}
    </div>
  );
}
