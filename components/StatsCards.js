'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

export default function StatsCards({ initialStats }) {
  const [stats, setStats] = useState(null)
  const [animatedStats, setAnimatedStats] = useState({
    conversations: 0,
    tokens: 0,
    cost: 0,
    savings: 0,
  })
  const [loading, setLoading] = useState(true)

  // Fetch real stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setLoading(false)
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchStats])

  // Animate numbers when stats change
  useEffect(() => {
    if (!stats) return

    const target = {
      conversations: stats.today.messages || 0,
      tokens: stats.allTime.tokens.total || 0,
      cost: stats.allTime.cost_usd || 0,
      savings: Math.round(stats.allTime.savings_usd || 0),
    }

    const duration = 1500
    const steps = 45
    const interval = duration / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setAnimatedStats({
        conversations: Math.floor(target.conversations * easeOut),
        tokens: Math.floor(target.tokens * easeOut),
        cost: parseFloat((target.cost * easeOut).toFixed(2)),
        savings: Math.floor(target.savings * easeOut),
      })

      if (step >= steps) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [stats])

  // Show loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
            <div className="w-8 h-8 bg-gray-700 rounded mb-2" />
            <div className="w-20 h-6 bg-gray-700 rounded mb-2" />
            <div className="w-16 h-3 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: "Today's Messages",
      value: animatedStats.conversations,
      subValue: stats ? `${stats.today.tasks_completed} tasks` : '',
      color: '#00f5ff',
      icon: '💬',
    },
    {
      label: 'Total Tokens',
      value: animatedStats.tokens.toLocaleString(),
      subValue: stats ? `In: ${(stats.allTime.tokens.input / 1000).toFixed(0)}K / Out: ${(stats.allTime.tokens.output / 1000).toFixed(0)}K` : '',
      color: '#9d4edd',
      icon: '🔢',
    },
    {
      label: 'API Cost (USD)',
      value: `$${animatedStats.cost.toFixed(2)}`,
      subValue: stats ? `Today: $${stats.today.cost_usd.toFixed(2)}` : '',
      color: '#ff006e',
      icon: '💰',
    },
    {
      label: 'Savings (USD)',
      value: `$${animatedStats.savings.toLocaleString()}`,
      subValue: stats ? `Today: $${Math.round(stats.today.savings_usd).toLocaleString()}` : '',
      color: '#39ff14',
      icon: '📈',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            className="glass-card rounded-xl p-4 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            style={{
              borderColor: card.color + '44',
            }}
          >
            {/* Glow effect */}
            <div 
              className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${card.color}, transparent)` }}
            />

            {/* Icon */}
            <div className="text-2xl mb-2">{card.icon}</div>

            {/* Value */}
            <div 
              className="text-2xl font-display font-bold mb-1"
              style={{ color: card.color }}
            >
              {card.value}
            </div>

            {/* Label */}
            <div className="text-xs text-gray-400">{card.label}</div>
            
            {/* Sub Value */}
            {card.subValue && (
              <div className="text-[10px] text-gray-500 mt-1">{card.subValue}</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Detailed Stats */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's Stats */}
          <motion.div
            className="glass-card rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
              <span>📅</span> Today's Activity
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Messages</div>
                <div className="text-white font-bold">{stats.today.messages}</div>
              </div>
              <div>
                <div className="text-gray-500">Tasks Done</div>
                <div className="text-white font-bold">{stats.today.tasks_completed}</div>
              </div>
              <div>
                <div className="text-gray-500">Tokens Used</div>
                <div className="text-white font-bold">{stats.today.tokens.total.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Cost</div>
                <div className="text-white font-bold">${stats.today.cost_usd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">AI Time</div>
                <div className="text-white font-bold">{formatDuration(stats.today.task_time_ms)}</div>
              </div>
              <div>
                <div className="text-gray-500">Human Equiv.</div>
                <div className="text-green-400 font-bold">{formatDuration(stats.today.human_time_ms)}</div>
              </div>
            </div>
          </motion.div>

          {/* All Time Stats */}
          <motion.div
            className="glass-card rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
              <span>📊</span> All Time
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Total Messages</div>
                <div className="text-white font-bold">{stats.allTime.messages.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Tasks Completed</div>
                <div className="text-white font-bold">{stats.allTime.tasks_completed.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Input Tokens</div>
                <div className="text-white font-bold">{(stats.allTime.tokens.input / 1000000).toFixed(2)}M</div>
              </div>
              <div>
                <div className="text-gray-500">Output Tokens</div>
                <div className="text-white font-bold">{(stats.allTime.tokens.output / 1000000).toFixed(2)}M</div>
              </div>
              <div>
                <div className="text-gray-500">Total Cost</div>
                <div className="text-red-400 font-bold">${stats.allTime.cost_usd.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Savings</div>
                <div className="text-green-400 font-bold">${Math.round(stats.allTime.savings_usd).toLocaleString()}</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Time Saved Visualization */}
      {stats && stats.allTime.human_time_ms > 0 && (
        <motion.div
          className="glass-card rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
            <span>⏰</span> Time Saved
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-gray-500 text-xs mb-1">AI Processing Time</div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: '10%' }}
                  transition={{ duration: 1, delay: 0.7 }}
                />
              </div>
              <div className="text-white text-sm mt-1">{formatDuration(stats.allTime.task_time_ms)}</div>
            </div>
            <div className="text-gray-500">vs</div>
            <div className="flex-1">
              <div className="text-gray-500 text-xs mb-1">Human Equivalent</div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.5, delay: 0.7 }}
                />
              </div>
              <div className="text-green-400 text-sm mt-1">{formatDuration(stats.allTime.human_time_ms)}</div>
            </div>
          </div>
          <div className="text-center mt-3 text-green-400 font-bold">
            🚀 {Math.round((stats.allTime.human_time_ms - stats.allTime.task_time_ms) / 3600000)} hours saved!
          </div>
        </motion.div>
      )}
    </div>
  )
}

function formatDuration(ms) {
  if (!ms || ms === 0) return '0s'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}
