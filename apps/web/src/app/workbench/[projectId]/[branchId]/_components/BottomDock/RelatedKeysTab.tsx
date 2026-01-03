'use client';

import { FileText, FolderOpen, Brain, Loader2, Link2Off } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRelatedKeys, type RelatedKey } from '@/hooks/use-related-keys';
import type { TranslationKey } from '@/lib/api';

interface RelatedKeysTabProps {
  keyData: TranslationKey;
  branchId: string;
  onSelectKey?: (keyId: string) => void;
}

// Relationship type config
const relationshipConfig = {
  sameFile: {
    label: 'Same File',
    icon: FileText,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  sameComponent: {
    label: 'Same Component',
    icon: FolderOpen,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  semantic: {
    label: 'Semantic Match',
    icon: Brain,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
} as const;

function RelatedKeyItem({
  relatedKey,
  type,
  onSelect,
}: {
  relatedKey: RelatedKey;
  type: keyof typeof relationshipConfig;
  onSelect?: (keyId: string) => void;
}) {
  const config = relationshipConfig[type];
  const Icon = config.icon;
  const confidencePercent = Math.round(relatedKey.confidence * 100);

  return (
    <button
      className={cn(
        'w-full text-left p-2.5 rounded-lg border transition-all duration-200',
        'hover:bg-muted/50 hover:border-border',
        'bg-card border-border/50'
      )}
      onClick={() => onSelect?.(relatedKey.id)}
    >
      <div className="flex items-start gap-2">
        <div className={cn('p-1.5 rounded-md', config.bgColor)}>
          <Icon className={cn('size-3.5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium font-mono truncate">
              {relatedKey.name}
            </span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {confidencePercent}%
            </Badge>
          </div>
          {relatedKey.namespace && (
            <p className="text-xs text-muted-foreground truncate">
              {relatedKey.namespace}
            </p>
          )}
          {(relatedKey.sourceFile || relatedKey.sourceComponent) && (
            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
              {relatedKey.sourceComponent || relatedKey.sourceFile}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function RelationshipSection({
  type,
  keys,
  onSelectKey,
}: {
  type: keyof typeof relationshipConfig;
  keys: RelatedKey[];
  onSelectKey?: (keyId: string) => void;
}) {
  const config = relationshipConfig[type];
  const Icon = config.icon;

  if (keys.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4', config.color)} />
        <span className="text-xs font-medium">{config.label}</span>
        <Badge variant="secondary" className="text-[10px]">
          {keys.length}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {keys.map((key) => (
          <RelatedKeyItem
            key={key.id}
            relatedKey={key}
            type={type}
            onSelect={onSelectKey}
          />
        ))}
      </div>
    </div>
  );
}

export function RelatedKeysTab({ keyData, branchId, onSelectKey }: RelatedKeysTabProps) {
  const { data, isLoading, error } = useRelatedKeys(branchId, keyData.id);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-destructive">Failed to load related keys</p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
      </div>
    );
  }

  const relationships = data?.relationships;
  const hasRelatedKeys =
    relationships &&
    (relationships.sameFile.length > 0 ||
      relationships.sameComponent.length > 0 ||
      relationships.semantic.length > 0);

  // Empty state
  if (!hasRelatedKeys) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-muted">
            <Link2Off className="size-5 text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">No related keys found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Related keys will appear here when keys share the same file, component, or have similar translations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RelationshipSection
        type="sameComponent"
        keys={relationships.sameComponent}
        onSelectKey={onSelectKey}
      />
      <RelationshipSection
        type="sameFile"
        keys={relationships.sameFile}
        onSelectKey={onSelectKey}
      />
      <RelationshipSection
        type="semantic"
        keys={relationships.semantic}
        onSelectKey={onSelectKey}
      />
    </div>
  );
}
