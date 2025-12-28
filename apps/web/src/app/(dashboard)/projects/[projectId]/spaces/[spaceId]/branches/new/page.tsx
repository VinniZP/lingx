'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { branchApi, spaceApi, CreateBranchInput, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, GitBranch, Copy } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ projectId: string; spaceId: string }>;
}

export default function NewBranchPage({ params }: PageProps) {
  const { projectId, spaceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [fromBranchId, setFromBranchId] = useState('');

  const { data: space } = useQuery({
    queryKey: ['space', spaceId],
    queryFn: () => spaceApi.get(spaceId),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches', spaceId],
    queryFn: () => branchApi.list(spaceId),
  });

  const branches = useMemo(
    () => branchesData?.branches || [],
    [branchesData?.branches]
  );

  // Compute selected source branch - default to the first default branch or first available branch
  const selectedFromBranchId =
    fromBranchId ||
    branches.find((b) => b.isDefault)?.id ||
    branches[0]?.id ||
    '';

  const createMutation = useMutation({
    mutationFn: (data: CreateBranchInput) => branchApi.create(spaceId, data),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['branches', spaceId] });
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] });
      toast.success('Branch created', {
        description: `${branch.name} has been created with ${branch.keyCount || 0} keys copied.`,
      });
      router.push(
        `/projects/${projectId}/spaces/${spaceId}/branches/${branch.id}`
      );
    },
    onError: (error: ApiError) => {
      toast.error('Failed to create branch', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      fromBranchId: selectedFromBranchId,
    });
  };

  const sourceBranch = branches.find((b) => b.id === selectedFromBranchId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}/spaces/${spaceId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Branch</h1>
          <p className="text-muted-foreground mt-1">
            {space?.name} - Create a new translation branch
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Branch Details
          </CardTitle>
          <CardDescription>
            Create a new branch by copying translations from an existing branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="feature-login"
                pattern="^[a-zA-Z0-9-_]+$"
                required
              />
              <p className="text-sm text-muted-foreground">
                Use alphanumeric characters, hyphens, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromBranch">Copy From</Label>
              <select
                id="fromBranch"
                value={selectedFromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
                required
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.keyCount ?? 0} keys)
                    {branch.isDefault ? ' - default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {sourceBranch && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <Copy className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Copy-on-Write
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This will copy all{' '}
                      <strong>{sourceBranch.keyCount ?? 0}</strong> translation
                      keys and their values from <strong>{sourceBranch.name}</strong>{' '}
                      to the new branch.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name || !selectedFromBranchId}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Branch'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
