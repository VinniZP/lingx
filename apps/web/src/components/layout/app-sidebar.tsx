'use client';

import type { LucideIcon } from 'lucide-react';
import {
  ChevronsUpDown,
  FolderOpen,
  Globe,
  Key,
  Languages,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { LanguagePickerCompact } from '@/components/language-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { tKey, useTranslation, type TKey } from '@lingx/sdk-nextjs';

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: TKey;
  requiresManager?: boolean;
  requiresAdmin?: boolean;
}

const navigationItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: tKey('sidebar.dashboard') },
  { href: '/projects', icon: FolderOpen, labelKey: tKey('sidebar.projects') },
  { href: '/settings', icon: Settings, labelKey: tKey('sidebar.settings'), requiresManager: true },
  { href: '/admin', icon: ShieldAlert, labelKey: tKey('sidebar.admin'), requiresAdmin: true },
];

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string | null;
    isManager: boolean;
    isAdmin: boolean;
  } | null;
  pathname: string;
  onLogout: () => void;
}

function getUserInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function getDisplayName(name: string | null, email: string): string {
  return name || email.split('@')[0];
}

export function AppSidebar({ user, pathname, onLogout }: AppSidebarProps) {
  const { t, td } = useTranslation();
  const { setOpenMobile, isMobile } = useSidebar();

  const filteredNavItems = navigationItems.filter(
    (item) => (!item.requiresManager || user?.isManager) && (!item.requiresAdmin || user?.isAdmin)
  );

  const handleNavClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const userInitials = user ? getUserInitials(user.name, user.email) : 'U';
  const displayName = user ? getDisplayName(user.name, user.email) : 'User';

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-full flex-col">
        {/* Header - Logo */}
        <SidebarHeader className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
              >
                <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Languages className="size-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold">{t('sidebar.brand')}</span>
                  <span className="text-muted-foreground truncate text-[11px]">
                    {t('sidebar.tagline')}
                  </span>
                </div>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Main navigation */}
        <SidebarContent className="px-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {filteredNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={td(item.labelKey)}>
                        <Link href={item.href} onClick={handleNavClick}>
                          <item.icon className="shrink-0" />
                          <span>{td(item.labelKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer - Language & User */}
        <SidebarFooter className="border-border mt-auto space-y-2 border-t p-3">
          {/* Language Picker */}
          <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Globe className="text-muted-foreground size-4" />
              <span className="text-muted-foreground text-xs font-medium">
                {t('sidebar.language')}
              </span>
            </div>
            <LanguagePickerCompact />
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" data-testid="user-menu">
                    <Avatar className="size-8 shrink-0 rounded-lg">
                      {user?.avatarUrl && (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={displayName}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-medium">{displayName}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user?.email || t('sidebar.userFallback')}
                      </span>
                    </div>
                    <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-64" align="start">
                  {/* User header with gradient accent */}
                  <div className="mb-1 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="ring-primary/10 size-10 rounded-xl ring-2">
                        {user?.avatarUrl && (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={displayName}
                            className="rounded-xl object-cover"
                          />
                        )}
                        <AvatarFallback className="from-primary/20 to-warm/20 text-primary rounded-xl bg-linear-to-br font-semibold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-semibold">{displayName}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {user?.email || t('sidebar.userFallback')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {user?.isManager && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/settings/api-keys" onClick={handleNavClick}>
                          <Key />
                          {t('sidebar.apiKeys')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" onClick={handleNavClick}>
                          <Settings />
                          {t('sidebar.settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={onLogout}
                    data-testid="logout-button"
                    variant="destructive"
                  >
                    <LogOut />
                    {t('sidebar.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

export { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
