// Discord Control API v0.1 — deterministic local helpers.
// Does NOT register slash commands or talk to Discord.
import { handleCommand, DISCORD_COMMANDS } from '../../../../lib/monday/discord.js'
import { getState } from '../../../../lib/monday/store.js'

export async function GET() {
  return Response.json({ commands: DISCORD_COMMANDS, mode: 'v0.1-local-only' })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const name = body.command || body.name
    if (!name) {
      return Response.json({ error: 'missing_command', allowed: DISCORD_COMMANDS }, { status: 400 })
    }
    const state = getState()
    const result = handleCommand(name, state, body.args || {})
    return Response.json({ result })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
