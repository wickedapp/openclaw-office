// Redacted in-memory audit log for Action Router v1.
// Never store raw secrets, credential material, customer data, or student data.

const auditLog = []
const MAX_AUDIT_RECORDS = 500

const SENSITIVE_KEY_RE = /token|secret|api[_-]?key|oauth|private[_-]?key|service[_-]?account|credential|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token|customer|student|email|phone|address/i
const SENSITIVE_TEXT_RE = /\b(customer|student|parent|guardian|child|client)\b[^,.;\n]*/gi

export function redactValue(value) {
  if (value == null) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value
      .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
      .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[REDACTED]')
      .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|gh[pousr]_[0-9A-Za-z_]{16,})\b/g, '[REDACTED_SECRET]')
      .replace(/((token|secret|api[_-]?key|oauth|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[REDACTED_PHONE]')
      .replace(SENSITIVE_TEXT_RE, '[REDACTED_PERSON_DATA]')
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v))
  if (typeof value === 'object') {
    const out = {}
    for (const [key, v] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? '[REDACTED]' : redactValue(v)
    }
    return out
  }
  return String(value)
}

export function redactedSummary(input = {}) {
  const safe = redactValue({
    source: input.source,
    command: input.command || input.name,
    task_type: input.task_type || input.taskType || input.type,
    title: input.title || input.task?.title,
    description: input.description || input.body || input.text || input.content || input.task?.body,
  })
  const text = JSON.stringify(safe)
  return text.length > 220 ? `${text.slice(0, 217)}...` : text
}

export function buildAuditRecord(decision, input = {}) {
  return {
    auditId: `ar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    source: decision.source || input.source || 'unknown',
    task_type: decision.taskType,
    selected_agent: decision.selectedAgent,
    approval_status: decision.approvalStatus,
    preflight_verdict: decision.preflightVerdict,
    mutation_permission: decision.mutationPermission,
    execution_result: decision.executionStatus,
    blocked_reason: decision.blockedReason,
    summary: redactedSummary(input),
  }
}

export function appendAuditRecord(record) {
  const safe = redactValue(record)
  auditLog.push(safe)
  if (auditLog.length > MAX_AUDIT_RECORDS) auditLog.splice(0, auditLog.length - MAX_AUDIT_RECORDS)
  return safe
}

export function getAuditLog() {
  return auditLog.slice()
}

export function resetAuditLog() {
  auditLog.length = 0
}
