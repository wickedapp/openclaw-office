'use client'

import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Handshake,
  Megaphone,
  Palette,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

const POD_CONFIG = [
  {
    id: 'pm',
    name: 'PM Department',
    icon: UsersRound,
    departments: ['pm-monday'],
    workflows: ['openclaw-runtime', 'monday-config'],
    pending: 5,
    risk: 'Low',
    progress: 78,
    className: 'pod-pos-pm',
    checkpoint: 'pm-sandbox remains the canonical runtime.',
  },
  {
    id: 'approval',
    name: 'Approval Department',
    icon: ShieldCheck,
    departments: ['approval'],
    workflows: ['live-mutation-gate'],
    pending: 7,
    risk: 'High',
    progress: 42,
    className: 'pod-pos-approval',
    checkpoint: 'Approval gate required for send, publish, deploy, and write actions.',
  },
  {
    id: 'marketing',
    name: 'Marketing Department',
    icon: Megaphone,
    departments: ['marketing', 'xarisauto'],
    workflows: ['xarisauto-google-sheet', 'meta-app-review'],
    pending: 4,
    risk: 'Low',
    progress: 65,
    className: 'pod-pos-marketing',
    checkpoint: 'Threads and Google Sheets stay dry-run or approval-gated.',
  },
  {
    id: 'creative',
    name: 'Creative / Materials Department',
    icon: Palette,
    departments: ['creative', 'story-class'],
    workflows: ['story-class-picture-books'],
    pending: 6,
    risk: 'Medium',
    progress: 60,
    className: 'pod-pos-creative',
    checkpoint: 'Production materials remain read-only until approved.',
  },
  {
    id: 'code',
    name: 'Code / Dev Department',
    icon: Code2,
    departments: ['code'],
    workflows: ['action-router', 'openclaw-office-ui'],
    pending: 8,
    risk: 'Medium',
    progress: 72,
    className: 'pod-pos-code',
    checkpoint: 'Local tests and build verification before scoped commits.',
  },
  {
    id: 'sales',
    name: 'Sales Support Department',
    icon: Handshake,
    departments: ['smartstart'],
    workflows: ['smartstart'],
    pending: 3,
    risk: 'Low',
    progress: 68,
    className: 'pod-pos-sales',
    checkpoint: 'Customer-facing sends stay manual and approval-gated.',
  },
  {
    id: 'teaching',
    name: 'Teaching / Curriculum Department',
    icon: BookOpen,
    departments: ['story-class', 'smartstart'],
    workflows: ['story-class-picture-books'],
    pending: 2,
    risk: 'Low',
    progress: 55,
    className: 'pod-pos-teaching',
    checkpoint: 'Curriculum workflow is visible without production overwrite.',
  },
  {
    id: 'ops',
    name: 'Ops / System Department',
    icon: Settings2,
    departments: ['openclaw-core', 'discord-control', 'network-runner'],
    workflows: ['discord-control', 'filesystem-mcp'],
    pending: 6,
    risk: 'Medium',
    progress: 70,
    className: 'pod-pos-ops',
    checkpoint: 'Discord disabled; external operations are locked.',
  },
]

function byId(items = []) {
  return items.reduce((acc, item) => {
    if (item?.id) acc[item.id] = item
    return acc
  }, {})
}

function sanitizeText(value, max = 92) {
  return String(value || '')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|gh[pousr]_[0-9A-Za-z_]{16,})\b/g, '[REDACTED_SECRET]')
    .replace(/((token|secret|api[_-]?key|oauth|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/\b(customer|student|parent|guardian|child|client)\b[^,.;\n]*/gi, '[REDACTED_PERSON_DATA]')
    .slice(0, max)
}

function resolvePodStatus(config, departmentsById, workflowsById) {
  const departmentEntries = config.departments.map((id) => departmentsById[id]).filter(Boolean)
  const workflowEntries = config.workflows.map((id) => workflowsById[id]).filter(Boolean)
  const all = [...departmentEntries, ...workflowEntries]

  if (config.id === 'approval') return 'Needs Input'
  if (all.some((entry) => entry.status === 'blocked' || entry.gate_status === 'active_fail_closed')) {
    return config.id === 'ops' || config.id === 'teaching' ? 'Read-only' : 'Needs Input'
  }
  if (all.some((entry) => entry.status === 'unknown')) return 'Read-only'
  return 'Active'
}

function resolveCheckpoint(config, departmentsById, workflowsById) {
  const department = config.departments.map((id) => departmentsById[id]).find(Boolean)
  const workflow = config.workflows.map((id) => workflowsById[id]).find(Boolean)
  return sanitizeText(department?.latestCheckpoint || workflow?.notes || config.checkpoint)
}

function statusTone(status) {
  if (status === 'Active') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
  if (status === 'Needs Input') return 'border-amber-300/30 bg-amber-500/10 text-amber-200'
  if (status === 'Read-only') return 'border-sky-300/30 bg-sky-500/10 text-sky-200'
  return 'border-slate-400/30 bg-slate-500/10 text-slate-200'
}

function riskTone(risk) {
  if (risk === 'High') return 'text-red-300'
  if (risk === 'Medium') return 'text-amber-300'
  return 'text-emerald-300'
}

function connectionLines() {
  const lines = [
    ['50%', '50%', '28%', '16%'],
    ['50%', '50%', '72%', '16%'],
    ['50%', '50%', '18%', '36%'],
    ['50%', '50%', '82%', '37%'],
    ['50%', '50%', '18%', '63%'],
    ['50%', '50%', '82%', '64%'],
    ['50%', '50%', '31%', '84%'],
    ['50%', '50%', '69%', '84%'],
  ]
  return lines.map(([x1, y1, x2, y2], index) => (
    <line key={`${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} style={{ animationDelay: `${index * 0.18}s` }} />
  ))
}

function DepartmentPod({ pod }) {
  const Icon = pod.icon
  return (
    <article className={`department-pod ${pod.className}`}>
      <div className="flex items-start gap-3">
        <div className="department-pod-icon">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold leading-snug text-white">{pod.name}</h3>
          <p className="mt-1 truncate text-[10px] text-slate-500">{pod.workflowCount} workflow links</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_56px_56px] items-center gap-2">
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone(pod.status)}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {pod.status}
        </span>
        <div className="text-center">
          <div className="text-[10px] text-slate-500">Pending</div>
          <div className="text-lg font-bold text-slate-100">{pod.pending}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-500">Risk</div>
          <div className={`text-xs font-bold ${riskTone(pod.risk)}`}>{pod.risk}</div>
        </div>
      </div>

      <div className="mt-2">
        <div className="h-1.5 overflow-hidden rounded-full border border-cyan-300/10 bg-slate-950/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.75)]"
            style={{ width: `${pod.progress}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
          <span className="truncate pr-2">{pod.checkpoint}</span>
          <span className="text-cyan-200">{pod.progress}%</span>
        </div>
      </div>
    </article>
  )
}

export default function DepartmentProgressPanel({ departments = [], workflows = [], counts = {} }) {
  const departmentsById = byId(departments)
  const workflowsById = byId(workflows)
  const pods = POD_CONFIG.map((config) => ({
    ...config,
    status: resolvePodStatus(config, departmentsById, workflowsById),
    checkpoint: resolveCheckpoint(config, departmentsById, workflowsById),
    workflowCount: config.workflows.filter((id) => workflowsById[id]).length,
  }))

  return (
    <section className="monday-topology" aria-label="Monday department command topology">
      <div className="topology-radar topology-radar-one" />
      <div className="topology-radar topology-radar-two" />
      <svg className="topology-lines" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="0.45" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {connectionLines()}
      </svg>

      <div className="monday-core-orb" aria-label="Monday AI Core Orb">
        <div className="core-ring core-ring-one" />
        <div className="core-ring core-ring-two" />
        <div className="core-ring core-ring-three" />
        <div className="core-orb-sphere">
          <span className="particle particle-one" />
          <span className="particle particle-two" />
          <span className="particle particle-three" />
          <span className="particle particle-four" />
          <div className="relative z-10 text-center">
            <div className="text-2xl font-black leading-tight tracking-[0.04em] text-cyan-200 drop-shadow-[0_0_14px_rgba(125,211,252,0.9)]">
              MONDAY
              <br />
              CORE
            </div>
            <div className="mt-2 text-[11px] font-semibold text-sky-100/80">Central Intelligence System</div>
          </div>
        </div>
        <div className="core-platform" />
        <div className="core-stat core-stat-pending">
          <span>Pending</span>
          <strong>{counts.totalPending || 41}</strong>
        </div>
        <div className="core-stat core-stat-approval">
          <span>Approval</span>
          <strong>{counts.pendingApprovals || 7}</strong>
        </div>
        <div className="core-stat core-stat-risk">
          <span>Risk</span>
          <strong>{counts.highRisk || 3}</strong>
        </div>
        <div className="core-stat core-stat-progress">
          <span>Progress</span>
          <strong>69%</strong>
        </div>
      </div>

      {pods.map((pod) => (
        <DepartmentPod key={pod.id} pod={pod} />
      ))}

      <div className="topology-footer-note">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <span>Registry-driven status, decision-only routing, live mutations blocked by default.</span>
      </div>
    </section>
  )
}
