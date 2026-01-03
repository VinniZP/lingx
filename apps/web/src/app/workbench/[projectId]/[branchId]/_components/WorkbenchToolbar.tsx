'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowLeft, GitBranch, Key, Languages, Plus, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { type FilterType, type QualityFilterType } from '../_hooks';

interface WorkbenchToolbarProps {
  projectId: string;
  branchName: string;
  completionPercent: number;
  totalKeys: number;
  languageCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
  qualityFilter: QualityFilterType;
  onQualityFilterChange: (value: QualityFilterType) => void;
  namespace: string;
  onNamespaceChange: (value: string) => void;
  namespaces: string[];
  onCreateKey: () => void;
  onEvaluateQuality: () => void;
}

export function WorkbenchToolbar({
  projectId,
  branchName,
  completionPercent,
  totalKeys,
  languageCount,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  qualityFilter,
  onQualityFilterChange,
  namespace,
  onNamespaceChange,
  namespaces,
  onCreateKey,
  onEvaluateQuality,
}: WorkbenchToolbarProps) {
  return (
    <div className="border-border bg-card flex items-center gap-4 border-b px-4 py-3">
      {/* Back Button */}
      <Link href={`/projects/${projectId}`}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </Link>

      <div className="bg-border h-6 w-px" />

      {/* Branch Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <GitBranch className="text-muted-foreground size-4" />
          <span className="font-medium">{branchName}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'font-mono tabular-nums',
            completionPercent >= 80
              ? 'bg-success/10 text-success border-success/30'
              : completionPercent >= 50
                ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-muted'
          )}
        >
          {completionPercent}%
        </Badge>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Key className="size-3" />
          <span>{totalKeys}</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Languages className="size-3" />
          <span>{languageCount}</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-64 transition-all focus-within:w-80">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search keys..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {/* Filters */}
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="missing">Missing</SelectItem>
          <SelectItem value="complete">Complete</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="warnings">Warnings</SelectItem>
        </SelectContent>
      </Select>

      <Select value={qualityFilter} onValueChange={onQualityFilterChange}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Quality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Quality</SelectItem>
          <SelectItem value="excellent">Excellent (90+)</SelectItem>
          <SelectItem value="good">Good (70-89)</SelectItem>
          <SelectItem value="needsReview">Needs Review</SelectItem>
          <SelectItem value="unscored">Unscored</SelectItem>
        </SelectContent>
      </Select>

      {namespaces.length > 0 && (
        <Select
          value={namespace || 'all'}
          onValueChange={(v) => onNamespaceChange(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Namespace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All namespaces</SelectItem>
            {namespaces.map((ns) => (
              <SelectItem key={ns} value={ns}>
                {ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="bg-border h-6 w-px" />

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={onEvaluateQuality} className="gap-2">
        <Sparkles className="size-4" />
        Evaluate
      </Button>

      <Button size="sm" onClick={onCreateKey} className="gap-2">
        <Plus className="size-4" />
        Add Key
      </Button>
    </div>
  );
}
