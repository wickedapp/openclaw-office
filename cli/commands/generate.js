import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateOfficeImage } from '../lib/image-gen.js';
import { detectPositions } from '../lib/position-detect.js';

export async function generateCommand(options) {
  const cwd = process.cwd();
  const configPath = join(cwd, 'openclaw-office.config.json');

  if (!existsSync(configPath)) {
    console.log(chalk.red('\n  ❌ No config found. Run `openclaw-office init` first.\n'));
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const agents = config.agents || [];
  const style = options.style || config.style?.theme || 'cyberpunk';
  const customDescription = config.style?.customDescription;

  if (agents.length === 0) {
    console.log(chalk.yellow('\n  ⚠️  No agents in config. Add agents first.\n'));
    process.exit(1);
  }

  // Load API key from env
  let envVars = {};
  const envPath = join(cwd, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) envVars[m[1]] = m[2];
    }
  }

  const googleKey = envVars.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = envVars.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  console.log();
  console.log(chalk.bold.cyan('  🎨 Office Image Generator'));
  console.log(chalk.dim(`  Style: ${style} | Agents: ${agents.length}`));
  console.log();

  // Generate image
  const genSpinner = ora('Generating office scene...').start();
  const result = await generateOfficeImage({
    agents,
    style,
    customDescription,
    apiKey: googleKey,
    cwd,
  });

  if (result.generated) {
    genSpinner.succeed(chalk.green('Office image generated!'));
  } else {
    genSpinner.warn(chalk.yellow(`Using default image (${result.error || 'generation skipped'})`));
  }

  // Detect positions
  const posSpinner = ora('Detecting agent positions...').start();
  const positions = await detectPositions(result.imagePath, agents, { anthropicApiKey: anthropicKey });

  const detectedCount = Object.values(positions).filter(p => p.detected).length;
  if (detectedCount > 0) {
    posSpinner.succeed(chalk.green(`Detected ${detectedCount}/${agents.length} agent positions`));
  } else {
    posSpinner.info(chalk.dim('Using template positions'));
  }

  // Save positions to config
  config.agentPositions = positions;
  const { writeFileSync } = await import('fs');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log();
  for (const agent of agents) {
    const id = agent.id || agent.name;
    const pos = positions[id];
    if (pos) {
      console.log(`    ${agent.emoji || '🤖'} ${chalk.bold(agent.name)}: (${pos.x}%, ${pos.y}%)${pos.detected ? chalk.green(' ✓') : chalk.dim(' template')}`);
    }
  }
  console.log();
  console.log(chalk.green('  ✅ Config updated with agent positions.'));
  console.log();
}
