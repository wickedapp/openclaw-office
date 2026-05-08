'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import DepartmentProgressPanel from './DepartmentProgressPanel'
import StatusReadoutPanel from './StatusReadoutPanel'

const REFRESH_MS = 15000

function StatCard({ label, value, color }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-1" style={{ color }}>{value}</div>
    </div>
  )
}

function HealthRow({ name, info }) {
  const dotColor =
    info.status === 'healthy' ? '#22c55e' :
    info.status === 'degraded' ? '#f59e0b' :
    info.status === 'down' ? '#ef4444' : '#6b7280'
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor }} />
      <span className="font-mono text-gray-300 w-24">{name}</span>
      <span className="text-gray-400">{info.status}</span>
      <span className="text-gray-600 ml-auto text-xs truncate max-w-[40%]">{info.note || ''}</span>
    </div>
  )
}

function ItemList({ title, items, render, emptyText }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-200 mb-3">{title}</h3>
      {(!items || items.length === 0) ? (
        <div className="text-xs text-gray-500">{emptyText}</div>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-auto">
          {items.map((it, i) => (
            <li key={i} className="text-xs text-gray-300 border-b border-gray-800 pb-1.5">
              {render(it)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MondayDashboard() {
  const [snap, setSnap] = useState(null)
  const [statusSnap, setStatusSnap] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/monday/dashboard')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      const statusResponse = await fetch('/api/monday/status')
      if (!statusResponse.ok) throw new Error(`status HTTP ${statusResponse.status}`)
      const statusJson = await statusResponse.json()
      setSnap(j)
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

  const counts = snap?.counts || { pendingDispatch: 0, pendingApprovals: 0, blocked: 0, overdue: 0 }
  const health = snap?.sourceHealth || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold text-cyan-300">Monday Next Evolution v0.1</h2>
        <span className="text-xs text-gray-500">read-only · {snap?.mode || 'loading'}</span>
      </div>

      {error && (
        <div className="text-xs text-red-400">Failed to load: {error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Dispatch" value={counts.pendingDispatch} color="#22d3ee" />
        <StatCard label="Pending Approvals" value={counts.pendingApprovals} color="#f59e0b" />
        <StatCard label="Blocked" value={counts.blocked} color="#ef4444" />
        <StatCard label="Overdue" value={counts.overdue} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ItemList
          title="Pending Dispatch"
          items={snap?.pendingDispatch}
          emptyText="No pending dispatches."
          render={(d) => (
            <div>
              <div className="font-mono text-cyan-300">{d.id || '(no id)'} · {d.suggestedDepartment}</div>
              <div className="text-gray-500">risk={d.riskLevel} · approval={d.approvalRequired ? 'yes' : 'no'} · → {d.nextStatus}</div>
            </div>
          )}
        />
        <ItemList
          title="Pending Approvals"
          items={snap?.pendingApprovals}
          emptyText="No approvals queued."
          render={(a) => (
            <div>
              <div className="font-mono text-amber-300">{a.id}</div>
              <div className="text-gray-500">{(a.categories || []).join(', ') || 'uncategorised'}</div>
              <div className="text-gray-600 italic">{a.action?.description || ''}</div>
            </div>
          )}
        />
        <ItemList
          title="Blocked / Approval-gated"
          items={snap?.blocked}
          emptyText="Nothing blocked."
          render={(d) => (
            <div>
              <div className="font-mono text-red-300">{d.id || '(no id)'}</div>
              <div className="text-gray-500">{d.dispatchPlan?.action} · {d.suggestedDepartment}</div>
            </div>
          )}
        />
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-3">Source Health</h3>
          {Object.keys(health).length === 0
            ? <div className="text-xs text-gray-500">No source data.</div>
            : Object.entries(health).map(([k, v]) => <HealthRow key={k} name={k} info={v} />)}
        </div>
      </div>

      <StatusReadoutPanel snapshot={statusSnap} />

      <DepartmentProgressPanel
        departments={statusSnap?.departments || []}
        workflows={statusSnap?.workflows || []}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ItemList
          title="Workflow Status Registry"
          items={statusSnap?.workflows}
          emptyText="No workflow registry entries."
          render={(w) => (
            <div>
              <div className="font-mono text-cyan-300">{w.id} · {w.department}</div>
              <div className="text-gray-500">allowed={(w.allowed_actions || []).join(', ') || 'none'}</div>
              <div className="text-gray-600 truncate">{w.repo_path}</div>
            </div>
          )}
        />
        <ItemList
          title="Blocked Actions / Manual Input"
          items={(statusSnap?.manualInputRequired || []).map((m) => ({
            ...m,
            blocked: statusSnap?.blockedActions || [],
          }))}
          emptyText="No manual-input registry entries."
          render={(m) => (
            <div>
              <div className="font-mono text-amber-300">{m.id}</div>
              <div className="text-gray-500">{m.whyManual}</div>
              <div className="text-gray-600">{m.exactAction}</div>
            </div>
          )}
        />
      </div>
    </motion.div>
  )
}
