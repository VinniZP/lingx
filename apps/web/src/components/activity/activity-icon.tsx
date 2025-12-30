/**
 * Activity Icon Utility
 *
 * Maps activity types to lucide-react icons.
 * Used across dashboard and project activity feeds.
 */
import {
  FileText,
  GitBranch,
  Plus,
  Trash2,
  GitMerge,
  Upload,
  Download,
  Settings,
  Layers,
  Sparkles,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityType } from '@localeflow/shared';

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
  environment_delete: Layers,
  environment_switch_branch: Layers,
  ai_translate: Sparkles,
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
