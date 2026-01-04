'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, CheckSquare, ChevronDown, Loader2, Sparkles, Trash2, Wand2, X } from 'lucide-react';

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
    <div
      className="animate-fade-in-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      role="toolbar"
      aria-label={`Batch actions for ${selectedCount} selected translations`}
    >
      <div className="bg-card/90 border-border/50 flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
        {/* Selection indicator */}
        <div className="border-border flex items-center gap-2 border-r pr-3">
          <CheckSquare className="text-primary size-4" />
          <span className="text-sm font-medium tabular-nums">{selectedCount} selected</span>
        </div>

        {/* Translate dropdown */}
        {(hasMT || hasAI) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isTranslating}
                aria-label={`Translate ${selectedCount} selected translations`}
              >
                {isTranslating ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 size-4" />
                )}
                Translate
                <ChevronDown className="ml-1 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {hasMT && (
                <DropdownMenuItem onClick={() => onTranslate('MT')}>
                  <Wand2 className="mr-2 size-4" />
                  Machine Translate
                </DropdownMenuItem>
              )}
              {hasAI && (
                <DropdownMenuItem onClick={() => onTranslate('AI')}>
                  <Sparkles className="mr-2 size-4" />
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
          aria-label={`Evaluate quality for ${selectedCount} selected translations`}
        >
          <Sparkles className="mr-1.5 size-4" />
          Quality
        </Button>

        {/* Approve */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onApprove}
          disabled={isApproving}
          className="text-success hover:text-success"
          aria-label={`Approve ${selectedCount} selected translations`}
        >
          {isApproving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Check className="mr-1.5 size-4" />
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
          aria-label={`Reject ${selectedCount} selected translations`}
        >
          <X className="mr-1.5 size-4" />
          Reject
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${selectedCount} selected translation keys`}
        >
          {isDeleting ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 size-4" />
          )}
          Delete
        </Button>

        <div className="bg-border h-5 w-px" aria-hidden="true" />

        {/* Clear */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
