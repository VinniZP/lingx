'use client';

import { useTranslation } from '@localeflow/sdk-nextjs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Plus, Upload, Download, FileText } from 'lucide-react';

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
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/10 flex items-center justify-center shadow-sm">
          <BookOpen className="size-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t('glossary.terminology.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('glossary.terminology.description')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="size-4" />
              {t('glossary.terminology.export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCsv}>
              <FileText className="size-4 mr-2" />
              {t('glossary.terminology.exportAsCsv')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportTbx}>
              <FileText className="size-4 mr-2" />
              {t('glossary.terminology.exportAsTbx')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={onImport}>
          <Upload className="size-4" />
          {t('glossary.terminology.import')}
        </Button>
        <Button size="sm" className="h-9 gap-2" onClick={onAddTerm}>
          <Plus className="size-4" />
          {t('glossary.terminology.addTerm')}
        </Button>
      </div>
    </div>
  );
}
