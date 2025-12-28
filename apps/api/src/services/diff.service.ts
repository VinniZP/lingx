/**
 * Diff Service
 *
 * Computes differences between two branches.
 * Per ADR-0002: Uses copy-on-write storage, each branch has complete data.
 * Per Design Doc: AC-WEB-014 - Diff shows added, modified, deleted keys
 */
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../plugins/error-handler.js';

export interface TranslationMap {
  [language: string]: string;
}

export interface DiffEntry {
  key: string;
  translations: TranslationMap;
}

export interface ModifiedEntry {
  key: string;
  source: TranslationMap;
  target: TranslationMap;
}

export interface ConflictEntry {
  key: string;
  source: TranslationMap;
  target: TranslationMap;
}

export interface BranchDiffResult {
  source: { id: string; name: string };
  target: { id: string; name: string };
  added: DiffEntry[];
  modified: ModifiedEntry[];
  deleted: DiffEntry[];
  conflicts: ConflictEntry[];
}

interface KeyWithTranslations {
  id: string;
  name: string;
  translations: Array<{ language: string; value: string }>;
}

export class DiffService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compute diff between source and target branches
   *
   * Terminology (from source's perspective when merging into target):
   * - Added: Keys in source but not in target
   * - Modified: Keys in both with different values (non-conflict)
   * - Deleted: Keys in target but not in source
   * - Conflicts: Keys modified in both branches since divergence
   *
   * Conflict detection: When source was branched from target and both have
   * different values for the same key, it's considered a conflict.
   *
   * @param sourceBranchId - Branch with changes to merge
   * @param targetBranchId - Branch receiving changes
   * @returns Diff result with categorized changes
   * @throws NotFoundError if either branch doesn't exist
   * @throws ValidationError if branches are from different spaces
   */
  async computeDiff(
    sourceBranchId: string,
    targetBranchId: string
  ): Promise<BranchDiffResult> {
    // Load source branch with space info
    const sourceBranch = await this.prisma.branch.findUnique({
      where: { id: sourceBranchId },
      select: {
        id: true,
        name: true,
        spaceId: true,
        sourceBranchId: true,
      },
    });

    if (!sourceBranch) {
      throw new NotFoundError('Source branch');
    }

    // Load target branch
    const targetBranch = await this.prisma.branch.findUnique({
      where: { id: targetBranchId },
      select: {
        id: true,
        name: true,
        spaceId: true,
      },
    });

    if (!targetBranch) {
      throw new NotFoundError('Target branch');
    }

    // Verify branches are in same space
    if (sourceBranch.spaceId !== targetBranch.spaceId) {
      throw new ValidationError('Branches must be in the same space');
    }

    // Load all keys with translations from both branches
    const [sourceKeys, targetKeys] = await Promise.all([
      this.loadBranchKeys(sourceBranchId),
      this.loadBranchKeys(targetBranchId),
    ]);

    // Build lookup maps for O(1) access
    const sourceMap = new Map<string, TranslationMap>();
    for (const key of sourceKeys) {
      sourceMap.set(key.name, this.toTranslationMap(key.translations));
    }

    const targetMap = new Map<string, TranslationMap>();
    for (const key of targetKeys) {
      targetMap.set(key.name, this.toTranslationMap(key.translations));
    }

    // Categorize changes
    const added: DiffEntry[] = [];
    const modified: ModifiedEntry[] = [];
    const deleted: DiffEntry[] = [];
    const conflicts: ConflictEntry[] = [];

    // Check source keys
    for (const [keyName, sourceTranslations] of sourceMap) {
      const targetTranslations = targetMap.get(keyName);

      if (!targetTranslations) {
        // Key only in source -> added
        added.push({
          key: keyName,
          translations: sourceTranslations,
        });
      } else if (!this.translationsEqual(sourceTranslations, targetTranslations)) {
        // Key in both but different values
        // Check if this is a conflict (source was branched from target)
        if (sourceBranch.sourceBranchId === targetBranchId) {
          // Source was branched from target
          // Both have different values from original -> conflict
          conflicts.push({
            key: keyName,
            source: sourceTranslations,
            target: targetTranslations,
          });
        } else {
          // Not a direct child branch, treat as simple modification
          modified.push({
            key: keyName,
            source: sourceTranslations,
            target: targetTranslations,
          });
        }
      }
      // If translations are equal, no change to report
    }

    // Check for deleted keys (in target but not in source)
    for (const [keyName, targetTranslations] of targetMap) {
      if (!sourceMap.has(keyName)) {
        deleted.push({
          key: keyName,
          translations: targetTranslations,
        });
      }
    }

    return {
      source: { id: sourceBranch.id, name: sourceBranch.name },
      target: { id: targetBranch.id, name: targetBranch.name },
      added,
      modified,
      deleted,
      conflicts,
    };
  }

  /**
   * Load all keys with translations for a branch
   */
  private async loadBranchKeys(branchId: string): Promise<KeyWithTranslations[]> {
    return this.prisma.translationKey.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        translations: {
          select: {
            language: true,
            value: true,
          },
        },
      },
    });
  }

  /**
   * Convert translations array to map
   */
  private toTranslationMap(
    translations: Array<{ language: string; value: string }>
  ): TranslationMap {
    const map: TranslationMap = {};
    for (const t of translations) {
      map[t.language] = t.value;
    }
    return map;
  }

  /**
   * Compare two translation maps for equality
   */
  private translationsEqual(a: TranslationMap, b: TranslationMap): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (a[key] !== b[key]) {
        return false;
      }
    }

    return true;
  }
}
