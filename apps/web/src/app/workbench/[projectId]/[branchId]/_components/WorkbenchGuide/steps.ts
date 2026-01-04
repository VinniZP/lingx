import { tKey, type TKey } from '@lingx/sdk-nextjs';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  Bot,
  CheckCircle2,
  CheckSquare,
  Cpu,
  Edit3,
  Filter,
  Globe2,
  Keyboard,
  Languages,
  LayoutList,
  Lightbulb,
  List,
  MessageSquare,
  MousePointerClick,
  PanelBottom,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface ShortcutItem {
  keys: string[];
  descriptionKey: TKey;
  variant?: 'primary' | 'secondary';
}

export interface FeatureHighlight {
  icon: LucideIcon;
  titleKey: TKey;
  descriptionKey?: TKey;
}

export interface GuideStep {
  id: string;
  titleKey: TKey;
  descriptionKey: TKey;
  icon: LucideIcon;
  /** Background gradient colors for unique visual identity */
  gradient: {
    from: string;
    via?: string;
    to: string;
  };
  /** Accent color for highlights */
  accentColor: string;
  /** Feature highlights with icons */
  features: FeatureHighlight[];
  /** Keyboard shortcuts for this section */
  shortcuts?: ShortcutItem[];
  /** Pro tip text key */
  proTipKey?: TKey;
  /** Visual illustration type */
  illustration?: 'sidebar' | 'editor' | 'languages' | 'keyboard' | 'dock' | 'batch' | 'filters';
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'sidebar',
    titleKey: tKey('workbench.guide.steps.sidebar.title'),
    descriptionKey: tKey('workbench.guide.steps.sidebar.description'),
    icon: LayoutList,
    gradient: {
      from: 'from-violet-500/20',
      via: 'via-purple-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-violet-500',
    illustration: 'sidebar',
    features: [
      {
        icon: Search,
        titleKey: tKey('workbench.guide.steps.sidebar.features.browse'),
      },
      {
        icon: MousePointerClick,
        titleKey: tKey('workbench.guide.steps.sidebar.features.selection'),
      },
      {
        icon: Sparkles,
        titleKey: tKey('workbench.guide.steps.sidebar.features.statusDots'),
      },
      {
        icon: Zap,
        titleKey: tKey('workbench.guide.steps.sidebar.features.qualityMeter'),
      },
    ],
    shortcuts: [
      { keys: ['Ctrl', '↑'], descriptionKey: tKey('workbench.guide.shortcuts.prevKey') },
      { keys: ['Ctrl', '↓'], descriptionKey: tKey('workbench.guide.shortcuts.nextKey') },
    ],
    proTipKey: tKey('workbench.guide.steps.sidebar.proTip'),
  },
  {
    id: 'editor',
    titleKey: tKey('workbench.guide.steps.editor.title'),
    descriptionKey: tKey('workbench.guide.steps.editor.description'),
    icon: Edit3,
    gradient: {
      from: 'from-emerald-500/20',
      via: 'via-teal-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-emerald-500',
    illustration: 'editor',
    features: [
      {
        icon: Edit3,
        titleKey: tKey('workbench.guide.steps.editor.features.sourceEdit'),
      },
      {
        icon: Zap,
        titleKey: tKey('workbench.guide.steps.editor.features.autoSave'),
      },
      {
        icon: MessageSquare,
        titleKey: tKey('workbench.guide.steps.editor.features.icuSupport'),
      },
    ],
    shortcuts: [
      { keys: ['Tab'], descriptionKey: tKey('workbench.guide.shortcuts.nextField') },
      {
        keys: ['Shift', 'Tab'],
        descriptionKey: tKey('workbench.guide.shortcuts.prevField'),
        variant: 'secondary',
      },
    ],
    proTipKey: tKey('workbench.guide.steps.editor.proTip'),
  },
  {
    id: 'languages',
    titleKey: tKey('workbench.guide.steps.languages.title'),
    descriptionKey: tKey('workbench.guide.steps.languages.description'),
    icon: Globe2,
    gradient: {
      from: 'from-blue-500/20',
      via: 'via-cyan-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-blue-500',
    illustration: 'languages',
    features: [
      {
        icon: Languages,
        titleKey: tKey('workbench.guide.steps.languages.features.expand'),
      },
      {
        icon: Edit3,
        titleKey: tKey('workbench.guide.steps.languages.features.edit'),
      },
      {
        icon: CheckCircle2,
        titleKey: tKey('workbench.guide.steps.languages.features.status'),
      },
    ],
    proTipKey: tKey('workbench.guide.steps.languages.proTip'),
  },
  {
    id: 'shortcuts',
    titleKey: tKey('workbench.guide.steps.shortcuts.title'),
    descriptionKey: tKey('workbench.guide.steps.shortcuts.description'),
    icon: Keyboard,
    gradient: {
      from: 'from-amber-500/20',
      via: 'via-orange-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-amber-500',
    illustration: 'keyboard',
    features: [
      {
        icon: Cpu,
        titleKey: tKey('workbench.guide.steps.shortcuts.features.mtTranslate'),
      },
      {
        icon: Bot,
        titleKey: tKey('workbench.guide.steps.shortcuts.features.aiTranslate'),
      },
      {
        icon: CheckCircle2,
        titleKey: tKey('workbench.guide.steps.shortcuts.features.approve'),
      },
    ],
    shortcuts: [
      { keys: ['Ctrl', 'M'], descriptionKey: tKey('workbench.guide.shortcuts.machineTranslate') },
      { keys: ['Ctrl', 'I'], descriptionKey: tKey('workbench.guide.shortcuts.aiTranslate') },
      { keys: ['Ctrl', 'Enter'], descriptionKey: tKey('workbench.guide.shortcuts.approve') },
      {
        keys: ['Ctrl', 'Backspace'],
        descriptionKey: tKey('workbench.guide.shortcuts.reject'),
        variant: 'secondary',
      },
      {
        keys: ['Esc'],
        descriptionKey: tKey('workbench.guide.shortcuts.collapse'),
        variant: 'secondary',
      },
    ],
    proTipKey: tKey('workbench.guide.steps.shortcuts.proTip'),
  },
  {
    id: 'dock',
    titleKey: tKey('workbench.guide.steps.dock.title'),
    descriptionKey: tKey('workbench.guide.steps.dock.description'),
    icon: PanelBottom,
    gradient: {
      from: 'from-pink-500/20',
      via: 'via-rose-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-pink-500',
    illustration: 'dock',
    features: [
      {
        icon: List,
        titleKey: tKey('workbench.guide.steps.dock.features.tm'),
        descriptionKey: tKey('workbench.guide.steps.dock.features.tmDescription'),
      },
      {
        icon: MessageSquare,
        titleKey: tKey('workbench.guide.steps.dock.features.glossary'),
        descriptionKey: tKey('workbench.guide.steps.dock.features.glossaryDescription'),
      },
      {
        icon: Sparkles,
        titleKey: tKey('workbench.guide.steps.dock.features.ai'),
        descriptionKey: tKey('workbench.guide.steps.dock.features.aiDescription'),
      },
      {
        icon: Lightbulb,
        titleKey: tKey('workbench.guide.steps.dock.features.related'),
        descriptionKey: tKey('workbench.guide.steps.dock.features.relatedDescription'),
      },
    ],
    proTipKey: tKey('workbench.guide.steps.dock.proTip'),
  },
  {
    id: 'batch',
    titleKey: tKey('workbench.guide.steps.batch.title'),
    descriptionKey: tKey('workbench.guide.steps.batch.description'),
    icon: CheckSquare,
    gradient: {
      from: 'from-indigo-500/20',
      via: 'via-violet-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-indigo-500',
    illustration: 'batch',
    features: [
      {
        icon: CheckSquare,
        titleKey: tKey('workbench.guide.steps.batch.features.select'),
      },
      {
        icon: Zap,
        titleKey: tKey('workbench.guide.steps.batch.features.actions'),
      },
      {
        icon: Languages,
        titleKey: tKey('workbench.guide.steps.batch.features.translate'),
      },
    ],
    proTipKey: tKey('workbench.guide.steps.batch.proTip'),
  },
  {
    id: 'filters',
    titleKey: tKey('workbench.guide.steps.filters.title'),
    descriptionKey: tKey('workbench.guide.steps.filters.description'),
    icon: Filter,
    gradient: {
      from: 'from-cyan-500/20',
      via: 'via-sky-500/10',
      to: 'to-transparent',
    },
    accentColor: 'text-cyan-500',
    illustration: 'filters',
    features: [
      {
        icon: Filter,
        titleKey: tKey('workbench.guide.steps.filters.features.status'),
      },
      {
        icon: Sparkles,
        titleKey: tKey('workbench.guide.steps.filters.features.quality'),
      },
      {
        icon: ArrowDown,
        titleKey: tKey('workbench.guide.steps.filters.features.namespace'),
      },
    ],
    proTipKey: tKey('workbench.guide.steps.filters.proTip'),
  },
];

export const STORAGE_KEY = 'lingx:workbench-guide-seen';
