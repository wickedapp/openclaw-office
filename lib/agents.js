/**
 * Agent definitions — reads from config system
 * 
 * Server-side: use getAgentsList() / getAgentsMap() from config.js directly
 * This file provides the agents array for client components via /api/config
 */

import { getAgentsList } from './config.js'

// Default thoughts/activities per role (generic, generic)
const DEFAULT_THOUGHTS = {
  'Main Orchestrator': [
    "Let's get this done.",
    "Delegating to the right agent...",
    "Reviewing team output.",
    "Running the show.",
  ],
  'AI Engineer': [
    "Hmm... this needs refactoring...",
    "Precision is not optional.",
    "Debugging...",
  ],
  'default': [
    "Working on it...",
    "Almost there...",
    "Processing...",
  ],
}

/**
 * Get agents array with all metadata for rendering
 */
export function getAgents() {
  const list = getAgentsList()
  return list.map(agent => ({
    ...agent,
    thoughts: agent.thoughts || DEFAULT_THOUGHTS[agent.role] || DEFAULT_THOUGHTS.default,
    status: 'online',
  }))
}

// For backward compat — named export
export const agents = typeof window === 'undefined' ? getAgents() : []

/**
 * Generate random activity for an agent
 */
export function generateActivity(agent) {
  const genericActions = [
    'completed a task',
    'processed a request',
    'updated documentation',
    'reviewed output',
    'ran diagnostics',
  ]
  return genericActions[Math.floor(Math.random() * genericActions.length)]
}

/**
 * Get agent stats (placeholder — real stats come from DB)
 */
export function getAgentStats(agentId) {
  return { conversations: 0, completed: 0, words: 0, tokens: 0 }
}
