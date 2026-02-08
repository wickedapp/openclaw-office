/**
 * Agent Sync Module
 * 
 * Periodically checks the OpenClaw gateway for agent changes and compares
 * them against the configured agents in openclaw-office.config.json.
 * Emits events via eventBus when changes are detected.
 * 
 * @module agent-sync
 */

import { getConfig, getAgentsList } from './config.js'
import { eventBus, EVENTS } from './event-bus.js'
import { connectGateway } from '../cli/lib/gateway.js'

/** Sync check interval in ms (5 minutes) */
const SYNC_INTERVAL_MS = 5 * 60 * 1000

/** @type {ReturnType<typeof setInterval>|null} */
let syncTimer = null

/** @type {{ lastCheck: string|null, added: object[], removed: object[], changed: object[] }} */
let lastSyncResult = { lastCheck: null, added: [], removed: [], changed: [], configured: [], discovered: [] }

// Extend event types
EVENTS.AGENT_ADDED = 'agents:added'
EVENTS.AGENT_REMOVED = 'agents:removed'
EVENTS.AGENT_CHANGED = 'agents:changed'
EVENTS.AGENT_SYNC = 'agents:sync'

/**
 * Discover agents from the OpenClaw gateway.
 * @returns {Promise<object[]>} Array of discovered agent objects
 */
export async function discoverAgents() {
  const config = getConfig()
  const { url, token } = config.gateway || {}
  if (!url || !token) return []

  try {
    const result = await connectGateway(url, token, { timeoutMs: 8000 })
    return result.agents || []
  } catch (err) {
    console.error('[agent-sync] Discovery failed:', err.message)
    return []
  }
}

/**
 * Compare discovered agents with configured agents.
 * @param {object[]} discovered - Agents from gateway
 * @returns {{ added: object[], removed: object[], changed: object[] }}
 */
export function diffAgents(discovered) {
  const configured = getAgentsList()
  const configuredIds = new Set(configured.map(a => a.id))
  const discoveredIds = new Set(discovered.map(a => a.id || a.name))

  const added = discovered.filter(a => !configuredIds.has(a.id || a.name))
  const removed = configured.filter(a => !discoveredIds.has(a.id))
  const changed = discovered.filter(a => {
    const id = a.id || a.name
    if (!configuredIds.has(id)) return false
    const existing = configured.find(c => c.id === id)
    return existing && (existing.role !== a.role || existing.name !== (a.displayName || a.name))
  })

  return { added, removed, changed }
}

/**
 * Run a single sync check. Compares gateway agents with config and emits events.
 * @returns {Promise<object>} The sync result
 */
export async function runSync() {
  const discovered = await discoverAgents()
  const configured = getAgentsList()
  const { added, removed, changed } = diffAgents(discovered)

  lastSyncResult = {
    lastCheck: new Date().toISOString(),
    configured,
    discovered,
    added,
    removed,
    changed,
  }

  // Emit events for each change type
  if (added.length > 0) {
    eventBus.emit(EVENTS.AGENT_ADDED, added)
  }
  if (removed.length > 0) {
    eventBus.emit(EVENTS.AGENT_REMOVED, removed)
  }
  if (changed.length > 0) {
    eventBus.emit(EVENTS.AGENT_CHANGED, changed)
  }
  if (added.length > 0 || removed.length > 0 || changed.length > 0) {
    eventBus.emit(EVENTS.AGENT_SYNC, lastSyncResult)
  }

  return lastSyncResult
}

/**
 * Get the last sync result without triggering a new check.
 * @returns {object} Last sync result
 */
export function getLastSyncResult() {
  return lastSyncResult
}

/**
 * Start periodic sync checks.
 */
export function startSync() {
  if (syncTimer) return
  console.log('[agent-sync] Starting periodic agent sync (every 5 min)')
  syncTimer = setInterval(() => runSync().catch(console.error), SYNC_INTERVAL_MS)
  // Run immediately on start
  runSync().catch(console.error)
}

/**
 * Stop periodic sync checks.
 */
export function stopSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
    console.log('[agent-sync] Stopped periodic agent sync')
  }
}
