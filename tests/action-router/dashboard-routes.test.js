// Run with: node tests/action-router/dashboard-routes.test.js
import assert from 'node:assert/strict'
import { GET as dashboardGET, POST as dashboardPOST } from '../../app/api/monday/dashboard/route.js'
import { POST as dispatchPOST } from '../../app/api/monday/dispatch/route.js'
import { POST as routerPOST } from '../../app/api/action-router/route.js'
import { resetAuditLog } from '../../lib/action-router/audit.js'
import { resetState } from '../../lib/monday/store.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { pass++; console.log(`ok - ${name}`) },
        (e) => { fail++; console.error(`not ok - ${name}\n  ${e.message}`) },
      )
    }
    pass++; console.log(`ok - ${name}`)
  } catch (e) {
    fail++; console.error(`not ok - ${name}\n  ${e.message}`)
  }
}

function req(body) {
  return new Request('http://localhost/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const tests = []
function ta(name, fn) { tests.push(() => t(name, fn)) }

ta('Action Router API read-only task returns main decision', async () => {
  const response = await routerPOST(req({ task: { text: 'check status' }, source: 'dashboard' }))
  const data = await response.json()
  assert.equal(data.selectedAgent, 'main')
  assert.equal(data.requiredApproval, false)
  assert.equal(data.executionStatus, 'decision_only')
})

ta('Monday dispatch read-only planning routes to main', async () => {
  resetState()
  const response = await dispatchPOST(req({
    action: 'plan',
    task: { title: 'show dashboard status', status: 'Inbox' },
  }))
  const data = await response.json()
  assert.equal(data.stored, false)
  assert.equal(data.routeDecision.selectedAgent, 'main')
  assert.equal(data.routeDecision.mutationPermission, false)
})

ta('Monday dispatch Google Sheet mutation is blocked by live gate', async () => {
  const response = await dispatchPOST(req({
    action: 'plan',
    task: { title: 'update Google Sheet schema', status: 'New' },
  }))
  const data = await response.json()
  assert.equal(data.routeDecision.selectedAgent, 'network-runner')
  assert.equal(data.routeDecision.approvalRequired, true)
  assert.equal(data.routeDecision.preflightRequired, true)
  assert.equal(data.routeDecision.executionStatus, 'blocked')
  assert.equal(data.routeDecision.liveMutationGate.allowed, false)
})

ta('Dashboard route shows blocker on preflight fail', async () => {
  const response = await dashboardPOST(req({
    action: 'route',
    task: { text: 'append row to Google Sheet' },
    approval: { status: 'approved' },
    liveMutationApproval: {
      explicit_approval_phrase: 'I approve this exact live mutation',
      exact_target: 'test spreadsheet',
      exact_action: 'google_sheet_write',
      rollback_owner: 'owner',
      environment_confirmation: 'local dry-run only',
      dry_run_validation_result: 'pass',
    },
    preflight: { verdict: 'BLOCKED', blockedReason: 'dns_failed' },
  }))
  const data = await response.json()
  assert.equal(data.selectedAgent, 'network-runner')
  assert.equal(data.executionStatus, 'blocked')
  assert.equal(data.decision.canExecute, false)
  assert.equal(data.decision.blockedReason, 'dns_failed')
})

ta('Dashboard unknown command is blocked for manual review', async () => {
  const response = await dashboardPOST(req({
    action: 'route',
    task: { text: 'perform ambiguous thing' },
  }))
  const data = await response.json()
  assert.equal(data.selectedAgent, 'manual_review')
  assert.equal(data.executionStatus, 'blocked')
  assert.equal(data.decision.blockedReason, 'unknown_task_requires_manual_review')
})

ta('Dashboard GET includes Action Router audit visibility', async () => {
  resetAuditLog()
  await dashboardPOST(req({ action: 'route', task: { text: 'show status' } }))
  const response = await dashboardGET()
  const data = await response.json()
  assert.equal(data.actionRouter.mode, 'action-router-v1-decision-only')
  assert.ok(Array.isArray(data.actionRouter.auditLog))
  assert.ok(data.actionRouter.auditLog.length >= 1)
})

for (const run of tests) await run()

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
