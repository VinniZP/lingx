'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ImpersonationBanner } from '../impersonation-banner';

// Mock the translation hook
vi.mock('@lingx/sdk-nextjs', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'admin.impersonationBanner.label': 'Impersonating',
        'admin.impersonationBanner.expiresIn': `Expires in ${params?.time}`,
        'admin.impersonationBanner.exit': 'Exit',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ImpersonationBanner', () => {
  test('renders user name', () => {
    render(<ImpersonationBanner userName="John Doe" timeRemaining="45 minutes" onExit={vi.fn()} />);

    expect(screen.getByText('Impersonating')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('renders time remaining', () => {
    render(<ImpersonationBanner userName="John Doe" timeRemaining="45 minutes" onExit={vi.fn()} />);

    expect(screen.getByText('Expires in 45 minutes')).toBeInTheDocument();
  });

  test('renders exit button', () => {
    render(<ImpersonationBanner userName="John Doe" timeRemaining="45 minutes" onExit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
  });

  test('calls onExit when exit button is clicked', () => {
    const onExit = vi.fn();
    render(<ImpersonationBanner userName="John Doe" timeRemaining="45 minutes" onExit={onExit} />);

    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(onExit).toHaveBeenCalled();
  });

  test('applies fixed positioning styling', () => {
    render(<ImpersonationBanner userName="John Doe" timeRemaining="45 minutes" onExit={vi.fn()} />);

    const banner = screen.getByRole('alert');
    // Component uses fixed positioning at top of viewport
    expect(banner).toHaveClass('fixed', 'top-0', 'z-50');
  });
});
