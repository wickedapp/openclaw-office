// Run with: node tests/action-router/preflight.test.js
import assert from 'node:assert/strict'
import {
  mockPreflight,
  normalizePreflight,
  PREFLIGHT_VERDICTS,
  REQUIRED_CHECKS,
} from '../../lib/action-router/preflight.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('not required preflight is NOT_REQUIRED', () => {
  const r = normalizePreflight(null, false)
  assert.equal(r.verdict, PREFLIGHT_VERDICTS.NOT_REQUIRED)
  assert.deepEqual(r.checks, [])
})

t('required missing preflight is NOT_RUN with all checks', () => {
  const r = normalizePreflight(null, true)
  assert.equal(r.verdict, PREFLIGHT_VERDICTS.NOT_RUN)
  assert.equal(r.blockedReason, 'preflight_not_run')
  assert.equal(r.checks.length, REQUIRED_CHECKS.length)
})

t('mock PROCEED preflight marks checks pass', () => {
  const r = mockPreflight(PREFLIGHT_VERDICTS.PROCEED)
  assert.equal(r.verdict, PREFLIGHT_VERDICTS.PROCEED)
  assert.equal(r.blockedReason, null)
  assert.ok(r.checks.every((check) => check.status === 'pass'))
})

t('invalid preflight verdict fails closed', () => {
  const r = normalizePreflight({ verdict: 'SKIP' }, true)
  assert.equal(r.verdict, PREFLIGHT_VERDICTS.BLOCKED)
  assert.equal(r.blockedReason, 'preflight_blocked')
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
