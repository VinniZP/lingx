'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@lingx/sdk-nextjs';
import { BookOpen, Download, FileText, Plus, Upload } from 'lucide-react';

interface GlossaryTerminologyHeaderProps {
  onExportCsv: () => void;
  onExportTbx: () => void;
  onImport: () => void;
  onAddTerm: () => void;
}

export function GlossaryTerminologyHeader({
  onExportCsv,
  onExportTbx,
  onImport,
  onAddTerm,
}: GlossaryTerminologyHeaderProps) {
  const { t } = useTranslation('glossary');

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-500/10 bg-linear-to-br from-emerald-500/20 via-emerald-500/10 to-transparent shadow-sm">
          <BookOpen className="size-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('terminology.title')}</h2>
          <p className="text-muted-foreground text-sm">{t('terminology.description')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="size-4" />
              {t('terminology.export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCsv}>
              <FileText className="mr-2 size-4" />
              {t('terminology.exportAsCsv')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportTbx}>
              <FileText className="mr-2 size-4" />
              {t('terminology.exportAsTbx')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={onImport}>
          <Upload className="size-4" />
          {t('terminology.import')}
        </Button>
        <Button size="sm" className="h-9 gap-2" onClick={onAddTerm}>
          <Plus className="size-4" />
          {t('terminology.addTerm')}
        </Button>
      </div>
    </div>
  );
}
