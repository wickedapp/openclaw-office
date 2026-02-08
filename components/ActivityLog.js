'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useActivityStream } from '../lib/useWorkflowStream'

export default function ActivityLog() {
  const liveActivities = useActivityStream()
  const [isExpanded, setIsExpanded] = useState(true)
  const [olderEvents, setOlderEvents] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [totalEvents, setTotalEvents] = useState(0)
  const containerRef = useRef(null)
  const offsetRef = useRef(0)

  // Merge live activities with older fetched events (dedup by id)
  const allActivities = (() => {
    const seen = new Set()
    const merged = []
    for (const a of liveActivities) {
      if (!seen.has(a.id)) { seen.add(a.id); merged.push(a) }
    }
    for (const a of olderEvents) {
      if (!seen.has(a.id)) { seen.add(a.id); merged.push(a) }
    }
    return merged
  })()

  // Fetch older events from API
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const offset = offsetRef.current
      const res = await fetch(`/api/workflow?type=events&limit=50&offset=${offset}`)
      const data = await res.json()
      if (data.events && data.events.length > 0) {
        setOlderEvents(prev => [...prev, ...data.events])
        offsetRef.current += data.events.length
        setHasMore(offsetRef.current < (data.total || 0))
        setTotalEvents(data.total || 0)
      } else {
        setHasMore(false)
      }
    } catch (e) {
      console.error('Failed to load more events:', e)
    }
    setLoading(false)
  }, [loading, hasMore])

  // Initial load
  useEffect(() => {
    loadMore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight - scrollTop - clientHeight < 80) {
      loadMore()
    }
  }, [loadMore])

  const getStatusIcon = (state) => {
    switch (state) {
      case 'received': return '📥'
      case 'analyzing': return '🔍'
      case 'task_created': return '📋'
      case 'assigned': return '📧'
      case 'in_progress': return '⚡'
      case 'completed': return '✅'
      default: return '📋'
    }
  }

  const getStateLabel = (state) => {
    switch (state) {
      case 'received': return 'Received'
      case 'analyzing': return 'Analyzing'
      case 'task_created': return 'Task Created'
      case 'assigned': return 'Assigned'
      case 'in_progress': return 'Working'
      case 'completed': return 'Completed'
      default: return state
    }
  }

  return (
    <motion.div 
      className="glass-card rounded-xl overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-display text-sm text-cyber-cyan">Activity Log</h3>
          <span className="text-[10px] text-green-500 animate-pulse">● LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{totalEvents || allActivities.length} events</span>
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} className="text-gray-500">▼</motion.span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="max-h-[600px] overflow-y-auto p-2 space-y-1"
            >
              {allActivities.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  <span className="text-2xl block mb-2">📭</span>
                  Waiting for activity...
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {allActivities.map((activity, idx) => (
                    <motion.div
                      key={activity.id || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-start gap-2 p-2 rounded hover:bg-white/5 ${
                        idx === 0 ? 'bg-cyan-900/20' : ''
                      }`}
                    >
                      <span className="text-[10px] text-gray-600 font-mono w-16 flex-shrink-0">
                        {activity.time}
                      </span>
                      <span 
                        className="text-xs font-bold flex-shrink-0" 
                        style={{ color: activity.agentColor }}
                      >
                        {activity.agentName}
                      </span>
                      <span className="text-xs text-gray-400 flex-1 whitespace-pre-wrap break-words">
                        {activity.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              
              {loading && (
                <div className="text-center text-gray-600 text-xs py-2">Loading more...</div>
              )}
              {!hasMore && allActivities.length > 0 && (
                <div className="text-center text-gray-700 text-[10px] py-2">— End of history —</div>
              )}
            </div>
            
            {/* State legend - hidden on mobile */}
            <div className="hidden sm:block px-3 py-2 border-t border-gray-800/50">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-gray-600">
                {['received', 'analyzing', 'task_created', 'assigned', 'in_progress', 'completed'].map(state => (
                  <span key={state} className="flex items-center gap-1">
                    <span>{getStatusIcon(state)}</span>
                    <span>{getStateLabel(state)}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
