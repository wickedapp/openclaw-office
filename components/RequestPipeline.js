'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRequestStream } from '../lib/useWorkflowStream'

const STATES = [
  { id: 'received', label: 'Received', icon: '📥', color: '#00f5ff' },
  { id: 'analyzing', label: 'Analyzing', icon: '🔍', color: '#ffd700' },
  { id: 'task_created', label: 'Task Created', icon: '📋', color: '#9d4edd' },
  { id: 'assigned', label: 'Assigned', icon: '📧', color: '#ff006e' },
  { id: 'in_progress', label: 'Working', icon: '⚡', color: '#39ff14' },
  { id: 'completed', label: 'Done', icon: '✅', color: '#00ff88' },
]

const STATE_INDEX = Object.fromEntries(STATES.map((s, i) => [s.id, i]))

// Single request card in the pipeline
function RequestCard({ request, isLatest }) {
  const currentStateIdx = STATE_INDEX[request.state] ?? 0
  const agent = request.assignedTo
  
  const AGENT_INFO = {
    wickedman: { name: 'WickedMan', color: '#ff006e', emoji: '😈' },
    py: { name: 'PY', color: '#00f5ff', emoji: '🥃' },
    vigil: { name: 'Vigil', color: '#ff0040', emoji: '🛡️' },
    quill: { name: 'Quill', color: '#ffd700', emoji: '✍️' },
    savy: { name: 'Savy', color: '#9d4edd', emoji: '📋' },
    gantt: { name: 'Gantt', color: '#00d9a5', emoji: '📊' },
  }
  
  const agentInfo = agent ? AGENT_INFO[agent] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      className={`rounded-lg p-3 mb-3 border ${
        isLatest 
          ? 'bg-cyan-900/30 border-cyan-500/50' 
          : 'bg-gray-900/50 border-gray-700/50'
      }`}
    >
      {/* Request content */}
      <div className="flex items-start gap-2 mb-3">
        <span className="text-lg">💬</span>
        <p className="text-sm text-gray-300 flex-1 whitespace-pre-wrap break-words">
          {request.content}
        </p>
      </div>
      
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-2">
        {STATES.map((state, idx) => {
          const isActive = idx === currentStateIdx
          const isPast = idx < currentStateIdx
          const isFuture = idx > currentStateIdx
          
          return (
            <div key={state.id} className="flex-1 flex items-center">
              <motion.div
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  isPast ? 'bg-green-500' : 
                  isActive ? 'bg-cyan-400' : 
                  'bg-gray-700'
                }`}
                animate={isActive ? { 
                  boxShadow: ['0 0 0px rgba(0,245,255,0)', '0 0 10px rgba(0,245,255,0.8)', '0 0 0px rgba(0,245,255,0)']
                } : {}}
                transition={isActive ? { duration: 1, repeat: Infinity } : {}}
              />
            </div>
          )
        })}
      </div>
      
      {/* Current state indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span 
            className="text-lg"
            animate={currentStateIdx < 5 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
          >
            {STATES[currentStateIdx]?.icon}
          </motion.span>
          <span 
            className="text-xs font-bold"
            style={{ color: STATES[currentStateIdx]?.color }}
          >
            {STATES[currentStateIdx]?.label}
          </span>
        </div>
        
        {/* Agent badge */}
        {agentInfo && (
          <motion.div 
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ 
              background: `${agentInfo.color}20`,
              border: `1px solid ${agentInfo.color}50`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span>{agentInfo.emoji}</span>
            <span style={{ color: agentInfo.color }}>{agentInfo.name}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default function RequestPipeline({ onRequestUpdate }) {
  const streamedRequests = useRequestStream()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const containerRef = useRef(null)

  // Forward latest request to parent
  useEffect(() => {
    if (onRequestUpdate && streamedRequests[0]) {
      onRequestUpdate(streamedRequests[0])
    }
  }, [streamedRequests, onRequestUpdate])

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    
    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setVisibleCount(prev => prev + 6)
    }
  }, [])

  // Process a new request through the pipeline
  const processRequest = useCallback(async (content) => {
    try {
      // Step 1: Create request
      const res1 = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new_request', content, from: 'Boss' })
      })
      const data1 = await res1.json()
      if (!data1.success) throw new Error('Failed to create request')
      
      const requestId = data1.request.id
      
      // Step 2: Analyze (after delay)
      await new Promise(r => setTimeout(r, 800))
      const res2 = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', requestId })
      })
      const data2 = await res2.json()
      
      // Step 3: Create task (after delay)
      await new Promise(r => setTimeout(r, 1500))
      const res3 = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_task', requestId, analysis: data2.analysis })
      })
      await res3.json()
      
      // Step 4: Assign (after delay)
      await new Promise(r => setTimeout(r, 800))
      const res4 = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', requestId })
      })
      const data4 = await res4.json()
      
      // Trigger animation if available
      if (window.triggerTaskAnimation && data4.animation) {
        window.triggerTaskAnimation(
          data4.animation.from, 
          data4.animation.to, 
          data4.animation.taskTitle
        )
      }
      
      // Step 5: Start work (after delay)
      await new Promise(r => setTimeout(r, 1000))
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_work', requestId })
      })
      
      // Step 6: Auto-complete after simulated work time
      await new Promise(r => setTimeout(r, 4000))
      await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', requestId, result: 'Task completed successfully' })
      })
      
      return { success: true, requestId }
      
    } catch (error) {
      console.error('Process request error:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Expose processRequest globally
  useEffect(() => {
    window.processWorkflowRequest = processRequest
    return () => { delete window.processWorkflowRequest }
  }, [processRequest])

  const activeRequests = streamedRequests.filter(r => r.state !== 'completed')
  const hasActive = activeRequests.length > 0

  return (
    <motion.div 
      className="glass-card rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/30 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <h3 className="font-display text-sm text-cyber-cyan">Request Pipeline</h3>
          {hasActive && (
            <span className="text-[10px] text-green-500 animate-pulse">● PROCESSING</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{activeRequests.length} active</span>
          <motion.span 
            animate={{ rotate: isCollapsed ? 0 : 180 }} 
            className="text-gray-500"
          >
            ▼
          </motion.span>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: 'auto' }} 
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div 
              ref={containerRef}
              onScroll={handleScroll}
              className="p-3 max-h-80 overflow-y-auto"
            >
              {activeRequests.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  <span className="text-2xl mb-2 block">📭</span>
                  Waiting for requests...
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {activeRequests.slice(0, visibleCount).map((req, idx) => (
                    <RequestCard 
                      key={req.id} 
                      request={req} 
                      isLatest={idx === 0}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            {/* State legend - hidden on mobile */}
            <div className="hidden sm:block px-3 pb-3">
              <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                {STATES.map(state => (
                  <span key={state.id} className="flex items-center gap-1">
                    <span>{state.icon}</span>
                    <span>{state.label}</span>
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
