'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Edit2, ArrowRight, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@localeflow/sdk-nextjs';
import type { ConflictEntry } from '@localeflow/shared';
import type { Resolution } from '@/lib/api';

interface ConflictResolverProps {
  conflicts: ConflictEntry[];
  resolutions: Map<string, Resolution>;
  onResolve: (key: string, resolution: Resolution) => void;
  onClearResolution: (key: string) => void;
}

export function ConflictResolver({
  conflicts,
  resolutions,
  onResolve,
  onClearResolution,
}: ConflictResolverProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeConflict, setActiveConflict] = useState<string | null>(
    conflicts[0]?.key || null
  );
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const currentConflict = conflicts.find((c) => c.key === activeConflict);
  const currentIndex = conflicts.findIndex((c) => c.key === activeConflict);

  const handleResolveSource = (key: string) => {
    onResolve(key, { key, resolution: 'source' });
  };

  const handleResolveTarget = (key: string) => {
    onResolve(key, { key, resolution: 'target' });
  };

  const handleResolveCustom = (key: string, values: Record<string, string>) => {
    onResolve(key, { key, resolution: values });
  };

  const initCustomValues = (conflict: ConflictEntry) => {
    // Initialize with source values as starting point
    const values: Record<string, string> = {};
    for (const [lang, value] of Object.entries(conflict.source)) {
      values[lang] = value;
    }
    setCustomValues(values);
  };

  // Mobile navigation helpers
  const goToPrevConflict = () => {
    if (currentIndex > 0) {
      setActiveConflict(conflicts[currentIndex - 1].key);
    }
  };

  const goToNextConflict = () => {
    if (currentIndex < conflicts.length - 1) {
      setActiveConflict(conflicts[currentIndex + 1].key);
    }
  };

  const resolvedCount = resolutions.size;
  const totalCount = conflicts.length;
  const progressPercent = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

  // Mobile layout: stacked with navigation
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">
              {t('branch.conflictResolver.conflictsToResolve')}
            </h3>
            <span className="text-sm font-medium text-slate-600">
              {resolvedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Mobile conflict navigation */}
        {currentConflict && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 touch-manipulation"
              onClick={goToPrevConflict}
              disabled={currentIndex === 0}
              aria-label={t('branch.conflictResolver.previousConflict')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <span className="text-sm text-slate-600">
                {t('branch.conflictResolver.conflictOf', { current: currentIndex + 1, total: totalCount })}
              </span>
              <div className="font-mono text-sm font-semibold text-amber-700 truncate">
                {currentConflict.key}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 touch-manipulation"
              onClick={goToNextConflict}
              disabled={currentIndex === conflicts.length - 1}
              aria-label={t('branch.conflictResolver.nextConflict')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Resolution panel (mobile) */}
        {currentConflict && (
          <Card className="border-2 border-slate-200 touch-manipulation">
            <CardHeader className="pb-3 px-4">
              <CardTitle className="font-mono text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="truncate">{currentConflict.key}</span>
                {resolutions.has(currentConflict.key) && (
                  <Badge className="bg-emerald-500 text-white shrink-0 ml-auto">
                    {t('branch.conflictResolver.resolved')}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Tabs defaultValue="compare" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="compare" className="gap-2 h-full touch-manipulation">
                    <ArrowRight className="h-4 w-4" />
                    {t('branch.conflictResolver.compare')}
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2 h-full touch-manipulation">
                    <Edit2 className="h-4 w-4" />
                    {t('branch.conflictResolver.custom')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="compare" className="space-y-4">
                  {/* Source section (mobile - stacked) */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all touch-manipulation ${
                      resolutions.get(currentConflict.key)?.resolution ===
                      'source'
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-amber-700">
                        {t('branch.conflictResolver.sourceIncoming')}
                      </h4>
                    </div>
                    <div className="space-y-3 mb-4">
                      {Object.entries(currentConflict.source).map(
                        ([lang, value]) => (
                          <div key={lang}>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs mb-1.5 border-amber-300"
                            >
                              {lang}
                            </Badge>
                            <div className="bg-white/80 p-2.5 rounded-md text-sm border border-amber-200 whitespace-pre-wrap break-words">
                              {value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <Button
                      variant={
                        resolutions.get(currentConflict.key)?.resolution ===
                        'source'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleResolveSource(currentConflict.key)}
                      className={`w-full h-11 touch-manipulation ${
                        resolutions.get(currentConflict.key)?.resolution ===
                        'source'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : ''
                      }`}
                    >
                      {resolutions.get(currentConflict.key)?.resolution ===
                      'source' ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('branch.conflictResolver.selected')}
                        </>
                      ) : (
                        t('branch.conflictResolver.useSource')
                      )}
                    </Button>
                  </div>

                  {/* Target section (mobile - stacked) */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all touch-manipulation ${
                      resolutions.get(currentConflict.key)?.resolution ===
                      'target'
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-slate-600">
                        {t('branch.conflictResolver.targetCurrent')}
                      </h4>
                    </div>
                    <div className="space-y-3 mb-4">
                      {Object.entries(currentConflict.target).map(
                        ([lang, value]) => (
                          <div key={lang}>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs mb-1.5"
                            >
                              {lang}
                            </Badge>
                            <div className="bg-white p-2.5 rounded-md text-sm border border-slate-200 whitespace-pre-wrap break-words">
                              {value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <Button
                      variant={
                        resolutions.get(currentConflict.key)?.resolution ===
                        'target'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleResolveTarget(currentConflict.key)}
                      className={`w-full h-11 touch-manipulation ${
                        resolutions.get(currentConflict.key)?.resolution ===
                        'target'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : ''
                      }`}
                    >
                      {resolutions.get(currentConflict.key)?.resolution ===
                      'target' ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('branch.conflictResolver.selected')}
                        </>
                      ) : (
                        t('branch.conflictResolver.keepTarget')
                      )}
                    </Button>
                  </div>

                  {/* Clear resolution button */}
                  {resolutions.has(currentConflict.key) && (
                    <Button
                      variant="ghost"
                      onClick={() => onClearResolution(currentConflict.key)}
                      className="w-full h-11 text-slate-500 hover:text-slate-700 touch-manipulation"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('branch.conflictResolver.clearResolution')}
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {t('branch.conflictResolver.customDescription')}
                  </p>

                  {!Object.keys(customValues).length ? (
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        onClick={() => initCustomValues(currentConflict)}
                        className="w-full h-11 touch-manipulation"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        {t('branch.conflictResolver.startWithSource')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const values: Record<string, string> = {};
                          for (const lang of Object.keys(currentConflict.target)) {
                            values[lang] = currentConflict.target[lang];
                          }
                          setCustomValues(values);
                        }}
                        className="w-full h-11 touch-manipulation"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        {t('branch.conflictResolver.startWithTarget')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {Object.entries(currentConflict.source).map(([lang]) => (
                          <div key={lang}>
                            <Label
                              htmlFor={`custom-${lang}`}
                              className="font-mono text-sm"
                            >
                              {lang}
                            </Label>
                            <Input
                              id={`custom-${lang}`}
                              value={customValues[lang] || ''}
                              onChange={(e) =>
                                setCustomValues((prev) => ({
                                  ...prev,
                                  [lang]: e.target.value,
                                }))
                              }
                              className="mt-1.5 font-mono h-11"
                              placeholder={t('branch.conflictResolver.enterTranslation', { lang })}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <Button
                          onClick={() =>
                            handleResolveCustom(currentConflict.key, customValues)
                          }
                          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 touch-manipulation"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {t('branch.conflictResolver.applyCustomValues')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCustomValues({})}
                          className="w-full h-11 touch-manipulation"
                        >
                          {t('branch.conflictResolver.reset')}
                        </Button>
                      </div>
                    </>
                  )}

                  {typeof resolutions.get(currentConflict.key)?.resolution ===
                    'object' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                        <Check className="h-4 w-4" />
                        {t('branch.conflictResolver.customResolutionApplied')}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!currentConflict && conflicts.length === 0 && (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="py-12 text-center">
              <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">
                {t('branch.conflictResolver.noConflicts')}
              </h3>
              <p className="text-slate-500 mt-1">
                {t('branch.conflictResolver.noConflictsDescription')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop layout: side-by-side
  return (
    <div className="flex gap-6">
      {/* Conflict list sidebar */}
      <div className="w-72 shrink-0">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            {t('branch.conflictResolver.conflictsToResolve')}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-600">
              {resolvedCount}/{totalCount}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {conflicts.map((conflict) => {
            const resolved = resolutions.has(conflict.key);
            const isActive = activeConflict === conflict.key;

            return (
              <button
                key={conflict.key}
                onClick={() => setActiveConflict(conflict.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-mono transition-all touch-manipulation min-h-[44px] ${
                  isActive
                    ? 'bg-amber-100 border-2 border-amber-400 shadow-sm'
                    : 'hover:bg-slate-100 border-2 border-transparent'
                } ${resolved ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate flex-1">{conflict.key}</span>
                  {resolved ? (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  ) : (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resolution panel */}
      {currentConflict && (
        <Card className="flex-1 border-2 border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {currentConflict.key}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="compare" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compare" className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t('branch.conflictResolver.compare')}
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  {t('branch.conflictResolver.customEdit')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="compare" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Source column */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all ${
                      resolutions.get(currentConflict.key)?.resolution ===
                      'source'
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm text-amber-700">
                        {t('branch.conflictResolver.sourceIncoming')}
                      </h4>
                      <Button
                        size="sm"
                        variant={
                          resolutions.get(currentConflict.key)?.resolution ===
                          'source'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => handleResolveSource(currentConflict.key)}
                        className={
                          resolutions.get(currentConflict.key)?.resolution ===
                          'source'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : ''
                        }
                      >
                        {resolutions.get(currentConflict.key)?.resolution ===
                        'source' ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {t('branch.conflictResolver.selected')}
                          </>
                        ) : (
                          t('branch.conflictResolver.useSource')
                        )}
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(currentConflict.source).map(
                        ([lang, value]) => (
                          <div key={lang}>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs mb-1.5 border-amber-300"
                            >
                              {lang}
                            </Badge>
                            <div className="bg-white/80 p-2.5 rounded-md text-sm border border-amber-200 whitespace-pre-wrap break-words">
                              {value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Target column */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all ${
                      resolutions.get(currentConflict.key)?.resolution ===
                      'target'
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm text-slate-600">
                        {t('branch.conflictResolver.targetCurrent')}
                      </h4>
                      <Button
                        size="sm"
                        variant={
                          resolutions.get(currentConflict.key)?.resolution ===
                          'target'
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => handleResolveTarget(currentConflict.key)}
                        className={
                          resolutions.get(currentConflict.key)?.resolution ===
                          'target'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : ''
                        }
                      >
                        {resolutions.get(currentConflict.key)?.resolution ===
                        'target' ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            {t('branch.conflictResolver.selected')}
                          </>
                        ) : (
                          t('branch.conflictResolver.keepTarget')
                        )}
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(currentConflict.target).map(
                        ([lang, value]) => (
                          <div key={lang}>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs mb-1.5"
                            >
                              {lang}
                            </Badge>
                            <div className="bg-white p-2.5 rounded-md text-sm border border-slate-200 whitespace-pre-wrap break-words">
                              {value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Clear resolution button */}
                {resolutions.has(currentConflict.key) && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearResolution(currentConflict.key)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('branch.conflictResolver.clearResolution')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {t('branch.conflictResolver.customDescriptionDesktop')}
                </p>

                {!Object.keys(customValues).length ? (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => initCustomValues(currentConflict)}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t('branch.conflictResolver.startWithSource')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const values: Record<string, string> = {};
                        for (const lang of Object.keys(currentConflict.target)) {
                          values[lang] = currentConflict.target[lang];
                        }
                        setCustomValues(values);
                      }}
                      className="flex-1"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t('branch.conflictResolver.startWithTarget')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {Object.entries(currentConflict.source).map(([lang]) => (
                        <div key={lang}>
                          <Label
                            htmlFor={`custom-${lang}`}
                            className="font-mono text-sm"
                          >
                            {lang}
                          </Label>
                          <Input
                            id={`custom-${lang}`}
                            value={customValues[lang] || ''}
                            onChange={(e) =>
                              setCustomValues((prev) => ({
                                ...prev,
                                [lang]: e.target.value,
                              }))
                            }
                            className="mt-1.5 font-mono"
                            placeholder={t('branch.conflictResolver.enterTranslation', { lang })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          handleResolveCustom(currentConflict.key, customValues)
                        }
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t('branch.conflictResolver.applyCustomValues')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCustomValues({})}
                      >
                        {t('branch.conflictResolver.reset')}
                      </Button>
                    </div>
                  </>
                )}

                {typeof resolutions.get(currentConflict.key)?.resolution ===
                  'object' && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                      <Check className="h-4 w-4" />
                      {t('branch.conflictResolver.customResolutionApplied')}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!currentConflict && conflicts.length === 0 && (
        <Card className="flex-1 border-2 border-dashed border-slate-200">
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">
              {t('branch.conflictResolver.noConflicts')}
            </h3>
            <p className="text-slate-500 mt-1">
              {t('branch.conflictResolver.noConflictsDescription')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
