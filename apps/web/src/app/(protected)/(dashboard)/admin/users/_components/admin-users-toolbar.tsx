'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@lingx/sdk-nextjs';
import type { UserRole, UserStatus } from '@lingx/shared';
import { Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface AdminUsersToolbarProps {
  search: string;
  role: UserRole | undefined;
  status: UserStatus | undefined;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: UserRole | undefined) => void;
  onStatusChange: (value: UserStatus | undefined) => void;
}

export function AdminUsersToolbar({
  search,
  role,
  status,
  totalCount,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: AdminUsersToolbarProps) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = useState(search);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    onSearchChange(value);
  }, 300);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearch(value);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-5">
      {/* Search */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={t('admin.users.search')}
          value={localSearch}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* Role Filter */}
      <Select
        value={role || 'all'}
        onValueChange={(v) => onRoleChange(v === 'all' ? undefined : (v as UserRole))}
      >
        <SelectTrigger className="w-[140px]" aria-label={t('admin.users.filters.role')}>
          <SelectValue placeholder={t('admin.users.filters.allRoles')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.users.filters.allRoles')}</SelectItem>
          <SelectItem value="ADMIN">{t('admin.roles.admin')}</SelectItem>
          <SelectItem value="MANAGER">{t('admin.roles.manager')}</SelectItem>
          <SelectItem value="DEVELOPER">{t('admin.roles.developer')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={status || 'all'}
        onValueChange={(v) => onStatusChange(v === 'all' ? undefined : (v as UserStatus))}
      >
        <SelectTrigger className="w-[140px]" aria-label={t('admin.users.filters.status')}>
          <SelectValue placeholder={t('admin.users.filters.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.users.filters.allStatuses')}</SelectItem>
          <SelectItem value="active">{t('admin.status.active')}</SelectItem>
          <SelectItem value="disabled">{t('admin.status.disabled')}</SelectItem>
        </SelectContent>
      </Select>

      {/* User Count */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Users className="size-4" />
        <span className="text-foreground font-medium">{totalCount}</span>
        <span>{t('admin.users.count')}</span>
      </div>
    </div>
  );
}
