'use client';

import { useTranslation, tKey, type TKey } from '@lingx/sdk-nextjs';
import { useQuery } from '@tanstack/react-query';
import { totpApi, webauthnApi } from '@/lib/api';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { cn } from '@/lib/utils';

// Score configuration
const SCORE_CONFIG = {
  base: 40,          // Base score for having a password
  totp: 30,          // Bonus for enabling 2FA
  passkey: 20,       // Bonus for having passkeys
  passwordless: 10,  // Bonus for going passwordless
  max: 100,
} as const;

// Security level thresholds and their i18n keys
const SECURITY_LEVELS = [
  { threshold: 90, key: tKey('security.scoreLevel.excellent'), color: 'text-success' },
  { threshold: 70, key: tKey('security.scoreLevel.strong'), color: 'text-primary' },
  { threshold: 50, key: tKey('security.scoreLevel.moderate'), color: 'text-warning' },
  { threshold: 0, key: tKey('security.scoreLevel.needsImprovement'), color: 'text-destructive' },
] as const;

function getSecurityLevel(percentage: number): { key: TKey; color: string } {
  for (const level of SECURITY_LEVELS) {
    if (percentage >= level.threshold) {
      return { key: level.key, color: level.color };
    }
  }
  return SECURITY_LEVELS[SECURITY_LEVELS.length - 1];
}

export function useSecurityScore() {
  const supportsPasskey =
    typeof window !== 'undefined' && browserSupportsWebAuthn();

  const { data: totpStatus } = useQuery({
    queryKey: ['totp-status'],
    queryFn: () => totpApi.getStatus(),
  });

  const { data: webauthnStatus } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => webauthnApi.getStatus(),
    enabled: supportsPasskey,
  });

  let score = SCORE_CONFIG.base;

  if (totpStatus?.enabled) score += SCORE_CONFIG.totp;
  if (webauthnStatus?.hasPasskeys) score += SCORE_CONFIG.passkey;
  if (webauthnStatus?.isPasswordless) score += SCORE_CONFIG.passwordless;

  const percentage = Math.round((score / SCORE_CONFIG.max) * 100);
  const { key: levelKey, color } = getSecurityLevel(percentage);

  return { score, maxScore: SCORE_CONFIG.max, percentage, levelKey, color };
}

export function SecurityScoreWidget() {
  const { t, td } = useTranslation();
  const { percentage, levelKey, color } = useSecurityScore();

  return (
    <div className="shrink-0 p-6 rounded-2xl bg-linear-to-br from-muted/50 to-muted/20 border border-border/50 min-w-45">
      <div className="text-center">
        <div className="relative inline-flex">
          <svg className="size-20 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={color}
              strokeDasharray={`${percentage * 2.64} 264`}
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xl font-bold tabular-nums', color)}>
              {percentage}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <p className={cn('text-sm font-semibold', color)}>{td(levelKey)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('security.securityScore')}
          </p>
        </div>
      </div>
    </div>
  );
}
