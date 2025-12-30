'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type {
  BranchDiffResponse,
  DiffEntry,
  ModifiedEntry,
  ConflictEntry,
} from '@localeflow/shared';

interface DiffViewProps {
  diff: BranchDiffResponse;
  onConflictSelect?: (conflict: ConflictEntry) => void;
}

export function DiffView({ diff, onConflictSelect }: DiffViewProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    added: true,
    modified: true,
    deleted: true,
    conflicts: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasNoChanges =
    diff.added.length === 0 &&
    diff.modified.length === 0 &&
    diff.deleted.length === 0 &&
    diff.conflicts.length === 0;

  return (
    <div className="space-y-4">
      {/* Conflicts Section - Most important, shown first */}
      {diff.conflicts.length > 0 && (
        <DiffSection
          title="Conflicts"
          count={diff.conflicts.length}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          isExpanded={expandedSections.conflicts}
          onToggle={() => toggleSection('conflicts')}
          variant="conflict"
        >
          {diff.conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.key}
              conflict={conflict}
              onSelect={() => onConflictSelect?.(conflict)}
            />
          ))}
        </DiffSection>
      )}

      {/* Added Section */}
      {diff.added.length > 0 && (
        <DiffSection
          title="Added"
          count={diff.added.length}
          icon={<Plus className="h-4 w-4 text-emerald-600" />}
          isExpanded={expandedSections.added}
          onToggle={() => toggleSection('added')}
          variant="added"
        >
          {diff.added.map((entry) => (
            <AddedCard key={entry.key} entry={entry} />
          ))}
        </DiffSection>
      )}

      {/* Modified Section */}
      {diff.modified.length > 0 && (
        <DiffSection
          title="Modified"
          count={diff.modified.length}
          icon={<Pencil className="h-4 w-4 text-violet-600" />}
          isExpanded={expandedSections.modified}
          onToggle={() => toggleSection('modified')}
          variant="modified"
        >
          {diff.modified.map((entry) => (
            <ModifiedCard key={entry.key} entry={entry} />
          ))}
        </DiffSection>
      )}

      {/* Deleted Section */}
      {diff.deleted.length > 0 && (
        <DiffSection
          title="Deleted"
          count={diff.deleted.length}
          icon={<Trash2 className="h-4 w-4 text-rose-600" />}
          isExpanded={expandedSections.deleted}
          onToggle={() => toggleSection('deleted')}
          variant="deleted"
        >
          {diff.deleted.map((entry) => (
            <DeletedCard key={entry.key} entry={entry} />
          ))}
        </DiffSection>
      )}

      {/* No changes message */}
      {hasNoChanges && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="py-12 text-center">
            <div className="text-slate-400 mb-2">
              <ChevronRight className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-slate-600 font-medium">
              No differences found between branches.
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Both branches contain identical translations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  variant: 'added' | 'modified' | 'deleted' | 'conflict';
  children: React.ReactNode;
}

function DiffSection({
  title,
  count,
  icon,
  isExpanded,
  onToggle,
  variant,
  children,
}: DiffSectionProps) {
  const variantStyles = {
    added: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50/50',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    modified: {
      card: 'border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/50',
      badge: 'bg-violet-100 text-violet-700 border-violet-200',
    },
    deleted: {
      card: 'border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/50',
      badge: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    conflict: {
      card: 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50',
      badge: 'bg-amber-100 text-amber-700 border-amber-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={styles.card}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/50 transition-colors py-4 touch-manipulation min-h-[44px]">
            <CardTitle className="flex items-center gap-3 text-base md:text-lg font-semibold">
              <span className="transition-transform duration-200 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </span>
              <span className="shrink-0">{icon}</span>
              <span className="truncate">{title}</span>
              <Badge variant="outline" className={`${styles.badge} shrink-0`}>
                {count}
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0 px-3 md:px-6">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AddedCard({ entry }: { entry: DiffEntry }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-3 md:p-4 shadow-sm transition-shadow hover:shadow-md touch-manipulation">
      <div className="font-mono text-sm font-semibold text-emerald-700 flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="break-all">{entry.key}</span>
      </div>
      <div className="mt-3 space-y-2">
        {Object.entries(entry.translations).map(([lang, value]) => (
          <div key={lang} className="flex items-start gap-2 text-sm">
            <Badge
              variant="outline"
              className="font-mono text-xs shrink-0 bg-slate-50"
            >
              {lang}
            </Badge>
            <span className="text-emerald-600 whitespace-pre-wrap break-words">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModifiedCard({ entry }: { entry: ModifiedEntry }) {
  const isMobile = useIsMobile();

  return (
    <div className="rounded-lg border border-violet-200 bg-white p-3 md:p-4 shadow-sm transition-shadow hover:shadow-md touch-manipulation">
      <div className="font-mono text-sm font-semibold text-violet-700 flex items-center gap-2 mb-3">
        <Pencil className="h-3.5 w-3.5 shrink-0" />
        <span className="break-all">{entry.key}</span>
      </div>

      {/* Mobile: Stacked layout, Desktop: Side-by-side */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        {/* Source section */}
        <div className="rounded-md bg-gradient-to-br from-violet-50 to-indigo-50 p-3 border-l-4 border-violet-400">
          <div className="text-xs font-medium text-violet-600 mb-2 uppercase tracking-wide flex items-center gap-2">
            {isMobile && <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />}
            Source (New)
          </div>
          <div className="space-y-2">
            {Object.entries(entry.source).map(([lang, value]) => (
              <div key={lang} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0"
                >
                  {lang}
                </Badge>
                <span className="text-violet-700 whitespace-pre-wrap break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target section */}
        <div className="rounded-md bg-slate-50 p-3 border-l-4 border-slate-300">
          <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-2">
            {isMobile && <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />}
            Target (Current)
          </div>
          <div className="space-y-2">
            {Object.entries(entry.target).map(([lang, value]) => (
              <div key={lang} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0"
                >
                  {lang}
                </Badge>
                <span className="text-slate-600 whitespace-pre-wrap break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeletedCard({ entry }: { entry: DiffEntry }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-white p-3 md:p-4 shadow-sm transition-shadow hover:shadow-md opacity-75 touch-manipulation">
      <div className="font-mono text-sm font-semibold text-rose-700 flex items-center gap-2 line-through">
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
        <span className="break-all">{entry.key}</span>
      </div>
      <div className="mt-3 space-y-2">
        {Object.entries(entry.translations).map(([lang, value]) => (
          <div key={lang} className="flex items-start gap-2 text-sm">
            <Badge
              variant="outline"
              className="font-mono text-xs shrink-0 opacity-60"
            >
              {lang}
            </Badge>
            <span className="text-rose-400 line-through whitespace-pre-wrap break-words">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictCard({
  conflict,
  onSelect,
}: {
  conflict: ConflictEntry;
  onSelect: () => void;
}) {
  const isMobile = useIsMobile();

  return (
    <div
      className="rounded-lg border-2 border-amber-400 bg-white p-3 md:p-4 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:border-amber-500 active:scale-[0.99] md:hover:scale-[1.01] touch-manipulation min-h-[44px]"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="font-mono text-sm font-semibold text-amber-700 flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="break-all">{conflict.key}</span>
      </div>

      {/* Mobile: Stacked layout, Desktop: Side-by-side */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
        {/* Source section */}
        <div className="rounded-md bg-gradient-to-br from-amber-50 to-orange-50 p-3 border border-amber-200 border-l-4 border-l-amber-400">
          <div className="text-xs font-medium text-amber-600 mb-2 uppercase tracking-wide flex items-center gap-2">
            {isMobile && <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />}
            Source (Incoming)
          </div>
          <div className="space-y-2">
            {Object.entries(conflict.source).map(([lang, value]) => (
              <div key={lang} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0 border-amber-300"
                >
                  {lang}
                </Badge>
                <span className="text-amber-700 whitespace-pre-wrap break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target section */}
        <div className="rounded-md bg-slate-50 p-3 border border-slate-200 border-l-4 border-l-slate-300">
          <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-2">
            {isMobile && <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />}
            Target (Current)
          </div>
          <div className="space-y-2">
            {Object.entries(conflict.target).map(([lang, value]) => (
              <div key={lang} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="outline"
                  className="font-mono text-xs shrink-0"
                >
                  {lang}
                </Badge>
                <span className="text-slate-600 whitespace-pre-wrap break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Touch-friendly action hint */}
      <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 min-h-[32px]">
          {isMobile ? 'Tap to resolve' : 'Click to resolve this conflict'}
        </span>
      </div>
    </div>
  );
}
