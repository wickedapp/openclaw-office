// Run with: node tests/action-router/classifier.test.js
import assert from 'node:assert/strict'
import { classifyTask, TASK_TYPES } from '../../lib/action-router/classifier.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`) }
  catch (e) { fail++; console.error(`not ok - ${name}\n  ${e.message}`) }
}

t('classifies read-only task', () => {
  assert.equal(classifyTask({ text: 'show dashboard status' }).taskType, TASK_TYPES.READ_ONLY)
})

t('classifies planning task', () => {
  assert.equal(classifyTask({ text: 'plan the next operating runbook' }).taskType, TASK_TYPES.PLANNING)
})

t('does not treat checklist as read-only check command', () => {
  assert.equal(classifyTask({ text: "plan tomorrow's operating checklist" }).taskType, TASK_TYPES.PLANNING)
})

t('classifies creative drafting task', () => {
  assert.equal(classifyTask({ text: 'draft a creative visual concept' }).taskType, TASK_TYPES.CREATIVE_DRAFT)
})

t('classifies code review task', () => {
  assert.equal(classifyTask({ text: 'code review and patch plan for router' }).taskType, TASK_TYPES.CODE_REVIEW)
})

t('classifies Google Sheet mutation', () => {
  assert.equal(classifyTask({ text: 'update Google Sheet row 12' }).taskType, TASK_TYPES.GOOGLE_SHEET_MUTATION)
})

t('classifies OAuth task', () => {
  assert.equal(classifyTask({ text: 'perform OAuth token exchange' }).taskType, TASK_TYPES.OAUTH_TASK)
})

t('classifies external API mutation', () => {
  assert.equal(classifyTask({ text: 'create GitHub API issue' }).taskType, TASK_TYPES.EXTERNAL_API_MUTATION)
})

t('classifies Threads publish', () => {
  assert.equal(classifyTask({ text: 'publish this draft to Threads' }).taskType, TASK_TYPES.THREADS_PUBLISH)
})

t('classifies scheduler task', () => {
  assert.equal(classifyTask({ text: 'start cron scheduler for nightly runs' }).taskType, TASK_TYPES.SCHEDULER_TASK)
})

t('classifies status readout as read-only status readout', () => {
  assert.equal(classifyTask({ text: 'read latest status with browser TTS' }).taskType, TASK_TYPES.STATUS_READOUT)
})

t('classifies Discord status check as read-only', () => {
  assert.equal(classifyTask({ text: 'check Discord control status' }).taskType, TASK_TYPES.DISCORD_STATUS_CHECK)
})

t('classifies dangerous Discord send separately', () => {
  assert.equal(classifyTask({ text: 'send a Discord message to approvals' }).taskType, TASK_TYPES.DISCORD_SEND)
})

t('classifies production deploy as blocked category', () => {
  assert.equal(classifyTask({ text: 'deploy production dashboard' }).taskType, TASK_TYPES.PRODUCTION_DEPLOY)
})

t('classifies webhook, email, and production output overwrite as live mutations', () => {
  assert.equal(classifyTask({ text: 'send webhook notification' }).taskType, TASK_TYPES.WEBHOOK_SEND)
  assert.equal(classifyTask({ text: 'send email blast' }).taskType, TASK_TYPES.EMAIL_SEND)
  assert.equal(classifyTask({ text: 'overwrite production PDF output' }).taskType, TASK_TYPES.PRODUCTION_OUTPUT_OVERWRITE)
})

t('classifies secret handling as owner-gated', () => {
  assert.equal(classifyTask({ text: 'rotate Discord token' }).taskType, TASK_TYPES.SECRET_HANDLING)
})

t('classifies department route tasks', () => {
  assert.equal(classifyTask({ text: 'dashboard UI update for status cards' }).taskType, TASK_TYPES.UI_UPDATE)
  assert.equal(classifyTask({ text: 'marketing draft for Threads copy' }).taskType, TASK_TYPES.MARKETING_DRAFT)
  assert.equal(classifyTask({ text: 'network preflight dns probe' }).taskType, TASK_TYPES.NETWORK_PREFLIGHT)
  assert.equal(classifyTask({ text: 'Meta App Review asset package' }).taskType, TASK_TYPES.META_APP_REVIEW)
  assert.equal(classifyTask({ text: 'Story Class picture book workflow status' }).taskType, TASK_TYPES.STORY_BOOK_WORKFLOW)
})

t('unknown task routes to manual review', () => {
  assert.equal(classifyTask({ text: 'glarbulate the frobnitz' }).taskType, TASK_TYPES.MANUAL_REVIEW)
})

t('sensitive object keys are ignored during classification', () => {
  const result = classifyTask({
    text: 'show status',
    apiKey: 'update Google Sheet row 1',
    oauthToken: 'publish to Threads',
  })
  assert.equal(result.taskType, TASK_TYPES.READ_ONLY)
})

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
