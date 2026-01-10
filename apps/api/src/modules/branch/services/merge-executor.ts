/**
 * Merge Executor
 *
 * Handles branch merging with conflict detection and resolution.
 * Per Design Doc: AC-WEB-015 - Merge with conflicts and resolution
 */
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { TranslationKeyRepository } from '../repositories/translation-key.repository.js';
import type { TranslationRepository } from '../repositories/translation.repository.js';
import type { ConflictEntry, DiffCalculator, TranslationMap } from './diff-calculator.js';

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

export class MergeExecutor {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly translationKeyRepository: TranslationKeyRepository,
    private readonly translationRepository: TranslationRepository,
    private readonly diffCalculator: DiffCalculator
  ) {}

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
    const diff = await this.diffCalculator.computeDiff(sourceBranchId, targetBranchId);

    // Check for unresolved conflicts
    if (diff.conflicts.length > 0) {
      const resolutionMap = new Map(resolutions.map((r) => [r.key, r.resolution]));

      // Check if all conflicts have resolutions
      const unresolvedConflicts = diff.conflicts.filter((c) => !resolutionMap.has(c.key));

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

    await this.branchRepository.transaction(async (tx) => {
      // Apply added keys (copy from source to target)
      for (const added of diff.added) {
        const newKey = await this.translationKeyRepository.create(targetBranchId, added.key, tx);
        await this.translationRepository.createMany(newKey.id, added.translations, tx);
        mergedCount++;
      }

      // Apply modified keys (update target with source values)
      for (const modified of diff.modified) {
        const targetKey = await this.translationKeyRepository.findByBranchIdAndName(
          targetBranchId,
          modified.key,
          tx
        );

        if (targetKey) {
          for (const [language, value] of Object.entries(modified.source)) {
            await this.translationRepository.upsert(targetKey.id, language, value, tx);
          }
          mergedCount++;
        }
      }

      // Apply conflict resolutions
      for (const conflict of diff.conflicts) {
        const resolutionEntry = resolutions.find((r) => r.key === conflict.key);
        if (!resolutionEntry) continue;

        const targetKey = await this.translationKeyRepository.findByBranchIdAndName(
          targetBranchId,
          conflict.key,
          tx
        );

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
          await this.translationRepository.upsert(targetKey.id, language, value, tx);
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
    return this.diffCalculator.computeDiff(sourceBranchId, targetBranchId);
  }
}
