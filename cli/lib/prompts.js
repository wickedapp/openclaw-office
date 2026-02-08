/**
 * Prompt templates for office image generation via Nano Banana (Gemini).
 */

const DESK_POSITIONS = [
  'center desk',
  'far left desk',
  'far right desk',
  'bottom left desk',
  'bottom right desk',
  'top left desk',
  'top right desk',
  'bottom center desk',
  'top center desk',
  'middle left desk',
];

// Template position percentages (x, y) for up to 10 agents
const TEMPLATE_POSITIONS = [
  { x: 50, y: 45 },
  { x: 20, y: 35 },
  { x: 80, y: 35 },
  { x: 25, y: 65 },
  { x: 75, y: 65 },
  { x: 15, y: 25 },
  { x: 85, y: 25 },
  { x: 50, y: 70 },
  { x: 50, y: 20 },
  { x: 15, y: 50 },
];

function buildCharacterList(agents) {
  return agents.map((agent, i) => {
    const desk = DESK_POSITIONS[i] || `desk ${i + 1}`;
    const color = agent.color || '#6366f1';
    const emoji = agent.emoji || '🤖';
    const role = agent.role || 'Agent';
    const name = agent.displayName || agent.name || `Agent ${i + 1}`;
    return `Character ${i + 1}: ${desk}, ${color}-colored outfit/hair, ${role.toLowerCase()} appearance ${emoji} (${name}).`;
  }).join('\n');
}

const STYLE_TEMPLATES = {
  cyberpunk: (agents) => `Isometric pixel art cyberpunk office interior, dark background with neon accents and holographic displays.
${agents.length} characters seated at separate desks with glowing computer screens.
${buildCharacterList(agents)}
Detailed pixel art style, neon lighting in cyan and magenta, exposed cables, dark walls with LED strips, potted cyber-plants, floating hologram decorations. Cozy but futuristic atmosphere. High quality, detailed, 16:9 aspect ratio.`,

  minimalist: (agents) => `Isometric pixel art modern minimalist office interior, clean white and light gray background with subtle accent colors.
${agents.length} characters seated at separate sleek desks with thin monitors.
${buildCharacterList(agents)}
Clean pixel art style, natural light from large windows, minimal furniture, white walls, a few green plants, wooden floor accents. Calm and professional atmosphere. High quality, detailed, 16:9 aspect ratio.`,

  cozy: (agents) => `Isometric pixel art cozy studio office interior, warm lighting with golden tones and earthy colors.
${agents.length} characters seated at separate wooden desks with computers.
${buildCharacterList(agents)}
Warm pixel art style, overhead warm lamps, many potted plants and succulents, bookshelves, coffee mugs on desks, rugs on floor, brick wall accents. Homey and comfortable atmosphere. High quality, detailed, 16:9 aspect ratio.`,

  corporate: (agents) => `Isometric pixel art corporate office interior, professional blue and gray color scheme.
${agents.length} characters seated at separate office desks with dual monitors.
${buildCharacterList(agents)}
Professional pixel art style, fluorescent overhead lighting, glass partitions, blue carpet, water cooler, filing cabinets, motivational posters. Business-like atmosphere. High quality, detailed, 16:9 aspect ratio.`,

  custom: (agents, customDescription) => `Isometric pixel art office interior, ${customDescription || 'unique creative style'}.
${agents.length} characters seated at separate desks with computers.
${buildCharacterList(agents)}
Detailed pixel art style, creative decorations matching the theme. High quality, detailed, 16:9 aspect ratio.`,
};

export function buildPrompt(agents, style, customDescription) {
  const templateFn = STYLE_TEMPLATES[style] || STYLE_TEMPLATES.custom;
  const desc = customDescription || (STYLE_TEMPLATES[style] ? undefined : `${style} style, warm and inviting`);
  return templateFn(agents, desc);
}

export function getTemplatePositions(agentCount) {
  return TEMPLATE_POSITIONS.slice(0, agentCount);
}

export { TEMPLATE_POSITIONS, DESK_POSITIONS };
