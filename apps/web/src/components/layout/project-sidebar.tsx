'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FolderOpen,
  GitBranch,
  GitMerge,
  Globe,
  Globe2,
  Key,
  LogOut,
  Plus,
  Settings,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreateBranchDialog, CreateSpaceDialog, MergeBranchDialog } from '@/components/dialogs';
import { LanguagePickerCompact } from '@/components/language-picker';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { projectApi, ProjectTreeBranch, ProjectTreeSpace } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@lingx/sdk-nextjs';

interface ProjectSidebarProps {
  projectId: string;
  currentBranchId?: string;
  pathname: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    isManager: boolean;
  } | null;
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

/**
 * SpaceTreeItem - Collapsible space with branches
 */
function SpaceTreeItem({
  space,
  projectId,
  currentBranchId,
  onCreateBranch,
  onMergeBranch,
}: {
  space: ProjectTreeSpace;
  projectId: string;
  currentBranchId?: string;
  onCreateBranch: (space: ProjectTreeSpace) => void;
  onMergeBranch: (branch: ProjectTreeBranch) => void;
}) {
  const hasActiveBranch = space.branches.some((b) => b.id === currentBranchId);
  // Only expand by default if this space has the active branch
  const [isOpen, setIsOpen] = React.useState(hasActiveBranch);

  const branchCount = space.branches.length;
  const showCount = !isOpen && branchCount > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="text-muted-foreground size-4" />
              <span className="truncate font-medium">{space.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Show branch count when collapsed */}
              {showCount && (
                <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[10px]">
                  {branchCount}
                </span>
              )}
              {isOpen ? (
                <ChevronDown className="text-muted-foreground size-4" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4" />
              )}
            </div>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Scrollable container for spaces with many branches */}
          <SidebarMenuSub
            className={cn(
              'border-border/50 ml-2 border-l pl-2',
              branchCount > 6 && 'max-h-64 overflow-y-auto'
            )}
          >
            {space.branches.map((branch) => (
              <BranchItem
                key={branch.id}
                branch={branch}
                projectId={projectId}
                isActive={branch.id === currentBranchId}
                onMerge={() => onMergeBranch(branch)}
              />
            ))}
            <SidebarMenuSubItem>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-8 w-full justify-start gap-2"
                onClick={() => onCreateBranch(space)}
              >
                <Plus className="size-3" />
                <span className="text-xs">New Branch</span>
              </Button>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/**
 * BranchItem - Individual branch link with merge action
 */
function BranchItem({
  branch,
  projectId,
  isActive,
  onMerge,
}: {
  branch: ProjectTreeBranch;
  projectId: string;
  isActive: boolean;
  onMerge: () => void;
}) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isActive} className="pr-8">
        <Link href={`/workbench/${projectId}/${branch.id}`}>
          <GitBranch className="size-3" />
          <span className="truncate">{branch.name}</span>
        </Link>
      </SidebarMenuSubButton>

      {/* Default branch indicator - Shield icon with tooltip */}
      {branch.isDefault && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-1/2 right-7 flex -translate-y-1/2 items-center justify-center">
              <Shield className="text-primary/60 size-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Default branch
          </TooltipContent>
        </Tooltip>
      )}

      {/* Merge action - always visible */}
      <SidebarMenuAction
        onClick={onMerge}
        showOnHover={false}
        className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
        aria-label={`Merge ${branch.name} branch`}
      >
        <GitMerge className="size-3.5" />
      </SidebarMenuAction>
    </SidebarMenuSubItem>
  );
}

/**
 * ProjectSidebar - Context-aware sidebar for project navigation
 */
export function ProjectSidebar({
  projectId,
  currentBranchId,
  pathname,
  user,
  onLogout,
}: ProjectSidebarProps) {
  const { t } = useTranslation();
  const { setOpenMobile, isMobile } = useSidebar();

  // Dialog state
  const [createSpaceOpen, setCreateSpaceOpen] = React.useState(false);
  const [createBranchOpen, setCreateBranchOpen] = React.useState(false);
  const [mergeBranchOpen, setMergeBranchOpen] = React.useState(false);
  const [selectedSpace, setSelectedSpace] = React.useState<ProjectTreeSpace | null>(null);
  const [selectedBranch, setSelectedBranch] = React.useState<ProjectTreeBranch | null>(null);

  // Fetch project tree data
  const { data: tree, isLoading } = useQuery({
    queryKey: ['project-tree', projectId],
    queryFn: () => projectApi.getTree(projectId),
  });

  // Get all branches across all spaces for merge dialog
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Optional chaining in deps is intentional
  const allBranches = React.useMemo(() => {
    if (!tree?.spaces) return [];
    return tree.spaces.flatMap((space) => space.branches);
  }, [tree?.spaces]);

  const handleNavClick = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const handleCreateBranch = (space: ProjectTreeSpace) => {
    setSelectedSpace(space);
    setCreateBranchOpen(true);
  };

  const handleMergeBranch = (branch: ProjectTreeBranch) => {
    setSelectedBranch(branch);
    setMergeBranchOpen(true);
  };

  const userInitials = user ? getUserInitials(user.name, user.email) : 'U';
  const displayName = user ? getDisplayName(user.name, user.email) : 'User';

  return (
    <>
      <Sidebar collapsible="icon">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SidebarHeader className="p-3">
            <SidebarMenu>
              {/* Back to Projects */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Back to Projects"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground mb-2"
                >
                  <Link href="/projects" onClick={handleNavClick}>
                    <ArrowLeft className="size-4" />
                    <span className="text-xs">Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Project Name */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  asChild
                  tooltip={tree?.name || 'Project'}
                  className="hover:bg-transparent"
                >
                  <Link href={`/projects/${projectId}`} onClick={handleNavClick}>
                    <div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Globe2 className="size-5" />
                    </div>
                    <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      {isLoading ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        <span className="truncate text-sm font-semibold">
                          {tree?.name || 'Project'}
                        </span>
                      )}
                      <span className="text-muted-foreground truncate text-[11px]">Overview</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Main navigation */}
          <SidebarContent className="px-3">
            {/* Translations Tree - hidden when collapsed */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Translations
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {isLoading ? (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuSkeleton showIcon />
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuSkeleton showIcon />
                      </SidebarMenuItem>
                    </>
                  ) : tree?.spaces.length === 0 ? (
                    <SidebarMenuItem>
                      <div className="px-2 py-4 text-center">
                        <p className="text-muted-foreground mb-3 text-xs">No spaces yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreateSpaceOpen(true)}
                          className="gap-1.5"
                        >
                          <Plus className="size-3.5" />
                          Create Space
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ) : (
                    <>
                      {tree?.spaces.map((space) => (
                        <SpaceTreeItem
                          key={space.id}
                          space={space}
                          projectId={projectId}
                          currentBranchId={currentBranchId}
                          onCreateBranch={handleCreateBranch}
                          onMergeBranch={handleMergeBranch}
                        />
                      ))}
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setCreateSpaceOpen(true)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="size-4" />
                          <span>New Space</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Project navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Project
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Environments"
                      isActive={pathname.includes(`/projects/${projectId}/environments`)}
                    >
                      <Link href={`/projects/${projectId}/environments`} onClick={handleNavClick}>
                        <Zap className="size-4" />
                        <span>Environments</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="API Keys"
                      isActive={pathname === '/settings/api-keys'}
                    >
                      <Link href="/settings/api-keys" onClick={handleNavClick}>
                        <Key className="size-4" />
                        <span>API Keys</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Settings"
                      isActive={pathname === `/projects/${projectId}/settings`}
                    >
                      <Link href={`/projects/${projectId}/settings`} onClick={handleNavClick}>
                        <Settings className="size-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                        <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-sm font-medium">{displayName}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {user?.email || 'user@example.com'}
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
                          <AvatarFallback className="from-primary/20 to-warm/20 text-primary rounded-xl bg-linear-to-br font-semibold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left leading-tight">
                          <span className="truncate text-sm font-semibold">{displayName}</span>
                          <span className="text-muted-foreground truncate text-xs">
                            {user?.email || 'user@example.com'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {user?.isManager && (
                      <>
                        <DropdownMenuItem
                          asChild
                          className={cn(
                            pathname === '/settings/api-keys' &&
                              'bg-accent/50 text-accent-foreground'
                          )}
                        >
                          <Link href="/settings/api-keys" onClick={handleNavClick}>
                            <Key />
                            API Keys
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className={cn(
                            pathname === '/settings' && 'bg-accent/50 text-accent-foreground'
                          )}
                        >
                          <Link href="/settings" onClick={handleNavClick}>
                            <Settings />
                            Settings
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
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </div>
      </Sidebar>

      {/* Dialogs */}
      <CreateSpaceDialog
        open={createSpaceOpen}
        onOpenChange={setCreateSpaceOpen}
        projectId={projectId}
      />

      {selectedSpace && (
        <CreateBranchDialog
          open={createBranchOpen}
          onOpenChange={setCreateBranchOpen}
          projectId={projectId}
          spaceId={selectedSpace.id}
          spaceName={selectedSpace.name}
          branches={selectedSpace.branches}
        />
      )}

      <MergeBranchDialog
        open={mergeBranchOpen}
        onOpenChange={setMergeBranchOpen}
        projectId={projectId}
        sourceBranch={selectedBranch}
        allBranches={allBranches}
      />
    </>
  );
}

export { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
