import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';

export async function agentsCommand() {
  const configPath = 'openclaw-office.config.json';
  if (!existsSync(configPath)) {
    console.log(chalk.red('\n  ❌ No configuration found. Run `openclaw-office init` first.\n'));
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const agents = config.agents || [];

  console.log();
  console.log(chalk.bold.cyan('  🏢 Configured Agents'));
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━'));
  console.log();

  if (agents.length === 0) {
    console.log(chalk.dim('  No agents configured. Run `openclaw-office init` to discover agents.'));
  } else {
    for (const a of agents) {
      const emoji = a.emoji || '🤖';
      const color = a.color || '#6366f1';
      console.log(`    ${emoji} ${chalk.hex(color).bold(a.name)} — ${chalk.dim(a.role || 'Agent')}`);
    }
  }
  console.log();
}
