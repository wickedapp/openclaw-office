// Run with: node tests/monday/dispatch.test.js
import assert from 'node:assert/strict'
import {
  planDispatch,
  classifyDepartment,
  classifyRisk,
  requiresApproval,
  DEPARTMENTS,
  RISK_LEVELS,
  DISPATCH_STATUSES,
} from '../../lib/monday/dispatch.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('classifyDepartment marketing', () => {
  const r = classifyDepartment('publish a Threads post on brand voice')
  assert.equal(r.department, DEPARTMENTS.MARKETING)
})

t('classifyDepartment engineering', () => {
  const r = classifyDepartment('hotfix a bug in the deploy pipeline')
  assert.equal(r.department, DEPARTMENTS.ENGINEERING)
})

t('classifyDepartment fallback general', () => {
  const r = classifyDepartment('hello world')
  assert.equal(r.department, DEPARTMENTS.GENERAL)
})

t('classifyRisk high on publish', () => {
  const r = classifyRisk('please publish bulk update')
  assert.equal(r.risk, RISK_LEVELS.HIGH)
})

t('classifyRisk critical on production outage', () => {
  const r = classifyRisk('production outage now')
  assert.equal(r.risk, RISK_LEVELS.CRITICAL)
})

t('classifyRisk critical on prod as standalone word', () => {
  const r = classifyRisk('deploy to prod')
  assert.equal(r.risk, RISK_LEVELS.CRITICAL)
})

t('requiresApproval for threads publish', () => {
  const r = requiresApproval('please publish to threads', RISK_LEVELS.LOW)
  assert.equal(r.approvalRequired, true)
})

t('requiresApproval for high risk even with no keyword', () => {
  const r = requiresApproval('do something risky', RISK_LEVELS.HIGH)
  assert.equal(r.approvalRequired, true)
})

t('planDispatch from Inbox -> 待分配', () => {
  const p = planDispatch({ id: 't1', title: 'tweak homepage copy', status: 'Inbox' })
  assert.equal(p.status, DISPATCH_STATUSES.INBOX)
  assert.equal(p.nextStatus, DISPATCH_STATUSES.PENDING_ASSIGN)
  assert.equal(p.readOnly, true)
})

t('planDispatch with threads publish flags approval', () => {
  const p = planDispatch({ id: 't2', title: 'Publish to Threads tonight', status: 'New' })
  assert.equal(p.approvalRequired, true)
  assert.equal(p.dispatchPlan.action, 'queue_for_approval')
})

t('planDispatch preserves dueDate for dashboard overdue checks', () => {
  const p = planDispatch({ id: 't3', title: 'follow up', status: 'Inbox', dueDate: '2026-05-01' })
  assert.equal(p.dueDate, '2026-05-01')
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
