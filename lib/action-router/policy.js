import { TASK_TYPES } from './classifier.js'
import { evaluateLiveMutationGate } from './live-mutation-gate.js'
import { PREFLIGHT_VERDICTS, normalizePreflight } from './preflight.js'

export const ROUTER_AGENTS = Object.freeze({
  MAIN: 'main',
  MARKETING_DRAFT: 'marketing-draft',
  CREATIVE_DRAFT: 'creative-draft',
  CODE_SANDBOX: 'code-sandbox',
  NETWORK_RUNNER: 'network-runner',
  APPROVAL: 'approval',
  MANUAL_REVIEW: 'manual_review',
})

export const EXECUTION_STATUSES = Object.freeze({
  DECISION_ONLY: 'decision_only',
  PENDING_APPROVAL: 'pending_approval',
  BLOCKED: 'blocked',
  READY_FOR_EXECUTION: 'ready_for_execution',
})

export const POLICY_TABLE = Object.freeze({
  [TASK_TYPES.READ_ONLY]: {
    selectedAgent: ROUTER_AGENTS.MAIN,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.PLANNING]: {
    selectedAgent: ROUTER_AGENTS.MAIN,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.UI_UPDATE]: {
    selectedAgent: ROUTER_AGENTS.CODE_SANDBOX,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.MARKETING_DRAFT]: {
    selectedAgent: ROUTER_AGENTS.MARKETING_DRAFT,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.CREATIVE_DRAFT]: {
    selectedAgent: ROUTER_AGENTS.CREATIVE_DRAFT,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.CODE_REVIEW]: {
    selectedAgent: ROUTER_AGENTS.CODE_SANDBOX,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.APPROVAL_REQUEST]: {
    selectedAgent: ROUTER_AGENTS.APPROVAL,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.NETWORK_PREFLIGHT]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.GOOGLE_SHEET_MUTATION]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: true,
  },
  [TASK_TYPES.META_APP_REVIEW]: {
    selectedAgent: ROUTER_AGENTS.MARKETING_DRAFT,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.STORY_BOOK_WORKFLOW]: {
    selectedAgent: ROUTER_AGENTS.CREATIVE_DRAFT,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.STATUS_READOUT]: {
    selectedAgent: ROUTER_AGENTS.MAIN,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.DISCORD_STATUS_CHECK]: {
    selectedAgent: ROUTER_AGENTS.MAIN,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.DISCORD_COMMAND_REVIEW]: {
    selectedAgent: ROUTER_AGENTS.APPROVAL,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: false,
    preflightRequired: false,
    mutationPermission: false,
  },
  [TASK_TYPES.DISCORD_SEND]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'discord_send_blocked_without_explicit_approval',
  },
  [TASK_TYPES.TELEGRAM_NOTIFICATION]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: true,
  },
  [TASK_TYPES.OAUTH_TASK]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: true,
  },
  [TASK_TYPES.EXTERNAL_API_MUTATION]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: true,
  },
  [TASK_TYPES.THREADS_PUBLISH]: {
    selectedAgent: ROUTER_AGENTS.NETWORK_RUNNER,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: true,
  },
  [TASK_TYPES.PRODUCTION_DEPLOY]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'production_deploy_blocked_without_explicit_approval',
  },
  [TASK_TYPES.SCHEDULER_TASK]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'scheduler_task_blocked_without_explicit_policy',
  },
  [TASK_TYPES.SECRET_HANDLING]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: false,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'secret_handling_requires_owner_input',
  },
  [TASK_TYPES.WEBHOOK_SEND]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'webhook_send_blocked_without_explicit_approval',
  },
  [TASK_TYPES.EMAIL_SEND]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'email_send_blocked_without_explicit_approval',
  },
  [TASK_TYPES.PRODUCTION_OUTPUT_OVERWRITE]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalAgent: ROUTER_AGENTS.APPROVAL,
    approvalRequired: true,
    preflightRequired: true,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'production_output_overwrite_blocked_without_explicit_approval',
  },
  [TASK_TYPES.MANUAL_REVIEW]: {
    selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
    approvalRequired: true,
    preflightRequired: false,
    mutationPermission: false,
    blockedByDefault: true,
    blockedReason: 'unknown_task_requires_manual_review',
  },
})

function approvalStatus(approval) {
  if (!approval) return 'missing'
  return approval.status || approval.state || 'missing'
}

export function policyFor(taskType) {
  return POLICY_TABLE[taskType] || POLICY_TABLE[TASK_TYPES.MANUAL_REVIEW]
}

export function evaluatePolicy(classification, context = {}) {
  const taskType = classification?.taskType || TASK_TYPES.MANUAL_REVIEW
  const policy = policyFor(taskType)
  const approval = approvalStatus(context.approval)
  const preflight = normalizePreflight(context.preflight, policy.preflightRequired)
  const source = context.source || 'unknown'
  const requestedAgent = context.requestedAgent || null
  const executionMode = context.executionMode || 'decision_only'
  const liveMutationGate = evaluateLiveMutationGate(taskType, context)

  const base = {
    source,
    taskType,
    selectedAgent: policy.selectedAgent,
    approvalAgent: policy.approvalAgent || null,
    approvalRequired: policy.approvalRequired,
    approvalStatus: approval,
    preflightRequired: policy.preflightRequired,
    preflightVerdict: preflight.verdict,
    mutationPermission: policy.mutationPermission,
    executionStatus: EXECUTION_STATUSES.DECISION_ONLY,
    canExecute: false,
    blocked: false,
    blockedReason: null,
    policy,
    preflight,
    liveMutationGate,
  }

  if (requestedAgent === ROUTER_AGENTS.NETWORK_RUNNER && policy.selectedAgent !== ROUTER_AGENTS.NETWORK_RUNNER) {
    return {
      ...base,
      selectedAgent: ROUTER_AGENTS.MANUAL_REVIEW,
      executionStatus: EXECUTION_STATUSES.BLOCKED,
      blocked: true,
      blockedReason: 'direct_network_runner_request_blocked',
    }
  }

  if (liveMutationGate.required && !liveMutationGate.allowed) {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.BLOCKED,
      blocked: true,
      blockedReason: liveMutationGate.blockedReason || 'live_mutation_gate_blocked',
      canExecute: false,
    }
  }

  if (policy.blockedByDefault) {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.BLOCKED,
      blocked: true,
      blockedReason: policy.blockedReason || 'blocked_by_policy',
    }
  }

  if (!policy.mutationPermission) {
    return base
  }

  if (policy.approvalRequired && approval !== 'approved') {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.PENDING_APPROVAL,
      blocked: true,
      blockedReason: 'approval_required',
    }
  }

  if (policy.preflightRequired && preflight.verdict !== PREFLIGHT_VERDICTS.PROCEED) {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.BLOCKED,
      blocked: true,
      blockedReason: preflight.blockedReason || 'preflight_blocked',
    }
  }

  if (liveMutationGate.required) {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.DECISION_ONLY,
      blocked: false,
      blockedReason: null,
      canExecute: false,
    }
  }

  if (executionMode !== 'execute') {
    return {
      ...base,
      executionStatus: EXECUTION_STATUSES.DECISION_ONLY,
      blocked: false,
      blockedReason: null,
    }
  }

  return {
    ...base,
    executionStatus: EXECUTION_STATUSES.READY_FOR_EXECUTION,
    canExecute: true,
  }
}
