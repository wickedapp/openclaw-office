/**
 * Agent position detection via Claude Vision (with template fallback).
 */

import { readFileSync, existsSync } from 'fs';
import { getTemplatePositions } from './prompts.js';

const VISION_PROMPT = `This is an isometric pixel art office image with characters seated at desks.
Identify each character/person in the image. For each one, provide:
1. Their approximate position as x,y percentages (0-100) from top-left of the image
2. A brief description of their appearance (clothing color, distinguishing features)

Return ONLY a JSON array with objects like:
[{"x": 50, "y": 45, "description": "character with pink hair at center desk"}, ...]

Order them roughly left-to-right, top-to-bottom.`;

/**
 * Detect agent positions in an office image.
 * Uses Claude Vision if API key available, otherwise falls back to template positions.
 *
 * @param {string} imagePath - Path to the office image
 * @param {Array} agents - Array of agent objects
 * @param {Object} [opts]
 * @param {string} [opts.anthropicApiKey] - Anthropic API key
 * @param {string} [opts.gatewayUrl] - OpenClaw gateway URL for proxied requests
 * @param {string} [opts.gatewayToken] - Gateway token
 * @returns {Promise<Object>} Map of agentId → {x, y}
 */
export async function detectPositions(imagePath, agents, opts = {}) {
  const apiKey = opts.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

  // Try vision detection
  if (apiKey && existsSync(imagePath)) {
    try {
      const positions = await detectWithVision(imagePath, agents, apiKey);
      if (positions && Object.keys(positions).length === agents.length) {
        return positions;
      }
    } catch (err) {
      // Fall through to template
    }
  }

  // Fallback: template positions
  return getTemplatePositionMap(agents);
}

async function detectWithVision(imagePath, agents, apiKey) {
  const imageData = readFileSync(imagePath).toString('base64');
  const ext = imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: `image/${ext}`, data: imageData },
          },
          { type: 'text', text: VISION_PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON found in vision response');

  const detected = JSON.parse(jsonMatch[0]);

  // Map detected characters to agents by order (and color matching if possible)
  return mapDetectedToAgents(detected, agents);
}

function mapDetectedToAgents(detected, agents) {
  const positions = {};

  // Simple approach: match by order, up to the number of agents
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const agentId = agent.id || agent.name;

    if (i < detected.length) {
      positions[agentId] = {
        x: Math.round(detected[i].x),
        y: Math.round(detected[i].y),
        detected: true,
      };
    } else {
      // More agents than detected characters — use template
      const tmpl = getTemplatePositions(agents.length);
      positions[agentId] = { x: tmpl[i].x, y: tmpl[i].y, detected: false };
    }
  }

  return positions;
}

function getTemplatePositionMap(agents) {
  const templates = getTemplatePositions(agents.length);
  const positions = {};

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const agentId = agent.id || agent.name;
    positions[agentId] = { x: templates[i].x, y: templates[i].y, detected: false };
  }

  return positions;
}
