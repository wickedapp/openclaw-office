'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRequestStream, useActivityStream } from '../lib/useWorkflowStream'
import AgentTaskIndicator from './AgentTaskIndicator'

// Default positions — overridden by config via /api/config
// Auto-generate evenly spaced default positions for any number of agents
function generateDefaultPositions(agentIds) {
  const positions = {}
  const layouts = {
    1: [{ x: 50, y: 45 }],
    2: [{ x: 35, y: 45 }, { x: 65, y: 45 }],
    3: [{ x: 50, y: 35 }, { x: 25, y: 60 }, { x: 75, y: 60 }],
    4: [{ x: 30, y: 35 }, { x: 70, y: 35 }, { x: 30, y: 65 }, { x: 70, y: 65 }],
    5: [{ x: 50, y: 30 }, { x: 20, y: 45 }, { x: 80, y: 45 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
    6: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 15, y: 55 }, { x: 50, y: 55 }, { x: 85, y: 55 }, { x: 50, y: 78 }],
    7: [{ x: 50, y: 28 }, { x: 20, y: 35 }, { x: 80, y: 35 }, { x: 35, y: 55 }, { x: 65, y: 55 }, { x: 22, y: 75 }, { x: 78, y: 75 }],
  }
  const count = agentIds.length
  const layout = layouts[Math.min(count, 7)] || layouts[7]
  agentIds.forEach((id, i) => {
    positions[id] = layout[i % layout.length] || { x: 20 + (i * 15) % 60, y: 30 + (i * 12) % 50 }
  })
  return positions
}

const defaultPositions = {}

// Agents loaded from config endpoint


// Flying task animation component — visually flies from WickedMan to target agent
function FlyingEmail({ from, to, taskTitle, onComplete }) {
  return (
    <>
      {/* Trail particles */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={`particle-${i}`}
          className="absolute z-40 pointer-events-none w-2 h-2 rounded-full"
          style={{ background: 'rgba(0, 245, 255, 0.6)' }}
          initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0 }}
          animate={{ 
            left: `${to.x}%`, 
            top: `${to.y}%`, 
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{ 
            duration: 2.2, 
            ease: "easeInOut",
            delay: i * 0.08,
          }}
        />
      ))}
      {/* Main flying task card */}
      <motion.div
        className="absolute z-50 pointer-events-none"
        style={{ transform: 'translate(-50%, -50%)' }}
        initial={{ left: `${from.x}%`, top: `${from.y}%`, scale: 0.3, opacity: 0 }}
        animate={{ 
          left: [`${from.x}%`, `${(from.x + to.x) / 2}%`, `${to.x}%`],
          top: [`${from.y}%`, `${Math.min(from.y, to.y) - 15}%`, `${to.y}%`],
          scale: [0.3, 1.3, 1],
          opacity: [0, 1, 1],
          rotate: [0, -5, 5, 0],
        }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
        onAnimationComplete={onComplete}
      >
        <div 
          className="rounded-lg px-3 py-2 shadow-2xl border-2 border-cyan-400"
          style={{ 
            background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(157,78,221,0.15))',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 30px rgba(0, 245, 255, 0.6), 0 0 60px rgba(0, 245, 255, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-lg"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 0.4, repeat: 2 }}
            >
              📋
            </motion.span>
            {taskTitle && (
              <span className="text-[10px] text-cyan-200 font-bold max-w-[100px] truncate">
                {taskTitle}
              </span>
            )}
            <motion.span 
              className="text-sm"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 0.3, repeat: 3 }}
            >
              →
            </motion.span>
          </div>
        </div>
      </motion.div>
      {/* Impact flash at destination */}
      <motion.div
        className="absolute z-45 pointer-events-none rounded-full"
        style={{ transform: 'translate(-50%, -50%)' }}
        initial={{ left: `${to.x}%`, top: `${to.y}%`, scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 2, 0],
          opacity: [0, 0.6, 0],
        }}
        transition={{ duration: 0.5, delay: 2.0 }}
      >
        <div className="w-12 h-12 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.5), transparent)' }} />
      </motion.div>
    </>
  )
}

// Return mail animation — flies from completed agent back to WickedMan
function ReturnEmail({ from, to, agentName, onComplete }) {
  return (
    <>
      {/* Trail particles — green/gold for return */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={`ret-particle-${i}`}
          className="absolute z-40 pointer-events-none w-2 h-2 rounded-full"
          style={{ background: 'rgba(57, 255, 20, 0.6)' }}
          initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0 }}
          animate={{ 
            left: `${to.x}%`, 
            top: `${to.y}%`, 
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{ duration: 1.8, ease: "easeInOut", delay: i * 0.06 }}
        />
      ))}
      {/* Main return mail card */}
      <motion.div
        className="absolute z-50 pointer-events-none"
        style={{ transform: 'translate(-50%, -50%)' }}
        initial={{ left: `${from.x}%`, top: `${from.y}%`, scale: 0.3, opacity: 0 }}
        animate={{ 
          left: [`${from.x}%`, `${(from.x + to.x) / 2}%`, `${to.x}%`],
          top: [`${from.y}%`, `${Math.min(from.y, to.y) - 12}%`, `${to.y}%`],
          scale: [0.3, 1.2, 1],
          opacity: [0, 1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 1.8, ease: "easeInOut" }}
        onAnimationComplete={onComplete}
      >
        <div 
          className="rounded-lg px-3 py-2 shadow-2xl border-2 border-green-400"
          style={{ 
            background: 'linear-gradient(135deg, rgba(57,255,20,0.15), rgba(255,215,0,0.15))',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 30px rgba(57, 255, 20, 0.6), 0 0 60px rgba(57, 255, 20, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-lg"
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 0.4, repeat: 2 }}
            >
              ✅
            </motion.span>
            <span className="text-[10px] text-green-200 font-bold max-w-[100px] truncate">
              {agentName} done
            </span>
            <motion.span 
              className="text-sm"
              animate={{ x: [0, -3, 0] }}
              transition={{ duration: 0.3, repeat: 3 }}
            >
              ←
            </motion.span>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// Task popup notification - disappears quickly after mail arrives
function TaskPopup({ task, position, onClose }) {
  useEffect(() => {
    // Auto-close after 3.5s (before work starts)
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      className="absolute z-40"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -120%)' }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
    >
      <div className="bg-gray-900/95 rounded-lg p-3 border-2 border-cyan-400 shadow-xl min-w-[200px] max-w-[280px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📥</span>
          <span className="text-cyan-400 font-bold text-sm">New Task</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{task.detail}</p>
      </div>
    </motion.div>
  )
}

// ThoughtBubble removed — TaskCard handles all states including analyzing

// Agent name label - draggable with responsive sizing
// On mobile, task bubble renders directly above the label (same DOM node)
function AgentLabel({ agent, position, onDragEnd, isWorking, dragKey, scale, task }) {
  const taskState = task?.state || 'in_progress'
  const stateDisplay = {
    received:     { icon: '📥', label: 'New' },
    analyzing:    { icon: '🔍', label: 'Analyzing' },
    reviewing:    { icon: '🔄', label: 'Reviewing' },
    task_created: { icon: '📋', label: 'Routing' },
    assigned:     { icon: '📧', label: 'Assigning' },
    in_progress:  { icon: '⚡', label: 'Working' },
  }
  const display = stateDisplay[taskState] || stateDisplay.in_progress

  return (
    <motion.div
      key={dragKey} // Force remount to reset drag transform
      className="absolute cursor-grab active:cursor-grabbing z-20"
      style={{ 
        left: `${position.x}%`, 
        top: `${position.y}%`, 
        transform: `translate(-50%, 0) scale(${scale})`,
        transformOrigin: 'top center',
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={(event, info) => onDragEnd(agent.id, info, event)}
      whileDrag={{ scale: scale * 1.1, zIndex: 100 }}
    >
      {/* Task bubble above label — both mobile and desktop */}
      {isWorking && task && (
        <motion.div 
          className="flex flex-col items-center mb-1"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div 
            className="rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 sm:min-w-[180px] sm:max-w-[280px]"
            style={{
              background: 'rgba(10, 10, 26, 0.95)',
              border: `2px solid ${agent.color}`,
              boxShadow: `0 0 15px ${agent.color}40`,
            }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <motion.span 
                  className="text-xs sm:text-sm"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  {display.icon}
                </motion.span>
                <span className="text-[10px] sm:text-xs font-bold" style={{ color: agent.color }}>
                  {display.label}
                </span>
                <div className="flex gap-0.5 ml-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                      style={{ background: agent.color }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              </div>
              {/* Task content — truncated on mobile, fuller on desktop */}
              {task.detail && (
                <>
                  <p className="sm:hidden text-[9px] text-gray-400 max-w-[150px] truncate">
                    {task.detail.slice(0, 40)}{task.detail.length > 40 ? '...' : ''}
                  </p>
                  <p className="hidden sm:block text-xs text-gray-200 leading-relaxed">
                    {task.detail.slice(0, 80)}{task.detail.length > 80 ? '...' : ''}
                  </p>
                </>
              )}
            </div>
          </div>
          {/* Arrow pointing down to label */}
          <div 
            className="w-2 h-2 rotate-45 -mt-1"
            style={{ 
              background: 'rgba(10, 10, 26, 0.95)',
              borderRight: `2px solid ${agent.color}`,
              borderBottom: `2px solid ${agent.color}`,
            }}
          />
        </motion.div>
      )}

      <div className="relative">
        <div 
          className="px-2 py-1 rounded text-[11px] font-bold text-center whitespace-nowrap shadow-lg select-none"
          style={{
            background: '#1a1a2e',
            border: `2px solid ${agent.color}`,
            color: '#fff',
            boxShadow: isWorking 
              ? `0 0 15px ${agent.color}, 0 2px 8px rgba(0,0,0,0.7)`
              : '0 2px 8px rgba(0,0,0,0.7)',
          }}
        >
          {agent.name}
          {scale >= 0.7 && (
            <div className="text-[9px] font-normal opacity-90">{agent.role}</div>
          )}
        </div>
        <motion.div 
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-gray-900"
          style={{ 
            background: isWorking ? '#ffd700' : '#39ff14', 
            boxShadow: `0 0 8px ${isWorking ? '#ffd700' : '#39ff14'}` 
          }}
          animate={isWorking ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
    </motion.div>
  )
}

export default function IsometricOffice({ activeRequest }) {
  const containerRef = useRef(null)
  const [time, setTime] = useState('')
  const [flyingEmails, setFlyingEmails] = useState([])
  const [returnEmails, setReturnEmails] = useState([])
  const [taskPopup, setTaskPopup] = useState(null)
  const [labelPositions, setLabelPositions] = useState(defaultPositions)
  const [mounted, setMounted] = useState(false)
  const [workingAgents, setWorkingAgents] = useState({})
  const [dragKeys, setDragKeys] = useState({})
  const [labelScale, setLabelScale] = useState(1)
  const [savedAmount, setSavedAmount] = useState(null)
  const [agents, setAgents] = useState([])
  const [officeConfig, setOfficeConfig] = useState(null)

  // Client-side only initialization — load config from API
  useEffect(() => {
    setMounted(true)
    setTime(new Date().toLocaleTimeString())
    
    // Load config from API
    fetch('/api/config')
      .then(r => r.json())
      .then(config => {
        setOfficeConfig(config)
        // Build agents array from config (supports both array and object format)
        const rawAgents = config.agents || {}
        const agentList = Array.isArray(rawAgents)
          ? rawAgents.map(a => ({ ...a, status: 'online' }))
          : Object.entries(rawAgents).map(([id, data]) => ({ id, ...data, status: 'online' }))
        setAgents(agentList)
        // Build default positions from config
        // Generate fallback positions for all agents
        const generatedPositions = generateDefaultPositions(agentList.map(a => a.id))
        const configPositions = { ...generatedPositions }
        for (const a of agentList) {
          if (a.position) configPositions[a.id] = a.position
        }
        const imgPositions = config.image?.positions || {}
        setLabelPositions(prev => ({ ...configPositions, ...imgPositions, ...prev }))
      })
      .catch(e => console.error('Failed to load config:', e))
    
    // Load saved positions from localStorage
    const saved = localStorage.getItem('office-label-pos')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setLabelPositions(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Load error:', e)
      }
    }
  }, [])

  // Calculate label scale based on container width
  useEffect(() => {
    if (!mounted || !containerRef.current) return
    
    const updateScale = () => {
      const width = containerRef.current?.offsetWidth || 800
      // Scale from 0.5 (at 300px) to 1.0 (at 700px+)
      const scale = Math.min(1, Math.max(0.5, (width - 300) / 400 + 0.5))
      setLabelScale(scale)
    }
    
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [mounted])

  // Update time
  useEffect(() => {
    if (!mounted) return
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [mounted])

  // Fetch real savings from stats API
  useEffect(() => {
    if (!mounted) return
    const fetchSavings = async () => {
      try {
        const res = await fetch('/api/stats?_t=' + Date.now())
        if (res.ok) {
          const data = await res.json()
          setSavedAmount(data.allTime?.savings_usd ?? 0)
        }
      } catch (e) { /* ignore */ }
    }
    fetchSavings()
    const timer = setInterval(fetchSavings, 60000) // refresh every minute
    return () => clearInterval(timer)
  }, [mounted])

  // SSE-driven agent state sync — updates instantly on every state change
  const streamedRequests = useRequestStream()
  const streamedActivities = useActivityStream()
  const prevRequestStates = useRef({}) // Track previous states to detect transitions
  const processedChainReturns = useRef(new Set()) // Avoid duplicate return animations

  // Listen for chain_return events from activity stream
  useEffect(() => {
    if (!mounted) return
    const latestActivities = streamedActivities.slice(0, 5) // Only check recent
    for (const evt of latestActivities) {
      if (evt.state === 'chain_return' && !processedChainReturns.current.has(evt.id)) {
        processedChainReturns.current.add(evt.id)
        const fromAgent = evt.agent
        const toPos = animPositions.wickedman
        const fromPos = animPositions[fromAgent] || animPositions.wickedman
        const agentName = evt.agentName || fromAgent
        const emailId = Date.now() + Math.random()
        setReturnEmails(prev => [...prev, { id: emailId, from: fromPos, to: toPos, agentName }])
        // Clean up processed set after 30s
        setTimeout(() => processedChainReturns.current.delete(evt.id), 30000)
      }
    }
  }, [mounted, streamedActivities])
  
  useEffect(() => {
    if (!mounted) return
    
    const activeRequests = streamedRequests.filter(r => r.state !== 'completed')
    const newWorking = {}
    
    activeRequests.forEach(req => {
      // Detect task_created → assigned transition for flying animation
      const prevState = prevRequestStates.current[req.id]
      if (req.state === 'assigned' && prevState && prevState !== 'assigned') {
        const targetAgent = req.assignedTo || req.task?.targetAgent || 'wickedman'
        if (targetAgent !== 'wickedman') {
          // Trigger flying task animation from WickedMan to target agent
          const from = animPositions.wickedman
          const to = animPositions[targetAgent] || animPositions.wickedman
          const taskTitle = req.task?.title || req.content?.slice(0, 40) || 'Task'
          const emailId = Date.now() + Math.random()
          setFlyingEmails(prev => [...prev, { id: emailId, from, to, taskTitle }])
        }
      }
      prevRequestStates.current[req.id] = req.state
      
      if (req.state === 'reviewing') {
        newWorking['wickedman'] = {
          task: { detail: req.content, title: req.content?.slice(0, 50), state: 'reviewing' },
          startedAt: req.createdAt || Date.now(),
          requestId: req.id,
        }
      } else if (req.state === 'received' || req.state === 'analyzing') {
        newWorking['wickedman'] = {
          task: { detail: req.content, title: req.content?.slice(0, 50), state: req.state },
          startedAt: req.createdAt || Date.now(),
          requestId: req.id,
        }
      } else if (req.state === 'task_created') {
        // WickedMan is routing — show on wickedman only
        newWorking['wickedman'] = {
          task: { detail: req.content, title: req.content?.slice(0, 50), state: req.state },
          startedAt: req.createdAt || Date.now(),
          requestId: req.id,
        }
      } else if (req.state === 'assigned') {
        // Mail is flying — show on wickedman (sending), target only gets the flying animation
        newWorking['wickedman'] = {
          task: { detail: req.content, title: req.content?.slice(0, 50), state: req.state },
          startedAt: req.createdAt || Date.now(),
          requestId: req.id,
        }
      } else if (req.state === 'in_progress' && req.assignedTo) {
        newWorking[req.assignedTo] = {
          task: { ...req.task, detail: req.content, state: 'in_progress' },
          startedAt: req.workStartedAt || Date.now(),
          requestId: req.id,
        }
      }
    })
    
    // Clean up old state tracking
    const activeIds = new Set(streamedRequests.map(r => r.id))
    Object.keys(prevRequestStates.current).forEach(id => {
      if (!activeIds.has(id)) delete prevRequestStates.current[id]
    })
    
    setWorkingAgents(newWorking)
  }, [mounted, streamedRequests])

  // Handle drag end - calculate new position and save
  const handleDragEnd = useCallback((agentId, info, event) => {
    if (!containerRef.current) return
    
    const container = containerRef.current.getBoundingClientRect()
    const element = event.target.getBoundingClientRect()
    
    // Calculate center of dragged element relative to container
    const centerX = element.left + element.width / 2 - container.left
    const centerY = element.top - container.top
    
    // Convert to percentage
    const newX = Math.max(5, Math.min(95, (centerX / container.width) * 100))
    const newY = Math.max(5, Math.min(95, (centerY / container.height) * 100))
    
    setLabelPositions(prev => {
      const updated = { ...prev, [agentId]: { x: newX, y: newY } }
      localStorage.setItem('office-label-pos', JSON.stringify(updated))
      return updated
    })
    
    // Force remount of the label to reset drag transform
    setDragKeys(prev => ({ ...prev, [agentId]: (prev[agentId] || 0) + 1 }))
  }, [])

  // Animation positions — derived from label positions (config-driven)
  const animPositions = { external: { x: 10, y: 10 }, ...labelPositions }

  // Trigger task animation
  const triggerTaskAnimation = useCallback((fromAgent, toAgent, taskTitle) => {
    const emailId = Date.now()
    const from = animPositions[fromAgent] || animPositions.external
    const to = animPositions[toAgent] || animPositions.wickedman

    setFlyingEmails(prev => [...prev, { id: emailId, from, to, taskTitle }])

    // Show popup when email arrives
    setTimeout(() => {
      setTaskPopup({ task: { detail: taskTitle }, position: to })
    }, 1000)
  }, [])

  useEffect(() => {
    window.triggerTaskAnimation = triggerTaskAnimation
    return () => { delete window.triggerTaskAnimation }
  }, [triggerTaskAnimation])

  const removeEmail = (id) => setFlyingEmails(prev => prev.filter(e => e.id !== id))

  if (!mounted) {
    return <div className="relative w-full rounded-xl bg-gray-900" style={{ aspectRatio: '2816 / 1536' }} />
  }

  return (
    <div ref={containerRef} className="office-container relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '2816 / 1536' }}>
      {/* Office image - fills container */}
      <img 
        src={`/sprites/office.png?v=${Date.now()}`} 
        alt="AI Office" 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Agent Task Indicators — glow effect only (task card is rendered inside AgentLabel) */}
      {Object.entries(workingAgents).map(([agentId, data]) => (
        <AgentTaskIndicator
          key={agentId}
          agentId={agentId}
          task={data.task}
          position={labelPositions[agentId] || defaultPositions[agentId] || { x: 50, y: 50 }}
          glowOnly={true}
        />
      ))}

      {/* Draggable labels */}
      {agents.map((agent) => (
        <AgentLabel
          key={`${agent.id}-${dragKeys[agent.id] || 0}`}
          agent={agent}
          position={labelPositions[agent.id] || defaultPositions[agent.id] || { x: 50, y: 50 }}
          onDragEnd={handleDragEnd}
          isWorking={!!workingAgents[agent.id]}
          dragKey={dragKeys[agent.id] || 0}
          scale={labelScale}
          task={workingAgents[agent.id]?.task}
        />
      ))}

      {/* Return emails (chain continuation) */}
      <AnimatePresence>
        {returnEmails.map(email => (
          <ReturnEmail
            key={email.id}
            from={email.from}
            to={email.to}
            agentName={email.agentName}
            onComplete={() => setReturnEmails(prev => prev.filter(e => e.id !== email.id))}
          />
        ))}
      </AnimatePresence>

      {/* Flying emails */}
      <AnimatePresence>
        {flyingEmails.map(email => (
          <FlyingEmail 
            key={email.id} 
            from={email.from} 
            to={email.to} 
            taskTitle={email.taskTitle}
            onComplete={() => removeEmail(email.id)} 
          />
        ))}
      </AnimatePresence>

      {/* Task popup */}
      <AnimatePresence>
        {taskPopup && <TaskPopup task={taskPopup.task} position={taskPopup.position} onClose={() => setTaskPopup(null)} />}
      </AnimatePresence>

      {/* Top UI - responsive with dynamic scaling */}
      <div 
        className="absolute top-2 left-2 flex items-center gap-1 z-30"
        style={{ transform: `scale(${labelScale})`, transformOrigin: 'top left' }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-900/70 border border-green-500/50 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400 font-bold">LIVE</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-gray-900/70 border border-cyan-500/30 backdrop-blur-sm">
          <span className="text-xs text-cyan-400 font-mono">{time}</span>
        </div>
      </div>

      <div 
        className="absolute top-2 right-2 z-30"
        style={{ transform: `scale(${labelScale})`, transformOrigin: 'top right' }}
      >
        <div className="px-3 py-1.5 rounded-lg bg-gray-900/70 border border-green-500/50 backdrop-blur-sm">
          <span className="text-xs text-green-400 font-bold">💰 Saved: ${savedAmount !== null ? savedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}</span>
        </div>
      </div>
      
      {/* Working agents indicator */}
      {Object.keys(workingAgents).length > 0 && (
        <div 
          className="absolute bottom-2 left-2 z-30"
          style={{ transform: `scale(${labelScale})`, transformOrigin: 'bottom left' }}
        >
          <div className="px-2 py-1.5 rounded-lg bg-yellow-900/70 border border-yellow-500/50 backdrop-blur-sm">
            <span className="text-xs text-yellow-400">
              ⚡ {Object.keys(workingAgents).length} agent{Object.keys(workingAgents).length > 1 ? 's' : ''} working
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
