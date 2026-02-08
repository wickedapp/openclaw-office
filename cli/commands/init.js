import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { connectGateway } from '../lib/gateway.js';
import { writeConfig, writeEnv, writeDeployConfig } from '../lib/generators.js';
import { generateOfficeImage } from '../lib/image-gen.js';
import { detectPositions } from '../lib/position-detect.js';

const STYLES = [
  { name: '🎮 Cyberpunk / Pixel Art (neon lights, dark theme)', value: 'cyberpunk' },
  { name: '🏢 Modern Minimalist (clean lines, light theme)', value: 'minimalist' },
  { name: '🏠 Cozy Studio (warm lighting, plants)', value: 'cozy' },
  { name: '🏦 Corporate (professional, blue tones)', value: 'corporate' },
  { name: '🎨 Custom (describe your own)', value: 'custom' },
];

const DEPLOY_METHODS = [
  { name: '🐳 Docker (recommended)', value: 'docker' },
  { name: '📦 PM2 (Node.js process manager)', value: 'pm2' },
  { name: '⚙️  systemd (Linux service)', value: 'systemd' },
  { name: '🍎 launchd (macOS service)', value: 'launchd' },
  { name: '🖥️  Manual (npm start)', value: 'manual' },
];

export async function initCommand(options) {
  const cwd = process.cwd();

  // ── Welcome ──
  console.log();
  console.log(chalk.bold.cyan('  🏢 OpenClaw Office Setup'));
  console.log(chalk.cyan('  ━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.dim('  Your virtual AI office dashboard'));
  console.log();

  // ── Gateway Connection ──
  const { gatewayUrl } = await inquirer.prompt({
    type: 'input',
    name: 'gatewayUrl',
    message: 'OpenClaw Gateway URL:',
    default: 'ws://127.0.0.1:18789',
  });

  const { gatewayToken } = await inquirer.prompt({
    type: 'password',
    name: 'gatewayToken',
    message: 'Gateway Token:',
    mask: '•',
  });

  // ── Try connecting ──
  let agents = [];
  let gatewayConnected = false;

  const spinner = ora('Connecting to gateway...').start();
  const result = await connectGateway(gatewayUrl, gatewayToken);

  if (result.connected) {
    spinner.succeed(chalk.green('Connected to gateway!'));
    gatewayConnected = true;
    agents = result.agents || [];
  } else {
    spinner.warn(chalk.yellow(`Could not connect: ${result.error || 'unknown error'}`));
    const { continueOffline } = await inquirer.prompt({
      type: 'confirm',
      name: 'continueOffline',
      message: 'Continue with offline setup?',
      default: true,
    });
    if (!continueOffline) {
      console.log(chalk.yellow('\n👋 Run `openclaw-office init` when your gateway is ready.\n'));
      process.exit(0);
    }
  }

  // ── Agent Discovery ──
  if (agents.length > 0) {
    console.log();
    console.log(chalk.bold(`  Found ${agents.length} agents:`));
    for (const a of agents) {
      console.log(`    ${a.emoji || '🤖'} ${chalk.bold(a.name)} — ${a.role || 'Agent'}`);
    }
    console.log();

    const { customizeAgents } = await inquirer.prompt({
      type: 'confirm',
      name: 'customizeAgents',
      message: 'Customize agent names/roles/colors?',
      default: false,
    });

    if (customizeAgents) {
      for (const agent of agents) {
        console.log(chalk.dim(`\n  Configuring ${agent.name}:`));
        const answers = await inquirer.prompt([
          { type: 'input', name: 'displayName', message: 'Display name:', default: agent.name },
          { type: 'input', name: 'role', message: 'Role:', default: agent.role || 'Agent' },
          { type: 'input', name: 'color', message: 'Color (hex):', default: agent.color || '#6366f1' },
        ]);
        Object.assign(agent, answers);
      }
    }
  } else {
    console.log(chalk.dim('\n  No agents discovered. You can add them later in the config.\n'));
  }

  // ── Office Style ──
  const { style } = await inquirer.prompt({
    type: 'list',
    name: 'style',
    message: 'Choose your office style:',
    choices: STYLES,
  });

  let customStyleDescription = '';
  if (style === 'custom') {
    const { desc } = await inquirer.prompt({
      type: 'input',
      name: 'desc',
      message: 'Describe your office style:',
    });
    customStyleDescription = desc;
  }

  // ── Google API Key ──
  const { googleApiKey } = await inquirer.prompt({
    type: 'password',
    name: 'googleApiKey',
    message: 'Google API Key for office image generation (Enter to skip):',
    mask: '•',
    default: '',
  });

  if (!googleApiKey) {
    console.log(chalk.dim('  Skipped — will use default office image.'));
  }

  // ── Anthropic API Key (optional, for position detection) ──
  const { anthropicApiKey } = await inquirer.prompt({
    type: 'password',
    name: 'anthropicApiKey',
    message: 'Anthropic API Key for position detection (Enter to skip):',
    mask: '•',
    default: '',
  });

  if (!anthropicApiKey) {
    console.log(chalk.dim('  Skipped — will use template positions.'));
  }

  // ── Telegram ──
  const { enableTelegram } = await inquirer.prompt({
    type: 'confirm',
    name: 'enableTelegram',
    message: 'Enable Telegram webhook integration?',
    default: false,
  });

  let telegramWebhookSecret = '';
  if (enableTelegram) {
    const ans = await inquirer.prompt({
      type: 'password',
      name: 'telegramWebhookSecret',
      message: 'Telegram webhook secret:',
      mask: '•',
    });
    telegramWebhookSecret = ans.telegramWebhookSecret;
  }

  // ── Deployment ──
  const { deployMethod } = await inquirer.prompt({
    type: 'list',
    name: 'deployMethod',
    message: 'How will you run OpenClaw Office?',
    choices: DEPLOY_METHODS,
  });

  // ── Port ──
  const { port } = await inquirer.prompt({
    type: 'number',
    name: 'port',
    message: 'Dashboard port:',
    default: 4200,
  });

  // ── Generate ──
  const genSpinner = ora('Generating configuration...').start();

  const config = {
    version: '0.1.0',
    gateway: { url: gatewayUrl, connected: gatewayConnected },
    agents: agents.map((a) => ({
      id: a.id || a.name,
      name: a.displayName || a.name,
      role: a.role || 'Agent',
      emoji: a.emoji || '🤖',
      color: a.color || '#6366f1',
    })),
    style: { theme: style, customDescription: customStyleDescription || undefined },
    telegram: { enabled: enableTelegram },
    deployment: { method: deployMethod, port },
  };

  writeConfig(cwd, config);
  writeEnv(cwd, { gatewayToken, googleApiKey, anthropicApiKey, telegramWebhookSecret });
  writeDeployConfig(cwd, deployMethod, config.deployment);

  genSpinner.succeed('Configuration generated!');

  // ── Image Generation ──
  let agentPositions = {};
  if (agents.length > 0) {
    const imgSpinner = ora('🎨 Generating your office scene...').start();
    const imgResult = await generateOfficeImage({
      agents: config.agents,
      style,
      customDescription: customStyleDescription,
      apiKey: googleApiKey,
      cwd,
    });

    if (imgResult.generated) {
      imgSpinner.succeed('Office image generated!');
    } else {
      imgSpinner.info(chalk.dim(`Using default image${imgResult.error ? ` (${imgResult.error})` : ''}`));
    }

    const posSpinner = ora('🔍 Detecting agent positions...').start();
    agentPositions = await detectPositions(imgResult.imagePath, config.agents, {
      anthropicApiKey,
    });

    const detected = Object.values(agentPositions).filter(p => p.detected).length;
    if (detected > 0) {
      posSpinner.succeed(`Detected ${detected}/${config.agents.length} agent positions`);
    } else {
      posSpinner.info('Using template positions');
    }

    config.agentPositions = agentPositions;
    writeConfig(cwd, config);
  }

  // ── Summary ──
  const deployLabel = DEPLOY_METHODS.find((d) => d.value === deployMethod)?.name || deployMethod;
  const styleLabel = STYLES.find((s) => s.value === style)?.name || style;

  console.log();
  console.log(chalk.bold.green('  ✅ OpenClaw Office configured!'));
  console.log();
  console.log(`    ${chalk.dim('Config:')}    ./openclaw-office.config.json`);
  console.log(`    ${chalk.dim('Env:')}       ./.env.local`);
  console.log(`    ${chalk.dim('Agents:')}    ${agents.length} discovered`);
  console.log(`    ${chalk.dim('Style:')}     ${styleLabel}`);
  console.log(`    ${chalk.dim('Deploy:')}    ${deployLabel}`);
  console.log();
  console.log(chalk.bold('  Next steps:'));

  const startCmd =
    deployMethod === 'docker' ? 'docker-compose up -d' :
    deployMethod === 'pm2' ? 'pm2 start ecosystem.config.js' :
    'npm start';

  console.log(chalk.cyan('    1.'), 'npm install');
  console.log(chalk.cyan('    2.'), 'npm run build');
  console.log(chalk.cyan('    3.'), startCmd);
  console.log();
  console.log(`  Dashboard will be available at: ${chalk.bold.underline(`http://localhost:${port}`)}`);
  console.log();
}
