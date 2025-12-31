/**
 * Interactive Conflict Resolver
 *
 * Shared utility for resolving translation conflicts interactively.
 * Used by push and sync commands.
 */

import { select } from '@inquirer/prompts';
import chalk from 'chalk';

export interface TranslationConflict {
  lang: string;
  key: string;
  localValue: string;
  remoteValue: string;
}

export type ConflictResolution = 'local' | 'remote';

export interface ResolvedConflict extends TranslationConflict {
  resolution: ConflictResolution;
}

export interface ConflictResolutionResult {
  /** Conflicts resolved in favor of local value */
  useLocal: TranslationConflict[];
  /** Conflicts resolved in favor of remote value */
  useRemote: TranslationConflict[];
  /** All resolved conflicts with their resolutions */
  resolved: ResolvedConflict[];
}

export type ConflictMode = 'push' | 'sync';

interface ResolverOptions {
  /** Mode affects the wording of prompts */
  mode: ConflictMode;
  /** If true, automatically choose local values for all conflicts */
  forceLocal?: boolean;
  /** If true, automatically choose remote values for all conflicts */
  forceRemote?: boolean;
}

/**
 * Resolve conflicts interactively with user prompts.
 *
 * @param conflicts - Array of conflicts to resolve
 * @param options - Resolution options
 * @returns Resolved conflicts grouped by resolution
 */
export async function resolveConflicts(
  conflicts: TranslationConflict[],
  options: ResolverOptions
): Promise<ConflictResolutionResult> {
  const { mode, forceLocal, forceRemote } = options;

  // Handle force modes
  if (forceLocal || conflicts.length === 0) {
    return {
      useLocal: conflicts,
      useRemote: [],
      resolved: conflicts.map((c) => ({ ...c, resolution: 'local' as const })),
    };
  }

  if (forceRemote) {
    return {
      useLocal: [],
      useRemote: conflicts,
      resolved: conflicts.map((c) => ({ ...c, resolution: 'remote' as const })),
    };
  }

  const useLocal: TranslationConflict[] = [];
  const useRemote: TranslationConflict[] = [];
  const resolved: ResolvedConflict[] = [];

  let localToAll = false;
  let remoteToAll = false;

  // Mode-specific labels
  const labels =
    mode === 'push'
      ? {
          title: 'Found conflicts (local differs from server):',
          subtitle: 'For each conflict, choose which value to keep on the server.',
          localLabel: 'Local',
          remoteLabel: 'Server',
          localAction: 'Use local (update server)',
          remoteAction: 'Use server (keep current)',
          localAllAction: 'Use local for all remaining',
          remoteAllAction: 'Use server for all remaining',
        }
      : {
          title: 'Found conflicts between local and remote:',
          subtitle: 'For each conflict, choose which value to keep.',
          localLabel: 'Local',
          remoteLabel: 'Remote',
          localAction: 'Use local value',
          remoteAction: 'Use remote value',
          localAllAction: 'Use local for all remaining',
          remoteAllAction: 'Use remote for all remaining',
        };

  console.log();
  console.log(chalk.bold(`${labels.title} ${conflicts.length} conflict(s)`));
  console.log(chalk.gray(labels.subtitle));
  console.log();

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i];

    if (remoteToAll) {
      useRemote.push(conflict);
      resolved.push({ ...conflict, resolution: 'remote' });
      continue;
    }

    if (localToAll) {
      useLocal.push(conflict);
      resolved.push({ ...conflict, resolution: 'local' });
      continue;
    }

    // Display conflict
    console.log(chalk.cyan(`[${i + 1}/${conflicts.length}] ${conflict.key}`));
    console.log(chalk.gray(`  Language: ${conflict.lang}`));
    console.log(`  ${chalk.yellow(labels.remoteLabel + ':')} "${truncate(conflict.remoteValue, 60)}"`);
    console.log(`  ${chalk.green(labels.localLabel + ':')}  "${truncate(conflict.localValue, 60)}"`);

    const action = await select({
      message: 'Which value should be used?',
      choices: [
        { name: labels.localAction, value: 'local' },
        { name: labels.remoteAction, value: 'remote' },
        { name: labels.localAllAction, value: 'local-all' },
        { name: labels.remoteAllAction, value: 'remote-all' },
      ],
    });

    switch (action) {
      case 'local':
        useLocal.push(conflict);
        resolved.push({ ...conflict, resolution: 'local' });
        break;
      case 'remote':
        useRemote.push(conflict);
        resolved.push({ ...conflict, resolution: 'remote' });
        break;
      case 'local-all':
        localToAll = true;
        useLocal.push(conflict);
        resolved.push({ ...conflict, resolution: 'local' });
        break;
      case 'remote-all':
        remoteToAll = true;
        useRemote.push(conflict);
        resolved.push({ ...conflict, resolution: 'remote' });
        break;
    }

    console.log();
  }

  // Summary
  if (useLocal.length > 0 || useRemote.length > 0) {
    console.log(chalk.bold('Resolution summary:'));
    if (useLocal.length > 0) {
      console.log(chalk.green(`  ${useLocal.length} conflict(s) → use local`));
    }
    if (useRemote.length > 0) {
      console.log(chalk.blue(`  ${useRemote.length} conflict(s) → use remote`));
    }
    console.log();
  }

  return { useLocal, useRemote, resolved };
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
