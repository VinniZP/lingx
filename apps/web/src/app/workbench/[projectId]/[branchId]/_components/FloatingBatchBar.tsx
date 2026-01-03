'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckSquare,
  Check,
  X,
  Trash2,
  Wand2,
  Sparkles,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface FloatingBatchBarProps {
  selectedCount: number;
  isApproving: boolean;
  isDeleting: boolean;
  isTranslating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onTranslate: (provider: 'MT' | 'AI') => void;
  onEvaluateQuality: () => void;
  onClear: () => void;
  hasMT: boolean;
  hasAI: boolean;
}

export function FloatingBatchBar({
  selectedCount,
  isApproving,
  isDeleting,
  isTranslating,
  onApprove,
  onReject,
  onDelete,
  onTranslate,
  onEvaluateQuality,
  onClear,
  hasMT,
  hasAI,
}: FloatingBatchBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl ring-1 ring-white/10">
        {/* Selection indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <CheckSquare className="size-4 text-primary" />
          <span className="text-sm font-medium tabular-nums">
            {selectedCount} selected
          </span>
        </div>

        {/* Translate dropdown */}
        {(hasMT || hasAI) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isTranslating}>
                {isTranslating ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Wand2 className="size-4 mr-1.5" />
                )}
                Translate
                <ChevronDown className="size-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {hasMT && (
                <DropdownMenuItem onClick={() => onTranslate('MT')}>
                  <Wand2 className="size-4 mr-2" />
                  Machine Translate
                </DropdownMenuItem>
              )}
              {hasAI && (
                <DropdownMenuItem onClick={() => onTranslate('AI')}>
                  <Sparkles className="size-4 mr-2" />
                  AI Translate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Quality */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEvaluateQuality}
          className="text-primary hover:text-primary"
        >
          <Sparkles className="size-4 mr-1.5" />
          Quality
        </Button>

        {/* Approve */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onApprove}
          disabled={isApproving}
          className="text-success hover:text-success"
        >
          {isApproving ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Check className="size-4 mr-1.5" />
          )}
          Approve
        </Button>

        {/* Reject */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          disabled={isApproving}
          className="text-destructive hover:text-destructive"
        >
          <X className="size-4 mr-1.5" />
          Reject
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <Trash2 className="size-4 mr-1.5" />
          )}
          Delete
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Clear */}
        <Button variant="ghost" size="icon" className="size-8" onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
