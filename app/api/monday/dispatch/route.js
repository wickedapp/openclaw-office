// Monday Dispatch API v0.1 — pure planning, no external calls.
import { planDispatch, planDispatchBatch } from '../../../../lib/monday/dispatch.js'
import { getState, ingestTask } from '../../../../lib/monday/store.js'
import { routeAction } from '../../../../lib/action-router/engine.js'

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
        const plans = planDispatchBatch(body.tasks)
        const routeDecisions = body.tasks.map((task) => routeAction({ ...task, source: task.source || body.source || 'dashboard' }))
        return Response.json({ plans, routeDecisions, stored: false })
      }
      const task = body.task || body.input || {}
      const plan = planDispatch(task)
      const routeDecision = routeAction({ ...task, source: task.source || body.source || 'dashboard' })
      return Response.json({ plan, routeDecision, stored: false })
    }
    if (body.action === 'ingest') {
      // Stores a plan in the local in-memory store. Still no external calls.
      const task = body.task || body.input || {}
      const plan = ingestTask(task)
      const routeDecision = routeAction({ ...task, source: task.source || body.source || 'dashboard' })
      return Response.json({ plan, routeDecision, stored: true })
    }
    return Response.json({ error: 'unknown_action', allowed: ['plan', 'ingest'] }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
