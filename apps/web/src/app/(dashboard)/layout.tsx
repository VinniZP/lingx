'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  AppSidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/layout/app-sidebar'
import { Languages, Bell, Search, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, logout, isManager } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const sidebarUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isManager: isManager,
  }

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} pathname={pathname} onLogout={logout} />

      <SidebarInset className="bg-background">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 px-4 md:hidden bg-card mx-4 mt-4 rounded-xl">
          <SidebarTrigger className="size-9" aria-label="Toggle navigation menu" />
          <Link href="/dashboard" className="flex items-center gap-2 flex-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
              <Languages className="size-4" />
            </div>
            <span className="font-semibold">LocaleFlow</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </header>

        {/* Page content with inline toolbar */}
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {/* Desktop toolbar - inline with content */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="size-8" aria-label="Toggle sidebar" />
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Search className="size-4" />
                <span className="hidden lg:inline">Search...</span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button variant="ghost" size="icon" className="size-9 relative">
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
              </Button>
            </div>
          </div>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
