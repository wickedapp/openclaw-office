// Run with: node tests/action-router/audit.test.js
import assert from 'node:assert/strict'
import { routeAction } from '../../lib/action-router/engine.js'
import { getAuditLog, resetAuditLog } from '../../lib/action-router/audit.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('audit log redacts secrets and person data', () => {
  resetAuditLog()
  const fakeToken = ['sk', 'proj', 'abcdefghijklmnop'].join('-')
  const fakeGoogleKey = ['AI', 'za', 'abcdefghijklmnopqrstu'].join('')
  const fakePrivateKey = ['-----BEGIN ', 'PRIVATE KEY', '-----abc-----END ', 'PRIVATE KEY', '-----'].join('')
  const fakeStudentName = ['Al', 'ice'].join('')
  const fakeCustomerName = ['B', 'ob'].join('')
  const fakeEmail = ['alice', 'example.com'].join('@')
  const fakePhone = ['+852', '1234', '5678'].join(' ')
  const secretKeyName = ['service', 'Account', 'Private', 'Key'].join('')
  routeAction({
    source: 'dashboard',
    text: [
      `student ${fakeStudentName}`,
      `email ${fakeEmail}`,
      `customer ${fakeCustomerName}`,
      `phone ${fakePhone}`,
      ['token', fakeToken].join('='),
    ].join(' '),
    apiKey: fakeGoogleKey,
    [secretKeyName]: fakePrivateKey,
  })
  const json = JSON.stringify(getAuditLog())
  assert.equal(json.includes('sk-proj-'), false)
  assert.equal(json.includes('AIza'), false)
  assert.equal(json.includes('PRIVATE KEY'), false)
  assert.equal(json.includes(fakeEmail), false)
  assert.equal(json.includes(fakeStudentName), false)
  assert.equal(json.includes(fakeCustomerName), false)
  assert.equal(json.toLowerCase().includes(`student ${fakeStudentName}`.toLowerCase()), false)
  assert.equal(json.toLowerCase().includes(`customer ${fakeCustomerName}`.toLowerCase()), false)
})

t('blocked tasks still write audit log', () => {
  resetAuditLog()
  const r = routeAction({ source: 'discord', text: 'start cron daemon' })
  const logs = getAuditLog()
  assert.equal(r.blocked, true)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].blocked_reason, 'live_mutation_gate_missing_required_approval_fields')
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
