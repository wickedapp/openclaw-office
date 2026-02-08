'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Users, Shield, DollarSign, Activity, Database } from 'lucide-react'
import IsometricOffice from '../components/IsometricOffice'
import ActivityLog from '../components/ActivityLog'
import RequestPipeline from '../components/RequestPipeline'
import StatsCards from '../components/StatsCards'
import TeamDashboard from '../components/TeamDashboard'
import SecurityDashboard from '../components/SecurityDashboard'
import DatabaseDashboard from '../components/DatabaseDashboard'
import CostDashboard from '../components/CostDashboard'

const tabs = [
  { id: 'office', label: 'Main Office', icon: Building2 },
  { id: 'stats', label: 'Interaction Stats', icon: Activity },
  { id: 'team', label: 'Agent Thoughts', icon: Users },
  { id: 'cost', label: 'Cost Savings', icon: DollarSign },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('office')
  const [headerStats, setHeaderStats] = useState({
    tasks: 0,
    tokens: 0,
    savings: 0,
  })
  const [activeRequest, setActiveRequest] = useState(null)
  
  // Fetch stats for header
  useEffect(() => {
    const fetchHeaderStats = async () => {
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        setHeaderStats({
          tasks: data.allTime.tasks_completed || 0,
          tokens: data.allTime.tokens.total || 0,
          savings: Math.round(data.allTime.savings_usd || 0),
        })
      } catch (error) {
        console.error('Failed to fetch header stats:', error)
      }
    }
    
    fetchHeaderStats()
    const interval = setInterval(fetchHeaderStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Handle request updates from pipeline
  const handleRequestUpdate = useCallback((request) => {
    setActiveRequest(request)
  }, [])

  return (
    <main className="min-h-screen p-4 lg:p-6 relative">
      {/* Header */}
      <motion.header 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl gradient-border"
              whileHover={{ scale: 1.05 }}
              style={{ background: 'linear-gradient(135deg, #0a0a1a, #1a1a3a)' }}
            >
              🏢
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                <span className="neon-cyan">OpenClaw</span>
                <span className="text-white mx-2">IT</span>
              </h1>
              <p className="text-xs text-gray-500">AI Office Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-500/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-bold">LIVE</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden lg:flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Tasks: </span>
            <span className="text-cyan-400 font-bold">{headerStats.tasks}</span>
          </div>
          <div>
            <span className="text-gray-500">Tokens: </span>
            <span className="text-purple-400 font-bold">{(headerStats.tokens / 1000000).toFixed(2)}M</span>
          </div>
          <div>
            <span className="text-gray-500">Saved: </span>
            <span className="text-green-400 font-bold">${headerStats.savings.toLocaleString()}</span>
          </div>
        </div>
      </motion.header>

      {/* Tab Navigation */}
      <motion.nav 
        className="flex gap-2 mb-6 overflow-x-auto pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-900/50 border border-cyan-500/50 text-cyan-400'
                : 'bg-gray-900/50 border border-gray-700/50 text-gray-400 hover:text-white'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </motion.button>
        ))}
      </motion.nav>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'office' && (
          <motion.div
            key="office"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Office View */}
            <div className="xl:col-span-2">
              <div className="glass-card rounded-xl p-4 h-auto">
                <IsometricOffice activeRequest={activeRequest} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Request Pipeline - NEW */}
              <RequestPipeline onRequestUpdate={handleRequestUpdate} />
              
              {/* Activity Log */}
              <ActivityLog />
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <StatsCards />
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TeamDashboard />
          </motion.div>
        )}

        {activeTab === 'cost' && (
          <motion.div
            key="cost"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <CostDashboard />
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SecurityDashboard />
          </motion.div>
        )}

        {activeTab === 'database' && (
          <motion.div
            key="database"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DatabaseDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer 
        className="mt-8 text-center text-xs text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p>OpenClaw © {new Date().getFullYear()} • AI Office Dashboard • Powered by OpenClaw</p>
      </motion.footer>
    </main>
  )
}
