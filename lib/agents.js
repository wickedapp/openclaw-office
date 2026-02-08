/**
 * Agent definitions — client-safe module
 * 
 * Server-side: use getAgentsList() / getAgentsMap() from config.js directly
 * Client-side: this module provides defaults + fetches from /api/config
 */

// Default thoughts/activities per role
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

// Empty default — client components should fetch from /api/config
export const agents = []

/**
 * Enrich agent data with thoughts and status
 */
export function enrichAgent(agent) {
  return {
    ...agent,
    thoughts: agent.thoughts || DEFAULT_THOUGHTS[agent.role] || DEFAULT_THOUGHTS.default,
    status: 'online',
  }
}

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
