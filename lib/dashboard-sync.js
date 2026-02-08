// Dashboard Sync Library
// Used to update the OpenClaw Office Dashboard in real-time
// This file documents the API for the AI to call

const DASHBOARD_URL = 'http://localhost:4200'

/**
 * WORKFLOW API REFERENCE
 * 
 * Base URL: http://localhost:4200/api/workflow
 * 
 * All requests are POST with JSON body.
 * 
 * ─────────────────────────────────────────────────────────────
 * 1. NEW REQUEST - When Boss sends a message
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "new_request",
 *   "content": "The actual message from Boss",
 *   "from": "Boss"
 * }
 * 
 * Returns: { success: true, request: { id: "req_xxx", ... } }
 * 
 * ─────────────────────────────────────────────────────────────
 * 2. ANALYZING - When WickedBot is thinking
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "analyze",
 *   "requestId": "req_xxx"
 * }
 * 
 * ─────────────────────────────────────────────────────────────
 * 3. CREATE TASK - When WickedBot decides what to do
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "create_task",
 *   "requestId": "req_xxx",
 *   "analysis": {
 *     "agent": "py|vigil|quill|savy|wickedman",
 *     "reason": "Why this agent was chosen"
 *   }
 * }
 * 
 * ─────────────────────────────────────────────────────────────
 * 4. ASSIGN - When task is assigned (triggers mail animation)
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "assign",
 *   "requestId": "req_xxx"
 * }
 * 
 * ─────────────────────────────────────────────────────────────
 * 5. START WORK - When agent begins working
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "start_work",
 *   "requestId": "req_xxx"
 * }
 * 
 * ─────────────────────────────────────────────────────────────
 * 6. COMPLETE - When task is finished
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "complete",
 *   "requestId": "req_xxx",
 *   "result": "Summary of what was done"
 * }
 * 
 * ─────────────────────────────────────────────────────────────
 * QUICK WORKFLOW (single call for simple updates)
 * ─────────────────────────────────────────────────────────────
 * POST /api/workflow
 * {
 *   "action": "quick_flow",
 *   "content": "Boss's message",
 *   "agent": "py|vigil|quill|savy|wickedman",
 *   "reason": "Why this agent"
 * }
 * 
 * This runs the full flow automatically with delays for animation.
 */

// Agent IDs and their roles
const AGENTS = {
  wickedman: { name: 'WickedMan', role: 'Main Orchestrator (handles general tasks)' },
  py: { name: 'PY', role: 'AI Engineer (code, bugs, APIs, deployments)' },
  vigil: { name: 'Vigil', role: 'Security Guard (security audits, scans, threats)' },
  quill: { name: 'Quill', role: 'Copywriter (content, blogs, marketing copy)' },
  savy: { name: 'Savy', role: 'Document Expert (reports, contracts, documentation)' },
}

module.exports = { DASHBOARD_URL, AGENTS }
