// In-memory store for Monday Next Evolution v0.1.
// No persistence, no external connectors. Process-local only.

import { planDispatch, DISPATCH_STATUSES } from './dispatch.js'
import { buildApprovalTicket, classifyAction } from './approval.js'

const SAFE_SOURCE_IDS = Object.freeze(['notion', 'discord', 'sheets', 'threads'])
const SAFE_STATUSES = Object.freeze(['healthy', 'degraded', 'down', 'unknown'])
const INITIAL_SOURCE_HEALTH = Object.freeze({
  notion: Object.freeze({ status: 'unknown', lastChecked: null, note: 'v0.1 read-only; not polled' }),
  discord: Object.freeze({ status: 'unknown', lastChecked: null, note: 'v0.1 not connected' }),
  sheets: Object.freeze({ status: 'unknown', lastChecked: null, note: 'v0.1 read-only' }),
  threads: Object.freeze({ status: 'unknown', lastChecked: null, note: 'v0.1 not connected' }),
})

function cloneInitialSourceHealth() {
  return Object.fromEntries(Object.entries(INITIAL_SOURCE_HEALTH).map(([key, value]) => [key, { ...value }]))
}

function redactStatusText(value) {
  return String(value ?? '')
    .replace(/(api[_-]?key|token|oauth|secret|private[_-]?key|webhook|authorization)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .replace(/\b(sk|pk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, '[REDACTED_SECRET]')
    .replace(/https:\/\/api\.telegram\.org\/bot[^\s"']+/gi, '[REDACTED_TELEGRAM_WEBHOOK]')
    .replace(/[<>]/g, '')
    .slice(0, 160)
}

function sanitizeSourceHealthEntry(entry = {}) {
  const status = SAFE_STATUSES.includes(entry.status) ? entry.status : 'unknown'
  return {
    status,
    lastChecked: typeof entry.lastChecked === 'string' ? redactStatusText(entry.lastChecked) : null,
    note: redactStatusText(entry.note || entry.message || ''),
  }
}

function cloneSourceHealth() {
  return Object.fromEntries(
    SAFE_SOURCE_IDS.map((source) => [source, sanitizeSourceHealthEntry(state.sourceHealth[source])]),
  )
}

const state = {
  dispatches: [], // planDispatch outputs
  approvals: [],  // approval ticket drafts
  sourceHealth: cloneInitialSourceHealth(),
}

export function getState() {
  return {
    dispatches: state.dispatches.slice(),
    approvals: state.approvals.slice(),
    sourceHealth: cloneSourceHealth(),
  }
}

export function resetState() {
  state.dispatches = []
  state.approvals = []
  state.sourceHealth = cloneInitialSourceHealth()
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
  if (!SAFE_SOURCE_IDS.includes(source)) {
    return { error: 'unsupported_source', source: null, health: null }
  }
  const safePatch = sanitizeSourceHealthEntry(patch || {})
  state.sourceHealth[source] = {
    ...sanitizeSourceHealthEntry(state.sourceHealth[source]),
    ...safePatch,
    lastChecked: new Date().toISOString(),
  }
  return sanitizeSourceHealthEntry(state.sourceHealth[source])
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
    sourceHealth: cloneSourceHealth(),
    generatedAt: new Date().toISOString(),
    mode: 'v0.1-read-only',
  }
}
