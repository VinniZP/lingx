'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { UserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUploadAvatar, useDeleteAvatar } from './use-profile';

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
    <div className="flex flex-col sm:flex-row items-start gap-6">
      {/* Avatar container with premium styling */}
      <div className="relative shrink-0 group">
        <div
          className={cn(
            'size-28 sm:size-32 rounded-2xl flex items-center justify-center overflow-hidden',
            'ring-4 ring-card shadow-xl transition-all duration-300',
            'bg-linear-to-br from-info/20 via-info/10 to-primary/10',
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
            <Loader2 className="size-8 text-info animate-spin" />
          ) : profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name || 'Avatar'}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-4xl font-semibold text-info/80">{initials}</span>
          )}
        </div>

        {/* Hover overlay with actions */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm',
            'flex items-center justify-center gap-3',
            'opacity-0 group-hover:opacity-100 transition-all duration-200',
            'ring-4 ring-transparent group-hover:ring-info/30'
          )}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
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
              className="p-3 rounded-xl bg-white/20 hover:bg-destructive/80 transition-colors"
              title={t('profile.avatarActions.removePhoto')}
            >
              <Trash2 className="size-5 text-white" />
            </button>
          )}
        </div>

        {/* Edit indicator */}
        <div className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          <Camera className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* Upload instructions */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('profile.uploadAvatar')}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('profile.avatarRequirements')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-10 rounded-xl gap-2"
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
              className="h-10 rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
