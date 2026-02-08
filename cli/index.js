#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { agentsCommand } from './commands/agents.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('openclaw-office')
  .description('Virtual AI Office Dashboard for OpenClaw')
  .version('0.1.0');

program
  .command('init')
  .description('Interactive setup wizard for OpenClaw Office')
  .option('--non-interactive', 'Skip prompts, use defaults')
  .action(initCommand);

program
  .command('start')
  .description('Start the OpenClaw Office dashboard')
  .option('-p, --port <port>', 'Port to run on')
  .action(startCommand);

program
  .command('status')
  .description('Show configuration and gateway connection status')
  .action(statusCommand);

program
  .command('agents')
  .description('List configured agents')
  .action(agentsCommand);

program
  .command('generate')
  .description('Generate or regenerate office image')
  .option('-s, --style <style>', 'Override style (cyberpunk, minimalist, cozy, corporate, custom)')
  .action(generateCommand);

// Graceful Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Setup cancelled. Run `openclaw-office init` to try again.\n'));
  process.exit(0);
});

program.parse();
