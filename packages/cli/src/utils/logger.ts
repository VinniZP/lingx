import chalk from 'chalk';

export const logger = {
  info: (message: string): void => {
    console.log(chalk.blue('info'), message);
  },
  success: (message: string): void => {
    console.log(chalk.green('success'), message);
  },
  warn: (message: string): void => {
    console.log(chalk.yellow('warn'), message);
  },
  error: (message: string): void => {
    console.error(chalk.red('error'), message);
  },
  debug: (message: string): void => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('debug'), message);
    }
  },
};
