'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@lingx/sdk-nextjs';
import { ArrowRightFromLine, Eye, Timer } from 'lucide-react';

interface ImpersonationBannerProps {
  userName: string;
  timeRemaining: string;
  onExit: () => void;
}

export function ImpersonationBanner({ userName, timeRemaining, onExit }: ImpersonationBannerProps) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="fixed top-0 right-0 left-0 z-50 h-12">
      {/* Warm amber gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)]" />

      {/* Subtle top highlight */}
      <div className="absolute top-0 right-0 left-0 h-px bg-white/40" />

      {/* Bottom edge shadow */}
      <div className="absolute right-0 bottom-0 left-0 h-px bg-amber-600/20" />

      {/* Content */}
      <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Left section - Status indicator */}
        <div className="flex items-center gap-4">
          {/* Viewing indicator */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-amber-600/20 blur-sm" />
              <div className="relative flex size-7 items-center justify-center rounded-full border border-amber-700/20 bg-amber-700/15">
                <Eye className="size-3.5 text-amber-900" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium tracking-wide text-amber-900/80">
                {t('admin.impersonationBanner.label')}
              </span>
              <span className="text-sm font-bold tracking-wide text-amber-950">{userName}</span>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden h-5 w-px bg-amber-700/20 sm:block" />

          {/* Time indicator */}
          <div className="hidden items-center gap-1.5 text-amber-800/70 sm:flex">
            <Timer className="size-3.5" />
            <span className="text-xs font-medium tracking-wide">
              {t('admin.impersonationBanner.expiresIn', { time: timeRemaining })}
            </span>
          </div>
        </div>

        {/* Right section - Exit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="h-8 gap-2 rounded-lg bg-white/90 px-4 text-sm font-medium text-amber-950 shadow-sm transition-all duration-200 hover:bg-amber-950 hover:text-amber-100 hover:shadow-md"
        >
          <span>{t('admin.impersonationBanner.exit')}</span>
          <ArrowRightFromLine className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
