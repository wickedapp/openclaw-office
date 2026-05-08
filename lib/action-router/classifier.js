// Action Router v1 classifier.
// Pure deterministic classification only. No external calls.

export const TASK_TYPES = Object.freeze({
  READ_ONLY: 'read_only',
  PLANNING: 'planning',
  CREATIVE_DRAFT: 'creative_draft',
  CODE_REVIEW: 'code_review',
  GOOGLE_SHEET_MUTATION: 'google_sheet_mutation',
  OAUTH_TASK: 'oauth_task',
  EXTERNAL_API_MUTATION: 'external_api_mutation',
  THREADS_PUBLISH: 'threads_publish',
  SCHEDULER_TASK: 'scheduler_task',
  MANUAL_REVIEW: 'manual_review',
})

const KNOWN_TASK_TYPES = new Set(Object.values(TASK_TYPES))

function flattenText(value, depth = 0) {
  if (value == null || depth > 3) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }
  if (Array.isArray(value)) return value.flatMap((v) => flattenText(v, depth + 1))
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !/token|secret|api[_-]?key|oauth|private[_-]?key|credential|authorization/i.test(key))
      .flatMap(([key, v]) => [key, ...flattenText(v, depth + 1)])
  }
  return []
}

export function taskText(input = {}) {
  const parts = [
    input.text,
    input.title,
    input.body,
    input.description,
    input.command,
    input.action,
    input.kind,
    input.content,
    input.prompt,
    input.task,
    input.payload,
    input.args,
  ]
  return flattenText(parts).join(' ').replace(/\s+/g, ' ').trim()
}

function hasAny(text, patterns) {
  return patterns.some((p) => (typeof p === 'string' ? text.includes(p) : p.test(text)))
}

function explicitType(input = {}) {
  const value = input.task_type || input.taskType || input.type
  if (!value) return null
  const normalized = String(value).trim().toLowerCase()
  return KNOWN_TASK_TYPES.has(normalized) ? normalized : TASK_TYPES.MANUAL_REVIEW
}

export function classifyTask(input = {}) {
  const explicit = explicitType(input)
  const text = taskText(input)
  const t = text.toLowerCase()
  const reasons = []

  if (explicit) {
    reasons.push(`explicit task type "${explicit}"`)
    return {
      taskType: explicit,
      confidence: explicit === TASK_TYPES.MANUAL_REVIEW ? 'low' : 'high',
      reasons,
      text,
    }
  }

  if (!t) {
    return {
      taskType: TASK_TYPES.MANUAL_REVIEW,
      confidence: 'low',
      reasons: ['empty task text'],
      text,
    }
  }

  if (hasAny(t, [/scheduler|cron|daemon|launchd|launchagent|background runner|auto[-\s]?scheduler/])) {
    reasons.push('matched scheduler/cron/daemon keyword')
    return { taskType: TASK_TYPES.SCHEDULER_TASK, confidence: 'high', reasons, text }
  }

  if (hasAny(t, [
    /threads?.*(publish|post|send|go live)/,
    /(publish|post|send|go live).*threads?/,
    /meta.*(publish|post|send)/,
  ])) {
    reasons.push('matched Threads publish keyword')
    return { taskType: TASK_TYPES.THREADS_PUBLISH, confidence: 'high', reasons, text }
  }

  if (hasAny(t, [
    /(google\s*sheets?|spreadsheet|sheet).*(write|writeback|update|append|batch|clear|rebuild|schema|backup|format|validation|mutat|repair|approve)/,
    /(write|writeback|update|append|batch|clear|rebuild|format|validation|mutat|repair|approve).*(google\s*sheets?|spreadsheet|sheet)/,
    /sheets\.googleapis\.com/,
  ])) {
    reasons.push('matched Google Sheet mutation keyword')
    return { taskType: TASK_TYPES.GOOGLE_SHEET_MUTATION, confidence: 'high', reasons, text }
  }

  if (hasAny(t, [
    /oauth|refresh token|access token|token exchange|authorization code|service account|credential/,
    /oauth2\.googleapis\.com/,
  ])) {
    reasons.push('matched OAuth/credential task keyword')
    return { taskType: TASK_TYPES.OAUTH_TASK, confidence: 'high', reasons, text }
  }

  if (hasAny(t, [
    /(external|api|webhook|github|netlify|meta).*(mutat|write|create|update|delete|deploy|send|publish|post)/,
    /(mutat|write|create|update|delete|deploy|send|publish|post).*(external|api|webhook|github|netlify|meta)/,
  ])) {
    reasons.push('matched external API mutation keyword')
    return { taskType: TASK_TYPES.EXTERNAL_API_MUTATION, confidence: 'medium', reasons, text }
  }

  if (hasAny(t, [
    /creative|visual concept|design brief|brand direction|art direction|storyboard|campaign concept/,
    /draft.*(creative|design|visual|brand)/,
  ])) {
    reasons.push('matched creative draft keyword')
    return { taskType: TASK_TYPES.CREATIVE_DRAFT, confidence: 'medium', reasons, text }
  }

  if (hasAny(t, [
    /code review|patch plan|diff plan|implementation plan|technical feasibility|architecture review/,
    /\b(code|bug|test|lint|refactor|endpoint|api)\b.*\b(review|plan|inspect|analy[sz]e|proposal)\b/,
  ])) {
    reasons.push('matched code review / patch plan keyword')
    return { taskType: TASK_TYPES.CODE_REVIEW, confidence: 'medium', reasons, text }
  }

  if (hasAny(t, [
    /\b(read[-\s]?only|inspect|status|check|list|show|summari[sz]e|report|audit)\b/,
    /\bwhat is\b|\bwhat are\b|\bwhich\b/,
  ])) {
    reasons.push('matched read-only keyword')
    return { taskType: TASK_TYPES.READ_ONLY, confidence: 'medium', reasons, text }
  }

  if (hasAny(t, [
    /\bplan\b|planning|proposal|runbook|strategy|estimate|scope|triage/,
    /draft.*plan/,
  ])) {
    reasons.push('matched planning keyword')
    return { taskType: TASK_TYPES.PLANNING, confidence: 'medium', reasons, text }
  }

  return {
    taskType: TASK_TYPES.MANUAL_REVIEW,
    confidence: 'low',
    reasons: ['no known task type matched'],
    text,
  }
}
