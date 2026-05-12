// Mockable NetworkRunner preflight contract for Action Router v1.
// This module never performs network I/O. Tests and callers provide verdicts.

export const PREFLIGHT_VERDICTS = Object.freeze({
  NOT_REQUIRED: 'NOT_REQUIRED',
  NOT_RUN: 'NOT_RUN',
  PROCEED: 'PROCEED',
  BLOCKED: 'BLOCKED',
})

const REQUIRED_CHECKS = Object.freeze([
  'interface',
  'default_route',
  'dns',
  'https_oauth2_googleapis',
  'https_sheets_googleapis',
  'https_google',
])

export function normalizePreflight(input, required = false) {
  if (!required) {
    return {
      required: false,
      verdict: PREFLIGHT_VERDICTS.NOT_REQUIRED,
      checks: [],
      blockedReason: null,
    }
  }

  if (!input) {
    return {
      required: true,
      verdict: PREFLIGHT_VERDICTS.NOT_RUN,
      checks: REQUIRED_CHECKS.map((name) => ({ name, status: 'not_run' })),
      blockedReason: 'preflight_not_run',
    }
  }

  const verdict = Object.values(PREFLIGHT_VERDICTS).includes(input.verdict)
    ? input.verdict
    : PREFLIGHT_VERDICTS.BLOCKED
  const checks = Array.isArray(input.checks) ? input.checks : REQUIRED_CHECKS.map((name) => ({
    name,
    status: verdict === PREFLIGHT_VERDICTS.PROCEED ? 'pass' : 'blocked',
  }))

  return {
    required: true,
    verdict,
    checks,
    blockedReason: verdict === PREFLIGHT_VERDICTS.PROCEED ? null : (input.blockedReason || 'preflight_blocked'),
  }
}

export function mockPreflight(verdict = PREFLIGHT_VERDICTS.BLOCKED, overrides = {}) {
  return normalizePreflight({ verdict, ...overrides }, true)
}

export { REQUIRED_CHECKS }
