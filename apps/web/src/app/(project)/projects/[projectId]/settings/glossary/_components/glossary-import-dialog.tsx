'use client';

import { useRef, useState } from 'react';
import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  FileCode,
  RefreshCw,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlossaryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isImporting: boolean;
  onImport: (file: File, format: 'csv' | 'tbx', overwrite: boolean) => Promise<void>;
}

export function GlossaryImportDialog({
  open,
  onOpenChange,
  isImporting,
  onImport,
}: GlossaryImportDialogProps) {
  const { t } = useTranslation('glossary');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFormat, setImportFormat] = useState<'csv' | 'tbx'>('csv');
  const [importOverwrite, setImportOverwrite] = useState(false);

  const handleFileSelect = async (file: File) => {
    await onImport(file, importFormat, importOverwrite);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {/* Premium Header */}
        <div className="relative px-7 pt-7 pb-5 border-b border-border/40 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent">
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-emerald-500/[0.03] to-transparent rounded-tr-full" />

          <div className="relative flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm">
              <Upload className="size-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {t('import.title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t('import.description')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-7 py-6 space-y-5">
          {/* Format Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="size-1.5 rounded-full bg-emerald-500" />
              {t('import.fileFormat')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportFormat('csv')}
                className={cn(
                  "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  importFormat === 'csv'
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                )}
              >
                {importFormat === 'csv' && (
                  <div className="absolute top-3 right-3 size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center",
                  importFormat === 'csv'
                    ? "bg-emerald-500/15"
                    : "bg-muted/60"
                )}>
                  <FileText className={cn(
                    "size-5",
                    importFormat === 'csv' ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className={cn(
                    "font-semibold text-sm",
                    importFormat === 'csv' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  )}>
                    CSV
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t('import.csvDescription')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportFormat('tbx')}
                className={cn(
                  "relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  importFormat === 'tbx'
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                )}
              >
                {importFormat === 'tbx' && (
                  <div className="absolute top-3 right-3 size-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center",
                  importFormat === 'tbx'
                    ? "bg-emerald-500/15"
                    : "bg-muted/60"
                )}>
                  <FileCode className={cn(
                    "size-5",
                    importFormat === 'tbx' ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <div className={cn(
                    "font-semibold text-sm",
                    importFormat === 'tbx' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  )}>
                    TBX
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t('import.tbxDescription')}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="size-1.5 rounded-full bg-amber-500" />
              {t('import.options')}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <RefreshCw className="size-4 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-sm font-medium cursor-pointer">
                    {t('import.overwriteExisting')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('import.overwriteDescription')}
                  </p>
                </div>
              </div>
              <Switch checked={importOverwrite} onCheckedChange={setImportOverwrite} />
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={cn(
              "relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
              "border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]",
              "cursor-pointer group"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="size-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mx-auto mb-4 group-hover:from-emerald-500/15 group-hover:to-emerald-500/5 transition-colors">
              <Upload className="size-6 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
            <p className="text-sm font-medium mb-1">
              {t('import.clickToSelect')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('import.dragAndDrop', { format: importFormat === 'csv' ? '.csv' : '.tbx' })}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={importFormat === 'csv' ? '.csv' : '.tbx'}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </div>

        {/* Premium Footer */}
        <div className="px-7 py-5 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="size-3.5" />
            {t('import.accepts', { format: importFormat === 'csv' ? 'CSV' : 'TBX' })}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="h-10 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isImporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t('import.selectFile')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
