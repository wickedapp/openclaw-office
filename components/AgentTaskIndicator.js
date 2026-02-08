'use client'

import { motion, AnimatePresence } from 'framer-motion'

const AGENT_INFO = {
  wickedman: { name: 'WickedMan', color: '#ff006e', emoji: '😈' },
  py: { name: 'PY', color: '#00f5ff', emoji: '🥃' },
  vigil: { name: 'Vigil', color: '#ff0040', emoji: '🛡️' },
  quill: { name: 'Quill', color: '#ffd700', emoji: '✍️' },
  savy: { name: 'Savy', color: '#9d4edd', emoji: '📋' },
  gantt: { name: 'Gantt', color: '#00d9a5', emoji: '📊' },
  wicked: { name: 'WickedBoy', color: '#ff9500', emoji: '⚡' },
}

// State display config
const STATE_DISPLAY = {
  received:     { icon: '📥', label: 'Received',    mobileLabel: 'New' },
  analyzing:    { icon: '🔍', label: 'Analyzing...', mobileLabel: 'Analyzing' },
  task_created: { icon: '📋', label: 'Task Created', mobileLabel: 'Routing' },
  assigned:     { icon: '📧', label: 'Assigning...',  mobileLabel: 'Assigning' },
  in_progress:  { icon: '⚡', label: 'Working...',   mobileLabel: 'Working' },
}

// Floating task card above agent
// Mobile: compact label with state + agent name
// Desktop: full task detail card
export function TaskCard({ task, position, agentId }) {
  const agent = AGENT_INFO[agentId]
  const taskState = task.state || 'in_progress'
  const display = STATE_DISPLAY[taskState] || STATE_DISPLAY.in_progress
  const taskText = task.detail || task.title || 'Working on task...'
  
  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{ 
        left: `${position.x}%`, 
        top: `${position.y}%`,
        transform: 'translate(-50%, -110%)',
      }}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
    >
      {/* ── Mobile: handled by AgentLabel inline bubble ── */}

      {/* ── Desktop: full task card ── */}
      <div 
        className="hidden sm:block rounded-lg p-3 min-w-[180px] max-w-[280px]"
        style={{
          background: 'rgba(10, 10, 26, 0.95)',
          border: `2px solid ${agent.color}`,
          boxShadow: `0 0 20px ${agent.color}40`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <motion.span 
            className="text-sm"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            {display.icon}
          </motion.span>
          <span className="text-xs font-bold" style={{ color: agent.color }}>
            {display.label}
          </span>
        </div>
        
        <p className="text-xs text-gray-200 leading-relaxed">
          {taskText}
        </p>
        
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: agent.color }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
      
      {/* Arrow pointing down */}
      <div 
        className="w-3 h-3 rotate-45 mx-auto -mt-1.5"
        style={{ 
          background: 'rgba(10, 10, 26, 0.95)',
          borderRight: `2px solid ${agent.color}`,
          borderBottom: `2px solid ${agent.color}`,
        }}
      />
    </motion.div>
  )
}

// Pulsing glow effect when agent is busy
export function BusyGlow({ position, color }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: '80px',
        height: '80px',
      }}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: [0.2, 0.5, 0.2],
        scale: [1, 1.2, 1],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div 
        className="w-full h-full rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  )
}

// Queue badge showing number of pending tasks
export function QueueBadge({ count, position, color }) {
  if (count <= 0) return null
  
  return (
    <motion.div
      className="absolute z-40"
      style={{
        left: `${position.x + 3}%`,
        top: `${position.y - 2}%`,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ 
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      >
        {count}
      </div>
    </motion.div>
  )
}

// Combined agent status overlay — shows for any active state
export default function AgentTaskIndicator({ agentId, task, queueCount = 0, position, glowOnly = false }) {
  const agent = AGENT_INFO[agentId]
  if (!agent) return null
  
  const isActive = task && ['received', 'analyzing', 'task_created', 'assigned', 'in_progress'].includes(task.state)
  
  return (
    <AnimatePresence>
      {isActive && (
        <BusyGlow key={`glow-${agentId}`} position={position} color={agent.color} />
      )}
      {!glowOnly && isActive && (
        <TaskCard key={`task-${agentId}`} task={task} position={position} agentId={agentId} />
      )}
      <QueueBadge key={`queue-${agentId}`} count={queueCount} position={position} color={agent.color} />
    </AnimatePresence>
  )
}
