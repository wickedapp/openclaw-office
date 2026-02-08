/**
 * Create a simple default office placeholder image.
 * Run: node cli/lib/create-default-image.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#1a1a2e"/>
  <rect x="200" y="200" width="1520" height="680" rx="20" fill="#16213e" stroke="#0f3460" stroke-width="2"/>
  <text x="960" y="480" text-anchor="middle" fill="#e94560" font-family="monospace" font-size="36" font-weight="bold">🏢 OpenClaw Office</text>
  <text x="960" y="540" text-anchor="middle" fill="#999" font-family="monospace" font-size="20">Run 'openclaw-office generate' to create your custom office scene</text>
  <text x="960" y="580" text-anchor="middle" fill="#666" font-family="monospace" font-size="16">Requires GOOGLE_API_KEY for Gemini image generation</text>
  <!-- Desk placeholders -->
  <rect x="400" y="350" width="120" height="60" rx="5" fill="#0f3460" opacity="0.5"/>
  <rect x="900" y="350" width="120" height="60" rx="5" fill="#0f3460" opacity="0.5"/>
  <rect x="1400" y="350" width="120" height="60" rx="5" fill="#0f3460" opacity="0.5"/>
  <rect x="650" y="620" width="120" height="60" rx="5" fill="#0f3460" opacity="0.5"/>
  <rect x="1150" y="620" width="120" height="60" rx="5" fill="#0f3460" opacity="0.5"/>
</svg>`;

const outDir = join(process.cwd(), 'public/sprites');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, 'office-default.svg');
writeFileSync(outPath, SVG);
console.log(`Created ${outPath}`);
