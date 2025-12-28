import { Command } from 'commander';
import { credentialStore } from '../../lib/auth.js';
import { logger } from '../../utils/logger.js';

interface LogoutOptions {
  profile?: string;
  all?: boolean;
}

export function createLogoutCommand(): Command {
  return new Command('logout')
    .description('Remove stored credentials')
    .option('-p, --profile <name>', 'Profile name')
    .option('-a, --all', 'Remove all profiles')
    .action(async (options: LogoutOptions) => {
      try {
        await logout(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Logout failed');
        process.exit(1);
      }
    });
}

async function logout(options: LogoutOptions): Promise<void> {
  if (options.all) {
    credentialStore.clear();
    logger.success('All credentials removed');
    return;
  }

  const profile = options.profile ?? credentialStore.getDefaultProfile();
  const credentials = credentialStore.getCredentials(profile);

  if (!credentials) {
    logger.warn(`No credentials found for profile "${profile}"`);
    return;
  }

  credentialStore.deleteCredentials(profile);
  logger.success(`Logged out from profile "${profile}"`);
}
