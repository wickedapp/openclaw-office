import { classifyTask } from './classifier.js'
import { evaluatePolicy, POLICY_TABLE } from './policy.js'
import { appendAuditRecord, buildAuditRecord } from './audit.js'

export function routeAction(input = {}, context = {}) {
  const source = input.source || context.source || 'unknown'
  const classification = classifyTask(input)
  const decision = evaluatePolicy(classification, {
    ...context,
    source,
    requestedAgent: input.requestedAgent || input.agent || context.requestedAgent,
    executionMode: context.executionMode || input.executionMode || 'decision_only',
  })
  const audit = appendAuditRecord(buildAuditRecord(decision, input))

  return {
    ...decision,
    classification,
    auditId: audit.auditId,
    audit,
    policyVersion: 'action-router-v1',
  }
}

export function routerPolicyTable() {
  return POLICY_TABLE
}
