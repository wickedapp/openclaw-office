// Run with: node tests/action-router/notification-routes.test.js
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const tempDir = mkdtempSync(join(tmpdir(), 'openclaw-office-route-test-'))
const originalCwd = process.cwd()
const originalFetch = globalThis.fetch
let fetchCalls = 0

process.chdir(tempDir)
process.env.OPENCLAW_CONFIG_PATH = join(tempDir, 'missing-openclaw.json')
process.env.TELEGRAM_BOT_TOKEN = 'fake-test-token'
process.env.TELEGRAM_CHAT_ID = 'fake-test-chat'
globalThis.fetch = async () => {
  fetchCalls += 1
  return { ok: true, text: async () => '' }
}

const openclawRoute = await import(pathToFileURL(join(repoRoot, 'app/api/openclaw/route.js')).href)
const workflowRoute = await import(pathToFileURL(join(repoRoot, 'app/api/workflow/route.js')).href)

await t('/api/openclaw notify=true returns route-only decision without Telegram fetch', async () => {
  const response = await openclawRoute.POST(req({
    action: 'assign',
    agent: 'xarisauto',
    content: 'show status',
    notify: true,
  }))
  const data = await response.json()
  assert.equal(response.status, 202)
  assert.equal(data.routed, true)
  assert.equal(data.decision.taskType, 'telegram_notification')
  assert.equal(data.decision.liveMutationGate.action, 'telegram_notification')
  assert.equal(data.decision.executionStatus, 'blocked')
  assert.equal(fetchCalls, 0)
})

await t('/api/workflow quick_flow notify=true returns route-only decision without Telegram fetch', async () => {
  const response = await workflowRoute.POST(req({
    action: 'quick_flow',
    agent: 'xarisauto',
    content: 'show status',
    notify: true,
  }))
  const data = await response.json()
  assert.equal(response.status, 202)
  assert.equal(data.routed, true)
  assert.equal(data.decision.taskType, 'telegram_notification')
  assert.equal(data.decision.liveMutationGate.action, 'telegram_notification')
  assert.equal(data.decision.executionStatus, 'blocked')
  assert.equal(fetchCalls, 0)
})

await t('incomplete live mutation approval still blocks notification send', async () => {
  const response = await openclawRoute.POST(req({
    action: 'assign',
    agent: 'xarisauto',
    content: 'show status',
    notify: true,
    liveMutationApproval: {
      explicit_approval_phrase: 'I approve this exact live mutation',
    },
  }))
  const data = await response.json()
  assert.equal(response.status, 202)
  assert.equal(data.decision.blockedReason, 'live_mutation_gate_missing_required_approval_fields')
  assert.equal(fetchCalls, 0)
})

await t('complete approval still stays decision-only and does not send notification', async () => {
  const response = await workflowRoute.POST(req({
    action: 'quick_flow',
    agent: 'xarisauto',
    content: 'show status',
    notify: true,
    approval: { status: 'approved' },
    liveMutationApproval: {
      explicit_approval_phrase: 'I approve this exact live mutation',
      exact_target: 'operator chat',
      exact_action: 'telegram_notification',
      rollback_owner: 'owner',
      environment_confirmation: 'local dry-run only',
      dry_run_validation_result: 'pass',
    },
    preflight: { verdict: 'PROCEED' },
  }))
  const data = await response.json()
  assert.equal(response.status, 202)
  assert.equal(data.decision.blocked, false)
  assert.equal(data.decision.executionStatus, 'decision_only')
  assert.equal(data.decision.mutationPermission, true)
  assert.equal(fetchCalls, 0)
})

await t('unknown workflow action cannot trigger notification send', async () => {
  const response = await workflowRoute.POST(req({
    action: 'unknown_action',
    notify: true,
  }))
  const data = await response.json()
  assert.equal(response.status, 400)
  assert.equal(data.error, 'Unknown action')
  assert.equal(fetchCalls, 0)
})

process.chdir(originalCwd)
globalThis.fetch = originalFetch
rmSync(tempDir, { recursive: true, force: true })

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
