// In-memory store for Monday Next Evolution v0.1.
// No persistence, no external connectors. Process-local only.

import { planDispatch, DISPATCH_STATUSES } from './dispatch.js'
import { buildApprovalTicket, classifyAction } from './approval.js'

const state = {
  dispatches: [], // planDispatch outputs
  approvals: [],  // approval ticket drafts
  sourceHealth: { // simple deterministic health board
    notion: { status: 'unknown', lastChecked: null, note: 'v0.1 read-only; not polled' },
    discord: { status: 'unknown', lastChecked: null, note: 'v0.1 not connected' },
    sheets: { status: 'unknown', lastChecked: null, note: 'v0.1 read-only' },
    threads: { status: 'unknown', lastChecked: null, note: 'v0.1 not connected' },
  },
}

export function getState() {
  return {
    dispatches: state.dispatches.slice(),
    approvals: state.approvals.slice(),
    sourceHealth: { ...state.sourceHealth },
  }
}

export function resetState() {
  state.dispatches = []
  state.approvals = []
}

export function ingestTask(input) {
  const plan = planDispatch(input)
  state.dispatches.push(plan)
  if (plan.approvalRequired) {
    const ticket = buildApprovalTicket(
      { kind: 'dispatch.gate', description: `${input.title || ''} ${input.body || ''}`.trim() },
      input.from || 'system',
    )
    if (ticket.status !== 'pending') ticket.status = 'pending'
    // Reuse the dispatch reasons in the ticket for traceability.
    ticket.reasons = plan.reasons.filter((r) => r.startsWith('[approval]'))
    state.approvals.push(ticket)
  }
  if (state.dispatches.length > 200) state.dispatches = state.dispatches.slice(-200)
  if (state.approvals.length > 200) state.approvals = state.approvals.slice(-200)
  return plan
}

export function addApprovalDraft(action, requester) {
  const c = classifyAction(action)
  if (!c.requiresApproval) {
    return { ticket: null, reason: 'No approval required.' }
  }
  const ticket = buildApprovalTicket(action, requester)
  state.approvals.push(ticket)
  return { ticket, reason: 'Pending human approval (v0.1 never auto-approves).' }
}

export function setSourceHealth(source, patch) {
  if (!state.sourceHealth[source]) {
    state.sourceHealth[source] = { status: 'unknown', lastChecked: null, note: '' }
  }
  state.sourceHealth[source] = {
    ...state.sourceHealth[source],
    ...patch,
    lastChecked: new Date().toISOString(),
  }
  return state.sourceHealth[source]
}

export function dashboardSnapshot() {
  const pendingDispatch = state.dispatches.filter(
    (d) => d.nextStatus === DISPATCH_STATUSES.PENDING_ASSIGN,
  )
  const blocked = state.dispatches.filter(
    (d) => d.nextStatus === DISPATCH_STATUSES.BLOCKED || d.dispatchPlan.action === 'queue_for_approval',
  )
  const pendingApprovals = state.approvals.filter((a) => a.status === 'pending')
  const overdue = state.dispatches.filter((d) => {
    if (!d.dueDate) return false
    try { return new Date(d.dueDate) < new Date() } catch { return false }
  })
  return {
    counts: {
      pendingDispatch: pendingDispatch.length,
      pendingApprovals: pendingApprovals.length,
      blocked: blocked.length,
      overdue: overdue.length,
    },
    pendingDispatch,
    pendingApprovals,
    blocked,
    overdue,
    sourceHealth: state.sourceHealth,
    generatedAt: new Date().toISOString(),
    mode: 'v0.1-read-only',
  }
}
