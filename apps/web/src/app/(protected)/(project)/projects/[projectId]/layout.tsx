'use client';

import {
  ProjectSidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/layout/project-sidebar';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@lingx/sdk-nextjs';
import { Bell, Languages, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * ProjectLayout - Layout wrapper for project-specific pages
 *
 * Uses ProjectSidebar instead of AppSidebar to show:
 * - Back to projects link
 * - Project name and overview
 * - Collapsible space/branch tree for translations
 * - Project settings links
 */
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, isManager } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const projectId = params.projectId as string;

  // Extract branchId from URL if on translations page
  const branchIdMatch = pathname.match(/\/projects\/[^/]+\/translations\/([^/]+)/);
  const currentBranchId = branchIdMatch?.[1];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="bg-primary/10 size-12 animate-pulse rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="text-primary size-6 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isManager: isManager,
  };

  return (
    <SidebarProvider>
      <ProjectSidebar
        projectId={projectId}
        currentBranchId={currentBranchId}
        pathname={pathname}
        user={sidebarUser}
        onLogout={logout}
      />

      <SidebarInset>
        {/* Mobile header - island style (matching dashboard) */}
        <header className="bg-card mx-4 mt-4 flex h-14 items-center gap-3 rounded-xl px-4 md:hidden">
          <SidebarTrigger className="size-9" aria-label={t('nav.toggleNavigation')} />
          <Link href={`/projects/${projectId}`} className="flex flex-1 items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Languages className="size-4" />
            </div>
            <span className="font-semibold">Lingx</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('nav.toggleTheme')}
          >
            <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
        </header>

        {/* Page content with inline toolbar */}
        <main className="animate-fade-in flex-1 p-4 md:p-6">
          {/* Desktop toolbar - inline with content (matching dashboard) */}
          <div className="mb-6 hidden items-center justify-between md:flex">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="size-8" aria-label={t('nav.toggleSidebar')} />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <Search className="size-4" />
                <span className="hidden lg:inline">{t('nav.search')}</span>
                <span className="hidden lg:inline-flex">
                  <Kbd variant="pill">K</Kbd>
                </span>
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={t('nav.toggleTheme')}
              >
                <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
              </Button>
              <Button variant="ghost" size="icon" className="relative size-9">
                <Bell className="size-4" />
                <span className="bg-primary absolute top-1.5 right-1.5 size-2 rounded-full" />
              </Button>
            </div>
          </div>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
