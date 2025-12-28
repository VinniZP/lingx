/**
 * Merge Service
 *
 * Handles branch merging with conflict detection and resolution.
 * Per Design Doc: AC-WEB-015 - Merge with conflicts and resolution
 */
import { PrismaClient } from '@prisma/client';
import { DiffService, TranslationMap, ConflictEntry } from './diff.service.js';

export interface Resolution {
  key: string;
  resolution: 'source' | 'target' | TranslationMap;
}

export interface MergeRequest {
  targetBranchId: string;
  resolutions?: Resolution[];
}

export interface MergeResult {
  success: boolean;
  merged: number;
  conflicts?: ConflictEntry[];
}

export class MergeService {
  private diffService: DiffService;

  constructor(private prisma: PrismaClient) {
    this.diffService = new DiffService(prisma);
  }

  /**
   * Merge source branch into target branch
   *
   * Process:
   * 1. Compute diff to identify changes
   * 2. If conflicts exist and no resolutions provided, return conflicts
   * 3. Apply non-conflicting changes (added, modified)
   * 4. Apply conflict resolutions
   *
   * @param sourceBranchId - Branch with changes to merge
   * @param request - Merge request with target branch and optional resolutions
   * @returns Merge result with success status and merged count
   * @throws NotFoundError if branches don't exist
   * @throws ValidationError if branches are from different spaces
   */
  async merge(sourceBranchId: string, request: MergeRequest): Promise<MergeResult> {
    const { targetBranchId, resolutions = [] } = request;

    // Compute diff
    const diff = await this.diffService.computeDiff(sourceBranchId, targetBranchId);

    // Check for unresolved conflicts
    if (diff.conflicts.length > 0) {
      const resolutionMap = new Map(resolutions.map((r) => [r.key, r.resolution]));

      // Check if all conflicts have resolutions
      const unresolvedConflicts = diff.conflicts.filter(
        (c) => !resolutionMap.has(c.key)
      );

      if (unresolvedConflicts.length > 0) {
        return {
          success: false,
          merged: 0,
          conflicts: unresolvedConflicts,
        };
      }
    }

    // Apply changes in a transaction
    let mergedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // Apply added keys (copy from source to target)
      for (const added of diff.added) {
        // Create key in target branch
        const newKey = await tx.translationKey.create({
          data: {
            branchId: targetBranchId,
            name: added.key,
          },
        });

        // Create translations
        for (const [language, value] of Object.entries(added.translations)) {
          await tx.translation.create({
            data: {
              keyId: newKey.id,
              language,
              value,
            },
          });
        }
        mergedCount++;
      }

      // Apply modified keys (update target with source values)
      for (const modified of diff.modified) {
        const targetKey = await tx.translationKey.findFirst({
          where: { branchId: targetBranchId, name: modified.key },
        });

        if (targetKey) {
          // Update each language
          for (const [language, value] of Object.entries(modified.source)) {
            await tx.translation.upsert({
              where: {
                keyId_language: { keyId: targetKey.id, language },
              },
              update: { value },
              create: {
                keyId: targetKey.id,
                language,
                value,
              },
            });
          }
          mergedCount++;
        }
      }

      // Apply conflict resolutions
      for (const conflict of diff.conflicts) {
        const resolutionEntry = resolutions.find((r) => r.key === conflict.key);
        if (!resolutionEntry) continue;

        const targetKey = await tx.translationKey.findFirst({
          where: { branchId: targetBranchId, name: conflict.key },
        });

        if (!targetKey) continue;

        let valuesToApply: TranslationMap;

        if (resolutionEntry.resolution === 'source') {
          valuesToApply = conflict.source;
        } else if (resolutionEntry.resolution === 'target') {
          // Keep target values - no changes needed
          continue;
        } else {
          // Custom values
          valuesToApply = resolutionEntry.resolution;
        }

        // Apply resolved values
        for (const [language, value] of Object.entries(valuesToApply)) {
          await tx.translation.upsert({
            where: {
              keyId_language: { keyId: targetKey.id, language },
            },
            update: { value },
            create: {
              keyId: targetKey.id,
              language,
              value,
            },
          });
        }
        mergedCount++;
      }

      // Note: Deleted keys are not automatically removed during merge
      // This is a design decision to prevent accidental data loss
      // Users can manually delete keys if needed
    });

    return {
      success: true,
      merged: mergedCount,
    };
  }

  /**
   * Preview merge without applying changes
   * Useful for UI to show what would happen
   */
  async previewMerge(sourceBranchId: string, targetBranchId: string) {
    return this.diffService.computeDiff(sourceBranchId, targetBranchId);
  }
}
