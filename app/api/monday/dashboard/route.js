// Dashboard Sync API v0.1 — exposes counts for the Monday tab.
import { dashboardSnapshot, setSourceHealth } from '../../../../lib/monday/store.js'

export async function GET() {
  return Response.json(dashboardSnapshot())
}

export async function POST(request) {
  try {
    const body = await request.json()
    if (body.action === 'set_source_health') {
      const updated = setSourceHealth(body.source, body.patch || {})
      return Response.json({ source: body.source, health: updated })
    }
    return Response.json({ error: 'unknown_action', allowed: ['set_source_health'] }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
