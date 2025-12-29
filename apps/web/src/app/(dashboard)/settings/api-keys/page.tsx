'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ApiKeyDialog } from '@/components/api-key-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  Key,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  Languages,
  AlertTriangle,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function ApiKeysPage() {
  const { isManager, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isManager) {
      router.push('/projects');
    }
  }, [isManager, authLoading, router]);

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await apiKeyApi.list();
      return response.apiKeys;
    },
    enabled: isManager,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiKeyApi.create(name);
      return response;
    },
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key created successfully', {
        description: 'Copy it now - it wont be shown again.',
      });
    },
    onError: (error: ApiError) => {
      toast.error('Failed to create API key', {
        description: error.message,
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiKeyApi.revoke(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked', {
        description: 'The key can no longer be used for authentication.',
      });
    },
    onError: (error: ApiError) => {
      toast.error('Failed to revoke API key', {
        description: error.message,
      });
    },
  });

  const handleCreate = async (name: string) => {
    await createMutation.mutateAsync(name);
    setShowCreateDialog(false);
  };

  const copyToClipboard = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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

  if (!isManager) {
    return null;
  }

  const apiKeys = apiKeysData ?? [];
  const activeKeys = apiKeys.filter((k) => !k.revoked);
  const revokedKeys = apiKeys.filter((k) => k.revoked);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-11 w-11 touch-manipulation" asChild aria-label="Go back to settings">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              API Keys
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage API keys for CLI and SDK authentication
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="h-11 gap-2 w-full sm:w-auto touch-manipulation" data-testid="generate-key-button">
          <Plus className="h-4 w-4" />
          Generate New Key
        </Button>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <Card className="border-warm/50 bg-warm/5 animate-fade-in touch-manipulation">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warm/20">
                  <Key className="h-5 w-5 text-warm" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    New API Key Created
                  </CardTitle>
                  <CardDescription>
                    Copy this key now - it will not be shown again
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 touch-manipulation"
                onClick={() => setNewKey(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <code className="block p-4 bg-background rounded-lg border font-mono text-sm break-all pr-14" data-testid="new-api-key">
                {newKey}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 touch-manipulation"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warm flex-shrink-0" />
              <span>
                Store this key securely. You will not be able to see it again.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Keys */}
      <Card className="touch-manipulation">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShieldCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle>Active Keys</CardTitle>
              <CardDescription>
                {activeKeys.length} active{' '}
                {activeKeys.length === 1 ? 'key' : 'keys'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-muted-foreground">Loading...</span>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && activeKeys.length === 0 && (
            <div className="text-center py-8 text-muted-foreground px-4">
              <div className="flex flex-col items-center gap-2">
                <Key className="h-8 w-8 opacity-50" />
                <p>No active API keys</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-2 h-11 touch-manipulation"
                >
                  Generate your first key
                </Button>
              </div>
            </div>
          )}

          {/* Mobile: Card-based list */}
          {!isLoading && activeKeys.length > 0 && (
            <div className="space-y-4 p-4 sm:hidden">
              {activeKeys.map((key) => (
                <Card key={key.id} className="touch-manipulation">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Active
                      </Badge>
                    </div>
                    <div className="font-mono text-sm bg-muted p-2 rounded truncate">
                      {key.keyPrefix}...
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Last used: {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                        : 'Never'}</div>
                      <div>Created: {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}</div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="h-11 w-full touch-manipulation"
                          data-testid="revoke-key-button"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Revoke Key
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently revoke the API key{' '}
                            <strong>{key.name}</strong>. Any applications
                            using this key will no longer be able to
                            authenticate. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                          <AlertDialogCancel className="h-11 touch-manipulation">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => revokeMutation.mutate(key.id)}
                            className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
                          >
                            {revokeMutation.isPending ? 'Revoking...' : 'Revoke Key'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Desktop: Table layout */}
          {!isLoading && activeKeys.length > 0 && (
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.lastUsedAt
                          ? formatDistanceToNow(new Date(key.lastUsedAt), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(key.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid="revoke-key-button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently revoke the API key{' '}
                                <strong>{key.name}</strong>. Any applications
                                using this key will no longer be able to
                                authenticate. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeMutation.mutate(key.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Key'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card className="opacity-75 touch-manipulation">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-muted-foreground">
                  Revoked Keys
                </CardTitle>
                <CardDescription>
                  {revokedKeys.length} revoked{' '}
                  {revokedKeys.length === 1 ? 'key' : 'keys'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {/* Mobile: Card-based list */}
            <div className="space-y-4 p-4 sm:hidden">
              {revokedKeys.map((key) => (
                <Card key={key.id} className="opacity-60">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant="destructive" className="font-normal">
                        Revoked
                      </Badge>
                    </div>
                    <div className="font-mono text-sm bg-muted p-2 rounded truncate">
                      {key.keyPrefix}...
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revokedKeys.map((key) => (
                    <TableRow key={key.id} className="opacity-60">
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-normal">
                          Revoked
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(key.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <ApiKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
