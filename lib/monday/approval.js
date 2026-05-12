// Approval Gate v0.1
// Pure classification and enforcement helpers. Never auto-approves.

export const APPROVAL_CATEGORIES = Object.freeze({
  THREADS_PUBLISH: 'threads_publish',
  SHEETS_WRITE: 'sheets_write',
  NOTION_DESTRUCTIVE: 'notion_destructive',
  PROVIDER_CONFIG: 'provider_config',
  SCHEDULER_ACTIVATION: 'scheduler_activation',
})

const RULES = [
  {
    category: APPROVAL_CATEGORIES.THREADS_PUBLISH,
    match: (a) =>
      a.kind === 'threads.publish' ||
      /threads.*(publish|post)/i.test(a.description || '') ||
      /publish.*threads/i.test(a.description || ''),
    description: 'Publishing to Threads requires explicit approval.',
  },
  {
    category: APPROVAL_CATEGORIES.SHEETS_WRITE,
    match: (a) =>
      a.kind === 'sheets.write' ||
      /(google\s*sheets?.*(write|writeback|update|append|batch)|sheets?.*(writeback|write|update|append|batch))/i.test(a.description || ''),
    description: 'Production writes to Google Sheets require approval.',
  },
  {
    category: APPROVAL_CATEGORIES.NOTION_DESTRUCTIVE,
    match: (a) =>
      a.kind === 'notion.destructive' ||
      a.kind === 'notion.bulk' ||
      /(notion.*(delete|destruct|bulk|archive all|update all)|(delete|destruct|bulk|archive all|update all).*notion)/i.test(a.description || ''),
    description: 'Destructive or bulk Notion updates require approval.',
  },
  {
    category: APPROVAL_CATEGORIES.PROVIDER_CONFIG,
    match: (a) =>
      a.kind === 'provider.config' ||
      /(api\s*key|provider\s*key|rotate token|change provider|webhook url)/i.test(a.description || ''),
    description: 'Provider/API-key configuration changes require approval.',
  },
  {
    category: APPROVAL_CATEGORIES.SCHEDULER_ACTIVATION,
    match: (a) =>
      a.kind === 'scheduler.activate' ||
      /(enable cron|activate scheduler|enable scheduler|start cron)/i.test(a.description || ''),
    description: 'Cron / scheduler activation requires approval.',
  },
]

// Decide whether a proposed action requires approval. Pure.
// action = { kind?: string, description?: string, payload?: object }
export function classifyAction(action = {}) {
  const matched = []
  for (const r of RULES) {
    if (r.match(action)) {
      matched.push({ category: r.category, reason: r.description })
    }
  }
  return {
    action: { kind: action.kind || null, description: action.description || '' },
    requiresApproval: matched.length > 0,
    categories: matched.map((m) => m.category),
    reasons: matched.map((m) => m.reason),
  }
}

// Enforcement helper. Returns { allow, blocked, reason }.
// Always blocks any auto-approval. v0.1 NEVER auto-approves.
export function enforce(action = {}, context = {}) {
  const c = classifyAction(action)
  if (!c.requiresApproval) {
    return { allow: true, blocked: false, reason: 'No approval gate matched.' }
  }
  const ticket = context.approvalTicket || null
  if (!ticket) {
    return {
      allow: false,
      blocked: true,
      reason: 'Approval required but no approval ticket present.',
      categories: c.categories,
    }
  }
  if (ticket.status !== 'approved') {
    return {
      allow: false,
      blocked: true,
      reason: `Approval ticket status is "${ticket.status}", expected "approved".`,
      categories: c.categories,
    }
  }
  // Even if a human "approved" elsewhere, v0.1 still flags as not auto-executable.
  return {
    allow: false,
    blocked: true,
    reason: 'v0.1 never executes gated actions. Hand off to human operator.',
    categories: c.categories,
  }
}

// Build an approval ticket draft. Pure data only.
export function buildApprovalTicket(action = {}, requester = 'system') {
  const c = classifyAction(action)
  return {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: c.action,
    categories: c.categories,
    reasons: c.reasons,
    requester,
    status: c.requiresApproval ? 'pending' : 'not_required',
    createdAt: new Date().toISOString(),
    autoApproved: false,
  }
}
