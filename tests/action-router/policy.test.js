// Run with: node tests/action-router/policy.test.js
import assert from 'node:assert/strict'
import { routeAction } from '../../lib/action-router/engine.js'
import { EXECUTION_STATUSES, ROUTER_AGENTS } from '../../lib/action-router/policy.js'
import { PREFLIGHT_VERDICTS } from '../../lib/action-router/preflight.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('read-only routes to main', () => {
  const r = routeAction({ source: 'dashboard', text: 'check status' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MAIN)
  assert.equal(r.blocked, false)
  assert.equal(r.mutationPermission, false)
})

t('creative drafting routes to creative-draft', () => {
  const r = routeAction({ source: 'dashboard', text: 'draft creative concept' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.CREATIVE_DRAFT)
})

t('code review routes to code-sandbox', () => {
  const r = routeAction({ source: 'dashboard', text: 'code review patch plan' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.CODE_SANDBOX)
})

t('Google Sheet mutation requires approval and network preflight', () => {
  const r = routeAction({ source: 'dashboard', text: 'update Google Sheet rows' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.NETWORK_RUNNER)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.PENDING_APPROVAL)
  assert.equal(r.approvalRequired, true)
  assert.equal(r.preflightRequired, true)
  assert.equal(r.blocked, true)
})

t('approved mutation without preflight fails closed', () => {
  const r = routeAction(
    { source: 'dashboard', text: 'append row to Google Sheet' },
    { approval: { status: 'approved' } },
  )
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.preflightVerdict, PREFLIGHT_VERDICTS.NOT_RUN)
  assert.equal(r.blockedReason, 'preflight_not_run')
})

t('preflight BLOCKED stops mutation', () => {
  const r = routeAction(
    { source: 'dashboard', text: 'write Google Sheet schema' },
    {
      approval: { status: 'approved' },
      preflight: { verdict: PREFLIGHT_VERDICTS.BLOCKED, blockedReason: 'dns_failed' },
    },
  )
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'dns_failed')
  assert.equal(r.canExecute, false)
})

t('approved PROCEED mutation can only execute in execute mode', () => {
  const r = routeAction(
    { source: 'cli', text: 'update Google Sheet schema' },
    {
      approval: { status: 'approved' },
      preflight: { verdict: PREFLIGHT_VERDICTS.PROCEED },
      executionMode: 'execute',
    },
  )
  assert.equal(r.executionStatus, EXECUTION_STATUSES.READY_FOR_EXECUTION)
  assert.equal(r.canExecute, true)
})

t('Threads publish requires approval agent and network-runner', () => {
  const r = routeAction({ source: 'discord', text: 'publish this to Threads now' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.NETWORK_RUNNER)
  assert.equal(r.approvalAgent, ROUTER_AGENTS.APPROVAL)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.PENDING_APPROVAL)
})

t('scheduler task is blocked by default', () => {
  const r = routeAction({ source: 'dashboard', text: 'start scheduler daemon' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'scheduler_task_blocked_without_explicit_policy')
})

t('unknown task is blocked for manual review', () => {
  const r = routeAction({ source: 'discord', text: 'do the unusual thing' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'unknown_task_requires_manual_review')
})

t('direct network-runner request for non-network task is blocked', () => {
  const r = routeAction({ source: 'discord', text: 'show status', requestedAgent: 'network-runner' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'direct_network_runner_request_blocked')
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
