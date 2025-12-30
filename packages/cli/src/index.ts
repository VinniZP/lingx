#!/usr/bin/env node
import { createCLI } from './cli.js';

// Re-export types for use in config files
export type { LocaleflowConfig } from './lib/config.js';

const program = createCLI();
program.parse();
