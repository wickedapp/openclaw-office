// Action Router API v1.
// Returns route decisions only. It never executes mutation tasks.

import { routeAction, routerPolicyTable } from '../../../lib/action-router/engine.js'
import { getAuditLog } from '../../../lib/action-router/audit.js'

export async function GET() {
  return Response.json({
    mode: 'action-router-v1-decision-only',
    policy: routerPolicyTable(),
    auditLog: getAuditLog().slice(-50),
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const input = body.task || body.input || body
    const context = {
      source: body.source || input.source || 'dashboard',
      approval: body.approval || input.approval || null,
      preflight: body.preflight || input.preflight || null,
      executionMode: 'decision_only',
    }
    const decision = routeAction({ ...input, source: context.source }, context)
    return Response.json({
      decision,
      selectedAgent: decision.selectedAgent,
      requiredApproval: decision.approvalRequired,
      preflightStatus: decision.preflightVerdict,
      executionStatus: decision.executionStatus,
      auditId: decision.auditId,
    })
  } catch (err) {
    return Response.json({ error: 'router_error', message: err.message }, { status: 500 })
  }
}
