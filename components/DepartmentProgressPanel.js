'use client'

import { AlertTriangle, CheckCircle2, CircleHelp, ShieldAlert } from 'lucide-react'

function statusTone(status) {
  if (status === 'active') return 'text-green-300 border-green-500/30 bg-green-950/30'
  if (status === 'blocked' || status === 'needs manual input') return 'text-red-300 border-red-500/30 bg-red-950/30'
  if (status === 'stale') return 'text-amber-300 border-amber-500/30 bg-amber-950/30'
  return 'text-gray-300 border-gray-600/40 bg-gray-950/30'
}

function StatusIcon({ status }) {
  if (status === 'active') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'blocked' || status === 'needs manual input') return <ShieldAlert className="h-4 w-4" />
  if (status === 'stale') return <AlertTriangle className="h-4 w-4" />
  return <CircleHelp className="h-4 w-4" />
}

export default function DepartmentProgressPanel({ departments = [], workflows = [] }) {
  const workflowByDepartment = workflows.reduce((acc, workflow) => {
    const key = workflow.department || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold text-cyan-200">Department Progress</h3>
        <span className="text-xs text-gray-500">{departments.length} departments</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {departments.map((department) => (
          <article key={department.id} className="glass-card rounded-lg p-4 min-h-48">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-100">{department.name}</h4>
                <p className="text-[11px] text-gray-500 mt-1 truncate">{department.relatedPath}</p>
              </div>
              <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${statusTone(department.status)}`}>
                <StatusIcon status={department.status} />
                <span>{department.status}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-300 leading-relaxed">{department.latestCheckpoint}</p>
            <dl className="mt-3 space-y-2 text-[11px] text-gray-400">
              <div>
                <dt className="text-gray-500">Last validation</dt>
                <dd>{department.lastValidationResult}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Next action</dt>
                <dd>{department.nextSuggestedAction}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Workflows linked</dt>
                <dd>{workflowByDepartment[department.name] || workflowByDepartment[department.id] || 0}</dd>
              </div>
            </dl>
            {(department.dangerFlags || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {department.dangerFlags.map((flag) => (
                  <span key={flag} className="rounded border border-red-500/20 bg-red-950/20 px-2 py-1 text-[10px] text-red-200">
                    {flag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
