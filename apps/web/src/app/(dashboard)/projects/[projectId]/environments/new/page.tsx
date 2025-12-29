'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  environmentApi,
  projectApi,
  spaceApi,
  branchApi,
  CreateEnvironmentInput,
  ApiError,
} from '@/lib/api';
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
import { ArrowLeft, Globe, GitBranch, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

interface BranchWithSpace {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  spaceName: string;
}

export default function NewEnvironmentPage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.get(projectId),
  });

  const { data: spacesData } = useQuery({
    queryKey: ['spaces', projectId],
    queryFn: () => spaceApi.list(projectId),
  });

  // Get all branches from all spaces
  const { data: allBranches, isLoading: branchesLoading } = useQuery({
    queryKey: ['all-branches', projectId],
    queryFn: async (): Promise<BranchWithSpace[]> => {
      if (!spacesData?.spaces) return [];
      const branches = await Promise.all(
        spacesData.spaces.map((s) => branchApi.list(s.id))
      );
      return branches.flatMap((b, i) =>
        b.branches.map((br) => ({
          ...br,
          spaceName: spacesData.spaces[i].name,
        }))
      );
    },
    enabled: !!spacesData?.spaces,
  });

  // Compute selected branch ID - default to the first default branch or first available branch
  const selectedBranchId =
    branchId ??
    (allBranches?.find((b) => b.isDefault)?.id || allBranches?.[0]?.id || '');

  const createMutation = useMutation({
    mutationFn: (data: CreateEnvironmentInput) =>
      environmentApi.create(projectId, data),
    onSuccess: (env) => {
      queryClient.invalidateQueries({ queryKey: ['environments', projectId] });
      toast.success('Environment created', {
        description: `${env.name} is now ready for SDK integration.`,
      });
      router.push(`/projects/${projectId}/environments`);
    },
    onError: (error: ApiError) => {
      toast.error('Failed to create environment', {
        description: error.message,
      });
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      slug,
      branchId: selectedBranchId,
    });
  };

  const selectedBranch = allBranches?.find((b) => b.id === selectedBranchId);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 px-0 sm:px-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-11 w-11 touch-manipulation">
          <Link href={`/projects/${projectId}/environments`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">New Environment</h1>
          <p className="text-muted-foreground mt-1">
            {project?.name} - Create a deployment environment
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-4.5 w-4.5 text-primary" />
            </div>
            Environment Details
          </CardTitle>
          <CardDescription className="ml-11.5">
            Environments connect your SDK to specific branches. Common
            environments include &quot;production&quot;, &quot;staging&quot;,
            and &quot;development&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Environment Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Production"
                className="h-11 w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                Slug
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="production"
                pattern="^[a-z0-9-]+$"
                className="h-11 w-full font-mono"
                required
              />
              <p className="text-sm text-muted-foreground">
                Used in SDK configuration to identify this environment
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="text-sm font-medium">
                Initial Branch
              </Label>
              {branchesLoading ? (
                <div className="h-11 px-3 py-2 border rounded-lg bg-muted/50 flex items-center text-muted-foreground text-sm">
                  Loading branches...
                </div>
              ) : allBranches && allBranches.length > 0 ? (
                <select
                  id="branch"
                  value={selectedBranchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-11 px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  {allBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.spaceName} / {branch.name}
                      {branch.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-11 px-3 py-2 border rounded-lg bg-muted/50 flex items-center text-muted-foreground text-sm">
                  No branches available. Create a space first.
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                The branch that this environment will serve translations from
              </p>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">
                  Ready for SDK integration
                </p>
                <p className="text-sm text-muted-foreground">
                  After creating this environment, you can use its slug in your
                  SDK configuration to fetch translations from the selected
                  branch.
                </p>
              </div>
            </div>

            {/* Preview */}
            {name && slug && selectedBranch && (
              <div className="p-4 rounded-xl border bg-muted/30 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-warm" />
                  Preview
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slug:</span>{' '}
                    <span className="font-mono">{slug}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-medium">
                      {selectedBranch.spaceName} / {selectedBranch.name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-11 w-full sm:w-auto touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !name ||
                  !slug ||
                  !selectedBranchId ||
                  !allBranches?.length
                }
                className="h-11 w-full sm:w-auto touch-manipulation gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Environment
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
