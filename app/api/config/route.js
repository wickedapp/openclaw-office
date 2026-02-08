/**
 * Public config endpoint — strips secrets, exposes agent definitions & office settings
 */
import { getConfig } from '../../../lib/config.js'

export async function GET() {
  const config = getConfig()

  // Build safe public config (no tokens/secrets)
  // Convert agents object to array with id included
  const agentsArray = Object.entries(config.agents || {}).map(([id, data]) => ({ id, ...data }))

  const publicConfig = {
    office: config.office,
    agents: agentsArray,
    agentsMap: config.agents,
    image: config.image,
  }

  return Response.json(publicConfig)
}
