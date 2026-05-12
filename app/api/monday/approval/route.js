// Approval Gate API v0.1 — classification only. Never auto-approves.
import { classifyAction, enforce, buildApprovalTicket } from '../../../../lib/monday/approval.js'
import { addApprovalDraft, getState } from '../../../../lib/monday/store.js'

export async function GET() {
  const s = getState()
  return Response.json({ approvals: s.approvals, mode: 'v0.1-no-auto-approve' })
}

export async function POST(request) {
  try {
    const body = await request.json()
    if (body.action === 'classify') {
      return Response.json({ result: classifyAction(body.target || {}) })
    }
    if (body.action === 'enforce') {
      return Response.json({ result: enforce(body.target || {}, body.context || {}) })
    }
    if (body.action === 'draft') {
      // Returns a draft ticket but does not store it.
      return Response.json({ ticket: buildApprovalTicket(body.target || {}, body.requester || 'system') })
    }
    if (body.action === 'queue') {
      const r = addApprovalDraft(body.target || {}, body.requester || 'system')
      return Response.json(r)
    }
    return Response.json({ error: 'unknown_action', allowed: ['classify', 'enforce', 'draft', 'queue'] }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
