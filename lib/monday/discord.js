// Discord Control Layer v0.1
// Deterministic local helpers ONLY. No network, no slash command registration.

import { DISPATCH_STATUSES } from './dispatch.js'

export const DISCORD_COMMANDS = Object.freeze([
  '/status',
  '/task',
  '/approval list',
  '/report weekly',
])

function fmtDate(d) {
  try { return new Date(d).toISOString() } catch { return String(d) }
}

// /status — summarises dispatch + approval queues
export function cmdStatus(state = {}) {
  const dispatches = state.dispatches || []
  const approvals = state.approvals || []
  const pendingAssign = dispatches.filter((d) => d.nextStatus === DISPATCH_STATUSES.PENDING_ASSIGN).length
  const blocked = dispatches.filter((d) => d.nextStatus === DISPATCH_STATUSES.BLOCKED).length
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length
  return {
    command: '/status',
    summary: {
      pendingDispatch: pendingAssign,
      blocked,
      pendingApprovals,
      totalDispatches: dispatches.length,
      totalApprovals: approvals.length,
    },
    text:
      `OpenClaw Monday status:\n` +
      `• Pending dispatch: ${pendingAssign}\n` +
      `• Blocked: ${blocked}\n` +
      `• Pending approvals: ${pendingApprovals}\n` +
      `• Read-only mode: v0.1`,
  }
}

// /task <id?> — describe one task or list recent
export function cmdTask(state = {}, args = {}) {
  const dispatches = state.dispatches || []
  if (args.id) {
    const t = dispatches.find((d) => d.id === args.id)
    if (!t) return { command: '/task', error: `Task ${args.id} not found.`, text: `No task with id ${args.id}.` }
    return {
      command: '/task',
      task: t,
      text:
        `Task ${t.id}\n` +
        `Status: ${t.status} → ${t.nextStatus}\n` +
        `Department: ${t.suggestedDepartment}\n` +
        `Risk: ${t.riskLevel}\n` +
        `Approval required: ${t.approvalRequired ? 'yes' : 'no'}\n` +
        `Plan: ${t.dispatchPlan.action} (${t.dispatchPlan.notes})`,
    }
  }
  const recent = dispatches.slice(-5).reverse()
  return {
    command: '/task',
    tasks: recent,
    text:
      `Recent tasks (${recent.length}):\n` +
      recent.map((t) => `• ${t.id || '-'} [${t.suggestedDepartment}/${t.riskLevel}] → ${t.nextStatus}`).join('\n'),
  }
}

// /approval list — pending approval tickets
export function cmdApprovalList(state = {}) {
  const approvals = (state.approvals || []).filter((a) => a.status === 'pending')
  return {
    command: '/approval list',
    approvals,
    text: approvals.length === 0
      ? 'No pending approvals.'
      : `Pending approvals (${approvals.length}):\n` +
        approvals.map((a) => `• ${a.id} [${a.categories.join(',') || 'n/a'}] ${a.action?.description || ''}`).join('\n'),
  }
}

// /report weekly — deterministic local report from supplied state
export function cmdReportWeekly(state = {}, now = new Date()) {
  const dispatches = state.dispatches || []
  const approvals = state.approvals || []
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentDispatches = dispatches.filter((d) => new Date(d.plannedAt || 0) >= since)
  const byDept = {}
  for (const d of recentDispatches) {
    byDept[d.suggestedDepartment] = (byDept[d.suggestedDepartment] || 0) + 1
  }
  const approved = approvals.filter((a) => a.status === 'approved').length
  const pending = approvals.filter((a) => a.status === 'pending').length

  return {
    command: '/report weekly',
    window: { from: fmtDate(since), to: fmtDate(now) },
    counts: {
      dispatches: recentDispatches.length,
      byDepartment: byDept,
      approvalsPending: pending,
      approvalsApproved: approved,
    },
    text:
      `Weekly report (${fmtDate(since)} → ${fmtDate(now)}):\n` +
      `• Dispatches planned: ${recentDispatches.length}\n` +
      `• By department: ${Object.entries(byDept).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}\n` +
      `• Approvals pending: ${pending}, approved: ${approved}`,
  }
}

// Single dispatcher used by the local API.
export function handleCommand(name, state = {}, args = {}) {
  switch (name) {
    case '/status': return cmdStatus(state)
    case '/task': return cmdTask(state, args)
    case '/approval list':
    case '/approval': return cmdApprovalList(state)
    case '/report weekly':
    case '/report': return cmdReportWeekly(state, args.now ? new Date(args.now) : new Date())
    default:
      return { command: name, error: 'unknown_command', text: `Unknown command: ${name}` }
  }
}
