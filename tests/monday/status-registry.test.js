// Run with: node tests/monday/status-registry.test.js
import assert from 'node:assert/strict'
import { buildReadoutSummary, buildStatusSnapshot } from '../../lib/status-registry.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('status snapshot exposes departments and workflows', () => {
  const snap = buildStatusSnapshot()
  assert.equal(snap.safety.readOnly, true)
  assert.equal(snap.safety.microphonePermission, false)
  assert.equal(snap.safety.liveMutationGateDefault, 'blocked')
  assert.ok(snap.departments.some((d) => d.id === 'pm-monday'))
  assert.ok(snap.workflows.some((w) => w.id === 'discord-control'))
  assert.ok(snap.workflows.some((w) => w.id === 'live-mutation-gate'))
})

t('Discord registry is decision-only and send-blocked', () => {
  const snap = buildStatusSnapshot()
  const discord = snap.workflows.find((w) => w.id === 'discord-control')
  assert.equal(discord.decision_only, true)
  assert.equal(discord.can_send_message, false)
  assert.equal(discord.approval_gate_required, true)
  assert.equal(discord.live_mutation_gate_required, true)
  assert.ok(discord.blocked_actions.includes('send_discord_message'))
  assert.ok(discord.blocked_actions.includes('scheduler'))
})

t('live mutation gate registry is fail-closed with approval requirements', () => {
  const snap = buildStatusSnapshot()
  const gate = snap.workflows.find((w) => w.id === 'live-mutation-gate')
  assert.equal(gate.gate_status, 'active_fail_closed')
  assert.equal(gate.decision_only, true)
  assert.ok(gate.blocked_actions.includes('google_sheet_write'))
  assert.ok(gate.blocked_actions.includes('production_output_overwrite'))
  assert.ok(gate.manual_required.includes('confirm_exact_target_and_action'))
})

t('readout summary is sanitized and summary-only', () => {
  const snap = buildStatusSnapshot()
  snap.blockedActions.push('token=sk-' + 'a'.repeat(24))
  const text = buildReadoutSummary(snap, 'overall')
  assert(!text.includes('sk-'))
  assert(text.includes('[REDACTED'))
})

t('readout never enables mutation safety flags', () => {
  const snap = buildStatusSnapshot()
  assert.equal(snap.safety.actionRouterMutation, false)
  assert.equal(snap.safety.discordSend, false)
  assert.equal(snap.safety.publishDeployScheduler, false)
  assert.equal(snap.safety.googleSheetWrite, false)
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
