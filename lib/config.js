/**
 * OpenClaw Office Configuration System
 * 
 * Priority: openclaw-office.config.json > .env.local > .env > defaults
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

let _config = null

const DEFAULTS = {
  office: {
    name: 'My AI Office',
    style: 'cyberpunk',
  },
  gateway: {
    url: 'ws://127.0.0.1:18789',
    token: '',
  },
  agents: {},
  image: {
    path: 'public/sprites/office.png',
    positions: {},
  },
  telegram: {
    botToken: '',
    chatId: '',
    webhookSecret: '',
  },
  license: 'MIT',
}

function loadConfigFile() {
  const configPath = join(process.cwd(), 'openclaw-office.config.json')
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'))
    } catch (err) {
      console.error('[config] Failed to parse openclaw-office.config.json:', err.message)
    }
  }
  return null
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

function buildConfig() {
  let config = { ...DEFAULTS }

  // Layer 1: Config file
  const fileConfig = loadConfigFile()
  if (fileConfig) {
    config = deepMerge(config, fileConfig)
  }

  // Layer 2: Environment variable overrides
  if (process.env.OPENCLAW_GATEWAY_URL) config.gateway.url = process.env.OPENCLAW_GATEWAY_URL
  if (process.env.OPENCLAW_GATEWAY_TOKEN) config.gateway.token = process.env.OPENCLAW_GATEWAY_TOKEN
  if (process.env.TELEGRAM_BOT_TOKEN) config.telegram.botToken = process.env.TELEGRAM_BOT_TOKEN
  if (process.env.TELEGRAM_CHAT_ID) config.telegram.chatId = process.env.TELEGRAM_CHAT_ID
  if (process.env.TELEGRAM_WEBHOOK_SECRET) config.telegram.webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (process.env.OFFICE_NAME) config.office.name = process.env.OFFICE_NAME
  if (process.env.OFFICE_STYLE) config.office.style = process.env.OFFICE_STYLE

  return config
}

/**
 * Get the resolved configuration. Cached after first call.
 */
export function getConfig() {
  if (!_config) _config = buildConfig()
  return _config
}

/**
 * Reload configuration (useful for testing or hot-reload)
 */
export function reloadConfig() {
  _config = null
  return getConfig()
}

/**
 * Validate that required fields are present.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = []
  if (!config) config = getConfig()

  if (!config.gateway?.url) errors.push('gateway.url is required')
  if (!config.gateway?.token) errors.push('gateway.token is required')

  const agentKeys = Object.keys(config.agents || {})
  if (agentKeys.length === 0) errors.push('At least one agent must be defined in agents')

  return { valid: errors.length === 0, errors }
}

/**
 * Get agents as a lookup map: { id: { name, color, emoji, role } }
 */
export function getAgentsMap() {
  return getConfig().agents || {}
}

/**
 * Get agents as an array with id included
 */
export function getAgentsList() {
  const agents = getConfig().agents || {}
  return Object.entries(agents).map(([id, data]) => ({ id, ...data }))
}

/**
 * Get label/animation positions from config
 */
export function getPositions() {
  const agents = getConfig().agents || {}
  const positions = {}
  for (const [id, agent] of Object.entries(agents)) {
    if (agent.position) positions[id] = agent.position
  }
  // Override with explicit image.positions
  const imgPositions = getConfig().image?.positions || {}
  return { ...positions, ...imgPositions }
}
