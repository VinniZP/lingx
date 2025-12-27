'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  translationApi,
  branchApi,
  projectApi,
  TranslationKey,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Search, Trash2, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';
import { KeyFormDialog } from '@/components/key-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PageProps {
  params: Promise<{ projectId: string; spaceId: string; branchId: string }>;
}

export default function TranslationsPage({ params }: PageProps) {
  const { projectId, spaceId, branchId } = use(params);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<TranslationKey | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTranslations, setEditingTranslations] = useState<
    Record<string, Record<string, string>>
  >({});

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => branchApi.get(branchId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['keys', branchId, search, page],
    queryFn: () => translationApi.listKeys(branchId, { search, page, limit: 50 }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () =>
      translationApi.bulkDeleteKeys(branchId, Array.from(selectedKeys)),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Keys deleted', {
        description: `${result.deleted} keys have been deleted.`,
      });
      setSelectedKeys(new Set());
      setShowDeleteDialog(false);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to delete keys', {
        description: error.message,
      });
    },
  });

  const updateTranslationMutation = useMutation({
    mutationFn: ({
      keyId,
      translations,
    }: {
      keyId: string;
      translations: Record<string, string>;
    }) => translationApi.updateKeyTranslations(keyId, translations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys', branchId] });
      toast.success('Translations saved');
    },
    onError: (error: ApiError) => {
      toast.error('Failed to save translations', {
        description: error.message,
      });
    },
  });

  const languages = project?.languages || [];
  const keys = data?.keys || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(keys.map((k) => k.id)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleSelectKey = (keyId: string, checked: boolean) => {
    const newSelected = new Set(selectedKeys);
    if (checked) {
      newSelected.add(keyId);
    } else {
      newSelected.delete(keyId);
    }
    setSelectedKeys(newSelected);
  };

  const handleTranslationChange = (
    keyId: string,
    lang: string,
    value: string
  ) => {
    setEditingTranslations((prev) => ({
      ...prev,
      [keyId]: {
        ...prev[keyId],
        [lang]: value,
      },
    }));
  };

  const handleSaveTranslation = (keyId: string) => {
    const translations = editingTranslations[keyId];
    if (translations) {
      updateTranslationMutation.mutate({ keyId, translations });
      setEditingTranslations((prev) => {
        const newState = { ...prev };
        delete newState[keyId];
        return newState;
      });
    }
  };

  const getTranslationValue = (key: TranslationKey, lang: string): string => {
    // Check if there's an edited value
    if (editingTranslations[key.id]?.[lang] !== undefined) {
      return editingTranslations[key.id][lang];
    }
    // Otherwise use the stored value
    return key.translations.find((t) => t.language === lang)?.value || '';
  };

  const hasUnsavedChanges = (keyId: string) => {
    return !!editingTranslations[keyId];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/projects/${projectId}/spaces/${spaceId}/branches/${branchId}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            {project?.name} / {branch?.space.name} / {branch?.name}
          </div>
          <h1 className="text-3xl font-bold">Translations</h1>
        </div>
        <Button onClick={() => setShowKeyDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Key
        </Button>
      </div>

      {/* Search and bulk actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keys..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        {selectedKeys.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {selectedKeys.size} selected
          </Button>
        )}
      </div>

      {/* Translation Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{data?.total || 0} keys</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No translation keys yet.
              </p>
              <Button onClick={() => setShowKeyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Key
              </Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {/* Header */}
              <div
                className="grid gap-4 p-3 bg-muted/50 border-b font-medium text-sm"
                style={{
                  gridTemplateColumns: `auto 1fr repeat(${languages.length}, 1fr) auto`,
                }}
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={
                      selectedKeys.size === keys.length && keys.length > 0
                    }
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked as boolean)
                    }
                  />
                </div>
                <div>Key</div>
                {languages.map((lang) => (
                  <div key={lang.code} className="uppercase">
                    {lang.code}
                    {lang.isDefault && (
                      <span className="ml-1 text-xs text-primary">
                        (default)
                      </span>
                    )}
                  </div>
                ))}
                <div>Actions</div>
              </div>

              {/* Rows */}
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="grid gap-4 p-3 border-b last:border-b-0 items-start"
                  style={{
                    gridTemplateColumns: `auto 1fr repeat(${languages.length}, 1fr) auto`,
                  }}
                >
                  <div className="pt-2">
                    <Checkbox
                      checked={selectedKeys.has(key.id)}
                      onCheckedChange={(checked) =>
                        handleSelectKey(key.id, checked as boolean)
                      }
                    />
                  </div>
                  <div>
                    <div className="font-mono text-sm">{key.name}</div>
                    {key.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {key.description}
                      </div>
                    )}
                  </div>
                  {languages.map((lang) => (
                    <div key={lang.code}>
                      <textarea
                        value={getTranslationValue(key, lang.code)}
                        onChange={(e) =>
                          handleTranslationChange(
                            key.id,
                            lang.code,
                            e.target.value
                          )
                        }
                        placeholder={`${lang.name}...`}
                        className="w-full p-2 text-sm border rounded-md resize-none min-h-[60px] bg-background"
                        rows={2}
                      />
                    </div>
                  ))}
                  <div className="flex items-start gap-1">
                    {hasUnsavedChanges(key.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveTranslation(key.id)}
                        disabled={updateTranslationMutation.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingKey(key);
                        setShowKeyDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.total > 50 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(data.total / 50)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(data.total / 50)}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Form Dialog */}
      <KeyFormDialog
        open={showKeyDialog}
        onOpenChange={(open) => {
          setShowKeyDialog(open);
          if (!open) setEditingKey(undefined);
        }}
        branchId={branchId}
        editKey={editingKey}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Keys?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedKeys.size} keys and all
              their translations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
