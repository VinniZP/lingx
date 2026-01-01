'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  Key,
  Languages,
  ChevronsUpDown,
  Globe,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { LanguagePickerCompact } from '@/components/language-picker';
import { useTranslation, tKey, type TranslationKey } from '@localeflow/sdk-nextjs';

interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  requiresManager?: boolean;
}

const navigationItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: tKey('sidebar.dashboard') },
  { href: '/projects', icon: FolderOpen, labelKey: tKey('sidebar.projects') },
  { href: '/settings', icon: Settings, labelKey: tKey('sidebar.settings'), requiresManager: true },
];

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string | null;
    isManager: boolean;
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
    (item) => !item.requiresManager || user?.isManager
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
      <div className="flex flex-col h-full">
        {/* Header - Logo */}
        <SidebarHeader className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-primary-foreground shrink-0">
                  <Languages className="size-5" />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-sm">{t('sidebar.brand')}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{t('sidebar.tagline')}</span>
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
                  const isActive = pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={td(item.labelKey)}
                      >
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
        <SidebarFooter className="mt-auto border-t border-border p-3 space-y-2">
          {/* Language Picker */}
          <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Globe className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{t('sidebar.language')}</span>
            </div>
            <LanguagePickerCompact />
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    data-testid="user-menu"
                  >
                    <Avatar className="size-8 rounded-lg shrink-0">
                      {user?.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={displayName} className="rounded-lg object-cover" />
                      )}
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-medium text-sm">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || t('sidebar.userFallback')}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-64"
                  align="start"
                >
                  {/* User header with gradient accent */}
                  <div className="px-3 py-3 mb-1">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 rounded-xl ring-2 ring-primary/10">
                        {user?.avatarUrl && (
                          <AvatarImage src={user.avatarUrl} alt={displayName} className="rounded-xl object-cover" />
                        )}
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-warm/20 text-primary font-semibold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-semibold text-sm">{displayName}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email || t('sidebar.userFallback')}</span>
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

export {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
