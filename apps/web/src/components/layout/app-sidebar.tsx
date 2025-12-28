'use client'

import * as React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Key,
  Languages,
  ChevronUp,
  Search,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'

/**
 * Navigation item configuration
 */
interface NavItem {
  href: string
  icon: LucideIcon
  label: string
  requiresManager?: boolean
}

/**
 * Main navigation configuration
 * Extracted from the current dashboard layout for maintainability
 */
const navigationItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/settings', icon: Settings, label: 'Settings', requiresManager: true },
]

/**
 * Props for the AppSidebar component
 */
interface AppSidebarProps {
  user: {
    id: string
    email: string
    name: string | null
    isManager: boolean
  } | null
  pathname: string
  onLogout: () => void
}

/**
 * Generates user initials from name or email
 */
function getUserInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

/**
 * Generates display name from name or email
 */
function getDisplayName(name: string | null, email: string): string {
  return name || email.split('@')[0]
}

/**
 * AppSidebar - Main navigation sidebar component for Localeflow
 *
 * Features:
 * - Responsive design: Sheet overlay on mobile, collapsible on tablet, expanded on desktop
 * - Touch-friendly: 44x44px minimum touch targets
 * - Localeflow branding: Deep indigo/violet with warm amber accents
 * - Permission-aware: Shows settings only to managers
 * - User menu with logout functionality
 */
export function AppSidebar({ user, pathname, onLogout }: AppSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar()

  // Filter navigation items based on user permissions
  const filteredNavItems = navigationItems.filter(
    (item) => !item.requiresManager || user?.isManager
  )

  // Handle navigation click on mobile - close sidebar after navigation
  const handleNavClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const userInitials = user ? getUserInitials(user.name, user.email) : 'U'
  const displayName = user ? getDisplayName(user.name, user.email) : 'User'

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with Localeflow branding */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent"
            >
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
                  <Languages className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sidebar-foreground">
                    Localeflow
                  </span>
                  <span className="text-xs text-sidebar-foreground/50">
                    Translation Platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Quick search action */}
      <div className="p-2 group-data-[collapsible=icon]:hidden">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-9 bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Search className="size-4" />
          <span className="text-sm">Search...</span>
          <kbd className="ml-auto text-xs bg-sidebar border border-sidebar-border rounded px-1.5 py-0.5 text-sidebar-foreground/50">
            /
          </kbd>
        </Button>
      </div>

      <SidebarSeparator />

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      size="lg"
                      className="h-11"
                    >
                      <Link href={item.href} onClick={handleNavClick}>
                        <item.icon className="size-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer with user menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-auto py-2.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="user-menu"
                >
                  <Avatar className="size-8 ring-2 ring-sidebar-border shrink-0">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left min-w-0 flex-1">
                    <span className="text-sm font-medium truncate w-full">
                      {displayName}
                    </span>
                    <span className="text-xs text-sidebar-foreground/50 truncate w-full">
                      {user?.email || 'user@example.com'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                className="w-56"
                sideOffset={8}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.isManager && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings/api-keys"
                        className="cursor-pointer"
                        onClick={handleNavClick}
                      >
                        <Key className="mr-2 size-4" />
                        API Keys
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="cursor-pointer"
                        onClick={handleNavClick}
                      >
                        <Settings className="mr-2 size-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  data-testid="logout-button"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * Re-export sidebar components for convenience when integrating
 */
export {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar'
