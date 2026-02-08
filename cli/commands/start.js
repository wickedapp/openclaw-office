import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

export async function startCommand(options) {
  const configPath = 'openclaw-office.config.json';
  if (!existsSync(configPath)) {
    console.log(chalk.red('\n  ❌ No configuration found. Run `openclaw-office init` first.\n'));
    process.exit(1);
  }

  const port = options.port || 4200;
  console.log(chalk.cyan(`\n  🚀 Starting OpenClaw Office on port ${port}...\n`));

  try {
    execSync(`npx next start -p ${port}`, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}
