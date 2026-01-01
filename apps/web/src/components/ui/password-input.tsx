'use client';

import { useState, forwardRef, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps
  extends Omit<ComponentProps<typeof Input>, 'type'> {
  showToggle?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-12', className)}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
