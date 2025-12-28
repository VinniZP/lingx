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
import { Languages, Bell, Plus } from 'lucide-react'

/**
 * DashboardLayout - Main layout wrapper for all dashboard pages
 *
 * Implements responsive sidebar behavior:
 * - Mobile (< 768px): Sheet overlay sidebar with hamburger toggle
 * - Tablet (768-1023px): Collapsible icon-only sidebar
 * - Desktop (>= 1024px): Expanded persistent sidebar
 *
 * Features:
 * - SidebarProvider for state management and persistence
 * - AppSidebar for navigation with permission-aware menu items
 * - Mobile header with SidebarTrigger (hamburger menu)
 * - Authentication check and route protection
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, logout, isManager } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Languages className="w-5 h-5 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!user) {
    return null
  }

  // Create user object with isManager for AppSidebar
  const sidebarUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isManager: isManager,
  }

  return (
    <SidebarProvider>
      {/* Main sidebar navigation */}
      <AppSidebar user={sidebarUser} pathname={pathname} onLogout={logout} />

      {/* Main content area with responsive behavior */}
      <SidebarInset>
        {/* Mobile header - visible only on mobile with hamburger menu */}
        <header className="flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 md:hidden">
          <SidebarTrigger className="size-9" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 flex-1"
          >
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
              <Languages className="size-4" />
            </div>
            <span className="font-semibold text-foreground">Localeflow</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-9">
              <Bell className="size-4" />
            </Button>
          </div>
        </header>

        {/* Desktop/Tablet header - hidden on mobile */}
        <header className="sticky top-0 z-40 hidden h-16 bg-background/95 backdrop-blur-sm border-b border-border md:flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle for tablet/desktop */}
            <SidebarTrigger className="size-8" />
            {/* Breadcrumb area - can be extended */}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-9">
              <Bell className="size-4" />
            </Button>
            <Button className="h-9 gap-2">
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        </header>

        {/* Page content with responsive padding */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
