'use client';

import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDeleteAvatar, useUploadAvatar } from './use-profile';

interface AvatarUploadProps {
  profile: UserProfile;
}

export function AvatarUpload({ profile }: AvatarUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAvatar();
  const deleteMutation = useDeleteAvatar();

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.toasts.invalidImageFile'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.toasts.fileTooLarge'));
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase();

  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row">
      {/* Avatar container with premium styling */}
      <div className="group relative shrink-0">
        <div
          className={cn(
            'flex size-28 items-center justify-center overflow-hidden rounded-2xl sm:size-32',
            'ring-card shadow-xl ring-4 transition-all duration-300',
            'from-info/20 via-info/10 to-primary/10 bg-linear-to-br',
            isDragging && 'ring-info scale-105',
            !isDragging && 'hover:ring-info/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <Loader2 className="text-info size-8 animate-spin" />
          ) : profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-info/80 text-4xl font-semibold">{initials}</span>
          )}
        </div>

        {/* Hover overlay with actions */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm',
            'flex items-center justify-center gap-3',
            'opacity-0 transition-all duration-200 group-hover:opacity-100',
            'group-hover:ring-info/30 ring-4 ring-transparent'
          )}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="rounded-xl bg-white/20 p-3 transition-colors hover:bg-white/30"
            title={t('profile.avatarActions.uploadPhoto')}
          >
            <Camera className="size-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            disabled={isLoading}
          />
          {profile.avatarUrl && (
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={isLoading}
              className="hover:bg-destructive/80 rounded-xl bg-white/20 p-3 transition-colors"
              title={t('profile.avatarActions.removePhoto')}
            >
              <Trash2 className="size-5 text-white" />
            </button>
          )}
        </div>

        {/* Edit indicator */}
        <div className="bg-card border-border absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-110">
          <Camera className="text-muted-foreground size-4" />
        </div>
      </div>

      {/* Upload instructions */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('profile.uploadAvatar')}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t('profile.avatarRequirements')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-10 gap-2 rounded-xl"
          >
            <Camera className="size-4" />
            {t('profile.uploadNew')}
          </Button>
          {profile.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={isLoading}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 gap-2 rounded-xl"
            >
              <Trash2 className="size-4" />
              {t('profile.removeAvatar')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
