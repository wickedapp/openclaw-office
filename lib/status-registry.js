import { redactValue } from './action-router/audit.js'

export const BLOCKED_ACTIONS = Object.freeze([
  'send_discord_message',
  'start_discord_bot',
  'start_listener',
  'publish',
  'deploy',
  'scheduler',
  'threads_publish',
  'google_sheet_write',
  'production_mutation',
  'webhook_send',
  'email_send',
  'production_output_overwrite',
])

export const DEPARTMENT_PROGRESS = Object.freeze([
  {
    id: 'pm-monday',
    name: 'PM / Monday',
    status: 'active',
    latestCheckpoint: 'pm-sandbox is the canonical runtime; Monday remains PM orchestrator.',
    relatedPath: 'openclaw-operations/RUNTIME_CANONICAL.md',
    lastValidationResult: 'static registry loaded',
    nextSuggestedAction: 'Keep routing in decision-only mode and surface manual blockers separately.',
    dangerFlags: ['manual approval required for mutations'],
  },
  {
    id: 'code',
    name: 'Code',
    status: 'active',
    latestCheckpoint: 'code-sandbox repo exists as nested repo with untracked profile files.',
    relatedPath: 'agents/code-sandbox',
    lastValidationResult: 'nested repo discovered',
    nextSuggestedAction: 'Use local tests before any commit; do not deploy or push automatically.',
    dangerFlags: ['external deploy blocked'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    status: 'active',
    latestCheckpoint: 'XarisAuto / Threads / Google Sheets scaffolds remain approval-gated.',
    relatedPath: 'marketing_agent',
    lastValidationResult: 'dry-run first policy retained',
    nextSuggestedAction: 'Keep Sheet writes and Threads publishing behind explicit approval.',
    dangerFlags: ['external publish blocked', 'secret needed for live Meta/Sheets'],
  },
  {
    id: 'creative',
    name: 'Creative',
    status: 'active',
    latestCheckpoint: 'Story Class picture-book production scaffold and reports are present.',
    relatedPath: 'projects/story-class-picture-books',
    lastValidationResult: 'production output not mutated',
    nextSuggestedAction: 'Use safe queues and approval logs before image/PDF production changes.',
    dangerFlags: ['production output overwrite blocked'],
  },
  {
    id: 'approval',
    name: 'Approval',
    status: 'active',
    latestCheckpoint: 'Approval gate remains required for send, publish, deploy, scheduler, credential, and write actions.',
    relatedPath: 'openclaw-operations/APPROVAL_RULES.md',
    lastValidationResult: 'policy documented',
    nextSuggestedAction: 'Review high-risk requests; never auto-approve.',
    dangerFlags: ['manual approval required'],
  },
  {
    id: 'network-runner',
    name: 'NetworkRunner',
    status: 'active',
    latestCheckpoint: 'NetworkRunner is limited to preflight and controlled calls.',
    relatedPath: 'agents/network-runner',
    lastValidationResult: 'nested repo discovered',
    nextSuggestedAction: 'Run only read-only connectivity checks unless user approves exact mutation.',
    dangerFlags: ['external call guarded'],
  },
  {
    id: 'story-class',
    name: 'Story Class',
    status: 'active',
    latestCheckpoint: 'Picture-book workflow has production scaffold and generated reports.',
    relatedPath: 'projects/story-class-picture-books',
    lastValidationResult: 'read-only registry entry',
    nextSuggestedAction: 'Do not overwrite images/PDFs without explicit production approval.',
    dangerFlags: ['production output overwrite blocked'],
  },
  {
    id: 'xarisauto',
    name: 'XarisAuto',
    status: 'blocked',
    latestCheckpoint: 'Google Sheet schema rebuild has documented blocker reports.',
    relatedPath: 'reports/xarisauto_sheet_schema_rebuild_2026_05_08.md',
    lastValidationResult: 'manual credential / business confirmation required for live writes',
    nextSuggestedAction: 'Keep local planning and dry-run validation only.',
    dangerFlags: ['secret needed', 'Google Sheet write blocked'],
  },
  {
    id: 'smartstart',
    name: 'SmartStart',
    status: 'unknown',
    latestCheckpoint: 'Referenced by operating scope but no dedicated local source was confirmed in this pass.',
    relatedPath: 'openclaw-operations',
    lastValidationResult: 'unknown source',
    nextSuggestedAction: 'Add source path or status report when available.',
    dangerFlags: ['needs manual input'],
  },
  {
    id: 'openclaw-core',
    name: 'OpenClaw Core',
    status: 'active',
    latestCheckpoint: 'pm-sandbox config hash captured by audit; no runtime config mutation performed.',
    relatedPath: '/Users/cheuklok/.openclaw-pm-sandbox/openclaw.json',
    lastValidationResult: 'hash-only audit',
    nextSuggestedAction: 'User restart is required for any future gateway config reload.',
    dangerFlags: ['restart requires user'],
  },
  {
    id: 'discord-control',
    name: 'Discord Control',
    status: 'blocked',
    latestCheckpoint: 'Decision-only routing is available; bot/listener/message send remain blocked.',
    relatedPath: 'integrations/discord_control',
    lastValidationResult: 'local tests only',
    nextSuggestedAction: 'Keep Discord status visible without connecting to production Discord.',
    dangerFlags: ['Discord send blocked', 'manual approval required', 'secret needed for live bot'],
  },
])

export const WORKFLOW_STATUS_REGISTRY = Object.freeze([
  {
    id: 'openclaw-runtime',
    name: 'OpenClaw runtime',
    department: 'PM / Monday',
    repo_path: '/Users/cheuklok/.openclaw/workspace-pm-sandbox',
    status_source: 'openclaw-operations/RUNTIME_CANONICAL.md',
    last_report_path: 'openclaw-operations/OPENCLAW_FINAL_HANDOVER.md',
    allowed_actions: ['read_status', 'local_validation'],
    blocked_actions: BLOCKED_ACTIONS,
    manual_required: ['restart_gateway_or_openclaw_app'],
    validation_command: 'shasum -a 256 /Users/cheuklok/.openclaw-pm-sandbox/openclaw.json',
    notes: 'pm-sandbox is canonical; no gateway restart was performed by this UI.',
  },
  {
    id: 'monday-config',
    name: 'Monday config',
    department: 'PM / Monday',
    repo_path: 'openclaw-operations',
    status_source: 'openclaw-operations/PM_OPERATIONS.md',
    last_report_path: 'OPENCLAW_UI_UPGRADE_REPORT.md',
    allowed_actions: ['read_status', 'route_decision_only'],
    blocked_actions: BLOCKED_ACTIONS,
    manual_required: [],
    validation_command: 'node tests/action-router/dashboard-routes.test.js',
    notes: 'Monday is PM orchestrator, not a direct high-risk executor.',
  },
  {
    id: 'action-router',
    name: 'Action Router',
    department: 'Code',
    repo_path: 'openclaw-office/lib/action-router',
    status_source: 'docs/openclaw_action_router_v1.md',
    last_report_path: 'reports/action_router_v1_patch_export.md',
    allowed_actions: ['classify', 'decision_only_route', 'redacted_audit'],
    blocked_actions: ['execute_mutation', ...BLOCKED_ACTIONS],
    manual_required: [],
    validation_command: 'node tests/action-router/classifier.test.js && node tests/action-router/policy.test.js',
    notes: 'Routing returns decisions only by default.',
  },
  {
    id: 'live-mutation-gate',
    name: 'Live mutation gate',
    department: 'Approval',
    repo_path: 'openclaw-office/lib/action-router/live-mutation-gate.js',
    status_source: 'openclaw-office/lib/action-router/live-mutation-gate.js',
    last_report_path: 'LIVE_MUTATION_GATE_RUNBOOK.md',
    allowed_actions: ['decision_only_gate_evaluation'],
    blocked_actions: BLOCKED_ACTIONS,
    manual_required: [
      'provide_explicit_approval_phrase',
      'confirm_exact_target_and_action',
      'confirm_rollback_owner',
      'confirm_environment',
      'provide_dry_run_validation_result',
    ],
    validation_command: 'node tests/action-router/policy.test.js',
    notes: 'Fail-closed native gate for Discord send, deploy, publish, scheduler, Sheet write, external API mutation, webhook/email send, production output overwrite, and secret handling.',
    gate_status: 'active_fail_closed',
    approval_phrase_required: 'I approve this exact live mutation',
    decision_only: true,
  },
  {
    id: 'discord-control',
    name: 'Discord control',
    department: 'Discord Control',
    repo_path: 'integrations/discord_control',
    status_source: 'config/discord_control.json',
    last_report_path: 'DISCORD_CONTROL_AUDIT_REPORT.md',
    allowed_actions: ['status_check', 'command_review', 'decision_only_route'],
    blocked_actions: BLOCKED_ACTIONS,
    manual_required: ['provide_or_rotate_discord_token', 'approve_discord_app_permissions', 'restart_bot_or_listener'],
    validation_command: 'pytest tests/test_discord_control_action_router.py tests/test_discord_control_bot.py tests/test_discord_control_runtime.py',
    notes: 'decision_only=true; can_send_message=false; approval_gate_required=true.',
    decision_only: true,
    can_send_message: false,
    requires_token: true,
    approval_gate_required: true,
    live_mutation_gate_required: true,
  },
  {
    id: 'filesystem-mcp',
    name: 'Filesystem MCP snapshot',
    department: 'OpenClaw Core',
    repo_path: 'monday_core/snapshot.py',
    status_source: 'monday_core/snapshot.py',
    last_report_path: 'outputs/briefings',
    allowed_actions: ['read_snapshot', 'summarize_snapshot'],
    blocked_actions: ['write_snapshot_without_approval', ...BLOCKED_ACTIONS],
    manual_required: [],
    validation_command: 'python3 -m py_compile monday_core/snapshot.py',
    notes: 'Read-only status source for dashboard summaries.',
  },
  {
    id: 'xarisauto-google-sheet',
    name: 'XarisAuto Google Sheet',
    department: 'Marketing',
    repo_path: 'marketing_agent',
    status_source: 'reports/xarisauto_sheet_schema_rebuild_2026_05_08.md',
    last_report_path: 'reports/xaris_sheet_schema_rebuild_blocked_20260508_1343.md',
    allowed_actions: ['dry_run', 'schema_report'],
    blocked_actions: ['google_sheet_write', 'threads_publish', ...BLOCKED_ACTIONS],
    manual_required: ['provide_google_service_account_or_oauth', 'confirm_sheet_business_decision'],
    validation_command: 'pytest marketing_agent/tests/test_scheduler_dry_run.py marketing_agent/tests/test_publish_guard.py',
    notes: 'Live Sheet writes remain blocked without explicit user approval.',
  },
  {
    id: 'meta-app-review',
    name: 'Meta App Review',
    department: 'Marketing',
    repo_path: 'integrations/threads',
    status_source: 'docs/marketing/meta-threads-keyword-search-approval-package.md',
    last_report_path: 'docs/marketing/meta-threads-keyword-search-submission-assets.md',
    allowed_actions: ['local_dry_run', 'generate_review_artifact'],
    blocked_actions: ['threads_publish', 'publish', 'scheduler', 'google_sheet_write'],
    manual_required: ['login_meta_dashboard', 'approve_meta_app_permissions', 'submit_review'],
    validation_command: 'npm test',
    notes: 'Publishing is not enabled in this workflow registry entry.',
  },
  {
    id: 'story-class-picture-books',
    name: 'Story Class image/PDF pipeline',
    department: 'Creative',
    repo_path: 'projects/story-class-picture-books',
    status_source: 'projects/story-class-picture-books/03_outputs/production_status.md',
    last_report_path: 'projects/story-class-picture-books/03_outputs/production_report.md',
    allowed_actions: ['read_status', 'validate_inventory', 'dry_run_queue'],
    blocked_actions: ['overwrite_production_images', 'overwrite_production_pdfs', ...BLOCKED_ACTIONS],
    manual_required: ['approve_production_output_overwrite'],
    validation_command: 'python3 scripts/production/check_book_status.py',
    notes: 'Production outputs are read-only in this pass.',
  },
  {
    id: 'smartstart',
    name: 'SmartStart',
    department: 'PM / Monday',
    repo_path: 'openclaw-operations',
    status_source: 'OPENCLAW_UI_UPGRADE_REPORT.md',
    last_report_path: 'MANUAL_INPUT_REQUIRED.md',
    allowed_actions: ['read_status'],
    blocked_actions: BLOCKED_ACTIONS,
    manual_required: ['provide_current_smartstart_source_if_required'],
    validation_command: 'manual documentation check',
    notes: 'No dedicated local runtime source discovered yet.',
  },
  {
    id: 'openclaw-office-ui',
    name: 'OpenClaw Office UI',
    department: 'Code',
    repo_path: 'openclaw-office',
    status_source: 'openclaw-office/app/api/monday/status/route.js',
    last_report_path: 'OPENCLAW_UI_UPGRADE_REPORT.md',
    allowed_actions: ['render_status', 'readout_browser_tts'],
    blocked_actions: ['microphone_input', 'voice_command', ...BLOCKED_ACTIONS],
    manual_required: [],
    validation_command: 'npm run build',
    notes: 'Status Readout v0 uses browser speechSynthesis only and never opens microphone input.',
  },
])

export function getDepartmentProgress() {
  return DEPARTMENT_PROGRESS.map((entry) => ({ ...entry }))
}

export function getWorkflowRegistry() {
  return WORKFLOW_STATUS_REGISTRY.map((entry) => ({ ...entry }))
}

export function getManualInputRequired() {
  return [
    {
      id: 'gateway-restart',
      whyManual: 'Restarting OpenClaw/Gateway/local apps is explicitly user-only.',
      exactAction: 'Restart Gateway/OpenClaw only if you approve a future runtime config reload.',
      expectedResult: 'pm-sandbox gateway reloads updated runtime config.',
      sendBack: 'Confirm restart completed and provide status output if needed.',
    },
    {
      id: 'third-party-auth',
      whyManual: 'OAuth/API keys/service accounts/Discord tokens require owner login or credential entry.',
      exactAction: 'Update credentials in local secret storage only when a live workflow is approved.',
      expectedResult: 'Env vars or platform app permissions are valid without entering secrets in chat.',
      sendBack: 'Tell Monday which credential family was refreshed; do not paste values.',
    },
    {
      id: 'production-publish',
      whyManual: 'Production deploy, Threads publish, scheduler enable, and Discord send need explicit approval.',
      exactAction: 'Approve the exact action, target, and rollback plan before any live side effect.',
      expectedResult: 'A separately scoped run can execute with audit trail.',
      sendBack: 'Approval phrase, target environment/account/channel, and rollback owner.',
    },
  ]
}

export function buildStatusSnapshot() {
  const workflows = getWorkflowRegistry()
  const departments = getDepartmentProgress()
  const manualInputRequired = getManualInputRequired()
  return {
    mode: 'read-only-status-registry-v0',
    generatedAt: new Date().toISOString(),
    departments,
    workflows,
    blockedActions: [...BLOCKED_ACTIONS],
    manualInputRequired,
    safety: {
      readOnly: true,
      microphonePermission: false,
      voiceCommand: false,
      actionRouterMutation: false,
      liveMutationGateDefault: 'blocked',
      discordSend: false,
      botOrListenerStarted: false,
      publishDeployScheduler: false,
      googleSheetWrite: false,
    },
  }
}

export function buildReadoutSummary(snapshot = buildStatusSnapshot(), source = 'overall') {
  const selected = String(source || 'overall').toLowerCase()
  const departments = snapshot.departments || []
  const workflows = snapshot.workflows || []
  const manual = snapshot.manualInputRequired || []
  const blockedActions = snapshot.blockedActions || BLOCKED_ACTIONS
  const redactedBlocked = blockedActions
    .map((action) => redactValue(action))
    .filter((action, index) => action !== blockedActions[index])
  const blockedSummary = redactedBlocked.length > 0
    ? `Live Gate 已遮蔽高風險 blocked action 內容：${redactedBlocked.join(', ')}。`
    : `Live Gate 已封鎖 ${blockedActions.length} 類外部操作，包括 Discord send、deploy、publish、scheduler、Sheet write。`
  const activeCount = departments.filter((d) => d.status === 'active').length
  const blockedDepartmentCount = departments.filter((d) => d.status === 'blocked').length
  const unknownDepartmentCount = departments.filter((d) => d.status === 'unknown').length
  const discord = workflows.find((w) => w.id === 'discord-control')
  const gate = workflows.find((w) => w.id === 'live-mutation-gate')
  const runtime = workflows.find((w) => w.id === 'openclaw-runtime')

  const sections = {
    overall: [
      'Ray，今日 Monday Command Office 已經載入；目前只讀取 pm-sandbox 狀態。',
      `8 個 command departments 正在安全監察；registry 內有 ${activeCount} 個 active、${blockedDepartmentCount} 個 blocked、${unknownDepartmentCount} 個待補來源。`,
      `Manual input 有 ${manual.length} 類；審批、credential、restart、production publish 仍然需要人手確認。`,
      'Discord 仍然停用；所有外部操作仍由 Live Gate 鎖定。',
      blockedSummary,
    ],
    monday: [
      'Ray，Monday PM orchestration 已載入；runtime 仍指向 pm-sandbox。',
      runtime?.notes || 'Runtime registry 已就緒，沒有執行 gateway restart。',
      'Monday 只展示狀態與 routing decision，不會直接執行 live mutation。',
    ],
    departments: [
      'Ray，8 個 department pods 已按 registry 狀態映射到 command topology。',
      `Active registry entries: ${activeCount}；blocked registry entries: ${blockedDepartmentCount}。`,
      'Teaching、Sales、Ops 等 pod 以 read-only 或 approval-gated 狀態呈現。',
      '下一步是先處理 approval 與 manual input，不是啟動外部 connector。',
    ],
    workflows: [
      'Ray，Workflow Registry 已載入，所有 workflow 都維持 decision-only 或 read-only。',
      `目前 registry 追蹤 ${workflows.length} 個 workflow source。`,
      'Action Router、Live Gate、Discord Control、Google Sheet workflow 都保留 blocked-by-default 語義。',
      blockedSummary,
    ],
    risks: [
      'Ray，高風險項目集中在 production publish、external API access、data write。',
      '任何 Discord send、Telegram notification、deploy、scheduler、Sheet write 都不能自動執行。',
      'Approval package 必須包含 exact action、target、rollback owner、environment 與 dry-run result。',
      blockedSummary,
    ],
    manual: [
      `Ray，Manual Input 現在有 ${manual.length} 類：gateway restart、third-party auth、production publish。`,
      'Credential 和 OAuth 更新只能由 owner 在本地 secret storage 處理。',
      'Production publish、scheduler、Discord send 必須逐項批准。',
    ],
    discord: [
      'Ray，Discord 目前保持 disabled / inactive，沒有啟動 bot 或 listener。',
      `Decision-only 狀態：${discord?.decision_only ? 'on' : 'unknown'}；can_send_message：${discord?.can_send_message ? 'true' : 'false'}。`,
      'Discord token、app permission、message send 都保留 manual approval gate。',
    ],
    'live-gate': [
      'Ray，Live Gate 仍然 locked，預設封鎖所有 live mutation。',
      `Gate status：${gate?.gate_status || 'unknown'}；decision-only：${gate?.decision_only ? 'on' : 'unknown'}。`,
      'Telegram、Discord、deploy、publish、scheduler、Google Sheet write 全部需要明確 approval package。',
      blockedSummary,
    ],
  }

  const lines = sections[selected] || sections.overall
  return redactValue(lines.slice(0, 5).map((line) => `- ${line}`).join('\n'))
}
