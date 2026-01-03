'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, Type, Sparkles, Link2, GripHorizontal } from 'lucide-react';
import type { TranslationKey } from '@/lib/api';
import { TMMatchesTab } from './TMMatchesTab';
import { GlossaryTab } from './GlossaryTab';
import { AISuggestionsTab } from './AISuggestionsTab';
import { RelatedKeysTab } from './RelatedKeysTab';

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 180;

interface UnifiedSuggestion {
  id: string;
  type: 'tm' | 'mt' | 'ai';
  text: string;
  confidence: number;
  source?: string;
  provider?: string;
}

type TabId = 'tm' | 'glossary' | 'ai' | 'related';

interface TabConfig {
  id: TabId;
  label: string;
  icon: typeof BookOpen;
}

const tabs: TabConfig[] = [
  { id: 'tm', label: 'TM Matches', icon: BookOpen },
  { id: 'glossary', label: 'Glossary', icon: Type },
  { id: 'ai', label: 'AI Suggestions', icon: Sparkles },
  { id: 'related', label: 'Related Keys', icon: Link2 },
];

interface BottomDockProps {
  keyData: TranslationKey;
  projectId: string;
  branchId: string;
  sourceLanguage?: string;
  sourceText: string;
  targetLanguages: string[];
  getSuggestions: (keyId: string) => Map<string, UnifiedSuggestion[]>;
  onApplyGlossaryMatch?: (targetLang: string, text: string, matchId: string) => void;
}

export function BottomDock({
  keyData,
  projectId,
  branchId,
  sourceLanguage,
  sourceText,
  targetLanguages,
  getSuggestions,
  onApplyGlossaryMatch,
}: BottomDockProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tm');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = startY.current - e.clientY;
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.current + deltaY));
    setHeight(newHeight);
  }, [isResizing]);

  // Handle mouse up to stop resize
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Start resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    startY.current = e.clientY;
    startHeight.current = height;
    setIsResizing(true);
  };

  // Get TM suggestions count
  const suggestionsMap = getSuggestions(keyData.id);
  const tmCount = targetLanguages.reduce((count, lang) => {
    const suggestions = suggestionsMap.get(lang) || [];
    return count + suggestions.filter(s => s.type === 'tm').length;
  }, 0);

  return (
    <div ref={containerRef} className="border-t border-border bg-gradient-to-t from-muted/30 to-transparent">
      {/* Resize Handle */}
      <div
        className={cn(
          'flex items-center justify-center h-2 cursor-ns-resize group',
          'hover:bg-primary/10 transition-colors',
          isResizing && 'bg-primary/10'
        )}
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal className={cn(
          'size-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors',
          isResizing && 'text-primary/70'
        )} />
      </div>

      {/* Tab Strip */}
      <div className="flex gap-1 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tab.id === 'tm' ? tmCount : 0;

          return (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-t-lg',
                isActive
                  ? 'text-foreground bg-card border border-b-0 border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className={cn('size-4', isActive ? 'text-primary' : 'opacity-60')} />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div
        className="overflow-y-auto p-4 bg-card border-t border-border -mt-px"
        style={{ height }}
      >
        {activeTab === 'tm' && (
          <TMMatchesTab
            keyId={keyData.id}
            targetLanguages={targetLanguages}
            getSuggestions={getSuggestions}
          />
        )}
        {activeTab === 'glossary' && sourceLanguage && (
          <GlossaryTab
            projectId={projectId}
            sourceText={sourceText}
            sourceLanguage={sourceLanguage}
            targetLanguages={targetLanguages}
            onApplyMatch={onApplyGlossaryMatch ?? (() => {})}
          />
        )}
        {activeTab === 'ai' && (
          <AISuggestionsTab
            keyId={keyData.id}
            targetLanguages={targetLanguages}
            getSuggestions={getSuggestions}
          />
        )}
        {activeTab === 'related' && (
          <RelatedKeysTab keyData={keyData} branchId={branchId} />
        )}
      </div>
    </div>
  );
}
