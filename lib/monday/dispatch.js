// Monday Dispatch Layer v0.1
// Pure / read-only planning. NEVER calls Notion / external APIs.
// Classifies a task object or message and produces a dispatch plan.

export const DEPARTMENTS = Object.freeze({
  ENGINEERING: 'engineering',
  MARKETING: 'marketing',
  OPERATIONS: 'operations',
  SECURITY: 'security',
  FINANCE: 'finance',
  LEGAL: 'legal',
  GENERAL: 'general',
})

export const RISK_LEVELS = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
})

export const DISPATCH_STATUSES = Object.freeze({
  INBOX: 'Inbox',
  NEW: 'New',
  PENDING_ASSIGN: '待分配',
  PLANNED: 'Planned',
  BLOCKED: 'Blocked',
})

const DEPT_KEYWORDS = [
  { dept: DEPARTMENTS.ENGINEERING, words: ['bug', 'deploy', 'api', 'endpoint', 'crash', 'code', 'patch', 'release', 'pipeline', 'ci', 'build'] },
  { dept: DEPARTMENTS.SECURITY, words: ['security', 'breach', 'leak', 'vulnerab', 'token', 'cve', 'auth', 'permission'] },
  { dept: DEPARTMENTS.MARKETING, words: ['threads', 'post', 'campaign', 'copy', 'content', 'persona', 'voice', 'newsletter', 'social'] },
  { dept: DEPARTMENTS.OPERATIONS, words: ['scheduler', 'cron', 'dispatch', 'workflow', 'sop', 'ops', 'incident', 'runbook'] },
  { dept: DEPARTMENTS.FINANCE, words: ['invoice', 'budget', 'cost', 'payment', 'refund', 'billing'] },
  { dept: DEPARTMENTS.LEGAL, words: ['contract', 'legal', 'compliance', 'gdpr', 'privacy', 'tos'] },
]

const RISK_KEYWORDS = [
  { level: RISK_LEVELS.CRITICAL, words: ['production', /\bprod\b/, /\blive\b/, 'outage', 'p0', 'incident', 'breach', 'data loss'] },
  { level: RISK_LEVELS.HIGH, words: ['publish', 'bulk', 'destructive', 'delete', 'rotate key', 'rotate token', 'webhook', 'payment'] },
  { level: RISK_LEVELS.MEDIUM, words: ['schedule', 'enable', 'cron', 'migrate', 'change', 'config'] },
]

const APPROVAL_KEYWORDS = [
  'threads publish', 'publish to threads', 'sheet write', 'google sheet', 'writeback',
  'notion bulk', 'bulk notion', 'destructive', 'delete', 'drop',
  'api key', 'provider key', 'rotate token', 'cron', 'scheduler', 'enable scheduler',
]

function lower(s) {
  return (s || '').toString().toLowerCase()
}

export function classifyDepartment(text) {
  const t = lower(text)
  const reasons = []
  let pick = DEPARTMENTS.GENERAL
  let bestHits = 0
  for (const { dept, words } of DEPT_KEYWORDS) {
    const hits = words.filter((w) => t.includes(w))
    if (hits.length > bestHits) {
      bestHits = hits.length
      pick = dept
      reasons.length = 0
      for (const h of hits) reasons.push(`matched keyword "${h}"`)
    }
  }
  if (bestHits === 0) reasons.push('no department keywords matched; fallback to general')
  return { department: pick, reasons }
}

export function classifyRisk(text) {
  const t = lower(text)
  for (const { level, words } of RISK_KEYWORDS) {
    const hit = words.find((w) => typeof w === 'string' ? t.includes(w) : w.test(t))
    if (hit) {
      const label = typeof hit === 'string' ? hit.trim() : hit.source
      return { risk: level, reasons: [`matched risk keyword "${label}"`] }
    }
  }
  return { risk: RISK_LEVELS.LOW, reasons: ['no risk keywords matched'] }
}

export function requiresApproval(text, risk) {
  const t = lower(text)
  const matched = APPROVAL_KEYWORDS.filter((w) => t.includes(w))
  if (matched.length > 0) {
    return { approvalRequired: true, reasons: matched.map((m) => `gated keyword "${m}"`) }
  }
  if (risk === RISK_LEVELS.CRITICAL || risk === RISK_LEVELS.HIGH) {
    return { approvalRequired: true, reasons: [`risk level "${risk}" triggers approval`] }
  }
  return { approvalRequired: false, reasons: [] }
}

function normalizeStatus(input) {
  const s = (input || '').toString().trim()
  if (!s) return DISPATCH_STATUSES.INBOX
  const lc = s.toLowerCase()
  if (lc === 'inbox') return DISPATCH_STATUSES.INBOX
  if (lc === 'new') return DISPATCH_STATUSES.NEW
  if (s === '待分配' || lc === 'pending' || lc === 'pending_assign') return DISPATCH_STATUSES.PENDING_ASSIGN
  if (lc === 'planned') return DISPATCH_STATUSES.PLANNED
  if (lc === 'blocked') return DISPATCH_STATUSES.BLOCKED
  return DISPATCH_STATUSES.INBOX
}

// Build a dispatch plan from a message/task. Pure function.
// input = { id?, title?, body?, source?, status?, dueDate?, tags? }
export function planDispatch(input = {}) {
  const text = [input.title, input.body].filter(Boolean).join(' \n ')
  const status = normalizeStatus(input.status)
  const dept = classifyDepartment(text)
  const risk = classifyRisk(text)
  const approval = requiresApproval(text, risk.risk)

  const reasons = [
    ...dept.reasons.map((r) => `[department] ${r}`),
    ...risk.reasons.map((r) => `[risk] ${r}`),
    ...approval.reasons.map((r) => `[approval] ${r}`),
  ]

  // Suggested next status: Inbox/New flows to 待分配 once classified.
  const nextStatus =
    status === DISPATCH_STATUSES.INBOX || status === DISPATCH_STATUSES.NEW
      ? DISPATCH_STATUSES.PENDING_ASSIGN
      : status

  return {
    id: input.id || null,
    title: input.title || null,
    source: input.source || 'unknown',
    status,
    nextStatus,
    dueDate: input.dueDate || null,
    suggestedDepartment: dept.department,
    riskLevel: risk.risk,
    approvalRequired: approval.approvalRequired,
    reasons,
    dispatchPlan: {
      action: approval.approvalRequired ? 'queue_for_approval' : 'queue_for_assignment',
      targetStatus: approval.approvalRequired ? 'awaiting_approval' : nextStatus,
      department: dept.department,
      notes: approval.approvalRequired
        ? 'Approval gate required before dispatch. No live action will be taken.'
        : 'Plan only. v0.1 does not call Notion or external APIs.',
    },
    readOnly: true,
    plannedAt: new Date().toISOString(),
  }
}

// Convenience: bulk plan
export function planDispatchBatch(items = []) {
  return items.map((i) => planDispatch(i))
}
