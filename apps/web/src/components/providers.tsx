'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState, ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { LingxProvider } from '@lingx/sdk-nextjs';

// Only import default language for instant initial render
// Other languages fetched from API first, then fallback to /locales/*.json
import en from '../../public/locales/en.json';

// API configuration for fetching translations (SDK appends /sdk/translations)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LingxProvider
              defaultLanguage="en"
              staticData={undefined}
              // API fetching (tries first, falls back to localePath)
              apiUrl={API_URL}
              project="lingx"
              space="default"
              environment="production"
              // Fallback to local JSON files
              localePath="/locales"
              availableLanguages={['en', 'de', 'es', 'fr', 'ru', 'uk']}
            >
              {children}
            </LingxProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
