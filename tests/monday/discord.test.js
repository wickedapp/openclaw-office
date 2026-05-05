// Run with: node tests/monday/discord.test.js
import assert from 'node:assert/strict'
import { handleCommand, cmdStatus, cmdReportWeekly } from '../../lib/monday/discord.js'
import { DISPATCH_STATUSES } from '../../lib/monday/dispatch.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

const sampleState = {
  dispatches: [
    { id: 'a', nextStatus: DISPATCH_STATUSES.PENDING_ASSIGN, suggestedDepartment: 'engineering', riskLevel: 'low', plannedAt: new Date().toISOString(), dispatchPlan: { action: 'queue_for_assignment' } },
    { id: 'b', nextStatus: DISPATCH_STATUSES.BLOCKED, suggestedDepartment: 'marketing', riskLevel: 'high', plannedAt: new Date().toISOString(), dispatchPlan: { action: 'queue_for_approval' } },
  ],
  approvals: [
    { id: 'appr_1', status: 'pending', categories: ['threads_publish'], action: { description: 'publish' } },
  ],
}

t('/status counts pending and blocked', () => {
  const r = cmdStatus(sampleState)
  assert.equal(r.summary.pendingDispatch, 1)
  assert.equal(r.summary.blocked, 1)
  assert.equal(r.summary.pendingApprovals, 1)
})

t('/task lists recent', () => {
  const r = handleCommand('/task', sampleState, {})
  assert.equal(r.command, '/task')
  assert.equal(r.tasks.length, 2)
})

t('/task by id', () => {
  const r = handleCommand('/task', sampleState, { id: 'a' })
  assert.equal(r.task.id, 'a')
})

t('/approval list returns pending only', () => {
  const r = handleCommand('/approval list', sampleState, {})
  assert.equal(r.approvals.length, 1)
})

t('/report weekly counts dispatches in last 7 days', () => {
  const r = cmdReportWeekly(sampleState)
  assert.equal(r.counts.dispatches, 2)
  assert.equal(r.counts.approvalsPending, 1)
})

t('unknown command returns error', () => {
  const r = handleCommand('/wat', sampleState, {})
  assert.equal(r.error, 'unknown_command')
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
