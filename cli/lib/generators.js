import { writeFileSync } from 'fs';
import { join } from 'path';

export function writeConfig(dir, config) {
  writeFileSync(join(dir, 'openclaw-office.config.json'), JSON.stringify(config, null, 2) + '\n');
}

export function writeEnv(dir, { gatewayToken, googleApiKey, anthropicApiKey, telegramWebhookSecret, port }) {
  const lines = [
    '# OpenClaw Office — Local Secrets',
    '# DO NOT commit this file',
    '',
    `OPENCLAW_GATEWAY_TOKEN=${gatewayToken || ''}`,
    `GOOGLE_API_KEY=${googleApiKey || ''}`,
    `ANTHROPIC_API_KEY=${anthropicApiKey || ''}`,
    `TELEGRAM_WEBHOOK_SECRET=${telegramWebhookSecret || ''}`,
    `PORT=${port || 4200}`,
    '',
  ];
  writeFileSync(join(dir, '.env.local'), lines.join('\n'));
}

export function writeDeployConfig(dir, method, config) {
  const port = config.port || 4200;
  const name = 'openclaw-office';

  switch (method) {
    case 'docker':
      writeFileSync(join(dir, 'docker-compose.yml'), `version: "3.8"
services:
  ${name}:
    build: .
    container_name: ${name}
    restart: unless-stopped
    ports:
      - "${port}:${port}"
    env_file:
      - .env.local
    environment:
      - PORT=${port}
`);
      break;

    case 'pm2':
      writeFileSync(join(dir, 'ecosystem.config.js'), `module.exports = {
  apps: [{
    name: '${name}',
    script: 'node_modules/.bin/next',
    args: 'start -p ${port}',
    env: {
      NODE_ENV: 'production',
      PORT: ${port},
    },
    env_file: '.env.local',
  }],
};
`);
      break;

    case 'systemd':
      writeFileSync(join(dir, 'openclaw-office.service'), `[Unit]
Description=OpenClaw Office Dashboard
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${dir}
EnvironmentFile=${dir}/.env.local
Environment=PORT=${port}
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`);
      break;

    case 'launchd':
      writeFileSync(join(dir, 'com.openclaw.office.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.openclaw.office</string>
  <key>WorkingDirectory</key>
  <string>${dir}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/npm</string>
    <string>start</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>${port}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/openclaw-office.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/openclaw-office.err</string>
</dict>
</plist>
`);
      break;

    default:
      // manual — no extra file needed
      break;
  }
}
