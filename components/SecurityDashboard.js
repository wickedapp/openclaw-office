'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Shield, Scan, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react'

const mockPorts = [
  { port: 22, service: 'SSH', address: '*:22', status: 'safe' },
  { port: 80, service: 'HTTP', address: '*:80', status: 'safe' },
  { port: 443, service: 'HTTPS', address: '*:443', status: 'safe' },
  { port: 3000, service: 'Node.js', address: '*:3000', status: 'safe' },
  { port: 3306, service: 'MySQL', address: '*:3306', status: 'warning' },
  { port: 5432, service: 'PostgreSQL', address: '*:5432', status: 'safe' },
  { port: 6379, service: 'Redis', address: '*:6379', status: 'safe' },
  { port: 8080, service: 'Alt HTTP', address: '*:8080', status: 'safe' },
  { port: 27017, service: 'MongoDB', address: '*:27017', status: 'danger' },
]

export default function SecurityDashboard() {
  const [healthScore, setHealthScore] = useState(0)
  const [scanCount, setScanCount] = useState(0)
  const [threats, setThreats] = useState(0)
  const [blocked, setBlocked] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [ports, setPorts] = useState(mockPorts)

  useEffect(() => {
    // Animate health score
    const timer = setTimeout(() => setHealthScore(87), 500)
    setScanCount(24)
    setThreats(1)
    setBlocked(3)
    return () => clearTimeout(timer)
  }, [])

  const handleScan = () => {
    setIsScanning(true)
    // Simulate scan
    setTimeout(() => {
      setScanCount(prev => prev + 1)
      setIsScanning(false)
    }, 3000)
  }

  const getHealthColor = (score) => {
    if (score >= 80) return '#39ff14'
    if (score >= 60) return '#ffd700'
    if (score >= 40) return '#ff6b35'
    return '#ff0040'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'danger': return <XCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-500" />
          <h2 className="font-display text-xl text-cyber-cyan">Security Dashboard</h2>
        </div>
        <motion.button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 text-sm font-bold hover:bg-cyan-900/50 transition-colors"
          onClick={handleScan}
          disabled={isScanning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Run Scan'}
        </motion.button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <motion.div 
          className="glass-card rounded-xl p-4 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative w-20 h-20 mb-2">
            {/* Circular progress */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="6"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke={getHealthColor(healthScore)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={220}
                initial={{ strokeDashoffset: 220 }}
                animate={{ strokeDashoffset: 220 - (220 * healthScore / 100) }}
                transition={{ duration: 1, delay: 0.5 }}
                style={{
                  filter: `drop-shadow(0 0 10px ${getHealthColor(healthScore)})`
                }}
              />
            </svg>
            <div 
              className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold"
              style={{ color: getHealthColor(healthScore) }}
            >
              {healthScore}
            </div>
          </div>
          <div className="text-xs text-gray-400">System Health</div>
        </motion.div>

        {/* Scans today */}
        <motion.div 
          className="glass-card rounded-xl p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-3xl font-display font-bold text-cyan-400 mb-1">
            {scanCount}
          </div>
          <div className="text-xs text-gray-400">Today's Scans</div>
        </motion.div>

        {/* Threats detected */}
        <motion.div 
          className="glass-card rounded-xl p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-3xl font-display font-bold text-yellow-400 mb-1">
            {threats}
          </div>
          <div className="text-xs text-gray-400">Threats Detected ⚠️</div>
        </motion.div>

        {/* Blocked */}
        <motion.div 
          className="glass-card rounded-xl p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-3xl font-display font-bold text-red-400 mb-1">
            {blocked}
          </div>
          <div className="text-xs text-gray-400">Blocked ⛔</div>
        </motion.div>
      </div>

      {/* Port scan table */}
      <motion.div 
        className="glass-card rounded-xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-900/30">
          <Activity className="w-4 h-4 text-cyan-500" />
          <h3 className="font-display text-sm text-cyber-cyan">Port Scan</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-gray-500 font-normal">Port</th>
                <th className="px-4 py-3 text-left text-gray-500 font-normal">Service</th>
                <th className="px-4 py-3 text-left text-gray-500 font-normal">Address</th>
                <th className="px-4 py-3 text-left text-gray-500 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {ports.map((port, index) => (
                <motion.tr 
                  key={port.port}
                  className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <td className="px-4 py-3 font-mono text-cyan-400">{port.port}</td>
                  <td className="px-4 py-3 text-gray-300">{port.service}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{port.address}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(port.status)}
                      <span className={
                        port.status === 'safe' ? 'text-green-500' :
                        port.status === 'warning' ? 'text-yellow-500' :
                        'text-red-500'
                      }>
                        {port.status}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
