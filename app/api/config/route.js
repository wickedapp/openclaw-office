/**
 * Public config endpoint — strips secrets, exposes agent definitions & office settings
 */
import { getConfig } from '../../../lib/config.js'

export async function GET() {
  const config = getConfig()

  // Build safe public config (no tokens/secrets)
  const publicConfig = {
    office: config.office,
    agents: config.agents,
    image: config.image,
  }

  return Response.json(publicConfig)
}
