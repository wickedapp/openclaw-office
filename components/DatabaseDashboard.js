'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function formatTimestamp(val) {
  if (!val || typeof val !== 'number') return val
  // Detect epoch ms (13 digits)
  if (val > 1000000000000) {
    return new Date(val).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
  }
  return val
}

function formatCellValue(val, colName) {
  if (val === null || val === undefined) return <span className="text-gray-600 italic">NULL</span>
  if (typeof val === 'string' && val.length > 120) {
    return val.slice(0, 120) + '…'
  }
  // Auto-format timestamp columns
  if (typeof val === 'number' && (colName?.includes('_at') || colName?.includes('timestamp') || colName === 'created_at' || colName === 'completed_at' || colName === 'work_started_at')) {
    return formatTimestamp(val)
  }
  return String(val)
}

function TableSelector({ tables, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tables.map((t) => (
        <motion.button
          key={t.name}
          onClick={() => onSelect(t.name)}
          className={`text-left p-4 rounded-xl border transition-all ${
            selected === t.name
              ? 'bg-cyan-900/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
              : 'bg-gray-900/40 border-gray-700/50 hover:border-gray-500/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono font-bold text-white">{t.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-400 font-mono">
              {t.rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {t.columns.slice(0, 5).map((c) => (
              <span key={c.name} className={`text-[10px] px-1.5 py-0.5 rounded ${
                c.pk ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/50' : 'bg-gray-800/60 text-gray-500'
              }`}>
                {c.name}
              </span>
            ))}
            {t.columns.length > 5 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/60 text-gray-500">
                +{t.columns.length - 5} more
              </span>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  )
}

function DataTable({ data, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="text-cyan-400 text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading data...
        </motion.div>
      </div>
    )
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-2xl block mb-2">📭</span>
        No rows found
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700/50">
            {data.columns.map((col, i) => (
              <th key={col} className="text-left px-3 py-2 text-gray-400 font-mono font-medium whitespace-nowrap">
                {col}
                {data.columnTypes && (
                  <span className="ml-1 text-[9px] text-gray-600">{data.columnTypes[i]}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <motion.tr
              key={i}
              className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              {data.columns.map((col) => (
                <td key={col} className="px-3 py-2 text-gray-300 font-mono whitespace-nowrap max-w-[300px] truncate">
                  {formatCellValue(row[col], col)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DatabaseDashboard() {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableData, setTableData] = useState(null)
  const [dbStats, setDbStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [queryMode, setQueryMode] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [queryError, setQueryError] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Fetch tables on mount
  useEffect(() => {
    fetch('/api/database?action=tables')
      .then(r => r.json())
      .then(d => setTables(d.tables || []))
      .catch(console.error)

    fetch('/api/database?action=stats')
      .then(r => r.json())
      .then(d => setDbStats(d))
      .catch(console.error)
  }, [])

  // Fetch table data
  const browseTable = useCallback(async (name, pageNum = 0) => {
    setSelectedTable(name)
    setPage(pageNum)
    setLoading(true)
    setQueryMode(false)
    try {
      const res = await fetch(`/api/database?action=browse&table=${encodeURIComponent(name)}&limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`)
      const data = await res.json()
      setTableData(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Run custom query
  const runQuery = async () => {
    if (!queryText.trim()) return
    setLoading(true)
    setQueryError(null)
    setQueryResult(null)
    try {
      const res = await fetch(`/api/database?action=query&query=${encodeURIComponent(queryText.trim())}&limit=100`)
      const data = await res.json()
      if (data.error) {
        setQueryError(data.error)
      } else {
        setQueryResult(data)
      }
    } catch (e) {
      setQueryError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗄️</span>
          <div>
            <h2 className="font-display text-lg text-white">Database Explorer</h2>
            <p className="text-xs text-gray-500">
              SQLite • {dbStats?.sizeFormatted || '...'} • {tables.length} tables
              {dbStats?.walMode && <span className="ml-2 text-green-500">WAL ✓</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => { setQueryMode(false); setSelectedTable(null); setTableData(null) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              !queryMode ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            📊 Browse
          </motion.button>
          <motion.button
            onClick={() => { setQueryMode(true); setSelectedTable(null); setTableData(null) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              queryMode ? 'bg-purple-900/50 text-purple-400 border border-purple-500/50' : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            ⚡ Query
          </motion.button>
        </div>
      </div>

      {/* Tables */}
      {!queryMode && (
        <>
          <TableSelector tables={tables} selected={selectedTable} onSelect={(name) => browseTable(name, 0)} />

          {/* Table Data */}
          <AnimatePresence mode="wait">
            {(selectedTable || loading) && (
              <motion.div
                key={selectedTable}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                {/* Table header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-cyan-400 font-bold">{selectedTable}</span>
                    {tableData && (
                      <span className="text-xs text-gray-500">
                        {tableData.total.toLocaleString()} rows
                      </span>
                    )}
                  </div>
                  {tableData && tableData.total > PAGE_SIZE && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => browseTable(selectedTable, Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400 disabled:opacity-30 hover:text-white"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-500">
                        {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, tableData.total)} of {tableData.total}
                      </span>
                      <button
                        onClick={() => browseTable(selectedTable, page + 1)}
                        disabled={!tableData.hasMore}
                        className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400 disabled:opacity-30 hover:text-white"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>

                <DataTable data={tableData} loading={loading} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Query Mode */}
      {queryMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-400 text-sm font-mono">SELECT</span>
              <span className="text-xs text-gray-500">Read-only queries only</span>
            </div>
            <div className="flex gap-2">
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery() }}
                placeholder="SELECT * FROM requests WHERE state = 'completed' LIMIT 10"
                className="flex-1 bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                {/* Quick query buttons */}
                {[
                  { label: 'All Requests', q: 'SELECT * FROM requests ORDER BY created_at DESC LIMIT 50' },
                  { label: 'Recent Events', q: 'SELECT * FROM events ORDER BY timestamp DESC LIMIT 50' },
                  { label: 'Daily Stats', q: 'SELECT * FROM daily_stats ORDER BY date DESC' },
                ].map(({ label, q }) => (
                  <button
                    key={label}
                    onClick={() => { setQueryText(q); }}
                    className="text-[10px] px-2 py-1 rounded bg-gray-800/60 text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <motion.button
                onClick={runQuery}
                disabled={loading || !queryText.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-bold text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Running...' : '▶ Run'}
              </motion.button>
            </div>
          </div>

          {/* Query Error */}
          {queryError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-mono"
            >
              ❌ {queryError}
            </motion.div>
          )}

          {/* Query Results */}
          {queryResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                <span className="text-xs text-gray-500">
                  {queryResult.total} row{queryResult.total !== 1 ? 's' : ''} returned
                  {queryResult.truncated && <span className="text-yellow-500 ml-2">(truncated to 100)</span>}
                </span>
              </div>
              <DataTable data={queryResult} loading={false} />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
