import { Command } from 'commander';
import inquirer from 'inquirer';
import { credentialStore } from '../../lib/auth.js';
import { ApiClient } from '../../lib/api.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

interface LoginOptions {
  apiUrl?: string;
  apiKey?: string;
  profile?: string;
}

export function createLoginCommand(): Command {
  return new Command('login')
    .description('Login and store API credentials')
    .option('-u, --api-url <url>', 'API URL')
    .option('-k, --api-key <key>', 'API key')
    .option('-p, --profile <name>', 'Profile name', 'default')
    .action(async (options: LoginOptions) => {
      try {
        await login(options);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : 'Login failed');
        process.exit(1);
      }
    });
}

async function login(options: LoginOptions): Promise<void> {
  // Get API URL
  let apiUrl = options.apiUrl;
  if (!apiUrl) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: 'http://localhost:3001',
      },
    ]);
    apiUrl = answers.apiUrl;
  }

  // Get API Key
  let apiKey = options.apiKey;
  if (!apiKey) {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key (starts with lf_):',
        mask: '*',
        validate: (input: string) => {
          if (!input.startsWith('lf_')) {
            return 'API key should start with "lf_"';
          }
          return true;
        },
      },
    ]);
    apiKey = answers.apiKey;
  }

  // Validate credentials
  const spinner = createSpinner('Validating credentials...');
  spinner.start();

  try {
    const client = new ApiClient({ apiUrl: apiUrl!, apiKey: apiKey! });
    const user = await client.get<{ id: string; email: string; name: string }>(
      '/api/auth/me'
    );

    // Save credentials
    credentialStore.saveCredentials(options.profile ?? 'default', {
      apiUrl: apiUrl!,
      apiKey: apiKey!,
      userId: user.id,
      email: user.email,
    });

    if (options.profile && options.profile !== 'default') {
      credentialStore.setDefaultProfile(options.profile);
    }

    spinner.succeed(`Logged in as ${user.email}`);
    logger.info(`Credentials saved to profile "${options.profile ?? 'default'}"`);
  } catch (error) {
    spinner.fail('Authentication failed');
    throw error;
  }
}
