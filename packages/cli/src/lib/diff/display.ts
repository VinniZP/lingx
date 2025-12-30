import chalk from 'chalk';
import type { BranchDiffResponse } from '@localeflow/shared';

export function formatDiffOutput(diff: BranchDiffResponse): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold(`Comparing: ${diff.source.name} -> ${diff.target.name}`));
  lines.push(chalk.gray('-'.repeat(50)));
  lines.push('');

  const hasChanges =
    diff.added.length > 0 ||
    diff.modified.length > 0 ||
    diff.deleted.length > 0 ||
    diff.conflicts.length > 0;

  if (!hasChanges) {
    lines.push(chalk.green('No changes between branches'));
    return lines.join('\n');
  }

  // Summary
  lines.push(chalk.bold('Summary:'));
  if (diff.added.length > 0) {
    lines.push(`  ${chalk.green('+')} ${diff.added.length} added`);
  }
  if (diff.modified.length > 0) {
    lines.push(`  ${chalk.yellow('~')} ${diff.modified.length} modified`);
  }
  if (diff.deleted.length > 0) {
    lines.push(`  ${chalk.red('-')} ${diff.deleted.length} deleted`);
  }
  if (diff.conflicts.length > 0) {
    lines.push(`  ${chalk.magenta('!')} ${diff.conflicts.length} conflicts`);
  }
  lines.push('');

  // Added keys
  if (diff.added.length > 0) {
    lines.push(chalk.green.bold('Added:'));
    for (const entry of diff.added) {
      lines.push(`  ${chalk.green('+')} ${entry.key}`);
      for (const [lang, value] of Object.entries(entry.translations)) {
        lines.push(chalk.gray(`      [${lang}] "${truncate(value, 50)}"`));
      }
    }
    lines.push('');
  }

  // Modified keys
  if (diff.modified.length > 0) {
    lines.push(chalk.yellow.bold('Modified:'));
    for (const entry of diff.modified) {
      lines.push(`  ${chalk.yellow('~')} ${entry.key}`);
      for (const lang of new Set([
        ...Object.keys(entry.source),
        ...Object.keys(entry.target),
      ])) {
        const sourceVal = entry.source[lang];
        const targetVal = entry.target[lang];
        if (sourceVal !== targetVal) {
          lines.push(chalk.gray(`      [${lang}]`));
          if (targetVal) {
            lines.push(chalk.red(`        - "${truncate(targetVal, 40)}"`));
          }
          if (sourceVal) {
            lines.push(chalk.green(`        + "${truncate(sourceVal, 40)}"`));
          }
        }
      }
    }
    lines.push('');
  }

  // Deleted keys
  if (diff.deleted.length > 0) {
    lines.push(chalk.red.bold('Deleted:'));
    for (const entry of diff.deleted) {
      lines.push(`  ${chalk.red('-')} ${entry.key}`);
      for (const [lang, value] of Object.entries(entry.translations)) {
        lines.push(chalk.gray(`      [${lang}] "${truncate(value, 50)}"`));
      }
    }
    lines.push('');
  }

  // Conflicts
  if (diff.conflicts.length > 0) {
    lines.push(chalk.magenta.bold('Conflicts:'));
    for (const entry of diff.conflicts) {
      lines.push(`  ${chalk.magenta('!')} ${entry.key}`);
      for (const lang of new Set([
        ...Object.keys(entry.source),
        ...Object.keys(entry.target),
      ])) {
        const sourceVal = entry.source[lang];
        const targetVal = entry.target[lang];
        if (sourceVal !== targetVal) {
          lines.push(chalk.gray(`      [${lang}]`));
          lines.push(chalk.cyan(`        source: "${truncate(sourceVal ?? '', 40)}"`));
          lines.push(chalk.yellow(`        target: "${truncate(targetVal ?? '', 40)}"`));
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
