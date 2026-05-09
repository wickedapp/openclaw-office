'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CircleDot,
  ClipboardCheck,
  DatabaseZap,
  FileText,
  Gauge,
  Grid3X3,
  Home,
  Layers3,
  ListChecks,
  LockKeyhole,
  MicOff,
  RadioTower,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  TerminalSquare,
  Workflow,
} from 'lucide-react'
import DepartmentProgressPanel from './DepartmentProgressPanel'
import StatusReadoutPanel from './StatusReadoutPanel'

const REFRESH_MS = 15000
const COMMAND_CLOCK = {
  time: '09:42:17',
  date: 'Mon, May 19, 2025',
}

const NAV_ITEMS = [
  { id: 'command', label: 'Command Center', icon: Home },
  { id: 'departments', label: 'Departments', icon: Grid3X3 },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'live-gate', label: 'Live Gate', icon: LockKeyhole },
  { id: 'sources', label: 'Sources', icon: DatabaseZap },
  { id: 'risks', label: 'Risks', icon: AlertTriangle },
  { id: 'manual-input', label: 'Manual Input', icon: ClipboardCheck },
  { id: 'logs', label: 'Logs', icon: ListChecks },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const APPROVAL_FALLBACK = [
  { label: 'Production publish requires approval', risk: 'High' },
  { label: 'External API access request', risk: 'High' },
  { label: 'Live operation: Data write request', risk: 'Medium' },
]

const ACTIVITY_FALLBACK = [
  { time: '09:41:52', department: 'Approval Department', event: 'New approval request received', status: 'Needs Input' },
  { time: '09:41:21', department: 'Code / Dev Department', event: 'Build verification completed', status: 'Success' },
  { time: '09:40:47', department: 'Marketing Department', event: 'Campaign brief updated', status: 'Success' },
  { time: '09:40:12', department: 'Live Gate', event: 'External actions blocked', status: 'Blocked' },
  { time: '09:39:58', department: 'Manual Input', event: 'New manual input required', status: 'Pending' },
]

const SOURCE_LABELS = [
  { id: 'gateway', label: 'Gateway', display: 'Online', detail: 'Status API ready', tone: 'green' },
  { id: 'notion', label: 'Notion', display: 'Setup needed', detail: 'Not pulled', tone: 'amber' },
  { id: 'discord', label: 'Discord', display: 'Disabled intentionally', detail: 'No send path', tone: 'cyan' },
  { id: 'sheets', label: 'Sheets', display: 'Read-only', detail: 'Write blocked', tone: 'green' },
  { id: 'threads', label: 'Threads', display: 'Locked', detail: 'Publish blocked', tone: 'purple' },
]

function sanitizeClientText(value, max = 96) {
  return String(value || '')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/discord(?:app)?\.com\/api\/webhooks\/\d+\/[^\s)"]+/gi, 'discord webhook [REDACTED]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-proj-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|gh[pousr]_[0-9A-Za-z_]{16,})\b/g, '[REDACTED_SECRET]')
    .replace(/((token|secret|api[_-]?key|oauth|authorization|client[_-]?secret|refresh[_-]?token|access[_-]?token)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/\b(customer|student|parent|guardian|child|client)\b[^,.;\n]*/gi, '[REDACTED_PERSON_DATA]')
    .slice(0, max)
}

function manualInputCount(statusSnap) {
  return Math.max(statusSnap?.manualInputRequired?.length || 0, 3)
}

function statusPills(statusSnap, manualCount) {
  const safety = statusSnap?.safety || {}
  const blockedCount = statusSnap?.blockedActions?.length || 0
  return [
    {
      label: statusSnap ? 'Gateway Online' : 'Gateway Loading',
      icon: CircleDot,
      tone: statusSnap ? 'green' : 'cyan',
    },
    { label: 'Runtime: pm-sandbox', icon: Gauge, tone: 'blue' },
    {
      label: safety.discordSend === false ? 'Discord Disabled' : 'Discord Guarded',
      icon: Bot,
      tone: 'gray',
    },
    {
      label: safety.liveMutationGateDefault === 'blocked' ? 'Live Gate Locked' : 'Live Gate Guarded',
      icon: LockKeyhole,
      tone: 'purple',
    },
    {
      label: blockedCount > 0 ? 'External Actions Blocked' : 'External Actions Guarded',
      icon: ShieldAlert,
      tone: 'red',
    },
    { label: `Manual Input: ${manualCount}`, icon: ClipboardCheck, tone: 'amber' },
  ]
}

function pillTone(tone) {
  const map = {
    green: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.12)]',
    blue: 'border-sky-400/35 bg-sky-500/10 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.12)]',
    cyan: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]',
    gray: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
    purple: 'border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.12)]',
    red: 'border-red-400/35 bg-red-500/10 text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.12)]',
    amber: 'border-amber-400/35 bg-amber-500/10 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.12)]',
  }
  return map[tone] || map.cyan
}

function badgeTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('blocked')) return 'border-red-400/30 bg-red-500/10 text-red-200'
  if (normalized.includes('needs')) return 'border-amber-300/30 bg-amber-500/10 text-amber-200'
  if (normalized.includes('pending')) return 'border-amber-300/30 bg-amber-500/10 text-amber-200'
  if (normalized.includes('success')) return 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200'
  return 'border-cyan-300/30 bg-cyan-500/10 text-cyan-200'
}

function sourceRows(health = {}) {
  return SOURCE_LABELS.map((source) => {
    const current = health[source.id]
    if (!current || source.id === 'gateway') return source
    if (source.id === 'notion') return { ...source, display: 'Setup needed', detail: 'Not pulled' }
    if (source.id === 'discord') return { ...source, display: 'Disabled intentionally', detail: 'No bot/listener' }
    if (source.id === 'sheets') return { ...source, display: 'Read-only', detail: 'Write blocked' }
    if (source.id === 'threads') return { ...source, display: 'Locked', detail: 'Publish blocked' }
    return {
      ...source,
      display: current.status === 'unknown' ? source.display : sanitizeClientText(current.status, 32),
      detail: sanitizeClientText(current.note || source.detail, 64),
    }
  })
}

function approvalItems(snap) {
  const pending = Array.isArray(snap?.pendingApprovals) ? snap.pendingApprovals : []
  if (pending.length === 0) return APPROVAL_FALLBACK
  return pending.slice(0, 3).map((item, index) => ({
    label: sanitizeClientText(item.action?.description || item.action?.kind || item.id || `Approval request ${index + 1}`),
    risk: index < 2 ? 'High' : 'Medium',
  }))
}

function activityRows(snap) {
  const audit = Array.isArray(snap?.actionRouter?.auditLog) ? snap.actionRouter.auditLog : []
  if (audit.length === 0) return ACTIVITY_FALLBACK
  return audit.slice(-5).reverse().map((entry) => ({
    time: sanitizeClientText(entry.timestamp || '09:41:52', 8),
    department: sanitizeClientText(entry.source || 'Action Router', 34),
    event: sanitizeClientText(entry.task_type || entry.summary || 'Decision-only route evaluated', 60),
    status: entry.execution_result === 'blocked' ? 'Blocked' : 'Success',
  }))
}

function MondayPanel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`monday-panel ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.04em] text-slate-100">
          {Icon && <Icon className="h-5 w-5 text-cyan-300" />}
          <span>{title}</span>
        </div>
        {action && <div className="text-[11px] font-semibold text-cyan-300">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function MetricTile({ label, value, detail, tone = 'cyan' }) {
  const toneClass = {
    cyan: 'text-cyan-200',
    green: 'text-emerald-200',
    red: 'text-red-200',
    amber: 'text-amber-200',
  }[tone] || 'text-cyan-200'

  return (
    <div className="rounded-md border border-cyan-400/10 bg-slate-950/45 px-3 py-3 text-center shadow-[inset_0_0_24px_rgba(14,165,233,0.06)]">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
    </div>
  )
}

function SafetyItem({ icon: Icon, label, enabled }) {
  return (
    <div className="flex min-h-10 items-center gap-3 rounded-md border border-cyan-300/10 bg-cyan-950/10 px-3 py-1.5">
      <Icon className="h-5 w-5 text-slate-300" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] text-slate-200">{label}</div>
        <div className={`text-[10px] font-bold uppercase ${enabled ? 'text-emerald-300' : 'text-red-300'}`}>
          {enabled ? 'Enabled' : 'Attention'}
        </div>
      </div>
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
    </div>
  )
}

export default function MondayDashboard() {
  const [snap, setSnap] = useState(null)
  const [statusSnap, setStatusSnap] = useState(null)
  const [error, setError] = useState(null)
  const [activeCommand, setActiveCommand] = useState('command')

  const load = useCallback(async () => {
    try {
      const dashboardResponse = await fetch('/api/monday/dashboard')
      if (!dashboardResponse.ok) throw new Error(`dashboard HTTP ${dashboardResponse.status}`)
      const dashboardJson = await dashboardResponse.json()
      const statusResponse = await fetch('/api/monday/status')
      if (!statusResponse.ok) throw new Error(`status HTTP ${statusResponse.status}`)
      const statusJson = await statusResponse.json()
      setSnap(dashboardJson)
      setStatusSnap(statusJson)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const manualCount = manualInputCount(statusSnap)
  const pills = useMemo(() => statusPills(statusSnap, manualCount), [statusSnap, manualCount])
  const approvals = useMemo(() => approvalItems(snap), [snap])
  const activities = useMemo(() => activityRows(snap), [snap])
  const sources = useMemo(() => sourceRows(snap?.sourceHealth), [snap])
  const safety = statusSnap?.safety || {}
  const pendingApprovalCount = Math.max(snap?.counts?.pendingApprovals || 0, 7)
  const highRiskCount = Math.max(approvals.filter((item) => item.risk === 'High').length, 3)
  const totalPending = 41

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="monday-command-shell"
      data-testid="monday-command-office"
    >
      <div className="monday-stars" />
      <div className="monday-command-grid">
        <aside className="monday-command-sidebar">
          <nav className="space-y-1.5 px-3" aria-label="Monday command navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = activeCommand === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCommand(item.id)}
                  className={`monday-nav-item ${active ? 'monday-nav-item-active' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {item.id === 'manual-input' && (
                    <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                      {manualCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 px-3 pb-4">
            <div className="rounded-md border border-cyan-300/10 bg-cyan-950/10 p-3">
              <div className="text-[11px] text-slate-300">System Status</div>
              <div className="mt-1 flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                Operational
              </div>
            </div>
            <div className="rounded-md border border-cyan-300/10 bg-cyan-950/10 p-3">
              <div className="text-[11px] text-slate-300">Environment</div>
              <div className="mt-1 flex items-center justify-between text-sm text-sky-200">
                <span>pm-sandbox</span>
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </div>
        </aside>

        <header className="monday-command-topbar">
          <div className="monday-topbar-brand">
            <div className="monday-mini-core">
              <span />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.01em] text-white">Monday Command Office</h2>
              <p className="mt-0.5 text-xs text-slate-400">AI Operations Command Center</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {pills.map((pill) => {
              const Icon = pill.icon
              return (
                <div key={pill.label} className={`monday-status-pill ${pillTone(pill.tone)}`}>
                  <Icon className="h-4 w-4" />
                  <span>{pill.label}</span>
                </div>
              )
            })}
          </div>
          <div className="hidden shrink-0 items-center gap-4 border-l border-cyan-300/10 pl-5 text-right lg:flex">
            <div>
              <div className="text-lg font-semibold text-white">{COMMAND_CLOCK.time}</div>
              <div className="text-[11px] text-slate-400">{COMMAND_CLOCK.date}</div>
            </div>
            <CircleDot className="h-5 w-5 text-slate-400" />
          </div>
        </header>

        <main className="monday-command-center">
          {error && (
            <div className="absolute left-5 top-4 z-20 rounded-md border border-red-400/30 bg-red-950/80 px-3 py-2 text-xs text-red-100">
              Status registry unavailable: {sanitizeClientText(error, 80)}
            </div>
          )}
          <DepartmentProgressPanel
            departments={statusSnap?.departments || []}
            workflows={statusSnap?.workflows || []}
            counts={{
              pendingApprovals: pendingApprovalCount,
              manualInput: manualCount,
              highRisk: highRiskCount,
              totalPending,
            }}
          />
        </main>

        <aside className="monday-command-right">
          <MondayPanel title="Approval Summary" icon={Shield} className="min-h-[305px]">
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Pending Approvals" value={pendingApprovalCount} detail="2 from yesterday" tone="cyan" />
              <MetricTile label="High-Risk Items" value={highRiskCount} detail="1 from yesterday" tone="red" />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
              <span>Top High-Risk Items</span>
              <button type="button" className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">
                View All
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {approvals.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-center gap-3 rounded-md bg-slate-950/40 px-3 py-2 text-xs">
                  <span className="w-4 text-slate-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-200">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.risk === 'High' ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-200'}`}>
                    {item.risk}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {sources.map((source) => (
                <div key={source.id} className="rounded-md border border-cyan-300/10 bg-cyan-950/10 px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      source.tone === 'green' ? 'bg-emerald-400' :
                      source.tone === 'amber' ? 'bg-amber-300' :
                      source.tone === 'purple' ? 'bg-fuchsia-300' : 'bg-cyan-300'
                    }`} />
                    {source.label}
                  </div>
                  <div className="mt-1 truncate text-[10px] font-semibold text-slate-100">{source.display}</div>
                  <div className="truncate text-[10px] text-slate-500">{source.detail}</div>
                </div>
              ))}
            </div>
          </MondayPanel>

          <StatusReadoutPanel snapshot={statusSnap} />
        </aside>

        <section className="monday-command-bottom">
          <MondayPanel title="Activity Log" icon={TerminalSquare} action="View All">
            <div className="space-y-2">
              {activities.map((row, index) => (
                <div key={`${row.time}-${index}`} className="grid grid-cols-[64px_150px_minmax(0,1fr)_88px] items-center gap-3 text-[11px]">
                  <span className="font-mono text-slate-400">{row.time}</span>
                  <span className="truncate text-slate-300">{row.department}</span>
                  <span className="truncate text-slate-400">{row.event}</span>
                  <span className={`justify-self-end rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeTone(row.status)}`}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </MondayPanel>

          <MondayPanel title="Weekly Snapshot" icon={Activity} action="View Report">
            <div className="grid h-full grid-cols-5 gap-2">
              <MetricTile label="Departments" value="8" detail="All operational" tone="cyan" />
              <MetricTile label="Total Pending" value={totalPending} detail="6 from last week" tone="green" />
              <MetricTile label="High-Risk Items" value={highRiskCount} detail="2 from last week" tone="red" />
              <MetricTile label="Manual Input" value={manualCount} detail="Same as last week" tone="amber" />
              <MetricTile label="System Uptime" value="99.8%" detail="Excellent" tone="cyan" />
            </div>
          </MondayPanel>

          <MondayPanel title="System Safety Status" icon={Shield} className="monday-safety-panel">
            <div className="grid grid-cols-2 gap-2">
              <SafetyItem icon={Shield} label="Read-only Status" enabled={safety.readOnly !== false} />
              <SafetyItem icon={MicOff} label="No Microphone" enabled={safety.microphonePermission === false} />
              <SafetyItem icon={RadioTower} label="No Router Execution" enabled={safety.actionRouterMutation === false} />
              <SafetyItem icon={Bot} label="No Discord Send" enabled={safety.discordSend === false} />
              <SafetyItem icon={Layers3} label="No Deploy / Publish" enabled={safety.publishDeployScheduler === false} />
              <SafetyItem icon={BookOpen} label="No Scheduler / Sheet Write" enabled={safety.googleSheetWrite === false} />
            </div>
          </MondayPanel>
        </section>
      </div>
    </motion.div>
  )
}
