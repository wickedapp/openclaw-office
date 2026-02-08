/**
 * Office image generation via Nano Banana (Gemini).
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { buildPrompt } from './prompts.js';

const NANO_BANANA_SCRIPT = '/opt/homebrew/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py';
const DEFAULT_IMAGE = 'public/sprites/office-default.svg';

/**
 * Generate an office image using Nano Banana (Gemini).
 * @param {Object} opts
 * @param {Array} opts.agents - Array of agent objects
 * @param {string} opts.style - Style key (cyberpunk, minimalist, cozy, corporate, custom)
 * @param {string} [opts.customDescription] - Custom style description
 * @param {string} [opts.apiKey] - Gemini API key (falls back to GEMINI_API_KEY or GOOGLE_API_KEY env)
 * @param {string} [opts.outputPath] - Output path (default: public/sprites/office.png)
 * @param {string} [opts.cwd] - Working directory
 * @returns {Promise<{imagePath: string, generated: boolean}>}
 */
export async function generateOfficeImage({
  agents,
  style,
  customDescription,
  apiKey,
  outputPath,
  cwd = process.cwd(),
}) {
  const outPath = outputPath || join(cwd, 'public/sprites/office.png');
  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!geminiKey) {
    return useDefault(cwd, outPath, 'No API key provided');
  }

  if (!existsSync(NANO_BANANA_SCRIPT)) {
    return useDefault(cwd, outPath, 'Nano Banana script not found');
  }

  const prompt = buildPrompt(agents, style, customDescription);

  try {
    execSync(
      `uv run "${NANO_BANANA_SCRIPT}" --prompt ${JSON.stringify(prompt)} --filename "${outPath}" --resolution 2K`,
      {
        env: { ...process.env, GEMINI_API_KEY: geminiKey },
        stdio: 'pipe',
        timeout: 120_000,
      }
    );

    if (existsSync(outPath)) {
      return { imagePath: outPath, generated: true };
    }
    return useDefault(cwd, outPath, 'Image file not created');
  } catch (err) {
    return useDefault(cwd, outPath, err.message);
  }
}

function useDefault(cwd, outPath, reason) {
  const defaultImg = join(cwd, DEFAULT_IMAGE);
  if (existsSync(defaultImg) && defaultImg !== outPath) {
    copyFileSync(defaultImg, outPath);
  }
  return { imagePath: outPath, generated: false, error: reason };
}
