'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen,
  Settings,
  LogOut,
  Key,
  LayoutDashboard,
  Languages,
  ChevronRight,
  Search,
  Bell,
  Plus,
} from 'lucide-react';

// Custom hook for hydration-safe mounted state
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface SidebarItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  requiresManager?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/settings', icon: Settings, label: 'Settings', requiresManager: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout, isManager } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const displayName = user.name || user.email.split('@')[0];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${
          mounted ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-all group-hover:scale-105">
              <Languages className="w-4 h-4" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
              Localeflow
            </span>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="p-3 border-b border-sidebar-border">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto text-xs bg-sidebar border border-sidebar-border rounded px-1.5 py-0.5 text-sidebar-foreground/50">
              /
            </kbd>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems
            .filter((item) => !item.requiresManager || isManager)
            .map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 ml-auto text-sidebar-foreground/50" />
                  )}
                </Link>
              );
            })}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User menu */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2.5 px-3 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
                data-testid="user-menu"
              >
                <Avatar className="h-8 w-8 ring-2 ring-sidebar-border">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="text-sm font-medium truncate w-full">
                    {displayName}
                  </span>
                  <span className="text-xs text-sidebar-foreground/50 truncate w-full">
                    {user.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isManager && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/api-keys" className="cursor-pointer">
                      <Key className="mr-2 h-4 w-4" />
                      API Keys
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-destructive focus:text-destructive"
                data-testid="logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Breadcrumb would go here */}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
            <Button className="h-9 gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div
          className={`p-6 lg:p-8 transition-all duration-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
