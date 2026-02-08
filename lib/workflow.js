// Workflow State Management for OpenClaw Office
// States: received → analyzing → task_created → assigned → in_progress → completed

import { getAgentsMap } from './config.js'

export const WORKFLOW_STATES = {
  RECEIVED: 'received',
  ANALYZING: 'analyzing', 
  TASK_CREATED: 'task_created',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
}

export const STATE_CONFIG = {
  received: { label: 'Request Received', icon: '📥', color: '#00f5ff', duration: 800 },
  analyzing: { label: 'Analyzing...', icon: '🔍', color: '#ffd700', duration: 1500 },
  task_created: { label: 'Task Created', icon: '📋', color: '#9d4edd', duration: 800 },
  assigned: { label: 'Assigned', icon: '📧', color: '#ff006e', duration: 1000 },
  in_progress: { label: 'In Progress', icon: '⚡', color: '#39ff14', duration: null },
  completed: { label: 'Completed', icon: '✅', color: '#00ff88', duration: 0 },
}

/**
 * Agent metadata — lazy-loaded from config via Proxy
 * Modules that do `AGENTS[agentId]` will still work
 */
export const AGENTS = new Proxy({}, {
  get(target, prop) {
    const agents = getAgentsMap()
    return agents[prop]
  },
  ownKeys() {
    return Object.keys(getAgentsMap())
  },
  getOwnPropertyDescriptor(target, prop) {
    const agents = getAgentsMap()
    if (prop in agents) {
      return { configurable: true, enumerable: true, value: agents[prop] }
    }
  },
  has(target, prop) {
    return prop in getAgentsMap()
  },
})

/**
 * Determine which agent should handle a task (basic keyword matching)
 * Override this by providing custom routing in config
 */
export function analyzeTask(taskDetail) {
  const text = taskDetail.toLowerCase()
  const agents = getAgentsMap()
  
  // Check agent roles for keyword matching
  for (const [id, agent] of Object.entries(agents)) {
    const keywords = agent.keywords || []
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return { agent: id, reason: `Matched keywords for ${agent.name}` }
    }
  }
  
  // Fallback keyword matching for common roles
  if (text.match(/security|scan|firewall|threat|ssl|hack|vulnerability/)) {
    const secAgent = Object.entries(agents).find(([, a]) => a.role?.toLowerCase().includes('security'))
    if (secAgent) return { agent: secAgent[0], reason: 'Security-related task detected' }
  }
  
  if (text.match(/write|copy|content|blog|article|headline|email|campaign/)) {
    const copyAgent = Object.entries(agents).find(([, a]) => a.role?.toLowerCase().includes('copy') || a.role?.toLowerCase().includes('writ'))
    if (copyAgent) return { agent: copyAgent[0], reason: 'Content creation task detected' }
  }
  
  if (text.match(/code|bug|api|deploy|database|server|fix|build|test|develop/)) {
    const devAgent = Object.entries(agents).find(([, a]) => a.role?.toLowerCase().includes('engineer') || a.role?.toLowerCase().includes('develop'))
    if (devAgent) return { agent: devAgent[0], reason: 'Technical task detected' }
  }
  
  // Default: first agent (orchestrator)
  const firstAgent = Object.keys(agents)[0] || 'main'
  return { agent: firstAgent, reason: 'General task - handling directly' }
}
