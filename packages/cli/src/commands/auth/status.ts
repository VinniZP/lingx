import { Command } from 'commander';
import chalk from 'chalk';
import { credentialStore } from '../../lib/auth.js';
import { ApiClient } from '../../lib/api.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface StatusOptions {
  profile?: string;
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show current authentication status')
    .option('-p, --profile <name>', 'Profile name')
    .action(async (options: StatusOptions) => {
      try {
        await status(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Status check failed');
        process.exit(1);
      }
    });
}

async function status(options: StatusOptions): Promise<void> {
  const profile = options.profile ?? credentialStore.getDefaultProfile();
  const credentials = credentialStore.getCredentials(profile);

  if (!credentials) {
    logger.info('Not logged in');
    console.log();
    console.log('Run', chalk.cyan('lf auth login'), 'to authenticate');
    return;
  }

  console.log();
  console.log(chalk.bold('Profile:'), profile);
  console.log(chalk.bold('API URL:'), credentials.apiUrl);
  console.log(chalk.bold('API Key:'), credentials.apiKey.substring(0, 12) + '...');
  if (credentials.email) {
    console.log(chalk.bold('Email:'), credentials.email);
  }
  if (credentials.createdAt) {
    console.log(chalk.bold('Saved at:'), new Date(credentials.createdAt).toLocaleString());
  }
  console.log();

  // Verify credentials are still valid
  const spinner = createSpinner('Verifying credentials...');
  spinner.start();

  try {
    const client = new ApiClient(credentials);
    const user = await client.get<{ id: string; email: string; name: string }>(
      '/api/auth/me'
    );
    spinner.succeed(`Authenticated as ${user.email}`);
  } catch {
    spinner.fail('Credentials are invalid or expired');
    logger.warn('Run "lf auth login" to re-authenticate');
  }
}
