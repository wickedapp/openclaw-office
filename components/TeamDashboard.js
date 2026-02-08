'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { agents, getAgentStats } from '../lib/agents'

function AgentCard({ agent }) {
  const [currentThought, setCurrentThought] = useState(0)
  const stats = getAgentStats(agent.id)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentThought(prev => (prev + 1) % agent.thoughts.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [agent.thoughts.length])

  return (
    <motion.div
      className="glass-card rounded-xl p-4 relative overflow-hidden group"
      whileHover={{ scale: 1.02 }}
      style={{
        borderColor: agent.color + '44',
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: `radial-gradient(circle, ${agent.color}, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl relative"
          style={{
            background: `${agent.color}22`,
            border: `2px solid ${agent.color}`,
            boxShadow: `0 0 10px ${agent.color}44`,
          }}
        >
          {agent.emoji}
          {/* Status dot */}
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full status-online"
          />
        </div>

        {/* Name & Role */}
        <div>
          <div className="flex items-center gap-2">
            <h4 
              className="font-display font-bold"
              style={{ color: agent.color }}
            >
              {agent.name}
            </h4>
            <span className="text-lg">
              {agent.id === 'py' ? '😏' : 
               agent.id === 'vigil' ? '😤' : 
               agent.id === 'quill' ? '😊' : '😎'}
            </span>
          </div>
          <p className="text-xs text-gray-500">{agent.role}</p>
        </div>
      </div>

      {/* Thought bubble */}
      <motion.div 
        className="bg-gray-900/50 rounded-lg p-3 mb-4 min-h-[60px]"
        key={currentThought}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm text-gray-300 italic">
          "{agent.thoughts[currentThought]}"
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-500">💬</div>
          <div className="text-sm font-bold" style={{ color: agent.color }}>
            {stats.conversations}
          </div>
          <div className="text-[10px] text-gray-600">chats</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">✅</div>
          <div className="text-sm font-bold text-green-400">
            {stats.completed}
          </div>
          <div className="text-[10px] text-gray-600">done</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">📝</div>
          <div className="text-sm font-bold text-cyan-400">
            {stats.words}
          </div>
          <div className="text-[10px] text-gray-600">words</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">🔢</div>
          <div className="text-sm font-bold text-purple-400">
            {stats.tokens > 1000 ? `${(stats.tokens / 1000).toFixed(0)}k` : stats.tokens}
          </div>
          <div className="text-[10px] text-gray-600">tokens</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function TeamDashboard() {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🤖</span>
        <h2 className="font-display text-xl text-cyber-cyan">AI Team Dashboard</h2>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 -mt-4">
        🎧 Listening in on what the AI agents are thinking...
      </p>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AgentCard agent={agent} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
