'use client';

import type { TranslationKey } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BookOpen, GripHorizontal, Link2, Sparkles, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AISuggestionsTab } from './AISuggestionsTab';
import { GlossaryTab } from './GlossaryTab';
import { RelatedKeysTab } from './RelatedKeysTab';
import { TMMatchesTab } from './TMMatchesTab';

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
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = startY.current - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.current + deltaY));
      setHeight(newHeight);
    },
    [isResizing]
  );

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
    return count + suggestions.filter((s) => s.type === 'tm').length;
  }, 0);

  return (
    <div
      ref={containerRef}
      className="border-border from-muted/30 border-t bg-gradient-to-t to-transparent"
    >
      {/* Resize Handle */}
      <div
        className={cn(
          'group flex h-2 cursor-ns-resize items-center justify-center',
          'hover:bg-primary/10 transition-colors',
          isResizing && 'bg-primary/10'
        )}
        onMouseDown={handleResizeStart}
      >
        <GripHorizontal
          className={cn(
            'text-muted-foreground/50 group-hover:text-primary/70 size-4 transition-colors',
            isResizing && 'text-primary/70'
          )}
        />
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
                'flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'text-foreground bg-card border-border border border-b-0 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className={cn('size-4', isActive ? 'text-primary' : 'opacity-60')} />
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-card border-border -mt-px overflow-y-auto border-t p-4" style={{ height }}>
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
        {activeTab === 'related' && <RelatedKeysTab keyData={keyData} branchId={branchId} />}
      </div>
    </div>
  );
}
