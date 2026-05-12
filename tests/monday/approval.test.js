// Run with: node tests/monday/approval.test.js
import assert from 'node:assert/strict'
import {
  classifyAction,
  enforce,
  buildApprovalTicket,
  APPROVAL_CATEGORIES,
} from '../../lib/monday/approval.js'
import { ingestTask, resetState, dashboardSnapshot } from '../../lib/monday/store.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('classifyAction threads.publish', () => {
  const r = classifyAction({ kind: 'threads.publish', description: 'publish thread' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.THREADS_PUBLISH))
})

t('classifyAction sheets.write by description', () => {
  const r = classifyAction({ description: 'Google Sheet writeback for row 16' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.SHEETS_WRITE))
})

t('classifyAction does not gate read-only Google Sheet review', () => {
  const r = classifyAction({ description: 'read Google Sheet rows for report' })
  assert.equal(r.requiresApproval, false)
})

t('classifyAction notion bulk', () => {
  const r = classifyAction({ description: 'notion bulk archive all old tasks' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.NOTION_DESTRUCTIVE))
})

t('classifyAction notion bulk with reversed wording', () => {
  const r = classifyAction({ description: 'bulk update Notion tasks' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.NOTION_DESTRUCTIVE))
})

t('classifyAction provider key rotation', () => {
  const r = classifyAction({ description: 'rotate token for provider' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.PROVIDER_CONFIG))
})

t('classifyAction scheduler activation', () => {
  const r = classifyAction({ kind: 'scheduler.activate' })
  assert.equal(r.requiresApproval, true)
  assert.ok(r.categories.includes(APPROVAL_CATEGORIES.SCHEDULER_ACTIVATION))
})

t('classifyAction benign action', () => {
  const r = classifyAction({ description: 'plan only, no side effects' })
  assert.equal(r.requiresApproval, false)
})

t('enforce blocks gated actions even when approved', () => {
  const r = enforce(
    { kind: 'threads.publish', description: 'publish' },
    { approvalTicket: { status: 'approved' } },
  )
  assert.equal(r.allow, false)
  assert.equal(r.blocked, true)
})

t('enforce allows non-gated actions', () => {
  const r = enforce({ description: 'read-only summary' })
  assert.equal(r.allow, true)
  assert.equal(r.blocked, false)
})

t('buildApprovalTicket sets pending and not autoApproved', () => {
  const ticket = buildApprovalTicket({ kind: 'threads.publish' }, 'rachel')
  assert.equal(ticket.status, 'pending')
  assert.equal(ticket.autoApproved, false)
  assert.equal(ticket.requester, 'rachel')
})

t('ingestTask queues pending approval for general high-risk dispatch', () => {
  resetState()
  ingestTask({ id: 'risk-1', title: 'production outage decision', status: 'New' })
  const snap = dashboardSnapshot()
  assert.equal(snap.counts.pendingApprovals, 1)
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
