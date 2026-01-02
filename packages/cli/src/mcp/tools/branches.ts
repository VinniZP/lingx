import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { BranchResponse, BranchDiffResponse, MergeResponse } from '@lingx/shared';
import { loadConfig } from '../../lib/config.js';
import { createApiClientFromConfig, ApiError } from '../../lib/api.js';

/**
 * Helper to create a text result for MCP tools.
 */
function textResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

/**
 * Helper to create a JSON result for MCP tools.
 */
function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Helper to get space ID from project/space slugs.
 */
async function getSpaceId(
  client: ReturnType<typeof createApiClientFromConfig> extends Promise<infer T> ? T : never,
  project: string,
  space: string
): Promise<string> {
  const spaces = await client.get<{ spaces: { id: string; slug: string }[] }>(
    `/api/projects/${project}/spaces`
  );
  const targetSpace = spaces.spaces.find((s) => s.slug === space);
  if (!targetSpace) {
    throw new Error(`Space "${space}" not found in project "${project}"`);
  }
  return targetSpace.id;
}

/**
 * Helper to get branch ID from space/branch names.
 */
async function getBranchId(
  client: ReturnType<typeof createApiClientFromConfig> extends Promise<infer T> ? T : never,
  spaceId: string,
  branchName: string
): Promise<string> {
  const spaceDetails = await client.get<{
    branches: { id: string; name: string }[];
  }>(`/api/spaces/${spaceId}`);
  const branch = spaceDetails.branches.find((b) => b.name === branchName);
  if (!branch) {
    throw new Error(`Branch "${branchName}" not found`);
  }
  return branch.id;
}

/**
 * Register branch tools: list, create, diff, merge.
 */
export function registerBranchTools(server: McpServer): void {
  const cwd = process.cwd();

  // lingx_branch_list - List branches in a space
  server.tool(
    'lingx_branch_list',
    'List all branches in a Lingx space.',
    {
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
    },
    async (args) => {
      try {
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;

        if (!project) {
          return textResult('Error: Project is required.');
        }
        if (!space) {
          return textResult('Error: Space is required.');
        }

        const client = await createApiClientFromConfig(cwd);
        const spaceId = await getSpaceId(client, project, space);

        const result = await client.get<{ branches: BranchResponse[] }>(
          `/api/spaces/${spaceId}/branches`
        );

        const branches = result.branches.map((branch) => ({
          name: branch.name,
          isDefault: branch.isDefault,
          keyCount: branch.keyCount,
          createdAt: branch.createdAt,
        }));

        return jsonResult({
          project,
          space,
          branches,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error listing branches: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_branch_create - Create a new branch
  server.tool(
    'lingx_branch_create',
    'Create a new translation branch, copying keys from a source branch.',
    {
      name: z.string().describe('New branch name'),
      from: z.string().optional().describe('Source branch (default: main)'),
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
    },
    async (args) => {
      try {
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const fromBranch = args.from ?? 'main';

        if (!project) {
          return textResult('Error: Project is required.');
        }
        if (!space) {
          return textResult('Error: Space is required.');
        }

        const client = await createApiClientFromConfig(cwd);
        const spaceId = await getSpaceId(client, project, space);
        const sourceBranchId = await getBranchId(client, spaceId, fromBranch);

        const result = await client.post<{ id: string; name: string; keyCount?: number }>(
          `/api/spaces/${spaceId}/branches`,
          {
            name: args.name,
            fromBranchId: sourceBranchId,
          }
        );

        return jsonResult({
          success: true,
          name: result.name,
          from: fromBranch,
          keyCount: result.keyCount ?? 0,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error creating branch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_branch_diff - Compare two branches
  server.tool(
    'lingx_branch_diff',
    'Compare two branches and show differences in translations.',
    {
      source: z.string().describe('Source branch name'),
      target: z.string().optional().describe('Target branch (default: main)'),
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
    },
    async (args) => {
      try {
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const target = args.target ?? 'main';

        if (!project) {
          return textResult('Error: Project is required.');
        }
        if (!space) {
          return textResult('Error: Space is required.');
        }

        const client = await createApiClientFromConfig(cwd);
        const spaceId = await getSpaceId(client, project, space);
        const sourceBranchId = await getBranchId(client, spaceId, args.source);
        const targetBranchId = await getBranchId(client, spaceId, target);

        const diff = await client.get<BranchDiffResponse>(
          `/api/branches/${sourceBranchId}/diff/${targetBranchId}`
        );

        return jsonResult({
          source: args.source,
          target,
          added: diff.added.map((entry) => ({
            key: entry.key,
            translations: entry.translations,
          })),
          deleted: diff.deleted.map((entry) => ({
            key: entry.key,
          })),
          modified: diff.modified.map((entry) => ({
            key: entry.key,
            source: entry.source,
            target: entry.target,
          })),
          conflicts: diff.conflicts.map((entry) => ({
            key: entry.key,
            source: entry.source,
            target: entry.target,
          })),
          summary: {
            added: diff.added.length,
            deleted: diff.deleted.length,
            modified: diff.modified.length,
            conflicts: diff.conflicts.length,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error computing diff: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // lingx_branch_merge - Merge a branch into another
  server.tool(
    'lingx_branch_merge',
    'Merge a source branch into a target branch.',
    {
      source: z.string().describe('Source branch name'),
      into: z.string().optional().describe('Target branch (default: main)'),
      force: z.boolean().optional().describe('Force merge, overwrite conflicts with source values'),
      resolutions: z
        .array(
          z.object({
            key: z.string(),
            resolution: z.enum(['source', 'target']),
          })
        )
        .optional()
        .describe('Conflict resolutions'),
      project: z.string().optional().describe('Project slug'),
      space: z.string().optional().describe('Space slug'),
    },
    async (args) => {
      try {
        const config = await loadConfig(cwd);
        const project = args.project ?? config.project;
        const space = args.space ?? config.defaultSpace;
        const target = args.into ?? 'main';

        if (!project) {
          return textResult('Error: Project is required.');
        }
        if (!space) {
          return textResult('Error: Space is required.');
        }

        const client = await createApiClientFromConfig(cwd);
        const spaceId = await getSpaceId(client, project, space);
        const sourceBranchId = await getBranchId(client, spaceId, args.source);
        const targetBranchId = await getBranchId(client, spaceId, target);

        // First check for conflicts
        const diff = await client.get<BranchDiffResponse>(
          `/api/branches/${sourceBranchId}/diff/${targetBranchId}`
        );

        // Handle conflicts
        let resolutions = args.resolutions ?? [];

        if (diff.conflicts.length > 0) {
          if (args.force) {
            // Force: use source values for all conflicts
            resolutions = diff.conflicts.map((c) => ({
              key: c.key,
              resolution: 'source' as const,
            }));
          } else if (resolutions.length === 0) {
            // No resolutions provided and not forcing
            return jsonResult({
              success: false,
              message: 'Conflicts detected. Provide resolutions or use force=true.',
              conflicts: diff.conflicts.map((c) => ({
                key: c.key,
                source: c.source,
                target: c.target,
              })),
            });
          }
        }

        // Perform merge
        const result = await client.post<MergeResponse>(
          `/api/branches/${sourceBranchId}/merge`,
          {
            targetBranchId,
            resolutions: resolutions.length > 0 ? resolutions : undefined,
          }
        );

        if (result.success) {
          return jsonResult({
            success: true,
            source: args.source,
            target,
            merged: result.merged,
            conflictsResolved: resolutions.length,
          });
        } else {
          return jsonResult({
            success: false,
            source: args.source,
            target,
            message: 'Merge failed',
            unresolvedConflicts: result.conflicts?.length ?? 0,
          });
        }
      } catch (error) {
        if (error instanceof ApiError) {
          return textResult(`API Error (${error.code}): ${error.message}`);
        }
        return textResult(`Error merging branches: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
