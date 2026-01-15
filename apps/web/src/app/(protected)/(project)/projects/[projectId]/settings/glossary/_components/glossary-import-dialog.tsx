'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Check, FileCode, FileText, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        {/* Premium Header */}
        <div className="border-border/40 relative border-b bg-linear-to-br from-emerald-500/[0.04] via-transparent to-transparent px-7 pt-7 pb-5">
          <div className="absolute top-0 right-0 h-28 w-28 rounded-bl-full bg-gradient-to-bl from-emerald-500/[0.06] to-transparent" />
          <div className="absolute bottom-0 left-0 h-16 w-16 rounded-tr-full bg-gradient-to-tr from-emerald-500/[0.03] to-transparent" />

          <div className="relative flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/20 via-emerald-500/10 to-transparent shadow-sm">
              <Upload className="size-5 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {t('import.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 text-sm">
                {t('import.description')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-7 py-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <div className="size-1.5 rounded-full bg-emerald-500" />
              {t('import.fileFormat')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportFormat('csv')}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  importFormat === 'csv'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border/60 hover:border-border hover:bg-muted/30'
                )}
              >
                {importFormat === 'csv' && (
                  <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl',
                    importFormat === 'csv' ? 'bg-emerald-500/15' : 'bg-muted/60'
                  )}
                >
                  <FileText
                    className={cn(
                      'size-5',
                      importFormat === 'csv' ? 'text-emerald-500' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      importFormat === 'csv'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                    )}
                  >
                    CSV
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {t('import.csvDescription')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportFormat('tbx')}
                className={cn(
                  'relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200',
                  importFormat === 'tbx'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-border/60 hover:border-border hover:bg-muted/30'
                )}
              >
                {importFormat === 'tbx' && (
                  <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="size-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl',
                    importFormat === 'tbx' ? 'bg-emerald-500/15' : 'bg-muted/60'
                  )}
                >
                  <FileCode
                    className={cn(
                      'size-5',
                      importFormat === 'tbx' ? 'text-emerald-500' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      importFormat === 'tbx'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                    )}
                  >
                    TBX
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {t('import.tbxDescription')}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <div className="size-1.5 rounded-full bg-amber-500" />
              {t('import.options')}
            </div>

            <div className="border-border/50 from-muted/40 via-muted/20 flex items-center justify-between rounded-xl border bg-linear-to-r to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15">
                  <RefreshCw className="size-4 text-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <label className="cursor-pointer text-sm font-medium">
                    {t('import.overwriteExisting')}
                  </label>
                  <p className="text-muted-foreground text-xs">
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
              'relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200',
              'border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02]',
              'group cursor-pointer'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="from-muted/80 to-muted/40 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br transition-colors group-hover:from-emerald-500/15 group-hover:to-emerald-500/5">
              <Upload className="text-muted-foreground size-6 transition-colors group-hover:text-emerald-500" />
            </div>
            <p className="mb-1 text-sm font-medium">{t('import.clickToSelect')}</p>
            <p className="text-muted-foreground text-xs">
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
        <div className="border-border/40 bg-muted/20 flex items-center justify-between border-t px-7 py-5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
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
              className="h-10 gap-2 bg-emerald-600 px-5 hover:bg-emerald-700"
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
