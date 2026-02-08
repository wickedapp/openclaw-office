'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * AgentChangeNotification
 * 
 * Displays dismissible notification banners when agents are added or removed.
 * Polls /api/agents/sync for changes and shows slide-in notifications.
 */
export default function AgentChangeNotification({ onRegenerate }) {
  const [notifications, setNotifications] = useState([])

  // Poll for sync changes
  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        const res = await fetch('/api/agents/sync')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return

        const newNotifs = []
        for (const agent of (data.added || [])) {
          const id = agent.id || agent.name
          newNotifs.push({
            key: `add-${id}-${Date.now()}`,
            type: 'added',
            agentId: id,
            agentName: agent.displayName || agent.name || id,
            agentRole: agent.role || 'Agent',
          })
        }
        for (const agent of (data.removed || [])) {
          newNotifs.push({
            key: `rm-${agent.id}-${Date.now()}`,
            type: 'removed',
            agentId: agent.id,
            agentName: agent.name || agent.id,
          })
        }
        if (newNotifs.length > 0) {
          setNotifications(prev => [...prev, ...newNotifs])
        }
      } catch {}
    }

    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const dismiss = useCallback((key) => {
    setNotifications(prev => prev.filter(n => n.key !== key))
  }, [])

  const handleAddToConfig = useCallback(async (notif) => {
    // Could POST to an endpoint to add agent to config
    dismiss(notif.key)
  }, [dismiss])

  const handleRemoveFromConfig = useCallback(async (notif) => {
    dismiss(notif.key)
  }, [dismiss])

  const handleRegenerate = useCallback((notif) => {
    dismiss(notif.key)
    onRegenerate?.()
  }, [dismiss, onRegenerate])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.key}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rounded-lg border shadow-lg p-4"
            style={{
              background: 'rgba(15, 15, 25, 0.95)',
              borderColor: notif.type === 'added' ? '#00f5ff' : '#ff6b6b',
              backdropFilter: 'blur(10px)',
            }}
          >
            {notif.type === 'added' ? (
              <>
                <div className="text-sm mb-2">
                  <span className="mr-1">🆕</span>
                  New agent detected: <strong className="text-cyan-300">&quot;{notif.agentName}&quot;</strong>
                  {notif.agentRole && <span className="text-gray-400 ml-1">({notif.agentRole})</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleRegenerate(notif)}
                    className="px-2 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    Regenerate Office Image
                  </button>
                  <button
                    onClick={() => handleAddToConfig(notif)}
                    className="px-2 py-1 text-xs rounded bg-cyan-700 hover:bg-cyan-600 text-white transition-colors"
                  >
                    Add to Config
                  </button>
                  <button
                    onClick={() => dismiss(notif.key)}
                    className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm mb-2">
                  <span className="mr-1">⚠️</span>
                  Agent <strong className="text-red-300">&quot;{notif.agentName}&quot;</strong> no longer found in OpenClaw
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleRemoveFromConfig(notif)}
                    className="px-2 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white transition-colors"
                  >
                    Remove from Config
                  </button>
                  <button
                    onClick={() => dismiss(notif.key)}
                    className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => dismiss(notif.key)}
                    className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
