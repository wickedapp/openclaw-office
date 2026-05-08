export const REQUIRED_APPROVAL_PHRASE = 'I approve this exact live mutation'

export const LIVE_MUTATION_ACTIONS = Object.freeze({
  discord_send: 'send_discord_message',
  google_sheet_mutation: 'google_sheet_write',
  external_api_mutation: 'external_api_mutation',
  threads_publish: 'threads_publish',
  production_deploy: 'production_deploy',
  scheduler_task: 'scheduler',
  oauth_task: 'oauth_or_credential_mutation',
  secret_handling: 'secret_handling',
  webhook_send: 'webhook_send',
  email_send: 'email_send',
  production_output_overwrite: 'production_output_overwrite',
})

export const REQUIRED_FIELDS = Object.freeze([
  'explicit_approval_phrase',
  'exact_target',
  'exact_action',
  'rollback_owner',
  'environment_confirmation',
  'dry_run_validation_result',
])

function approvalContext(context = {}) {
  const value = context.liveMutationApproval || context.live_mutation_approval || context.approvalPackage || context.approval_package
  return value && typeof value === 'object' ? value : {}
}

export function evaluateLiveMutationGate(taskType, context = {}) {
  const action = LIVE_MUTATION_ACTIONS[taskType]
  if (!action) {
    return {
      required: false,
      action: null,
      allowed: false,
      blockedReason: null,
      missingFields: [],
      approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
      decisionOnly: true,
    }
  }

  const approval = approvalContext(context)
  const missingFields = REQUIRED_FIELDS.filter((field) => !String(approval[field] || '').trim())
  if (missingFields.length > 0) {
    return {
      required: true,
      action,
      allowed: false,
      blockedReason: 'live_mutation_gate_missing_required_approval_fields',
      missingFields,
      approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
      decisionOnly: true,
    }
  }

  if (String(approval.explicit_approval_phrase || '').trim() !== REQUIRED_APPROVAL_PHRASE) {
    return {
      required: true,
      action,
      allowed: false,
      blockedReason: 'live_mutation_gate_approval_phrase_mismatch',
      missingFields: [],
      approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
      decisionOnly: true,
    }
  }

  if (String(approval.exact_action || '').trim() !== action) {
    return {
      required: true,
      action,
      allowed: false,
      blockedReason: 'live_mutation_gate_action_mismatch',
      missingFields: [],
      approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
      decisionOnly: true,
    }
  }

  const dryRun = String(approval.dry_run_validation_result || '').trim().toLowerCase()
  if (!['pass', 'passed', 'proceed', 'proceeded'].includes(dryRun)) {
    return {
      required: true,
      action,
      allowed: false,
      blockedReason: 'live_mutation_gate_dry_run_not_passed',
      missingFields: [],
      approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
      decisionOnly: true,
    }
  }

  return {
    required: true,
    action,
    allowed: true,
    blockedReason: null,
    missingFields: [],
    approvalPhraseRequired: REQUIRED_APPROVAL_PHRASE,
    decisionOnly: true,
  }
}
