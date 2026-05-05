// Monday Dispatch API v0.1 — pure planning, no external calls.
import { planDispatch, planDispatchBatch } from '../../../../lib/monday/dispatch.js'
import { getState, ingestTask } from '../../../../lib/monday/store.js'

export async function GET() {
  const s = getState()
  return Response.json({ dispatches: s.dispatches, mode: 'v0.1-read-only' })
}

export async function POST(request) {
  try {
    const body = await request.json()
    if (body.action === 'plan') {
      // Pure plan, do not store.
      if (Array.isArray(body.tasks)) {
        return Response.json({ plans: planDispatchBatch(body.tasks), stored: false })
      }
      return Response.json({ plan: planDispatch(body.task || body.input || {}), stored: false })
    }
    if (body.action === 'ingest') {
      // Stores a plan in the local in-memory store. Still no external calls.
      const plan = ingestTask(body.task || body.input || {})
      return Response.json({ plan, stored: true })
    }
    return Response.json({ error: 'unknown_action', allowed: ['plan', 'ingest'] }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
