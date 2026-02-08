// OpenClaw API Client for Token Tracking
// Reads session data from OpenClaw's session storage

import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''
const OPENCLAW_SESSIONS_DIR = process.env.OPENCLAW_SESSIONS_DIR || '/Users/wickedman-macmini/.openclaw/agents/main/sessions'

/**
 * Get sessions from OpenClaw via HTTP API
 * Falls back to reading session files directly if API fails
 */
export async function getOpenClawSessions() {
  try {
    // Try HTTP API first
    const res = await fetch(`${OPENCLAW_URL}/api/sessions?limit=50`, {
      headers: {
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.sessions) return data
    }
  } catch (error) {
    console.error('OpenClaw API fetch error, falling back to file read:', error.message)
  }
  
  // Fallback: Read session files directly
  return readSessionFilesDirectly()
}

/**
 * Read session JSONL files directly from the filesystem
 */
function readSessionFilesDirectly() {
  if (!existsSync(OPENCLAW_SESSIONS_DIR)) {
    console.error('OpenClaw sessions directory not found:', OPENCLAW_SESSIONS_DIR)
    return null
  }

  const sessions = []
  
  // Get all session files with their modification times
  const allFiles = readdirSync(OPENCLAW_SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted'))
    .map(f => ({
      name: f,
      mtime: statSync(join(OPENCLAW_SESSIONS_DIR, f)).mtime.getTime()
    }))
    // Sort by modification time (newest first)
    .sort((a, b) => b.mtime - a.mtime)
    // Take the 100 most recent files
    .slice(0, 100)
    .map(f => f.name)
  
  for (const file of allFiles) {
    try {
      const filePath = join(OPENCLAW_SESSIONS_DIR, file)
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())
      
      let totalInput = 0
      let totalOutput = 0
      let totalCacheRead = 0
      let totalCacheWrite = 0
      let sessionId = file.replace('.jsonl', '')
      let sessionTimestamp = null
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          
          // Get session metadata
          if (entry.type === 'session') {
            sessionId = entry.id
            sessionTimestamp = entry.timestamp
          }
          
          // Accumulate token usage from messages
          if (entry.type === 'message' && entry.message?.usage) {
            const usage = entry.message.usage
            totalInput += usage.input || 0
            totalOutput += usage.output || 0
            totalCacheRead += usage.cacheRead || 0
            totalCacheWrite += usage.cacheWrite || 0
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
      
      sessions.push({
        id: sessionId,
        timestamp: sessionTimestamp,
        totalTokens: totalInput + totalOutput + totalCacheRead + totalCacheWrite,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        cacheRead: totalCacheRead,
        cacheWrite: totalCacheWrite
      })
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return { sessions }
}

// Note: getTodaySessionFiles was removed - filtering is done in getTotalTokens instead

/**
 * Calculate total tokens from all sessions (or today only)
 */
export async function getTotalTokens(todayOnly = false) {
  const data = await getOpenClawSessions()
  if (!data?.sessions || data.sessions.length === 0) {
    return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
  }
  
  // Filter sessions if needed
  let sessions = data.sessions
  if (todayOnly) {
    const today = new Date().toISOString().split('T')[0]
    sessions = sessions.filter(s => s.timestamp?.startsWith(today))
  }
  
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheWrite = 0
  
  for (const session of sessions) {
    totalInput += session.inputTokens || 0
    totalOutput += session.outputTokens || 0
    totalCacheRead += session.cacheRead || 0
    totalCacheWrite += session.cacheWrite || 0
  }
  
  // For simpler breakdown, add cache to input (cache is a type of input)
  const effectiveInput = totalInput + totalCacheRead + totalCacheWrite
  
  return {
    input: effectiveInput,
    output: totalOutput,
    cacheRead: totalCacheRead,
    cacheWrite: totalCacheWrite,
    total: effectiveInput + totalOutput
  }
}

/**
 * Get tokens for today only
 */
export async function getTodayTokens() {
  return getTotalTokens(true)
}

/**
 * Calculate cost based on token usage (Claude Opus pricing)
 * Input: $15/1M tokens, Output: $75/1M tokens
 * Cache read: $1.875/1M (12.5% of input), Cache write: $3.75/1M (25% of input)
 */
export function calculateOpenClawCost(tokens) {
  const inputCost = (tokens.input - tokens.cacheRead - tokens.cacheWrite) / 1000000 * 15
  const outputCost = tokens.output / 1000000 * 75
  const cacheReadCost = tokens.cacheRead / 1000000 * 1.875
  const cacheWriteCost = tokens.cacheWrite / 1000000 * 3.75
  
  return inputCost + outputCost + cacheReadCost + cacheWriteCost
}
