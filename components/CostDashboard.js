'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { TrendingUp, DollarSign, Users, Zap, Trophy, Cpu, ArrowUpRight } from 'lucide-react'
import { agents } from '../lib/agents'

// Build agent lookup by id for colors/emoji/name/role
const agentMap = {}
for (const a of agents) {
  agentMap[a.id] = a
}

function formatUSD(value) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(2)}`
}

function formatTokens(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return `${value}`
}

// Animated number component
function AnimatedNumber({ target, format = 'number', duration = 2000 }) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    const steps = 60
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCurrent(target * easeOut)
      if (step >= steps) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target, duration])

  if (format === 'usd') return formatUSD(current)
  if (format === 'fte') return current.toFixed(2)
  if (format === 'tokens') return formatTokens(current)
  return Math.floor(current).toLocaleString()
}

export default function CostDashboard() {
  const [stats, setStats] = useState(null)
  const [agentStats, setAgentStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, agentsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/stats/agents'),
        ])
        
        if (!statsRes.ok) throw new Error('Failed to fetch stats')
        if (!agentsRes.ok) throw new Error('Failed to fetch agent stats')
        
        const statsData = await statsRes.json()
        const agentsData = await agentsRes.json()
        
        setStats(statsData)
        setAgentStats(agentsData.agents || [])
      } catch (err) {
        console.error('CostDashboard fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Compute derived values
  const allTime = stats?.allTime || {}
  const savingsUsd = allTime.savings_usd || 0
  const tasksCompleted = allTime.tasks_completed || 0
  const humanTimeMs = allTime.human_time_ms || 0
  const costUsd = allTime.cost_usd || 0
  const totalTokens = allTime.tokens?.total || 0
  
  // FTE = human_time / (8hr/day * 30 days)
  const fteEquivalent = humanTimeMs / (8 * 3600000 * 30)
  
  const statCards = [
    {
      label: 'Total Savings',
      value: savingsUsd,
      format: 'usd',
      icon: DollarSign,
      color: '#39ff14',
      subtitle: `vs $${costUsd.toFixed(2)} AI cost`,
    },
    {
      label: 'FTE Equivalent',
      value: fteEquivalent,
      format: 'fte',
      icon: Users,
      color: '#00f5ff',
      subtitle: `${(humanTimeMs / 3600000).toFixed(1)}h human work`,
    },
    {
      label: 'Tasks Completed',
      value: tasksCompleted,
      format: 'number',
      icon: TrendingUp,
      color: '#9d4edd',
      subtitle: 'all time',
    },
    {
      label: 'Tokens Used',
      value: totalTokens,
      format: 'tokens',
      icon: Cpu,
      color: '#ff006e',
      subtitle: `$${costUsd.toFixed(2)}`,
    },
  ]

  // Merge agent stats with agent config (colors, names, etc.)
  const leaderboard = agentStats.map(as => {
    const agentConfig = agentMap[as.id] || {
      name: as.id,
      emoji: '🤖',
      color: '#888',
      role: 'Agent',
    }
    return {
      ...agentConfig,
      ...as,
      name: agentConfig.name,
      emoji: agentConfig.emoji,
      color: agentConfig.color,
      role: agentConfig.role,
    }
  })

  // Also add agents that have no stats yet (show as 0)
  for (const agent of agents) {
    if (!leaderboard.find(l => l.id === agent.id)) {
      leaderboard.push({
        ...agent,
        total_tasks: 0,
        tasks_completed: 0,
        events: 0,
        total_task_time_ms: 0,
        estimated_human_time_ms: 0,
        savings_usd: 0,
        hourly_rate: 0,
      })
    }
  }

  // Sort by savings descending
  leaderboard.sort((a, b) => (b.savings_usd || 0) - (a.savings_usd || 0))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-green-500" />
          <h2 className="font-display text-xl text-cyber-cyan">Cost Savings</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 text-center animate-pulse">
              <div className="w-6 h-6 mx-auto mb-2 rounded bg-gray-700" />
              <div className="h-8 w-20 mx-auto mb-1 rounded bg-gray-700" />
              <div className="h-3 w-16 mx-auto rounded bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-green-500" />
        <h2 className="font-display text-xl text-cyber-cyan">Cost Savings</h2>
        {savingsUsd > costUsd && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/50">
            <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
            ROI {costUsd > 0 ? `${((savingsUsd / costUsd - 1) * 100).toFixed(0)}%` : '∞'}
          </span>
        )}
      </div>

      {error && (
        <div className="glass-card rounded-xl p-3 border border-red-900/50 text-red-400 text-sm">
          ⚠️ Error loading data: {error}. Showing zeros.
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            className="glass-card rounded-xl p-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <card.icon
              className="w-6 h-6 mx-auto mb-2 opacity-50"
              style={{ color: card.color }}
            />
            <div
              className="text-2xl font-display font-bold mb-1"
              style={{ color: card.color }}
            >
              <AnimatedNumber target={card.value} format={card.format} />
            </div>
            <div className="text-xs text-gray-400">{card.label}</div>
            {card.subtitle && (
              <div className="text-[10px] text-gray-500 mt-1">{card.subtitle}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* AI Cost vs Human Cost comparison bar */}
      {(savingsUsd > 0 || costUsd > 0) && (
        <motion.div
          className="glass-card rounded-xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xs text-gray-400 mb-3 font-display">AI Cost vs Human Cost</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-cyan-400">AI Cost</span>
                <span className="text-cyan-400">${costUsd.toFixed(2)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #00f5ff, #0088ff)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((costUsd / Math.max(savingsUsd + costUsd, 1)) * 100, 100)}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </div>
            </div>
            <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-green-400">Human Equivalent</span>
                <span className="text-green-400">${(savingsUsd + costUsd).toFixed(2)}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #39ff14, #00cc44)' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
          {savingsUsd > costUsd && (
            <div className="text-center mt-2 text-[11px] text-green-400">
              💰 Saving ${(savingsUsd - costUsd).toFixed(2)} compared to hiring humans
            </div>
          )}
        </motion.div>
      )}

      {/* Agent Leaderboard */}
      <motion.div
        className="glass-card rounded-xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-900/30">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="font-display text-sm text-cyber-cyan">Agent Leaderboard</h3>
          <span className="text-[10px] text-gray-500 ml-auto">real data from DB</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-500 font-normal">Agent</th>
                <th className="px-4 py-3 text-center text-gray-500 font-normal">Tasks</th>
                <th className="px-4 py-3 text-center text-gray-500 font-normal">Events</th>
                <th className="px-4 py-3 text-center text-gray-500 font-normal">Time</th>
                <th className="px-4 py-3 text-center text-gray-500 font-normal">Savings</th>
                <th className="px-4 py-3 text-center text-gray-500 font-normal">Rate/hr</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((agent, index) => {
                const taskTimeSec = (agent.total_task_time_ms || 0) / 1000
                const timeStr = taskTimeSec >= 60
                  ? `${(taskTimeSec / 60).toFixed(1)}m`
                  : `${taskTimeSec.toFixed(0)}s`

                return (
                  <motion.tr
                    key={agent.id}
                    className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.emoji}</span>
                        <div>
                          <div className="font-bold" style={{ color: agent.color }}>
                            {agent.name}
                          </div>
                          <div className="text-[10px] text-gray-500">{agent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-gray-300">{agent.tasks_completed || 0}</span>
                      {agent.total_tasks > agent.tasks_completed && (
                        <span className="text-gray-600 text-xs">/{agent.total_tasks}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {agent.events || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-cyan-400">
                      {(agent.total_task_time_ms || 0) > 0 ? timeStr : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-400 font-bold">
                        {(agent.savings_usd || 0) > 0
                          ? `$${agent.savings_usd.toFixed(2)}`
                          : '$0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-purple-400">
                      {agent.hourly_rate ? `$${agent.hourly_rate}` : '—'}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
