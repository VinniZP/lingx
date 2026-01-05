/**
 * Activity Icon Utility
 *
 * Maps activity types to lucide-react icons.
 * Used across dashboard and project activity feeds.
 */
import type { ActivityType } from '@lingx/shared';
import {
  Activity,
  CheckCircle,
  Download,
  FileText,
  GitBranch,
  GitMerge,
  Layers,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

const activityIcons: Record<ActivityType, LucideIcon> = {
  translation: FileText,
  key_add: Plus,
  key_delete: Trash2,
  branch_create: GitBranch,
  branch_delete: Trash2,
  merge: GitMerge,
  import: Upload,
  export: Download,
  project_settings: Settings,
  environment_create: Layers,
  environment_update: Layers,
  environment_delete: Layers,
  environment_switch_branch: Layers,
  ai_translate: Sparkles,
  translation_approve: CheckCircle,
  translation_reject: XCircle,
};

/**
 * Get the icon component for an activity type.
 *
 * @param type - Activity type
 * @returns Lucide icon component
 */
export function getActivityIcon(type: ActivityType | string): LucideIcon {
  return activityIcons[type as ActivityType] || Activity;
}

/**
 * ActivityIcon - renders the activity icon directly without creating component during render
 * Use this instead of getActivityIcon() to avoid React Compiler warnings
 */
export function ActivityIcon({
  type,
  className,
}: {
  type: ActivityType | string;
  className?: string;
}) {
  const Icon = activityIcons[type as ActivityType] || Activity;
  return <Icon className={className} />;
}
