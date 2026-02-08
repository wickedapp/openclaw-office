'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Shared SSE connection for all workflow components
// Singleton pattern - only one EventSource per page

let sharedSource = null
let listeners = new Map()
let reconnectTimer = null
let heartbeatTimer = null
let connectionId = 0
let lastEventTime = 0

// Heartbeat timeout - if no data received in 30s, reconnect
const HEARTBEAT_TIMEOUT_MS = 30000

function resetHeartbeatTimer(id) {
  lastEventTime = Date.now()
  if (heartbeatTimer) clearTimeout(heartbeatTimer)
  heartbeatTimer = setTimeout(() => {
    if (id !== connectionId) return
    console.warn('[SSE] No data received for 30s, forcing reconnect...')
    cleanup()
    if (listeners.size > 0) {
      getOrCreateSource()
    }
  }, HEARTBEAT_TIMEOUT_MS)
}

function getOrCreateSource() {
  if (sharedSource && sharedSource.readyState !== EventSource.CLOSED) {
    return sharedSource
  }

  cleanup()
  
  const id = ++connectionId
  const source = new EventSource('/api/workflow/stream')
  sharedSource = source

  // Start heartbeat timer
  resetHeartbeatTimer(id)

  source.addEventListener('snapshot', (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
    try {
      const data = JSON.parse(e.data)
      notify('snapshot', data)
    } catch (err) {
      console.error('[SSE] Bad snapshot:', err)
    }
  })

  source.addEventListener('activity', (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
    try {
      const data = JSON.parse(e.data)
      notify('activity', data)
    } catch (err) {
      console.error('[SSE] Bad activity:', err)
    }
  })

  source.addEventListener('request', (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
    try {
      const data = JSON.parse(e.data)
      notify('request', data)
    } catch (err) {
      console.error('[SSE] Bad request:', err)
    }
  })

  source.addEventListener('task', (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
    try {
      const data = JSON.parse(e.data)
      notify('task', data)
    } catch (err) {
      console.error('[SSE] Bad task:', err)
    }
  })

  source.addEventListener('message', (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
    try {
      const data = JSON.parse(e.data)
      notify('message', data)
    } catch (err) {
      console.error('[SSE] Bad message:', err)
    }
  })

  // Also listen for raw messages (heartbeat comments come as 'message' events without event type)
  source.onmessage = (e) => {
    if (id !== connectionId) return
    resetHeartbeatTimer(id)
  }

  source.onerror = () => {
    if (id !== connectionId) return
    console.warn('[SSE] Connection error, reconnecting in 2s...')
    cleanup()
    reconnectTimer = setTimeout(() => {
      if (listeners.size > 0) {
        getOrCreateSource()
      }
    }, 2000)
  }

  source.onopen = () => {
    console.log('[SSE] Connection established')
  }

  return source
}

function cleanup() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }
  if (sharedSource) {
    sharedSource.close()
    sharedSource = null
  }
}

function notify(type, data) {
  for (const cb of listeners.values()) {
    try { cb(type, data) } catch (e) { /* ignore */ }
  }
}

// Subscribe to SSE events
function subscribe(id, callback) {
  listeners.set(id, callback)
  if (listeners.size === 1) {
    getOrCreateSource()
  }
}

// Unsubscribe
function unsubscribe(id) {
  listeners.delete(id)
  if (listeners.size === 0) {
    cleanup()
  }
}

/**
 * Hook for ActivityLog: returns live activity events
 */
export function useActivityStream() {
  const [activities, setActivities] = useState([])
  const idRef = useRef(`activity_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const id = idRef.current

    subscribe(id, (type, data) => {
      if (type === 'snapshot') {
        setActivities(data.events || [])
      } else if (type === 'activity') {
        setActivities(prev => {
          // Prepend new event, dedup by id, cap at 100
          const exists = prev.some(e => e.id === data.id)
          if (exists) return prev
          return [data, ...prev].slice(0, 100)
        })
      }
    })

    return () => unsubscribe(id)
  }, [])

  return activities
}

/**
 * Hook for tasks: returns live task data
 */
export function useTaskStream() {
  const [tasks, setTasks] = useState([])
  const idRef = useRef(`task_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const id = idRef.current

    subscribe(id, (type, data) => {
      if (type === 'snapshot') {
        setTasks(data.tasks || [])
      } else if (type === 'task') {
        setTasks(prev => {
          const idx = prev.findIndex(t => t.id === data.id)
          let next
          if (idx >= 0) {
            next = [...prev]
            next[idx] = data
          } else {
            next = [data, ...prev]
          }
          // Remove completed tasks after 30s
          const now = Date.now()
          return next.filter(t => {
            if ((t.status === 'completed' || t.status === 'failed') && t.completedAt) {
              return (now - t.completedAt) < 30000
            }
            return true
          })
        })
      }
    })

    return () => unsubscribe(id)
  }, [])

  return tasks
}

/**
 * Hook for RequestPipeline: returns live active requests
 * Uses SSE for real-time updates with polling fallback for reliability
 */
export function useRequestStream() {
  const [requests, setRequests] = useState([])
  const idRef = useRef(`request_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const id = idRef.current

    // Filter helper: remove completed (after 5s) and stale requests (>30min)
    function filterRequests(list) {
      const now = Date.now()
      return list.filter(r => {
        if (r.state === 'completed' && r.completedAt) {
          return (now - r.completedAt) < 30000
        }
        if (r.state !== 'completed' && r.createdAt) {
          return (now - r.createdAt) < 1800000  // 30 minutes
        }
        return true
      })
    }

    subscribe(id, (type, data) => {
      if (type === 'snapshot') {
        setRequests(filterRequests(data.requests || []))
      } else if (type === 'request') {
        setRequests(prev => {
          const idx = prev.findIndex(r => r.id === data.id)
          let next
          if (idx >= 0) {
            next = [...prev]
            next[idx] = data
          } else {
            next = [data, ...prev]
          }
          return filterRequests(next)
        })
      }
    })

    // Periodic cleanup: sweep stale requests every 30s
    const sweepInterval = setInterval(() => {
      setRequests(prev => {
        const filtered = filterRequests(prev)
        return filtered.length !== prev.length ? filtered : prev
      })
    }, 30000)

    return () => {
      unsubscribe(id)
      clearInterval(sweepInterval)
    }
  }, [])

  return requests
}
