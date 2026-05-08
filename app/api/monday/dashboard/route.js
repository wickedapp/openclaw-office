// Dashboard Sync API v0.1 — exposes counts for the Monday tab.
import { dashboardSnapshot, setSourceHealth } from '../../../../lib/monday/store.js'
import { routeAction } from '../../../../lib/action-router/engine.js'
import { getAuditLog } from '../../../../lib/action-router/audit.js'

export async function GET() {
  return Response.json({
    ...dashboardSnapshot(),
    actionRouter: {
      mode: 'action-router-v1-decision-only',
      auditLog: getAuditLog().slice(-25),
    },
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    if (body.action === 'set_source_health') {
      const updated = setSourceHealth(body.source, body.patch || {})
      return Response.json({ source: body.source, health: updated })
    }
    if (body.action === 'route') {
      const task = body.task || body.input || {}
      const decision = routeAction({ ...task, source: body.source || task.source || 'dashboard' }, {
        source: body.source || task.source || 'dashboard',
        approval: body.approval || null,
        liveMutationApproval: body.liveMutationApproval || body.live_mutation_approval || null,
        preflight: body.preflight || null,
        executionMode: 'decision_only',
      })
      return Response.json({
        decision,
        selectedAgent: decision.selectedAgent,
        requiredApproval: decision.approvalRequired,
        preflightStatus: decision.preflightVerdict,
        executionStatus: decision.executionStatus,
        auditId: decision.auditId,
      })
    }
    return Response.json({ error: 'unknown_action', allowed: ['set_source_health', 'route'] }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
