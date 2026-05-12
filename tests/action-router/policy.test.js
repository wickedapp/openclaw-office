// Run with: node tests/action-router/policy.test.js
import assert from 'node:assert/strict'
import { routeAction } from '../../lib/action-router/engine.js'
import { REQUIRED_APPROVAL_PHRASE } from '../../lib/action-router/live-mutation-gate.js'
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
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.approvalRequired, true)
  assert.equal(r.preflightRequired, true)
  assert.equal(r.blocked, true)
  assert.equal(r.liveMutationGate.allowed, false)
})

t('approved mutation without preflight fails closed', () => {
  const r = routeAction(
    { source: 'dashboard', text: 'append row to Google Sheet' },
    {
      approval: { status: 'approved' },
      liveMutationApproval: {
        explicit_approval_phrase: REQUIRED_APPROVAL_PHRASE,
        exact_target: 'test spreadsheet',
        exact_action: 'google_sheet_write',
        rollback_owner: 'owner',
        environment_confirmation: 'local dry-run only',
        dry_run_validation_result: 'pass',
      },
    },
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
      liveMutationApproval: {
        explicit_approval_phrase: REQUIRED_APPROVAL_PHRASE,
        exact_target: 'test spreadsheet',
        exact_action: 'google_sheet_write',
        rollback_owner: 'owner',
        environment_confirmation: 'local dry-run only',
        dry_run_validation_result: 'pass',
      },
      preflight: { verdict: PREFLIGHT_VERDICTS.BLOCKED, blockedReason: 'dns_failed' },
    },
  )
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'dns_failed')
  assert.equal(r.canExecute, false)
})

t('approved PROCEED live mutation still returns decision only', () => {
  const r = routeAction(
    { source: 'cli', text: 'update Google Sheet schema' },
    {
      approval: { status: 'approved' },
      liveMutationApproval: {
        explicit_approval_phrase: REQUIRED_APPROVAL_PHRASE,
        exact_target: 'test spreadsheet',
        exact_action: 'google_sheet_write',
        rollback_owner: 'owner',
        environment_confirmation: 'local dry-run only',
        dry_run_validation_result: 'pass',
      },
      preflight: { verdict: PREFLIGHT_VERDICTS.PROCEED },
      executionMode: 'execute',
    },
  )
  assert.equal(r.liveMutationGate.allowed, true)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.DECISION_ONLY)
  assert.equal(r.canExecute, false)
})

t('Threads publish requires approval agent and network-runner', () => {
  const r = routeAction({ source: 'discord', text: 'publish this to Threads now' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.NETWORK_RUNNER)
  assert.equal(r.approvalAgent, ROUTER_AGENTS.APPROVAL)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.liveMutationGate.action, 'threads_publish')
})

t('scheduler task is blocked by default', () => {
  const r = routeAction({ source: 'dashboard', text: 'start scheduler daemon' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
})

t('status readout is read-only and cannot execute mutation', () => {
  const r = routeAction({ source: 'dashboard', text: 'read latest status with speechSynthesis' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MAIN)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.DECISION_ONLY)
  assert.equal(r.mutationPermission, false)
  assert.equal(r.canExecute, false)
})

t('Discord status check is read-only', () => {
  const r = routeAction({ source: 'discord', text: 'check Discord status' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MAIN)
  assert.equal(r.blocked, false)
  assert.equal(r.mutationPermission, false)
})

t('Discord send is blocked by default', () => {
  const r = routeAction({ source: 'discord', text: 'send Discord message to alerts' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.liveMutationGate.action, 'send_discord_message')
  assert.equal(r.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
})

t('Telegram notification is blocked by live mutation gate by default', () => {
  const r = routeAction({ source: 'dashboard', text: 'send Telegram notification to operator' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.NETWORK_RUNNER)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.mutationPermission, true)
  assert.equal(r.liveMutationGate.action, 'telegram_notification')
  assert.equal(r.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
})

t('Telegram notification approval package must match exact action', () => {
  const r = routeAction(
    { source: 'dashboard', text: 'send Telegram notification to operator' },
    {
      liveMutationApproval: {
        explicit_approval_phrase: REQUIRED_APPROVAL_PHRASE,
        exact_target: 'operator chat',
        exact_action: 'webhook_send',
        rollback_owner: 'owner',
        environment_confirmation: 'local dry-run only',
        dry_run_validation_result: 'pass',
      },
    },
  )
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.blockedReason, 'live_mutation_gate_action_mismatch')
})

t('production deploy is blocked by default', () => {
  const r = routeAction({ source: 'dashboard', text: 'deploy production release' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.liveMutationGate.action, 'production_deploy')
  assert.equal(r.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
})

t('secret handling is owner gated and blocked by default', () => {
  const r = routeAction({ source: 'dashboard', text: 'handle Discord token rotation' })
  assert.equal(r.selectedAgent, ROUTER_AGENTS.MANUAL_REVIEW)
  assert.equal(r.executionStatus, EXECUTION_STATUSES.BLOCKED)
  assert.equal(r.liveMutationGate.action, 'secret_handling')
  assert.equal(r.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
})

t('live mutation gate blocks incomplete or mismatched approval packages', () => {
  const incomplete = routeAction({ source: 'dashboard', text: 'write Google Sheet row' })
  assert.equal(incomplete.blockedReason, 'live_mutation_gate_missing_required_approval_fields')

  const mismatch = routeAction(
    { source: 'discord', text: 'send Discord message to alerts' },
    {
      liveMutationApproval: {
        explicit_approval_phrase: REQUIRED_APPROVAL_PHRASE,
        exact_target: 'alerts',
        exact_action: 'google_sheet_write',
        rollback_owner: 'owner',
        environment_confirmation: 'test',
        dry_run_validation_result: 'pass',
      },
    },
  )
  assert.equal(mismatch.blockedReason, 'live_mutation_gate_action_mismatch')
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
