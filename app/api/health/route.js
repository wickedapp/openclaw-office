// Health check endpoint
import { getConfig, validateConfig } from '../../../lib/config.js'
import { getStatus } from '../../../lib/openclaw-ws.js'

export async function GET() {
  const config = getConfig()
  const validation = validateConfig(config)
  const wsStatus = getStatus()

  return Response.json({
    status: 'healthy',
    service: 'OpenClaw Office',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    gateway: {
      connected: wsStatus.connected,
      url: config.gateway?.url || 'not configured',
    },
    agents: {
      count: Object.keys(config.agents || {}).length,
      ids: Object.keys(config.agents || {}),
    },
    config: {
      valid: validation.valid,
      errors: validation.errors,
    },
  })
}
